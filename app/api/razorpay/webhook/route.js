// app/api/razorpay/webhook/route.js
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET

export async function POST(request) {
  const body = await request.text()
  const signature = request.headers.get('x-razorpay-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    )
  }

  if (!webhookSecret) {
    console.error('Razorpay webhook secret not configured')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  // Verify webhook signature
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex')

  if (signature !== expectedSignature) {
    console.error('Razorpay webhook signature verification failed')
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  const event = JSON.parse(body)

  // Store event for idempotency
  const { data: existingEvent } = await supabase
    .from('payment_events')
    .select('id')
    .eq('gateway_event_id', event.id)
    .eq('payment_gateway', 'razorpay')
    .single()

  if (existingEvent) {
    console.log(`Event ${event.id} already processed`)
    return NextResponse.json({ received: true })
  }

  // Insert event
  await supabase.from('payment_events').insert({
    gateway_event_id: event.id,
    payment_gateway: 'razorpay',
    event_type: event.event,
    event_data: event.payload,
  })

  // Handle event
  try {
    switch (event.event) {
      case 'subscription.activated':
        await handleSubscriptionActivated(event.payload.subscription.entity)
        break

      case 'subscription.charged':
        await handleSubscriptionCharged(event.payload.subscription.entity)
        break

      case 'subscription.halted':
        await handleSubscriptionHalted(event.payload.subscription.entity)
        break

      case 'subscription.cancelled':
        await handleSubscriptionCanceled(event.payload.subscription.entity)
        break

      case 'payment.authorized':
        await handlePaymentAuthorized(event.payload.payment.entity)
        break

      case 'payment.captured':
        await handlePaymentCaptured(event.payload.payment.entity)
        break

      case 'payment.failed':
        await handlePaymentFailed(event.payload.payment.entity)
        break

      default:
        console.log(`Unhandled Razorpay event: ${event.event}`)
    }

    // Mark event as processed
    await supabase
      .from('payment_events')
      .update({ processed: true })
      .eq('gateway_event_id', event.id)
      .eq('payment_gateway', 'razorpay')
  } catch (error) {
    console.error('Error processing Razorpay webhook:', error)
    await supabase
      .from('payment_events')
      .update({ 
        error_message: error.message,
        processed: true 
      })
      .eq('gateway_event_id', event.id)
      .eq('payment_gateway', 'razorpay')
    
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }

  return NextResponse.json({ received: true })
}

async function handleSubscriptionActivated(subscription) {
  const subscriptionId = subscription.id
  
  const { data: subData } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('razorpay_subscription_id', subscriptionId)
    .single()

  if (!subData) return

  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      current_period_start: new Date(subscription.current_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_end * 1000).toISOString(),
    })
    .eq('user_id', subData.user_id)
}

async function handleSubscriptionCharged(subscription) {
  // Subscription payment succeeded
  await handleSubscriptionActivated(subscription)
}

async function handleSubscriptionHalted(subscription) {
  const subscriptionId = subscription.id
  
  const { data: subData } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('razorpay_subscription_id', subscriptionId)
    .single()

  if (!subData) return

  await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
    })
    .eq('user_id', subData.user_id)
}

async function handleSubscriptionCanceled(subscription) {
  const subscriptionId = subscription.id
  
  const { data: subData } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('razorpay_subscription_id', subscriptionId)
    .single()

  if (!subData) return

  await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      tier: 'free',
    })
    .eq('user_id', subData.user_id)
}

async function handlePaymentAuthorized(payment) {
  // Payment authorized but not yet captured
  // Usually handled by subscription.charged event
}

async function handlePaymentCaptured(payment) {
  // Payment captured successfully
  // Update subscription status if needed
}

async function handlePaymentFailed(payment) {
  const subscriptionId = payment.subscription_id
  
  if (!subscriptionId) return

  const { data: subData } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('razorpay_subscription_id', subscriptionId)
    .single()

  if (!subData) return

  await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
    })
    .eq('user_id', subData.user_id)
}

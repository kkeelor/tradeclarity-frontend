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
  
  // Create invoice for this payment
  await createInvoiceFromSubscription(subscription)
}

async function createInvoiceFromSubscription(subscription) {
  try {
    const subscriptionId = subscription.id
    
    // Get subscription details from database
    const { data: subData } = await supabase
      .from('subscriptions')
      .select('user_id, tier, razorpay_plan_id, current_period_start, current_period_end')
      .eq('razorpay_subscription_id', subscriptionId)
      .single()

    if (!subData) {
      console.warn(`No subscription found for Razorpay subscription ${subscriptionId}`)
      return
    }

    // Get payment details from Razorpay subscription
    // The subscription object should have payment information
    const paymentId = subscription.latest_invoice?.payment_id || subscription.payment_id
    const amount = subscription.latest_invoice?.amount || subscription.amount || 0
    const currency = subscription.latest_invoice?.currency || subscription.currency || 'INR'
    
    // Generate invoice number
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-8)}`
    
    // Format billing period: "12 November 2025 - 12 December 2025"
    const periodStart = subData.current_period_start 
      ? new Date(subData.current_period_start)
      : new Date()
    const periodEnd = subData.current_period_end
      ? new Date(subData.current_period_end)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    
    const formatDate = (date) => {
      return date.toLocaleDateString('en-US', { 
        day: 'numeric',
        month: 'long', 
        year: 'numeric'
      })
    }
    
    const billingPeriod = `${formatDate(periodStart)} - ${formatDate(periodEnd)}`
    
    // Get tier display name
    const tierName = subData.tier === 'trader' ? 'Trader Plan' : subData.tier === 'pro' ? 'Pro Plan' : 'Premium Plan'
    
    // Create invoice
    const { error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        user_id: subData.user_id,
        invoice_number: invoiceNumber,
        description: `Subscription payment for ${tierName}`,
        plan_name: tierName,
        billing_period: billingPeriod,
        amount: amount, // Amount in paise/cents
        currency: currency,
        status: 'paid',
        payment_method: 'razorpay',
        razorpay_payment_id: paymentId,
        razorpay_subscription_id: subscriptionId,
        paid_at: new Date().toISOString(),
      })

    if (invoiceError) {
      console.error('Error creating invoice:', invoiceError)
    } else {
      console.log(`Invoice created: ${invoiceNumber} for user ${subData.user_id}`)
    }
  } catch (error) {
    console.error('Error in createInvoiceFromSubscription:', error)
  }
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
    .select('user_id, current_period_end, cancel_at_period_end')
    .eq('razorpay_subscription_id', subscriptionId)
    .single()

  if (!subData) return

  // FIXED: Only downgrade to free if period has actually ended
  // Check if current_period_end has passed
  const periodEnded = subData.current_period_end 
    ? new Date(subData.current_period_end) < new Date()
    : false

  // If period hasn't ended yet, just mark as canceled but keep tier active
  // The tier will be downgraded when period actually ends
  if (!periodEnded && subData.cancel_at_period_end) {
    // Period hasn't ended yet - keep tier active, just update status
    await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        // Don't change tier - user still has access until period ends
      })
      .eq('user_id', subData.user_id)
  } else {
    // Period has ended - safe to downgrade to free
    await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        tier: 'free',
        cancel_at_period_end: false, // Clear the flag
      })
      .eq('user_id', subData.user_id)
  }
}

async function handlePaymentAuthorized(payment) {
  // Payment authorized but not yet captured
  // Usually handled by subscription.charged event
}

async function handlePaymentCaptured(payment) {
  // Payment captured successfully
  // Create invoice for one-time payments (if not part of subscription)
  if (!payment.subscription_id && payment.status === 'captured') {
    await createInvoiceFromPayment(payment)
  }
}

async function createInvoiceFromPayment(payment) {
  try {
    // For one-time payments, we need to get user_id from order notes or customer
    // This is a simplified version - you may need to adjust based on your payment flow
    const orderId = payment.order_id
    
    // Try to get user from payment notes or order
    // This assumes you store userId in payment/order notes
    const userId = payment.notes?.userId || payment.order?.notes?.userId
    
    if (!userId) {
      console.warn(`No userId found for payment ${payment.id}`)
      return
    }

    // Generate invoice number
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-8)}`
    
    // Create invoice
    const { error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        user_id: userId,
        invoice_number: invoiceNumber,
        description: payment.description || 'One-time payment',
        amount: payment.amount, // Amount in paise/cents
        currency: payment.currency || 'INR',
        status: 'paid',
        payment_method: 'razorpay',
        razorpay_payment_id: payment.id,
        razorpay_order_id: orderId,
        paid_at: new Date().toISOString(),
      })

    if (invoiceError) {
      console.error('Error creating invoice from payment:', invoiceError)
    } else {
      console.log(`Invoice created: ${invoiceNumber} for user ${userId}`)
    }
  } catch (error) {
    console.error('Error in createInvoiceFromPayment:', error)
  }
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

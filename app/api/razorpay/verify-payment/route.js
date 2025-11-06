// app/api/razorpay/verify-payment/route.js
import { NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function getRazorpayInstance() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials not configured')
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  })
}

function verifyPaymentSignature(orderId, paymentId, signature) {
  const secret = process.env.RAZORPAY_KEY_SECRET
  const text = orderId + '|' + paymentId
  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(text)
    .digest('hex')
  
  return generatedSignature === signature
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature,
      userId,
      planId,
      tier,
      billingCycle
    } = body

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Missing required payment parameters' },
        { status: 400 }
      )
    }

    // Verify payment signature
    const isValidSignature = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    )

    if (!isValidSignature) {
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      )
    }

    // Fetch order details from Razorpay to confirm payment
    const razorpay = getRazorpayInstance()
    const order = await razorpay.orders.fetch(razorpay_order_id)
    const payment = await razorpay.payments.fetch(razorpay_payment_id)

    if (order.status !== 'paid' || payment.status !== 'captured') {
      return NextResponse.json(
        { error: 'Payment not confirmed' },
        { status: 400 }
      )
    }

    // Get planId and other details from order notes if not provided
    const orderPlanId = planId || order.notes?.planId
    const orderTier = tier || order.notes?.tier
    const orderBillingCycle = billingCycle || order.notes?.billingCycle || 'monthly'
    const orderUserId = userId || order.notes?.userId

    if (!orderUserId) {
      return NextResponse.json(
        { error: 'User ID not found in order' },
        { status: 400 }
      )
    }

    // If planId is provided, create/update subscription
    if (orderPlanId && orderTier) {
      // Get or create Razorpay customer
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('razorpay_customer_id')
        .eq('user_id', orderUserId)
        .single()

      let customerId = subscription?.razorpay_customer_id

      if (!customerId) {
        const { data: authUser } = await supabase.auth.admin.getUserById(orderUserId)
        if (authUser?.user) {
          const customer = await razorpay.customers.create({
            email: authUser.user.email,
            notes: {
              userId: orderUserId,
            },
          })
          customerId = customer.id
        }
      }

      // Create subscription in Razorpay
      const razorpaySubscription = await razorpay.subscriptions.create({
        plan_id: orderPlanId,
        customer_notify: 1,
        total_count: orderBillingCycle === 'annual' ? 12 : 1,
        start_at: Math.floor(Date.now() / 1000) + 60, // Start 1 minute from now
        notes: {
          userId: orderUserId,
          billingCycle: orderBillingCycle,
          initial_payment_id: razorpay_payment_id,
        },
      })

      // Update database with subscription
      await supabase
        .from('subscriptions')
        .upsert({
          user_id: orderUserId,
          tier: orderTier,
          status: 'active',
          razorpay_customer_id: customerId,
          razorpay_subscription_id: razorpaySubscription.id,
          razorpay_plan_id: orderPlanId,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + (orderBillingCycle === 'annual' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
        }, {
          onConflict: 'user_id'
        })

      // Store payment event
      await supabase.from('payment_events').insert({
        gateway_event_id: razorpay_payment_id,
        payment_gateway: 'razorpay',
        event_type: 'payment.captured',
        event_data: {
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id,
          subscription_id: razorpaySubscription.id,
        },
        processed: true,
      })

      return NextResponse.json({
        success: true,
        subscriptionId: razorpaySubscription.id,
        paymentId: razorpay_payment_id,
        message: 'Payment verified and subscription activated',
      })
    } else {
      // One-time payment (no subscription)
      return NextResponse.json({
        success: true,
        paymentId: razorpay_payment_id,
        message: 'Payment verified successfully',
      })
    }
  } catch (error) {
    console.error('Error verifying payment:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to verify payment' },
      { status: 500 }
    )
  }
}

// app/api/razorpay/create-order/route.js
import { NextResponse } from 'next/server'
import Razorpay from 'razorpay'
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

export async function POST(request) {
  try {
    const body = await request.json()
    const { amount, currency = 'INR', planId, userId, billingCycle, tier } = body

    if (!amount || !userId || !tier) {
      return NextResponse.json(
        { error: 'Amount, User ID, and Tier are required' },
        { status: 400 }
      )
    }

    // Initialize Razorpay instance
    const razorpay = getRazorpayInstance()

    // Get user email from Supabase
    const { data: authUser } = await supabase.auth.admin.getUserById(userId)
    if (!authUser?.user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const userEmail = authUser.user.email
    const userName = authUser.user.user_metadata?.name || authUser.user.email?.split('@')[0] || 'Customer'

    // Get or create Razorpay customer
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('razorpay_customer_id')
      .eq('user_id', userId)
      .single()

    let customerId = subscription?.razorpay_customer_id

    if (!customerId) {
      // Create customer in Razorpay
      const customer = await razorpay.customers.create({
        email: userEmail,
        name: userName,
        notes: {
          userId: userId,
        },
      })
      customerId = customer.id

      // Update subscription with customer ID
      await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          razorpay_customer_id: customerId,
        }, {
          onConflict: 'user_id'
        })
    }

    // Create order in Razorpay
    // Amount should be in paise (smallest currency unit) for INR
    const amountInPaise = Math.round(amount * 100)

    const orderOptions = {
      amount: amountInPaise,
      currency: currency,
      receipt: `order_${userId}_${Date.now()}`,
      notes: {
        userId: userId,
        planId: planId || '',
        tier: tier,
        billingCycle: billingCycle || 'monthly',
      },
    }

    const order = await razorpay.orders.create(orderOptions)

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    })
  } catch (error) {
    console.error('Error creating Razorpay order:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    )
  }
}

// app/api/razorpay/create-subscription/route.js
import { NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { createClient } from '@supabase/supabase-js'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()
    const { planId, userId, billingCycle } = body

    if (!planId || !userId) {
      return NextResponse.json(
        { error: 'Plan ID and User ID are required' },
        { status: 400 }
      )
    }

    // Get user email from Supabase
    const { data: authUser } = await supabase.auth.admin.getUserById(userId)
    if (!authUser?.user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const userEmail = authUser.user.email

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

    // Create subscription in Razorpay
    const razorpaySubscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: billingCycle === 'annual' ? 12 : 1, // For annual, we'll handle differently
      notes: {
        userId: userId,
        billingCycle: billingCycle,
      },
    })

    // Update database with subscription
    const tier = getTierFromPlanId(planId)
    
    await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        tier: tier,
        status: razorpaySubscription.status === 'active' ? 'active' : 'created',
        razorpay_customer_id: customerId,
        razorpay_subscription_id: razorpaySubscription.id,
        razorpay_plan_id: planId,
        current_period_start: new Date(razorpaySubscription.current_start * 1000).toISOString(),
        current_period_end: new Date(razorpaySubscription.current_end * 1000).toISOString(),
      }, {
        onConflict: 'user_id'
      })

    return NextResponse.json({
      subscriptionId: razorpaySubscription.id,
      status: razorpaySubscription.status,
      authLink: razorpaySubscription.short_url, // Payment link for user
    })
  } catch (error) {
    console.error('Error creating Razorpay subscription:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create subscription' },
      { status: 500 }
    )
  }
}

function getTierFromPlanId(planId) {
  const traderPlanIds = [
    process.env.RAZORPAY_PLAN_ID_TRADER_MONTHLY,
    process.env.RAZORPAY_PLAN_ID_TRADER_ANNUAL,
  ]
  const proPlanIds = [
    process.env.RAZORPAY_PLAN_ID_PRO_MONTHLY,
    process.env.RAZORPAY_PLAN_ID_PRO_ANNUAL,
  ]

  if (traderPlanIds.includes(planId)) return 'trader'
  if (proPlanIds.includes(planId)) return 'pro'
  return 'free'
}

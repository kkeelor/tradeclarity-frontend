// app/api/subscriptions/cancel/route.js
// Route handler for canceling subscriptions
// This is called by the billing page

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
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      )
    }

    // Get subscription
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('razorpay_subscription_id, current_period_end, tier, status, cancel_at_period_end')
      .eq('user_id', userId)
      .single()

    if (fetchError) {
      console.error('Error fetching subscription:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch subscription details' },
        { status: 500 }
      )
    }

    if (!subscription) {
      return NextResponse.json(
        { error: 'No subscription found for this account' },
        { status: 404 }
      )
    }

    // Check if subscription has Razorpay subscription ID
    if (!subscription.razorpay_subscription_id) {
      return NextResponse.json(
        { 
          error: 'This subscription was created before Razorpay integration. Please contact support to cancel, or upgrade to a new plan to enable self-service cancellation.',
          requiresSupport: true
        },
        { status: 400 }
      )
    }

    // Check if already canceled
    if (subscription.status === 'canceled' || subscription.cancel_at_period_end) {
      return NextResponse.json(
        { error: 'Subscription is already canceled' },
        { status: 400 }
      )
    }

    // Initialize Razorpay instance
    const razorpay = getRazorpayInstance()

    // Cancel subscription in Razorpay (this sets cancel_at_period_end)
    await razorpay.subscriptions.cancel(subscription.razorpay_subscription_id)

    // Update database - set cancel_at_period_end but keep status active until period ends
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        canceled_at: new Date().toISOString(),
        // Keep status as 'active' until period ends - user still has access
        // Status will be changed to 'canceled' by webhook when period actually ends
      })
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error updating subscription:', updateError)
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      )
    }

    // Format period end date for user message
    const periodEndDate = subscription.current_period_end
      ? new Date(subscription.current_period_end).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : 'the end of your billing period'

    return NextResponse.json({ 
      success: true,
      message: `Subscription canceled successfully. You'll continue to have access to ${subscription.tier === 'trader' ? 'Trader' : 'Pro'} features until ${periodEndDate}.`,
      periodEndDate: subscription.current_period_end
    })
  } catch (error) {
    console.error('Error canceling subscription:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}

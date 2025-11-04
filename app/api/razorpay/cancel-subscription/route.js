// app/api/razorpay/cancel-subscription/route.js
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
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      )
    }

    // Get subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('razorpay_subscription_id')
      .eq('user_id', userId)
      .single()

    if (!subscription?.razorpay_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      )
    }

    // Cancel subscription in Razorpay
    await razorpay.subscriptions.cancel(subscription.razorpay_subscription_id)

    // Update database
    await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        cancel_at_period_end: true,
      })
      .eq('user_id', userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error canceling Razorpay subscription:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}

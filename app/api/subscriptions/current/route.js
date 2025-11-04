// app/api/subscriptions/current/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    // Get user ID from Authorization header or query params
    const authHeader = request.headers.get('authorization')
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId && !authHeader) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 401 }
      )
    }

    // For now, we'll use userId from query params
    // In production, verify JWT token from authHeader
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    // If no subscription found, return free tier
    if (!subscription) {
      return NextResponse.json({
        subscription: {
          tier: 'free',
          status: 'active',
          exchanges_connected: 0,
          trades_analyzed_this_month: 0,
          reports_generated_this_month: 0,
        }
      })
    }

    // Normalize subscription data
    return NextResponse.json({ 
      subscription: {
        ...subscription,
        // Use Razorpay IDs
        customer_id: subscription.razorpay_customer_id,
        subscription_id: subscription.razorpay_subscription_id,
      }
    })
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    )
  }
}

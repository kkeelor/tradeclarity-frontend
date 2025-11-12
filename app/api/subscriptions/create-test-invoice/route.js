// app/api/subscriptions/create-test-invoice/route.js
// Utility endpoint to create a test invoice for existing subscriptions
// This helps test the billing/receipts functionality

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 401 }
      )
    }

    // Get user's subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('tier, current_period_start, current_period_end, razorpay_subscription_id')
      .eq('user_id', userId)
      .single()

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'No subscription found for this user' },
        { status: 404 }
      )
    }

    // Skip if free tier
    if (subscription.tier === 'free') {
      return NextResponse.json(
        { error: 'Cannot create invoice for free tier. Please upgrade first.' },
        { status: 400 }
      )
    }

    // Generate invoice number
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-8)}`
    
    // Format billing period: "12 November 2025 - 12 December 2025"
    const periodStart = subscription.current_period_start 
      ? new Date(subscription.current_period_start)
      : new Date()
    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    
    const formatDate = (date) => {
      return date.toLocaleDateString('en-US', { 
        day: 'numeric',
        month: 'long', 
        year: 'numeric'
      })
    }
    
    const billingPeriod = `${formatDate(periodStart)} - ${formatDate(periodEnd)}`
    
    // Get tier display name and pricing
    const tierName = subscription.tier === 'trader' ? 'Trader Plan' : subscription.tier === 'pro' ? 'Pro Plan' : 'Premium Plan'
    
    // Mock amounts (you can adjust these based on your actual pricing)
    const amounts = {
      trader: 99900, // ₹999.00 in paise
      pro: 199900,   // ₹1999.00 in paise
    }
    
    const amount = amounts[subscription.tier] || 99900
    
    // Create test invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        user_id: userId,
        invoice_number: invoiceNumber,
        description: `Subscription payment for ${tierName}`,
        plan_name: tierName,
        billing_period: billingPeriod,
        amount: amount,
        currency: 'INR',
        status: 'paid',
        payment_method: 'razorpay',
        razorpay_subscription_id: subscription.razorpay_subscription_id,
        paid_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (invoiceError) {
      console.error('Error creating test invoice:', invoiceError)
      
      // Check if table doesn't exist
      if (invoiceError.code === '42P01' || invoiceError.message?.includes('does not exist')) {
        return NextResponse.json(
          { 
            error: 'Invoices table does not exist. Please run the migration: create_invoices_table.sql',
            migrationNeeded: true
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to create invoice', details: invoiceError.message },
        { status: 500 }
      )
    }

    console.log(`Test invoice created: ${invoiceNumber} for user ${userId}`)

    return NextResponse.json({ 
      success: true,
      invoice,
      message: 'Test invoice created successfully'
    })
  } catch (error) {
    console.error('Error creating test invoice:', error)
    return NextResponse.json(
      { error: 'Failed to create test invoice', details: error.message },
      { status: 500 }
    )
  }
}

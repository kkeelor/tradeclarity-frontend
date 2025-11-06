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
    const missing = []
    if (!process.env.RAZORPAY_KEY_ID) missing.push('RAZORPAY_KEY_ID')
    if (!process.env.RAZORPAY_KEY_SECRET) missing.push('RAZORPAY_KEY_SECRET')
    throw new Error(`Razorpay credentials not configured. Missing: ${missing.join(', ')}`)
  }
  
  // Validate key format
  if (!process.env.RAZORPAY_KEY_ID.startsWith('rzp_')) {
    throw new Error('Invalid RAZORPAY_KEY_ID format. Should start with "rzp_"')
  }
  
  if (process.env.RAZORPAY_KEY_SECRET.length < 20) {
    throw new Error('RAZORPAY_KEY_SECRET appears to be incomplete or invalid')
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

    console.log('Create order request:', { amount, currency, planId, userId, billingCycle, tier })

    if (!amount || !userId || !tier) {
      return NextResponse.json(
        { error: 'Amount, User ID, and Tier are required' },
        { status: 400 }
      )
    }

    // Validate amount (minimum 100 paise = 1 INR)
    if (amount < 1) {
      return NextResponse.json(
        { error: 'Amount must be at least 1 INR' },
        { status: 400 }
      )
    }

    // Initialize Razorpay instance
    const razorpay = getRazorpayInstance()

    // Get user email from Supabase
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)
    if (authError) {
      console.error('Error fetching user:', authError)
      return NextResponse.json(
        { error: 'Failed to fetch user: ' + authError.message },
        { status: 500 }
      )
    }
    if (!authUser?.user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const userEmail = authUser.user.email
    const userName = authUser.user.user_metadata?.name || authUser.user.email?.split('@')[0] || 'Customer'

    // Get or create Razorpay customer
    // Use maybeSingle() instead of single() to handle case where subscription doesn't exist
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('razorpay_customer_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (subError && subError.code !== 'PGRST116') { // PGRST116 is "not found" which is OK
      console.error('Error fetching subscription:', subError)
      return NextResponse.json(
        { error: 'Failed to fetch subscription: ' + subError.message },
        { status: 500 }
      )
    }

    let customerId = subscription?.razorpay_customer_id

    if (!customerId) {
      try {
        // Create customer in Razorpay
        console.log('Creating Razorpay customer:', { email: userEmail, name: userName })
        const customer = await razorpay.customers.create({
          email: userEmail,
          name: userName,
          notes: {
            userId: userId,
          },
        })
        customerId = customer.id
        console.log('Razorpay customer created:', customerId)

        // Update subscription with customer ID
        const { error: upsertError } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            razorpay_customer_id: customerId,
          }, {
            onConflict: 'user_id'
          })

        if (upsertError) {
          console.error('Error upserting subscription:', upsertError)
          // Don't fail the order creation if this fails, we can continue
        }
      } catch (customerError) {
        console.error('Error creating Razorpay customer:', customerError)
        return NextResponse.json(
          { error: 'Failed to create customer: ' + (customerError.message || customerError.description || 'Unknown error') },
          { status: 500 }
        )
      }
    }

    // Create order in Razorpay
    // Amount should be in paise (smallest currency unit) for INR
    const amountInPaise = Math.round(amount * 100)
    
    // Razorpay minimum amount is 100 paise (1 INR)
    if (amountInPaise < 100) {
      return NextResponse.json(
        { error: 'Amount must be at least 1 INR (100 paise)' },
        { status: 400 }
      )
    }

    const orderOptions = {
      amount: amountInPaise,
      currency: currency,
      receipt: `TC_${Date.now()}_${userId.slice(0, 8)}`, // Max 40 chars: TC_ (3) + timestamp (13) + _ (1) + userId (8) = 25 chars
      notes: {
        userId: userId,
        planId: planId || '',
        tier: tier,
        billingCycle: billingCycle || 'monthly',
      },
    }

    console.log('Creating Razorpay order:', orderOptions)
    const order = await razorpay.orders.create(orderOptions)
    console.log('Razorpay order created:', order.id)

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    })
  } catch (error) {
    console.error('Error creating Razorpay order:', error)
    console.error('Error stack:', error.stack)
    console.error('Error details:', {
      message: error.message,
      description: error.description,
      field: error.field,
      code: error.code,
      statusCode: error.statusCode,
      error: error.error,
      name: error.name
    })
    
    // Extract more details from Razorpay errors
    let errorMessage = error.message || error.description || 'Failed to create order'
    if (error.error) {
      if (error.error.description) {
        errorMessage = error.error.description
      } else if (typeof error.error === 'string') {
        errorMessage = error.error
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error.field ? `Field: ${error.field}` : undefined,
        code: error.code || error.error?.code
      },
      { status: 500 }
    )
  }
}

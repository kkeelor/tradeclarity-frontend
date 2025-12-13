// app/api/snaptrade/register/route.js
// Register TradeClarity user with Snaptrade
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { registerSnaptradeUser } from '@/lib/snaptrade-client'
import { encrypt } from '@/lib/encryption'

export async function POST(request) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('❌ [Snaptrade Register] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use user.id (UUID) as Snaptrade userId - immutable and recommended by Snaptrade
    const snaptradeUserId = user.id || user.email

    // Check if user already registered in our database
    const { data: existing, error: fetchError } = await supabase
      .from('snaptrade_users')
      .select('id, user_id, snaptrade_user_id')
      .eq('user_id', user.id)
      .single()

    if (existing) {
      console.log('✅ [Snaptrade Register] User already registered in database:', {
        userId: user.id,
        snaptradeUserId: existing.snaptrade_user_id,
      })
      return NextResponse.json(
        {
          success: true,
          message: 'User already registered with Snaptrade',
          userId: existing.snaptrade_user_id,
          alreadyExists: true,
        },
        { status: 200 }
      )
    }

    // Check if user exists in Snaptrade API (prevent duplicate charges)
    // Note: Snaptrade API doesn't have a direct "check user exists" endpoint,
    // but we can try to register and handle the error if user already exists
    console.log('🔍 [Snaptrade Register] Attempting registration with userId:', snaptradeUserId)
    console.log('💰 [Snaptrade Register] Registration attempt logged to prevent duplicate charges')

    let snaptradeUser
    try {
      // Register with Snaptrade
      snaptradeUser = await registerSnaptradeUser(snaptradeUserId)
    } catch (error) {
      // Check if error is due to user already existing
      const errorMessage = error.message || ''
      const errorData = error.response?.data || {}
      
      // Snaptrade may return different error codes for existing users
      if (
        errorMessage.includes('already exists') ||
        errorMessage.includes('duplicate') ||
        errorMessage.includes('User already registered') ||
        error.response?.status === 409 || // Conflict
        errorData?.code === 'USER_EXISTS' ||
        errorData?.error?.code === 'USER_EXISTS'
      ) {
        console.warn('⚠️ [Snaptrade Register] User already exists in Snaptrade API:', {
          userId: user.id,
          snaptradeUserId,
          error: errorMessage,
        })
        
        // User exists in Snaptrade but not in our DB - this shouldn't happen normally
        // but we'll handle it gracefully
        return NextResponse.json(
          {
            error: 'User already registered with Snaptrade',
            alreadyExists: true,
          },
          { status: 409 }
        )
      }
      
      // Re-throw other errors
      throw error
    }

    // Encrypt and store userSecret
    const encryptedSecret = encrypt(snaptradeUser.userSecret)

    // Store in database
    const { data, error: insertError } = await supabase
      .from('snaptrade_users')
      .insert({
        user_id: user.id,
        snaptrade_user_id: snaptradeUser.userId,
        user_secret_encrypted: encryptedSecret,
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ [Snaptrade Register] Error storing user:', insertError)
      return NextResponse.json(
        { error: 'Failed to store Snaptrade user data' },
        { status: 500 }
      )
    }

    console.log('✅ [Snaptrade Register] User registered:', snaptradeUser.userId)

    return NextResponse.json({
      success: true,
      userId: snaptradeUser.userId,
      message: 'Successfully registered with Snaptrade',
    })
  } catch (error) {
    console.error('❌ [Snaptrade Register] Error:', error)
    console.error('❌ [Snaptrade Register] Error stack:', error.stack)
    
    // Preserve original error status if it's an HTTP error
    const status = error.response?.status || 500
    
    return NextResponse.json(
      {
        error: error.message || 'Failed to register with Snaptrade',
        details: error.response?.data || undefined,
      },
      { status }
    )
  }
}

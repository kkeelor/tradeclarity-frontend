// app/api/snaptrade/initiate-connection/route.js
// One-call endpoint: check registration, register if needed, generate login URL
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { registerSnaptradeUser, generateLoginUrl } from '@/lib/snaptrade-client'
import { encrypt, decrypt } from '@/lib/encryption'

export async function POST(request) {
  try {
    const supabase = createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('❌ [Snaptrade Initiate] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { broker, customRedirect } = await request.json()

    console.log('🔵 [Snaptrade Initiate] Starting connection flow:', {
      userId: user.id,
      email: user.email,
      broker,
    })

    // Step 1: Check if user already registered in database
    // Check by user_id (TradeClarity user ID)
    const { data: existingByUserId, error: fetchErrorByUserId } = await supabase
      .from('snaptrade_users')
      .select('id, snaptrade_user_id, user_secret_encrypted')
      .eq('user_id', user.id)
      .single()

    // Also check by email if available (to catch duplicates from same email)
    let existingByEmail = null
    if (user.email) {
      const { data: emailCheck } = await supabase
        .from('snaptrade_users')
        .select('id, snaptrade_user_id, user_secret_encrypted, user_id')
        .eq('snaptrade_user_id', user.email)
        .maybeSingle()
      
      if (emailCheck) {
        existingByEmail = emailCheck
        console.log('⚠️ [Snaptrade Initiate] Found existing user by email:', {
          email: user.email,
          existingUserId: emailCheck.user_id,
          currentUserId: user.id,
          snaptradeUserId: emailCheck.snaptrade_user_id,
        })
      }
    }

    // Also check by user.id as snaptrade_user_id (in case it was registered with UUID)
    const { data: existingBySnaptradeId } = await supabase
      .from('snaptrade_users')
      .select('id, snaptrade_user_id, user_secret_encrypted, user_id')
      .eq('snaptrade_user_id', user.id)
      .maybeSingle()

    if (existingBySnaptradeId && existingBySnaptradeId.user_id !== user.id) {
      console.log('⚠️ [Snaptrade Initiate] Found existing user by Snaptrade ID:', {
        snaptradeUserId: user.id,
        existingUserId: existingBySnaptradeId.user_id,
        currentUserId: user.id,
      })
    }

    const existing = existingByUserId || existingByEmail || existingBySnaptradeId

    let snaptradeUserId
    let userSecret

    if (existing) {
      // User already registered - use existing credentials
      console.log('✅ [Snaptrade Initiate] User already registered:', {
        userId: user.id,
        email: user.email,
        snaptradeUserId: existing.snaptrade_user_id,
        foundBy: existingByUserId ? 'user_id' : existingByEmail ? 'email' : 'snaptrade_id',
      })
      snaptradeUserId = existing.snaptrade_user_id
      userSecret = decrypt(existing.user_secret_encrypted)
    } else {
      // User not registered - register silently
      // Use user.id (UUID) as Snaptrade userId - immutable and recommended
      const snaptradeUserIdForRegistration = user.id || user.email
      
      console.log('🔍 [Snaptrade Initiate] Registering new user silently:', {
        userId: user.id,
        email: user.email,
        snaptradeUserIdForRegistration,
      })
      console.log('💰 [Snaptrade Initiate] Registration attempt logged to prevent duplicate charges')

      try {
        const snaptradeUser = await registerSnaptradeUser(snaptradeUserIdForRegistration)
        snaptradeUserId = snaptradeUser.userId
        userSecret = snaptradeUser.userSecret
        
        console.log('✅ [Snaptrade Initiate] Snaptrade API registration successful:', {
          returnedUserId: snaptradeUser.userId,
          hasUserSecret: !!snaptradeUser.userSecret,
        })

        // Encrypt and store userSecret
        const encryptedSecret = encrypt(userSecret)

        // Double-check before inserting to prevent race conditions
        const { data: doubleCheck } = await supabase
          .from('snaptrade_users')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (doubleCheck) {
          console.warn('⚠️ [Snaptrade Initiate] User was registered between check and insert (race condition):', {
            userId: user.id,
            existingId: doubleCheck.id,
          })
          // Use existing record instead
          const { data: existingRecord } = await supabase
            .from('snaptrade_users')
            .select('snaptrade_user_id, user_secret_encrypted')
            .eq('user_id', user.id)
            .single()
          
          snaptradeUserId = existingRecord.snaptrade_user_id
          userSecret = decrypt(existingRecord.user_secret_encrypted)
        } else {
          // Store in database
          console.log('💾 [Snaptrade Initiate] Storing user in database:', {
            user_id: user.id,
            snaptrade_user_id: snaptradeUser.userId,
          })
          
          const { data: inserted, error: insertError } = await supabase
            .from('snaptrade_users')
            .insert({
              user_id: user.id,
              snaptrade_user_id: snaptradeUser.userId,
              user_secret_encrypted: encryptedSecret,
            })
            .select()
            .single()

          if (insertError) {
            console.error('❌ [Snaptrade Initiate] Error storing user:', {
              error: insertError,
              code: insertError.code,
              message: insertError.message,
              details: insertError.details,
            })
            
            // If it's a unique constraint violation, try to fetch existing
            if (insertError.code === '23505') {
              console.log('🔄 [Snaptrade Initiate] Unique constraint violation, fetching existing user')
              const { data: existingRecord } = await supabase
                .from('snaptrade_users')
                .select('snaptrade_user_id, user_secret_encrypted')
                .eq('user_id', user.id)
                .single()
              
              if (existingRecord) {
                snaptradeUserId = existingRecord.snaptrade_user_id
                userSecret = decrypt(existingRecord.user_secret_encrypted)
                console.log('✅ [Snaptrade Initiate] Using existing user after constraint violation')
              } else {
                return NextResponse.json(
                  { error: 'Failed to store Snaptrade user data' },
                  { status: 500 }
                )
              }
            } else {
              return NextResponse.json(
                { error: 'Failed to store Snaptrade user data' },
                { status: 500 }
              )
            }
          } else {
            console.log('✅ [Snaptrade Initiate] User stored successfully in database:', {
              insertedId: inserted.id,
              snaptradeUserId: inserted.snaptrade_user_id,
            })
          }
        }
      } catch (error) {
        // Check if error is due to user already existing in Snaptrade API
        const errorMessage = error.message || ''
        const errorData = error.response?.data || {}

        if (
          errorMessage.includes('already exists') ||
          errorMessage.includes('duplicate') ||
          errorMessage.includes('User already registered') ||
          error.response?.status === 409 ||
          errorData?.code === 'USER_EXISTS' ||
          errorData?.error?.code === 'USER_EXISTS'
        ) {
          console.warn('⚠️ [Snaptrade Initiate] User already exists in Snaptrade API but not in our DB')
          return NextResponse.json(
            {
              error: 'User already registered with Snaptrade. Please contact support.',
              code: 'DUPLICATE_USER',
            },
            { status: 409 }
          )
        }

        // Re-throw other errors
        throw error
      }
    }

    // Step 2: Generate login URL
    console.log('🔗 [Snaptrade Initiate] Generating login URL:', {
      snaptradeUserId,
      broker,
      customRedirect: customRedirect || 'default',
    })
    
    const loginData = await generateLoginUrl(
      snaptradeUserId,
      userSecret,
      {
        broker: broker || undefined,
        customRedirect:
          customRedirect ||
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/snaptrade/callback?status=success`,
        immediateRedirect: true,
        connectionType: 'read',
      }
    )

    console.log('✅ [Snaptrade Initiate] Login URL generated successfully:', {
      hasRedirectURI: !!loginData.redirectURI,
      hasSessionId: !!loginData.sessionId,
      redirectURIPrefix: loginData.redirectURI?.substring(0, 50) + '...',
    })

    return NextResponse.json({
      success: true,
      redirectURI: loginData.redirectURI,
      sessionId: loginData.sessionId,
      wasRegistered: !existing, // Indicates if registration happened in this call
    })
  } catch (error) {
    console.error('❌ [Snaptrade Initiate] Error:', error)
    console.error('❌ [Snaptrade Initiate] Error stack:', error.stack)

    // Preserve original error status if it's an HTTP error
    const status = error.response?.status || 500

    return NextResponse.json(
      {
        error: error.message || 'Failed to initiate Snaptrade connection',
        details: error.response?.data || undefined,
      },
      { status }
    )
  }
}

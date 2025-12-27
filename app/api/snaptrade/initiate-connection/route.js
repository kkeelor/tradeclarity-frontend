// app/api/snaptrade/initiate-connection/route.js
// One-call endpoint: check registration, register if needed, generate login URL
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { registerSnaptradeUser, generateLoginUrl } from '@/lib/snaptrade-client'
import { encrypt, decrypt } from '@/lib/encryption'

export async function POST(request) {
  try {
    // Verify SnapTrade credentials are available before proceeding
    const hasConsumerKey = !!process.env.SNAPTRADE_CONSUMER_KEY
    const hasClientId = !!process.env.SNAPTRADE_CLIENT_ID
    
    if (!hasConsumerKey || !hasClientId) {
      console.error('❌ [Snaptrade Initiate] Missing credentials:', {
        hasConsumerKey,
        hasClientId,
        envKeys: Object.keys(process.env).filter(k => k.includes('SNAPTRADE')),
      })
      return NextResponse.json(
        { error: 'Snaptrade API credentials not configured on server' },
        { status: 500 }
      )
    }

    const supabase = await createClient()

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
    // Check by user_id (TradeClarity user ID) - fetch all matches to handle duplicates
    const { data: usersByUserId, error: fetchErrorByUserId } = await supabase
      .from('snaptrade_users')
      .select('id, snaptrade_user_id, user_secret_encrypted')
      .eq('user_id', user.id)

    // If there was an error (not just "not found"), log it
    if (fetchErrorByUserId) {
      console.warn('⚠️ [Snaptrade Initiate] Error checking by user_id:', fetchErrorByUserId)
    }

    // Handle duplicates - if multiple rows exist, log warning and use first one
    let existingByUserId = null
    if (usersByUserId && usersByUserId.length > 0) {
      if (usersByUserId.length > 1) {
        console.warn('⚠️ [Snaptrade Initiate] Found duplicate SnapTrade user records:', {
          userId: user.id,
          count: usersByUserId.length,
          records: usersByUserId.map(r => ({ id: r.id, snaptrade_user_id: r.snaptrade_user_id })),
        })
        // TODO: Consider cleaning up duplicates in the future
      }
      // Use the first record (most recent by default, or we could order by created_at)
      existingByUserId = usersByUserId[0]
      console.log('✅ [Snaptrade Initiate] Found existing user by user_id:', {
        recordId: existingByUserId.id,
        snaptradeUserId: existingByUserId.snaptrade_user_id,
        isDuplicate: usersByUserId.length > 1,
      })
    }

    // Also check by email if available (to catch duplicates from same email)
    let existingByEmail = null
    if (user.email) {
      const { data: emailCheck } = await supabase
        .from('snaptrade_users')
        .select('id, snaptrade_user_id, user_secret_encrypted, user_id')
        .eq('snaptrade_user_id', user.email)
        .maybeSingle()
      
      if (emailCheck) {
        // Only use email match if it's for the current user OR if no user_id match was found
        if (emailCheck.user_id === user.id || !existingByUserId) {
          existingByEmail = emailCheck
          console.log('⚠️ [Snaptrade Initiate] Found existing user by email:', {
            email: user.email,
            existingUserId: emailCheck.user_id,
            currentUserId: user.id,
            snaptradeUserId: emailCheck.snaptrade_user_id,
            willUse: emailCheck.user_id === user.id || !existingByUserId,
          })
        } else {
          console.log('⚠️ [Snaptrade Initiate] Found user by email but belongs to different TradeClarity user:', {
            email: user.email,
            existingUserId: emailCheck.user_id,
            currentUserId: user.id,
          })
        }
      }
    }

    // Also check by user.id as snaptrade_user_id (in case it was registered with UUID)
    const { data: existingBySnaptradeId } = await supabase
      .from('snaptrade_users')
      .select('id, snaptrade_user_id, user_secret_encrypted, user_id')
      .eq('snaptrade_user_id', user.id)
      .maybeSingle()

    if (existingBySnaptradeId) {
      if (existingBySnaptradeId.user_id !== user.id) {
        console.log('⚠️ [Snaptrade Initiate] Found existing user by Snaptrade ID but belongs to different TradeClarity user:', {
          snaptradeUserId: user.id,
          existingUserId: existingBySnaptradeId.user_id,
          currentUserId: user.id,
        })
        // Don't use this if it belongs to a different user
      } else if (!existingByUserId && !existingByEmail) {
        // Only use this if no other match was found and it belongs to current user
        console.log('✅ [Snaptrade Initiate] Found existing user by Snaptrade ID:', {
          snaptradeUserId: user.id,
          userId: existingBySnaptradeId.user_id,
        })
      }
    }

    // Prioritize: user_id match > email match (if same user) > snaptrade_id match (if same user)
    const existing = existingByUserId || 
                     (existingByEmail && existingByEmail.user_id === user.id ? existingByEmail : null) ||
                     (existingBySnaptradeId && existingBySnaptradeId.user_id === user.id ? existingBySnaptradeId : null)

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
          // Use existing record instead - handle duplicates by taking first one
          const { data: existingRecords } = await supabase
            .from('snaptrade_users')
            .select('snaptrade_user_id, user_secret_encrypted')
            .eq('user_id', user.id)
          
          if (existingRecords && existingRecords.length > 0) {
            const existingRecord = existingRecords[0]
            snaptradeUserId = existingRecord.snaptrade_user_id
            userSecret = decrypt(existingRecord.user_secret_encrypted)
            if (existingRecords.length > 1) {
              console.warn('⚠️ [Snaptrade Initiate] Found multiple records in race condition check:', existingRecords.length)
            }
          } else {
            console.error('❌ [Snaptrade Initiate] Race condition: doubleCheck found but no records retrieved')
            return NextResponse.json(
              { error: 'Failed to retrieve existing Snaptrade user data' },
              { status: 500 }
            )
          }
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
              const { data: existingRecords } = await supabase
                .from('snaptrade_users')
                .select('snaptrade_user_id, user_secret_encrypted')
                .eq('user_id', user.id)
              
              if (existingRecords && existingRecords.length > 0) {
                const existingRecord = existingRecords[0]
                snaptradeUserId = existingRecord.snaptrade_user_id
                userSecret = decrypt(existingRecord.user_secret_encrypted)
                console.log('✅ [Snaptrade Initiate] Using existing user after constraint violation:', {
                  recordCount: existingRecords.length,
                  snaptradeUserId: snaptradeUserId?.substring(0, 20) + '...',
                })
                if (existingRecords.length > 1) {
                  console.warn('⚠️ [Snaptrade Initiate] Found multiple records after constraint violation:', existingRecords.length)
                }
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
          console.warn('⚠️ [Snaptrade Initiate] User already exists in Snaptrade API but not in our DB:', {
            userId: user.id,
            email: user.email,
            snaptradeUserIdForRegistration,
            errorMessage,
            errorData,
          })
          
          // Try to find if user was registered with a different identifier
          // Check if user exists with email as snaptrade_user_id
          let foundExisting = null
          if (user.email) {
            const { data: emailMatch } = await supabase
              .from('snaptrade_users')
              .select('snaptrade_user_id, user_secret_encrypted, user_id')
              .eq('snaptrade_user_id', user.email)
              .maybeSingle()
            
            if (emailMatch && emailMatch.user_id === user.id) {
              foundExisting = emailMatch
              console.log('✅ [Snaptrade Initiate] Found existing user by email after API error')
            }
          }
          
          // Check if user exists with UUID as snaptrade_user_id
          if (!foundExisting && user.id) {
            const { data: uuidMatch } = await supabase
              .from('snaptrade_users')
              .select('snaptrade_user_id, user_secret_encrypted, user_id')
              .eq('snaptrade_user_id', user.id)
              .eq('user_id', user.id)
              .maybeSingle()
            
            if (uuidMatch) {
              foundExisting = uuidMatch
              console.log('✅ [Snaptrade Initiate] Found existing user by UUID after API error')
            }
          }
          
          // Also check by user_id directly (in case we missed it earlier)
          if (!foundExisting) {
            const { data: userIdMatch } = await supabase
              .from('snaptrade_users')
              .select('snaptrade_user_id, user_secret_encrypted, user_id')
              .eq('user_id', user.id)
              .maybeSingle()
            
            if (userIdMatch) {
              foundExisting = userIdMatch
              console.log('✅ [Snaptrade Initiate] Found existing user by user_id after API error')
            }
          }
          
          if (foundExisting) {
            // Use existing credentials
            snaptradeUserId = foundExisting.snaptrade_user_id
            userSecret = decrypt(foundExisting.user_secret_encrypted)
            console.log('✅ [Snaptrade Initiate] Using existing credentials after API duplicate error')
            
            // Check if this record is linked to the current user_id, if not, update it
            if (foundExisting.user_id !== user.id) {
              // Update the record to link it to current user
              console.log('🔄 [Snaptrade Initiate] Linking SnapTrade user to current TradeClarity user:', {
                oldUserId: foundExisting.user_id,
                newUserId: user.id,
                snaptradeUserId,
              })
              
              // First, check if there's already a record for current user_id
              const { data: currentUserRecord } = await supabase
                .from('snaptrade_users')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle()
              
              if (currentUserRecord) {
                // Update existing record with the correct snaptrade_user_id and secret
                const { error: updateError } = await supabase
                  .from('snaptrade_users')
                  .update({
                    snaptrade_user_id: snaptradeUserId,
                    user_secret_encrypted: foundExisting.user_secret_encrypted,
                  })
                  .eq('id', currentUserRecord.id)
                
                if (updateError) {
                  console.error('❌ [Snaptrade Initiate] Error updating SnapTrade user link:', updateError)
                  // Continue anyway - we have the credentials
                } else {
                  console.log('✅ [Snaptrade Initiate] Successfully updated SnapTrade user link')
                }
              } else {
                // Create new record for current user
                const { error: insertError } = await supabase
                  .from('snaptrade_users')
                  .insert({
                    user_id: user.id,
                    snaptrade_user_id: snaptradeUserId,
                    user_secret_encrypted: foundExisting.user_secret_encrypted,
                  })
                
                if (insertError) {
                  console.error('❌ [Snaptrade Initiate] Error creating SnapTrade user link:', insertError)
                  // Continue anyway - we have the credentials
                } else {
                  console.log('✅ [Snaptrade Initiate] Successfully created SnapTrade user link')
                }
              }
            } else {
              console.log('✅ [Snaptrade Initiate] SnapTrade user already linked to current user')
            }
          } else {
            // User exists in SnapTrade API but we don't have their credentials
            // This shouldn't happen normally, but handle gracefully
            console.error('❌ [Snaptrade Initiate] User exists in SnapTrade API but not in our DB - cannot proceed')
            return NextResponse.json(
              {
                error: 'Your account is already registered with SnapTrade, but we cannot retrieve your credentials. Please contact support.',
                code: 'DUPLICATE_USER_NO_CREDENTIALS',
              },
              { status: 409 }
            )
          }
        } else {
          // Re-throw other errors
          throw error
        }
      }
    }

    // Step 2: Generate login URL
    console.log('🔗 [Snaptrade Initiate] Generating login URL:', {
      snaptradeUserId,
      broker,
      customRedirect: customRedirect || 'default',
      hasUserSecret: !!userSecret,
      userSecretLength: userSecret?.length,
    })
    
    let loginData
    try {
      loginData = await generateLoginUrl(
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
    } catch (loginError) {
      // Extract full error details
      const errorResponse = loginError?.response
      const errorData = errorResponse?.data
      
      console.error('❌ [Snaptrade Initiate] Failed to generate login URL:', {
        error: loginError,
        message: loginError?.message,
        stack: loginError?.stack,
        response: errorResponse ? {
          status: errorResponse.status,
          statusText: errorResponse.statusText,
          data: errorData,
          dataType: typeof errorData,
          dataString: typeof errorData === 'string' ? errorData : JSON.stringify(errorData),
          headers: errorResponse.headers,
        } : null,
        apiErrorBody: loginError?.apiErrorBody,
      })
      
      // If it's a 401, provide specific guidance with actual error details
      if (errorResponse?.status === 401) {
        const actualError = errorData?.error || errorData?.message || errorData?.detail || errorData || loginError?.apiErrorBody || 'Invalid API credentials'
        
        return NextResponse.json(
          {
            error: 'Snaptrade API authentication failed (401). Please verify your production credentials (SNAPTRADE_CONSUMER_KEY and SNAPTRADE_CLIENT_ID) are correctly set on Vercel.',
            code: 'AUTH_FAILED',
            details: typeof actualError === 'string' ? actualError : JSON.stringify(actualError),
            snapTradeError: actualError,
          },
          { status: 401 }
        )
      }
      
      throw loginError
    }

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
    console.error('❌ [Snaptrade Initiate] Error message:', error?.message)
    console.error('❌ [Snaptrade Initiate] Error stack:', error?.stack)
    
    // Log more details about the error
    if (error.response) {
      console.error('❌ [Snaptrade Initiate] Error response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers,
      })
    }
    
    if (error.request) {
      console.error('❌ [Snaptrade Initiate] Error request made but no response received')
    }

    // Preserve original error status if it's an HTTP error
    const status = error.response?.status || 500
    
    // Extract error details safely
    let errorMessage = error?.message || 'Failed to initiate Snaptrade connection'
    let errorDetails = undefined
    
    if (error.response?.data) {
      try {
        errorDetails = typeof error.response.data === 'string' 
          ? JSON.parse(error.response.data) 
          : error.response.data
        errorMessage = errorDetails?.message || errorDetails?.error || errorMessage
      } catch (e) {
        errorDetails = { raw: error.response.data }
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
        code: errorDetails?.code || errorDetails?.error?.code,
      },
      { status }
    )
  }
}

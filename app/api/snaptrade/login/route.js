// app/api/snaptrade/login/route.js
// Generate OAuth connection URL for Snaptrade brokerage linking
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { generateLoginUrl } from '@/lib/snaptrade-client'
import { decrypt } from '@/lib/encryption'

export async function POST(request) {
  try {
    const supabase = createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('❌ [Snaptrade Login] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { broker, customRedirect, reconnect } = await request.json()

    // Get Snaptrade user data
    const { data: snaptradeUser, error: fetchError } = await supabase
      .from('snaptrade_users')
      .select('snaptrade_user_id, user_secret_encrypted')
      .eq('user_id', user.id)
      .single()

    if (fetchError || !snaptradeUser) {
      return NextResponse.json(
        {
          error: 'User not registered with Snaptrade. Please register first.',
        },
        { status: 404 }
      )
    }

    // Decrypt userSecret
    const userSecret = decrypt(snaptradeUser.user_secret_encrypted)

    // Generate login URL
    const loginData = await generateLoginUrl(
      snaptradeUser.snaptrade_user_id,
      userSecret,
      {
        broker: broker || undefined,
        customRedirect:
          customRedirect || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/snaptrade/callback?status=success`,
        immediateRedirect: true,
        reconnect: reconnect || undefined,
        connectionType: 'read',
      }
    )

    console.log('✅ [Snaptrade Login] Generated login URL')

    return NextResponse.json({
      success: true,
      redirectURI: loginData.redirectURI,
      sessionId: loginData.sessionId,
    })
  } catch (error) {
    console.error('❌ [Snaptrade Login] Error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to generate Snaptrade login URL',
      },
      { status: 500 }
    )
  }
}

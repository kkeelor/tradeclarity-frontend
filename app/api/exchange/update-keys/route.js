// app/api/exchange/update-keys/route.js
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { encrypt } from '@/lib/encryption'

export async function POST(request) {
  console.log('📡 [API] /api/exchange/update-keys called')
  try {
    const supabase = createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('❌ [API] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { connectionId, apiKey, apiSecret } = await request.json()
    console.log('📥 [API] Request data:', { connectionId, hasApiKey: !!apiKey, hasApiSecret: !!apiSecret })

    // Validate inputs
    if (!connectionId || !apiKey || !apiSecret) {
      console.error('❌ [API] Missing required fields')
      return NextResponse.json(
        { error: 'Connection ID, API key, and API secret are required' },
        { status: 400 }
      )
    }

    // Verify the connection belongs to the user
    const { data: existingConnection, error: fetchError } = await supabase
      .from('exchange_connections')
      .select('id, exchange, user_id')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingConnection) {
      console.error('❌ [API] Connection not found or access denied')
      return NextResponse.json(
        { error: 'Exchange connection not found' },
        { status: 404 }
      )
    }

    // Encrypt API credentials
    const apiKeyEncrypted = encrypt(apiKey)
    const apiSecretEncrypted = encrypt(apiSecret)

    // Update the connection with new keys
    const { data: updatedConnection, error: updateError } = await supabase
      .from('exchange_connections')
      .update({
        api_key_encrypted: apiKeyEncrypted,
        api_secret_encrypted: apiSecretEncrypted,
        updated_at: new Date().toISOString(),
        is_active: true
      })
      .eq('id', connectionId)
      .select('id, exchange, updated_at')
      .single()

    if (updateError) {
      console.error('❌ [API] Error updating connection:', updateError)
      return NextResponse.json(
        { error: 'Failed to update API keys' },
        { status: 500 }
      )
    }

    console.log('✅ [API] API keys updated successfully')
    return NextResponse.json({
      success: true,
      connection: {
        id: updatedConnection.id,
        exchange: updatedConnection.exchange,
        updatedAt: updatedConnection.updated_at
      }
    })
  } catch (error) {
    console.error('❌ [API] Update keys error:', error)
    return NextResponse.json(
      { error: 'Failed to update API keys' },
      { status: 500 }
    )
  }
}

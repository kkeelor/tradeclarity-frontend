// app/api/exchange/fetch-data/route.js
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { decrypt } from '@/lib/encryption'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL

export async function POST(request) {
  try {
    const supabase = await createClient()

    const { connectionId, userId, exchange, apiKey, apiSecret } = await request.json()

    // Try to get authenticated user, but don't fail if session missing (server-to-server calls)
    let authenticatedUserId = userId
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (user) {
      // If we have a session, verify userId matches
      if (userId && userId !== user.id) {
        console.error('❌ [Fetch Data] User ID mismatch:', { requested: userId, authenticated: user.id })
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      authenticatedUserId = user.id
    } else if (!userId) {
      // No session and no userId provided
      console.error('❌ [Fetch Data] No auth session and no userId provided')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      )
    }

    if (!BACKEND_URL) {
      console.error('BACKEND_URL not configured')
      return NextResponse.json(
        { error: 'Backend URL not configured' },
        { status: 500 }
      )
    }

    // Use credentials directly if provided (preferred for avoiding race conditions)
    let finalApiKey = apiKey
    let finalApiSecret = apiSecret
    let finalExchange = exchange

    // If credentials not provided, fetch from database
    if (!finalApiKey || !finalApiSecret) {
      const { data: connection, error: fetchError } = await supabase
        .from('exchange_connections')
        .select('*')
        .eq('id', connectionId)
        .eq('user_id', authenticatedUserId)
        .single()

      if (fetchError || !connection) {
        console.error('Error fetching connection:', fetchError)
        return NextResponse.json(
          { error: 'Connection not found' },
          { status: 404 }
        )
      }

      // Decrypt API credentials
      try {
        finalApiKey = decrypt(connection.api_key_encrypted)
        finalApiSecret = decrypt(connection.api_secret_encrypted)
        finalExchange = connection.exchange
      } catch (decryptError) {
        console.error('Error decrypting credentials:', decryptError)
        return NextResponse.json(
          { error: 'Failed to decrypt credentials' },
          { status: 500 }
        )
      }
    }

    // Determine the correct backend endpoint based on exchange
    const exchangeName = finalExchange.toLowerCase()
    let endpoint

    if (exchangeName === 'binance') {
      endpoint = `${BACKEND_URL}/api/binance/fetch-all`
    } else if (exchangeName === 'coindcx') {
      endpoint = `${BACKEND_URL}/api/coindcx/fetch-all`
    } else {
      return NextResponse.json(
        { error: `Unsupported exchange: ${exchangeName}` },
        { status: 400 }
      )
    }

    console.log(`📡 Fetching data from ${exchangeName}...`)

    // Fetch data from the exchange backend
    const backendResponse = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: finalApiKey, apiSecret: finalApiSecret })
    })

    if (!backendResponse.ok) {
      const error = await backendResponse.json()
      console.error('Backend fetch error:', error)
      return NextResponse.json(
        { error: error.error || 'Failed to fetch exchange data' },
        { status: backendResponse.status }
      )
    }

    const response = await backendResponse.json()

    if (!response.success) {
      console.error('Backend returned unsuccessful response:', response)
      return NextResponse.json(
        { error: response.error || 'Failed to fetch exchange data' },
        { status: 500 }
      )
    }

    const data = response.data

    console.log('✅ Data fetched:', {
      spotTrades: data.spotTrades?.length || 0,
      futuresIncome: data.futuresIncome?.length || 0,
      futuresPositions: data.futuresPositions?.length || 0
    })

    // Update the connection's last_synced timestamp
    const { error: updateError } = await supabase
      .from('exchange_connections')
      .update({
        updated_at: new Date().toISOString(),
        last_synced: new Date().toISOString()
      })
      .eq('id', connectionId)

    if (updateError) {
      console.error('Error updating connection timestamp:', updateError)
    }

    // Return data immediately for analytics (DB storage happens separately via /api/trades/store)
    return NextResponse.json({
      success: true,
      spotTrades: data.spotTrades || [],
      futuresIncome: data.futuresIncome || [],
      futuresPositions: data.futuresPositions || [],
      metadata: data.metadata,
      // Include these for background storage call
      connectionId: connectionId,
      userId: authenticatedUserId,
      exchange: exchangeName
    })
  } catch (error) {
    console.error('Fetch data error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch exchange data' },
      { status: 500 }
    )
  }
}

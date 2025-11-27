// app/api/exchange/connect/route.js
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { encrypt } from '@/lib/encryption'
import { TIER_LIMITS, canAddConnection } from '@/lib/featureGates'

export async function POST(request) {
  try {
    const supabase = createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('❌ [API] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { exchange, apiKey, apiSecret } = await request.json()

    // Validate inputs
    if (!exchange || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'Exchange, API key, and API secret are required' },
        { status: 400 }
      )
    }

    if (!['binance', 'coindcx'].includes(exchange.toLowerCase())) {
      return NextResponse.json(
        { error: 'Invalid exchange. Supported: binance, coindcx' },
        { status: 400 }
      )
    }

    // Encrypt API credentials
    const apiKeyEncrypted = encrypt(apiKey)
    const apiSecretEncrypted = encrypt(apiSecret)

    // Check if connection already exists
    const { data: existing } = await supabase
      .from('exchange_connections')
      .select('id')
      .eq('user_id', user.id)
      .eq('exchange', exchange.toLowerCase())
      .single()

    // Only check connection limit for NEW connections (not updates)
    if (!existing) {
      // Get user's subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('tier, exchanges_connected')
        .eq('user_id', user.id)
        .single()

      // Count current active connections
      const { count: currentConnections } = await supabase
        .from('exchange_connections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_active', true)

      // Check if user can add another connection
      // Use effective tier (considers cancel_at_period_end)
      const { getEffectiveTier } = await import('@/lib/featureGates')
      const userTier = (getEffectiveTier(subscription) || 'free').toLowerCase()
      const limit = TIER_LIMITS[userTier]?.maxConnections || 1
      
      if (limit !== Infinity && (currentConnections || 0) >= limit) {
        const nextTier = userTier === 'free' ? 'Trader' : userTier === 'trader' ? 'Pro' : null
        return NextResponse.json({
          error: 'CONNECTION_LIMIT_REACHED',
          message: `You've reached your connection limit (${limit}). ${nextTier ? `Upgrade to ${nextTier} to add more exchanges.` : ''}`,
          limit,
          current: currentConnections || 0,
          tier: userTier,
          upgradeTier: nextTier?.toLowerCase() || null
        }, { status: 403 })
      }
    }

    let connectionData

    if (existing) {
      // Update existing connection
      const { data, error: updateError } = await supabase
        .from('exchange_connections')
        .update({
          api_key_encrypted: apiKeyEncrypted,
          api_secret_encrypted: apiSecretEncrypted,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating connection:', updateError)
        return NextResponse.json(
          { error: 'Failed to update exchange connection' },
          { status: 500 }
        )
      }

      connectionData = data
    } else {
      // Create new connection
      const { data, error: insertError } = await supabase
        .from('exchange_connections')
        .insert({
          user_id: user.id,
          exchange: exchange.toLowerCase(),
          api_key_encrypted: apiKeyEncrypted,
          api_secret_encrypted: apiSecretEncrypted,
          is_active: true
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error creating connection:', insertError)
        return NextResponse.json(
          { error: 'Failed to create exchange connection' },
          { status: 500 }
        )
      }

      connectionData = data
    }

    // Trigger data fetch and wait for completion
    // Pass credentials directly instead of querying database again
    let fetchResult = null
    try {
      // Auto-detect the correct URL based on the request
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
      const host = request.headers.get('host') || 'localhost:3000'
      const baseUrl = `${protocol}://${host}`


      const fetchResponse = await fetch(`${baseUrl}/api/exchange/fetch-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: connectionData.id,
          userId: user.id,
          exchange: connectionData.exchange,
          apiKey: apiKey,
          apiSecret: apiSecret
        })
      })

      if (fetchResponse.ok) {
        fetchResult = await fetchResponse.json()
        
        // Store trades to database in background (don't wait for it)
        if (fetchResult.success && fetchResult.spotTrades) {
          try {
            const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
            const host = request.headers.get('host') || 'localhost:3000'
            const baseUrl = `${protocol}://${host}`
            
            // Call /api/trades/store in background (fire and forget)
            fetch(`${baseUrl}/api/trades/store`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                spotTrades: fetchResult.spotTrades || [],
                futuresIncome: fetchResult.futuresIncome || [],
                userId: user.id,
                exchange: connectionData.exchange,
                connectionId: connectionData.id,
                metadata: fetchResult.metadata
              })
            }).catch(err => {
              console.error('⚠️ Background storage failed (non-critical):', err)
            })
            
          } catch (storageError) {
            console.error('⚠️ Error triggering background storage:', storageError)
            // Don't fail the connection if storage fails
          }
        }
      } else {
        const error = await fetchResponse.json()
        console.error('❌ Data fetch failed:', error)
      }
    } catch (fetchError) {
      console.error('Error fetching data:', fetchError)
      // Don't fail the connection save if background fetch fails
    }

    return NextResponse.json({
      success: true,
      connection: {
        id: connectionData.id,
        exchange: connectionData.exchange,
        isActive: connectionData.is_active,
        createdAt: connectionData.created_at
      },
      // Include the fetched data if available
      data: fetchResult || null
    })
  } catch (error) {
    console.error('Exchange connect error:', error)
    return NextResponse.json(
      { error: 'Failed to connect exchange' },
      { status: 500 }
    )
  }
}

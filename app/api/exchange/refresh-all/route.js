// app/api/exchange/refresh-all/route.js
// Unified refresh endpoint for all exchange connections (API-based and SnapTrade)
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { decrypt } from '@/lib/encryption'
import { getEffectiveTier } from '@/lib/featureGates'
import { getActivities } from '@/lib/snaptrade-client'
import { transformActivitiesToTrades } from '@/lib/snaptrade-transform'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL

export const dynamic = 'force-dynamic'

/**
 * Refresh all exchange connections
 * - Checks tier (Trader/Pro only)
 * - Checks cooldown (24 hours)
 * - Fetches data sequentially for better performance
 * - Stores only new trades (deduplication handled by store endpoint)
 */
export async function POST(request) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check tier - only Trader and Pro can refresh
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    
    const effectiveTier = getEffectiveTier(subscription)
    if (effectiveTier === 'free') {
      return NextResponse.json(
        { error: 'Refresh is only available for Trader and Pro tiers' },
        { status: 403 }
      )
    }

    // Get all active exchange connections
    const { data: connections, error: connectionsError } = await supabase
      .from('exchange_connections')
      .select('id, exchange, last_synced, api_key_encrypted, api_secret_encrypted, metadata')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (connectionsError) {
      console.error('Error fetching connections:', connectionsError)
      return NextResponse.json(
        { error: 'Failed to fetch connections' },
        { status: 500 }
      )
    }

    if (!connections || connections.length === 0) {
      return NextResponse.json({
        success: true,
        refreshed: [],
        errors: [],
        totalNewTrades: 0,
        message: 'No active connections found'
      })
    }

    // Check cooldown (24 hours) and filter ready connections
    const now = new Date()
    const cooldownMs = 24 * 60 * 60 * 1000 // 24 hours
    const readyConnections = connections.filter(conn => {
      if (!conn.last_synced) return true // Never synced - ready
      const lastSynced = new Date(conn.last_synced)
      const timeSinceLastSync = now - lastSynced
      return timeSinceLastSync >= cooldownMs
    })

    if (readyConnections.length === 0) {
      const earliestNextRefresh = Math.min(
        ...connections
          .filter(c => c.last_synced)
          .map(c => {
            const lastSynced = new Date(c.last_synced)
            return lastSynced.getTime() + cooldownMs
          })
      )
      const hoursRemaining = Math.ceil((earliestNextRefresh - now.getTime()) / (60 * 60 * 1000))
      
      return NextResponse.json({
        success: false,
        error: 'COOLDOWN',
        message: `All exchanges are on cooldown. Next refresh available in ${hoursRemaining} hour(s)`,
        hoursRemaining,
        refreshed: [],
        errors: []
      })
    }

    // Separate API-based exchanges from SnapTrade
    const apiConnections = readyConnections.filter(
      conn => !conn.exchange.startsWith('snaptrade')
    )
    const snaptradeConnections = readyConnections.filter(
      conn => conn.exchange.startsWith('snaptrade')
    )

    const results = {
      refreshed: [],
      errors: [],
      totalNewTrades: 0
    }

    // Refresh API-based exchanges sequentially
    for (const conn of apiConnections) {
      try {
        console.log(`🔄 Refreshing ${conn.exchange} connection ${conn.id}...`)
        console.log(`📋 Connection details:`, {
          id: conn.id,
          exchange: conn.exchange,
          hasApiKeyEncrypted: !!conn.api_key_encrypted,
          hasApiSecretEncrypted: !!conn.api_secret_encrypted,
          apiKeyEncryptedLength: conn.api_key_encrypted?.length || 0,
          apiSecretEncryptedLength: conn.api_secret_encrypted?.length || 0
        })
        
        // Decrypt API credentials
        let apiKey, apiSecret
        try {
          // Check if credentials exist
          if (!conn.api_key_encrypted || !conn.api_secret_encrypted) {
            throw new Error(`API credentials not found in database (api_key: ${!!conn.api_key_encrypted}, api_secret: ${!!conn.api_secret_encrypted})`)
          }
          
          // Check if encrypted fields are empty strings
          if (conn.api_key_encrypted.trim() === '' || conn.api_secret_encrypted.trim() === '') {
            throw new Error('API credentials are empty strings in database')
          }
          
          apiKey = decrypt(conn.api_key_encrypted)
          apiSecret = decrypt(conn.api_secret_encrypted)
          
          // Validate decrypted credentials are not empty
          if (!apiKey || !apiSecret || apiKey.trim() === '' || apiSecret.trim() === '') {
            throw new Error('Decrypted credentials are empty or invalid')
          }
          
          console.log(`✅ Decrypted credentials for ${conn.exchange} (key length: ${apiKey.length}, secret length: ${apiSecret.length})`)
        } catch (decryptError) {
          console.error(`❌ Failed to decrypt credentials for ${conn.exchange}:`, {
            error: decryptError.message,
            stack: decryptError.stack,
            hasApiKey: !!conn.api_key_encrypted,
            hasApiSecret: !!conn.api_secret_encrypted,
            apiKeyLength: conn.api_key_encrypted?.length || 0,
            apiSecretLength: conn.api_secret_encrypted?.length || 0,
            apiKeyPreview: conn.api_key_encrypted?.substring(0, 20) || 'N/A',
            apiSecretPreview: conn.api_secret_encrypted?.substring(0, 20) || 'N/A'
          })
          results.errors.push({
            connectionId: conn.id,
            exchange: conn.exchange,
            error: `Failed to decrypt API credentials: ${decryptError.message}`
          })
          continue
        }

        // Fetch data from exchange
        const exchangeName = conn.exchange.toLowerCase()
        let endpoint
        if (exchangeName === 'binance') {
          endpoint = `${BACKEND_URL}/api/binance/fetch-all`
        } else if (exchangeName === 'coindcx') {
          endpoint = `${BACKEND_URL}/api/coindcx/fetch-all`
        } else {
          results.errors.push({
            connectionId: conn.id,
            exchange: conn.exchange,
            error: `Unsupported exchange: ${exchangeName}`
          })
          continue
        }

        console.log(`📡 Fetching data from ${exchangeName} endpoint: ${endpoint}`)
        console.log(`🔑 Credentials being sent to backend:`, {
          exchange: exchangeName,
          apiKeyLength: apiKey?.length || 0,
          apiSecretLength: apiSecret?.length || 0,
          apiKeyPreview: apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 5)}` : 'N/A',
          apiSecretPreview: apiSecret ? `${apiSecret.substring(0, 10)}...${apiSecret.substring(apiSecret.length - 5)}` : 'N/A'
        })
        const fetchResponse = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey, apiSecret })
        })

        if (!fetchResponse.ok) {
          const errorData = await fetchResponse.json().catch(() => ({}))
          console.error(`❌ Backend error for ${exchangeName}:`, {
            status: fetchResponse.status,
            statusText: fetchResponse.statusText,
            error: errorData.error,
            fullError: errorData
          })
          throw new Error(errorData.error || `HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`)
        }

        const fetchData = await fetchResponse.json()
        if (!fetchData.success) {
          throw new Error(fetchData.error || 'Failed to fetch exchange data')
        }

        const data = fetchData.data
        const spotTrades = data.spotTrades || []
        const futuresIncome = data.futuresIncome || []

        // Store trades via store endpoint
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
        const host = request.headers.get('host') || 'localhost:3000'
        const baseUrl = `${protocol}://${host}`

        // Forward cookies to maintain session for internal fetch
        const cookieHeader = request.headers.get('cookie')
        const storeResponse = await fetch(`${baseUrl}/api/trades/store`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(cookieHeader && { 'cookie': cookieHeader }),
            ...(request.headers.get('authorization') && {
              'authorization': request.headers.get('authorization')
            })
          },
          body: JSON.stringify({
            spotTrades,
            futuresIncome,
            userId: user.id,
            exchange: exchangeName,
            connectionId: conn.id,
            metadata: data.metadata
          })
        })

        const storeResult = await storeResponse.json()

        if (!storeResponse.ok) {
          throw new Error(storeResult.error || storeResult.message || 'Failed to store trades')
        }

        // Update last_synced timestamp
        await supabase
          .from('exchange_connections')
          .update({ last_synced: new Date().toISOString() })
          .eq('id', conn.id)

        const newTradesCount = storeResult.tradesCount || 0
        results.totalNewTrades += newTradesCount
        results.refreshed.push({
          connectionId: conn.id,
          exchange: conn.exchange,
          newTrades: newTradesCount,
          totalFetched: spotTrades.length + futuresIncome.length
        })

        console.log(`✅ Refreshed ${conn.exchange}: ${newTradesCount} new trades stored`)
      } catch (error) {
        console.error(`❌ Error refreshing ${conn.exchange}:`, error)
        results.errors.push({
          connectionId: conn.id,
          exchange: conn.exchange,
          error: error.message || 'Unknown error'
        })
      }
    }

    // Refresh SnapTrade connections using SDK directly (no session needed)
    if (snaptradeConnections.length > 0) {
      try {
        console.log(`🔄 Refreshing ${snaptradeConnections.length} SnapTrade brokerage connection(s) using SDK...`)
        
        // Get SnapTrade user credentials from database
        const { data: snaptradeUser, error: snaptradeUserError } = await supabase
          .from('snaptrade_users')
          .select('snaptrade_user_id, user_secret_encrypted')
          .eq('user_id', user.id)
          .single()

        if (snaptradeUserError || !snaptradeUser) {
          throw new Error('User not registered with SnapTrade. Please register first.')
        }

        // Decrypt user secret
        const userSecret = decrypt(snaptradeUser.user_secret_encrypted)
        const snaptradeUserId = snaptradeUser.snaptrade_user_id

        console.log(`✅ Decrypted SnapTrade credentials for user ${snaptradeUserId.substring(0, 20)}...`)

        // Fetch activities from SnapTrade using SDK directly
        const activities = await getActivities(snaptradeUserId, userSecret, {
          // Fetch all accounts - store endpoint will map trades to correct connections by brokerage
        })

        console.log(`✅ Fetched ${activities.length} activities from SnapTrade`)

        // Transform activities to TradeClarity trades format
        const trades = transformActivitiesToTrades(activities)

        console.log(`✅ Transformed ${activities.length} activities to ${trades.length} trades`)

        // Store trades via store endpoint
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
        const host = request.headers.get('host') || 'localhost:3000'
        const baseUrl = `${protocol}://${host}`

        // Forward cookies to maintain session for internal fetch
        const cookieHeader = request.headers.get('cookie')
        const storeResponse = await fetch(`${baseUrl}/api/trades/store`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(cookieHeader && { 'cookie': cookieHeader }),
            ...(request.headers.get('authorization') && {
              'authorization': request.headers.get('authorization')
            })
          },
          body: JSON.stringify({
            spotTrades: trades,
            futuresIncome: [], // SnapTrade doesn't provide futures income in activities
            userId: user.id,
            exchange: 'snaptrade',
            connectionId: null, // Store endpoint will map by brokerage name
            metadata: {
              primaryCurrency: 'USD',
              accountType: 'SPOT',
              source: 'snaptrade',
            },
          }),
        })

        const storeResult = await storeResponse.json()

        if (!storeResponse.ok) {
          throw new Error(storeResult.error || storeResult.message || 'Failed to store trades')
        }

        // Update last_synced timestamp for all SnapTrade connections
        const snaptradeConnectionIds = snaptradeConnections.map(c => c.id)
        await supabase
          .from('exchange_connections')
          .update({ last_synced: new Date().toISOString() })
          .in('id', snaptradeConnectionIds)

        const newTradesCount = storeResult.tradesCount || 0
        results.totalNewTrades += newTradesCount
        
        // Add all SnapTrade connections to refreshed list
        snaptradeConnections.forEach(conn => {
          results.refreshed.push({
            connectionId: conn.id,
            exchange: conn.exchange,
            brokerageName: conn.metadata?.brokerage_name || null,
            newTrades: 0, // Can't determine per-connection count from single fetch
            totalFetched: activities.length
          })
        })

        console.log(`✅ Refreshed SnapTrade: ${newTradesCount} new trades stored across ${snaptradeConnections.length} brokerage connection(s)`)
      } catch (error) {
        console.error(`❌ Error refreshing SnapTrade connections:`, error)
        // Add all SnapTrade connections to errors
        snaptradeConnections.forEach(conn => {
          results.errors.push({
            connectionId: conn.id,
            exchange: conn.exchange,
            brokerageName: conn.metadata?.brokerage_name || null,
            error: error.message || 'Unknown error'
          })
        })
      }
    }

    return NextResponse.json({
      success: results.errors.length === 0 || results.refreshed.length > 0,
      ...results,
      message: results.refreshed.length > 0
        ? `Refreshed ${results.refreshed.length} connection(s), ${results.totalNewTrades} new trades added`
        : 'No connections were refreshed'
    })
  } catch (error) {
    console.error('Error in refresh-all:', error)
    return NextResponse.json(
      { error: 'Failed to refresh exchanges', details: error.message },
      { status: 500 }
    )
  }
}

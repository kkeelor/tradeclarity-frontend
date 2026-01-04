// app/api/exchange/refresh-preview/route.js
// Preview new trades that would be added on refresh (without actually fetching)
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { decrypt } from '@/lib/encryption'
import { getEffectiveTier } from '@/lib/featureGates'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL

export const dynamic = 'force-dynamic'

/**
 * Preview refresh - shows count of new trades that would be added
 * Does NOT actually fetch data, just estimates based on last_synced timestamp
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
      .select('id, exchange, last_synced, metadata')
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
        exchanges: [],
        totalNewTrades: 0,
        message: 'No active connections found'
      })
    }

    // Check cooldown (24 hours)
    const now = new Date()
    const cooldownMs = 24 * 60 * 60 * 1000 // 24 hours
    const exchangesWithCooldown = []
    const exchangesReady = []

    for (const conn of connections) {
      const lastSynced = conn.last_synced ? new Date(conn.last_synced) : null
      const timeSinceLastSync = lastSynced ? now - lastSynced : Infinity
      const isOnCooldown = lastSynced && timeSinceLastSync < cooldownMs
      
      if (isOnCooldown) {
        const hoursRemaining = Math.ceil((cooldownMs - timeSinceLastSync) / (60 * 60 * 1000))
        exchangesWithCooldown.push({
          connectionId: conn.id,
          exchange: conn.exchange,
          hoursRemaining,
          lastSynced: conn.last_synced
        })
      } else {
        exchangesReady.push({
          connectionId: conn.id,
          exchange: conn.exchange,
          metadata: conn.metadata
        })
      }
    }

    // For exchanges ready to refresh, we can't actually count new trades without fetching
    // So we'll return a message indicating refresh is available
    // The actual count will be shown after fetching in the refresh-all endpoint
    
    return NextResponse.json({
      success: true,
      exchangesReady: exchangesReady.map(e => ({
        connectionId: e.connectionId,
        exchange: e.exchange,
        brokerageName: e.metadata?.brokerage_name || null
      })),
      exchangesOnCooldown: exchangesWithCooldown.map(e => ({
        connectionId: e.connectionId,
        exchange: e.exchange,
        hoursRemaining: e.hoursRemaining,
        lastSynced: e.lastSynced
      })),
      totalReady: exchangesReady.length,
      totalOnCooldown: exchangesWithCooldown.length,
      message: exchangesReady.length > 0 
        ? `${exchangesReady.length} exchange(s) ready to refresh`
        : 'All exchanges are on cooldown (24 hours)'
    })
  } catch (error) {
    console.error('Error in refresh preview:', error)
    return NextResponse.json(
      { error: 'Failed to preview refresh', details: error.message },
      { status: 500 }
    )
  }
}

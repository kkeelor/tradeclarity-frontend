// app/api/analytics/compute/route.js
// Computes analytics and saves to user_analytics_cache table
// Related: ANALYTICS_DATA_FLOW_STRATEGY.md, ANALYTICS_COMPUTATION_POINTS.md

import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { analyzeData } from '@/app/analyze/utils/masterAnalyzer'
import { formatStructuredContext } from '@/lib/ai/prompts/vega-system-prompt'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * Transform database trades to format expected by analyzeData
 */
function transformTradesForAnalysis(trades) {
  const spotTrades = []
  const futuresIncome = []
  const metadata = {
    primaryCurrency: 'USD',
    availableCurrencies: ['USD', 'INR', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CNY', 'SGD', 'CHF'],
    supportsCurrencySwitch: true
  }

  // Detect primary currency based on exchanges
  const uniqueExchanges = [...new Set(trades.map(t => t.exchange))]
  if (uniqueExchanges.length === 1 && uniqueExchanges[0] === 'coindcx') {
    metadata.primaryCurrency = 'INR'
  } else if (uniqueExchanges.includes('coindcx')) {
    metadata.primaryCurrency = 'INR'
  }
  metadata.exchanges = uniqueExchanges

  // Transform trades
  trades.forEach(trade => {
    if (trade.account_type === 'SPOT') {
      spotTrades.push({
        symbol: trade.symbol,
        qty: String(trade.quantity),
        price: String(trade.price),
        quoteQty: String(trade.quote_quantity),
        commission: String(trade.commission),
        commissionAsset: trade.commission_asset,
        isBuyer: trade.side === 'BUY',
        isMaker: trade.type === 'LIMIT',
        time: new Date(trade.trade_time).getTime(),
        orderId: trade.order_id,
        id: trade.trade_id,
        accountType: 'SPOT',
        exchange: trade.exchange
      })
    } else if (trade.account_type === 'FUTURES') {
      futuresIncome.push({
        symbol: trade.symbol,
        income: String(trade.quote_quantity),
        asset: trade.commission_asset,
        incomeType: trade.type,
        time: new Date(trade.trade_time).getTime(),
        tranId: trade.trade_id,
        id: trade.trade_id,
        exchange: trade.exchange
      })
    }
  })

  return {
    spotTrades,
    futuresIncome,
    futuresPositions: [], // Not stored in trades table, would come from portfolio snapshots
    metadata
  }
}

/**
 * Compute tradesStats from trades (lightweight metadata)
 */
function computeTradesStats(trades) {
  const spotCount = trades.filter(t => t.account_type === 'SPOT').length
  const futuresCount = trades.filter(t => t.account_type === 'FUTURES').length
  
  const sortedTrades = [...trades].sort((a, b) => 
    new Date(a.trade_time) - new Date(b.trade_time)
  )

  return {
    totalTrades: trades.length,
    spotTrades: spotCount,
    futuresIncome: futuresCount,
    futuresPositions: 0, // Not tracked in trades table
    oldestTrade: sortedTrades.length > 0 ? sortedTrades[0].trade_time : null,
    newestTrade: sortedTrades.length > 0 ? sortedTrades[sortedTrades.length - 1].trade_time : null
  }
}

/**
 * Compute hash of trades for cache invalidation
 */
function computeTradesHash(trades) {
  // Create hash from trade identifiers and timestamps
  // This detects when trades are added, updated, or deleted
  // Use primary key 'id' if available, otherwise use trade_id + trade_time
  const hashInput = trades
    .map(t => {
      // Use primary key id if available (Supabase default), otherwise use trade_id + trade_time
      const identifier = t.id || `${t.trade_id}-${t.trade_time}`
      const timestamp = t.updated_at || t.created_at || t.trade_time || ''
      return `${identifier}-${timestamp}`
    })
    .sort()
    .join('|')
  
  return crypto
    .createHash('sha256')
    .update(hashInput)
    .digest('hex')
}

export async function POST(request) {
  try {
    // Get optional trigger info from request body
    const body = await request.json().catch(() => ({}))
    const { trigger, tradeCount, userId: bodyUserId } = body

    // Handle two scenarios:
    // 1. Direct API call (from frontend) - use auth session
    // 2. Internal call (from /api/trades/store) - use userId from body
    let userId = null
    let supabase = null

    if (bodyUserId) {
      // Internal call - use admin client and userId from body
      const { createAdminClient } = await import('@/lib/supabase-admin')
      supabase = createAdminClient()
      userId = bodyUserId
    } else {
      // Direct call - use regular client and auth session
      supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
      userId = user.id
    }

    // 1. Fetch all trades for user
    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('trade_time', { ascending: true })

    if (tradesError) {
      console.error('Error fetching trades:', tradesError)
      return NextResponse.json(
        { success: false, error: 'FAILED_TO_FETCH_TRADES', message: tradesError.message },
        { status: 500 }
      )
    }

    if (!trades || trades.length === 0) {
      // No trades - delete cache if exists and return
      await supabase
        .from('user_analytics_cache')
        .delete()
        .eq('user_id', userId)
        .catch(() => {}) // Ignore errors if cache doesn't exist

      return NextResponse.json({
        success: false,
        error: 'NO_TRADES',
        message: 'No trades found for user'
      })
    }

    // 2. Compute hash for cache invalidation
    const tradesHash = computeTradesHash(trades)

    // 3. Check if cache exists
    const { data: cached } = await supabase
      .from('user_analytics_cache')
      .select('*')
      .eq('user_id', userId)
      .single()

    // 4. If cache exists and hash matches, just refresh expiry (no recompute)
    if (cached && cached.trades_hash === tradesHash && new Date(cached.expires_at) > new Date()) {
      // Hash matches - trades haven't changed, just refresh expiry
      await supabase
        .from('user_analytics_cache')
        .update({
          expires_at: new Date(Date.now() + 3600000), // +1 hour
          updated_at: new Date()
        })
        .eq('user_id', userId)

      console.log(`✅ Analytics cache refreshed (hash match) for user ${userId}`)

      return NextResponse.json({
        success: true,
        cached: true,
        refreshed: true,
        totalTrades: trades.length
      })
    }

    // 5. Hash different or expired - recompute analytics
    console.log(`🔄 Computing analytics for user ${userId} (${trades.length} trades, trigger: ${trigger || 'unknown'})`)

    // Fetch portfolio snapshot(s) for holdings data
    let portfolioData = null
    try {
      // Get all active exchange connections for this user
      const { data: activeConnections } = await supabase
        .from('exchange_connections')
        .select('id')
        .eq('user_id', userId)
      
      const activeConnectionIds = activeConnections?.map(c => c.id) || []
      
      if (activeConnectionIds.length > 0) {
        // Fetch most recent snapshot per connection
        const { data: allSnapshots } = await supabase
          .from('portfolio_snapshots')
          .select('*')
          .eq('user_id', userId)
          .in('connection_id', activeConnectionIds)
          .order('snapshot_time', { ascending: false })
        
        if (allSnapshots && allSnapshots.length > 0) {
          // Group by connection_id, keep most recent for each
          const latestPerConnection = {}
          allSnapshots.forEach(snap => {
            const key = snap.connection_id
            if (!latestPerConnection[key] || new Date(snap.snapshot_time) > new Date(latestPerConnection[key].snapshot_time)) {
              latestPerConnection[key] = snap
            }
          })
          
          const recentSnapshots = Object.values(latestPerConnection)
          
          // Aggregate portfolio values across all exchanges
          let totalPortfolioValue = 0
          let totalSpotValue = 0
          let totalFuturesValue = 0
          let allHoldings = []
          const holdingsMap = new Map()
          
          for (const snap of recentSnapshots) {
            totalPortfolioValue += parseFloat(snap.total_portfolio_value || 0)
            totalSpotValue += parseFloat(snap.total_spot_value || 0)
            totalFuturesValue += parseFloat(snap.total_futures_value || 0)
            
            // Merge holdings with exchange attribution
            if (snap.holdings && Array.isArray(snap.holdings) && snap.holdings.length > 0) {
              const exchangeHoldings = snap.holdings.map(h => {
                const asset = h.asset || h.currency || 'UNKNOWN'
                const quantity = parseFloat(h.quantity || h.qty || 0)
                const price = parseFloat(h.price || 0)
                const usdValue = parseFloat(h.usdValue || 0)
                
                return {
                  asset: asset,
                  currency: asset,
                  quantity: quantity,
                  qty: quantity,
                  price: price,
                  usdValue: usdValue,
                  exchange: snap.exchange
                }
              })
              
              // Deduplicate holdings by asset+exchange
              exchangeHoldings.forEach(holding => {
                const key = `${holding.asset}-${holding.exchange}`.toUpperCase()
                const existing = holdingsMap.get(key)
                
                if (!existing || holding.usdValue > existing.usdValue) {
                  holdingsMap.set(key, holding)
                }
              })
            }
          }
          
          allHoldings = Array.from(holdingsMap.values())
          
          // Recalculate total portfolio value from deduplicated holdings
          const recalculatedPortfolioValue = allHoldings.reduce((sum, holding) => {
            return sum + (holding.usdValue || 0)
          }, 0)
          
          portfolioData = {
            totalPortfolioValue: recalculatedPortfolioValue || totalPortfolioValue,
            totalSpotValue: totalSpotValue,
            totalFuturesValue: totalFuturesValue,
            holdings: allHoldings,
            snapshotTime: recentSnapshots[0]?.snapshot_time,
            snapshotCount: recentSnapshots.length
          }
        }
      }
    } catch (portfolioError) {
      console.error('Error fetching portfolio snapshot for analytics:', portfolioError)
      // Continue without portfolio data - analytics will still work
    }

    // Transform trades to format expected by analyzeData
    const transformedData = transformTradesForAnalysis(trades)

    // Compute analytics
    const analytics = await analyzeData(transformedData)

    // Compute tradesStats (lightweight metadata)
    const tradesStats = computeTradesStats(trades)

    // Format structured context for AI (include portfolio data)
    const aiContext = formatStructuredContext({
      tradesStats,
      analytics,
      allTrades: analytics.allTrades || [],
      portfolio: portfolioData
    })

    // 6. Store in cache
    const cacheData = {
      user_id: userId,
      analytics_data: analytics,
      ai_context: aiContext,
      total_trades: trades.length,
      last_trade_timestamp: trades[trades.length - 1]?.trade_time,
      trades_hash: tradesHash,
      expires_at: new Date(Date.now() + 3600000), // +1 hour
      computed_at: new Date(),
      updated_at: new Date()
    }

    const { error: upsertError } = await supabase
      .from('user_analytics_cache')
      .upsert(cacheData, {
        onConflict: 'user_id'
      })

    if (upsertError) {
      console.error('Error saving analytics cache:', upsertError)
      return NextResponse.json(
        { success: false, error: 'FAILED_TO_SAVE_CACHE', message: upsertError.message },
        { status: 500 }
      )
    }

    console.log(`✅ Analytics computed and cached for user ${userId} (${trades.length} trades)`)

    return NextResponse.json({
      success: true,
      cached: false,
      computed: true,
      totalTrades: trades.length,
      computedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error computing analytics:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: error.message },
      { status: 500 }
    )
  }
}

// app/api/trades/store/route.js
// Background endpoint to store fetched trades to database
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { TIER_LIMITS, canAnalyzeTrades } from '@/lib/featureGates'

export async function POST(request) {
  try {
    const { spotTrades, futuresIncome, userId, exchange, connectionId, csvUploadId, metadata } = await request.json()

    if (!userId || !exchange) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, exchange' },
        { status: 400 }
      )
    }

    // Normalize exchange name to lowercase
    const normalizedExchange = exchange.toLowerCase().trim()


    const tradesToInsert = []

    // Process spot trades
    if (spotTrades && spotTrades.length > 0) {
      spotTrades.forEach(trade => {
        tradesToInsert.push({
          user_id: userId,
          exchange: normalizedExchange,
          exchange_connection_id: connectionId || null, // Optional for CSV uploads
          csv_upload_id: csvUploadId || null,
          symbol: trade.symbol,
          side: trade.isBuyer ? 'BUY' : 'SELL',
          type: trade.isMaker ? 'LIMIT' : 'MARKET',
          quantity: parseFloat(trade.qty),
          price: parseFloat(trade.price),
          quote_quantity: parseFloat(trade.quoteQty || parseFloat(trade.qty) * parseFloat(trade.price)),
          commission: parseFloat(trade.commission || 0),
          commission_asset: trade.commissionAsset || 'USDT',
          timestamp: trade.time,
          trade_time: new Date(trade.time).toISOString(),
          trade_id: String(trade.id),
          order_id: String(trade.orderId),
          is_futures: false,
          account_type: 'SPOT',
          raw_data: trade
        })
      })
    }

    // Process futures income
    if (futuresIncome && futuresIncome.length > 0) {
      futuresIncome.forEach(income => {
        // Create unique trade_id by combining tranId with incomeType to avoid duplicates
        // (same tranId can have multiple income types like REALIZED_PNL + COMMISSION)
        const baseId = String(income.tranId || income.id || Math.random())
        const uniqueTradeId = `${baseId}_${income.incomeType || 'UNKNOWN'}`

        tradesToInsert.push({
          user_id: userId,
          exchange: normalizedExchange,
          exchange_connection_id: connectionId || null, // Optional for CSV uploads
          csv_upload_id: csvUploadId || null,
          symbol: income.symbol || 'N/A',
          side: 'INCOME',
          type: income.incomeType || 'REALIZED_PNL',
          quantity: 0,
          price: 0,
          quote_quantity: parseFloat(income.income || 0),
          commission: 0,
          commission_asset: income.asset || 'USDT',
          timestamp: income.time,
          trade_time: new Date(income.time).toISOString(),
          trade_id: uniqueTradeId,
          order_id: 'FUTURES_INCOME',
          is_futures: true,
          account_type: 'FUTURES',
          raw_data: income
        })
      })
    }


    if (tradesToInsert.length === 0) {
      return NextResponse.json({
        success: true,
        tradesCount: 0,
        message: 'No trades to store'
      })
    }

    // Check trade analysis limit before storing
    // Use admin client for database operations (bypasses RLS for trusted server-side operations)
    const adminClient = createAdminClient()
    
    // Get user's subscription
    const { data: subscription } = await adminClient
      .from('subscriptions')
      .select('tier, trades_analyzed_this_month, last_trade_reset_date')
      .eq('user_id', userId)
      .single()

    // Use effective tier (considers cancel_at_period_end)
    const { getEffectiveTier } = await import('@/lib/featureGates')
    const userTier = getEffectiveTier(subscription) || 'free'
    const limit = TIER_LIMITS[userTier]?.maxTradesPerMonth || 500

    // Check if we need to reset monthly counter (new month)
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastResetDate = subscription?.last_trade_reset_date 
      ? new Date(subscription.last_trade_reset_date)
      : null

    let currentMonthTrades = subscription?.trades_analyzed_this_month || 0

    // Reset counter if we're in a new month
    if (!lastResetDate || lastResetDate < startOfMonth) {
      currentMonthTrades = 0
      
      // Update subscription with reset date
      await adminClient
        .from('subscriptions')
        .update({
          trades_analyzed_this_month: 0,
          last_trade_reset_date: startOfMonth.toISOString()
        })
        .eq('user_id', userId)
    }

    // Count only NEW trades (not duplicates) for limit check
    const tradeIds = tradesToInsert.map(t => t.trade_id)
    const { data: existingTrades } = await adminClient
      .from('trades')
      .select('trade_id')
      .eq('user_id', userId)
      .eq('exchange', normalizedExchange)
      .in('trade_id', tradeIds)

    const existingTradeIds = new Set(existingTrades?.map(t => t.trade_id) || [])
    const newTradesCount = tradesToInsert.filter(trade => !existingTradeIds.has(trade.trade_id)).length

    // Check if adding new trades would exceed limit
    if (limit !== Infinity && (currentMonthTrades + newTradesCount) > limit) {
      const nextTier = userTier === 'free' ? 'Trader' : userTier === 'trader' ? 'Pro' : null
      const remaining = Math.max(0, limit - currentMonthTrades)
      
      return NextResponse.json({
        error: 'TRADE_LIMIT_EXCEEDED',
        message: `Adding ${newTradesCount} trades would exceed your monthly limit (${limit}). You have ${remaining} trades remaining this month. ${nextTier ? `Upgrade to ${nextTier} for ${TIER_LIMITS[nextTier.toLowerCase()]?.maxTradesPerMonth === Infinity ? 'unlimited' : TIER_LIMITS[nextTier.toLowerCase()]?.maxTradesPerMonth} trades.` : ''}`,
        limit,
        current: currentMonthTrades,
        attempted: newTradesCount,
        remaining,
        tier: userTier,
        upgradeTier: nextTier?.toLowerCase() || null
      }, { status: 403 })
    }

    // Filter out duplicates (existingTradeIds already defined above for limit check)
    const newTrades = tradesToInsert.filter(trade => !existingTradeIds.has(trade.trade_id))


    if (newTrades.length === 0) {
      return NextResponse.json({
        success: true,
        tradesCount: 0,
        message: 'All trades already exist in database'
      })
    }

    // Insert new trades in batches (Supabase has a limit)
    const batchSize = 1000
    let insertedCount = 0

    for (let i = 0; i < newTrades.length; i += batchSize) {
      const batch = newTrades.slice(i, i + batchSize)

      const { error: insertError } = await adminClient
        .from('trades')
        .insert(batch)

      if (insertError) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError)
        // Continue with next batch
      } else {
        insertedCount += batch.length
      }
    }


    // Update monthly trade counter in subscription
    if (insertedCount > 0) {
      const newCount = currentMonthTrades + insertedCount
      await adminClient
        .from('subscriptions')
        .update({
          trades_analyzed_this_month: newCount,
          last_trade_reset_date: startOfMonth.toISOString()
        })
        .eq('user_id', userId)
      
    }

    // Store portfolio snapshot if metadata is provided
    let snapshotStored = false
    if (metadata && metadata.spotHoldings && metadata.totalPortfolioValue !== undefined) {
      try {

        const { error: snapshotError } = await adminClient
          .from('portfolio_snapshots')
          .insert({
            user_id: userId,
            exchange: exchange,
            connection_id: connectionId,
            snapshot_time: new Date().toISOString(),
            total_portfolio_value: metadata.totalPortfolioValue || 0,
            total_spot_value: metadata.totalSpotValue || 0,
            total_futures_value: metadata.totalFuturesValue || 0,
            holdings: metadata.spotHoldings,
            primary_currency: metadata.primaryCurrency || 'USD',
            account_type: metadata.accountType || 'UNKNOWN'
          })

        if (snapshotError) {
          console.error('⚠️  Failed to store portfolio snapshot:', snapshotError)
          // Don't fail the entire request, just log the error
        } else {
          snapshotStored = true
        }
      } catch (snapshotErr) {
        console.error('⚠️  Error storing portfolio snapshot:', snapshotErr)
        // Don't fail the entire request
      }
    }

    // Trigger background analytics computation if new trades were inserted
    // This works for BOTH CSV uploads AND exchange connections
    // Fire and forget - don't await (non-blocking)
    if (insertedCount > 0) {
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
      const host = request.headers.get('host') || 'localhost:3000'
      const baseUrl = `${protocol}://${host}`
      
      // Trigger analytics computation in background
      fetch(`${baseUrl}/api/analytics/compute`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // Forward authorization header if present
          ...(request.headers.get('authorization') && {
            'authorization': request.headers.get('authorization')
          })
        },
        body: JSON.stringify({
          userId: userId,
          trigger: csvUploadId ? 'trades_stored_csv' : 'trades_stored_exchange',
          tradeCount: insertedCount,
          source: csvUploadId ? 'csv' : 'exchange'
        })
      }).catch(err => {
        console.error('⚠️ Background analytics computation failed:', err)
        // Non-critical - analytics will be computed on next page load or cache miss
      })
    }

    return NextResponse.json({
      success: true,
      tradesCount: insertedCount,
      totalProcessed: tradesToInsert.length,
      alreadyExisted: existingTradeIds.size,
      portfolioSnapshotStored: snapshotStored,
      analyticsComputationTriggered: insertedCount > 0
    })
  } catch (error) {
    console.error('Store trades error:', error)
    return NextResponse.json(
      { error: 'Failed to store trades', details: error.message },
      { status: 500 }
    )
  }
}

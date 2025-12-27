// app/api/trades/store/route.js
// Background endpoint to store fetched trades to database
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'
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

    // For SnapTrade, we need to map trades to the correct brokerage connection
    // Since we now have one connection per brokerage, we need to find the right connection for each trade
    let brokerageConnectionMap = new Map() // brokerage_name -> connection_id
    
    if (normalizedExchange === 'snaptrade' && spotTrades && spotTrades.length > 0) {
      // Get all SnapTrade connections for this user
      // SnapTrade connections use exchange='snaptrade-{brokerage}' format
      const supabase = await createClient()
      const { data: allConnections } = await supabase
        .from('exchange_connections')
        .select('id, exchange, metadata')
        .eq('user_id', userId)
        .eq('is_active', true)
      
      // Filter to only SnapTrade connections (exchange starts with 'snaptrade')
      const snaptradeConnections = (allConnections || []).filter(conn => 
        conn.exchange && conn.exchange.startsWith('snaptrade')
      )
      
      if (snaptradeConnections) {
        snaptradeConnections.forEach(conn => {
          // Get brokerage name from metadata or extract from exchange name
          let brokerageName = conn.metadata?.brokerage_name
          if (!brokerageName && conn.exchange.startsWith('snaptrade-')) {
            // Extract from exchange format: snaptrade-{brokerage-slug}
            const slug = conn.exchange.replace('snaptrade-', '')
            brokerageName = slug
              .split('-')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')
          }
          if (brokerageName) {
            brokerageConnectionMap.set(brokerageName, conn.id)
          }
        })
      }
      
      console.log(`🔗 [Store Trades] Mapped ${brokerageConnectionMap.size} SnapTrade brokerage connections`)
    }

    const tradesToInsert = []

    // Process spot trades
    if (spotTrades && spotTrades.length > 0) {
      spotTrades.forEach(trade => {
        // Handle both formats: Binance/CoinDCX format and Snaptrade format
        // Binance/CoinDCX format: { symbol, isBuyer, qty, price, time, id, orderId, isMaker, commission, commissionAsset, quoteQty }
        // Snaptrade format: { symbol, side, isBuyer, quantity, price, timestamp, trade_time, trade_id, order_id, commission, commission_asset, quote_quantity }
        
        const isSnaptradeFormat = trade.trade_id !== undefined || trade.trade_time !== undefined
        
        // For SnapTrade, find the correct connection_id based on brokerage
        let tradeConnectionId = connectionId || null
        if (normalizedExchange === 'snaptrade' && isSnaptradeFormat) {
          const tradeBrokerage = trade.brokerage || trade.raw_data?.account?.institution_name || trade.raw_data?.institution
          if (tradeBrokerage && brokerageConnectionMap.has(tradeBrokerage)) {
            tradeConnectionId = brokerageConnectionMap.get(tradeBrokerage)
            console.log(`🔗 [Store Trades] Linking trade to brokerage connection: ${tradeBrokerage} -> ${tradeConnectionId}`)
          } else if (!tradeConnectionId) {
            // If no connection found and no connectionId provided, log warning
            console.warn(`⚠️ [Store Trades] No connection found for brokerage "${tradeBrokerage}", trade will be stored without connection_id`)
          }
        }
        
        const normalizedTrade = {
          user_id: userId,
          exchange: normalizedExchange,
          exchange_connection_id: tradeConnectionId,
          csv_upload_id: csvUploadId || null,
          symbol: trade.symbol,
          side: isSnaptradeFormat 
            ? trade.side 
            : (trade.isBuyer ? 'BUY' : 'SELL'),
          type: isSnaptradeFormat
            ? (trade.type || 'MARKET')
            : (trade.isMaker ? 'LIMIT' : 'MARKET'),
          quantity: parseFloat(isSnaptradeFormat ? trade.quantity : trade.qty),
          price: parseFloat(trade.price),
          quote_quantity: parseFloat(
            isSnaptradeFormat 
              ? trade.quote_quantity 
              : (trade.quoteQty || parseFloat(trade.qty || trade.quantity) * parseFloat(trade.price))
          ),
          commission: parseFloat(trade.commission || 0),
          commission_asset: isSnaptradeFormat 
            ? (trade.commission_asset || 'USD')
            : (trade.commissionAsset || 'USDT'),
          timestamp: isSnaptradeFormat 
            ? trade.timestamp 
            : trade.time,
          trade_time: isSnaptradeFormat
            ? trade.trade_time
            : new Date(trade.time).toISOString(),
          trade_id: String(isSnaptradeFormat ? trade.trade_id : trade.id),
          order_id: String(isSnaptradeFormat ? (trade.order_id || trade.trade_id) : (trade.orderId || trade.id)),
          is_futures: trade.is_futures || false,
          account_type: trade.account_type || 'SPOT',
          raw_data: trade
        }
        
        tradesToInsert.push(normalizedTrade)
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
    
    // Get user's subscription (include all fields needed for getEffectiveTier)
    // Use maybeSingle() instead of single() to handle case where subscription doesn't exist
    console.log('🔍 Fetching subscription for userId:', userId)
    
    // Use the exact same query pattern as /api/subscriptions/current (which works)
    const { data: subscription, error: subError } = await adminClient
      .from('subscriptions')
      .select('*')  // Select all fields like the working route does
      .eq('user_id', userId)
      .maybeSingle()  // Use maybeSingle to handle missing subscriptions gracefully

    // Log subscription data for debugging
    if (subError) {
      console.error('❌ Error fetching subscription:', subError)
      console.error('Error details:', JSON.stringify(subError, null, 2))
    }
    
    console.log('📊 Subscription query result:', { 
      hasSubscription: !!subscription,
      subscription: subscription ? {
        tier: subscription.tier,
        status: subscription.status,
        user_id: subscription.user_id,
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_end: subscription.current_period_end
      } : null,
      error: subError ? {
        code: subError.code,
        message: subError.message,
        details: subError.details,
        hint: subError.hint
      } : null
    })
    
    // Also try querying all subscriptions to see if any exist for this user
    const { data: allSubs, error: allSubsError } = await adminClient
      .from('subscriptions')
      .select('user_id, tier, status')
      .eq('user_id', userId)
    
    console.log('🔍 All subscriptions for userId:', {
      count: allSubs?.length || 0,
      subscriptions: allSubs,
      error: allSubsError
    })

    // Use effective tier (considers cancel_at_period_end)
    const { getEffectiveTier } = await import('@/lib/featureGates')
    const effectiveTier = getEffectiveTier(subscription)
    const userTier = (effectiveTier || 'free').toLowerCase()
    
    // Double-check: if subscription tier is 'pro' but we got 'free', log warning
    if (subscription?.tier && subscription.tier.toLowerCase() === 'pro' && userTier !== 'pro') {
      console.warn('⚠️ TIER MISMATCH DETECTED:', {
        subscriptionTier: subscription.tier,
        detectedTier: userTier,
        subscriptionStatus: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: subscription.current_period_end,
        effectiveTier
      })
    }
    
    const limit = TIER_LIMITS[userTier]?.maxTradesPerMonth || 500
    
    console.log('Tier check:', { 
      effectiveTier, 
      userTier, 
      limit, 
      isUnlimited: limit === Infinity,
      tierLimitsKeys: Object.keys(TIER_LIMITS),
      subscriptionTierRaw: subscription?.tier,
      subscriptionStatus: subscription?.status
    })

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
    // Skip check entirely if limit is Infinity (Pro plan)
    if (limit !== Infinity && (currentMonthTrades + newTradesCount) > limit) {
      const nextTier = userTier === 'free' ? 'Trader' : userTier === 'trader' ? 'Pro' : null
      const remaining = Math.max(0, limit - currentMonthTrades)
      
      // Additional debug info for troubleshooting
      const debugInfo = {
        userTier,
        limit,
        currentMonthTrades,
        newTradesCount,
        subscriptionTier: subscription?.tier,
        subscriptionStatus: subscription?.status,
        effectiveTier,
        hasSubscription: !!subscription,
        isUnlimited: limit === Infinity,
        tierLimitsAvailable: Object.keys(TIER_LIMITS)
      }
      
      console.error('Trade limit exceeded - Debug info:', debugInfo)
      
      // If user thinks they have Pro but we detected free, add helpful message
      let errorMessage = `Adding ${newTradesCount} trades would exceed your monthly limit (${limit}). You have ${remaining} trades remaining this month.`
      
      if (!subscription) {
        errorMessage += ' No active subscription found. Please contact support if you believe you have an active Pro subscription.'
      } else if (subscription.tier && subscription.tier.toLowerCase() === 'pro' && userTier !== 'pro') {
        errorMessage += ` Your subscription shows tier "${subscription.tier}" but was detected as "${userTier}". Please contact support.`
      } else if (nextTier) {
        errorMessage += ` Upgrade to ${nextTier} for ${TIER_LIMITS[nextTier.toLowerCase()]?.maxTradesPerMonth === Infinity ? 'unlimited' : TIER_LIMITS[nextTier.toLowerCase()]?.maxTradesPerMonth} trades.`
      }
      
      return NextResponse.json({
        error: 'TRADE_LIMIT_EXCEEDED',
        message: errorMessage,
        limit,
        current: currentMonthTrades,
        attempted: newTradesCount,
        remaining,
        tier: userTier,
        detectedTier: userTier,
        subscriptionTier: subscription?.tier,
        subscriptionStatus: subscription?.status,
        upgradeTier: nextTier?.toLowerCase() || null,
        debug: process.env.NODE_ENV === 'development' ? debugInfo : undefined
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

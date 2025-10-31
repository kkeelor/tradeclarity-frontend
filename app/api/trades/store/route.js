// app/api/trades/store/route.js
// Background endpoint to store fetched trades to database
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { spotTrades, futuresIncome, userId, exchange, connectionId, csvUploadId, metadata } = await request.json()

    if (!userId || !exchange || !connectionId) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, exchange, connectionId' },
        { status: 400 }
      )
    }

    console.log(`💾 [Background] Storing trades for user ${userId}, exchange ${exchange}...`)
    if (metadata?.spotHoldings) {
      console.log(`📊 Portfolio data received: $${metadata.totalPortfolioValue?.toFixed(2) || 0}, ${metadata.spotHoldings?.length || 0} holdings`)
    }

    const tradesToInsert = []

    // Process spot trades
    if (spotTrades && spotTrades.length > 0) {
      spotTrades.forEach(trade => {
        tradesToInsert.push({
          user_id: userId,
          exchange: exchange,
          exchange_connection_id: connectionId,
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
          exchange: exchange,
          exchange_connection_id: connectionId,
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

    console.log(`💾 Total trades to insert: ${tradesToInsert.length}`)
    console.log('📋 Normalized trades data (first 3 samples):', JSON.stringify(tradesToInsert.slice(0, 3), null, 2))

    if (tradesToInsert.length === 0) {
      return NextResponse.json({
        success: true,
        tradesCount: 0,
        message: 'No trades to store'
      })
    }

    // Use admin client for database operations (bypasses RLS for trusted server-side operations)
    const adminClient = createAdminClient()

    // Get existing trade IDs to prevent duplicates
    const tradeIds = tradesToInsert.map(t => t.trade_id)
    const { data: existingTrades } = await adminClient
      .from('trades')
      .select('trade_id')
      .eq('user_id', userId)
      .eq('exchange', exchange)
      .in('trade_id', tradeIds)

    const existingTradeIds = new Set(existingTrades?.map(t => t.trade_id) || [])

    // Filter out duplicates
    const newTrades = tradesToInsert.filter(trade => !existingTradeIds.has(trade.trade_id))

    console.log(`📊 Found ${existingTradeIds.size} existing trades, inserting ${newTrades.length} new trades`)

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

    console.log(`✅ Successfully stored ${insertedCount}/${newTrades.length} new trades`)

    // Store portfolio snapshot if metadata is provided
    let snapshotStored = false
    if (metadata && metadata.spotHoldings && metadata.totalPortfolioValue !== undefined) {
      try {
        console.log(`📊 Storing portfolio snapshot...`)

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
          console.log(`✅ Portfolio snapshot stored: $${metadata.totalPortfolioValue?.toFixed(2)}, ${metadata.spotHoldings.length} holdings`)
        }
      } catch (snapshotErr) {
        console.error('⚠️  Error storing portfolio snapshot:', snapshotErr)
        // Don't fail the entire request
      }
    }

    return NextResponse.json({
      success: true,
      tradesCount: insertedCount,
      totalProcessed: tradesToInsert.length,
      alreadyExisted: existingTradeIds.size,
      portfolioSnapshotStored: snapshotStored
    })
  } catch (error) {
    console.error('Store trades error:', error)
    return NextResponse.json(
      { error: 'Failed to store trades', details: error.message },
      { status: 500 }
    )
  }
}

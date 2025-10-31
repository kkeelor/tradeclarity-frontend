// app/api/trades/fetch/route.js
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const supabase = createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get optional query parameters for filtering
    const { searchParams } = new URL(request.url)
    const connectionId = searchParams.get('connectionId')
    const exchange = searchParams.get('exchange')

    // Build query with optional filters
    let query = supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)

    // Apply filters if provided (for single exchange analytics)
    if (connectionId) {
      query = query.eq('exchange_connection_id', connectionId)
    } else if (exchange) {
      query = query.eq('exchange', exchange.toLowerCase())
    }
    // If neither provided, fetch ALL trades (for combined analytics)

    const { data: trades, error: fetchError } = await query.order('trade_time', { ascending: true })

    if (fetchError) {
      console.error('Error fetching trades:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch trades' },
        { status: 500 }
      )
    }

    // Group trades by account type
    const spotTrades = []
    const futuresIncome = []

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
          accountType: 'SPOT'
        })
      } else if (trade.account_type === 'FUTURES') {
        futuresIncome.push({
          symbol: trade.symbol,
          income: String(trade.quote_quantity),
          asset: trade.commission_asset,
          incomeType: trade.type,
          time: new Date(trade.trade_time).getTime(),
          tranId: trade.trade_id,
          id: trade.trade_id
        })
      }
    })

    // Calculate metadata from stored trades
    const uniqueExchanges = [...new Set(trades.map(t => t.exchange))]
    const totalTrades = trades.length
    const oldestTrade = trades.length > 0 ? trades[0].trade_time : null
    const newestTrade = trades.length > 0 ? trades[trades.length - 1].trade_time : null

    // Detect primary currency based on exchange
    // CoinDCX trades are stored in INR, need conversion
    // Binance trades are stored in USD/USDT, no conversion needed
    let primaryCurrency = 'USD'
    if (uniqueExchanges.length === 1 && uniqueExchanges[0] === 'coindcx') {
      primaryCurrency = 'INR'
    } else if (uniqueExchanges.includes('coindcx')) {
      // Mixed exchanges - need to handle per-trade conversion
      // For now, mark as INR and let frontend handle it
      primaryCurrency = 'INR'
    }

    console.log(`📊 Fetched ${totalTrades} trades (${spotTrades.length} spot, ${futuresIncome.length} futures) ${connectionId ? `for connection ${connectionId}` : exchange ? `for ${exchange}` : 'from all exchanges'}`)
    console.log(`💱 Detected primary currency: ${primaryCurrency} based on exchanges: ${uniqueExchanges.join(', ')}`)

    // Try to fetch portfolio snapshot(s)
    let portfolioSnapshot = null
    try {
      if (connectionId || exchange) {
        // Viewing SINGLE exchange - fetch most recent snapshot for that exchange
        let snapshotQuery = supabase
          .from('portfolio_snapshots')
          .select('*')
          .eq('user_id', user.id)
          .order('snapshot_time', { ascending: false })
          .limit(1)

        if (connectionId) {
          snapshotQuery = snapshotQuery.eq('connection_id', connectionId)
        } else if (exchange) {
          snapshotQuery = snapshotQuery.eq('exchange', exchange.toLowerCase())
        }

        const { data: snapshots, error: snapshotError } = await snapshotQuery

        if (!snapshotError && snapshots && snapshots.length > 0) {
          portfolioSnapshot = snapshots[0]
          console.log(`📊 Found portfolio snapshot from ${portfolioSnapshot.snapshot_time}: $${portfolioSnapshot.total_portfolio_value}`)
        } else {
          console.log('📊 No portfolio snapshot found for this exchange')
        }
      } else {
        // Viewing COMBINED analytics - fetch ALL snapshots and aggregate them
        console.log('📊 Fetching ALL portfolio snapshots for combined analytics...')

        const { data: allSnapshots, error: snapshotError } = await supabase
          .from('portfolio_snapshots')
          .select('*')
          .eq('user_id', user.id)

        if (snapshotError) {
          console.error('Error fetching portfolio snapshots:', snapshotError)
        } else if (allSnapshots && allSnapshots.length > 0) {
          console.log(`📊 Found ${allSnapshots.length} total snapshots across all exchanges`)

          // Group by connection_id, keep most recent for each
          const latestPerConnection = {}
          allSnapshots.forEach(snap => {
            const key = snap.connection_id
            if (!latestPerConnection[key] || snap.snapshot_time > latestPerConnection[key].snapshot_time) {
              latestPerConnection[key] = snap
            }
          })

          const recentSnapshots = Object.values(latestPerConnection)
          console.log(`📊 Using ${recentSnapshots.length} most recent snapshots (one per connection)`)

          // Aggregate portfolio values across all exchanges
          let totalPortfolioValue = 0
          let totalSpotValue = 0
          let totalFuturesValue = 0
          let allHoldings = []

          for (const snap of recentSnapshots) {
            const snapCurrency = snap.primary_currency || 'USD'
            let conversionRate = 1.0

            // Convert to USD if needed
            if (snapCurrency === 'INR') {
              // Use approximate rate (in production, fetch from currency API)
              conversionRate = 1 / 87.0
              console.log(`💱 Converting ${snap.exchange} snapshot from INR to USD (rate: ${conversionRate.toFixed(6)})`)
            }

            const portfolioValueUSD = parseFloat(snap.total_portfolio_value || 0) * conversionRate
            const spotValueUSD = parseFloat(snap.total_spot_value || 0) * conversionRate
            const futuresValueUSD = parseFloat(snap.total_futures_value || 0) * conversionRate

            totalPortfolioValue += portfolioValueUSD
            totalSpotValue += spotValueUSD
            totalFuturesValue += futuresValueUSD

            console.log(`  - ${snap.exchange}: $${portfolioValueUSD.toFixed(2)} (${snapCurrency})`)

            // Merge holdings with exchange attribution
            if (snap.holdings && Array.isArray(snap.holdings)) {
              const exchangeHoldings = snap.holdings.map(h => ({
                ...h,
                exchange: snap.exchange,
                // Convert holding value to USD if needed
                usdValue: (h.usdValue || 0) * conversionRate,
                originalCurrency: snapCurrency
              }))
              allHoldings.push(...exchangeHoldings)
            }
          }

          // Create aggregated portfolio snapshot
          portfolioSnapshot = {
            total_portfolio_value: totalPortfolioValue,
            total_spot_value: totalSpotValue,
            total_futures_value: totalFuturesValue,
            holdings: allHoldings,
            snapshot_time: recentSnapshots[0].snapshot_time, // Use most recent timestamp
            _aggregated: true,
            _snapshotCount: recentSnapshots.length
          }

          console.log(`✅ Aggregated portfolio: $${totalPortfolioValue.toFixed(2)} USD (${allHoldings.length} holdings from ${recentSnapshots.length} exchanges)`)
        } else {
          console.log('📊 No portfolio snapshots found')
        }
      }
    } catch (snapshotErr) {
      console.error('Error fetching portfolio snapshot:', snapshotErr)
      // Continue without snapshot
    }

    return NextResponse.json({
      success: true,
      spotTrades,
      futuresIncome,
      futuresPositions: [],
      metadata: {
        primaryCurrency: primaryCurrency,
        availableCurrencies: ['USD', 'INR'],
        supportsCurrencySwitch: false,
        // Additional metadata
        exchanges: uniqueExchanges,
        totalTrades: totalTrades,
        spotTrades: spotTrades.length,
        futuresIncome: futuresIncome.length,
        oldestTrade: oldestTrade,
        newestTrade: newestTrade,
        accountType: spotTrades.length > 0 && futuresIncome.length > 0 ? 'MIXED' : spotTrades.length > 0 ? 'SPOT' : 'FUTURES',
        hasSpot: spotTrades.length > 0,
        hasFutures: futuresIncome.length > 0,
        // Include portfolio snapshot data if available
        ...(portfolioSnapshot && {
          totalPortfolioValue: parseFloat(portfolioSnapshot.total_portfolio_value),
          totalSpotValue: parseFloat(portfolioSnapshot.total_spot_value),
          totalFuturesValue: parseFloat(portfolioSnapshot.total_futures_value),
          spotHoldings: portfolioSnapshot.holdings,
          snapshotTime: portfolioSnapshot.snapshot_time
        })
      }
    })
  } catch (error) {
    console.error('Fetch trades error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trades' },
      { status: 500 }
    )
  }
}

// app/api/trades/fetch/route.js
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

/**
 * Fetch live currency rates from backend
 * @returns {Promise<Object>} Currency rates with USD as base
 */
async function getCurrencyRates() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/currency-rate`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    if (data.success && data.rates) {
      console.log('💱 Fetched live currency rates from backend:', Object.keys(data.rates).length, 'currencies')
      return data.rates
    }

    throw new Error('Invalid response format')
  } catch (error) {
    console.error('⚠️ Failed to fetch currency rates from backend:', error.message)
    console.log('⚠️ Using fallback rates')

    // Return fallback rates
    return {
      'USD': 1.0,
      'INR': 87.0,
      'EUR': 0.92,
      'GBP': 0.79
    }
  }
}

/**
 * Convert amount from one currency to another using live rates
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @param {Object} rates - Currency rates object
 * @returns {number} Converted amount
 */
function convertCurrency(amount, fromCurrency, toCurrency, rates) {
  if (fromCurrency === toCurrency) {
    return amount
  }

  // All rates are relative to USD (base currency)
  const fromRate = rates[fromCurrency] || 1.0
  const toRate = rates[toCurrency] || 1.0

  // Convert: amount in FROM → USD → TO
  const usdAmount = amount / fromRate
  const convertedAmount = usdAmount * toRate

  return convertedAmount
}

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
    const connectionId = searchParams.get('connectionId')  // Single connection (legacy)
    const exchange = searchParams.get('exchange')          // Single exchange (legacy)
    const connectionIds = searchParams.get('connectionIds') // Multiple connections (new)
    const csvIds = searchParams.get('csvIds')              // Multiple CSV files (new)

    // Build query with optional filters
    let query = supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)

    // Apply filters based on which params are provided
    if (connectionIds || csvIds) {
      // New: Filter by multiple sources (exchanges and/or CSVs)
      // When both are provided, we need to use OR logic
      const connIds = connectionIds ? connectionIds.split(',').filter(id => id.trim()) : []
      const csvFileIds = csvIds ? csvIds.split(',').filter(id => id.trim()) : []

      console.log('📎 Filtering by selected sources:', { connectionIds: connIds, csvIds: csvFileIds })

      if (connIds.length > 0 && csvFileIds.length > 0) {
        // Both exchanges AND CSV files selected - use OR query
        query = query.or(`exchange_connection_id.in.(${connIds.join(',')}),csv_upload_id.in.(${csvFileIds.join(',')})`)
      } else if (connIds.length > 0) {
        // Only exchanges selected
        query = query.in('exchange_connection_id', connIds)
      } else if (csvFileIds.length > 0) {
        // Only CSV files selected
        query = query.in('csv_upload_id', csvFileIds)
      }
    } else if (connectionId) {
      // Legacy: Single connection ID
      console.log('📎 Filtering by single connectionId:', connectionId)
      query = query.eq('exchange_connection_id', connectionId)
    } else if (exchange) {
      // Legacy: Single exchange
      console.log('🏦 Filtering by single exchange:', exchange)
      query = query.eq('exchange', exchange.toLowerCase())
    } else {
      // No filters provided - fetch ALL trades (for combined analytics)
      console.log('📊 No filters - fetching ALL trades for combined analytics')
    }

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

          // Fetch live currency rates from backend
          const currencyRates = await getCurrencyRates()

          // Aggregate portfolio values across all exchanges
          let totalPortfolioValue = 0
          let totalSpotValue = 0
          let totalFuturesValue = 0
          let allHoldings = []

          for (const snap of recentSnapshots) {
            const snapCurrency = snap.primary_currency || 'USD'

            // Convert to USD using live rates
            const portfolioValueUSD = convertCurrency(
              parseFloat(snap.total_portfolio_value || 0),
              snapCurrency,
              'USD',
              currencyRates
            )
            const spotValueUSD = convertCurrency(
              parseFloat(snap.total_spot_value || 0),
              snapCurrency,
              'USD',
              currencyRates
            )
            const futuresValueUSD = convertCurrency(
              parseFloat(snap.total_futures_value || 0),
              snapCurrency,
              'USD',
              currencyRates
            )

            totalPortfolioValue += portfolioValueUSD
            totalSpotValue += spotValueUSD
            totalFuturesValue += futuresValueUSD

            console.log(`  - ${snap.exchange}: $${portfolioValueUSD.toFixed(2)} USD (from ${snapCurrency})`)

            // Merge holdings with exchange attribution
            if (snap.holdings && Array.isArray(snap.holdings)) {
              const exchangeHoldings = snap.holdings.map(h => {
                // Convert holding value to USD using live rates
                const holdingValueUSD = convertCurrency(
                  h.usdValue || 0,
                  snapCurrency,
                  'USD',
                  currencyRates
                )

                return {
                  ...h,
                  exchange: snap.exchange,
                  usdValue: holdingValueUSD,
                  originalValue: h.usdValue,
                  originalCurrency: snapCurrency
                }
              })
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

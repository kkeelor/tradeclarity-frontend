// app/api/trades/fetch/route.js
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

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
      'GBP': 0.79,
      'JPY': 149.5,
      'AUD': 1.52,
      'CAD': 1.36,
      'CNY': 7.24,
      'SGD': 1.34,
      'CHF': 0.88
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
    const metadataOnly = searchParams.get('metadataOnly') === 'true' // Only return metadata, not trade data

    // If metadataOnly is true, return lightweight stats without fetching all trades
    if (metadataOnly) {
      // Use count queries instead of fetching all trades
      const { count: totalTrades } = await supabase
        .from('trades')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      const { count: spotCount } = await supabase
        .from('trades')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('account_type', 'SPOT')

      const { count: futuresCount } = await supabase
        .from('trades')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('account_type', 'FUTURES')

      const { data: oldestTrade } = await supabase
        .from('trades')
        .select('trade_time')
        .eq('user_id', user.id)
        .order('trade_time', { ascending: true })
        .limit(1)
        .single()

      const { data: newestTrade } = await supabase
        .from('trades')
        .select('trade_time')
        .eq('user_id', user.id)
        .order('trade_time', { ascending: false })
        .limit(1)
        .single()

      const { data: exchangeData } = await supabase
        .from('trades')
        .select('exchange')
        .eq('user_id', user.id)

      const uniqueExchanges = [...new Set(exchangeData?.map(t => t.exchange) || [])]
      let primaryCurrency = 'USD'
      if (uniqueExchanges.length === 1 && uniqueExchanges[0] === 'coindcx') {
        primaryCurrency = 'INR'
      } else if (uniqueExchanges.includes('coindcx')) {
        primaryCurrency = 'INR'
      }

      return NextResponse.json({
        success: true,
        spotTrades: [],
        futuresIncome: [],
        futuresPositions: [],
        metadata: {
          primaryCurrency,
          availableCurrencies: ['USD', 'INR', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CNY', 'SGD', 'CHF'],
          supportsCurrencySwitch: true,
          exchanges: uniqueExchanges,
          totalTrades: totalTrades || 0,
          spotTrades: spotCount || 0,
          futuresIncome: futuresCount || 0,
          oldestTrade: oldestTrade?.trade_time || null,
          newestTrade: newestTrade?.trade_time || null,
          accountType: (spotCount || 0) > 0 && (futuresCount || 0) > 0 ? 'MIXED' : (spotCount || 0) > 0 ? 'SPOT' : 'FUTURES',
          hasSpot: (spotCount || 0) > 0,
          hasFutures: (futuresCount || 0) > 0
        }
      })
    }

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
          accountType: 'SPOT',
          exchange: trade.exchange // Include exchange from database
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
          exchange: trade.exchange // Include exchange from database
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

    // Enable currency switcher - always support all top 10 currencies
    const availableCurrencies = ['USD', 'INR', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CNY', 'SGD', 'CHF']
    const supportsCurrencySwitch = true // Always enable currency switching

    console.log(`📊 Fetched ${totalTrades} trades (${spotTrades.length} spot, ${futuresIncome.length} futures) ${connectionId ? `for connection ${connectionId}` : exchange ? `for ${exchange}` : 'from all exchanges'}`)
    console.log(`💱 Detected primary currency: ${primaryCurrency} based on exchanges: ${uniqueExchanges.join(', ')}`)
    console.log(`💱 Currency switcher enabled: ${supportsCurrencySwitch}, Available currencies: ${availableCurrencies.join(', ')}`)

    // Try to fetch portfolio snapshot(s) - ONLY for display purposes, not for calculations
    // Portfolio snapshots are preserved for historical value but analytics uses trades only
    let portfolioSnapshot = null
    try {
      // Only fetch portfolio snapshots if there are actual trades or connections
      // This ensures we don't show stale portfolio data when exchanges are deleted
      const hasTrades = spotTrades.length > 0 || futuresIncome.length > 0
      const hasConnections = connectionId || connectionIds || exchange
      
      if (hasTrades || hasConnections) {
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
            
            // Normalize holdings structure for single exchange
            if (portfolioSnapshot.holdings && Array.isArray(portfolioSnapshot.holdings)) {
              const normalizedHoldings = portfolioSnapshot.holdings.map(h => {
                const asset = h.asset || h.currency || 'UNKNOWN'
                const quantity = parseFloat(h.quantity || h.qty || 0)
                const price = parseFloat(h.price || 0)
                const originalUsdValue = parseFloat(h.usdValue || 0)
              
              // Recalculate usdValue if quantity and price are available
              let usdValue = originalUsdValue
              if (quantity > 0 && price > 0) {
                const calculatedValue = quantity * price
                // Use calculated value if stored value is 0 or significantly different
                if (originalUsdValue === 0 || Math.abs(calculatedValue - originalUsdValue) / Math.max(calculatedValue, originalUsdValue) > 0.01) {
                  console.log(`🔧 Recalculating holding ${asset}: ${originalUsdValue.toFixed(2)} → ${calculatedValue.toFixed(2)}`)
                  usdValue = calculatedValue
                }
              }
              
              return {
                asset: asset,
                currency: asset,
                quantity: quantity,
                qty: quantity,
                price: price,
                usdValue: usdValue,
                exchange: portfolioSnapshot.exchange || h.exchange,
                ...h // Keep other fields
              }
            })
            
            // Deduplicate holdings by asset+exchange (keep the one with highest value if duplicates exist)
            const holdingsMap = new Map()
            normalizedHoldings.forEach(holding => {
              const key = `${holding.asset}-${holding.exchange}`.toUpperCase()
              const existing = holdingsMap.get(key)
              
              if (!existing) {
                holdingsMap.set(key, holding)
              } else {
                // Duplicate found - keep the one with higher value
                if (holding.usdValue > existing.usdValue) {
                  console.log(`🔍 Deduplicating ${holding.asset} on ${holding.exchange}: keeping higher value (${holding.usdValue.toFixed(2)} vs ${existing.usdValue.toFixed(2)})`)
                  holdingsMap.set(key, holding)
                } else {
                  console.log(`🔍 Deduplicating ${holding.asset} on ${holding.exchange}: keeping existing (${existing.usdValue.toFixed(2)} vs ${holding.usdValue.toFixed(2)})`)
                }
              }
            })
            
            portfolioSnapshot.holdings = Array.from(holdingsMap.values())
            
            if (normalizedHoldings.length !== portfolioSnapshot.holdings.length) {
              console.log(`🔍 Deduplicated holdings: ${normalizedHoldings.length} → ${portfolioSnapshot.holdings.length} unique`)
            }

            // Recalculate total portfolio value from deduplicated holdings to avoid double-counting
            const recalculatedValue = portfolioSnapshot.holdings.reduce((sum, holding) => {
              return sum + (holding.usdValue || 0)
            }, 0)

            const originalValue = parseFloat(portfolioSnapshot.total_portfolio_value || 0)
            if (Math.abs(recalculatedValue - originalValue) > 0.01) {
              console.log(`🔧 Single exchange portfolio value recalculation: $${originalValue.toFixed(2)} → $${recalculatedValue.toFixed(2)} (difference: $${Math.abs(recalculatedValue - originalValue).toFixed(2)})`)
              portfolioSnapshot.total_portfolio_value = recalculatedValue
            }
          }
          
          // Validate Binance holdings structure
          if (portfolioSnapshot && portfolioSnapshot.exchange === 'binance' && portfolioSnapshot.holdings) {
            console.log(`🔍 Validating Binance holdings structure...`)
            const holdings = portfolioSnapshot.holdings || []
            console.log(`📊 Total holdings: ${holdings.length}`)
            
            // Check for discrepancies
            holdings.forEach((h, idx) => {
              const quantity = parseFloat(h.quantity || 0)
              const price = parseFloat(h.price || 0)
              const usdValue = parseFloat(h.usdValue || 0)
              const calculatedValue = quantity * price
              
              // Check if calculated value matches stored usdValue (allow 1% tolerance for rounding)
              if (calculatedValue > 0 && usdValue > 0) {
                const diff = Math.abs(calculatedValue - usdValue)
                const diffPercent = (diff / calculatedValue) * 100
                
                if (diffPercent > 1) {
                  console.warn(`⚠️  Holding ${idx} (${h.asset || h.currency || 'UNKNOWN'}): Value mismatch!`)
                  console.warn(`   Quantity: ${quantity}, Price: ${price}`)
                  console.warn(`   Calculated: $${calculatedValue.toFixed(2)}, Stored: $${usdValue.toFixed(2)}, Diff: ${diffPercent.toFixed(2)}%`)
                }
              }
              
              // Check for missing required fields
              if (!h.asset && !h.currency) {
                console.warn(`⚠️  Holding ${idx}: Missing asset/currency field`)
              }
              if (!h.quantity && !h.qty) {
                console.warn(`⚠️  Holding ${idx}: Missing quantity field`)
              }
              if (!h.price) {
                console.warn(`⚠️  Holding ${idx}: Missing price field`)
              }
            })
          }
        } else {
          console.log('📊 No portfolio snapshot found for this exchange')
        }
      } else {
        // Viewing COMBINED analytics - fetch ALL snapshots and aggregate them
        // OR viewing SELECTED exchanges - fetch snapshots for selected connections only
        console.log('📊 Fetching portfolio snapshots for combined analytics...')
        
        let snapshotQuery = supabase
          .from('portfolio_snapshots')
          .select('*')
          .eq('user_id', user.id)

        // If specific connections are selected, filter by them
        if (connectionIds) {
          const connIds = connectionIds.split(',').filter(id => id.trim())
          if (connIds.length > 0) {
            console.log(`📊 Filtering snapshots by selected connections: ${connIds.join(', ')}`)
            snapshotQuery = snapshotQuery.in('connection_id', connIds)
          }
        }

        const { data: allSnapshots, error: snapshotError } = await snapshotQuery.order('snapshot_time', { ascending: false })

        if (snapshotError) {
          console.error('Error fetching portfolio snapshots:', snapshotError)
        } else if (allSnapshots && allSnapshots.length > 0) {
          console.log(`📊 Found ${allSnapshots.length} total snapshots${connectionIds ? ' for selected connections' : ' across all exchanges'}`)

          // Group by connection_id, keep most recent for each
          const latestPerConnection = {}
          allSnapshots.forEach(snap => {
            const key = snap.connection_id
            if (!latestPerConnection[key] || new Date(snap.snapshot_time) > new Date(latestPerConnection[key].snapshot_time)) {
              latestPerConnection[key] = snap
            }
          })

          const recentSnapshots = Object.values(latestPerConnection)
          console.log(`📊 Using ${recentSnapshots.length} most recent snapshots (one per connection)`)
          
          // Log which exchanges are included
          recentSnapshots.forEach(snap => {
            console.log(`  - ${snap.exchange} (connection: ${snap.connection_id}): $${snap.total_portfolio_value || 0} ${snap.primary_currency || 'USD'}`)
          })

          // Fetch live currency rates from backend
          const currencyRates = await getCurrencyRates()

          // Aggregate portfolio values across all exchanges
          let totalPortfolioValue = 0
          let totalSpotValue = 0
          let totalFuturesValue = 0
          let allHoldings = []
          // Map to track holdings by asset+exchange for deduplication
          const holdingsMap = new Map()

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

            console.log(`  - ${snap.exchange}: $${portfolioValueUSD.toFixed(2)} USD (from ${snapCurrency}) - ${snap.holdings?.length || 0} holdings`)

            // Merge holdings with exchange attribution
            if (snap.holdings && Array.isArray(snap.holdings) && snap.holdings.length > 0) {
              const exchangeHoldings = snap.holdings.map(h => {
                // Normalize holding structure (handle both 'asset' and 'currency' fields)
                const asset = h.asset || h.currency || 'UNKNOWN'
                const quantity = parseFloat(h.quantity || h.qty || 0)
                const price = parseFloat(h.price || 0)
                const originalUsdValue = parseFloat(h.usdValue || 0)
                
                // Recalculate usdValue if quantity and price are available (more accurate)
                let usdValue = originalUsdValue
                if (quantity > 0 && price > 0) {
                  const calculatedValue = quantity * price
                  // Use calculated value if it's significantly different (likely more accurate)
                  if (originalUsdValue === 0 || Math.abs(calculatedValue - originalUsdValue) / Math.max(calculatedValue, originalUsdValue) > 0.01) {
                    console.log(`🔧 Recalculating holding ${asset}: ${originalUsdValue.toFixed(2)} → ${calculatedValue.toFixed(2)}`)
                    usdValue = calculatedValue
                  }
                }
                
                // Convert holding value to USD using live rates
                const holdingValueUSD = convertCurrency(
                  usdValue,
                  snapCurrency,
                  'USD',
                  currencyRates
                )

                return {
                  asset: asset,
                  currency: asset, // Keep both for compatibility
                  quantity: quantity,
                  qty: quantity, // Keep both for compatibility
                  price: price,
                  usdValue: holdingValueUSD,
                  exchange: snap.exchange,
                  originalValue: originalUsdValue,
                  originalCurrency: snapCurrency
                }
              })
              
              // Deduplicate holdings by asset+exchange (keep the one with highest value if duplicates exist)
              exchangeHoldings.forEach(holding => {
                const key = `${holding.asset}-${holding.exchange}`.toUpperCase()
                const existing = holdingsMap.get(key)
                
                if (!existing) {
                  // First occurrence - add it
                  holdingsMap.set(key, holding)
                } else {
                  // Duplicate found - keep the one with higher value (more recent/larger position)
                  if (holding.usdValue > existing.usdValue) {
                    console.log(`🔍 Deduplicating ${holding.asset} on ${holding.exchange}: keeping higher value (${holding.usdValue.toFixed(2)} vs ${existing.usdValue.toFixed(2)})`)
                    holdingsMap.set(key, holding)
                  } else {
                    console.log(`🔍 Deduplicating ${holding.asset} on ${holding.exchange}: keeping existing (${existing.usdValue.toFixed(2)} vs ${holding.usdValue.toFixed(2)})`)
                  }
                }
              })
              
              console.log(`    Processed ${exchangeHoldings.length} holdings from ${snap.exchange} (${holdingsMap.size} unique after deduplication)`)
            } else {
              console.warn(`    ⚠️  No holdings found for ${snap.exchange} (connection: ${snap.connection_id})`)
            }
          }

          // Convert map values to array
          allHoldings = Array.from(holdingsMap.values())

          // Recalculate total portfolio value from deduplicated holdings to avoid double-counting
          // This ensures the total matches the actual holdings after deduplication
          const recalculatedPortfolioValue = allHoldings.reduce((sum, holding) => {
            return sum + (holding.usdValue || 0)
          }, 0)

          // Log comparison for debugging
          if (Math.abs(recalculatedPortfolioValue - totalPortfolioValue) > 0.01) {
            console.log(`🔧 Portfolio value recalculation: $${totalPortfolioValue.toFixed(2)} → $${recalculatedPortfolioValue.toFixed(2)} (difference: $${Math.abs(recalculatedPortfolioValue - totalPortfolioValue).toFixed(2)})`)
          }

          // Create aggregated portfolio snapshot
          portfolioSnapshot = {
            total_portfolio_value: recalculatedPortfolioValue, // Use recalculated value from deduplicated holdings
            total_spot_value: totalSpotValue, // Keep spot/futures breakdowns from snapshots (they should be accurate)
            total_futures_value: totalFuturesValue,
            holdings: allHoldings,
            snapshot_time: recentSnapshots[0].snapshot_time, // Use most recent timestamp
            _aggregated: true,
            _snapshotCount: recentSnapshots.length,
            _exchanges: recentSnapshots.map(s => s.exchange)
          }

          console.log(`✅ Aggregated portfolio: $${recalculatedPortfolioValue.toFixed(2)} USD (${allHoldings.length} unique holdings from ${recentSnapshots.length} exchanges: ${recentSnapshots.map(s => s.exchange).join(', ')})`)
        } else {
          console.log('📊 No portfolio snapshots found')
        }
      }
      }
    } catch (snapshotErr) {
      console.error('Error fetching portfolio snapshot:', snapshotErr)
      // Continue without snapshot - analytics uses trades only
    }

    // Check if user has no data - return early with graceful error
    if (spotTrades.length === 0 && futuresIncome.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'NO_DATA',
        message: 'No trading data available. Please upload CSV files or connect an exchange to view analytics.',
        spotTrades: [],
        futuresIncome: [],
        futuresPositions: [],
        metadata: {
          primaryCurrency: 'USD',
          availableCurrencies: ['USD'],
          supportsCurrencySwitch: false,
          exchanges: [],
          totalTrades: 0,
          spotTrades: 0,
          futuresIncome: 0,
          hasSpot: false,
          hasFutures: false
        }
      })
    }

    return NextResponse.json({
      success: true,
      spotTrades,
      futuresIncome,
      futuresPositions: [],
      metadata: {
        primaryCurrency: primaryCurrency,
        availableCurrencies: availableCurrencies,
        supportsCurrencySwitch: supportsCurrencySwitch,
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

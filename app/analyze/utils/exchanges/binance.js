// app/analyze/utils/exchanges/binance.js - FIXED VERSION

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL

export const binanceConfig = {
  name: 'Binance',
  displayName: 'Binance',
  icon: '🟡',
  website: 'binance.com',
  supportsCurrencyDetection: false
}

const fetchBinance = async (apiKey, apiSecret, endpoint, params = {}, apiType = 'spot') => {
  if (!BACKEND_URL) throw new Error('BACKEND_URL is not set')
  
  const res = await fetch(`${BACKEND_URL}/api/binance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, apiSecret, endpoint, params, apiType })
  })

  const data = await res.json()
  
  if (!res.ok || !data.success) {
    throw new Error(data.error || `HTTP ${res.status}`)
  }
  
  return data.data
}

const calculateAccountBalance = (spotBalances, futuresBalances, currentPrices) => {
  let totalUSDT = 0
  
  spotBalances.forEach(balance => {
    const total = parseFloat(balance.free) + parseFloat(balance.locked)
    if (total > 0) {
      if (balance.asset === 'USDT' || balance.asset === 'USDC' || balance.asset === 'BUSD') {
        totalUSDT += total
      } else {
        const price = currentPrices[`${balance.asset}USDT`]
        if (price) {
          totalUSDT += total * parseFloat(price)
        }
      }
    }
  })
  
  if (futuresBalances && futuresBalances.length > 0) {
    futuresBalances.forEach(balance => {
      const balanceValue = parseFloat(balance.balance || 0)
      if (balanceValue > 0) {
        totalUSDT += balanceValue
      }
    })
  }
  
  return totalUSDT
}

const fetchCurrentPrices = async (symbols) => {
  try {
    const response = await fetch('https://api.binance.com/api/v3/ticker/price')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const allPrices = await response.json()
    const prices = {}
    
    allPrices.forEach(ticker => {
      if (symbols.includes(ticker.symbol)) {
        prices[ticker.symbol] = ticker.price
      }
    })
    
    return prices
  } catch (error) {
    console.error('Failed to fetch prices:', error)
    return {}
  }
}

export const fetchBinanceTrades = async (apiKey, apiSecret, onProgress) => {
  try {
    console.log('🚀 Starting Binance comprehensive data fetch...')
    onProgress('Connecting to Binance...')

    // Use the NEW comprehensive endpoint
    const res = await fetch(`${BACKEND_URL}/api/binance/fetch-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, apiSecret })
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || `HTTP ${res.status}`)
    }

    const response = await res.json()

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch data')
    }

    const data = response.data

    console.log('✅ Comprehensive fetch complete:', {
      spotTrades: data.spotTrades?.length || 0,
      futuresIncome: data.futuresIncome?.length || 0,
      futuresPositions: data.futuresPositions?.length || 0,
      metadata: data.metadata
    })

    // Return the normalized data from backend
    return {
      spotTrades: data.spotTrades || [],
      futuresIncome: data.futuresIncome || [],
      futuresPositions: data.futuresPositions || [],
      metadata: data.metadata || {
        primaryCurrency: 'USD',
        availableCurrencies: ['USD'],
        supportsCurrencySwitch: false
      }
    }
  } catch (error) {
    console.error('🔴 Error:', error.message)
    throw error
  }
}

// OLD IMPLEMENTATION (kept for reference, but not used anymore)
export const fetchBinanceTradesLegacy = async (apiKey, apiSecret, onProgress) => {
  try {
    console.log('🚀 Starting Binance trade fetch (legacy)...')
    onProgress('Connecting to Binance...')

    // Fetch SPOT account
    const account = await fetchBinance(apiKey, apiSecret, '/api/v3/account', {}, 'spot')
    
    const symbolsToQuery = account.balances
      .filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
      .map(b => `${b.asset}USDT`)
      .filter(s => s !== 'USDTUSDT' && s !== 'USDCUSDT' && s !== 'BUSDUSDT')
      .slice(0, 15)

    console.log('📋 Spot symbols:', symbolsToQuery.length)

    // Fetch FUTURES account and income data
    let futuresAccount = null
    let futuresPositions = []
    let futuresIncome = []
    
    try {
      onProgress('Checking futures account...')
      futuresAccount = await fetchBinance(apiKey, apiSecret, '/fapi/v2/account', {}, 'futures')
      
      if (futuresAccount && futuresAccount.positions) {
        // Get currently open positions
        futuresPositions = futuresAccount.positions.filter(p => 
          parseFloat(p.positionAmt) !== 0 || 
          parseFloat(p.unrealizedProfit) !== 0 ||
          parseFloat(p.initialMargin) !== 0
        )
        
        console.log('📊 Currently open futures positions:', futuresPositions.length)
        
        // CRITICAL: Fetch income history for P&L data
        try {
          onProgress('Fetching futures income history...')
          
          futuresIncome = await fetchBinance(apiKey, apiSecret, '/fapi/v1/income', { 
            limit: 1000
          }, 'futures')
          
          console.log('📊 Total income records:', futuresIncome ? futuresIncome.length : 0)
          
          if (futuresIncome && futuresIncome.length > 0) {
            // Log breakdown by type
            const incomeTypes = {}
            futuresIncome.forEach(inc => {
              incomeTypes[inc.incomeType] = (incomeTypes[inc.incomeType] || 0) + 1
            })
            console.log('📊 Income breakdown:', incomeTypes)
            
            // Log symbols found
            const symbols = [...new Set(futuresIncome.map(i => i.symbol).filter(Boolean))]
            console.log('📊 Symbols in income:', symbols)
          }
          
        } catch (incomeErr) {
          console.warn('⚠️ Could not fetch income history:', incomeErr.message)
          futuresIncome = []
        }
      }
    } catch (err) {
      console.warn('⚠️ Futures not accessible:', err.message)
      onProgress('Futures not available, using spot only...')
    }

    if (symbolsToQuery.length === 0 && futuresIncome.length === 0) {
      throw new Error('No trading data found')
    }

    onProgress(`Analyzing ${symbolsToQuery.length} spot symbols + futures data...`)

    // Fetch prices
    const allSymbols = [...new Set([
      ...symbolsToQuery,
      ...futuresIncome.map(i => i.symbol).filter(Boolean)
    ])]
    const currentPrices = allSymbols.length > 0 ? await fetchCurrentPrices(allSymbols) : {}
    
    const accountBalance = calculateAccountBalance(
      account.balances, 
      futuresAccount ? futuresAccount.assets : [],
      currentPrices
    )

    // Fetch SPOT trades
    const allSpotTrades = []
    const spotBatchSize = 5
    
    for (let i = 0; i < symbolsToQuery.length; i += spotBatchSize) {
      const batch = symbolsToQuery.slice(i, i + spotBatchSize)
      onProgress(`Fetching spot trades ${i + 1}-${Math.min(i + spotBatchSize, symbolsToQuery.length)}/${symbolsToQuery.length}...`)
      
      const batchPromises = batch.map(symbol => 
        fetchBinance(apiKey, apiSecret, '/api/v3/myTrades', { symbol, limit: 1000 }, 'spot')
          .then(trades => {
            if (trades && trades.length > 0) {
              trades.forEach(t => {
                t.accountType = 'SPOT'
                t.symbol = symbol
              })
              return trades
            }
            return []
          })
          .catch(() => [])
      )
      
      const batchResults = await Promise.all(batchPromises)
      batchResults.forEach(trades => allSpotTrades.push(...trades))
      
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    console.log('✅ Fetch complete:', {
      spotTrades: allSpotTrades.length,
      futuresIncome: futuresIncome.length,
      futuresPositions: futuresPositions.length
    })

    // NEW FORMAT: Return structured data for new analyzers
    return {
      spotTrades: allSpotTrades,
      futuresIncome: futuresIncome,
      futuresPositions: futuresPositions,
      metadata: {
        primaryCurrency: 'USD',
        availableCurrencies: ['USD'],
        supportsCurrencySwitch: false,
        accountBalance,
        accountType: futuresAccount ? 'UNIFIED' : 'SPOT',
        hasFutures: futuresAccount !== null,
        futuresPositions: futuresPositions.length,
        spotTrades: allSpotTrades.length,
        futuresIncome: futuresIncome.length,
        canTrade: account.canTrade,
        currentPrices,
        balances: account.balances,
        futuresBalances: futuresAccount ? futuresAccount.assets : []
      }
    }
  } catch (error) {
    console.error('🔴 Error:', error.message)
    throw error
  }
}

export const normalizeBinanceTrades = (binanceData) => {
  // NEW FORMAT: Handle structured data
  if (binanceData.spotTrades && binanceData.futuresIncome !== undefined) {
    console.log('✅ Using new structured format')
    
    const spotNormalized = binanceData.spotTrades.map(trade => ({
      symbol: trade.symbol,
      qty: String(trade.qty),
      price: String(trade.price),
      quoteQty: String(trade.quoteQty || parseFloat(trade.qty) * parseFloat(trade.price)),
      commission: String(trade.commission || 0),
      commissionAsset: trade.commissionAsset || 'USDT',
      isBuyer: trade.isBuyer || trade.buyer || trade.side === 'BUY',
      isMaker: trade.isMaker || false,
      time: trade.time,
      orderId: trade.orderId,
      id: trade.id,
      accountType: 'SPOT'
    }))
    
    console.log('📊 Normalized data:', {
      spotTrades: spotNormalized.length,
      futuresIncome: binanceData.futuresIncome.length,
      futuresPositions: binanceData.futuresPositions.length
    })
    
    return {
      spotTrades: spotNormalized,
      futuresIncome: binanceData.futuresIncome,
      futuresPositions: binanceData.futuresPositions,
      metadata: binanceData.metadata
    }
  }
  
  // LEGACY FORMAT: Handle old array format
  const trades = binanceData.trades || binanceData
  const metadata = binanceData.metadata || {
    primaryCurrency: 'USD',
    availableCurrencies: ['USD'],
    supportsCurrencySwitch: false
  }
  
  const normalized = trades.map(trade => ({
    symbol: trade.symbol,
    qty: String(trade.qty),
    price: String(trade.price),
    quoteQty: String(trade.quoteQty || parseFloat(trade.qty) * parseFloat(trade.price)),
    commission: String(trade.commission || 0),
    commissionAsset: trade.commissionAsset || 'USDT',
    isBuyer: trade.isBuyer || trade.buyer || trade.side === 'BUY',
    isMaker: trade.isMaker || false,
    time: trade.time,
    orderId: trade.orderId,
    id: trade.id,
    accountType: trade.accountType || 'SPOT'
  }))
  
  console.log('✅ Normalized (legacy):', normalized.length, 'trades')
  
  return {
    trades: normalized,
    metadata
  }
}
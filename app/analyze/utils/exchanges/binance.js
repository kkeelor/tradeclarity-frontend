// app/analyze/utils/exchanges/binance.js - OPTIMIZED VERSION

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
    console.log('🚀 Starting Binance trade fetch...')
    onProgress('Connecting to Binance...')

    // Fetch SPOT account
    const account = await fetchBinance(apiKey, apiSecret, '/api/v3/account', {}, 'spot')
    
    const symbolsToQuery = account.balances
      .filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
      .map(b => `${b.asset}USDT`)
      .filter(s => s !== 'USDTUSDT' && s !== 'USDCUSDT' && s !== 'BUSDUSDT')
      .slice(0, 15) // Limit to 15 for speed

    console.log('📋 Spot symbols:', symbolsToQuery.length)

    // Fetch FUTURES account
    let futuresAccount = null
    let futuresPositions = []
    let futuresSymbols = []
    
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
        
        // CRITICAL FIX: Get historical traded symbols from income history
        try {
          onProgress('Fetching futures trading history...')
          
          // Try Method 1: Get ALL income types (not just REALIZED_PNL)
          let income = await fetchBinance(apiKey, apiSecret, '/fapi/v1/income', { 
            limit: 1000
          }, 'futures')
          
          console.log('📊 Total income records:', income ? income.length : 0)
          
          if (!income || income.length === 0) {
            console.warn('⚠️ No income records found. Trying alternative method...')
            
            // Method 2: Try getting all orders instead
            // This endpoint gives you order history across all symbols
            try {
              const allOrders = await fetchBinance(apiKey, apiSecret, '/fapi/v1/allOrders', {
                limit: 500
              }, 'futures')
              
              console.log('📊 Found orders via allOrders:', allOrders.length)
              
              // Extract symbols from orders
              const historicalSymbols = [...new Set(
                allOrders
                  .filter(o => o.symbol)
                  .map(o => o.symbol)
              )]
              
              futuresSymbols = historicalSymbols
              console.log('📊 Symbols from orders:', futuresSymbols.length)
              
            } catch (ordersErr) {
              console.warn('⚠️ Could not fetch all orders:', ordersErr.message)
              
              // Method 3: Last resort - try common trading pairs
              console.log('📊 Trying common futures symbols as last resort...')
              futuresSymbols = [
                'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
                'ADAUSDT', 'DOGEUSDT', 'MATICUSDT', 'DOTUSDT', 'LINKUSDT'
              ]
            }
          } else {
            // Extract unique symbols from income history
            const historicalSymbols = [...new Set(
              income
                .filter(i => i.symbol && i.symbol !== '') // Remove null/empty symbols
                .map(i => i.symbol)
            )]
            
            // Combine open positions + historical symbols
            const openSymbols = futuresPositions.map(p => p.symbol)
            futuresSymbols = [...new Set([...openSymbols, ...historicalSymbols])]
            
            console.log('📊 Historical futures symbols from income:', historicalSymbols.length)
            console.log('📊 Total unique symbols to query:', futuresSymbols.length)
          }
          
        } catch (incomeErr) {
          console.warn('⚠️ Could not fetch income history:', incomeErr.message)
          // Fallback to just positions if income endpoint fails
          futuresSymbols = futuresPositions.map(p => p.symbol)
        }
      }
    } catch (err) {
      console.warn('⚠️ Futures not accessible:', err.message)
      onProgress('Futures not available, using spot only...')
    }

    if (symbolsToQuery.length === 0 && futuresSymbols.length === 0) {
      throw new Error('No trading pairs found')
    }

    onProgress(`Analyzing ${symbolsToQuery.length} spot + ${futuresSymbols.length} futures pairs...`)

    // Fetch prices (only if we have symbols to query)
    const allSymbols = [...new Set([...symbolsToQuery, ...futuresSymbols])]
    const currentPrices = allSymbols.length > 0 ? await fetchCurrentPrices(allSymbols) : {}
    
    const accountBalance = calculateAccountBalance(
      account.balances, 
      futuresAccount ? futuresAccount.assets : [],
      currentPrices
    )

    // Fetch SPOT trades (parallel batches for speed)
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
      
      // Small delay between batches to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    // Fetch FUTURES trades (parallel batches)
    const allFuturesTrades = []
    
    if (futuresSymbols.length > 0) {
      onProgress('Fetching futures trades...')
      const futuresBatchSize = 5
      
      for (let i = 0; i < futuresSymbols.length; i += futuresBatchSize) {
        const batch = futuresSymbols.slice(i, i + futuresBatchSize)
        onProgress(`Fetching futures ${i + 1}-${Math.min(i + futuresBatchSize, futuresSymbols.length)}/${futuresSymbols.length}...`)
        
        const batchPromises = batch.map(symbol =>
          fetchBinance(apiKey, apiSecret, '/fapi/v1/userTrades', { symbol, limit: 1000 }, 'futures')
            .then(trades => {
              if (trades && trades.length > 0) {
                trades.forEach(t => {
                  t.accountType = 'FUTURES'
                  t.symbol = symbol
                  t.qty = t.qty || t.baseQty
                  t.quoteQty = t.quoteQty || (parseFloat(t.qty) * parseFloat(t.price)).toString()
                  t.isBuyer = t.buyer || t.side === 'BUY'
                  t.commission = t.commission || '0'
                  t.commissionAsset = t.commissionAsset || 'USDT'
                })
                return trades
              }
              return []
            })
            .catch(() => [])
        )
        
        const batchResults = await Promise.all(batchPromises)
        batchResults.forEach(trades => allFuturesTrades.push(...trades))
        
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    const allTrades = [...allSpotTrades, ...allFuturesTrades]

    if (allTrades.length === 0) throw new Error('No trades found')

    console.log('✅ Total:', allTrades.length, 'trades')
    console.log('   - Spot:', allSpotTrades.length)
    console.log('   - Futures:', allFuturesTrades.length)

    return {
      trades: allTrades,
      metadata: {
        primaryCurrency: 'USD',
        availableCurrencies: ['USD'],
        supportsCurrencySwitch: false,
        accountBalance,
        accountType: futuresAccount ? 'UNIFIED' : 'SPOT',
        hasFutures: futuresAccount !== null,
        futuresPositions: futuresPositions.length,
        spotTrades: allSpotTrades.length,
        futuresTrades: allFuturesTrades.length,
        totalTrades: allTrades.length,
        canTrade: account.canTrade,
        currentPrices,
        balances: account.balances,
        futuresBalances: futuresAccount ? futuresAccount.assets : [],
        futuresPositionsData: futuresPositions
      }
    }
  } catch (error) {
    console.error('🔴 Error:', error.message)
    throw error
  }
}

export const normalizeBinanceTrades = (binanceData) => {
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
    accountType: trade.accountType || 'SPOT',
    realizedPnl: trade.realizedPnl || '0'
  }))
  
  console.log('✅ Normalized:', normalized.length, 'trades')
  console.log('   - Spot:', normalized.filter(t => t.accountType === 'SPOT').length)
  console.log('   - Futures:', normalized.filter(t => t.accountType === 'FUTURES').length)
  
  return {
    trades: normalized,
    metadata
  }
}
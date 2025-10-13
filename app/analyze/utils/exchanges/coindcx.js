// app/analyze/utils/exchanges/coindcx.js

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL

export const coindcxConfig = {
  name: 'CoinDCX',
  displayName: 'CoinDCX',
  icon: '🇮🇳',
  website: 'coindcx.com',
  supportsCurrencyDetection: true
}

const fetchCoinDCX = async (apiKey, apiSecret, endpoint, params = {}) => {
  if (!BACKEND_URL) throw new Error('BACKEND_URL is not set')
  
  console.log('🔵 Fetching from CoinDCX:', endpoint, params)
  
  const res = await fetch(`${BACKEND_URL}/api/coindcx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, apiSecret, endpoint, params })
  })

  console.log('🔵 Response status:', res.status, res.statusText)
  
  const data = await res.json().catch((err) => {
    console.error('🔴 Failed to parse JSON:', err)
    return {}
  })
  
  console.log('🔵 Response data:', data)
  
  if (!res.ok || !data.success) {
    console.error('🔴 API Error:', data.error || `HTTP ${res.status}`)
    throw new Error(data.error || `HTTP ${res.status}`)
  }
  
  return data.data
}

// Detect primary currency from trades
const detectPrimaryCurrency = (trades) => {
  console.log('🔍 Detecting primary currency from trades...')
  const currencyCount = { INR: 0, USDT: 0 }
  
  trades.forEach(trade => {
    const symbol = trade.symbol.toUpperCase()
    if (symbol.endsWith('INR')) {
      currencyCount.INR++
    } else if (symbol.endsWith('USDT')) {
      currencyCount.USDT++
    }
  })
  
  const primary = currencyCount.INR >= currencyCount.USDT ? 'INR' : 'USDT'
  console.log('💱 Currency count:', currencyCount, '→ Primary:', primary)
  
  return primary
}

// Get available currencies from trades
const getAvailableCurrencies = (trades) => {
  console.log('🔍 Detecting available currencies...')
  const currencies = new Set()
  
  trades.forEach(trade => {
    const symbol = trade.symbol.toUpperCase()
    if (symbol.endsWith('INR')) {
      currencies.add('INR')
    } else if (symbol.endsWith('USDT')) {
      currencies.add('USDT')
    }
  })
  
  const available = Array.from(currencies)
  console.log('💱 Available currencies:', available)
  
  return available
}

// Calculate total account balance
const calculateAccountBalance = (balances, primaryCurrency) => {
  console.log('💰 Calculating account balance...')
  console.log('Balances:', balances)
  console.log('Primary currency:', primaryCurrency)
  
  let totalQuoteCurrency = 0
  let totalOtherAssets = 0
  
  balances.forEach(balance => {
    const free = parseFloat(balance.balance || 0)
    const locked = parseFloat(balance.locked_balance || 0)
    const total = free + locked
    
    if (total > 0) {
      // Sum up the quote currency (INR or USDT)
      if (balance.currency === primaryCurrency) {
        totalQuoteCurrency += total
        console.log(`💵 ${balance.currency}: ${total} (quote currency)`)
      } else if (balance.currency === 'USDT' && primaryCurrency === 'INR') {
        // If primary is INR but also has USDT, just log it
        console.log(`💵 ${balance.currency}: ${total} (alternate currency - not counted in INR balance)`)
      } else if (balance.currency === 'INR' && primaryCurrency === 'USDT') {
        // If primary is USDT but also has INR, just log it
        console.log(`💵 ${balance.currency}: ${total} (alternate currency - not counted in USDT balance)`)
      } else {
        // Other crypto assets
        totalOtherAssets += 1
        console.log(`💵 ${balance.currency}: ${total} (crypto asset)`)
      }
    }
  })
  
  console.log('💰 Total quote currency balance:', totalQuoteCurrency)
  console.log('💰 Other crypto assets:', totalOtherAssets, 'types')
  
  return totalQuoteCurrency
}

export const fetchCoinDCXTrades = async (apiKey, apiSecret, onProgress) => {
  try {
    console.log('🚀 Starting CoinDCX trade fetch...')
    onProgress('Connecting to CoinDCX...')
    onProgress('Fetching CoinDCX trades...')
    
    // Fetch trade history
    console.log('📝 Fetching trade history...')
    const trades = await fetchCoinDCX(apiKey, apiSecret, '/exchange/v1/orders/trade_history', { limit: 500 })
    console.log('✅ Trade history received:', trades.length, 'trades')
    
    if (!trades || trades.length === 0) {
      throw new Error('No trades found')
    }

    // Detect currencies first
    const primaryCurrency = detectPrimaryCurrency(trades)
    const availableCurrencies = getAvailableCurrencies(trades)

    // Fetch account balances
    onProgress('Fetching account balances...')
    let balances = []
    let accountBalance = 0
    
    try {
      console.log('📝 Fetching account balances...')
      balances = await fetchCoinDCX(apiKey, apiSecret, '/exchange/v1/users/balances', {})
      console.log('✅ Balances received:', balances.length, 'currencies')
      accountBalance = calculateAccountBalance(balances, primaryCurrency)
    } catch (error) {
      console.warn('⚠️ Could not fetch balances:', error.message)
      console.log('Continuing without balance data...')
    }

    // Fetch active orders (open positions)
    onProgress('Fetching active orders...')
    let activeOrders = []
    
    try {
      console.log('📝 Fetching active orders...')
      activeOrders = await fetchCoinDCX(apiKey, apiSecret, '/exchange/v1/orders/active_orders', {})
      console.log('✅ Active orders received:', activeOrders.length, 'orders')
    } catch (error) {
      console.warn('⚠️ Could not fetch active orders:', error.message)
      console.log('Continuing without active orders data...')
    }

    console.log('📦 Preparing metadata...')
    const metadata = {
      primaryCurrency,
      availableCurrencies,
      supportsCurrencySwitch: availableCurrencies.length > 1,
      accountBalance,
      accountType: 'SPOT',
      balances,
      activeOrders,
      openPositions: activeOrders.length
    }

    console.log('✅ Metadata prepared:', metadata)
    console.log('📦 Returning data...')

    return {
      trades,
      metadata
    }
  } catch (error) {
    console.error('🔴 Error in fetchCoinDCXTrades:', error)
    throw error
  }
}

// Normalize CoinDCX format to match standard format
export const normalizeCoinDCXTrades = (coindcxData) => {
  console.log('🔄 Normalizing CoinDCX trades...')
  
  const trades = coindcxData.trades || coindcxData
  const metadata = coindcxData.metadata || {}
  
  console.log('Raw trades count:', trades.length)
  console.log('Metadata:', metadata)
  
  const normalized = trades.map(trade => ({
    symbol: trade.symbol,
    qty: String(trade.quantity),
    price: String(trade.price),
    quoteQty: String(parseFloat(trade.quantity) * parseFloat(trade.price)),
    commission: String(trade.fee_amount || 0),
    commissionAsset: metadata.primaryCurrency || 'INR',
    isBuyer: trade.side === 'buy',
    isMaker: false, // CoinDCX doesn't provide this
    time: Math.floor(trade.timestamp),
    orderId: trade.order_id,
    id: trade.id,
    accountType: 'SPOT', // CRITICAL: Add this field!
    realizedPnl: '0' // CoinDCX spot trades don't have direct PnL
  }))

  console.log('✅ Normalized trades count:', normalized.length)
  console.log('Sample normalized trade:', normalized[0])

  return {
    trades: normalized,
    metadata
  }
}
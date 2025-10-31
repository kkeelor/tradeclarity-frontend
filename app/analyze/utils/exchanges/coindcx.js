// app/analyze/utils/exchanges/coindcx.js

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL

export const coindcxConfig = {
  name: 'CoinDCX',
  displayName: 'CoinDCX',
  icon: '🇮🇳', // Legacy fallback
  logoPath: '/exchanges/coindcx.svg',
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
    console.log('🚀 Starting CoinDCX comprehensive data fetch...')
    onProgress('Connecting to CoinDCX...')

    // Fetch live exchange rates from backend
    try {
      const ratesRes = await fetch(`${BACKEND_URL}/api/currency-rate`)
      if (ratesRes.ok) {
        const ratesData = await ratesRes.json()
        if (ratesData.success && ratesData.rates && ratesData.rates.INR) {
          // Update frontend exchange rates
          const { updateExchangeRates } = await import('../currencyFormatter')
          updateExchangeRates(ratesData.rates.INR)
        }
      }
    } catch (ratesError) {
      console.warn('Could not fetch live exchange rates:', ratesError.message)
    }

    // Use the NEW comprehensive endpoint (similar to Binance)
    const res = await fetch(`${BACKEND_URL}/api/coindcx/fetch-all`, {
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
      metadata: data.metadata
    })

    // Return the normalized data from backend (similar to Binance format)
    return {
      spotTrades: data.spotTrades || [],
      futuresIncome: data.futuresIncome || [],
      futuresPositions: data.futuresPositions || [],
      metadata: data.metadata || {
        primaryCurrency: 'INR',
        availableCurrencies: ['INR'],
        supportsCurrencySwitch: false
      }
    }
  } catch (error) {
    console.error('🔴 Error:', error.message)
    throw error
  }
}

// Normalize CoinDCX format to match standard format
export const normalizeCoinDCXTrades = (coindcxData) => {
  console.log('🔄 Normalizing CoinDCX trades...')

  // NEW FORMAT: Handle structured data (similar to Binance)
  if (coindcxData.spotTrades !== undefined) {
    console.log('✅ Using new structured format')

    // Data is already normalized from backend, just ensure string format for consistency
    const spotNormalized = coindcxData.spotTrades.map(trade => ({
      symbol: trade.symbol,
      qty: String(trade.qty),
      price: String(trade.price),
      quoteQty: String(trade.quoteQty),
      commission: String(trade.commission || 0),
      commissionAsset: trade.commissionAsset,
      isBuyer: trade.isBuyer,
      isMaker: trade.isMaker,
      time: trade.time,
      orderId: trade.orderId,
      id: trade.id,
      accountType: 'SPOT'
    }))

    console.log('📊 Normalized data:', {
      spotTrades: spotNormalized.length,
      futuresIncome: coindcxData.futuresIncome?.length || 0,
      futuresPositions: coindcxData.futuresPositions?.length || 0
    })

    return {
      spotTrades: spotNormalized,
      futuresIncome: coindcxData.futuresIncome || [],
      futuresPositions: coindcxData.futuresPositions || [],
      metadata: coindcxData.metadata
    }
  }

  // LEGACY FORMAT: Handle old format for backwards compatibility
  const trades = coindcxData.trades || coindcxData
  const metadata = coindcxData.metadata || {
    primaryCurrency: 'INR',
    availableCurrencies: ['INR'],
    supportsCurrencySwitch: false
  }

  const normalized = trades.map(trade => ({
    symbol: trade.symbol,
    qty: String(trade.quantity),
    price: String(trade.price),
    quoteQty: String(parseFloat(trade.quantity) * parseFloat(trade.price)),
    commission: String(trade.fee_amount || 0),
    commissionAsset: metadata.primaryCurrency || 'INR',
    isBuyer: trade.side === 'buy',
    isMaker: false,
    time: Math.floor(trade.timestamp),
    orderId: trade.order_id,
    id: trade.id,
    accountType: 'SPOT'
  }))

  console.log('✅ Normalized (legacy):', normalized.length, 'trades')

  return {
    trades: normalized,
    metadata
  }
}
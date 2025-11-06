// app/analyze/utils/currencyConverter.js
/**
 * Currency Conversion Utility
 * Handles automatic currency detection and conversion at the analyzer level
 * Works with both API-fetched data and CSV uploads
 */

// Use Next.js API route instead of external backend
// This allows the frontend to fetch rates without requiring a separate backend server
const API_ROUTE = '/api/currency-rate'

// Cache for exchange rates (client-side)
let ratesCache = null
let cacheTimestamp = null
// Cache duration: 15 minutes (in milliseconds)
// Matches backend cache duration to ensure consistency
// Provides reasonable freshness while preventing excessive API calls
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes

/**
 * Get cached rates synchronously (returns fallback if cache not ready)
 * @returns {Object} Rates object
 */
export function getCachedRatesSync() {
  if (ratesCache) {
    console.log('💱 Using cached rates for conversion:', Object.keys(ratesCache).length, 'currencies')
    return ratesCache
  }
  // Return fallback rates if cache not ready
  console.log('💱 Using fallback rates for conversion (cache not ready)')
  const fallbackRates = {
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
  return fallbackRates
}

/**
 * Convert amount from one currency to another (synchronous version using cache)
 * @param {number} amount - Amount to convert
 * @param {string} from - Source currency code (e.g., 'USD')
 * @param {string} to - Target currency code (e.g., 'INR')
 * @returns {number} Converted amount
 */
export function convertCurrencySync(amount, from, to) {
  // No conversion needed if currencies are the same
  if (from === to) {
    return amount
  }

  // Get cached rates (or fallback)
  const rates = getCachedRatesSync()

  // All rates are relative to USD (base currency)
  const fromRate = rates[from] || 1.0
  const toRate = rates[to] || 1.0

  // Convert: amount in FROM → USD → TO
  const usdAmount = amount / fromRate
  const convertedAmount = usdAmount * toRate

  console.log(`💱 Converting ${amount} ${from} → ${convertedAmount.toFixed(2)} ${to} (rate: ${fromRate} → ${toRate})`)

  return convertedAmount
}

/**
 * Fetch currency rates from backend
 * Uses cached rates if available and not expired
 */
export async function getCurrencyRates() {
  const now = Date.now()

  // Return cached rates if available and not expired
  if (ratesCache && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
    console.log('💱 Using cached exchange rates')
    return ratesCache
  }

  try {
    console.log('💱 Fetching fresh exchange rates from API...')
    const response = await fetch(API_ROUTE)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    if (data.success && data.rates) {
      ratesCache = data.rates
      cacheTimestamp = now
      console.log('✅ Exchange rates fetched:', Object.keys(data.rates).length, 'currencies')
      return data.rates
    }

    throw new Error('Invalid response format')
  } catch (error) {
    console.error('⚠️ Failed to fetch exchange rates:', error.message)

    // Return fallback rates if fetch fails
    console.log('⚠️ Using fallback exchange rates')
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
 * Convert amount from one currency to another
 * @param {number} amount - Amount to convert
 * @param {string} from - Source currency code (e.g., 'INR')
 * @param {string} to - Target currency code (e.g., 'USD')
 * @returns {number} Converted amount
 */
export async function convertCurrency(amount, from, to) {
  // No conversion needed if currencies are the same
  if (from === to) {
    return amount
  }

  // Get exchange rates (from cache or API)
  const rates = await getCurrencyRates()

  // All rates are relative to USD (base currency)
  const fromRate = rates[from] || 1.0
  const toRate = rates[to] || 1.0

  // Convert: amount in FROM → USD → TO
  const usdAmount = amount / fromRate
  const convertedAmount = usdAmount * toRate

  return convertedAmount
}

/**
 * Detect currency from metadata
 * @param {object} metadata - Trade data metadata
 * @returns {string} Detected currency code or 'USD' as default
 */
export function detectCurrency(metadata) {
  if (!metadata) {
    return 'USD'
  }

  // Check for primaryCurrency field (used by CoinDCX, etc.)
  if (metadata.primaryCurrency) {
    console.log('💱 Detected currency from metadata.primaryCurrency:', metadata.primaryCurrency)
    return metadata.primaryCurrency
  }

  // Check exchange-specific hints
  if (metadata.exchanges && metadata.exchanges.includes('coindcx')) {
    console.log('💱 Detected CoinDCX exchange → INR')
    return 'INR'
  }

  // Default to USD for Binance and other exchanges
  console.log('💱 No currency metadata found, defaulting to USD')
  return 'USD'
}

/**
 * Convert spot trades to USD
 * @param {Array} spotTrades - Array of spot trade objects
 * @param {string} sourceCurrency - Source currency code
 * @returns {Promise<Array>} Converted trades
 */
export async function convertSpotTradesToUSD(spotTrades, sourceCurrency) {
  if (!spotTrades || spotTrades.length === 0) {
    return []
  }

  // No conversion needed if already in USD
  if (sourceCurrency === 'USD') {
    console.log('✅ Spot trades already in USD, no conversion needed')
    return spotTrades
  }

  console.log(`💱 Converting ${spotTrades.length} spot trades from ${sourceCurrency} to USD...`)

  // Get conversion rate once (more efficient than per-trade)
  const rate = await convertCurrency(1, sourceCurrency, 'USD')
  console.log(`💱 Using conversion rate: 1 ${sourceCurrency} = ${rate.toFixed(6)} USD`)

  // Convert all price-related fields
  const convertedTrades = spotTrades.map(trade => ({
    ...trade,
    price: String(parseFloat(trade.price || 0) * rate),
    quoteQty: String(parseFloat(trade.quoteQty || 0) * rate),
    commission: String(parseFloat(trade.commission || 0) * rate)
    // qty stays the same (it's the base asset quantity)
  }))

  console.log(`✅ Converted ${convertedTrades.length} spot trades to USD`)
  return convertedTrades
}

/**
 * Convert futures income records to USD
 * @param {Array} futuresIncome - Array of futures income objects
 * @param {string} sourceCurrency - Source currency code
 * @returns {Promise<Array>} Converted income records
 */
export async function convertFuturesIncomeToUSD(futuresIncome, sourceCurrency) {
  if (!futuresIncome || futuresIncome.length === 0) {
    return []
  }

  // No conversion needed if already in USD
  if (sourceCurrency === 'USD') {
    console.log('✅ Futures income already in USD, no conversion needed')
    return futuresIncome
  }

  console.log(`💱 Converting ${futuresIncome.length} futures income records from ${sourceCurrency} to USD...`)

  // Get conversion rate once
  const rate = await convertCurrency(1, sourceCurrency, 'USD')
  console.log(`💱 Using conversion rate: 1 ${sourceCurrency} = ${rate.toFixed(6)} USD`)

  // Convert income amounts
  const convertedIncome = futuresIncome.map(record => ({
    ...record,
    income: String(parseFloat(record.income || 0) * rate)
  }))

  console.log(`✅ Converted ${convertedIncome.length} futures income records to USD`)
  return convertedIncome
}

/**
 * Convert futures positions to USD
 * @param {Array} futuresPositions - Array of futures position objects
 * @param {string} sourceCurrency - Source currency code
 * @returns {Promise<Array>} Converted positions
 */
export async function convertFuturesPositionsToUSD(futuresPositions, sourceCurrency) {
  if (!futuresPositions || futuresPositions.length === 0) {
    return []
  }

  // No conversion needed if already in USD
  if (sourceCurrency === 'USD') {
    console.log('✅ Futures positions already in USD, no conversion needed')
    return futuresPositions
  }

  console.log(`💱 Converting ${futuresPositions.length} futures positions from ${sourceCurrency} to USD...`)

  // Get conversion rate once
  const rate = await convertCurrency(1, sourceCurrency, 'USD')
  console.log(`💱 Using conversion rate: 1 ${sourceCurrency} = ${rate.toFixed(6)} USD`)

  // Convert position values
  const convertedPositions = futuresPositions.map(pos => ({
    ...pos,
    entryPrice: pos.entryPrice ? parseFloat(pos.entryPrice) * rate : 0,
    markPrice: pos.markPrice ? parseFloat(pos.markPrice) * rate : 0,
    liquidationPrice: pos.liquidationPrice ? parseFloat(pos.liquidationPrice) * rate : 0,
    unrealizedProfit: pos.unrealizedProfit ? parseFloat(pos.unrealizedProfit) * rate : 0,
    margin: pos.margin ? parseFloat(pos.margin) * rate : 0
  }))

  console.log(`✅ Converted ${convertedPositions.length} futures positions to USD`)
  return convertedPositions
}

/**
 * Main function: Auto-detect currency and convert all data to USD
 * This is called by masterAnalyzer before processing
 *
 * @param {object} tradeData - Raw trade data with spotTrades, futuresIncome, futuresPositions, metadata
 * @returns {Promise<object>} Converted trade data (all values in USD)
 */
export async function autoConvertToUSD(tradeData) {
  console.log('\n💱 === AUTO CURRENCY CONVERSION ===')
  console.log('💱 Input data type:', Array.isArray(tradeData) ? 'Array' : typeof tradeData)
  console.log('💱 Input data keys:', Object.keys(tradeData || {}))

  // Handle both array format (legacy) and object format (new)
  let data = tradeData

  // If it's an array, convert to object format
  if (Array.isArray(tradeData)) {
    data = {
      spotTrades: tradeData.filter(t => t.accountType === 'SPOT'),
      futuresIncome: [],
      futuresPositions: [],
      metadata: {}
    }
  } else if (tradeData && typeof tradeData === 'object') {
    // Handle API response format: { success: true, spotTrades, futuresIncome, metadata }
    // Extract just the data fields, ignore 'success' field
    if ('success' in tradeData) {
      data = {
        spotTrades: tradeData.spotTrades || [],
        futuresIncome: tradeData.futuresIncome || [],
        futuresPositions: tradeData.futuresPositions || [],
        futuresTrades: tradeData.futuresTrades || [],
        metadata: tradeData.metadata || {}
      }
      console.log('💱 Extracted data from API response format')
    } else {
      // Already in correct format
      data = {
        spotTrades: tradeData.spotTrades || [],
        futuresIncome: tradeData.futuresIncome || [],
        futuresPositions: tradeData.futuresPositions || [],
        futuresTrades: tradeData.futuresTrades || [],
        metadata: tradeData.metadata || {}
      }
    }
  }

  console.log('💱 Processed data structure:', {
    hasSpotTrades: !!data.spotTrades,
    hasFuturesIncome: !!data.futuresIncome,
    hasMetadata: !!data.metadata,
    metadataKeys: data.metadata ? Object.keys(data.metadata) : [],
    hasSpotHoldings: !!data.metadata?.spotHoldings,
    spotHoldingsCount: data.metadata?.spotHoldings?.length || 0
  })

  // Detect currency from metadata
  const sourceCurrency = detectCurrency(data.metadata)

  console.log(`💱 Source currency detected: ${sourceCurrency}`)
  console.log(`💱 Data to convert:`)
  console.log(`   - Spot trades: ${data.spotTrades?.length || 0}`)
  console.log(`   - Futures income: ${data.futuresIncome?.length || 0}`)
  console.log(`   - Futures positions: ${data.futuresPositions?.length || 0}`)
  console.log(`   - Holdings: ${data.metadata?.spotHoldings?.length || 0}`)

  // If already in USD, return as-is
  if (sourceCurrency === 'USD') {
    console.log('✅ Data already in USD, no conversion needed')
    // Log holdings info for debugging
    if (data.metadata?.spotHoldings) {
      console.log(`💱 Holdings preserved (USD): ${data.metadata.spotHoldings.length} holdings`)
      console.log(`💱 Holdings sample:`, data.metadata.spotHoldings.slice(0, 3).map(h => ({
        asset: h.asset,
        quantity: h.quantity,
        price: h.price,
        usdValue: h.usdValue,
        exchange: h.exchange
      })))
    } else {
      console.log('⚠️  No spotHoldings found in metadata (USD path)')
    }
    console.log('💱 === CONVERSION COMPLETE ===\n')
    return data
  }

  // Convert all data to USD
  const convertedSpotTrades = await convertSpotTradesToUSD(
    data.spotTrades || [],
    sourceCurrency
  )

  const convertedFuturesIncome = await convertFuturesIncomeToUSD(
    data.futuresIncome || [],
    sourceCurrency
  )

  const convertedFuturesPositions = await convertFuturesPositionsToUSD(
    data.futuresPositions || [],
    sourceCurrency
  )

  // Update metadata to reflect conversion
  const convertedMetadata = {
    ...data.metadata,
    originalCurrency: sourceCurrency,
    convertedToUSD: true,
    conversionTimestamp: new Date().toISOString()
  }

  // Log holdings info for debugging
  if (convertedMetadata.spotHoldings) {
    console.log(`💱 Holdings preserved: ${convertedMetadata.spotHoldings.length} holdings`)
    console.log(`💱 Holdings sample:`, convertedMetadata.spotHoldings.slice(0, 3).map(h => ({
      asset: h.asset,
      quantity: h.quantity,
      price: h.price,
      usdValue: h.usdValue,
      exchange: h.exchange
    })))
  } else {
    console.log('⚠️  No spotHoldings found in metadata')
  }

  console.log(`✅ All data converted from ${sourceCurrency} to USD`)
  console.log('💱 === CONVERSION COMPLETE ===\n')

  return {
    spotTrades: convertedSpotTrades,
    futuresIncome: convertedFuturesIncome,
    futuresPositions: convertedFuturesPositions,
    futuresTrades: data.futuresTrades || [], // Pass through if exists
    metadata: convertedMetadata
  }
}

/**
 * Get cache status (useful for debugging and monitoring)
 * @returns {Object} Cache status with age and validity info
 */
export function getRatesCacheStatus() {
  if (!ratesCache || !cacheTimestamp) {
    return {
      cached: false,
      message: 'No rates cached'
    }
  }

  const now = Date.now()
  const age = now - cacheTimestamp
  const remainingMs = CACHE_DURATION - age
  const remainingMinutes = Math.floor(remainingMs / 1000 / 60)
  const ageMinutes = Math.floor(age / 1000 / 60)

  return {
    cached: true,
    ageMinutes,
    remainingMinutes: Math.max(0, remainingMinutes),
    valid: age < CACHE_DURATION,
    expiresAt: new Date(cacheTimestamp + CACHE_DURATION).toISOString()
  }
}

/**
 * Clear the rates cache (useful for testing or forcing refresh)
 */
export function clearRatesCache() {
  ratesCache = null
  cacheTimestamp = null
  console.log('💱 Currency rates cache cleared')
}

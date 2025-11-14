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

// Cache for conversion results (memoization)
// Key format: `${amount}_${from}_${to}` -> converted amount
let conversionCache = new Map()
let currentCurrency = null // Track currency changes to clear cache

/**
 * Static fallback rates (last resort)
 */
const STATIC_FALLBACK_RATES = {
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

/**
 * Get cached rates synchronously (returns fallback if cache not ready)
 * @returns {Object} Rates object
 */
export function getCachedRatesSync() {
  if (ratesCache) {
    return ratesCache
  }
  // Return fallback rates if cache not ready
  return STATIC_FALLBACK_RATES
}

/**
 * Validate conversion result
 * @param {number} amount - Amount to validate
 * @param {string} from - Source currency
 * @param {string} to - Target currency
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateConversionResult(amount, from, to) {
  if (typeof amount !== 'number') {
    return { valid: false, error: `Invalid amount type: ${typeof amount}` }
  }
  
  if (isNaN(amount)) {
    return { valid: false, error: `Conversion resulted in NaN (${from} → ${to})` }
  }
  
  if (!isFinite(amount)) {
    return { valid: false, error: `Conversion resulted in Infinity (${from} → ${to})` }
  }
  
  // Negative amounts are valid (losses, fees, negative P&L)
  // Zero is valid
  
  return { valid: true }
}

/**
 * Convert amount from one currency to another (synchronous version using cache)
 * Validates result and handles errors gracefully
 * Uses memoization cache to avoid redundant conversions
 * @param {number} amount - Amount to convert
 * @param {string} from - Source currency code (e.g., 'USD')
 * @param {string} to - Target currency code (e.g., 'INR')
 * @returns {number|Object} Converted amount if successful, or { error: string, success: false } if failed
 */
export function convertCurrencySync(amount, from, to) {
  try {
    // Validate input
    if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) {
      const error = `Invalid input amount: ${amount}`
      console.error(`❌ Currency conversion error: ${error}`)
      return { success: false, error }
    }
    
    // No conversion needed if currencies are the same
    if (from === to) {
      return amount
    }

    // Check conversion cache first (memoization)
    const cacheKey = `${amount}_${from}_${to}`
    if (conversionCache.has(cacheKey)) {
      return conversionCache.get(cacheKey)
    }

    // Get cached rates (or fallback)
    const rates = getCachedRatesSync()
    
    if (!rates || typeof rates !== 'object') {
      const error = 'Currency rates not available'
      console.error(`❌ Currency conversion error: ${error}`)
      return { success: false, error }
    }

    // All rates are relative to USD (base currency)
    const fromRate = rates[from]
    const toRate = rates[to]
    
    // Check if rates exist, use static fallback if missing
    let effectiveFromRate = fromRate
    let effectiveToRate = toRate
    
    if (fromRate === undefined || fromRate === null) {
      const staticFromRate = STATIC_FALLBACK_RATES[from]
      if (staticFromRate !== undefined) {
        // Cache fallback usage to avoid repeated lookups
        if (!conversionCache.has(`fallback_${from}`)) {
          conversionCache.set(`fallback_${from}`, true)
        }
        effectiveFromRate = staticFromRate
      } else {
        const error = `Currency rate not found for ${from}`
        console.error(`❌ Currency conversion error: ${error}`)
        return { success: false, error }
      }
    }
    
    if (toRate === undefined || toRate === null) {
      const staticToRate = STATIC_FALLBACK_RATES[to]
      if (staticToRate !== undefined) {
        // Cache fallback usage to avoid repeated lookups
        if (!conversionCache.has(`fallback_${to}`)) {
          conversionCache.set(`fallback_${to}`, true)
        }
        effectiveToRate = staticToRate
      } else {
        const error = `Currency rate not found for ${to}`
        console.error(`❌ Currency conversion error: ${error}`)
        return { success: false, error }
      }
    }
    
    // Validate rates
    if (effectiveFromRate <= 0 || !isFinite(effectiveFromRate)) {
      const error = `Invalid rate for ${from}: ${effectiveFromRate}`
      console.error(`❌ Currency conversion error: ${error}`)
      return { success: false, error }
    }
    
    if (effectiveToRate <= 0 || !isFinite(effectiveToRate)) {
      const error = `Invalid rate for ${to}: ${effectiveToRate}`
      console.error(`❌ Currency conversion error: ${error}`)
      return { success: false, error }
    }

    // Convert: amount in FROM → USD → TO
    const usdAmount = amount / effectiveFromRate
    const convertedAmount = usdAmount * effectiveToRate

    // Validate result
    const validation = validateConversionResult(convertedAmount, from, to)
    if (!validation.valid) {
      console.error(`❌ Currency conversion validation failed: ${validation.error}`)
      return { success: false, error: validation.error }
    }

    // Cache the result (memoization)
    conversionCache.set(cacheKey, convertedAmount)
    
    // Limit cache size to prevent memory issues (keep last 1000 conversions)
    if (conversionCache.size > 1000) {
      const firstKey = conversionCache.keys().next().value
      conversionCache.delete(firstKey)
    }

    return convertedAmount
  } catch (error) {
    const errorMsg = `Unexpected error during conversion: ${error.message}`
    console.error(`❌ Currency conversion exception: ${errorMsg}`, error)
    return { success: false, error: errorMsg }
  }
}

/**
 * Fetch currency rates from backend
 * Uses cached rates if available and not expired
 * Returns rates with metadata about source and age
 */
export async function getCurrencyRates() {
  const now = Date.now()

  // Return cached rates if available and not expired
  if (ratesCache && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
    return ratesCache
  }

  try {
    const response = await fetch(API_ROUTE)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    // Handle error response from API
    if (!data.success) {
      console.error('⚠️ API returned error:', data.error)
      // Still try to use rates if available (might be static fallback)
      if (data.rates) {
        ratesCache = data.rates
        cacheTimestamp = now
        return data.rates
      }
      throw new Error(data.error || 'Failed to fetch rates')
    }

    if (data.rates) {
      ratesCache = data.rates
      cacheTimestamp = now
      return data.rates
    }

    throw new Error('Invalid response format: no rates')
  } catch (error) {
    console.error('⚠️ Failed to fetch exchange rates:', error.message)

    // Return static fallback rates if fetch fails
    ratesCache = STATIC_FALLBACK_RATES
    cacheTimestamp = now
    return STATIC_FALLBACK_RATES
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
    return metadata.primaryCurrency
  }

  // Check exchange-specific hints
  if (metadata.exchanges && metadata.exchanges.includes('coindcx')) {
    return 'INR'
  }

  // Default to USD for Binance and other exchanges
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
    return spotTrades
  }

  // Get conversion rate once (more efficient than per-trade)
  const rate = await convertCurrency(1, sourceCurrency, 'USD')

    // Convert all price-related fields
    const convertedTrades = spotTrades.map(trade => ({
      ...trade,
      price: String(parseFloat(trade.price || 0) * rate),
      quoteQty: String(parseFloat(trade.quoteQty || 0) * rate),
      commission: String(parseFloat(trade.commission || 0) * rate)
      // qty stays the same (it's the base asset quantity)
    }))

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
    return futuresIncome
  }

  // Get conversion rate once
  const rate = await convertCurrency(1, sourceCurrency, 'USD')

  // Convert income amounts
  const convertedIncome = futuresIncome.map(record => ({
    ...record,
    income: String(parseFloat(record.income || 0) * rate)
  }))

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
    return futuresPositions
  }

  // Get conversion rate once
  const rate = await convertCurrency(1, sourceCurrency, 'USD')

  // Convert position values
  const convertedPositions = futuresPositions.map(pos => ({
    ...pos,
    entryPrice: pos.entryPrice ? parseFloat(pos.entryPrice) * rate : 0,
    markPrice: pos.markPrice ? parseFloat(pos.markPrice) * rate : 0,
    liquidationPrice: pos.liquidationPrice ? parseFloat(pos.liquidationPrice) * rate : 0,
    unrealizedProfit: pos.unrealizedProfit ? parseFloat(pos.unrealizedProfit) * rate : 0,
    margin: pos.margin ? parseFloat(pos.margin) * rate : 0
  }))

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

  // Detect currency from metadata
  const sourceCurrency = detectCurrency(data.metadata)

  // If already in USD, return as-is
  if (sourceCurrency === 'USD') {
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
}

/**
 * Clear the conversion result cache
 * Should be called when currency changes to ensure fresh conversions
 */
export function clearConversionCache() {
  conversionCache.clear()
}

/**
 * Set current currency and clear conversion cache if currency changed
 * @param {string} currency - Current currency code
 */
export function setCurrency(currency) {
  if (currentCurrency !== currency) {
    clearConversionCache()
    currentCurrency = currency
  }
}

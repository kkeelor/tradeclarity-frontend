// app/analyze/utils/currencyFormatter.js
// Currency formatting utilities

/**
 * Format currency value based on the primary currency
 * @param {number} value - The numeric value to format
 * @param {string} currency - Currency code (USD, INR, etc.)
 * @param {boolean} short - Use short format (K, M) for large numbers
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value, currency = 'USD', short = false) {
  if (value === null || value === undefined || isNaN(value)) {
    return currency === 'INR' ? '₹0' : '$0'
  }

  const num = parseFloat(value)

  // Short format for large numbers
  if (short) {
    if (Math.abs(num) >= 10000000) {
      return formatCurrency(num / 10000000, currency) + ' Cr' // Crores for INR
    }
    if (Math.abs(num) >= 100000) {
      return formatCurrency(num / 100000, currency) + (currency === 'INR' ? ' L' : 'K') // Lakhs/Thousand
    }
    if (Math.abs(num) >= 1000) {
      return formatCurrency(num / 1000, currency) + 'K'
    }
  }

  // Currency symbols
  const symbols = {
    'USD': '$',
    'USDT': '$',
    'USDC': '$',
    'INR': '₹',
    'EUR': '€',
    'GBP': '£'
  }

  const symbol = symbols[currency] || '$'
  const decimals = Math.abs(num) < 1 ? 4 : 2

  // Format with commas
  const formatted = Math.abs(num).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  return `${num < 0 ? '-' : ''}${symbol}${formatted}`
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency = 'USD') {
  const symbols = {
    'USD': '$',
    'USDT': '$',
    'USDC': '$',
    'INR': '₹',
    'EUR': '€',
    'GBP': '£'
  }
  return symbols[currency] || '$'
}

/**
 * Live exchange rates (fetched from backend)
 * These are updated when the app loads
 */
let LIVE_USD_TO_INR = 87.86 // Default fallback (will be updated from backend)
let LIVE_INR_TO_USD = 1 / 87.86

/**
 * Update live exchange rates from backend
 * This should be called when fetching data from the backend
 */
export function updateExchangeRates(usdToInr) {
  if (usdToInr && usdToInr > 0) {
    LIVE_USD_TO_INR = usdToInr
    LIVE_INR_TO_USD = 1 / usdToInr
    console.log(`💱 Frontend exchange rates updated: 1 USD = ₹${LIVE_USD_TO_INR.toFixed(2)}`)
  }
}

/**
 * Convert INR to USD using live exchange rate
 */
export function convertINRtoUSD(inr) {
  return inr * LIVE_INR_TO_USD
}

/**
 * Convert USD to INR using live exchange rate
 */
export function convertUSDtoINR(usd) {
  return usd * LIVE_USD_TO_INR
}

/**
 * Parse trading symbol to extract quote currency
 * Examples:
 *   BTCUSDT → USDT
 *   BTCINR → INR
 *   ETHUSDT → USDT
 *   B-BTC_USDT (CoinDCX futures) → USDT
 */
export function parseSymbolQuoteCurrency(symbol) {
  if (!symbol) return 'USD'

  // CoinDCX futures format: B-BTC_USDT
  if (symbol.startsWith('B-')) {
    const parts = symbol.split('_')
    if (parts.length === 2) {
      return parts[1] // Return USDT, INR, etc.
    }
  }

  // Standard format: BTCUSDT, ETHUSDT, BTCINR
  const quoteCurrencies = ['USDT', 'USDC', 'BUSD', 'INR', 'USD', 'EUR', 'GBP', 'BTC', 'ETH', 'BNB']

  for (const currency of quoteCurrencies) {
    if (symbol.endsWith(currency)) {
      return currency
    }
  }

  // Default to USD if can't parse
  return 'USD'
}

/**
 * Parse trading symbol to extract base currency
 * Examples:
 *   BTCUSDT → BTC
 *   ETHINR → ETH
 *   B-BTC_USDT (CoinDCX futures) → BTC
 */
export function parseSymbolBaseCurrency(symbol) {
  if (!symbol) return ''

  // CoinDCX futures format: B-BTC_USDT
  if (symbol.startsWith('B-')) {
    const parts = symbol.split('_')
    if (parts.length === 2) {
      return parts[0].substring(2) // Remove 'B-' prefix, return BTC
    }
  }

  // Standard format: BTCUSDT, ETHUSDT, BTCINR
  const quoteCurrencies = ['USDT', 'USDC', 'BUSD', 'INR', 'USD', 'EUR', 'GBP', 'BTC', 'ETH', 'BNB']

  for (const currency of quoteCurrencies) {
    if (symbol.endsWith(currency)) {
      return symbol.slice(0, -currency.length)
    }
  }

  // Can't parse, return as-is
  return symbol
}

/**
 * Convert analytics values for display in selected currency
 * Backend returns everything in USD, this converts for display
 * @param {object} analytics - Analytics object with USD values
 * @param {string} targetCurrency - Target display currency (USD or INR)
 * @returns {object} Analytics with converted values
 */
export function convertAnalyticsForDisplay(analytics, targetCurrency) {
  if (!analytics || targetCurrency === 'USD') {
    // No conversion needed if displaying in USD (backend default)
    return analytics
  }

  if (targetCurrency !== 'INR') {
    // Only USD and INR are supported
    return analytics
  }

  // Helper to convert a value
  const convert = (value) => {
    if (value === null || value === undefined || isNaN(value)) return value
    return convertUSDtoINR(value)
  }

  // Whitelist of fields that contain MONETARY VALUES (should be converted)
  // These are dollar amounts, not percentages, counts, or ratios
  const MONETARY_FIELDS = new Set([
    // Top-level PnL and investment values
    'totalPnL', 'totalInvested', 'totalCommission',
    'avgWin', 'avgLoss', 'largestWin', 'largestLoss',

    // Spot-specific monetary values
    'spotPnL', 'spotInvested',

    // Futures-specific monetary values
    'futuresPnL', 'futuresRealizedPnL', 'futuresUnrealizedPnL',
    'futuresCommission', 'futuresFundingFees',

    // Per-symbol monetary values
    'pnl', 'realizedPnl', 'unrealizedPnl', 'invested',
    'avgProfit', 'avgLoss',

    // Time-based monetary values
    'profit', 'loss', 'netPnL',

    // Trade size monetary values
    'value', 'amount', 'total', 'quoteQty',

    // Income/fee monetary values
    'income', 'commission', 'fee', 'funding',

    // Portfolio values
    'totalPortfolioValue', 'totalSpotValue', 'totalFuturesValue',
    'usdValue', 'accountBalance',

    // Holdings values
    'price', 'marketValue'
  ])

  // Helper to check if a field name indicates a monetary value
  const isMonetaryField = (key) => {
    // Direct match
    if (MONETARY_FIELDS.has(key)) return true

    // Pattern matches for common monetary field patterns
    if (key.toLowerCase().includes('pnl')) return true
    if (key.toLowerCase().includes('profit')) return true
    if (key.toLowerCase().includes('loss')) return true
    if (key.toLowerCase().includes('commission')) return true
    if (key.toLowerCase().includes('fee')) return true
    if (key.toLowerCase().includes('funding')) return true
    if (key.toLowerCase().includes('value') && !key.toLowerCase().includes('rate')) return true
    if (key.toLowerCase().includes('invested')) return true
    if (key.toLowerCase().includes('amount')) return true
    if (key.toLowerCase().includes('price')) return true

    return false
  }

  // Helper to recursively convert ONLY monetary values in an object
  const convertObject = (obj, parentKey = '') => {
    if (!obj || typeof obj !== 'object') return obj

    const converted = Array.isArray(obj) ? [] : {}

    for (const key in obj) {
      const value = obj[key]

      if (typeof value === 'number') {
        // ONLY convert if this is a monetary field
        if (isMonetaryField(key)) {
          converted[key] = convert(value)
        } else {
          // Keep percentages, counts, ratios, scores unchanged
          converted[key] = value
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recursively convert nested objects
        converted[key] = convertObject(value, key)
      } else {
        // Keep other values as-is
        converted[key] = value
      }
    }

    return converted
  }

  // Convert the entire analytics object
  return convertObject(analytics)
}

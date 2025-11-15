// app/analyze/utils/symbolConverter.js
// PHASE 6 TASK 6.1: Symbol Format Conversion Utilities
// Converts trading symbols to instrument format for API compatibility

import { parseSymbolBaseCurrency, parseSymbolQuoteCurrency } from './currencyFormatter'

/**
 * Convert trading symbol to instrument format
 * Examples:
 *   "BTCUSDT" → "BTC-USD"
 *   "ETHUSDT" → "ETH-USD"
 *   "BTCINR" → "BTC-INR"
 *   "B-BTC_USDT" (CoinDCX futures) → "BTC-USD"
 * 
 * @param {string} symbol - Trading symbol (e.g., "BTCUSDT", "ETHUSDT")
 * @returns {string|null} Instrument format (e.g., "BTC-USD") or null if invalid
 */
export function convertSymbolToInstrument(symbol) {
  if (!symbol) return null
  
  const baseAsset = parseSymbolBaseCurrency(symbol)
  const quoteCurrency = parseSymbolQuoteCurrency(symbol)
  
  if (!baseAsset || !quoteCurrency) {
    return null
  }
  
  // Convert quote currency to USD format (USDT/USDC/BUSD → USD)
  const normalizedQuote = normalizeQuoteCurrency(quoteCurrency)
  
  return `${baseAsset}-${normalizedQuote}`
}

/**
 * Normalize quote currency to standard format
 * USDT, USDC, BUSD → USD (for API compatibility)
 * 
 * @param {string} quoteCurrency - Quote currency (USDT, USDC, BUSD, INR, etc.)
 * @returns {string} Normalized quote currency
 */
export function normalizeQuoteCurrency(quoteCurrency) {
  if (!quoteCurrency) return 'USD'
  
  // Map stablecoins to USD
  const stablecoinMap = {
    'USDT': 'USD',
    'USDC': 'USD',
    'BUSD': 'USD',
    'TUSD': 'USD',
    'DAI': 'USD'
  }
  
  return stablecoinMap[quoteCurrency.toUpperCase()] || quoteCurrency.toUpperCase()
}

/**
 * Convert instrument format back to trading symbol (reverse conversion)
 * Examples:
 *   "BTC-USD" → "BTCUSDT" (or "BTCUSD" depending on exchange)
 *   "ETH-USD" → "ETHUSDT"
 * 
 * @param {string} instrument - Instrument format (e.g., "BTC-USD")
 * @param {string} preferredQuote - Preferred quote currency (default: "USDT")
 * @returns {string} Trading symbol format
 */
export function convertInstrumentToSymbol(instrument, preferredQuote = 'USDT') {
  if (!instrument) return null
  
  const parts = instrument.split('-')
  if (parts.length !== 2) {
    return instrument // Return as-is if not in expected format
  }
  
  const [baseAsset, quoteCurrency] = parts
  
  // Convert USD back to preferred stablecoin if needed
  const actualQuote = quoteCurrency === 'USD' ? preferredQuote : quoteCurrency
  
  return `${baseAsset}${actualQuote}`
}

/**
 * Match trade symbol to instrument
 * Checks if a trade symbol matches a given instrument (with normalization)
 * 
 * @param {string} tradeSymbol - Trade symbol (e.g., "BTCUSDT")
 * @param {string} instrument - Instrument format (e.g., "BTC-USD")
 * @returns {boolean} True if symbols match
 */
export function matchSymbolToInstrument(tradeSymbol, instrument) {
  if (!tradeSymbol || !instrument) return false
  
  const convertedSymbol = convertSymbolToInstrument(tradeSymbol)
  if (!convertedSymbol) return false
  
  // Exact match
  if (convertedSymbol === instrument) {
    return true
  }
  
  // Match by base asset only (if quote currency differs but base matches)
  const symbolBase = convertedSymbol.split('-')[0]
  const instrumentBase = instrument.split('-')[0]
  
  return symbolBase === instrumentBase
}

/**
 * Get all instruments from trade symbols
 * Extracts unique instruments from an array of trade symbols
 * 
 * @param {string[]} symbols - Array of trading symbols
 * @returns {string[]} Array of unique instrument formats
 */
export function extractInstrumentsFromSymbols(symbols) {
  if (!symbols || !Array.isArray(symbols)) {
    return []
  }
  
  const instruments = new Set()
  
  symbols.forEach(symbol => {
    const instrument = convertSymbolToInstrument(symbol)
    if (instrument) {
      instruments.add(instrument)
    }
  })
  
  return Array.from(instruments).sort()
}

/**
 * Filter trades by instrument
 * Filters an array of trades to only include those matching the given instrument
 * 
 * @param {Array} trades - Array of trade objects with 'symbol' property
 * @param {string} instrument - Instrument format to match (e.g., "BTC-USD")
 * @returns {Array} Filtered trades
 */
export function filterTradesByInstrument(trades, instrument) {
  if (!trades || !Array.isArray(trades) || !instrument) {
    return []
  }
  
  return trades.filter(trade => {
    if (!trade.symbol) return false
    return matchSymbolToInstrument(trade.symbol, instrument)
  })
}

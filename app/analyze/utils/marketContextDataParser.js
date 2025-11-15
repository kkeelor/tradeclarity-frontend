// app/analyze/utils/marketContextDataParser.js
// PHASE 1 TASK 1.2: Data structure utilities for market context API responses
// Handles normalization, validation, and extraction of market data

/**
 * @typedef {Object} PriceDataPoint
 * @property {number} timestamp - Unix timestamp in milliseconds
 * @property {number} value - Price value
 * @property {string} [date] - ISO date string
 */

/**
 * @typedef {Object} PriceData
 * @property {Object.<string, PriceDataPoint|PriceDataPoint[]>} data - Price data by instrument
 */

/**
 * @typedef {Object} ComprehensiveContext
 * @property {PriceData} [price] - Price data
 * @property {Object} [volume] - Volume data
 * @property {Object} [newsSentiment] - News sentiment data
 * @property {Object} [economic] - Economic indicators data
 */

/**
 * Normalize price data to consistent array format
 * Handles both single point objects and arrays
 * @param {Object} priceData - Raw price data from API
 * @param {string} instrument - Instrument identifier (e.g., 'BTC-USD')
 * @returns {PriceDataPoint[]} Normalized array of price data points
 */
export function normalizePriceData(priceData, instrument) {
  if (!priceData || !priceData.data || !instrument) {
    return []
  }

  const instrumentData = priceData.data[instrument]
  if (!instrumentData) {
    return []
  }

  // If it's already an array, normalize each point
  if (Array.isArray(instrumentData)) {
    return instrumentData.map(point => ({
      timestamp: point.timestamp 
        ? (typeof point.timestamp === 'string' ? new Date(point.timestamp).getTime() : point.timestamp)
        : Date.now(),
      value: parseFloat(point.value || point.price || 0),
      date: point.date || new Date(point.timestamp || Date.now()).toISOString().split('T')[0]
    }))
  }

  // If it's a single object, convert to array
  if (typeof instrumentData === 'object' && instrumentData !== null) {
    const timestamp = instrumentData.timestamp 
      ? (typeof instrumentData.timestamp === 'string' 
          ? new Date(instrumentData.timestamp).getTime() 
          : instrumentData.timestamp)
      : Date.now()
    
    return [{
      timestamp,
      value: parseFloat(instrumentData.value || instrumentData.price || 0),
      date: instrumentData.date || new Date(timestamp).toISOString().split('T')[0]
    }]
  }

  return []
}

/**
 * Extract historical price timeline for a date range
 * @param {Object} priceData - Raw price data from API
 * @param {string} instrument - Instrument identifier
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @returns {PriceDataPoint[]} Filtered price data points within date range
 */
export function extractHistoricalPriceTimeline(priceData, instrument, startDate, endDate) {
  const normalized = normalizePriceData(priceData, instrument)
  if (normalized.length === 0) {
    return []
  }

  const startTime = new Date(startDate).getTime()
  const endTime = new Date(endDate).getTime()

  return normalized.filter(point => {
    return point.timestamp >= startTime && point.timestamp <= endTime
  }).sort((a, b) => a.timestamp - b.timestamp)
}

/**
 * Validate API response structure
 * @param {Object} response - API response object
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
export function validateApiResponse(response) {
  const errors = []
  const warnings = []

  if (!response) {
    errors.push('Response is null or undefined')
    return { valid: false, errors, warnings }
  }

  if (!response.success) {
    errors.push('Response success flag is false')
  }

  if (!response.context) {
    errors.push('Response missing context object')
    return { valid: false, errors, warnings }
  }

  const context = response.context

  // Validate price data structure
  if (context.price) {
    if (!context.price.data || typeof context.price.data !== 'object') {
      warnings.push('Price data exists but data property is missing or invalid')
    }
  } else {
    warnings.push('No price data in response')
  }

  // Validate sentiment data structure
  if (context.newsSentiment) {
    if (!Array.isArray(context.newsSentiment.articles)) {
      warnings.push('News sentiment articles is not an array')
    }
  }

  // Validate economic indicators structure
  if (context.economic) {
    if (!context.economic.indicators || typeof context.economic.indicators !== 'object') {
      warnings.push('Economic indicators structure is invalid')
    }
  }

  // Check for volume data (may not exist)
  if (!context.volume) {
    warnings.push('No volume data in response (may be expected)')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * PHASE 4 TASK 4.1: Validate price data structure
 * @param {Object} priceData - Price data object
 * @param {string} instrument - Instrument identifier
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
export function validatePriceData(priceData, instrument) {
  const errors = []
  const warnings = []

  if (!priceData) {
    errors.push('Price data is null or undefined')
    return { valid: false, errors, warnings }
  }

  if (!priceData.data || typeof priceData.data !== 'object') {
    errors.push('Price data missing data property')
    return { valid: false, errors, warnings }
  }

  if (instrument && !priceData.data[instrument]) {
    warnings.push(`No price data for instrument: ${instrument}`)
  }

  // Validate instrument data structure if it exists
  if (instrument && priceData.data[instrument]) {
    const instrumentData = priceData.data[instrument]
    const isArray = Array.isArray(instrumentData)
    const isObject = typeof instrumentData === 'object' && !Array.isArray(instrumentData)

    if (!isArray && !isObject) {
      errors.push(`Invalid price data format for ${instrument}: expected array or object`)
    }

    if (isArray && instrumentData.length > 0) {
      // Validate array elements
      instrumentData.forEach((point, index) => {
        if (!point.value && point.value !== 0) {
          warnings.push(`Price point ${index} missing value`)
        }
        if (!point.timestamp && !point.date && !point.time) {
          warnings.push(`Price point ${index} missing timestamp`)
        }
      })
    } else if (isObject) {
      // Validate single object
      if (!instrumentData.value && instrumentData.value !== 0) {
        warnings.push(`Price data for ${instrument} missing value`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * PHASE 4 TASK 4.1: Validate sentiment data structure
 * @param {Object} sentimentData - Sentiment data object
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
export function validateSentimentData(sentimentData) {
  const errors = []
  const warnings = []

  if (!sentimentData) {
    warnings.push('Sentiment data is null or undefined (may be expected)')
    return { valid: true, errors, warnings }
  }

  if (!sentimentData.articles) {
    warnings.push('Sentiment data missing articles array')
    return { valid: true, errors, warnings }
  }

  if (!Array.isArray(sentimentData.articles)) {
    errors.push('Sentiment articles is not an array')
    return { valid: false, errors, warnings }
  }

  // Validate article structure
  sentimentData.articles.forEach((article, index) => {
    if (!article.title && !article.headline) {
      warnings.push(`Article ${index} missing title`)
    }
    if (article.overall_sentiment_score === undefined && article.sentiment_score === undefined) {
      warnings.push(`Article ${index} missing sentiment score`)
    }
    if (!article.time_published && !article.date && !article.published_at) {
      warnings.push(`Article ${index} missing publication date`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * PHASE 4 TASK 4.1: Validate economic indicators structure
 * @param {Object} economicData - Economic indicators data object
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
export function validateEconomicData(economicData) {
  const errors = []
  const warnings = []

  if (!economicData) {
    warnings.push('Economic data is null or undefined (may be expected)')
    return { valid: true, errors, warnings }
  }

  if (!economicData.indicators || typeof economicData.indicators !== 'object') {
    errors.push('Economic data missing indicators object')
    return { valid: false, errors, warnings }
  }

  // Validate each indicator
  Object.entries(economicData.indicators).forEach(([key, indicator]) => {
    if (!indicator.value && indicator.value !== 0) {
      warnings.push(`Indicator ${key} missing value`)
    }
    if (!indicator.date && !indicator.timestamp) {
      warnings.push(`Indicator ${key} missing date`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * PHASE 4 TASK 4.1: Validate volume data structure
 * @param {Object} volumeData - Volume data object
 * @param {string} instrument - Instrument identifier
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
export function validateVolumeData(volumeData, instrument) {
  const errors = []
  const warnings = []

  if (!volumeData) {
    warnings.push('Volume data is null or undefined (may be expected)')
    return { valid: true, errors, warnings }
  }

  if (!volumeData.data || typeof volumeData.data !== 'object') {
    warnings.push('Volume data missing data property')
    return { valid: true, errors, warnings }
  }

  if (instrument && !volumeData.data[instrument]) {
    warnings.push(`No volume data for instrument: ${instrument}`)
  }

  // Validate instrument volume data structure if it exists
  if (instrument && volumeData.data[instrument]) {
    const instrumentVolumeData = volumeData.data[instrument]
    const isArray = Array.isArray(instrumentVolumeData)
    const isObject = typeof instrumentVolumeData === 'object' && !Array.isArray(instrumentVolumeData)

    if (!isArray && !isObject) {
      warnings.push(`Invalid volume data format for ${instrument}: expected array or object`)
    }

    if (isArray && instrumentVolumeData.length > 0) {
      instrumentVolumeData.forEach((point, index) => {
        if (!point.volume && point.volume !== 0 && !point.value && point.value !== 0) {
          warnings.push(`Volume point ${index} missing volume value`)
        }
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Handle missing data gracefully
 * @param {Object} context - Comprehensive context object
 * @param {string} dataType - Type of data ('price', 'volume', 'sentiment', 'economic')
 * @param {string} [instrument] - Optional instrument identifier
 * @returns {Object|null} Data or null if missing
 */
export function getDataSafely(context, dataType, instrument = null) {
  if (!context) {
    return null
  }

  switch (dataType) {
    case 'price':
      if (!context.price || !context.price.data) {
        return null
      }
      if (instrument) {
        return context.price.data[instrument] || null
      }
      return context.price.data

    case 'volume':
      if (!context.volume) {
        return null
      }
      if (instrument && context.volume.data) {
        return context.volume.data[instrument] || null
      }
      return context.volume

    case 'sentiment':
      return context.newsSentiment || null

    case 'economic':
      return context.economic || null

    default:
      return null
  }
}

/**
 * Check if price data is historical (array) or current (single point)
 * @param {Object} priceData - Raw price data from API
 * @param {string} instrument - Instrument identifier
 * @returns {{isHistorical: boolean, isCurrent: boolean, dataPointCount: number}}
 */
export function analyzePriceDataType(priceData, instrument) {
  if (!priceData || !priceData.data || !instrument) {
    return { isHistorical: false, isCurrent: false, dataPointCount: 0 }
  }

  const instrumentData = priceData.data[instrument]
  if (!instrumentData) {
    return { isHistorical: false, isCurrent: false, dataPointCount: 0 }
  }

  const isArray = Array.isArray(instrumentData)
  const isObject = typeof instrumentData === 'object' && !Array.isArray(instrumentData) && instrumentData !== null

  return {
    isHistorical: isArray,
    isCurrent: isObject,
    dataPointCount: isArray ? instrumentData.length : (isObject ? 1 : 0)
  }
}

/**
 * Extract all available instruments from price data
 * @param {Object} priceData - Raw price data from API
 * @returns {string[]} Array of instrument identifiers
 */
export function extractInstruments(priceData) {
  if (!priceData || !priceData.data) {
    return []
  }

  return Object.keys(priceData.data)
}

/**
 * Get latest price point from price data
 * @param {Object} priceData - Raw price data from API
 * @param {string} instrument - Instrument identifier
 * @returns {PriceDataPoint|null} Latest price point or null
 */
export function getLatestPrice(priceData, instrument) {
  const normalized = normalizePriceData(priceData, instrument)
  if (normalized.length === 0) {
    return null
  }

  // Sort by timestamp descending and return first (latest)
  return normalized.sort((a, b) => b.timestamp - a.timestamp)[0]
}

/**
 * Get price at specific timestamp (or closest)
 * @param {Object} priceData - Raw price data from API
 * @param {string} instrument - Instrument identifier
 * @param {number} targetTimestamp - Target timestamp in milliseconds
 * @param {number} [toleranceMs=3600000] - Tolerance in milliseconds (default 1 hour)
 * @returns {PriceDataPoint|null} Price point or null if not found within tolerance
 */
export function getPriceAtTimestamp(priceData, instrument, targetTimestamp, toleranceMs = 3600000) {
  const normalized = normalizePriceData(priceData, instrument)
  if (normalized.length === 0) {
    return null
  }

  // Find closest point within tolerance
  let closest = null
  let minDiff = Infinity

  for (const point of normalized) {
    const diff = Math.abs(point.timestamp - targetTimestamp)
    if (diff <= toleranceMs && diff < minDiff) {
      minDiff = diff
      closest = point
    }
  }

  return closest
}

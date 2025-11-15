// app/analyze/utils/marketDataNormalizer.js
// PHASE 5 TASK 5.1: Data Normalization Layer
// Normalizes API responses to consistent format across all components

import {
  normalizePriceData,
  extractHistoricalPriceTimeline,
  getDataSafely
} from './marketContextDataParser'

/**
 * @typedef {Object} NormalizedPriceTimeline
 * @property {number} timestamp - Unix timestamp in milliseconds
 * @property {string} date - ISO date string (YYYY-MM-DD)
 * @property {number} value - Price value
 */

/**
 * @typedef {Object} NormalizedSentimentTimeline
 * @property {number} timestamp - Unix timestamp in milliseconds
 * @property {string} date - ISO date string (YYYY-MM-DD)
 * @property {number} sentiment - Average sentiment score (-1 to 1)
 * @property {number} articleCount - Number of articles contributing to this point
 */

/**
 * @typedef {Object} NormalizedEconomicTimeline
 * @property {number} timestamp - Unix timestamp in milliseconds
 * @property {string} date - ISO date string (YYYY-MM-DD)
 * @property {Object.<string, number>} indicators - Indicator values by key
 */

/**
 * PHASE 5 TASK 5.1: Normalize comprehensive context to unified format
 * @param {Object} context - Raw comprehensive context from API
 * @param {string} instrument - Instrument identifier
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @returns {Object} Normalized context with consistent data structures
 */
export function normalizeComprehensiveContext(context, instrument, startDate, endDate) {
  if (!context) {
    return null
  }

  return {
    price: normalizePriceTimeline(context.price, instrument, startDate, endDate),
    volume: normalizeVolumeTimeline(context.volume, instrument, startDate, endDate),
    sentiment: normalizeSentimentTimeline(context.newsSentiment, startDate, endDate),
    economic: normalizeEconomicTimeline(context.economic, startDate, endDate),
    metadata: {
      instrument,
      startDate,
      endDate,
      normalizedAt: new Date().toISOString()
    }
  }
}

/**
 * PHASE 5 TASK 5.1: Normalize price data to continuous timeline format
 * @param {Object} priceData - Raw price data from API
 * @param {string} instrument - Instrument identifier
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @returns {NormalizedPriceTimeline[]} Normalized price timeline
 */
export function normalizePriceTimeline(priceData, instrument, startDate, endDate) {
  if (!priceData || !instrument) {
    return []
  }

  // Use existing parser utility
  const timeline = extractHistoricalPriceTimeline(priceData, instrument, startDate, endDate)
  
  // If no historical data, fall back to normalized data
  if (timeline.length === 0) {
    const normalized = normalizePriceData(priceData, instrument)
    return normalized.map(point => ({
      timestamp: point.timestamp,
      date: point.date || new Date(point.timestamp).toISOString().split('T')[0],
      value: point.value
    }))
  }

  return timeline.map(point => ({
    timestamp: point.timestamp,
    date: point.date || new Date(point.timestamp).toISOString().split('T')[0],
    value: point.value
  }))
}

/**
 * PHASE 5 TASK 5.1: Normalize sentiment data to continuous timeline format
 * @param {Object} sentimentData - Raw sentiment data from API
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @returns {NormalizedSentimentTimeline[]} Normalized sentiment timeline
 */
export function normalizeSentimentTimeline(sentimentData, startDate, endDate) {
  if (!sentimentData || !sentimentData.articles || !Array.isArray(sentimentData.articles)) {
    return []
  }

  const startTime = new Date(startDate).getTime()
  const endTime = new Date(endDate).getTime()

  // Group articles by date
  const dateMap = new Map()
  
  sentimentData.articles.forEach(article => {
    const articleDate = new Date(article.time_published || article.date || article.published_at || Date.now())
    const articleTime = articleDate.getTime()
    
    // Filter by date range
    if (articleTime < startTime || articleTime > endTime) {
      return
    }

    const dateKey = articleDate.toISOString().split('T')[0]
    
    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, {
        timestamp: articleTime,
        date: dateKey,
        sentiments: [],
        articles: []
      })
    }
    
    const point = dateMap.get(dateKey)
    const sentimentScore = parseFloat(article.overall_sentiment_score || article.sentiment_score || 0)
    point.sentiments.push(sentimentScore)
    point.articles.push(article)
  })

  // Calculate average sentiment per day
  return Array.from(dateMap.values())
    .map(point => ({
      timestamp: point.timestamp,
      date: point.date,
      sentiment: point.sentiments.length > 0
        ? point.sentiments.reduce((sum, s) => sum + s, 0) / point.sentiments.length
        : 0,
      articleCount: point.articles.length
    }))
    .sort((a, b) => a.timestamp - b.timestamp)
}

/**
 * PHASE 5 TASK 5.1: Normalize volume data to timeline format
 * @param {Object} volumeData - Raw volume data from API
 * @param {string} instrument - Instrument identifier
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @returns {Array} Normalized volume timeline
 */
export function normalizeVolumeTimeline(volumeData, instrument, startDate, endDate) {
  if (!volumeData || !volumeData.data || !instrument) {
    return []
  }

  const instrumentVolumeData = volumeData.data[instrument]
  if (!instrumentVolumeData) {
    return []
  }

  const startTime = new Date(startDate).getTime()
  const endTime = new Date(endDate).getTime()

  // Handle both array and single object formats
  const volumeArray = Array.isArray(instrumentVolumeData) 
    ? instrumentVolumeData 
    : [instrumentVolumeData]

  return volumeArray
    .filter(point => {
      const pointDate = new Date(point.timestamp || point.date || point.time || Date.now())
      const pointTime = pointDate.getTime()
      return pointTime >= startTime && pointTime <= endTime
    })
    .map(point => ({
      timestamp: new Date(point.timestamp || point.time || point.date).getTime(),
      date: point.date || new Date(point.timestamp || point.time || point.date).toISOString().split('T')[0],
      volume: parseFloat(point.volume || point.value || 0),
      topTierVolume: parseFloat(point.topTierVolume || point.topTier || point.volume * 0.7 || 0),
      directVolume: parseFloat(point.directVolume || point.direct || point.volume * 0.3 || 0)
    }))
    .sort((a, b) => a.timestamp - b.timestamp)
}

/**
 * PHASE 5 TASK 5.1: Normalize economic indicators to timeline format
 * @param {Object} economicData - Raw economic indicators data
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @returns {NormalizedEconomicTimeline[]} Normalized economic indicators timeline
 */
export function normalizeEconomicTimeline(economicData, startDate, endDate) {
  if (!economicData || !economicData.indicators) {
    return []
  }

  const startTime = new Date(startDate).getTime()
  const endTime = new Date(endDate).getTime()

  const timelineMap = new Map()

  // Process each indicator
  Object.entries(economicData.indicators).forEach(([key, indicator]) => {
    // Check if indicator has timeline/observations array
    if (indicator.timeline && Array.isArray(indicator.timeline)) {
      indicator.timeline.forEach(point => {
        const pointDate = new Date(point.date || point.timestamp || point.time)
        const pointTime = pointDate.getTime()
        
        if (pointTime >= startTime && pointTime <= endTime) {
          const dateKey = pointDate.toISOString().split('T')[0]
          
          if (!timelineMap.has(dateKey)) {
            timelineMap.set(dateKey, {
              timestamp: pointTime,
              date: dateKey,
              indicators: {}
            })
          }
          
          timelineMap.get(dateKey).indicators[key] = parseFloat(point.value || 0)
        }
      })
    } else if (indicator.observations && Array.isArray(indicator.observations)) {
      // FRED API format
      indicator.observations.forEach(obs => {
        if (obs.value === null || obs.value === undefined) return
        
        const obsDate = new Date(obs.date || obs.timestamp)
        const obsTime = obsDate.getTime()
        
        if (obsTime >= startTime && obsTime <= endTime) {
          const dateKey = obsDate.toISOString().split('T')[0]
          
          if (!timelineMap.has(dateKey)) {
            timelineMap.set(dateKey, {
              timestamp: obsTime,
              date: dateKey,
              indicators: {}
            })
          }
          
          timelineMap.get(dateKey).indicators[key] = parseFloat(obs.value || 0)
        }
      })
    } else {
      // Single value - use current date
      const indicatorDate = new Date(indicator.date || Date.now())
      const indicatorTime = indicatorDate.getTime()
      
      if (indicatorTime >= startTime && indicatorTime <= endTime) {
        const dateKey = indicatorDate.toISOString().split('T')[0]
        
        if (!timelineMap.has(dateKey)) {
          timelineMap.set(dateKey, {
            timestamp: indicatorTime,
            date: dateKey,
            indicators: {}
          })
        }
        
        timelineMap.get(dateKey).indicators[key] = parseFloat(indicator.value || 0)
      }
    }
  })

  return Array.from(timelineMap.values())
    .sort((a, b) => a.timestamp - b.timestamp)
}

/**
 * PHASE 5 TASK 5.2: Merge multiple data sources into unified timeline
 * Aligns data from different sources by timestamp
 * @param {Object} normalizedData - Normalized data from normalizeComprehensiveContext
 * @param {string} interval - Time interval ('hour', 'day', 'week')
 * @returns {Array} Unified timeline with all data sources aligned
 */
export function createUnifiedTimeline(normalizedData, interval = 'day') {
  if (!normalizedData) {
    return []
  }

  const { price, volume, sentiment, economic } = normalizedData
  
  // Collect all unique timestamps
  const timestampSet = new Set()
  
  price.forEach(p => timestampSet.add(p.timestamp))
  volume.forEach(v => timestampSet.add(v.timestamp))
  sentiment.forEach(s => timestampSet.add(s.timestamp))
  economic.forEach(e => timestampSet.add(e.timestamp))
  
  const timestamps = Array.from(timestampSet).sort((a, b) => a - b)
  
  // Create interval buckets based on interval type
  const intervalMs = {
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000
  }[interval] || 24 * 60 * 60 * 1000

  // Group timestamps into intervals
  const intervalMap = new Map()
  
  timestamps.forEach(timestamp => {
    const intervalKey = Math.floor(timestamp / intervalMs) * intervalMs
    
    if (!intervalMap.has(intervalKey)) {
      intervalMap.set(intervalKey, {
        timestamp: intervalKey,
        date: new Date(intervalKey).toISOString().split('T')[0],
        price: null,
        volume: null,
        sentiment: null,
        economic: {}
      })
    }
  })

  // Fill in price data
  price.forEach(point => {
    const intervalKey = Math.floor(point.timestamp / intervalMs) * intervalMs
    const bucket = intervalMap.get(intervalKey)
    if (bucket) {
      // Use latest price in interval
      if (!bucket.price || point.timestamp > bucket.timestamp) {
        bucket.price = point.value
      }
    }
  })

  // Fill in volume data
  volume.forEach(point => {
    const intervalKey = Math.floor(point.timestamp / intervalMs) * intervalMs
    const bucket = intervalMap.get(intervalKey)
    if (bucket) {
      bucket.volume = point.volume
      bucket.topTierVolume = point.topTierVolume
      bucket.directVolume = point.directVolume
    }
  })

  // Fill in sentiment data (average within interval)
  sentiment.forEach(point => {
    const intervalKey = Math.floor(point.timestamp / intervalMs) * intervalMs
    const bucket = intervalMap.get(intervalKey)
    if (bucket) {
      if (bucket.sentiment === null) {
        bucket.sentiment = point.sentiment
        bucket.sentimentArticleCount = point.articleCount
      } else {
        // Average sentiment within interval
        const totalSentiment = bucket.sentiment * bucket.sentimentArticleCount + point.sentiment * point.articleCount
        const totalArticles = bucket.sentimentArticleCount + point.articleCount
        bucket.sentiment = totalArticles > 0 ? totalSentiment / totalArticles : bucket.sentiment
        bucket.sentimentArticleCount = totalArticles
      }
    }
  })

  // Fill in economic indicators
  economic.forEach(point => {
    const intervalKey = Math.floor(point.timestamp / intervalMs) * intervalMs
    const bucket = intervalMap.get(intervalKey)
    if (bucket) {
      Object.assign(bucket.economic, point.indicators)
    }
  })

  return Array.from(intervalMap.values())
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(point => ({
      ...point,
      time: new Date(point.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }))
}

/**
 * PHASE 5 TASK 5.2: Interpolate missing data points (optional)
 * Fills gaps in timeline with interpolated values
 * @param {Array} timeline - Timeline data array
 * @param {string} field - Field to interpolate ('price', 'volume', 'sentiment')
 * @returns {Array} Timeline with interpolated values
 */
export function interpolateTimeline(timeline, field) {
  if (!timeline || timeline.length === 0) {
    return timeline
  }

  const interpolated = [...timeline]
  
  for (let i = 1; i < interpolated.length; i++) {
    const prev = interpolated[i - 1]
    const curr = interpolated[i]
    
    // Check if there's a gap (more than 2 intervals)
    const timeDiff = curr.timestamp - prev.timestamp
    const avgInterval = (interpolated[interpolated.length - 1].timestamp - interpolated[0].timestamp) / (interpolated.length - 1)
    
    if (timeDiff > avgInterval * 2 && prev[field] !== null && curr[field] !== null) {
      // Interpolate missing points
      const steps = Math.floor(timeDiff / avgInterval) - 1
      const stepSize = (curr[field] - prev[field]) / (steps + 1)
      
      for (let j = 1; j <= steps; j++) {
        const interpolatedTimestamp = prev.timestamp + (timeDiff * j / (steps + 1))
        interpolated.splice(i + j - 1, 0, {
          timestamp: interpolatedTimestamp,
          date: new Date(interpolatedTimestamp).toISOString().split('T')[0],
          [field]: prev[field] + (stepSize * j),
          _interpolated: true
        })
      }
    }
  }
  
  return interpolated.sort((a, b) => a.timestamp - b.timestamp)
}

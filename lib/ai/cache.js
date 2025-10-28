// lib/ai/cache.js
/**
 * Generic AI Response Caching System
 *
 * Caches AI responses to reduce API calls and costs.
 * Supports different cache strategies and TTLs per use case.
 */

// In-memory cache store
const cacheStore = new Map()

/**
 * Cache strategies for different use cases
 */
export const CACHE_STRATEGIES = {
  // CSV column detection - cache by header fingerprint
  CSV_DETECTION: {
    ttl: 60 * 60 * 1000, // 1 hour
    keyGenerator: (headers) => createFingerprint(headers),
    enabled: true
  },

  // Trading insights - cache per user per day
  INSIGHTS: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    keyGenerator: (userId, date) => `insights:${userId}:${date}`,
    enabled: true
  },

  // Pattern analysis - cache by pattern + metrics
  PATTERN_ANALYSIS: {
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
    keyGenerator: (pattern) => `pattern:${pattern.name}:${pattern.severity}`,
    enabled: true
  },

  // Report summaries - cache by analytics hash
  REPORT_SUMMARY: {
    ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
    keyGenerator: (analytics) => `report:${hashObject(analytics)}`,
    enabled: true
  },

  // Q&A - no caching (user-specific questions)
  QUESTION_ANSWER: {
    ttl: 0,
    keyGenerator: null,
    enabled: false
  }
}

/**
 * Get cached response if available
 *
 * @param {string} strategy - Cache strategy name
 * @param {*} params - Parameters for key generation
 * @returns {*|null} Cached value or null
 */
export function getCached(strategy, ...params) {
  const config = CACHE_STRATEGIES[strategy]

  if (!config || !config.enabled) {
    return null
  }

  const key = config.keyGenerator(...params)
  const cached = cacheStore.get(key)

  if (!cached) {
    return null
  }

  // Check if expired
  if (Date.now() - cached.timestamp > config.ttl) {
    cacheStore.delete(key)
    return null
  }

  console.log(`[AI Cache] HIT for ${strategy}:`, key.substring(0, 50))
  return cached.value
}

/**
 * Set cache value
 *
 * @param {string} strategy - Cache strategy name
 * @param {*} value - Value to cache
 * @param {*} params - Parameters for key generation
 */
export function setCached(strategy, value, ...params) {
  const config = CACHE_STRATEGIES[strategy]

  if (!config || !config.enabled) {
    return
  }

  const key = config.keyGenerator(...params)

  cacheStore.set(key, {
    value,
    timestamp: Date.now()
  })

  console.log(`[AI Cache] SET for ${strategy}:`, key.substring(0, 50))
}

/**
 * Clear cache for a specific strategy or all
 *
 * @param {string|null} strategy - Strategy to clear, or null for all
 */
export function clearCache(strategy = null) {
  if (strategy) {
    // Clear specific strategy
    const prefix = strategy.toLowerCase()
    const keysToDelete = []

    for (const [key] of cacheStore) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => cacheStore.delete(key))
    console.log(`[AI Cache] Cleared ${keysToDelete.length} entries for ${strategy}`)
  } else {
    // Clear all
    const count = cacheStore.size
    cacheStore.clear()
    console.log(`[AI Cache] Cleared all ${count} entries`)
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const stats = {
    totalEntries: cacheStore.size,
    byStrategy: {},
    totalSizeMB: 0
  }

  for (const [key, value] of cacheStore) {
    const strategy = key.split(':')[0]
    stats.byStrategy[strategy] = (stats.byStrategy[strategy] || 0) + 1

    // Rough size estimation
    const size = JSON.stringify(value).length
    stats.totalSizeMB += size / (1024 * 1024)
  }

  stats.totalSizeMB = stats.totalSizeMB.toFixed(2)

  return stats
}

/**
 * Automatic cache cleanup (removes expired entries)
 */
export function cleanupExpiredCache() {
  const now = Date.now()
  let removed = 0

  for (const [key, value] of cacheStore) {
    // Extract strategy from key
    const strategy = key.split(':')[0].toUpperCase()
    const config = CACHE_STRATEGIES[strategy]

    if (config && now - value.timestamp > config.ttl) {
      cacheStore.delete(key)
      removed++
    }
  }

  if (removed > 0) {
    console.log(`[AI Cache] Cleaned up ${removed} expired entries`)
  }

  return removed
}

// Run cleanup every hour
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredCache, 60 * 60 * 1000)
}

/**
 * Create fingerprint from array of strings (case-insensitive, sorted)
 */
function createFingerprint(items) {
  return items
    .map(item => item.trim().toLowerCase())
    .sort()
    .join('|')
}

/**
 * Create hash from object (for cache keys)
 */
function hashObject(obj) {
  const str = JSON.stringify(obj, Object.keys(obj).sort())
  let hash = 0

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36)
}

/**
 * Memoize AI function calls (decorator pattern)
 *
 * Usage:
 * const cachedDetect = memoizeAI('CSV_DETECTION', detectColumnsFunction)
 */
export function memoizeAI(strategy, fn) {
  return async (...args) => {
    const cached = getCached(strategy, ...args)

    if (cached !== null) {
      return cached
    }

    const result = await fn(...args)

    setCached(strategy, result, ...args)

    return result
  }
}

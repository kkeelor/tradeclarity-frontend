// lib/ai/mcpAnalytics.js
/**
 * MCP Analytics Functions
 * 
 * Provides analytics queries for MCP usage, cache performance, and errors
 * Used by dashboard and monitoring systems
 */

import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Get Supabase admin client for analytics queries
 */
function getSupabaseClient() {
  try {
    return createAdminClient()
  } catch (error) {
    console.warn('[MCP Analytics] Supabase client not available:', error.message)
    return null
  }
}

/**
 * Get requests per key for today
 * @returns {Promise<Array>} Array of { api_key_index, requests_today }
 */
export async function getRequestsPerKeyToday() {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) return []

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('mcp_key_usage')
      .select('api_key_index, requests_today, last_reset')
      .order('api_key_index')

    if (error) {
      console.error('[MCP Analytics] Error getting requests per key:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('[MCP Analytics] Error in getRequestsPerKeyToday:', error)
    return []
  }
}

/**
 * Get tool usage distribution over time period
 * @param {number} days - Number of days to look back
 * @returns {Promise<Array>} Array of { tool_name, count }
 */
export async function getToolUsageDistribution(days = 7) {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) return []

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('mcp_api_usage')
      .select('tool_name')
      .gte('timestamp', startDate.toISOString())

    if (error) {
      console.error('[MCP Analytics] Error getting tool usage:', error)
      return []
    }

    // Count occurrences
    const counts = {}
    data.forEach(item => {
      counts[item.tool_name] = (counts[item.tool_name] || 0) + 1
    })

    return Object.entries(counts)
      .map(([tool_name, count]) => ({ tool_name, count }))
      .sort((a, b) => b.count - a.count)
  } catch (error) {
    console.error('[MCP Analytics] Error in getToolUsageDistribution:', error)
    return []
  }
}

/**
 * Get most queried symbols
 * @param {number} days - Number of days to look back
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} Array of { symbol, count }
 */
export async function getMostQueriedSymbols(days = 7, limit = 10) {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) return []

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('mcp_api_usage')
      .select('symbol')
      .gte('timestamp', startDate.toISOString())
      .not('symbol', 'is', null)

    if (error) {
      console.error('[MCP Analytics] Error getting top symbols:', error)
      return []
    }

    // Count occurrences
    const counts = {}
    data.forEach(item => {
      if (item.symbol) {
        counts[item.symbol] = (counts[item.symbol] || 0) + 1
      }
    })

    return Object.entries(counts)
      .map(([symbol, count]) => ({ symbol, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  } catch (error) {
    console.error('[MCP Analytics] Error in getMostQueriedSymbols:', error)
    return []
  }
}

/**
 * Get peak usage times (grouped by hour)
 * @param {number} days - Number of days to look back
 * @returns {Promise<Array>} Array of { hour, count }
 */
export async function getPeakUsageTimes(days = 7) {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) return []

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('mcp_api_usage')
      .select('timestamp')
      .gte('timestamp', startDate.toISOString())

    if (error) {
      console.error('[MCP Analytics] Error getting peak usage:', error)
      return []
    }

    // Group by hour
    const hourCounts = {}
    data.forEach(item => {
      const date = new Date(item.timestamp)
      const hour = date.getUTCHours()
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    })

    return Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => a.hour - b.hour)
  } catch (error) {
    console.error('[MCP Analytics] Error in getPeakUsageTimes:', error)
    return []
  }
}

/**
 * Get cache hit rate over time period
 * @param {number} days - Number of days to look back
 * @returns {Promise<Object>} { hitRate, hits, misses, total }
 */
export async function getCacheHitRate(days = 7) {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) return { hitRate: 0, hits: 0, misses: 0, total: 0 }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('mcp_cache_stats')
      .select('cache_hit')
      .gte('timestamp', startDate.toISOString())

    if (error) {
      console.error('[MCP Analytics] Error getting cache hit rate:', error)
      return { hitRate: 0, hits: 0, misses: 0, total: 0 }
    }

    const hits = data.filter(item => item.cache_hit).length
    const misses = data.filter(item => !item.cache_hit).length
    const total = hits + misses
    const hitRate = total > 0 ? (hits / total * 100).toFixed(2) : 0

    return {
      hitRate: parseFloat(hitRate),
      hits,
      misses,
      total
    }
  } catch (error) {
    console.error('[MCP Analytics] Error in getCacheHitRate:', error)
    return { hitRate: 0, hits: 0, misses: 0, total: 0 }
  }
}

/**
 * Get error rate over time period
 * @param {number} days - Number of days to look back
 * @returns {Promise<Object>} { errorRate, errors, total }
 */
export async function getErrorRate(days = 7) {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) return { errorRate: 0, errors: 0, total: 0 }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get total requests
    const { data: usageData, error: usageError } = await supabase
      .from('mcp_api_usage')
      .select('success')
      .gte('timestamp', startDate.toISOString())

    if (usageError) {
      console.error('[MCP Analytics] Error getting error rate:', usageError)
      return { errorRate: 0, errors: 0, total: 0 }
    }

    const total = usageData.length
    const errors = usageData.filter(item => !item.success).length
    const errorRate = total > 0 ? (errors / total * 100).toFixed(2) : 0

    return {
      errorRate: parseFloat(errorRate),
      errors,
      total
    }
  } catch (error) {
    console.error('[MCP Analytics] Error in getErrorRate:', error)
    return { errorRate: 0, errors: 0, total: 0 }
  }
}

/**
 * Get summary statistics for today
 * @returns {Promise<Object>} Summary object with key metrics
 */
export async function getSummaryStats() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const supabase = getSupabaseClient()
    if (!supabase) {
      return {
        requestsToday: 0,
        cacheHitRate: 0,
        errorsToday: 0,
        keyUsage: []
      }
    }

    // Get requests today
    const { data: usageData } = await supabase
      .from('mcp_api_usage')
      .select('success')
      .gte('timestamp', today.toISOString())

    const requestsToday = usageData?.length || 0
    const errorsToday = usageData?.filter(item => !item.success).length || 0

    // Get cache hit rate for today
    const { data: cacheData } = await supabase
      .from('mcp_cache_stats')
      .select('cache_hit')
      .gte('timestamp', today.toISOString())

    const cacheHits = cacheData?.filter(item => item.cache_hit).length || 0
    const cacheTotal = cacheData?.length || 0
    const cacheHitRate = cacheTotal > 0 ? (cacheHits / cacheTotal * 100).toFixed(2) : 0

    // Get key usage
    const keyUsage = await getRequestsPerKeyToday()

    return {
      requestsToday,
      cacheHitRate: parseFloat(cacheHitRate),
      errorsToday,
      keyUsage
    }
  } catch (error) {
    console.error('[MCP Analytics] Error in getSummaryStats:', error)
    return {
      requestsToday: 0,
      cacheHitRate: 0,
      errorsToday: 0,
      keyUsage: []
    }
  }
}

/**
 * Get recent errors
 * @param {number} limit - Maximum number of errors to return
 * @returns {Promise<Array>} Array of error objects
 */
export async function getRecentErrors(limit = 20) {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) return []

    const { data, error } = await supabase
      .from('mcp_errors')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[MCP Analytics] Error getting recent errors:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('[MCP Analytics] Error in getRecentErrors:', error)
    return []
  }
}

/**
 * Get cache performance over time
 * @param {number} days - Number of days to look back
 * @returns {Promise<Array>} Array of { date, hitRate, hits, misses }
 */
export async function getCachePerformanceOverTime(days = 7) {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) return []

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('mcp_cache_stats')
      .select('cache_hit, timestamp')
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: true })

    if (error) {
      console.error('[MCP Analytics] Error getting cache performance:', error)
      return []
    }

    // Group by date
    const dailyStats = {}
    data.forEach(item => {
      const date = new Date(item.timestamp).toISOString().split('T')[0]
      if (!dailyStats[date]) {
        dailyStats[date] = { hits: 0, misses: 0 }
      }
      if (item.cache_hit) {
        dailyStats[date].hits++
      } else {
        dailyStats[date].misses++
      }
    })

    return Object.entries(dailyStats).map(([date, stats]) => {
      const total = stats.hits + stats.misses
      return {
        date,
        hitRate: total > 0 ? (stats.hits / total * 100).toFixed(2) : 0,
        hits: stats.hits,
        misses: stats.misses
      }
    })
  } catch (error) {
    console.error('[MCP Analytics] Error in getCachePerformanceOverTime:', error)
    return []
  }
}

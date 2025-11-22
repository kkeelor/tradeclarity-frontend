// lib/ai/mcpClient.js
/**
 * MCP Client for Alpha Vantage MCP Server
 * 
 * Handles connection and communication with Alpha Vantage MCP server
 * to enable AI chat to access market data tools directly.
 */

import { createAdminClient } from '@/lib/supabase-admin'

const MCP_SERVER_URL = 'https://mcp.alphavantage.co/mcp'

// Database logging flag - can be disabled if Supabase is not available
let dbLoggingEnabled = true

/**
 * Get Supabase admin client for database logging
 * Returns null if not available (graceful degradation)
 */
function getSupabaseClient() {
  try {
    return createAdminClient()
  } catch (error) {
    console.warn('[MCP Client] Supabase client not available, database logging disabled:', error.message)
    dbLoggingEnabled = false
    return null
  }
}

/**
 * Get all available API keys from environment variables
 * Supports: ALPHA_VANTAGE_API_KEY (single) or ALPHA_VANTAGE_API_KEY_1 through _6 (multiple)
 * @returns {Array<string>} Array of API keys
 */
function getAPIKeys() {
  const keys = []
  
  // Try to get multiple keys first (ALPHA_VANTAGE_API_KEY_1 through _6)
  for (let i = 1; i <= 6; i++) {
    const key = process.env[`ALPHA_VANTAGE_API_KEY_${i}`]
    if (key) {
      keys.push(key)
    }
  }
  
  // Fallback to single key if no multiple keys found
  if (keys.length === 0) {
    const singleKey = process.env.ALPHA_VANTAGE_API_KEY
    if (singleKey) {
      keys.push(singleKey)
    }
  }
  
  if (keys.length === 0) {
    console.error('[MCP Client] No API keys found. Set ALPHA_VANTAGE_API_KEY or ALPHA_VANTAGE_API_KEY_1 through _6')
    throw new Error('ALPHA_VANTAGE_API_KEY environment variable(s) not set')
  }
  
  console.log(`[MCP Client] Loaded ${keys.length} API key(s)`)
  return keys
}

/**
 * Key usage tracker - tracks requests per key per day
 * Structure: { keyIndex: { count: number, resetTime: Date } }
 */
const keyUsageTracker = new Map()

/**
 * Get reset time for a key (midnight UTC, or can be per-key if different reset times)
 * @param {number} keyIndex - Index of the key
 * @returns {Date} Reset time (midnight UTC of next day)
 */
function getResetTime(keyIndex) {
  const now = new Date()
  const resetTime = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0))
  return resetTime
}

/**
 * Reset key usage tracker if reset time has passed
 * @param {number} keyIndex - Index of the key
 */
function resetKeyIfNeeded(keyIndex) {
  const tracker = keyUsageTracker.get(keyIndex)
  if (!tracker) {
    // Initialize tracker
    keyUsageTracker.set(keyIndex, {
      count: 0,
      resetTime: getResetTime(keyIndex)
    })
    return
  }
  
  const now = new Date()
  if (now >= tracker.resetTime) {
    // Reset time has passed, reset counter
    console.log(`[MCP Client] 🔄 Resetting usage for key ${keyIndex} (was ${tracker.count} requests)`)
    keyUsageTracker.set(keyIndex, {
      count: 0,
      resetTime: getResetTime(keyIndex)
    })
  }
}

/**
 * Check if a key is exhausted (reached 25 requests/day limit)
 * @param {number} keyIndex - Index of the key
 * @returns {boolean} True if key is exhausted
 */
function isKeyExhausted(keyIndex) {
  resetKeyIfNeeded(keyIndex)
  const tracker = keyUsageTracker.get(keyIndex)
  return tracker ? tracker.count >= 25 : false
}

/**
 * Increment usage counter for a key
 * @param {number} keyIndex - Index of the key
 */
function incrementKeyUsage(keyIndex) {
  resetKeyIfNeeded(keyIndex)
  const tracker = keyUsageTracker.get(keyIndex)
  if (tracker) {
    tracker.count++
    console.log(`[MCP Client] 📊 Key ${keyIndex} usage: ${tracker.count}/25 requests today`)
    // Update database (async, don't wait)
    updateKeyUsage(keyIndex, tracker.count).catch(() => {})
  } else {
    keyUsageTracker.set(keyIndex, {
      count: 1,
      resetTime: getResetTime(keyIndex)
    })
    console.log(`[MCP Client] 📊 Key ${keyIndex} usage: 1/25 requests today`)
    // Update database (async, don't wait)
    updateKeyUsage(keyIndex, 1).catch(() => {})
  }
}

/**
 * Get next available API key index using round-robin strategy
 * Skips exhausted keys automatically
 * @param {number} totalKeys - Total number of keys available
 * @returns {number|null} Index of next available key, or null if all exhausted
 */
let currentKeyIndex = 0 // Round-robin counter

function getNextAvailableKeyIndex(totalKeys) {
  const startIndex = currentKeyIndex
  let attempts = 0
  
  // Try to find an available key (max attempts = total keys)
  while (attempts < totalKeys) {
    resetKeyIfNeeded(currentKeyIndex)
    
    if (!isKeyExhausted(currentKeyIndex)) {
      const selectedIndex = currentKeyIndex
      // Move to next key for next call (round-robin)
      currentKeyIndex = (currentKeyIndex + 1) % totalKeys
      return selectedIndex
    }
    
    // This key is exhausted, try next
    currentKeyIndex = (currentKeyIndex + 1) % totalKeys
    attempts++
  }
  
  // All keys exhausted
  return null
}

/**
 * Get MCP server URL with API key
 * Supports multiple API keys with automatic rotation
 * @param {number} keyIndex - Optional: specific key index to use. If not provided, uses next available key.
 * @returns {Object} { url: string, keyIndex: number }
 */
function getMCPServerUrl(keyIndex = null) {
  const apiKeys = getAPIKeys()
  
  // If specific key index provided, use it
  if (keyIndex !== null && keyIndex >= 0 && keyIndex < apiKeys.length) {
    const url = `${MCP_SERVER_URL}?apikey=${apiKeys[keyIndex]}`
    return { url, keyIndex }
  }
  
  // Otherwise, get next available key
  const selectedKeyIndex = getNextAvailableKeyIndex(apiKeys.length)
  
  if (selectedKeyIndex === null) {
    console.error('[MCP Client] ⚠️ All API keys exhausted (25 requests/day limit reached)')
    throw new Error('All API keys exhausted. Rate limit reached. Please try again tomorrow.')
  }
  
  const url = `${MCP_SERVER_URL}?apikey=${apiKeys[selectedKeyIndex]}`
  console.log(`[MCP Client] Using API key ${selectedKeyIndex + 1}/${apiKeys.length}`)
  return { url, keyIndex: selectedKeyIndex }
}

/**
 * Make MCP protocol request with retry logic
 * MCP uses JSON-RPC-like protocol over HTTP
 * Supports automatic key rotation on rate limits
 * @returns {Promise<{result: any, keyIndex: number}>} Result and key index used
 */
async function mcpRequest(method, params = {}, retries = 2) {
  const requestId = Date.now()
  let currentUrl = null
  let currentKeyIndex = null
  
  const requestBody = {
    jsonrpc: '2.0',
    id: requestId,
    method,
    params
  }
  
  console.log(`[MCP Client] [${requestId}] Making ${method} request to MCP server`, { 
    retries, 
    params: JSON.stringify(params).substring(0, 200),
    url: MCP_SERVER_URL 
  })
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    const attemptStartTime = Date.now()
    try {
      // Get URL and key for this attempt (will switch keys on rate limit)
      if (currentUrl === null || currentKeyIndex === null) {
        const urlResult = getMCPServerUrl()
        currentUrl = urlResult.url
        currentKeyIndex = urlResult.keyIndex
        incrementKeyUsage(currentKeyIndex)
      }
      
      console.log(`[MCP Client] [${requestId}] Attempt ${attempt + 1}/${retries + 1} - Sending request with key ${currentKeyIndex}...`)
      
      const response = await fetch(currentUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(30000) // 30 second timeout
      })

      const responseTime = Date.now() - attemptStartTime
      console.log(`[MCP Client] [${requestId}] Response received (${responseTime}ms):`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      })

      // Check for rate limiting
      if (response.status === 429) {
        // Mark current key as exhausted (reached 25/day limit)
        const tracker = keyUsageTracker.get(currentKeyIndex)
        if (tracker) {
          tracker.count = 25 // Mark as exhausted
          console.error(`[MCP Client] [${requestId}] ⚠️ Rate limit on key ${currentKeyIndex}, marking as exhausted`)
        }
        
        // Try next available key if this isn't the last attempt
        if (attempt < retries) {
          try {
            const nextKeyResult = getMCPServerUrl()
            if (nextKeyResult.keyIndex !== currentKeyIndex) {
              console.log(`[MCP Client] [${requestId}] 🔄 Switching from key ${currentKeyIndex} to key ${nextKeyResult.keyIndex} due to rate limit`)
              // Update URL and key for next iteration
              currentUrl = nextKeyResult.url
              currentKeyIndex = nextKeyResult.keyIndex
              incrementKeyUsage(currentKeyIndex)
              continue // Retry with new key
            } else {
              // Same key returned (all keys exhausted)
              console.error(`[MCP Client] [${requestId}] ❌ All keys exhausted`)
            }
          } catch (keyError) {
            // No more keys available
            console.error(`[MCP Client] [${requestId}] ❌ All keys exhausted:`, keyError.message)
          }
        }
        
        const retryAfter = response.headers.get('Retry-After') || response.headers.get('retry-after')
        const rateLimitInfo = {
          status: 429,
          retryAfter: retryAfter ? `${retryAfter}s` : 'unknown',
          attempt: attempt + 1,
          maxRetries: retries + 1,
          keyIndex: currentKeyIndex
        }
        console.error(`[MCP Client] [${requestId}] ⚠️ RATE LIMIT EXCEEDED:`, rateLimitInfo)
        
        throw new Error(`Rate limit exceeded (429) on key ${currentKeyIndex}. Retry after: ${retryAfter || 'unknown'}`)
      }

      if (!response.ok) {
        // Retry on 500/502/503 errors (server errors)
        if ((response.status === 500 || response.status === 502 || response.status === 503) && attempt < retries) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt), 5000) // Exponential backoff, max 5s
          console.warn(`[MCP Client] [${requestId}] Server error ${response.status}, retrying in ${waitTime}ms (attempt ${attempt + 1}/${retries + 1})`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
          continue
        }
        
        // Try to get error body for more details
        let errorBody = null
        try {
          const text = await response.text()
          errorBody = text.substring(0, 500)
          console.error(`[MCP Client] [${requestId}] HTTP error response body:`, errorBody)
        } catch (e) {
          // Ignore parsing errors
        }
        
        console.error(`[MCP Client] [${requestId}] HTTP error: ${response.status} ${response.statusText}`, {
          errorBody,
          attempt: attempt + 1
        })
        throw new Error(`MCP request failed: ${response.status} ${response.statusText}${errorBody ? ` - ${errorBody}` : ''}`)
      }

      const data = await response.json()
      console.log(`[MCP Client] [${requestId}] Response JSON parsed:`, {
        hasResult: !!data.result,
        hasError: !!data.error,
        errorCode: data.error?.code,
        errorMessage: data.error?.message?.substring(0, 200)
      })
      
      if (data.error) {
        // Check for rate limit in error response
        const errorMessage = data.error.message || ''
        const isRateLimit = errorMessage.toLowerCase().includes('rate limit') || 
                           errorMessage.toLowerCase().includes('too many requests') ||
                           data.error.code === 429
        
        if (isRateLimit) {
          // Mark current key as exhausted
          const tracker = keyUsageTracker.get(currentKeyIndex)
          if (tracker) {
            tracker.count = 25 // Mark as exhausted
            console.error(`[MCP Client] [${requestId}] ⚠️ Rate limit in error response for key ${currentKeyIndex}, marking as exhausted`)
          }
          
          // Try next available key if this isn't the last attempt
          if (attempt < retries) {
            try {
              const nextKeyResult = getMCPServerUrl()
              if (nextKeyResult.keyIndex !== currentKeyIndex) {
                console.log(`[MCP Client] [${requestId}] 🔄 Switching from key ${currentKeyIndex} to key ${nextKeyResult.keyIndex} due to rate limit in error`)
                // Update URL and key for next iteration
                currentUrl = nextKeyResult.url
                currentKeyIndex = nextKeyResult.keyIndex
                incrementKeyUsage(currentKeyIndex)
                continue // Retry with new key
              } else {
                // Same key returned (all keys exhausted)
                console.error(`[MCP Client] [${requestId}] ❌ All keys exhausted`)
              }
            } catch (keyError) {
              // No more keys available
              console.error(`[MCP Client] [${requestId}] ❌ All keys exhausted:`, keyError.message)
            }
          }
          
          console.error(`[MCP Client] [${requestId}] ⚠️ RATE LIMIT IN ERROR RESPONSE:`, {
            code: data.error.code,
            message: errorMessage,
            attempt: attempt + 1,
            keyIndex: currentKeyIndex
          })
        }
        
        // Retry on certain error codes (but not rate limit - handled above)
        const errorCode = data.error?.code
        if ((errorCode === -32603 || errorCode === -32000) && !isRateLimit && attempt < retries) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt), 5000)
          console.warn(`[MCP Client] [${requestId}] MCP error ${errorCode}, retrying in ${waitTime}ms (attempt ${attempt + 1}/${retries + 1})`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
          continue
        }
        
        console.error(`[MCP Client] [${requestId}] MCP error response:`, {
          code: data.error.code,
          message: data.error.message,
          data: JSON.stringify(data.error).substring(0, 500)
        })
        throw new Error(`MCP error: ${data.error.message || JSON.stringify(data.error)}`)
      }

      if (attempt > 0) {
        console.log(`[MCP Client] [${requestId}] ✅ ${method} request succeeded after ${attempt} retries (total time: ${Date.now() - attemptStartTime}ms)`)
      } else {
        console.log(`[MCP Client] [${requestId}] ✅ ${method} request successful (${responseTime}ms)`)
      }
      
      // Log result size for tool calls
      if (method === 'tools/call' && data.result) {
        const resultSize = JSON.stringify(data.result).length
        console.log(`[MCP Client] [${requestId}] Tool result size: ${resultSize} bytes`)
      }
      
      // Return result with key index for tracking
      return { result: data.result, keyIndex: currentKeyIndex }
    } catch (error) {
      const errorTime = Date.now() - attemptStartTime
      
      // Check for rate limit in error message
      const isRateLimitError = error.message?.toLowerCase().includes('rate limit') || 
                               error.message?.toLowerCase().includes('429') ||
                               error.message?.toLowerCase().includes('too many requests')
      
      if (isRateLimitError && currentKeyIndex !== null) {
        // Mark current key as exhausted
        const tracker = keyUsageTracker.get(currentKeyIndex)
        if (tracker) {
          tracker.count = 25
        }
        
        // Try next key if available
        if (attempt < retries) {
          try {
            const nextKeyResult = getMCPServerUrl()
            if (nextKeyResult.keyIndex !== currentKeyIndex) {
              console.log(`[MCP Client] [${requestId}] 🔄 Switching from key ${currentKeyIndex} to key ${nextKeyResult.keyIndex} due to rate limit error`)
              currentUrl = nextKeyResult.url
              currentKeyIndex = nextKeyResult.keyIndex
              incrementKeyUsage(currentKeyIndex)
              continue // Retry with new key
            }
          } catch (keyError) {
            // No more keys
          }
        }
        
        console.error(`[MCP Client] [${requestId}] ⚠️ RATE LIMIT ERROR DETECTED:`, {
          message: error.message,
          attempt: attempt + 1,
          time: errorTime,
          keyIndex: currentKeyIndex
        })
      }
      
      // Don't retry on timeout or network errors immediately
      if (error.name === 'AbortError' || error.name === 'TypeError') {
        console.warn(`[MCP Client] [${requestId}] Network/timeout error (${error.name}):`, error.message)
        if (attempt < retries) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt), 5000)
          console.warn(`[MCP Client] [${requestId}] Retrying in ${waitTime}ms (attempt ${attempt + 1}/${retries + 1})`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
          continue
        }
      }
      
      if (attempt === retries) {
        console.error(`[MCP Client] [${requestId}] ❌ Request failed after ${retries + 1} attempts (${method}):`, {
          error: error.message,
          name: error.name,
          totalTime: Date.now() - attemptStartTime,
          isRateLimit: isRateLimitError
        })
        throw error
      }
    }
  }
  
  throw new Error(`MCP request failed after ${retries + 1} attempts`)
}

// Export database logging functions for use in analytics
export { logApiUsage, logCacheStats, logError, updateKeyUsage }

/**
 * Initialize MCP connection and get available tools
 * MCP protocol: initialize method returns server capabilities
 */
export async function initializeMCP() {
  try {
    const response = await mcpRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {}
      },
      clientInfo: {
        name: 'tradeclarity-frontend',
        version: '1.0.0'
      }
    })

    return response.result || response
  } catch (error) {
    console.error('[MCP Client] Initialize failed:', error)
    throw error
  }
}

/**
 * List available tools from MCP server
 * Returns array of tool definitions
 */
export async function listMCPTools() {
  try {
    // MCP protocol: tools/list method
    const response = await mcpRequest('tools/list', {})
    const result = response.result || response
    return result.tools || []
  } catch (error) {
    console.error('[MCP Client] List tools failed:', error)
    // Return empty array on error - will fallback gracefully
    return []
  }
}

/**
 * Detect if a string is in Python dict format (single quotes instead of double quotes)
 * @param {string} text - Text to check
 * @returns {boolean} True if appears to be Python dict format
 */
function detectPythonDictFormat(text) {
  if (typeof text !== 'string' || text.length === 0) {
    return false
  }
  
  // Check if it starts with { and contains single quotes (Python dict indicator)
  const trimmed = text.trim()
  if (trimmed.startsWith('{') && trimmed.includes("'")) {
    // Check for Python dict patterns: {'key': 'value'} or {"key": 'value'} mixed
    const singleQuotePattern = /['"]\s*:\s*['"]/
    const hasSingleQuotes = trimmed.match(/'[^']*':/g) || trimmed.match(/:\s*'[^']*'/g)
    return !!hasSingleQuotes
  }
  
  return false
}

/**
 * Parse Python dict string format to JSON-compatible string
 * Converts: {'key': 'value', 'bool': True, 'null': None}
 * To: {"key": "value", "bool": true, "null": null}
 * @param {string} pythonDictString - Python dict string
 * @returns {string} JSON-compatible string
 */
function parsePythonDict(pythonDictString) {
  if (typeof pythonDictString !== 'string') {
    return pythonDictString
  }
  
  let result = pythonDictString
  
  // Step 1: Replace Python boolean values (must be done before quote replacement)
  // Use word boundaries to avoid replacing inside strings
  result = result.replace(/\bTrue\b/g, 'true')
  result = result.replace(/\bFalse\b/g, 'false')
  result = result.replace(/\bNone\b/g, 'null')
  
  // Step 2: Replace single quotes with double quotes for keys and string values
  // This is tricky because we need to handle nested quotes correctly
  // Strategy: Replace single quotes, but preserve escaped quotes
  
  // First, handle keys: 'key': -> "key":
  result = result.replace(/'([^']*)':/g, '"$1":')
  
  // Then handle string values: : 'value' -> : "value"
  // But be careful with nested structures - use a more sophisticated approach
  // Replace : 'value' patterns (where value doesn't contain quotes or special chars)
  result = result.replace(/:\s*'([^']*)'/g, ': "$1"')
  
  // Handle empty strings: '' -> ""
  result = result.replace(/''/g, '""')
  
  // Step 3: Handle escaped quotes (if any were escaped)
  result = result.replace(/\\'/g, "'")
  
  return result
}

/**
 * In-memory cache for MCP tool responses
 * Key format: `tool:${toolName}:${JSON.stringify(sortedParams)}`
 * Value format: { data: string, timestamp: number, expiresAt: number }
 */
const mcpCache = new Map()

/**
 * Cache statistics tracker
 */
const cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0
}

/**
 * Generate cache key from tool name and parameters
 * @param {string} toolName - Name of the tool
 * @param {Object} params - Tool parameters
 * @returns {string} Cache key
 */
function generateCacheKey(toolName, params) {
  // Sort params keys for consistent cache keys
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key]
      return acc
    }, {})
  
  return `tool:${toolName}:${JSON.stringify(sortedParams)}`
}

/**
 * Get cache TTL (time to live) in milliseconds for a tool
 * @param {string} toolName - Name of the tool
 * @returns {number} TTL in milliseconds
 */
function getCacheTTL(toolName) {
  const cacheDurations = {
    'MARKET_STATUS': 3600000,           // 1 hour (changes once per day)
    'TIME_SERIES_INTRADAY': 120000,     // 2 minutes (new candle every minute)
    'TIME_SERIES_DAILY': 3600000,       // 1 hour (updates after market close)
    'TIME_SERIES_WEEKLY': 86400000,     // 24 hours (updates weekly)
    'TIME_SERIES_MONTHLY': 86400000,    // 24 hours (updates monthly)
    'DIGITAL_CURRENCY_DAILY': 3600000,  // 1 hour
    'FEDERAL_FUNDS_RATE': 86400000,     // 24 hours
    'CPI': 86400000,                    // 24 hours
    'INFLATION': 86400000,              // 24 hours
    'EARNINGS_CALENDAR': 3600000,       // 1 hour
  }
  
  // Default: 60 seconds for other tools
  return cacheDurations[toolName] || 60000
}

/**
 * Get cached data for a tool call
 * @param {string} toolName - Name of the tool
 * @param {Object} params - Tool parameters
 * @returns {Object|null} Cached data with metadata, or null if cache miss/expired
 */
function getCached(toolName, params) {
  const cacheKey = generateCacheKey(toolName, params)
  const cached = mcpCache.get(cacheKey)
  
  if (!cached) {
    cacheStats.misses++
    return null
  }
  
  const now = Date.now()
  
  // Check if cache is expired
  if (now >= cached.expiresAt) {
    // Cache expired, remove it
    mcpCache.delete(cacheKey)
    cacheStats.misses++
    return null
  }
  
  // Cache hit!
  cacheStats.hits++
  const age = Math.floor((now - cached.timestamp) / 1000) // Age in seconds
  
  return {
    data: cached.data,
    age: age,
    stale: false
  }
}

/**
 * Set cached data for a tool call
 * @param {string} toolName - Name of the tool
 * @param {Object} params - Tool parameters
 * @param {string} data - Response data to cache
 * @param {number} ttl - Optional TTL in milliseconds (uses default if not provided)
 */
function setCached(toolName, params, data, ttl = null) {
  const cacheKey = generateCacheKey(toolName, params)
  const now = Date.now()
  const cacheTTL = ttl || getCacheTTL(toolName)
  
  mcpCache.set(cacheKey, {
    data: data,
    timestamp: now,
    expiresAt: now + cacheTTL
  })
  
  cacheStats.sets++
}

/**
 * Get stale cache data (even if expired, if available)
 * @param {string} toolName - Name of the tool
 * @param {Object} params - Tool parameters
 * @param {number} maxAge - Maximum age in milliseconds to accept stale data (default: 10 minutes)
 * @returns {Object|null} Stale cached data with metadata, or null if not available
 */
function getStaleCache(toolName, params, maxAge = 600000) { // 10 minutes default
  const cacheKey = generateCacheKey(toolName, params)
  const cached = mcpCache.get(cacheKey)
  
  if (!cached) {
    return null
  }
  
  const now = Date.now()
  const age = now - cached.timestamp
  
  // Only return if age is within maxAge limit
  if (age <= maxAge) {
    return {
      data: cached.data,
      age: Math.floor(age / 1000), // Age in seconds
      stale: true
    }
  }
  
  return null
}

/**
 * Clear all cache entries
 * Useful for testing/debugging
 */
function clearCache() {
  mcpCache.clear()
  cacheStats.hits = 0
  cacheStats.misses = 0
  cacheStats.sets = 0
  console.log('[MCP Client] Cache cleared')
}

/**
 * Get cache statistics
 * @returns {Object} Cache stats
 */
export function getCacheStats() {
  const total = cacheStats.hits + cacheStats.misses
  const hitRate = total > 0 ? (cacheStats.hits / total * 100).toFixed(2) : 0
  
  return {
    hits: cacheStats.hits,
    misses: cacheStats.misses,
    sets: cacheStats.sets,
    hitRate: `${hitRate}%`,
    size: mcpCache.size
  }
}

/**
 * Clear cache (exported for testing/debugging)
 */
export function clearMCPCache() {
  clearCache()
}

/**
 * Database logging functions
 * These functions log to Supabase tables for monitoring and analytics
 * All functions handle errors gracefully - database failures won't break MCP functionality
 */

/**
 * Log API usage to database
 * @param {Object} data - Usage data
 */
async function logApiUsage(data) {
  if (!dbLoggingEnabled) return
  
  try {
    const supabase = getSupabaseClient()
    if (!supabase) return
    
    const { error } = await supabase
      .from('mcp_api_usage')
      .insert({
        api_key_index: data.apiKeyIndex,
        tool_name: data.toolName,
        symbol: data.symbol || null,
        input_params: data.inputParams || null,
        success: data.success,
        error_type: data.errorType || null,
        error_message: data.errorMessage || null,
        duration_ms: data.durationMs,
        timestamp: new Date().toISOString()
      })
    
    if (error) {
      console.warn('[MCP Client] Failed to log API usage:', error.message)
    }
  } catch (error) {
    console.warn('[MCP Client] Database logging error (logApiUsage):', error.message)
  }
}

/**
 * Log cache statistics to database
 * @param {Object} data - Cache stats data
 */
async function logCacheStats(data) {
  if (!dbLoggingEnabled) return
  
  try {
    const supabase = getSupabaseClient()
    if (!supabase) return
    
    const { error } = await supabase
      .from('mcp_cache_stats')
      .insert({
        tool_name: data.toolName,
        symbol: data.symbol || null,
        cache_hit: data.cacheHit,
        cache_age_seconds: data.cacheAgeSeconds || null,
        timestamp: new Date().toISOString()
      })
    
    if (error) {
      console.warn('[MCP Client] Failed to log cache stats:', error.message)
    }
  } catch (error) {
    console.warn('[MCP Client] Database logging error (logCacheStats):', error.message)
  }
}

/**
 * Log error to database
 * @param {Object} data - Error data
 */
async function logError(data) {
  if (!dbLoggingEnabled) return
  
  try {
    const supabase = getSupabaseClient()
    if (!supabase) return
    
    const { error } = await supabase
      .from('mcp_errors')
      .insert({
        tool_name: data.toolName,
        error_type: data.errorType,
        error_message: data.errorMessage,
        api_key_index: data.apiKeyIndex || null,
        response_body: data.responseBody || null,
        timestamp: new Date().toISOString()
      })
    
    if (error) {
      console.warn('[MCP Client] Failed to log error:', error.message)
    }
  } catch (error) {
    console.warn('[MCP Client] Database logging error (logError):', error.message)
  }
}

/**
 * Update key usage in database
 * @param {number} keyIndex - API key index
 * @param {number} count - Current request count
 */
async function updateKeyUsage(keyIndex, count) {
  if (!dbLoggingEnabled) return
  
  try {
    const supabase = getSupabaseClient()
    if (!supabase) return
    
    // Use the database function for upsert
    const { error } = await supabase.rpc('update_mcp_key_usage', {
      p_api_key_index: keyIndex,
      p_requests_today: count,
      p_last_reset: new Date().toISOString()
    })
    
    if (error) {
      console.warn('[MCP Client] Failed to update key usage:', error.message)
    }
  } catch (error) {
    console.warn('[MCP Client] Database logging error (updateKeyUsage):', error.message)
  }
}

/**
 * Fallback tool chains - defines which tools to try if primary tool fails
 * Format: { primaryTool: fallbackTool }
 */
const fallbackToolChains = {
  // Broken tools → working alternatives
  'REALTIME_BULK_QUOTES': 'TIME_SERIES_INTRADAY',  // Broken (HTTP 500) → Use intraday
  'GLOBAL_QUOTE': 'TIME_SERIES_INTRADAY',          // Premium → Use intraday
  // Note: These tools are already disabled, but fallback chain exists for safety
}

/**
 * Get fallback tool for a given tool name
 * @param {string} toolName - Name of the tool that failed
 * @returns {string|null} Fallback tool name, or null if no fallback available
 */
function getFallbackTool(toolName) {
  return fallbackToolChains[toolName] || null
}

/**
 * Detect error type from error message or response
 * @param {string} errorMessage - Error message to analyze
 * @param {number} statusCode - HTTP status code (if available)
 * @param {string} toolName - Name of the tool that failed
 * @param {Object} toolArguments - Tool arguments (for extracting symbol if needed)
 * @returns {Object} Structured error object
 */
function detectErrorType(errorMessage, statusCode, toolName, toolArguments = {}) {
  const message = errorMessage?.toLowerCase() || ''
  
  // Rate limit errors
  if (statusCode === 429 || 
      message.includes('rate limit') || 
      message.includes('too many requests') ||
      message.includes('api call frequency')) {
    return {
      type: 'rate_limit',
      message: 'Market data service is temporarily rate-limited. Please try again in a minute.',
      actionable: 'Try again in 1 minute',
      tool: toolName
    }
  }
  
  // Premium required errors
  if (statusCode === 403 ||
      message.includes('premium') ||
      message.includes('subscription') ||
      message.includes('entitled') ||
      message.includes('not entitled')) {
    return {
      type: 'premium_required',
      message: 'This feature requires a premium subscription.',
      actionable: 'This tool is not available on the free tier',
      tool: toolName
    }
  }
  
  // Invalid symbol errors
  if (message.includes('invalid api call') ||
      message.includes('invalid symbol') ||
      message.includes('symbol not found') ||
      message.includes('does not exist')) {
    // Try to extract symbol from error message
    const symbolMatch = errorMessage.match(/symbol[:\s]+['"]?([A-Z0-9]+)['"]?/i)
    const symbol = symbolMatch ? symbolMatch[1] : (toolArguments?.symbol || 'unknown')
    return {
      type: 'invalid_symbol',
      message: `Symbol '${symbol}' not found. Please check the symbol and try again.`,
      actionable: 'Check symbol spelling and ensure it exists',
      tool: toolName,
      symbol
    }
  }
  
  // Network/server errors
  if (statusCode === 500 || statusCode === 502 || statusCode === 503 ||
      message.includes('server error') ||
      message.includes('internal server error') ||
      message.includes('service unavailable')) {
    return {
      type: 'network_error',
      message: 'Unable to fetch market data. The service may be temporarily unavailable.',
      actionable: 'Try again in a few moments',
      tool: toolName
    }
  }
  
  // Timeout errors
  if (message.includes('timeout') || message.includes('aborted')) {
    return {
      type: 'timeout_error',
      message: 'Request timed out. The service may be slow or unavailable.',
      actionable: 'Try again in a few moments',
      tool: toolName
    }
  }
  
  // Generic error
  return {
    type: 'unknown_error',
    message: errorMessage || 'An error occurred while fetching market data.',
    actionable: 'Please try again',
    tool: toolName
  }
}

/**
 * Execute an MCP tool
 * @param {string} toolName - Name of the tool to execute
 * @param {Object} toolArguments - Tool arguments
 * @returns {Promise<string>} Tool execution result as string (extracted from MCP content format)
 */
export async function callMCPTool(toolName, toolArguments = {}, retries = 2) {
  const callStartTime = Date.now()
  const callId = Date.now()
  
  try {
    console.log(`[MCP Client] [TOOL-${callId}] 🚀 Calling tool: ${toolName}`, { 
      arguments: toolArguments, 
      retries,
      timestamp: new Date().toISOString()
    })
    
    // Check cache BEFORE making API call
    const cached = getCached(toolName, toolArguments)
    if (cached) {
      const cacheDuration = Date.now() - callStartTime
      console.log(`[MCP Client] [TOOL-${callId}] ✅ Cache HIT for ${toolName} (${cached.age}s old, ${cacheDuration}ms)`)
      
      // Log cache hit to database (async, don't wait)
      logCacheStats({
        toolName,
        symbol: toolArguments.symbol || null,
        cacheHit: true,
        cacheAgeSeconds: cached.age
      }).catch(() => {})
      
      return cached.data
    }
    
    console.log(`[MCP Client] [TOOL-${callId}] ⚠️ Cache MISS for ${toolName}, making API call...`)
    
    // Log cache miss to database (async, don't wait)
    logCacheStats({
      toolName,
      symbol: toolArguments.symbol || null,
      cacheHit: false,
      cacheAgeSeconds: null
    }).catch(() => {})
    
    // Note: GLOBAL_QUOTE is disabled (premium required), so no entitlement logic needed
    let finalArguments = { ...toolArguments }
    
    // MCP protocol: tools/call method (with retry logic)
    const mcpResponse = await mcpRequest('tools/call', {
      name: toolName,
      arguments: finalArguments
    }, retries)

    const callDuration = Date.now() - callStartTime
    const result = mcpResponse.result
    const apiKeyIndexUsed = mcpResponse.keyIndex
    console.log(`[MCP Client] [TOOL-${callId}] ✅ Tool ${toolName} returned result (${callDuration}ms):`, {
      hasContent: !!result.content,
      contentType: Array.isArray(result.content) ? result.content[0]?.type : typeof result.content,
      contentArrayLength: Array.isArray(result.content) ? result.content.length : 0
    })

    // MCP tools return result with content array: [{ type: 'text', text: '...' }]
    // Extract the text content for Anthropic
    if (result.content && Array.isArray(result.content)) {
      // Combine all text content from the content array
      const textContent = result.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n')
      
      if (textContent) {
        // Check if response is in Python dict format and convert to JSON
        let finalContent = textContent
        if (detectPythonDictFormat(textContent)) {
          try {
            finalContent = parsePythonDict(textContent)
            // Validate it's now valid JSON by trying to parse it
            JSON.parse(finalContent)
            console.log(`[MCP Client] [TOOL-${callId}] 🔄 Converted Python dict format to JSON for tool: ${toolName}`)
          } catch (parseError) {
            // If conversion failed, log warning but return original
            console.warn(`[MCP Client] [TOOL-${callId}] ⚠️ Python dict conversion failed, using original:`, parseError.message)
            finalContent = textContent
          }
        }
        
        // Check for stale data indicators in the response
        const staleDataWarning = detectStaleData(finalContent, toolName)
        if (staleDataWarning) {
          console.warn(`[MCP Client] [TOOL-${callId}] ⚠️ Stale data detected: ${staleDataWarning}`)
        }
        
        // Check for rate limit messages in response
        if (finalContent.toLowerCase().includes('rate limit') || 
            finalContent.toLowerCase().includes('too many requests') ||
            finalContent.toLowerCase().includes('api call frequency')) {
          console.error(`[MCP Client] [TOOL-${callId}] ⚠️ RATE LIMIT MESSAGE IN RESPONSE:`, finalContent.substring(0, 200))
        }
        
        console.log(`[MCP Client] [TOOL-${callId}] ✅ Extracted ${finalContent.length} chars from tool result`)
        
        // Store result in cache
        setCached(toolName, toolArguments, finalContent)
        
        // Log successful API call to database (async, don't wait)
        logApiUsage({
          apiKeyIndex: apiKeyIndexUsed,
          toolName,
          symbol: toolArguments.symbol || null,
          inputParams: toolArguments,
          success: true,
          errorType: null,
          errorMessage: null,
          durationMs: callDuration
        }).catch(() => {})
        
        return finalContent
      } else {
        console.warn(`[MCP Client] [TOOL-${callId}] ⚠️ No text content found in result.content array`)
      }
    }

    // Fallback: stringify the whole result if content format is unexpected
    console.warn(`[MCP Client] [TOOL-${callId}] ⚠️ Unexpected result format for ${toolName}, stringifying entire result`)
    return JSON.stringify(result)
  } catch (error) {
    const callDuration = Date.now() - callStartTime
    
    // Detect error type and create structured error
    const structuredError = detectErrorType(error.message, error.status || null, toolName, toolArguments)
    
    // On rate limit or network error, try to serve stale cache first
    if (structuredError.type === 'rate_limit' || structuredError.type === 'network_error' || structuredError.type === 'timeout_error') {
      const staleCache = getStaleCache(toolName, toolArguments, 600000) // 10 minutes max age
      
      if (staleCache) {
        console.log(`[MCP Client] [TOOL-${callId}] ⚠️ ${structuredError.type} error, serving stale cache (${staleCache.age}s old)`)
        
        // Return stale cache data with metadata
        const staleData = staleCache.data
        // Note: The AI can detect stale data from the response if needed
        return staleData
      } else {
        console.log(`[MCP Client] [TOOL-${callId}] ⚠️ ${structuredError.type} error, no stale cache available`)
      }
    }
    
    // Try fallback tool for certain error types (not for invalid symbol, premium, etc.)
    // Only try fallback for network errors, server errors, or if tool is known to be broken/premium
    if ((structuredError.type === 'network_error' || 
         structuredError.type === 'timeout_error' ||
         structuredError.type === 'premium_required' ||
         structuredError.type === 'unknown_error') && 
        !toolArguments._noFallback) { // Allow disabling fallback via flag
      
      const fallbackTool = getFallbackTool(toolName)
      
      if (fallbackTool) {
        console.log(`[MCP Client] [TOOL-${callId}] 🔄 Tool ${toolName} failed (${structuredError.type}), trying fallback: ${fallbackTool}`)
        
        try {
          // Try fallback tool with same arguments (but mark as fallback to prevent infinite loops)
          const fallbackArgs = { ...toolArguments, _noFallback: true }
          const fallbackResult = await callMCPTool(fallbackTool, fallbackArgs, retries)
          
          console.log(`[MCP Client] [TOOL-${callId}] ✅ Fallback tool ${fallbackTool} succeeded`)
          return fallbackResult
        } catch (fallbackError) {
          console.error(`[MCP Client] [TOOL-${callId}] ❌ Fallback tool ${fallbackTool} also failed:`, fallbackError.message)
          // Continue to throw original error
        }
      }
    }
    
    // Log error with full context
    console.error(`[MCP Client] [TOOL-${callId}] ❌ Tool call failed (${toolName}):`, {
      error: error.message,
      errorType: structuredError.type,
      duration: callDuration,
      retries,
      structuredError,
      fallbackAttempted: !!getFallbackTool(toolName)
    })
    
    // Log error to database (async, don't wait)
    logError({
      toolName,
      errorType: structuredError.type,
      errorMessage: structuredError.message,
      apiKeyIndex: null, // Could be extracted from error if available
      responseBody: error.message.substring(0, 1000) // Limit size
    }).catch(() => {})
    
    // Log failed API call to database (async, don't wait)
    logApiUsage({
      apiKeyIndex: null, // Could be extracted if available
      toolName,
      symbol: toolArguments.symbol || null,
      inputParams: toolArguments,
      success: false,
      errorType: structuredError.type,
      errorMessage: structuredError.message,
      durationMs: callDuration
    }).catch(() => {})
    
    // Create enhanced error with structured information
    const enhancedError = new Error(structuredError.message)
    enhancedError.errorType = structuredError.type
    enhancedError.structuredError = structuredError
    enhancedError.originalError = error.message
    
    throw enhancedError
  }
}

/**
 * Detect stale data in tool responses
 * Returns warning message if stale data detected, null otherwise
 */
function detectStaleData(textContent, toolName) {
  try {
    // Try to parse JSON response
    const data = JSON.parse(textContent)
    
    // Check for timestamp fields that indicate data age
    if (data['Global Quote'] || data['Quote Response']) {
      const quote = data['Global Quote'] || data['Quote Response']
      const lastTradeTime = quote['07. latest trading day'] || quote['latest trading day']
      const price = quote['05. price'] || quote['price']
      
      if (lastTradeTime && price) {
        const tradeDate = new Date(lastTradeTime)
        const now = new Date()
        const hoursDiff = (now - tradeDate) / (1000 * 60 * 60)
        
        if (hoursDiff > 24) {
          return `Data is ${Math.round(hoursDiff)} hours old (last trade: ${lastTradeTime})`
        } else if (hoursDiff > 1) {
          return `Data is ${Math.round(hoursDiff * 10) / 10} hours old (last trade: ${lastTradeTime})`
        }
      }
    }
    
    // Check for "Information" field that might indicate API limitations
    if (data.Information && typeof data.Information === 'string') {
      if (data.Information.toLowerCase().includes('demo') || 
          data.Information.toLowerCase().includes('delayed')) {
        return data.Information
      }
    }
    
    return null
  } catch (e) {
    // Not JSON or can't parse - return null
    return null
  }
}

/**
 * Convert MCP tool definition to Anthropic tool format
 * @param {Object} mcpTool - MCP tool definition
 * @returns {Object} Anthropic tool format
 */
export function convertMCPToolToAnthropic(mcpTool) {
  // MCP tools have name and inputSchema
  // Anthropic tools need name, description, and input_schema
  return {
    name: mcpTool.name,
    description: mcpTool.description || `Execute ${mcpTool.name} tool from Alpha Vantage`,
    input_schema: mcpTool.inputSchema || mcpTool.input_schema || {
      type: 'object',
      properties: {},
      required: []
    }
  }
}

/**
 * Get available tools in Anthropic format
 * Fetches tools from MCP server and converts them
 * @param {Array<string>} filterTools - Optional: Only include these tool names
 * @returns {Promise<Array>} Array of Anthropic-formatted tools
 */
export async function getAnthropicTools(filterTools = null) {
  try {
    console.log('[MCP Client] Fetching tools from MCP server...')
    const mcpTools = await listMCPTools()
    console.log(`[MCP Client] Received ${mcpTools.length} tools from MCP server`)
    
    // Filter tools if specified
    const filteredTools = filterTools 
      ? mcpTools.filter(tool => filterTools.includes(tool.name))
      : mcpTools

    if (filterTools && filteredTools.length < filterTools.length) {
      const found = filteredTools.map(t => t.name)
      const missing = filterTools.filter(name => !found.includes(name))
      console.warn(`[MCP Client] Some requested tools not found:`, missing)
    }

    // Convert to Anthropic format
    const anthropicTools = filteredTools.map(convertMCPToolToAnthropic)

    console.log(`[MCP Client] Converted ${anthropicTools.length} tools to Anthropic format:`, 
      anthropicTools.map(t => t.name).join(', '))
    
    return anthropicTools
  } catch (error) {
    console.error('[MCP Client] Failed to get tools:', error.message)
    // Return empty array - will disable tool use but continue conversation
    return []
  }
}

/**
 * Check if MCP is available and configured
 */
export function isMCPAvailable() {
  const hasKey = !!process.env.ALPHA_VANTAGE_API_KEY
  const keyLength = process.env.ALPHA_VANTAGE_API_KEY?.length || 0
  console.log(`[MCP Client] 🔍 MCP availability check:`, {
    available: hasKey,
    hasKey: hasKey ? 'YES' : 'NO',
    keyLength: hasKey ? keyLength : 0,
    keyPrefix: hasKey ? process.env.ALPHA_VANTAGE_API_KEY.substring(0, 4) + '...' : 'N/A'
  })
  return hasKey
}

/**
 * Get selected tools for AI chat
 * Returns a curated list of most useful tools
 */
export async function getSelectedMCPTools() {
  const startTime = Date.now()
  console.log(`[MCP Client] 📋 Getting selected MCP tools...`)
  
  // Core market data tools
  const selectedToolNames = [
    // Real-time & current data
    // 'REALTIME_BULK_QUOTES',     // DISABLED: Returns HTTP 500 error on Alpha Vantage free tier
    // 'GLOBAL_QUOTE',             // DISABLED: Requires Alpha Vantage premium subscription
    'MARKET_STATUS',             // Check if markets are open
    
    // Time series data
    'TIME_SERIES_INTRADAY',     // Intraday OHLCV data (more granular than daily) - USE THIS FOR CURRENT PRICES
    'TIME_SERIES_DAILY',        // Daily historical price data - USE THIS FOR DAILY PRICES
    // 'TIME_SERIES_DAILY_ADJUSTED', // DISABLED: Requires Alpha Vantage premium subscription
    
    // Crypto (users trade crypto)
    'DIGITAL_CURRENCY_DAILY',   // Daily crypto time series
    // 'CRYPTO_INTRADAY',          // DISABLED: Requires Alpha Vantage premium subscription
    'CURRENCY_EXCHANGE_RATE',   // Crypto exchange rates
    
    // Market intelligence
    'NEWS_SENTIMENT',            // News sentiment analysis
    'TOP_GAINERS_LOSERS',        // Market movers
    'SYMBOL_SEARCH',             // Search for tickers
    
    // Technical indicators (popular ones)
    'RSI',                       // Relative Strength Index (overbought/oversold)
    'MACD',                      // Moving Average Convergence Divergence (trend/momentum)
    'BBANDS',                    // Bollinger Bands (volatility)
    'VWAP',                      // Volume Weighted Average Price (intraday reference)
    'EMA',                       // Exponential Moving Average (trend)
    'SMA',                       // Simple Moving Average (trend)
    'STOCH',                     // Stochastic Oscillator (momentum)
    'ATR',                       // Average True Range (volatility/risk)
    
    // Fundamental data
    'COMPANY_OVERVIEW',          // Company info & financial ratios
    'EARNINGS_CALENDAR',         // Upcoming earnings dates
    'EARNINGS',                  // Actual earnings data (annual/quarterly)
    
    // Advanced analytics
    // 'ANALYTICS_FIXED_WINDOW',    // DISABLED: Returns HTTP 500 error on Alpha Vantage free tier
    // 'ANALYTICS_SLIDING_WINDOW',  // DISABLED: Returns HTTP 500 error on Alpha Vantage free tier
    
    // Market intelligence
    // 'INSIDER_TRANSACTIONS',      // DISABLED: Returns HTTP 500 error on Alpha Vantage free tier
    
    // Economic indicators
    'TREASURY_YIELD',            // Treasury yields
    'FEDERAL_FUNDS_RATE',        // Fed rates
    'CPI',                       // Consumer Price Index (inflation)
    'INFLATION',                 // Inflation rates
  ]

  console.log(`[MCP Client] 📋 Requesting ${selectedToolNames.length} tools from MCP server`)
  const tools = await getAnthropicTools(selectedToolNames)
  const duration = Date.now() - startTime
  
  console.log(`[MCP Client] ✅ Retrieved ${tools.length} tools in ${duration}ms:`, {
    toolCount: tools.length,
    requestedCount: selectedToolNames.length,
    toolNames: tools.map(t => t.name).join(', ')
  })
  
  return tools
}

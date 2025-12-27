// lib/snaptrade-backend-client.js
// Backend API client for SnapTrade operations
// This replaces direct SnapTrade SDK calls with backend API calls

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

/**
 * Get authentication token from Supabase session
 */
async function getAuthToken() {
  try {
    const { supabase } = await import('@/lib/supabase')
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      throw new Error('No authentication token available')
    }
    
    return session.access_token
  } catch (error) {
    console.error('❌ [Snaptrade Backend Client] Failed to get auth token:', error)
    throw new Error('Authentication required')
  }
}

/**
 * Make authenticated request to backend API
 */
async function backendRequest(endpoint, options = {}) {
  const token = await getAuthToken()
  
  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Register a new SnapTrade user
 * @param {string} userId - TradeClarity user identifier (email or UUID)
 * @returns {Promise<{userId: string, userSecret: string}>}
 */
export async function registerSnaptradeUser(userId) {
  try {
    const data = await backendRequest('/api/snaptrade/register', {
      method: 'POST',
    })

    // Backend returns { success: true, userId: ... } or { alreadyExists: true, userId: ... }
    if (data.alreadyExists) {
      return {
        userId: data.userId,
        userSecret: null, // Not returned for existing users
        alreadyExists: true,
      }
    }

    return {
      userId: data.userId,
      userSecret: null, // Backend handles encryption, we don't need the secret
    }
  } catch (error) {
    console.error('❌ [Snaptrade Backend Client] Error registering user:', error)
    throw error
  }
}

/**
 * Generate OAuth login URL for connecting brokerage
 * @param {Object} options - Connection options
 * @param {string} options.broker - Optional broker slug (e.g., 'ROBINHOOD')
 * @param {string} options.customRedirect - Redirect URL after connection
 * @param {boolean} options.immediateRedirect - Skip broker selection if only one option
 * @returns {Promise<{redirectURI: string, sessionId: string}>}
 */
export async function generateLoginUrl(options = {}) {
  try {
    const data = await backendRequest('/api/snaptrade/login-url', {
      method: 'POST',
      body: JSON.stringify({
        broker: options.broker,
        customRedirect: options.customRedirect,
        immediateRedirect: options.immediateRedirect,
        connectionType: options.connectionType || 'read',
      }),
    })

    return {
      redirectURI: data.redirectURI,
      sessionId: data.sessionId,
    }
  } catch (error) {
    console.error('❌ [Snaptrade Backend Client] Error generating login URL:', error)
    throw error
  }
}

/**
 * Get all connected accounts for a user
 * @returns {Promise<Array>} Array of account objects
 */
export async function getAccounts() {
  try {
    const data = await backendRequest('/api/snaptrade/accounts', {
      method: 'GET',
    })

    return data.accounts || []
  } catch (error) {
    console.error('❌ [Snaptrade Backend Client] Error fetching accounts:', error)
    throw error
  }
}

/**
 * Get transaction history (activities)
 * @param {Object} options - Query options
 * @param {string} options.startDate - Start date (YYYY-MM-DD)
 * @param {string} options.endDate - End date (YYYY-MM-DD)
 * @param {string} options.accounts - Comma-separated account IDs
 * @param {string} options.type - Transaction type filter (BUY, SELL, etc.)
 * @returns {Promise<Array>} Array of activity/transaction objects
 */
export async function getActivities(options = {}) {
  try {
    const params = new URLSearchParams()
    if (options.startDate) params.append('startDate', options.startDate)
    if (options.endDate) params.append('endDate', options.endDate)
    if (options.accounts) params.append('accounts', options.accounts)
    if (options.type) params.append('type', options.type)

    const queryString = params.toString()
    const endpoint = `/api/snaptrade/activities${queryString ? `?${queryString}` : ''}`

    const data = await backendRequest(endpoint, {
      method: 'GET',
    })

    return data.activities || []
  } catch (error) {
    console.error('❌ [Snaptrade Backend Client] Error fetching activities:', error)
    throw error
  }
}

/**
 * Get holdings for a specific account
 * @param {string} accountId - Account UUID
 * @returns {Promise<Object>} AccountHoldingsAccount object with account, positions, cash, total_value
 */
export async function getAccountHoldings(accountId) {
  try {
    if (!accountId) {
      throw new Error('Account ID is required')
    }

    const data = await backendRequest(`/api/snaptrade/holdings/${accountId}`, {
      method: 'GET',
    })

    return data.holdings || null
  } catch (error) {
    console.error('❌ [Snaptrade Backend Client] Error fetching account holdings:', error)
    throw error
  }
}

/**
 * Check if user is registered with SnapTrade
 * @returns {Promise<{registered: boolean, snaptradeUserId?: string}>}
 */
export async function checkRegistration() {
  try {
    const data = await backendRequest('/api/snaptrade/check-registration', {
      method: 'GET',
    })

    return {
      registered: data.registered || false,
      snaptradeUserId: data.snaptradeUserId,
    }
  } catch (error) {
    console.error('❌ [Snaptrade Backend Client] Error checking registration:', error)
    // If error, assume not registered
    return { registered: false }
  }
}

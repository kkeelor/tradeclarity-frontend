// lib/snaptrade-client.js
// Snaptrade SDK wrapper for TradeClarity
import { Snaptrade } from 'snaptrade-typescript-sdk'

let snaptradeClient = null

/**
 * Initialize and get Snaptrade client instance
 * Uses singleton pattern to reuse client
 */
export function getSnaptradeClient() {
  if (snaptradeClient) {
    return snaptradeClient
  }

  const consumerKey = process.env.SNAPTRADE_CONSUMER_KEY
  const clientId = process.env.SNAPTRADE_CLIENT_ID

  if (!consumerKey || !clientId) {
    throw new Error(
      'Snaptrade credentials not configured. Missing SNAPTRADE_CONSUMER_KEY or SNAPTRADE_CLIENT_ID'
    )
  }

  snaptradeClient = new Snaptrade({
    consumerKey,
    clientId,
  })

  return snaptradeClient
}

/**
 * Register a new Snaptrade user
 * @param {string} userId - TradeClarity user identifier (email or UUID)
 * @returns {Promise<{userId: string, userSecret: string}>}
 */
export async function registerSnaptradeUser(userId) {
  try {
    // Validate userId
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw new Error('userId must be a non-empty string')
    }

    const client = getSnaptradeClient()
    
    console.log('🔍 [Snaptrade] Registering user with userId:', userId)
    
    const response = await client.authentication.registerSnapTradeUser({
      userId: userId.trim(),
    })

    // SDK returns Axios response, extract data property
    const data = response.data || response

    if (!data.userId || !data.userSecret) {
      throw new Error('Invalid response from Snaptrade API')
    }

    return {
      userId: data.userId,
      userSecret: data.userSecret,
    }
  } catch (error) {
    console.error('❌ [Snaptrade] Error registering user:', error)
    
    // Extract more detailed error information from Axios error
    let errorMessage = error.message || 'Unknown error'
    if (error.response) {
      // Axios error with response
      const status = error.response.status
      const statusText = error.response.statusText
      const errorData = error.response.data
      
      console.error('❌ [Snaptrade] Error details:', {
        status,
        statusText,
        data: errorData,
        headers: error.response.headers,
      })
      
      errorMessage = errorData?.message || errorData?.error || `${statusText} (${status})`
      
      if (errorData) {
        errorMessage += `: ${JSON.stringify(errorData)}`
      }
    } else if (error.request) {
      // Request made but no response
      errorMessage = 'No response from Snaptrade API'
    }
    
    throw new Error(`Failed to register Snaptrade user: ${errorMessage}`)
  }
}

/**
 * Generate OAuth login URL for connecting brokerage
 * @param {string} userId - Snaptrade user ID
 * @param {string} userSecret - Snaptrade user secret
 * @param {Object} options - Connection options
 * @param {string} options.broker - Optional broker slug (e.g., 'ROBINHOOD')
 * @param {string} options.customRedirect - Redirect URL after connection
 * @param {boolean} options.immediateRedirect - Skip broker selection if only one option
 * @returns {Promise<{redirectURI: string, sessionId: string}>}
 */
export async function generateLoginUrl(userId, userSecret, options = {}) {
  try {
    const client = getSnaptradeClient()
    const response = await client.authentication.loginSnapTradeUser({
      userId,
      userSecret,
      broker: options.broker || undefined,
      immediateRedirect: options.immediateRedirect ?? true,
      customRedirect: options.customRedirect || undefined,
      reconnect: options.reconnect || undefined,
      connectionType: options.connectionType || 'read',
      connectionPortalVersion: 'v3',
    })

    // SDK returns Axios response, extract data property
    const data = response.data || response

    return {
      redirectURI: data.redirectURI,
      sessionId: data.sessionId,
    }
  } catch (error) {
    console.error('❌ [Snaptrade] Error generating login URL:', error)
    throw new Error(
      `Failed to generate Snaptrade login URL: ${error.message || 'Unknown error'}`
    )
  }
}

/**
 * Get all connected accounts for a user
 * @param {string} userId - Snaptrade user ID
 * @param {string} userSecret - Snaptrade user secret
 * @returns {Promise<Array>} Array of account objects
 */
export async function getAccounts(userId, userSecret) {
  try {
    console.log('🔍 [Snaptrade Client] Fetching accounts:', {
      userId: userId?.substring(0, 20) + '...',
      hasUserSecret: !!userSecret,
    })
    
    const client = getSnaptradeClient()
    const response = await client.accountInformation.listUserAccounts({
      userId,
      userSecret,
    })

    console.log('📦 [Snaptrade Client] Accounts API response:', {
      hasData: !!response.data,
      isArray: Array.isArray(response.data),
      dataType: typeof response.data,
      responseKeys: response.data ? Object.keys(response.data) : [],
    })

    // SDK returns Axios response, extract data property
    const accounts = response.data || response

    console.log('✅ [Snaptrade Client] Accounts extracted:', {
      isArray: Array.isArray(accounts),
      count: Array.isArray(accounts) ? accounts.length : 0,
    })

    return Array.isArray(accounts) ? accounts : []
  } catch (error) {
    console.error('❌ [Snaptrade Client] Error fetching accounts:', {
      error: error,
      message: error.message,
      stack: error.stack,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers,
      } : null,
      request: error.request ? 'Request made but no response' : null,
    })
    
    let errorMessage = error.message || 'Unknown error'
    if (error.response) {
      const status = error.response.status
      const statusText = error.response.statusText
      const errorData = error.response.data
      
      errorMessage = errorData?.message || errorData?.error || `${statusText} (${status})`
      if (errorData) {
        errorMessage += `: ${JSON.stringify(errorData)}`
      }
    } else if (error.request) {
      errorMessage = 'No response from Snaptrade API'
    }
    
    throw new Error(`Failed to fetch Snaptrade accounts: ${errorMessage}`)
  }
}

/**
 * Get account details
 * @param {string} userId - Snaptrade user ID
 * @param {string} userSecret - Snaptrade user secret
 * @param {string} accountId - Account UUID
 * @returns {Promise<Object>} Account details
 */
export async function getAccountDetails(userId, userSecret, accountId) {
  try {
    const client = getSnaptradeClient()
    const response = await client.accountInformation.getUserAccountDetails({
      userId,
      userSecret,
      accountId,
    })

    // SDK returns Axios response, extract data property
    return response.data || response
  } catch (error) {
    console.error('❌ [Snaptrade] Error fetching account details:', error)
    throw new Error(
      `Failed to fetch Snaptrade account details: ${error.message || 'Unknown error'}`
    )
  }
}

/**
 * Get transaction history (activities)
 * @param {string} userId - Snaptrade user ID
 * @param {string} userSecret - Snaptrade user secret
 * @param {Object} options - Query options
 * @param {string} options.startDate - Start date (YYYY-MM-DD)
 * @param {string} options.endDate - End date (YYYY-MM-DD)
 * @param {string} options.accounts - Comma-separated account IDs
 * @param {string} options.type - Transaction type filter (BUY, SELL, etc.)
 * @returns {Promise<Array>} Array of activity/transaction objects
 */
export async function getActivities(userId, userSecret, options = {}) {
  try {
    const client = getSnaptradeClient()
    const response = await client.transactionsAndReporting.getActivities({
      userId,
      userSecret,
      startDate: options.startDate || undefined,
      endDate: options.endDate || undefined,
      accounts: options.accounts || undefined,
      brokerageAuthorizations: options.brokerageAuthorizations || undefined,
      type: options.type || undefined,
    })

    // SDK returns Axios response, extract data property
    const activities = response.data || response

    return Array.isArray(activities) ? activities : []
  } catch (error) {
    console.error('❌ [Snaptrade] Error fetching activities:', error)
    throw new Error(
      `Failed to fetch Snaptrade activities: ${error.message || 'Unknown error'}`
    )
  }
}

/**
 * Get holdings for a specific account (preferred method per Snaptrade docs)
 * @param {string} accountId - Account UUID
 * @param {string} userId - Snaptrade user ID
 * @param {string} userSecret - Snaptrade user secret
 * @returns {Promise<Object>} AccountHoldingsAccount object with account, positions, cash, total_value
 */
export async function getAccountHoldings(accountId, userId, userSecret) {
  try {
    console.log('🔍 [Snaptrade Client] Fetching holdings for account:', {
      accountId: accountId?.substring(0, 20) + '...',
      userId: userId?.substring(0, 20) + '...',
      hasUserSecret: !!userSecret,
    })
    
    const client = getSnaptradeClient()
    const response = await client.accountInformation.getUserHoldings({
      accountId,
      userId,
      userSecret,
    })

    console.log('📦 [Snaptrade Client] Account holdings API response:', {
      hasData: !!response.data,
      dataType: typeof response.data,
      responseKeys: response.data && typeof response.data === 'object' ? Object.keys(response.data) : [],
    })

    // SDK returns Axios response, extract data property
    const holdings = response.data || response

    console.log('✅ [Snaptrade Client] Account holdings extracted:', {
      hasAccount: !!holdings?.account,
      positionsCount: holdings?.positions?.length || 0,
      cashCount: holdings?.cash?.length || 0,
      totalValue: holdings?.total_value,
    })

    return holdings || null
  } catch (error) {
    console.error('❌ [Snaptrade Client] Error fetching account holdings:', {
      accountId,
      error: error,
      message: error.message,
      stack: error.stack,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      } : null,
    })
    
    let errorMessage = error.message || 'Unknown error'
    if (error.response) {
      const status = error.response.status
      const statusText = error.response.statusText
      const errorData = error.response.data
      
      errorMessage = errorData?.message || errorData?.error || `${statusText} (${status})`
      if (errorData) {
        errorMessage += `: ${JSON.stringify(errorData)}`
      }
    } else if (error.request) {
      errorMessage = 'No response from Snaptrade API'
    }
    
    throw new Error(`Failed to fetch Snaptrade account holdings: ${errorMessage}`)
  }
}

/**
 * Get holdings for all accounts (deprecated - use getAccountHoldings per account instead)
 * @param {string} userId - Snaptrade user ID
 * @param {string} userSecret - Snaptrade user secret
 * @param {string} brokerageAuthorizations - Optional comma-separated auth IDs
 * @returns {Promise<Array>} Array of AccountHoldings objects
 */
export async function getHoldings(userId, userSecret, brokerageAuthorizations) {
  try {
    console.log('🔍 [Snaptrade Client] Fetching all holdings (deprecated method):', {
      userId: userId?.substring(0, 20) + '...',
      hasUserSecret: !!userSecret,
      brokerageAuthorizations: brokerageAuthorizations || 'all',
    })
    
    const client = getSnaptradeClient()
    const response = await client.accountInformation.getAllUserHoldings({
      userId,
      userSecret,
      brokerageAuthorizations: brokerageAuthorizations || undefined,
    })

    console.log('📦 [Snaptrade Client] All holdings API response:', {
      hasData: !!response.data,
      isArray: Array.isArray(response.data),
      dataType: typeof response.data,
      responseKeys: response.data && typeof response.data === 'object' ? Object.keys(response.data) : [],
    })

    // SDK returns Axios response, extract data property
    const holdings = response.data || response

    console.log('✅ [Snaptrade Client] All holdings extracted:', {
      isArray: Array.isArray(holdings),
      count: Array.isArray(holdings) ? holdings.length : 0,
      type: typeof holdings,
    })

    return Array.isArray(holdings) ? holdings : []
  } catch (error) {
    console.error('❌ [Snaptrade Client] Error fetching all holdings:', {
      error: error,
      message: error.message,
      stack: error.stack,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers,
      } : null,
      request: error.request ? 'Request made but no response' : null,
    })
    
    let errorMessage = error.message || 'Unknown error'
    if (error.response) {
      const status = error.response.status
      const statusText = error.response.statusText
      const errorData = error.response.data
      
      errorMessage = errorData?.message || errorData?.error || `${statusText} (${status})`
      if (errorData) {
        errorMessage += `: ${JSON.stringify(errorData)}`
      }
    } else if (error.request) {
      errorMessage = 'No response from Snaptrade API'
    }
    
    throw new Error(`Failed to fetch Snaptrade holdings: ${errorMessage}`)
  }
}

/**
 * Get account positions
 * @param {string} userId - Snaptrade user ID
 * @param {string} userSecret - Snaptrade user secret
 * @param {string} accountId - Account UUID
 * @returns {Promise<Array>} Array of position objects
 */
export async function getAccountPositions(userId, userSecret, accountId) {
  try {
    const client = getSnaptradeClient()
    const response = await client.accountInformation.getUserAccountPositions({
      userId,
      userSecret,
      accountId,
    })

    // SDK returns Axios response, extract data property
    const positions = response.data || response

    return Array.isArray(positions) ? positions : []
  } catch (error) {
    console.error('❌ [Snaptrade] Error fetching positions:', error)
    throw new Error(
      `Failed to fetch Snaptrade positions: ${error.message || 'Unknown error'}`
    )
  }
}

/**
 * Get account balances
 * @param {string} userId - Snaptrade user ID
 * @param {string} userSecret - Snaptrade user secret
 * @param {string} accountId - Account UUID
 * @returns {Promise<Object>} Balance data
 */
export async function getAccountBalances(userId, userSecret, accountId) {
  try {
    const client = getSnaptradeClient()
    const response = await client.accountInformation.getUserAccountBalance({
      userId,
      userSecret,
      accountId,
    })

    // SDK returns Axios response, extract data property
    const balances = response.data || response

    return balances || null
  } catch (error) {
    console.error('❌ [Snaptrade] Error fetching balances:', error)
    throw new Error(
      `Failed to fetch Snaptrade balances: ${error.message || 'Unknown error'}`
    )
  }
}

/**
 * Delete a Snaptrade user
 * @param {string} userId - Snaptrade user ID
 * @returns {Promise<Object>} Deletion status
 */
export async function deleteSnaptradeUser(userId) {
  try {
    const client = getSnaptradeClient()
    const response = await client.authentication.deleteSnapTradeUser({
      userId,
    })

    // SDK returns Axios response, extract data property
    return response.data || response
  } catch (error) {
    console.error('❌ [Snaptrade] Error deleting user:', error)
    throw new Error(
      `Failed to delete Snaptrade user: ${error.message || 'Unknown error'}`
    )
  }
}

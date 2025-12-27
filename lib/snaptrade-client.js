// lib/snaptrade-client.js
// Snaptrade SDK wrapper for TradeClarity
import { Snaptrade } from 'snaptrade-typescript-sdk'

let snaptradeClient = null

/**
 * Reset the cached SnapTrade client (useful for testing or credential updates)
 */
export function resetSnaptradeClient() {
  snaptradeClient = null
  console.log('🔄 [Snaptrade Client] Client cache reset')
}

/**
 * Initialize and get Snaptrade client instance
 * Uses singleton pattern to reuse client
 */
export function getSnaptradeClient() {
  const consumerKey = process.env.SNAPTRADE_CONSUMER_KEY
  const clientId = process.env.SNAPTRADE_CLIENT_ID
  
  if (!consumerKey || !clientId) {
    const errorMsg = 'Snaptrade credentials not configured. Missing SNAPTRADE_CONSUMER_KEY or SNAPTRADE_CLIENT_ID'
    const allSnaptradeKeys = Object.keys(process.env).filter(k => k.includes('SNAPTRADE'))
    console.error('❌ [Snaptrade Client]', errorMsg, {
      hasConsumerKey: !!consumerKey,
      hasClientId: !!clientId,
      envKeys: allSnaptradeKeys,
      availableKeys: allSnaptradeKeys,
      // Log first few chars to help debug (without exposing full key)
      consumerKeyPreview: consumerKey ? `${consumerKey.substring(0, 8)}...` : 'NOT SET',
      clientIdPreview: clientId ? `${clientId.substring(0, 8)}...` : 'NOT SET',
    })
    throw new Error(errorMsg)
  }

  // Optional basePath for production/test environment
  // SDK default is https://api.snaptrade.com/api/v1 (production)
  // Only set if you need to override (e.g., for sandbox/testing)
  const basePath = process.env.SNAPTRADE_BASE_PATH
  
  // Return cached client if it exists (singleton pattern)
  // Note: In production, env vars don't change, so caching is safe
  if (snaptradeClient) {
    return snaptradeClient
  }

  console.log('🔧 [Snaptrade Client] Initializing client:', {
    hasConsumerKey: !!consumerKey,
    hasClientId: !!clientId,
    consumerKeyPrefix: consumerKey ? consumerKey.substring(0, 15) + '...' : 'missing',
    consumerKeyLength: consumerKey?.length,
    consumerKeyEndsWith: consumerKey ? '...' + consumerKey.substring(consumerKey.length - 5) : 'N/A',
    clientId,
    clientIdLength: clientId?.length,
    basePath: basePath || 'default (https://api.snaptrade.com/api/v1 - production)',
    environment: process.env.NODE_ENV,
  })
  
  // Validate credential format
  if (consumerKey) {
    if (consumerKey.length < 20) {
      console.warn('⚠️ [Snaptrade Client] Consumer key seems too short. Expected production key length > 20 characters.')
    }
    // Check if it looks like a test key (common patterns)
    if (consumerKey.toLowerCase().includes('test') || consumerKey.toLowerCase().includes('sandbox')) {
      console.warn('⚠️ [Snaptrade Client] Consumer key contains "test" or "sandbox" - may be test credentials!')
    }
  }
  if (clientId) {
    if (!clientId.includes('-')) {
      console.warn('⚠️ [Snaptrade Client] Client ID format may be incorrect. Expected format: TRADE-*-*')
    }
    // Check if it looks like a test client ID
    if (clientId.toLowerCase().includes('test') || clientId.toLowerCase().includes('sandbox')) {
      console.warn('⚠️ [Snaptrade Client] Client ID contains "test" or "sandbox" - may be test credentials!')
    }
  }

  const config = {
    consumerKey,
    clientId,
  }
  
  // Only set basePath if explicitly provided (let SDK use default production endpoint)
  if (basePath) {
    config.basePath = basePath
    console.log('⚠️ [Snaptrade Client] Using custom basePath:', basePath)
  }

  try {
    // Log config (without exposing full credentials)
    console.log('🔧 [Snaptrade Client] Creating SDK instance with config:', {
      hasConsumerKey: !!config.consumerKey,
      consumerKeyLength: config.consumerKey?.length,
      consumerKeyPrefix: config.consumerKey?.substring(0, 8) + '...',
      hasClientId: !!config.clientId,
      clientId: config.clientId,
      hasBasePath: !!config.basePath,
      basePath: config.basePath,
    })
    
    snaptradeClient = new Snaptrade(config)
    
    // Verify the client was created correctly
    if (!snaptradeClient) {
      throw new Error('SDK client is null after initialization')
    }
    
    console.log('✅ [Snaptrade Client] Client initialized successfully', {
      clientId: clientId?.substring(0, 12) + '...',
      consumerKeyLength: consumerKey?.length,
      basePath: config.basePath || 'default (https://api.snaptrade.com/api/v1)',
      clientType: typeof snaptradeClient,
      hasAuthentication: !!snaptradeClient.authentication,
    })
  } catch (initError) {
    console.error('❌ [Snaptrade Client] Failed to initialize SDK:', {
      error: initError.message,
      stack: initError.stack,
      configKeys: Object.keys(config),
      configHasConsumerKey: !!config.consumerKey,
      configHasClientId: !!config.clientId,
    })
    throw new Error(`Failed to initialize SnapTrade SDK: ${initError.message}`)
  }

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

    let client
    try {
      client = getSnaptradeClient()
    } catch (clientError) {
      console.error('❌ [Snaptrade] Failed to initialize client:', clientError)
      throw new Error(`Snaptrade client initialization failed: ${clientError.message}`)
    }
    
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
    let client
    try {
      client = getSnaptradeClient()
    } catch (clientError) {
      console.error('❌ [Snaptrade] Failed to initialize client:', clientError)
      throw new Error(`Snaptrade client initialization failed: ${clientError.message}`)
    }
    
    console.log('🔗 [Snaptrade] Generating login URL with params:', {
      userId: userId?.substring(0, 20) + '...',
      hasUserSecret: !!userSecret,
      broker: options.broker,
      customRedirect: options.customRedirect?.substring(0, 50) + '...',
      connectionType: options.connectionType,
    })
    
    console.log('🔗 [Snaptrade] Calling loginSnapTradeUser API with:', {
      userId: userId?.substring(0, 20) + '...',
      hasUserSecret: !!userSecret,
      userSecretLength: userSecret?.length,
      broker: options.broker,
      immediateRedirect: options.immediateRedirect ?? true,
      customRedirect: options.customRedirect ? options.customRedirect.substring(0, 50) + '...' : undefined,
      connectionType: options.connectionType || 'read',
      connectionPortalVersion: 'v3',
    })

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

    console.log('📦 [Snaptrade] Raw API response:', {
      hasResponse: !!response,
      responseType: typeof response,
      hasData: !!response?.data,
      responseKeys: response ? Object.keys(response) : [],
      dataKeys: response?.data ? Object.keys(response.data) : [],
      status: response?.status,
      statusText: response?.statusText,
    })

    // SDK returns Axios response, extract data property
    const data = response?.data || response

    if (!data) {
      throw new Error('No data returned from SnapTrade API')
    }

    if (!data.redirectURI) {
      console.error('❌ [Snaptrade] Missing redirectURI in response:', {
        data,
        dataKeys: Object.keys(data),
      })
      throw new Error('Invalid response from SnapTrade API: missing redirectURI')
    }

    console.log('✅ [Snaptrade] Login URL generated successfully:', {
      hasRedirectURI: !!data.redirectURI,
      redirectURIPrefix: data.redirectURI?.substring(0, 50) + '...',
      hasSessionId: !!data.sessionId,
    })

    return {
      redirectURI: data.redirectURI,
      sessionId: data.sessionId,
    }
  } catch (error) {
    console.error('❌ [Snaptrade] Error generating login URL:', {
      error,
      message: error.message,
      stack: error.stack,
      name: error.name,
    })
    
    // Extract detailed error information
    let errorMessage = error.message || 'Unknown error'
    let errorDetails = null
    let apiErrorBody = null
    
    if (error.response) {
      const status = error.response.status
      const statusText = error.response.statusText
      const responseData = error.response.data
      const requestHeaders = error.config?.headers || {}
      
      // Log response body if available
      let responseBody = null
      if (error.response?.data) {
        try {
          responseBody = typeof error.response.data === 'string' 
            ? JSON.parse(error.response.data) 
            : error.response.data
        } catch (e) {
          responseBody = error.response.data
        }
      }
      
      console.error('❌ [Snaptrade] API Error Response Details:', {
        status,
        statusText,
        responseData,
        responseBody,
        requestUrl: error.config?.url,
        requestMethod: error.config?.method,
        requestParams: error.config?.params,
        requestData: error.config?.data,
        requestHeaders: {
          ...requestHeaders,
          // Don't log full auth headers, just check if they exist
          hasAuthorization: !!requestHeaders.Authorization,
          hasConsumerKey: !!requestHeaders['consumer-key'],
          hasClientId: !!requestHeaders['client-id'],
          hasSignature: !!requestHeaders.Signature,
          headerKeys: Object.keys(requestHeaders),
        },
      })
      
      // For 401 errors, log more details about credentials
      if (status === 401) {
        console.error('❌ [Snaptrade] 401 Authentication Failed - Credential Check:', {
          hasConsumerKey: !!consumerKey,
          consumerKeyLength: consumerKey?.length,
          consumerKeyPrefix: consumerKey ? consumerKey.substring(0, 8) + '...' : 'NOT SET',
          hasClientId: !!clientId,
          clientId: clientId,
          responseBody: responseBody,
        })
      }
      
      // Log the full error response for debugging
      console.error('❌ [Snaptrade] Full API Error Response:', {
        status,
        statusText,
        data: responseData,
        dataType: typeof responseData,
        dataString: typeof responseData === 'string' ? responseData : JSON.stringify(responseData),
        headers: error.response.headers,
      })
      
      // Extract the actual error message from response body
      if (responseData) {
        apiErrorBody = responseData
        
        // Try different ways to extract the error message
        if (typeof responseData === 'string') {
          errorDetails = responseData
          // Try to parse if it's JSON string
          try {
            const parsed = JSON.parse(responseData)
            if (parsed.error || parsed.message) {
              errorDetails = parsed.error || parsed.message
            }
          } catch (e) {
            // Not JSON, use as-is
          }
        } else if (responseData.error) {
          errorDetails = typeof responseData.error === 'string' 
            ? responseData.error 
            : responseData.error.message || JSON.stringify(responseData.error)
          errorMessage = errorDetails
        } else if (responseData.message) {
          errorDetails = responseData.message
          errorMessage = responseData.message
        } else if (responseData.detail) {
          errorDetails = responseData.detail
          errorMessage = responseData.detail
        } else {
          errorDetails = JSON.stringify(responseData, null, 2)
        }
      }
      
      // Provide specific error messages for common status codes
      if (status === 401) {
        const baseMessage = 'Snaptrade API authentication failed (401 Unauthorized)'
        const credentialCheck = '\n\nPlease verify:\n1. SNAPTRADE_CONSUMER_KEY and SNAPTRADE_CLIENT_ID are set correctly on Vercel\n2. The credentials are PRODUCTION credentials (not test/sandbox)\n3. The credentials match what\'s in your SnapTrade dashboard'
        
        if (errorDetails) {
          errorMessage = `${baseMessage}${credentialCheck}\n\nSnapTrade API Error: ${typeof errorDetails === 'string' ? errorDetails : JSON.stringify(errorDetails, null, 2)}`
        } else {
          errorMessage = `${baseMessage}${credentialCheck}\n\nNo additional error details provided by API. Response body length: ${error.response.headers['content-length'] || 'unknown'}`
        }
      } else if (status === 403) {
        errorMessage = `Snaptrade API access forbidden (403). ${errorDetails ? `Details: ${errorDetails}` : ''}`
      } else if (status === 404) {
        errorMessage = `Snaptrade API endpoint not found (404). ${errorDetails ? `Details: ${errorDetails}` : ''}`
      }
    } else if (error.request) {
      errorMessage = 'No response received from Snaptrade API. Please check your network connection.'
    }
    
    // Include the original error details in the thrown error
    const finalError = new Error(`Failed to generate Snaptrade login URL: ${errorMessage}`)
    if (apiErrorBody) {
      finalError.apiErrorBody = apiErrorBody
    }
    throw finalError
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

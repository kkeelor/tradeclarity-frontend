// lib/ai/deepseek-client.js
/**
 * DeepSeek API Client for TradeClarity
 * 
 * OpenAI-compatible API client for DeepSeek models.
 * Supports both standard chat and reasoning models.
 */

const DEEPSEEK_API_BASE = 'https://api.deepseek.com/v1'

/**
 * Initialize DeepSeek client (lazy-loaded)
 */
function getDeepSeekApiKey() {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable is not set')
  }
  return apiKey
}

/**
 * Create a streaming chat completion with DeepSeek
 * 
 * @param {Object} options
 * @param {string} options.model - Model ID (deepseek-chat or deepseek-reasoner)
 * @param {Array} options.messages - Array of message objects {role, content}
 * @param {number} options.maxTokens - Max tokens in response
 * @param {number} options.temperature - Randomness (0-1)
 * @param {Array} options.tools - Optional tools/function calling (if supported)
 * @returns {AsyncGenerator} Stream of response chunks
 */
export async function* createDeepSeekStream({
  model,
  messages,
  maxTokens = 2000,
  temperature = 0.7,
  tools = null
}) {
  const apiKey = getDeepSeekApiKey()

  const requestBody = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
    stream: true
  }

  // Add tools if provided (verify DeepSeek supports this)
  if (tools && Array.isArray(tools) && tools.length > 0) {
    requestBody.tools = tools
  }

  const response = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  // Log successful response start (dev only)
  if (response.ok && process.env.NODE_ENV === 'development') {
    console.log('[DeepSeek] API connected', { model })
  }

  if (!response.ok) {
    const errorText = await response.text()
    let errorData
    try {
      errorData = JSON.parse(errorText)
    } catch {
      errorData = { error: { message: errorText } }
    }

    const error = new Error(errorData.error?.message || `DeepSeek API error: ${response.status}`)
    error.status = response.status
    error.statusCode = response.status
    error.errorData = errorData

    // Map DeepSeek error codes
    if (response.status === 401) {
      error.message = 'DeepSeek API authentication failed. Check API key.'
    } else if (response.status === 402) {
      error.message = 'DeepSeek API quota exceeded or insufficient balance.'
    } else if (response.status === 429) {
      error.message = 'DeepSeek API rate limit exceeded. Please try again later.'
    }

    throw error
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      
      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.trim() === '') continue
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            return
          }

          try {
            const parsed = JSON.parse(data)
            yield parsed
          } catch (e) {
            console.warn('[DeepSeek] Failed to parse SSE data:', data)
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * Create a non-streaming chat completion with DeepSeek
 * 
 * @param {Object} options - Same as createDeepSeekStream
 * @returns {Promise<Object>} Complete response with content and usage
 */
export async function createDeepSeekCompletion({
  model,
  messages,
  maxTokens = 2000,
  temperature = 0.7,
  tools = null
}) {
  const apiKey = getDeepSeekApiKey()

  const requestBody = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature
  }

  if (tools && Array.isArray(tools) && tools.length > 0) {
    requestBody.tools = tools
  }

  const response = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorData
    try {
      errorData = JSON.parse(errorText)
    } catch {
      errorData = { error: { message: errorText } }
    }

    const error = new Error(errorData.error?.message || `DeepSeek API error: ${response.status}`)
    error.status = response.status
    error.statusCode = response.status
    error.errorData = errorData

    if (response.status === 401) {
      error.message = 'DeepSeek API authentication failed. Check API key.'
    } else if (response.status === 402) {
      error.message = 'DeepSeek API quota exceeded or insufficient balance.'
    } else if (response.status === 429) {
      error.message = 'DeepSeek API rate limit exceeded. Please try again later.'
    }

    throw error
  }

  const data = await response.json()
  return data
}

/**
 * Check if DeepSeek is properly configured
 */
export function isDeepSeekConfigured() {
  return !!process.env.DEEPSEEK_API_KEY
}

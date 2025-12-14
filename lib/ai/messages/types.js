// lib/ai/messages/types.js
/**
 * Unified Message Format and Transformers
 * 
 * Provides a canonical message format for internal use and
 * transformers to convert to/from provider-specific formats.
 * 
 * Internal Format:
 * {
 *   id: string,
 *   role: 'user' | 'assistant' | 'system' | 'tool',
 *   content: string | ContentBlock[],
 *   timestamp: Date,
 *   metadata?: { toolUse?, tokens?, provider? }
 * }
 * 
 * @see docs/MULTI_MODEL_ARCHITECTURE.md
 */

import { PROVIDERS, getProvider, getToolFormat, TOOL_FORMATS } from '../models/registry.js'

/**
 * Generate a unique message ID
 */
export function generateMessageId() {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Create a canonical user message
 * 
 * @param {string} content - Message content
 * @param {Object} options - Additional options
 * @returns {Object} Canonical message object
 */
export function createUserMessage(content, options = {}) {
  return {
    id: options.id || generateMessageId(),
    role: 'user',
    content: content,
    timestamp: options.timestamp || new Date(),
    metadata: options.metadata || {}
  }
}

/**
 * Create a canonical assistant message
 * 
 * @param {string} content - Message content
 * @param {Object} options - Additional options
 * @returns {Object} Canonical message object
 */
export function createAssistantMessage(content, options = {}) {
  return {
    id: options.id || generateMessageId(),
    role: 'assistant',
    content: content,
    timestamp: options.timestamp || new Date(),
    metadata: {
      tokens: options.tokens || null,
      provider: options.provider || null,
      model: options.model || null,
      ...options.metadata
    }
  }
}

/**
 * Create a canonical system message
 * 
 * @param {string} content - System prompt content
 * @returns {Object} Canonical message object
 */
export function createSystemMessage(content) {
  return {
    id: generateMessageId(),
    role: 'system',
    content: content,
    timestamp: new Date(),
    metadata: {}
  }
}

/**
 * Create a canonical tool result message
 * 
 * @param {Object} options - Tool result options
 * @param {string} options.toolUseId - ID of the tool use request
 * @param {string} options.toolName - Name of the tool
 * @param {string|Object} options.result - Tool execution result
 * @param {boolean} options.isError - Whether this is an error result
 * @returns {Object} Canonical message object
 */
export function createToolResultMessage({ toolUseId, toolName, result, isError = false }) {
  return {
    id: generateMessageId(),
    role: 'tool',
    content: typeof result === 'string' ? result : JSON.stringify(result),
    timestamp: new Date(),
    metadata: {
      toolUseId,
      toolName,
      isError
    }
  }
}

/**
 * Transform canonical messages to provider-specific format
 * 
 * @param {Array} messages - Array of canonical messages
 * @param {string} modelId - Target model identifier
 * @returns {Array} Provider-formatted messages
 */
export function transformMessagesForProvider(messages, modelId) {
  const provider = getProvider(modelId)
  
  if (!provider) {
    console.warn(`[MessageTransformer] Unknown model: ${modelId}, using Anthropic format`)
    return transformMessagesForAnthropic(messages)
  }
  
  switch (provider) {
    case PROVIDERS.ANTHROPIC:
      return transformMessagesForAnthropic(messages)
    case PROVIDERS.DEEPSEEK:
      return transformMessagesForOpenAI(messages)
    default:
      return transformMessagesForOpenAI(messages) // Default to OpenAI format
  }
}

/**
 * Transform canonical messages to Anthropic format
 * 
 * @param {Array} messages - Canonical messages
 * @returns {Array} Anthropic-formatted messages
 */
function transformMessagesForAnthropic(messages) {
  return messages
    .filter(msg => msg.role !== 'system') // System handled separately
    .map(msg => {
      // Handle tool result messages
      if (msg.role === 'tool') {
        return {
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: msg.metadata?.toolUseId,
            content: msg.content,
            is_error: msg.metadata?.isError || false
          }]
        }
      }
      
      // Handle messages with tool use content blocks
      if (msg.metadata?.toolUse) {
        return {
          role: 'assistant',
          content: [{
            type: 'tool_use',
            id: msg.metadata.toolUse.id,
            name: msg.metadata.toolUse.name,
            input: msg.metadata.toolUse.input
          }]
        }
      }
      
      // Standard text message
      return {
        role: msg.role,
        content: msg.content
      }
    })
}

/**
 * Transform canonical messages to OpenAI format (used by DeepSeek)
 * 
 * @param {Array} messages - Canonical messages
 * @returns {Array} OpenAI-formatted messages
 */
function transformMessagesForOpenAI(messages) {
  return messages.map(msg => {
    // Handle tool result messages
    if (msg.role === 'tool') {
      return {
        role: 'tool',
        tool_call_id: msg.metadata?.toolUseId,
        content: msg.content
      }
    }
    
    // Handle messages with tool use (assistant requesting tool)
    if (msg.metadata?.toolUse) {
      return {
        role: 'assistant',
        content: null,
        tool_calls: [{
          id: msg.metadata.toolUse.id,
          type: 'function',
          function: {
            name: msg.metadata.toolUse.name,
            arguments: JSON.stringify(msg.metadata.toolUse.input)
          }
        }]
      }
    }
    
    // Standard text message
    return {
      role: msg.role,
      content: msg.content
    }
  })
}

/**
 * Parse provider response into canonical format
 * 
 * @param {Object} response - Provider response object
 * @param {string} modelId - Model that generated the response
 * @returns {Object} Canonical message object
 */
export function parseProviderResponse(response, modelId) {
  const provider = getProvider(modelId)
  
  if (provider === PROVIDERS.ANTHROPIC) {
    return parseAnthropicResponse(response, modelId)
  }
  
  if (provider === PROVIDERS.DEEPSEEK) {
    return parseOpenAIResponse(response, modelId)
  }
  
  // Default to OpenAI format
  return parseOpenAIResponse(response, modelId)
}

/**
 * Parse Anthropic response into canonical format
 */
function parseAnthropicResponse(response, modelId) {
  const message = createAssistantMessage('', {
    provider: PROVIDERS.ANTHROPIC,
    model: modelId,
    tokens: response.usage ? {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens
    } : null
  })
  
  // Extract content
  if (response.content && Array.isArray(response.content)) {
    const textBlocks = response.content.filter(b => b.type === 'text')
    const toolBlocks = response.content.filter(b => b.type === 'tool_use')
    
    message.content = textBlocks.map(b => b.text).join('\n')
    
    if (toolBlocks.length > 0) {
      message.metadata.toolCalls = toolBlocks.map(b => ({
        id: b.id,
        name: b.name,
        input: b.input
      }))
    }
  } else if (typeof response.content === 'string') {
    message.content = response.content
  }
  
  return message
}

/**
 * Parse OpenAI response into canonical format
 */
function parseOpenAIResponse(response, modelId) {
  const choice = response.choices?.[0]
  const msg = choice?.message || {}
  
  const message = createAssistantMessage(msg.content || '', {
    provider: getProvider(modelId),
    model: modelId,
    tokens: response.usage ? {
      input: response.usage.prompt_tokens,
      output: response.usage.completion_tokens
    } : null
  })
  
  // Extract tool calls
  if (msg.tool_calls && msg.tool_calls.length > 0) {
    message.metadata.toolCalls = msg.tool_calls.map(tc => ({
      id: tc.id,
      name: tc.function?.name,
      input: tc.function?.arguments ? JSON.parse(tc.function.arguments) : {}
    }))
  }
  
  return message
}

/**
 * Validate a canonical message object
 * 
 * @param {Object} message - Message to validate
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateMessage(message) {
  const errors = []
  
  if (!message) {
    return { valid: false, errors: ['Message is null or undefined'] }
  }
  
  if (!message.role) {
    errors.push('Missing required field: role')
  } else if (!['user', 'assistant', 'system', 'tool'].includes(message.role)) {
    errors.push(`Invalid role: ${message.role}`)
  }
  
  if (message.content === undefined || message.content === null) {
    // Content can be null for assistant messages with tool_calls in OpenAI format
    if (message.role !== 'assistant' || !message.metadata?.toolCalls) {
      errors.push('Missing required field: content')
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Trim messages array to fit within token limit
 * Keeps system message, recent messages, preserves conversation flow
 * 
 * @param {Array} messages - Array of messages
 * @param {number} maxTokens - Maximum total tokens
 * @param {Function} tokenCounter - Function to estimate tokens for a message
 * @returns {Array} Trimmed messages array
 */
export function trimMessagesToFit(messages, maxTokens, tokenCounter = estimateMessageTokens) {
  if (!messages || messages.length === 0) return []
  
  // Separate system messages (always keep)
  const systemMessages = messages.filter(m => m.role === 'system')
  const conversationMessages = messages.filter(m => m.role !== 'system')
  
  // Calculate system message tokens
  let totalTokens = systemMessages.reduce((sum, m) => sum + tokenCounter(m), 0)
  
  // Add messages from most recent, working backwards
  const keptMessages = []
  for (let i = conversationMessages.length - 1; i >= 0; i--) {
    const msg = conversationMessages[i]
    const msgTokens = tokenCounter(msg)
    
    if (totalTokens + msgTokens <= maxTokens) {
      keptMessages.unshift(msg)
      totalTokens += msgTokens
    } else {
      break // Stop when we can't fit more
    }
  }
  
  return [...systemMessages, ...keptMessages]
}

/**
 * Estimate token count for a message
 * Rough approximation: 1 token ≈ 4 characters
 * 
 * @param {Object} message - Message object
 * @returns {number} Estimated token count
 */
export function estimateMessageTokens(message) {
  if (!message) return 0
  
  let text = ''
  
  if (typeof message.content === 'string') {
    text = message.content
  } else if (Array.isArray(message.content)) {
    text = message.content
      .filter(b => b.type === 'text' || b.text)
      .map(b => b.text || b.content || '')
      .join('\n')
  }
  
  // Add overhead for role and metadata
  const overhead = 10
  
  return Math.ceil(text.length / 4) + overhead
}

/**
 * Extract conversation for summarization
 * Returns messages suitable for generating a summary
 * 
 * @param {Array} messages - Full message history
 * @param {number} maxMessages - Maximum messages to include
 * @returns {Array} Messages for summarization
 */
export function extractForSummarization(messages, maxMessages = 20) {
  return messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-maxMessages)
    .map(m => ({
      role: m.role,
      content: typeof m.content === 'string' 
        ? m.content.substring(0, 500) // Truncate long messages
        : m.content
    }))
}

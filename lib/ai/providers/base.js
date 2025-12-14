// lib/ai/providers/base.js
/**
 * Provider Base Class
 * 
 * Abstract base for LLM providers. Extend this class to add new providers.
 * Provides a standardized interface for:
 * - Streaming completions
 * - Non-streaming completions
 * - Tool/function calling
 * - Error handling
 * 
 * @see docs/MULTI_MODEL_ARCHITECTURE.md
 */

import { PROVIDERS, getModel, TOOL_FORMATS } from '../models/registry.js'
import { transformToolsForModel } from '../tools/transformer.js'
import { blocksToString, isCachedBlockFormat } from '../prompts/compiler.js'

/**
 * Abstract base class for LLM providers
 * 
 * Subclasses must implement:
 * - _createStreamInternal()
 * - _createCompletionInternal()
 * - _normalizeStreamEvent()
 */
export class BaseProvider {
  constructor(config = {}) {
    this.providerId = config.providerId || 'unknown'
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl
    this.defaultModel = config.defaultModel
    this.toolFormat = config.toolFormat || TOOL_FORMATS.OPENAI
    this.supportsCaching = config.supportsCaching || false
  }

  /**
   * Check if provider is properly configured
   * @returns {boolean}
   */
  isConfigured() {
    return !!this.apiKey
  }

  /**
   * Create a streaming completion
   * 
   * @param {Object} options - Completion options
   * @returns {AsyncGenerator} Stream of normalized events
   */
  async *createStream(options) {
    this._validateOptions(options)
    
    // Prepare system prompt for this provider
    const system = this._prepareSystemPrompt(options.system)
    
    // Transform tools if needed
    const tools = options.tools 
      ? transformToolsForModel(options.tools, options.model)
      : null
    
    // Prepare messages
    const messages = this._prepareMessages(options.messages, system)
    
    // Call provider-specific implementation
    const stream = this._createStreamInternal({
      ...options,
      messages,
      system: this.supportsCaching ? options.system : null, // Only pass if caching supported
      tools
    })
    
    // Normalize events to standard format
    for await (const event of stream) {
      const normalized = this._normalizeStreamEvent(event)
      if (normalized) {
        yield normalized
      }
    }
  }

  /**
   * Create a non-streaming completion
   * 
   * @param {Object} options - Completion options
   * @returns {Promise<Object>} Completion result
   */
  async createCompletion(options) {
    this._validateOptions(options)
    
    const system = this._prepareSystemPrompt(options.system)
    const tools = options.tools 
      ? transformToolsForModel(options.tools, options.model)
      : null
    const messages = this._prepareMessages(options.messages, system)
    
    const response = await this._createCompletionInternal({
      ...options,
      messages,
      system: this.supportsCaching ? options.system : null,
      tools
    })
    
    return this._normalizeCompletionResponse(response)
  }

  /**
   * Prepare system prompt for this provider
   * @protected
   */
  _prepareSystemPrompt(system) {
    if (!system) return null
    
    // If provider doesn't support caching, convert to plain string
    if (!this.supportsCaching && isCachedBlockFormat(system)) {
      return blocksToString(system)
    }
    
    return system
  }

  /**
   * Prepare messages array for this provider
   * @protected
   */
  _prepareMessages(messages, system) {
    // Filter out system messages (handled separately)
    let prepared = messages.filter(m => m.role !== 'system')
    
    // For non-caching providers, prepend system as first message
    if (system && !this.supportsCaching) {
      prepared = [
        { role: 'system', content: system },
        ...prepared
      ]
    }
    
    return prepared
  }

  /**
   * Validate options before making API call
   * @protected
   */
  _validateOptions(options) {
    if (!options.model) {
      throw new Error('Model is required')
    }
    
    if (!options.messages || options.messages.length === 0) {
      throw new Error('Messages array is required and must not be empty')
    }
    
    if (!this.isConfigured()) {
      throw new Error(`${this.providerId} provider is not configured (missing API key)`)
    }
  }

  /**
   * Create streaming completion - MUST BE IMPLEMENTED BY SUBCLASS
   * @protected
   * @abstract
   */
  async *_createStreamInternal(options) {
    throw new Error('_createStreamInternal must be implemented by subclass')
  }

  /**
   * Create non-streaming completion - MUST BE IMPLEMENTED BY SUBCLASS
   * @protected
   * @abstract
   */
  async _createCompletionInternal(options) {
    throw new Error('_createCompletionInternal must be implemented by subclass')
  }

  /**
   * Normalize a stream event to standard format
   * @protected
   * @abstract
   */
  _normalizeStreamEvent(event) {
    throw new Error('_normalizeStreamEvent must be implemented by subclass')
  }

  /**
   * Normalize completion response to standard format
   * @protected
   */
  _normalizeCompletionResponse(response) {
    // Default implementation - subclasses can override
    return {
      content: response.content || '',
      usage: {
        input_tokens: response.usage?.input_tokens || response.usage?.prompt_tokens || 0,
        output_tokens: response.usage?.output_tokens || response.usage?.completion_tokens || 0
      },
      toolCalls: response.toolCalls || [],
      stopReason: response.stopReason || response.stop_reason || 'end_turn',
      provider: this.providerId,
      model: response.model
    }
  }

  /**
   * Handle API errors with standardized error types
   * @protected
   */
  _handleError(error) {
    const status = error.status || error.statusCode
    
    // Map common error codes
    if (status === 401 || status === 403) {
      const e = new Error(`${this.providerId} authentication failed. Check API key.`)
      e.type = 'auth_error'
      e.status = status
      throw e
    }
    
    if (status === 429) {
      const e = new Error(`${this.providerId} rate limit exceeded. Please try again later.`)
      e.type = 'rate_limit'
      e.status = status
      throw e
    }
    
    if (status === 402) {
      const e = new Error(`${this.providerId} quota exceeded or insufficient balance.`)
      e.type = 'quota_exceeded'
      e.status = status
      throw e
    }
    
    if (status >= 500) {
      const e = new Error(`${this.providerId} service temporarily unavailable.`)
      e.type = 'server_error'
      e.status = status
      throw e
    }
    
    // Re-throw unknown errors
    throw error
  }
}

/**
 * Standard stream event types
 * All providers normalize to these types
 */
export const STREAM_EVENTS = {
  TEXT_DELTA: 'text_delta',
  TOOL_USE_START: 'tool_use_start',
  TOOL_USE_DELTA: 'tool_use_delta',
  TOOL_USE_END: 'tool_use_end',
  MESSAGE_START: 'message_start',
  MESSAGE_END: 'message_end',
  ERROR: 'error'
}

/**
 * Create a standard text delta event
 */
export function createTextDeltaEvent(text) {
  return {
    type: STREAM_EVENTS.TEXT_DELTA,
    text
  }
}

/**
 * Create a standard tool use start event
 */
export function createToolUseStartEvent(id, name) {
  return {
    type: STREAM_EVENTS.TOOL_USE_START,
    id,
    name
  }
}

/**
 * Create a standard tool use delta event (for streaming arguments)
 */
export function createToolUseDeltaEvent(id, argumentsDelta) {
  return {
    type: STREAM_EVENTS.TOOL_USE_DELTA,
    id,
    argumentsDelta
  }
}

/**
 * Create a standard tool use end event
 */
export function createToolUseEndEvent(id, name, input) {
  return {
    type: STREAM_EVENTS.TOOL_USE_END,
    id,
    name,
    input
  }
}

/**
 * Create a standard message end event with usage
 */
export function createMessageEndEvent(usage) {
  return {
    type: STREAM_EVENTS.MESSAGE_END,
    usage: {
      input_tokens: usage?.input_tokens || usage?.prompt_tokens || 0,
      output_tokens: usage?.output_tokens || usage?.completion_tokens || 0
    }
  }
}

/**
 * Create a standard error event
 */
export function createErrorEvent(message, code) {
  return {
    type: STREAM_EVENTS.ERROR,
    error: {
      message,
      code
    }
  }
}

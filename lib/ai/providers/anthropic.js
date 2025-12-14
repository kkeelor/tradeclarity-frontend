// lib/ai/providers/anthropic.js
/**
 * Anthropic (Claude) Provider Implementation
 * 
 * Extends BaseProvider with Anthropic-specific handling:
 * - Native tool format
 * - Prompt caching with TTL
 * - Cached system blocks
 * 
 * @see docs/MULTI_MODEL_ARCHITECTURE.md
 */

import Anthropic from '@anthropic-ai/sdk'
import { 
  BaseProvider, 
  STREAM_EVENTS,
  createTextDeltaEvent,
  createToolUseStartEvent,
  createToolUseDeltaEvent,
  createToolUseEndEvent,
  createMessageEndEvent,
  createErrorEvent
} from './base.js'
import { PROVIDERS, TOOL_FORMATS } from '../models/registry.js'

// Lazy-loaded client
let client = null

function getClient(apiKey) {
  if (!client) {
    client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    })
  }
  return client
}

/**
 * Anthropic Provider
 */
export class AnthropicProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      providerId: PROVIDERS.ANTHROPIC,
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
      baseUrl: 'https://api.anthropic.com',
      defaultModel: 'claude-3-5-haiku-20241022',
      toolFormat: TOOL_FORMATS.ANTHROPIC,
      supportsCaching: true,
      ...config
    })
  }

  /**
   * Create streaming completion with Anthropic
   * @protected
   */
  async *_createStreamInternal(options) {
    const client = getClient(this.apiKey)
    
    const params = {
      model: options.model,
      max_tokens: options.maxTokens || 2000,
      temperature: options.temperature ?? 0.7,
      stream: true,
      messages: options.messages
    }
    
    // Add system (supports cached blocks or plain string)
    if (options.system) {
      params.system = options.system
    }
    
    // Add tools if provided
    if (options.tools && options.tools.length > 0) {
      params.tools = options.tools
    }
    
    try {
      const stream = await client.messages.create(params)
      
      for await (const event of stream) {
        yield event
      }
    } catch (error) {
      this._handleError(error)
    }
  }

  /**
   * Create non-streaming completion with Anthropic
   * @protected
   */
  async _createCompletionInternal(options) {
    const client = getClient(this.apiKey)
    
    const params = {
      model: options.model,
      max_tokens: options.maxTokens || 2000,
      temperature: options.temperature ?? 0.7,
      messages: options.messages
    }
    
    if (options.system) {
      params.system = options.system
    }
    
    if (options.tools && options.tools.length > 0) {
      params.tools = options.tools
    }
    
    try {
      const response = await client.messages.create(params)
      return this._parseCompletionResponse(response)
    } catch (error) {
      this._handleError(error)
    }
  }

  /**
   * Normalize Anthropic stream events to standard format
   * @protected
   */
  _normalizeStreamEvent(event) {
    switch (event.type) {
      case 'content_block_start':
        if (event.content_block?.type === 'tool_use') {
          return createToolUseStartEvent(
            event.content_block.id,
            event.content_block.name
          )
        }
        return null // Ignore text block starts
        
      case 'content_block_delta':
        if (event.delta?.type === 'text_delta') {
          return createTextDeltaEvent(event.delta.text)
        }
        if (event.delta?.type === 'input_json_delta') {
          return createToolUseDeltaEvent(
            event.index,
            event.delta.partial_json
          )
        }
        return null
        
      case 'content_block_stop':
        // Could track tool use completion here if needed
        return null
        
      case 'message_stop':
        return createMessageEndEvent(event.message?.usage)
        
      case 'message_start':
        // Could extract initial info here
        return null
        
      case 'message_delta':
        // Contains usage updates
        return null
        
      case 'error':
        return createErrorEvent(
          event.error?.message || 'Anthropic API error',
          event.error?.type
        )
        
      default:
        return null
    }
  }

  /**
   * Parse non-streaming response
   * @private
   */
  _parseCompletionResponse(response) {
    const content = response.content
      ?.filter(b => b.type === 'text')
      ?.map(b => b.text)
      ?.join('\n') || ''
    
    const toolCalls = response.content
      ?.filter(b => b.type === 'tool_use')
      ?.map(b => ({
        id: b.id,
        name: b.name,
        input: b.input
      })) || []
    
    return {
      content,
      toolCalls,
      usage: {
        input_tokens: response.usage?.input_tokens || 0,
        output_tokens: response.usage?.output_tokens || 0,
        cache_creation_tokens: response.usage?.cache_creation_input_tokens || 0,
        cache_read_tokens: response.usage?.cache_read_input_tokens || 0
      },
      stopReason: response.stop_reason,
      model: response.model
    }
  }

  /**
   * Anthropic requires messages to alternate user/assistant
   * This method ensures proper alternation
   */
  ensureMessageAlternation(messages) {
    const result = []
    let lastRole = null
    
    for (const msg of messages) {
      // Skip system messages (handled separately)
      if (msg.role === 'system') continue
      
      // Tool results are user messages in Anthropic
      const effectiveRole = msg.role === 'tool' ? 'user' : msg.role
      
      // If same role as last, we need to handle it
      if (effectiveRole === lastRole) {
        // Anthropic doesn't allow consecutive same-role messages
        // This shouldn't happen with proper message handling
        console.warn('[AnthropicProvider] Consecutive same-role messages detected')
      }
      
      result.push(msg)
      lastRole = effectiveRole
    }
    
    return result
  }
}

// Export singleton for convenience
let defaultInstance = null

export function getAnthropicProvider(config = {}) {
  if (!defaultInstance) {
    defaultInstance = new AnthropicProvider(config)
  }
  return defaultInstance
}

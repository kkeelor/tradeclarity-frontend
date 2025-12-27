// lib/ai/providers/deepseek.js
/**
 * DeepSeek Provider Implementation
 * 
 * Extends BaseProvider with DeepSeek-specific handling:
 * - OpenAI-compatible API
 * - Prefix caching (automatic, not explicit)
 * - OpenAI tool format
 * 
 * @see docs/MULTI_MODEL_ARCHITECTURE.md
 */

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
import { createDeepSeekStream, createDeepSeekCompletion } from '../deepseek-client.js'

/**
 * DeepSeek Provider
 */
export class DeepSeekProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      providerId: PROVIDERS.DEEPSEEK,
      apiKey: config.apiKey || process.env.DEEPSEEK_API_KEY,
      baseUrl: 'https://api.deepseek.com/v1',
      defaultModel: 'deepseek-chat',
      toolFormat: TOOL_FORMATS.OPENAI,
      supportsCaching: false, // Uses automatic prefix caching
      ...config
    })
    
    // Track tool calls being built during streaming
    this._pendingToolCalls = new Map()
  }

  /**
   * Create streaming completion with DeepSeek
   * @protected
   */
  async *_createStreamInternal(options) {
    // Reset pending tool calls
    this._pendingToolCalls.clear()
    
    try {
      const stream = createDeepSeekStream({
        model: options.model,
        messages: options.messages,
        maxTokens: options.maxTokens || 2000,
        temperature: options.temperature ?? 0.7,
        tools: options.tools
      })
      
      for await (const chunk of stream) {
        yield chunk
      }
    } catch (error) {
      this._handleError(error)
    }
  }

  /**
   * Create non-streaming completion with DeepSeek
   * @protected
   */
  async _createCompletionInternal(options) {
    try {
      const response = await createDeepSeekCompletion({
        model: options.model,
        messages: options.messages,
        maxTokens: options.maxTokens || 2000,
        temperature: options.temperature ?? 0.7,
        tools: options.tools
      })
      
      return this._parseCompletionResponse(response)
    } catch (error) {
      this._handleError(error)
    }
  }

  /**
   * Normalize DeepSeek (OpenAI format) stream events to standard format
   * @protected
   */
  _normalizeStreamEvent(event) {
    // Handle errors
    if (event.error) {
      return createErrorEvent(
        event.error.message || 'DeepSeek API error',
        event.error.code
      )
    }
    
    // Handle standard OpenAI-format chunks
    if (!event.choices || !event.choices[0]) {
      return null
    }
    
    const choice = event.choices[0]
    const delta = choice.delta
    
    // Text content
    if (delta?.content) {
      return createTextDeltaEvent(delta.content)
    }
    
    // Tool calls (OpenAI format)
    if (delta?.tool_calls && delta.tool_calls.length > 0) {
      const events = []
      
      for (const toolCallDelta of delta.tool_calls) {
        const idx = toolCallDelta.index ?? 0
        
        // New tool call starting
        if (toolCallDelta.id) {
          this._pendingToolCalls.set(idx, {
            id: toolCallDelta.id,
            name: toolCallDelta.function?.name || '',
            arguments: toolCallDelta.function?.arguments || ''
          })
          
          events.push(createToolUseStartEvent(
            toolCallDelta.id,
            toolCallDelta.function?.name || ''
          ))
        } else if (this._pendingToolCalls.has(idx)) {
          // Accumulating tool call
          const pending = this._pendingToolCalls.get(idx)
          
          if (toolCallDelta.function?.name) {
            pending.name += toolCallDelta.function.name
          }
          
          if (toolCallDelta.function?.arguments) {
            pending.arguments += toolCallDelta.function.arguments
            
            events.push(createToolUseDeltaEvent(
              pending.id,
              toolCallDelta.function.arguments
            ))
          }
        }
      }
      
      // Return first event (typically we only get one at a time)
      return events[0] || null
    }
    
    // Finish reason
    if (choice.finish_reason) {
      // Emit tool use end events for any pending tool calls
      for (const [idx, pending] of this._pendingToolCalls) {
        // Parse the accumulated arguments
        let input = {}
        try {
          if (pending.arguments) {
            input = JSON.parse(pending.arguments)
          }
        } catch (e) {
          console.warn('[DeepSeekProvider] Failed to parse tool arguments:', e.message)
        }
        
        // We could emit these, but they're already tracked
      }
      
      this._pendingToolCalls.clear()
      
      return createMessageEndEvent(event.usage)
    }
    
    return null
  }

  /**
   * Parse non-streaming response
   * @private
   */
  _parseCompletionResponse(response) {
    const choice = response.choices?.[0]
    const message = choice?.message || {}
    
    const content = message.content || ''
    
    const toolCalls = (message.tool_calls || []).map(tc => ({
      id: tc.id,
      name: tc.function?.name,
      input: tc.function?.arguments ? JSON.parse(tc.function.arguments) : {}
    }))
    
    return {
      content,
      toolCalls,
      usage: {
        input_tokens: response.usage?.prompt_tokens || 0,
        output_tokens: response.usage?.completion_tokens || 0
      },
      stopReason: choice?.finish_reason,
      model: response.model
    }
  }

  /**
   * Override error handling for DeepSeek-specific errors
   * @protected
   */
  _handleError(error) {
    const status = error.status || error.statusCode
    
    // DeepSeek-specific: 402 = insufficient balance
    if (status === 402) {
      const e = new Error('DeepSeek API quota exceeded or insufficient balance.')
      e.type = 'quota_exceeded'
      e.status = status
      throw e
    }
    
    // Use parent handling for other errors
    super._handleError(error)
  }
}

// Export singleton for convenience
let defaultInstance = null

export function getDeepSeekProvider(config = {}) {
  if (!defaultInstance) {
    defaultInstance = new DeepSeekProvider(config)
  }
  return defaultInstance
}

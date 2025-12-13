// lib/ai/providers.js
/**
 * Provider abstraction layer for multiple LLM providers
 * 
 * Provides a unified interface for Anthropic (Claude) and DeepSeek
 */

import Anthropic from '@anthropic-ai/sdk'
import * as deepseekClient from './deepseek-client'

// Provider types
export const PROVIDERS = {
  ANTHROPIC: 'anthropic',
  DEEPSEEK: 'deepseek'
}

// Initialize Anthropic client (lazy-loaded)
let anthropicClient = null

function getAnthropicClient() {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  }
  return anthropicClient
}

/**
 * Normalize messages format for different providers
 * 
 * Anthropic: Uses separate `system` parameter
 * DeepSeek: Uses system message in messages array
 * 
 * @param {Array} messages - Original messages array
 * @param {string} systemPrompt - System prompt (if any)
 * @param {string} provider - Provider type
 * @returns {Object} Normalized format {messages, system}
 */
export function normalizeMessages(messages, systemPrompt, provider) {
  if (provider === PROVIDERS.ANTHROPIC) {
    // Anthropic uses separate system parameter
    return {
      messages: messages.filter(msg => msg.role !== 'system'),
      system: systemPrompt || messages.find(msg => msg.role === 'system')?.content || null
    }
  } else if (provider === PROVIDERS.DEEPSEEK) {
    // DeepSeek uses system message in messages array
    const normalizedMessages = [...messages]
    
    // If system prompt provided separately, prepend as system message
    if (systemPrompt) {
      // Remove any existing system messages
      const filtered = normalizedMessages.filter(msg => msg.role !== 'system')
      // Prepend system message
      filtered.unshift({
        role: 'system',
        content: systemPrompt
      })
      return {
        messages: filtered,
        system: null
      }
    }
    
    return {
      messages: normalizedMessages,
      system: null
    }
  }
  
  return { messages, system: null }
}

/**
 * Create a streaming completion with the specified provider
 * 
 * @param {Object} options
 * @param {string} options.provider - Provider type (PROVIDERS.ANTHROPIC or PROVIDERS.DEEPSEEK)
 * @param {string} options.model - Model ID
 * @param {Array} options.messages - Message array
 * @param {string} options.system - System prompt (for Anthropic)
 * @param {number} options.maxTokens - Max tokens
 * @param {number} options.temperature - Temperature
 * @param {Array} options.tools - Tools/function calling (if supported)
 * @returns {AsyncGenerator} Stream of response events
 */
export async function* createStream({
  provider,
  model,
  messages,
  system = null,
  maxTokens = 2000,
  temperature = 0.7,
  tools = null
}) {
  if (provider === PROVIDERS.ANTHROPIC) {
    const client = getAnthropicClient()
    
    const params = {
      model,
      max_tokens: maxTokens,
      temperature,
      stream: true,
      messages: messages.filter(msg => msg.role !== 'system')
    }
    
    if (system) {
      params.system = system
    }
    
    if (tools && Array.isArray(tools) && tools.length > 0) {
      params.tools = tools
    }
    
    const stream = await client.messages.create(params)
    
    for await (const event of stream) {
      yield event
    }
    
  } else if (provider === PROVIDERS.DEEPSEEK) {
    // Normalize messages for DeepSeek (include system in messages array)
    const normalized = normalizeMessages(messages, system, PROVIDERS.DEEPSEEK)
    
    // Log DeepSeek stream start (only in dev)
    if (process.env.NODE_ENV === 'development') {
      console.log('[DeepSeek Provider] Starting stream request', { model })
    }
    
    const stream = deepseekClient.createDeepSeekStream({
      model,
      messages: normalized.messages,
      maxTokens,
      temperature,
      tools
    })
    
    // Convert DeepSeek SSE format to Anthropic-like format for consistency
    let lastUsage = null
    let chunkCount = 0
    try {
      for await (const chunk of stream) {
        chunkCount++
        
        // Handle error chunks
        if (chunk.error) {
          console.error('[DeepSeek Provider] Error in stream chunk:', chunk.error)
          yield {
            type: 'error',
            error: {
              message: chunk.error.message || 'DeepSeek API error',
              code: chunk.error.code
            }
          }
          break
        }
        
        // DeepSeek uses OpenAI-compatible format
        // Convert to Anthropic-like format for unified handling
        if (chunk.choices && chunk.choices[0]) {
          const choice = chunk.choices[0]
          const delta = choice.delta
          
          if (delta && delta.content) {
            // Map to Anthropic content_block_delta format
            yield {
              type: 'content_block_delta',
              delta: {
                type: 'text_delta',
                text: delta.content
              }
            }
          }
          
          // Store usage if present
          if (chunk.usage) {
            lastUsage = chunk.usage
          }
          
          // Handle finish reason
          if (choice.finish_reason) {
            // Yield message_stop with usage info (similar to Anthropic)
            yield {
              type: 'message_stop',
              message: lastUsage ? {
                usage: {
                  input_tokens: lastUsage.prompt_tokens || lastUsage.input_tokens || 0,
                  output_tokens: lastUsage.completion_tokens || lastUsage.output_tokens || 0
                }
              } : null
            }
            break
          }
        } else if (chunkCount === 1 && process.env.NODE_ENV === 'development') {
          // Log unexpected first chunk format (dev only)
          console.warn('[DeepSeek Provider] Unexpected chunk format:', Object.keys(chunk))
        }
      }
    } catch (streamError) {
      console.error('[DeepSeek Provider] ❌ Stream error:', streamError)
      yield {
        type: 'error',
        error: {
          message: streamError.message || 'DeepSeek stream error',
          name: streamError.name
        }
      }
      throw streamError
    }
    
    // If we didn't get a finish_reason but have usage, yield it
    if (lastUsage && !lastUsage.yielded) {
      yield {
        type: 'message_stop',
        message: {
          usage: {
            input_tokens: lastUsage.prompt_tokens || lastUsage.input_tokens || 0,
            output_tokens: lastUsage.completion_tokens || lastUsage.output_tokens || 0
          }
        }
      }
    }
    
    // Log completion (dev only)
    if (process.env.NODE_ENV === 'development') {
      console.log('[DeepSeek Provider] Stream complete', { totalChunks: chunkCount })
    }
    
  } else {
    throw new Error(`Unsupported provider: ${provider}`)
  }
}

/**
 * Extract text content from provider-specific response
 * 
 * @param {Object} event - Stream event from provider
 * @param {string} provider - Provider type
 * @returns {string|null} Text content or null
 */
export function extractTextFromEvent(event, provider) {
  // Events are normalized to Anthropic format in createStream, so we check for Anthropic format
  if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
    return event.delta.text
  }
  
  // Fallback: Handle raw DeepSeek format if normalization didn't happen (shouldn't occur)
  if (provider === PROVIDERS.DEEPSEEK && event.choices && event.choices[0]?.delta?.content) {
    console.warn('[extractTextFromEvent] Received raw DeepSeek format - normalization may have failed')
    return event.choices[0].delta.content
  }
  
  return null
}

/**
 * Extract usage information from provider response
 * 
 * @param {Object} response - Final response object
 * @param {string} provider - Provider type
 * @returns {Object} Usage info {input_tokens, output_tokens}
 */
export function extractUsage(response, provider) {
  if (provider === PROVIDERS.ANTHROPIC) {
    if (response.usage) {
      return {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens
      }
    }
  } else if (provider === PROVIDERS.DEEPSEEK) {
    if (response.usage) {
      return {
        input_tokens: response.usage.prompt_tokens || response.usage.input_tokens || 0,
        output_tokens: response.usage.completion_tokens || response.usage.output_tokens || 0
      }
    }
  }
  
  return { input_tokens: 0, output_tokens: 0 }
}

/**
 * Check if a provider is configured
 */
export function isProviderConfigured(provider) {
  if (provider === PROVIDERS.ANTHROPIC) {
    return !!process.env.ANTHROPIC_API_KEY
  } else if (provider === PROVIDERS.DEEPSEEK) {
    return !!process.env.DEEPSEEK_API_KEY
  }
  return false
}

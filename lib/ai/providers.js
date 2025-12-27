// lib/ai/providers.js
/**
 * Provider abstraction layer for multiple LLM providers
 * 
 * Provides a unified interface for Anthropic (Claude) and DeepSeek.
 * Handles provider-specific differences in:
 * - System prompt format (cached blocks vs plain string)
 * - Message normalization
 * - Tool format transformation
 * - Streaming event normalization
 * 
 * @see docs/MULTI_MODEL_ARCHITECTURE.md
 */

import Anthropic from '@anthropic-ai/sdk'
import * as deepseekClient from './deepseek-client'
import { blocksToString, isCachedBlockFormat } from './prompts/compiler.js'
import { transformToolsForModel } from './tools/transformer.js'
import { PROVIDERS as REGISTRY_PROVIDERS, getProvider, getToolFormat, TOOL_FORMATS } from './models/registry.js'

// Re-export PROVIDERS for backward compatibility
// Canonical source is now models/registry.js
export const PROVIDERS = REGISTRY_PROVIDERS

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
 * Handles provider-specific differences:
 * - Anthropic: Uses separate `system` parameter, supports cached blocks
 * - DeepSeek/OpenAI: Uses system message in messages array, plain string only
 * 
 * @param {Array} messages - Original messages array
 * @param {string|Array} systemPrompt - System prompt (string or array of cached blocks)
 * @param {string} provider - Provider type
 * @returns {Object} Normalized format {messages, system}
 */
export function normalizeMessages(messages, systemPrompt, provider) {
  // Convert system prompt to appropriate format based on provider
  let processedSystemPrompt = systemPrompt
  
  if (provider === PROVIDERS.ANTHROPIC) {
    // Anthropic supports cached blocks array or plain string
    // Keep as-is if it's already the right format
    if (isCachedBlockFormat(systemPrompt)) {
      processedSystemPrompt = systemPrompt // Keep cached blocks
    } else if (typeof systemPrompt === 'string') {
      processedSystemPrompt = systemPrompt // Keep plain string
    } else if (systemPrompt) {
      // Try to extract system from messages if systemPrompt is invalid
      processedSystemPrompt = messages.find(msg => msg.role === 'system')?.content || null
    }
    
    return {
      messages: messages.filter(msg => msg.role !== 'system'),
      system: processedSystemPrompt
    }
  } 
  
  if (provider === PROVIDERS.DEEPSEEK) {
    // DeepSeek uses system message in messages array (plain string only)
    const normalizedMessages = [...messages].filter(msg => msg.role !== 'system')
    
    if (systemPrompt) {
      // Convert cached blocks to plain string if needed
      const systemString = isCachedBlockFormat(systemPrompt) 
        ? blocksToString(systemPrompt)
        : (typeof systemPrompt === 'string' ? systemPrompt : '')
      
      if (systemString) {
        // Prepend system message
        normalizedMessages.unshift({
          role: 'system',
          content: systemString
        })
      }
    }
    
    return {
      messages: normalizedMessages,
      system: null // DeepSeek doesn't use separate system parameter
    }
  }
  
  // Generic fallback - treat like DeepSeek (OpenAI-compatible)
  const normalizedMessages = [...messages].filter(msg => msg.role !== 'system')
  
  if (systemPrompt) {
    const systemString = isCachedBlockFormat(systemPrompt) 
      ? blocksToString(systemPrompt)
      : (typeof systemPrompt === 'string' ? systemPrompt : '')
    
    if (systemString) {
      normalizedMessages.unshift({
        role: 'system',
        content: systemString
      })
    }
  }
  
  return { messages: normalizedMessages, system: null }
}

/**
 * Create a streaming completion with the specified provider
 * 
 * Handles provider-specific differences:
 * - Tool format transformation (Anthropic ↔ OpenAI)
 * - System prompt format (cached blocks vs plain string)
 * - Streaming event normalization
 * 
 * @param {Object} options
 * @param {string} options.provider - Provider type (PROVIDERS.ANTHROPIC or PROVIDERS.DEEPSEEK)
 * @param {string} options.model - Model ID
 * @param {Array} options.messages - Message array
 * @param {string|Array} options.system - System prompt (string, cached blocks, or null)
 * @param {number} options.maxTokens - Max tokens
 * @param {number} options.temperature - Temperature
 * @param {Array} options.tools - Tools/function calling (in Anthropic format)
 * @returns {AsyncGenerator} Stream of response events (normalized to Anthropic format)
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
    
    // System can be string or array of cached blocks
    if (system) {
      params.system = system
    }
    
    // Tools are already in Anthropic format
    if (tools && Array.isArray(tools) && tools.length > 0) {
      params.tools = tools
    }
    
    const stream = await client.messages.create(params)
    
    for await (const event of stream) {
      yield event
    }
    
  } else if (provider === PROVIDERS.DEEPSEEK) {
    // Normalize messages for DeepSeek (include system in messages array)
    // Check if messages already have a system message (from previous normalization)
    // If so and system is null, preserve the existing system message
    const hasSystemMessage = messages.some(msg => msg.role === 'system')
    const normalized = hasSystemMessage && !system
      ? { messages, system: null } // Preserve existing system message
      : normalizeMessages(messages, system, PROVIDERS.DEEPSEEK)
    
    // Transform tools to OpenAI format if provided
    const transformedTools = tools ? transformToolsForModel(tools, model) : null
    
    // Log DeepSeek stream start (only in dev)
    if (process.env.NODE_ENV === 'development') {
      const systemMsg = normalized.messages.find(m => m.role === 'system')
      const systemPromptLength = systemMsg?.content?.length || 0
      console.log('[DeepSeek Provider] Starting stream request', { 
        model,
        hasTools: !!transformedTools,
        toolCount: transformedTools?.length || 0,
        hasSystemMessage: !!systemMsg,
        systemPromptLength,
        totalMessages: normalized.messages.length
      })
      
      // Log first 200 chars of system prompt for debugging
      if (systemMsg?.content) {
        console.log('[DeepSeek Provider] System prompt preview:', systemMsg.content.substring(0, 200) + '...')
      }
    }
    
    const stream = deepseekClient.createDeepSeekStream({
      model,
      messages: normalized.messages,
      maxTokens,
      temperature,
      tools: transformedTools
    })
    
    // Convert DeepSeek SSE format to Anthropic-like format for consistency
    let lastUsage = null
    let chunkCount = 0
    let currentToolCall = null // Track current tool call being streamed
    let toolCallIndex = 0
    
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
          
          // Handle text content
          if (delta && delta.content) {
            yield {
              type: 'content_block_delta',
              delta: {
                type: 'text_delta',
                text: delta.content
              }
            }
          }
          
          // Handle tool calls (OpenAI format → Anthropic format)
          if (delta && delta.tool_calls && delta.tool_calls.length > 0) {
            for (const toolCallDelta of delta.tool_calls) {
              const idx = toolCallDelta.index ?? toolCallIndex
              
              // New tool call starting
              if (toolCallDelta.id) {
                currentToolCall = {
                  id: toolCallDelta.id,
                  name: toolCallDelta.function?.name || '',
                  arguments: toolCallDelta.function?.arguments || ''
                }
                toolCallIndex = idx
                
                // Emit tool_use start in Anthropic format
                yield {
                  type: 'content_block_start',
                  index: idx,
                  content_block: {
                    type: 'tool_use',
                    id: currentToolCall.id,
                    name: currentToolCall.name,
                    input: {}
                  }
                }
              }
              
              // Accumulate function name
              if (toolCallDelta.function?.name && currentToolCall) {
                currentToolCall.name += toolCallDelta.function.name
              }
              
              // Accumulate function arguments (streamed as JSON string)
              if (toolCallDelta.function?.arguments && currentToolCall) {
                currentToolCall.arguments += toolCallDelta.function.arguments
                
                // Emit input_json_delta in Anthropic format
                yield {
                  type: 'content_block_delta',
                  index: idx,
                  delta: {
                    type: 'input_json_delta',
                    partial_json: toolCallDelta.function.arguments
                  }
                }
              }
            }
          }
          
          // Store usage if present
          if (chunk.usage) {
            lastUsage = chunk.usage
          }
          
          // Handle finish reason
          if (choice.finish_reason) {
            // If we were building a tool call, emit content_block_stop
            if (currentToolCall) {
              yield {
                type: 'content_block_stop',
                index: toolCallIndex
              }
              currentToolCall = null
            }
            
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

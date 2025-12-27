// lib/ai/client.js
/**
 * Reusable AI Client for TradeClarity
 *
 * This module provides a unified interface for AI operations across the app.
 * Supports multiple models, automatic retries, and response parsing.
 * 
 * NOTE: For new code, prefer using:
 * - lib/ai/models/registry.js for model capabilities
 * - lib/ai/providers.js for streaming completions
 * - lib/ai/prompts/compiler.js for system prompts
 * 
 * @see docs/MULTI_MODEL_ARCHITECTURE.md
 */

import Anthropic from '@anthropic-ai/sdk'
import { 
  AI_MODELS as REGISTRY_AI_MODELS,
  MODEL_REGISTRY,
  getModel,
  estimateCost as registryEstimateCost
} from './models/registry.js'

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
 * Available AI models with their characteristics
 * 
 * @deprecated Use MODEL_REGISTRY from lib/ai/models/registry.js instead
 * This export is maintained for backward compatibility only.
 */
export const AI_MODELS = {
  // Re-export from registry with legacy format additions
  HAIKU: {
    ...REGISTRY_AI_MODELS.HAIKU,
    speed: 'fast',
    cost: 'low',
    useCase: 'Quick tasks, parsing, classification'
  },
  SONNET: {
    ...REGISTRY_AI_MODELS.SONNET,
    speed: 'medium',
    cost: 'medium',
    useCase: 'Complex analysis, reasoning, writing'
  },
  DEEPSEEK_CHAT: {
    ...REGISTRY_AI_MODELS.DEEPSEEK_CHAT,
    speed: 'fast',
    cost: 'very-low',
    useCase: 'General conversation, cost-efficient queries'
  },
  DEEPSEEK_REASONER: {
    ...REGISTRY_AI_MODELS.DEEPSEEK_REASONER,
    speed: 'medium',
    cost: 'low',
    useCase: 'Analytics, reasoning, multi-step analysis'
  }
}

/**
 * Generate AI completion with automatic retry and error handling
 *
 * @param {Object} options
 * @param {string} options.prompt - The prompt to send
 * @param {string} options.model - Model ID (default: HAIKU)
 * @param {number} options.maxTokens - Max tokens in response
 * @param {number} options.temperature - Randomness (0-1)
 * @param {boolean} options.expectJSON - Whether response should be JSON
 * @param {number} options.retries - Number of retries on failure
 * @returns {Promise<string|object>} AI response (parsed JSON if expectJSON=true)
 */
export async function generateCompletion({
  prompt,
  model = AI_MODELS.HAIKU.id,
  maxTokens = 1000,
  temperature = 0.3,
  expectJSON = false,
  retries = 2
}) {
  const client = getAnthropicClient()

  let lastError = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const startTime = Date.now()

      const message = await client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })

      const responseText = message.content[0].text
      const duration = Date.now() - startTime

      // Log usage for monitoring
      console.log(`[AI] Model: ${model}, Tokens: ${message.usage.input_tokens + message.usage.output_tokens}, Duration: ${duration}ms`)

      // Parse JSON if expected
      if (expectJSON) {
        return parseJSONResponse(responseText)
      }

      return responseText

    } catch (error) {
      lastError = error
      console.error(`[AI] Attempt ${attempt + 1} failed:`, error.message)

      // Don't retry on certain errors
      if (error.status === 401 || error.status === 403) {
        throw new Error('AI API authentication failed. Check API key.')
      }

      // Wait before retry (exponential backoff)
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
      }
    }
  }

  // All retries failed
  throw new Error(`AI request failed after ${retries + 1} attempts: ${lastError?.message || 'Unknown error'}`)
}

/**
 * Parse JSON from AI response (handles markdown code blocks)
 */
function parseJSONResponse(text) {
  // Try to find JSON in markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (codeBlockMatch) {
    return JSON.parse(codeBlockMatch[1])
  }

  // Try to find JSON object directly
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0])
  }

  // If no JSON found, throw error
  throw new Error('No valid JSON found in AI response')
}

/**
 * Stream AI completion (for chat/long responses)
 *
 * @param {Object} options - Same as generateCompletion
 * @param {Function} onChunk - Callback for each chunk
 * @returns {Promise<string>} Complete response
 */
export async function streamCompletion({
  prompt,
  model = AI_MODELS.HAIKU.id,
  maxTokens = 1000,
  temperature = 0.3,
  onChunk
}) {
  const client = getAnthropicClient()

  let fullResponse = ''

  const stream = await client.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    stream: true,
    messages: [{
      role: 'user',
      content: prompt
    }]
  })

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      const chunk = event.delta.text
      fullResponse += chunk
      if (onChunk) {
        onChunk(chunk)
      }
    }
  }

  return fullResponse
}

/**
 * Batch process multiple prompts efficiently
 *
 * @param {Array<Object>} requests - Array of request options
 * @param {number} concurrency - Max concurrent requests
 * @returns {Promise<Array>} Array of responses
 */
export async function batchCompletion(requests, concurrency = 3) {
  const results = []
  const queue = [...requests]

  const processNext = async () => {
    while (queue.length > 0) {
      const request = queue.shift()
      const result = await generateCompletion(request)
      results.push(result)
    }
  }

  // Create worker pool
  const workers = Array(Math.min(concurrency, requests.length))
    .fill()
    .map(() => processNext())

  await Promise.all(workers)

  return results
}

/**
 * Get estimated cost for a request
 *
 * @param {number} inputTokens - Estimated input tokens
 * @param {number} outputTokens - Estimated output tokens
 * @param {string} model - Model ID
 * @returns {number} Estimated cost in USD
 * 
 * @deprecated Use estimateCost from lib/ai/models/registry.js instead
 */
export function estimateCost(inputTokens, outputTokens, model = AI_MODELS.HAIKU.id) {
  // Delegate to registry for consistent pricing
  return registryEstimateCost(model, inputTokens, outputTokens)
}

/**
 * Check if AI service is properly configured
 * Returns true if at least one provider is configured
 */
export function isAIConfigured() {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.DEEPSEEK_API_KEY)
}

// Re-export key functions from registry for convenience
export { getModel, MODEL_REGISTRY } from './models/registry.js'

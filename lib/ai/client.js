// lib/ai/client.js
/**
 * Reusable AI Client for TradeClarity
 *
 * This module provides a unified interface for AI operations across the app.
 * Supports multiple models, automatic retries, and response parsing.
 */

import Anthropic from '@anthropic-ai/sdk'

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
 */
export const AI_MODELS = {
  HAIKU: {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    speed: 'fast',
    cost: 'low',
    maxTokens: 4096,
    useCase: 'Quick tasks, parsing, classification'
  },
  SONNET: {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    speed: 'medium',
    cost: 'medium',
    maxTokens: 8192,
    useCase: 'Complex analysis, reasoning, writing'
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
 */
export function estimateCost(inputTokens, outputTokens, model = AI_MODELS.HAIKU.id) {
  // Pricing as of 2024 (update as needed)
  const pricing = {
    [AI_MODELS.HAIKU.id]: {
      input: 0.25 / 1_000_000,  // $0.25 per 1M input tokens
      output: 1.25 / 1_000_000   // $1.25 per 1M output tokens
    },
    [AI_MODELS.SONNET.id]: {
      input: 3.00 / 1_000_000,   // $3 per 1M input tokens
      output: 15.00 / 1_000_000  // $15 per 1M output tokens
    }
  }

  const modelPricing = pricing[model] || pricing[AI_MODELS.HAIKU.id]
  return (inputTokens * modelPricing.input) + (outputTokens * modelPricing.output)
}

/**
 * Check if AI service is properly configured
 */
export function isAIConfigured() {
  return !!process.env.ANTHROPIC_API_KEY
}

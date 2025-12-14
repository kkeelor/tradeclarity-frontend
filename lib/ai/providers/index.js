// lib/ai/providers/index.js
/**
 * Provider Index
 * 
 * Central export point for all provider implementations.
 * Use getProvider() for automatic provider selection based on model.
 * 
 * @see docs/MULTI_MODEL_ARCHITECTURE.md
 */

import { PROVIDERS, getProvider as getProviderFromRegistry } from '../models/registry.js'
import { AnthropicProvider, getAnthropicProvider } from './anthropic.js'
import { DeepSeekProvider, getDeepSeekProvider } from './deepseek.js'
import { BaseProvider, STREAM_EVENTS } from './base.js'

// Provider instances cache
const providerInstances = new Map()

/**
 * Get provider instance for a specific model
 * 
 * @param {string} modelId - Model identifier
 * @param {Object} config - Optional provider configuration
 * @returns {BaseProvider} Provider instance
 */
export function getProviderForModel(modelId, config = {}) {
  const providerName = getProviderFromRegistry(modelId)
  
  if (!providerName) {
    throw new Error(`Unknown model: ${modelId}`)
  }
  
  return getProviderByName(providerName, config)
}

/**
 * Get provider instance by provider name
 * 
 * @param {string} providerName - Provider identifier (from PROVIDERS)
 * @param {Object} config - Optional provider configuration
 * @returns {BaseProvider} Provider instance
 */
export function getProviderByName(providerName, config = {}) {
  // Check cache first (unless config provided)
  const cacheKey = `${providerName}_${JSON.stringify(config)}`
  if (providerInstances.has(cacheKey)) {
    return providerInstances.get(cacheKey)
  }
  
  let provider
  
  switch (providerName) {
    case PROVIDERS.ANTHROPIC:
      provider = new AnthropicProvider(config)
      break
      
    case PROVIDERS.DEEPSEEK:
      provider = new DeepSeekProvider(config)
      break
      
    default:
      throw new Error(`Unsupported provider: ${providerName}`)
  }
  
  // Cache if no custom config
  if (Object.keys(config).length === 0) {
    providerInstances.set(cacheKey, provider)
  }
  
  return provider
}

/**
 * Check if a provider is configured (has API key)
 * 
 * @param {string} providerName - Provider identifier
 * @returns {boolean}
 */
export function isProviderConfigured(providerName) {
  switch (providerName) {
    case PROVIDERS.ANTHROPIC:
      return !!process.env.ANTHROPIC_API_KEY
    case PROVIDERS.DEEPSEEK:
      return !!process.env.DEEPSEEK_API_KEY
    default:
      return false
  }
}

/**
 * Get all configured providers
 * 
 * @returns {string[]} Array of configured provider identifiers
 */
export function getConfiguredProviders() {
  return Object.values(PROVIDERS).filter(isProviderConfigured)
}

/**
 * Create a unified stream that normalizes all provider events
 * This is the recommended way to use streaming in the chat route
 * 
 * @param {Object} options - Stream options
 * @param {string} options.model - Model identifier
 * @param {Array} options.messages - Messages array
 * @param {string|Array} options.system - System prompt
 * @param {number} options.maxTokens - Max output tokens
 * @param {number} options.temperature - Temperature
 * @param {Array} options.tools - Tools array (in Anthropic format)
 * @returns {AsyncGenerator} Normalized stream events
 */
export async function* createUnifiedStream(options) {
  const provider = getProviderForModel(options.model)
  
  const stream = provider.createStream({
    model: options.model,
    messages: options.messages,
    system: options.system,
    maxTokens: options.maxTokens,
    temperature: options.temperature,
    tools: options.tools
  })
  
  for await (const event of stream) {
    yield event
  }
}

// Re-export classes and types
export { 
  BaseProvider, 
  AnthropicProvider, 
  DeepSeekProvider,
  STREAM_EVENTS
}

// Re-export PROVIDERS for convenience
export { PROVIDERS }

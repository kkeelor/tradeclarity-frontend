// lib/ai/models/registry.js
/**
 * Model Capability Registry
 * 
 * Centralized registry of all supported AI models with their capabilities.
 * Used for feature detection, cost estimation, and provider-specific handling.
 * 
 * @see docs/MULTI_MODEL_ARCHITECTURE.md
 */

/**
 * Provider identifiers
 */
export const PROVIDERS = {
  ANTHROPIC: 'anthropic',
  DEEPSEEK: 'deepseek',
  OPENAI: 'openai', // Future
  // Add more providers here as needed
}

/**
 * Tool format types
 */
export const TOOL_FORMATS = {
  ANTHROPIC: 'anthropic',  // Anthropic's native tool format
  OPENAI: 'openai',        // OpenAI-compatible format (used by DeepSeek, etc.)
}

/**
 * Model capability registry
 * 
 * Each model entry contains:
 * - provider: Provider identifier
 * - name: Human-readable name
 * - contextWindow: Maximum context tokens
 * - maxOutput: Maximum output tokens
 * - supportsStreaming: Whether streaming is supported
 * - supportsTools: Whether function/tool calling is supported
 * - toolFormat: Format for tool definitions (if supportsTools)
 * - supportsCaching: Whether explicit prompt caching is supported
 * - supportsPrefixCaching: Whether automatic prefix caching is available
 * - supportsVision: Whether image input is supported
 * - costPer1MInput: Cost per 1M input tokens (USD)
 * - costPer1MOutput: Cost per 1M output tokens (USD)
 * - bestFor: Array of use cases this model excels at
 * - tier: Minimum subscription tier required ('free', 'trader', 'pro')
 */
export const MODEL_REGISTRY = {
  // =========================================================================
  // ANTHROPIC MODELS
  // =========================================================================
  'claude-3-5-haiku-20241022': {
    id: 'claude-3-5-haiku-20241022',
    provider: PROVIDERS.ANTHROPIC,
    name: 'Claude 3.5 Haiku',
    contextWindow: 200000,
    maxOutput: 4096,
    supportsStreaming: true,
    supportsTools: true,
    toolFormat: TOOL_FORMATS.ANTHROPIC,
    supportsCaching: true,
    supportsPrefixCaching: false,
    supportsVision: true,
    costPer1MInput: 0.80,
    costPer1MOutput: 4.00,
    bestFor: ['quick-tasks', 'parsing', 'classification', 'simple-chat'],
    tier: 'free'
  },
  
  'claude-sonnet-4-5-20250929': {
    id: 'claude-sonnet-4-5-20250929',
    provider: PROVIDERS.ANTHROPIC,
    name: 'Claude Sonnet 4.5',
    contextWindow: 200000,
    maxOutput: 8192,
    supportsStreaming: true,
    supportsTools: true,
    toolFormat: TOOL_FORMATS.ANTHROPIC,
    supportsCaching: true,
    supportsPrefixCaching: false,
    supportsVision: true,
    costPer1MInput: 3.00,
    costPer1MOutput: 15.00,
    bestFor: ['complex-analysis', 'reasoning', 'writing', 'multi-step'],
    tier: 'pro'
  },

  // =========================================================================
  // DEEPSEEK MODELS
  // =========================================================================
  'deepseek-chat': {
    id: 'deepseek-chat',
    provider: PROVIDERS.DEEPSEEK,
    name: 'DeepSeek Chat',
    contextWindow: 64000,
    maxOutput: 4096,
    supportsStreaming: true,
    supportsTools: true,
    toolFormat: TOOL_FORMATS.OPENAI,
    supportsCaching: false,
    supportsPrefixCaching: true, // DeepSeek auto-caches message prefixes
    supportsVision: false,
    costPer1MInput: 0.14,
    costPer1MOutput: 0.28,
    bestFor: ['general-chat', 'cost-efficient', 'high-volume'],
    tier: 'free'
  },
  
  'deepseek-reasoner': {
    id: 'deepseek-reasoner',
    provider: PROVIDERS.DEEPSEEK,
    name: 'DeepSeek Reasoner',
    contextWindow: 64000,
    maxOutput: 8192,
    supportsStreaming: true,
    supportsTools: true,
    toolFormat: TOOL_FORMATS.OPENAI,
    supportsCaching: false,
    supportsPrefixCaching: true,
    supportsVision: false,
    costPer1MInput: 0.55,
    costPer1MOutput: 2.19,
    bestFor: ['analysis', 'reasoning', 'multi-step', 'complex-queries'],
    tier: 'pro'
  },
}

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

/**
 * Get model configuration by ID
 * @param {string} modelId - Model identifier
 * @returns {Object|null} Model configuration or null if not found
 */
export function getModel(modelId) {
  return MODEL_REGISTRY[modelId] || null
}

/**
 * Get all models for a specific provider
 * @param {string} provider - Provider identifier (from PROVIDERS)
 * @returns {Object[]} Array of model configurations
 */
export function getModelsByProvider(provider) {
  return Object.values(MODEL_REGISTRY).filter(m => m.provider === provider)
}

/**
 * Get all models that support a specific feature
 * @param {string} feature - Feature name (e.g., 'supportsTools', 'supportsCaching')
 * @returns {Object[]} Array of model configurations
 */
export function getModelsWithFeature(feature) {
  return Object.values(MODEL_REGISTRY).filter(m => m[feature] === true)
}

/**
 * Get the default model for a provider and tier
 * @param {string} provider - Provider identifier
 * @param {string} tier - User tier ('free', 'trader', 'pro')
 * @returns {Object|null} Default model configuration
 */
export function getDefaultModel(provider, tier = 'free') {
  const models = getModelsByProvider(provider)
  
  // For pro tier, prefer the best model
  if (tier === 'pro') {
    const proModel = models.find(m => m.tier === 'pro')
    if (proModel) return proModel
  }
  
  // Otherwise, return the free-tier model
  return models.find(m => m.tier === 'free') || models[0] || null
}

/**
 * Check if a model supports tools/function calling
 * @param {string} modelId - Model identifier
 * @returns {boolean}
 */
export function supportsTools(modelId) {
  const model = getModel(modelId)
  return model?.supportsTools === true
}

/**
 * Get the tool format for a model
 * @param {string} modelId - Model identifier
 * @returns {string|null} Tool format or null if not supported
 */
export function getToolFormat(modelId) {
  const model = getModel(modelId)
  if (!model?.supportsTools) return null
  return model.toolFormat
}

/**
 * Check if a model supports explicit prompt caching (Anthropic-style)
 * @param {string} modelId - Model identifier
 * @returns {boolean}
 */
export function supportsCaching(modelId) {
  const model = getModel(modelId)
  return model?.supportsCaching === true
}

/**
 * Check if a model supports automatic prefix caching (DeepSeek-style)
 * @param {string} modelId - Model identifier
 * @returns {boolean}
 */
export function supportsPrefixCaching(modelId) {
  const model = getModel(modelId)
  return model?.supportsPrefixCaching === true
}

/**
 * Estimate cost for a request
 * @param {string} modelId - Model identifier
 * @param {number} inputTokens - Number of input tokens
 * @param {number} outputTokens - Number of output tokens
 * @returns {number} Estimated cost in USD
 */
export function estimateCost(modelId, inputTokens, outputTokens) {
  const model = getModel(modelId)
  if (!model) return 0
  
  const inputCost = (inputTokens / 1_000_000) * model.costPer1MInput
  const outputCost = (outputTokens / 1_000_000) * model.costPer1MOutput
  
  return inputCost + outputCost
}

/**
 * Get the provider for a model
 * @param {string} modelId - Model identifier
 * @returns {string|null} Provider identifier or null
 */
export function getProvider(modelId) {
  const model = getModel(modelId)
  return model?.provider || null
}

/**
 * Validate that a model ID is valid
 * @param {string} modelId - Model identifier to validate
 * @returns {boolean}
 */
export function isValidModel(modelId) {
  return modelId in MODEL_REGISTRY
}

/**
 * Get context window size for a model
 * @param {string} modelId - Model identifier
 * @returns {number} Context window size in tokens
 */
export function getContextWindow(modelId) {
  const model = getModel(modelId)
  return model?.contextWindow || 4096 // Safe default
}

/**
 * Get max output tokens for a model
 * @param {string} modelId - Model identifier
 * @returns {number} Max output tokens
 */
export function getMaxOutput(modelId) {
  const model = getModel(modelId)
  return model?.maxOutput || 1024 // Safe default
}

// =========================================================================
// BACKWARD COMPATIBILITY
// =========================================================================

/**
 * Legacy AI_MODELS format for backward compatibility
 * Maps to the new registry format
 * 
 * @deprecated Use MODEL_REGISTRY directly
 */
export const AI_MODELS = {
  HAIKU: MODEL_REGISTRY['claude-3-5-haiku-20241022'],
  SONNET: MODEL_REGISTRY['claude-sonnet-4-5-20250929'],
  DEEPSEEK_CHAT: MODEL_REGISTRY['deepseek-chat'],
  DEEPSEEK_REASONER: MODEL_REGISTRY['deepseek-reasoner'],
}

// Re-export PROVIDERS for backward compatibility with providers.js
// The canonical source is now this file

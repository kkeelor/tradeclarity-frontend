// lib/ai/context/strategies.js
/**
 * Context Selection Strategies
 * 
 * Intelligently selects how much context to include based on:
 * - Provider cost profile (DeepSeek is cheap, use full context)
 * - Conversation depth (long conversations get summarized)
 * - User tier (pro users get richer context)
 * - Message complexity (simple questions need less context)
 * 
 * @see docs/MULTI_MODEL_ARCHITECTURE.md
 */

import { getModel, PROVIDERS } from '../models/registry.js'

/**
 * Context strategy types
 */
export const CONTEXT_STRATEGIES = {
  FULL: 'full',           // Include all structured data + full conversation history
  SUMMARY: 'summary',     // Summarized trading data + conversation summary
  MINIMAL: 'minimal',     // Just conversation summary, no trading data
  NONE: 'none'            // No context (for generic questions)
}

/**
 * Default thresholds for strategy selection
 */
const DEFAULT_THRESHOLDS = {
  // Conversation depth thresholds
  summaryAfterMessages: 10,    // Switch to summary after 10 messages
  minimalAfterMessages: 20,    // Switch to minimal after 20 messages
  
  // Token thresholds (approximate)
  maxFullContextTokens: 8000,  // Max tokens for full context
  maxSummaryTokens: 3000,      // Max tokens for summary context
  
  // Provider-specific overrides
  providerOverrides: {
    [PROVIDERS.DEEPSEEK]: {
      // DeepSeek is cheap - be more generous with context
      summaryAfterMessages: 15,
      minimalAfterMessages: 30,
      maxFullContextTokens: 12000
    },
    [PROVIDERS.ANTHROPIC]: {
      // Anthropic has caching - use it efficiently
      summaryAfterMessages: 10,
      minimalAfterMessages: 20,
      maxFullContextTokens: 8000
    }
  }
}

/**
 * Select optimal context strategy based on multiple factors
 * 
 * @param {Object} options - Strategy selection options
 * @param {string} options.modelId - Model identifier
 * @param {number} options.conversationDepth - Number of messages in conversation
 * @param {string} options.tier - User subscription tier
 * @param {string} options.messageType - Type of user message (question, command, etc.)
 * @param {number} options.estimatedContextTokens - Estimated tokens in full context
 * @param {boolean} options.hasTradeData - Whether user has trade data
 * @returns {Object} Strategy result { strategy, reason, recommendations }
 */
export function selectContextStrategy({
  modelId,
  conversationDepth = 0,
  tier = 'free',
  messageType = 'question',
  estimatedContextTokens = 0,
  hasTradeData = true
}) {
  const model = getModel(modelId)
  const provider = model?.provider
  
  // Get thresholds (with provider overrides)
  const thresholds = {
    ...DEFAULT_THRESHOLDS,
    ...(DEFAULT_THRESHOLDS.providerOverrides[provider] || {})
  }
  
  // Decision factors
  const factors = {
    conversationDepth,
    tier,
    provider,
    hasTradeData,
    estimatedContextTokens,
    contextWindow: model?.contextWindow || 4096
  }
  
  // No trade data = minimal context
  if (!hasTradeData) {
    return {
      strategy: CONTEXT_STRATEGIES.MINIMAL,
      reason: 'No trade data available',
      factors,
      recommendations: ['Encourage user to connect exchange or upload CSV']
    }
  }
  
  // Generic/off-topic questions don't need trading context
  if (messageType === 'generic' || messageType === 'off_topic') {
    return {
      strategy: CONTEXT_STRATEGIES.NONE,
      reason: 'Message does not require trading context',
      factors,
      recommendations: []
    }
  }
  
  // Check token limits
  if (estimatedContextTokens > thresholds.maxFullContextTokens) {
    // Context too large - use summary
    return {
      strategy: CONTEXT_STRATEGIES.SUMMARY,
      reason: `Full context (${estimatedContextTokens} tokens) exceeds limit (${thresholds.maxFullContextTokens})`,
      factors,
      recommendations: ['Consider summarizing older conversation history']
    }
  }
  
  // Check conversation depth
  if (conversationDepth >= thresholds.minimalAfterMessages) {
    return {
      strategy: CONTEXT_STRATEGIES.MINIMAL,
      reason: `Conversation depth (${conversationDepth}) exceeds minimal threshold`,
      factors,
      recommendations: ['Summarize conversation', 'Keep only recent exchanges']
    }
  }
  
  if (conversationDepth >= thresholds.summaryAfterMessages) {
    return {
      strategy: CONTEXT_STRATEGIES.SUMMARY,
      reason: `Conversation depth (${conversationDepth}) exceeds summary threshold`,
      factors,
      recommendations: ['Summarize older messages', 'Keep recent context']
    }
  }
  
  // Pro users get full context more often
  if (tier === 'pro') {
    return {
      strategy: CONTEXT_STRATEGIES.FULL,
      reason: 'Pro tier with normal conversation depth',
      factors,
      recommendations: []
    }
  }
  
  // Default: full context for short conversations
  return {
    strategy: CONTEXT_STRATEGIES.FULL,
    reason: 'Normal conversation depth with available data',
    factors,
    recommendations: []
  }
}

/**
 * Detect message type/intent for context selection
 * 
 * @param {string} message - User message
 * @returns {string} Message type
 */
export function detectMessageType(message) {
  if (!message || typeof message !== 'string') {
    return 'unknown'
  }
  
  const lowerMessage = message.toLowerCase().trim()
  
  // Trading-specific patterns
  const tradingPatterns = [
    /win rate/i,
    /p[&n]l/i,
    /profit/i,
    /loss/i,
    /trade/i,
    /position/i,
    /symbol/i,
    /performance/i,
    /analysis/i,
    /pattern/i,
    /strategy/i,
    /risk/i,
    /drawdown/i,
    /equity/i
  ]
  
  // Market data patterns (needs MCP tools, not trading context)
  const marketPatterns = [
    /price of/i,
    /current price/i,
    /stock price/i,
    /market.*today/i,
    /what is .* trading at/i,
    /show me .* chart/i
  ]
  
  // Generic patterns (don't need trading context)
  const genericPatterns = [
    /^(hi|hello|hey|thanks|thank you)/i,
    /what can you/i,
    /how do you/i,
    /tell me about yourself/i,
    /who are you/i
  ]
  
  // Check patterns
  if (genericPatterns.some(p => p.test(lowerMessage))) {
    return 'generic'
  }
  
  if (marketPatterns.some(p => p.test(lowerMessage))) {
    return 'market_data'
  }
  
  if (tradingPatterns.some(p => p.test(lowerMessage))) {
    return 'trading_analysis'
  }
  
  // Default to question
  return 'question'
}

/**
 * Estimate token count for context data
 * Rough approximation: 1 token ≈ 4 characters
 * 
 * @param {Object} contextData - Context data object
 * @returns {number} Estimated token count
 */
export function estimateContextTokens(contextData) {
  if (!contextData) return 0
  
  try {
    const jsonString = JSON.stringify(contextData)
    return Math.ceil(jsonString.length / 4)
  } catch (e) {
    return 0
  }
}

/**
 * Build context based on selected strategy
 * 
 * @param {Object} options - Context building options
 * @param {string} options.strategy - Selected strategy from CONTEXT_STRATEGIES
 * @param {Object} options.fullContext - Full AI context data
 * @param {string} options.conversationSummary - Summary of conversation so far
 * @param {Array} options.recentMessages - Recent message history
 * @param {Object} options.tradingDataSummary - Summarized trading data
 * @returns {Object} Built context for the strategy
 */
export function buildContextForStrategy({
  strategy,
  fullContext,
  conversationSummary = null,
  recentMessages = [],
  tradingDataSummary = null
}) {
  switch (strategy) {
    case CONTEXT_STRATEGIES.FULL:
      return {
        aiContext: fullContext,
        conversationSummary,
        includeRecentMessages: true,
        recentMessageCount: recentMessages.length
      }
      
    case CONTEXT_STRATEGIES.SUMMARY:
      return {
        aiContext: tradingDataSummary || buildTradingDataSummary(fullContext),
        conversationSummary,
        includeRecentMessages: true,
        recentMessageCount: Math.min(recentMessages.length, 6) // Keep last 3 exchanges
      }
      
    case CONTEXT_STRATEGIES.MINIMAL:
      return {
        aiContext: null, // No trading data
        conversationSummary,
        includeRecentMessages: true,
        recentMessageCount: Math.min(recentMessages.length, 4) // Keep last 2 exchanges
      }
      
    case CONTEXT_STRATEGIES.NONE:
      return {
        aiContext: null,
        conversationSummary: null,
        includeRecentMessages: true,
        recentMessageCount: Math.min(recentMessages.length, 2) // Keep last exchange only
      }
      
    default:
      return {
        aiContext: fullContext,
        conversationSummary,
        includeRecentMessages: true,
        recentMessageCount: recentMessages.length
      }
  }
}

/**
 * Build a summarized version of trading data
 * Reduces token count while preserving key metrics
 * 
 * @param {Object} fullContext - Full AI context
 * @returns {Object} Summarized trading data
 */
export function buildTradingDataSummary(fullContext) {
  if (!fullContext) return null
  
  const summary = {}
  
  // Keep core summary
  if (fullContext.summary) {
    summary.summary = {
      totalTrades: fullContext.summary.totalTrades,
      tradingDurationMonths: fullContext.summary.tradingDurationMonths
    }
  }
  
  // Keep key performance metrics only
  if (fullContext.performance) {
    summary.performance = {
      totalPnL: fullContext.performance.totalPnL,
      winRate: fullContext.performance.winRate,
      profitFactor: fullContext.performance.profitFactor,
      avgWin: fullContext.performance.avgWin,
      avgLoss: fullContext.performance.avgLoss
    }
  }
  
  // Keep only top 3 symbols
  if (fullContext.symbols?.mostTraded) {
    summary.topSymbols = fullContext.symbols.mostTraded.slice(0, 3)
  }
  
  // Skip time patterns, behavioral data, recent trades to save tokens
  
  return summary
}

/**
 * Get recommended max messages based on strategy
 * 
 * @param {string} strategy - Context strategy
 * @returns {number} Recommended max messages to include
 */
export function getMaxMessagesForStrategy(strategy) {
  switch (strategy) {
    case CONTEXT_STRATEGIES.FULL:
      return 20 // Last 10 exchanges
    case CONTEXT_STRATEGIES.SUMMARY:
      return 6  // Last 3 exchanges
    case CONTEXT_STRATEGIES.MINIMAL:
      return 4  // Last 2 exchanges
    case CONTEXT_STRATEGIES.NONE:
      return 2  // Last exchange only
    default:
      return 10
  }
}

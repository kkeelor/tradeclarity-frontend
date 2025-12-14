// lib/ai/context/summarizer.js
/**
 * Conversation Summarizer
 * 
 * Summarizes conversation history to reduce context size while
 * preserving important information for continuity.
 * 
 * Uses a fast/cheap model for summarization to minimize costs.
 * 
 * @see docs/MULTI_MODEL_ARCHITECTURE.md
 */

import { PROVIDERS, getModel, getDefaultModel } from '../models/registry.js'
import { createDeepSeekCompletion } from '../deepseek-client.js'

/**
 * Summarization prompts optimized for different contexts
 */
const SUMMARIZATION_PROMPTS = {
  conversation: `Summarize this trading assistant conversation in 2-3 sentences. 
Focus on:
- Main topics discussed (trading performance, specific symbols, patterns)
- Key insights or recommendations given
- Any action items or follow-ups mentioned

Keep it concise - this summary will be used as context for future messages.

Conversation:
{messages}

Summary:`,

  tradingContext: `Summarize this trader's key metrics in a brief paragraph:
- Overall performance (P&L, win rate)
- Strongest areas
- Areas needing improvement
- Notable patterns

Data:
{data}

Summary:`,

  dailyRecap: `Create a brief daily trading recap from this conversation:
- Topics covered
- Key takeaways
- Recommended next steps

Conversation:
{messages}

Recap:`
}

/**
 * Generate a conversation summary
 * 
 * @param {Array} messages - Array of conversation messages
 * @param {Object} options - Summarization options
 * @param {string} options.type - Summary type ('conversation', 'tradingContext', 'dailyRecap')
 * @param {string} options.preferredProvider - Preferred provider for summarization
 * @param {number} options.maxLength - Max summary length in characters
 * @returns {Promise<Object>} Summary result { summary, tokens, provider }
 */
export async function summarizeConversation(messages, options = {}) {
  const {
    type = 'conversation',
    preferredProvider = PROVIDERS.DEEPSEEK, // Use cheap model
    maxLength = 500
  } = options
  
  if (!messages || messages.length === 0) {
    return { summary: null, tokens: 0, provider: null }
  }
  
  // Format messages for summarization
  const formattedMessages = formatMessagesForSummary(messages)
  
  // Get the prompt template
  const promptTemplate = SUMMARIZATION_PROMPTS[type] || SUMMARIZATION_PROMPTS.conversation
  const prompt = promptTemplate.replace('{messages}', formattedMessages)
  
  try {
    // Use DeepSeek for cost-effective summarization
    if (preferredProvider === PROVIDERS.DEEPSEEK && process.env.DEEPSEEK_API_KEY) {
      return await summarizeWithDeepSeek(prompt, maxLength)
    }
    
    // Fallback: Could add Anthropic summarization here
    // For now, return a simple extractive summary
    return extractiveSummary(messages, maxLength)
    
  } catch (error) {
    console.error('[Summarizer] Error generating summary:', error.message)
    // Fallback to extractive summary
    return extractiveSummary(messages, maxLength)
  }
}

/**
 * Summarize using DeepSeek (cheap and fast)
 */
async function summarizeWithDeepSeek(prompt, maxLength) {
  const model = 'deepseek-chat' // Use the cheapest model
  
  const response = await createDeepSeekCompletion({
    model,
    messages: [
      { role: 'user', content: prompt }
    ],
    maxTokens: Math.ceil(maxLength / 4), // Rough token estimate
    temperature: 0.3 // Lower temperature for consistent summaries
  })
  
  const summary = response.choices?.[0]?.message?.content || ''
  const tokens = (response.usage?.prompt_tokens || 0) + (response.usage?.completion_tokens || 0)
  
  return {
    summary: summary.trim().substring(0, maxLength),
    tokens,
    provider: PROVIDERS.DEEPSEEK,
    model
  }
}

/**
 * Simple extractive summary (no API call)
 * Used as fallback when API is unavailable
 */
function extractiveSummary(messages, maxLength) {
  const userMessages = messages.filter(m => m.role === 'user')
  const assistantMessages = messages.filter(m => m.role === 'assistant')
  
  // Extract key topics from user questions
  const topics = userMessages
    .map(m => extractTopic(m.content))
    .filter(Boolean)
    .slice(0, 3)
  
  // Get last assistant insight
  const lastInsight = assistantMessages.length > 0
    ? extractFirstSentence(assistantMessages[assistantMessages.length - 1].content)
    : null
  
  let summary = ''
  if (topics.length > 0) {
    summary = `Discussed: ${topics.join(', ')}.`
  }
  if (lastInsight) {
    summary += ` ${lastInsight}`
  }
  
  return {
    summary: summary.trim().substring(0, maxLength) || 'General trading discussion.',
    tokens: 0,
    provider: null,
    model: null
  }
}

/**
 * Format messages for the summarization prompt
 */
function formatMessagesForSummary(messages) {
  return messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => {
      const role = m.role === 'user' ? 'User' : 'Vega'
      const content = typeof m.content === 'string' 
        ? m.content.substring(0, 300) // Truncate long messages
        : '[Complex content]'
      return `${role}: ${content}`
    })
    .join('\n\n')
}

/**
 * Extract topic from a user message
 */
function extractTopic(content) {
  if (!content || typeof content !== 'string') return null
  
  const topicPatterns = [
    { pattern: /win rate/i, topic: 'win rate' },
    { pattern: /p[&n]l|profit|loss/i, topic: 'P&L analysis' },
    { pattern: /best (time|hour|day)/i, topic: 'trading timing' },
    { pattern: /symbol|pair|btc|eth/i, topic: 'symbol performance' },
    { pattern: /pattern|behavior/i, topic: 'trading patterns' },
    { pattern: /risk|drawdown/i, topic: 'risk management' },
    { pattern: /strategy/i, topic: 'trading strategy' },
    { pattern: /improve|better/i, topic: 'improvement areas' }
  ]
  
  for (const { pattern, topic } of topicPatterns) {
    if (pattern.test(content)) {
      return topic
    }
  }
  
  return null
}

/**
 * Extract first sentence from content
 */
function extractFirstSentence(content) {
  if (!content || typeof content !== 'string') return null
  
  // Find first sentence end
  const match = content.match(/^[^.!?]+[.!?]/)
  return match ? match[0].trim() : content.substring(0, 100).trim()
}

/**
 * Summarize trading data context
 * 
 * @param {Object} aiContext - Full AI context data
 * @param {Object} options - Options
 * @returns {Promise<Object>} Summary result
 */
export async function summarizeTradingContext(aiContext, options = {}) {
  if (!aiContext) {
    return { summary: null, tokens: 0, provider: null }
  }
  
  const {
    preferredProvider = PROVIDERS.DEEPSEEK,
    maxLength = 300
  } = options
  
  // Format data for summarization
  const dataString = JSON.stringify({
    summary: aiContext.summary,
    performance: aiContext.performance,
    topSymbols: aiContext.symbols?.mostTraded?.slice(0, 3)
  }, null, 2)
  
  const prompt = SUMMARIZATION_PROMPTS.tradingContext.replace('{data}', dataString)
  
  try {
    if (preferredProvider === PROVIDERS.DEEPSEEK && process.env.DEEPSEEK_API_KEY) {
      return await summarizeWithDeepSeek(prompt, maxLength)
    }
    
    // Fallback: structured summary without API
    return buildStructuredSummary(aiContext, maxLength)
    
  } catch (error) {
    console.error('[Summarizer] Error summarizing trading context:', error.message)
    return buildStructuredSummary(aiContext, maxLength)
  }
}

/**
 * Build structured summary without API call
 */
function buildStructuredSummary(aiContext, maxLength) {
  const parts = []
  
  if (aiContext.summary) {
    parts.push(`${aiContext.summary.totalTrades} trades over ${aiContext.summary.tradingDurationMonths} months`)
  }
  
  if (aiContext.performance) {
    const p = aiContext.performance
    parts.push(`${p.winRate}% win rate, $${p.totalPnL} P&L`)
  }
  
  if (aiContext.symbols?.mostTraded?.[0]) {
    parts.push(`Most traded: ${aiContext.symbols.mostTraded[0].symbol}`)
  }
  
  return {
    summary: parts.join('. ').substring(0, maxLength),
    tokens: 0,
    provider: null,
    model: null
  }
}

/**
 * Determine if conversation needs summarization
 * 
 * @param {Array} messages - Message history
 * @param {Object} options - Options
 * @returns {boolean}
 */
export function needsSummarization(messages, options = {}) {
  const {
    messageThreshold = 10,
    tokenThreshold = 4000,
    ageThresholdMinutes = 30
  } = options
  
  if (!messages || messages.length < messageThreshold) {
    return false
  }
  
  // Check message count
  if (messages.length >= messageThreshold) {
    return true
  }
  
  // Check estimated tokens
  const estimatedTokens = messages.reduce((sum, m) => {
    const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
    return sum + Math.ceil(content.length / 4)
  }, 0)
  
  if (estimatedTokens >= tokenThreshold) {
    return true
  }
  
  return false
}

/**
 * Split messages into summary + recent for context optimization
 * 
 * @param {Array} messages - Full message history
 * @param {Object} options - Split options
 * @returns {Object} { toSummarize: [], toKeep: [] }
 */
export function splitMessagesForSummarization(messages, options = {}) {
  const {
    keepRecent = 6 // Keep last 3 exchanges
  } = options
  
  if (!messages || messages.length <= keepRecent) {
    return {
      toSummarize: [],
      toKeep: messages || []
    }
  }
  
  return {
    toSummarize: messages.slice(0, -keepRecent),
    toKeep: messages.slice(-keepRecent)
  }
}

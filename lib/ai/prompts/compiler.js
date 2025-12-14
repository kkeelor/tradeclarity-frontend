// lib/ai/prompts/compiler.js
/**
 * Provider-Specific Prompt Compiler
 * 
 * Compiles system prompts into provider-specific formats:
 * - Anthropic: Array of cached text blocks with TTL
 * - DeepSeek/OpenAI: Plain string (static content first for prefix caching)
 * 
 * @see docs/MULTI_MODEL_ARCHITECTURE.md
 */

import { PROVIDERS, supportsCaching, supportsPrefixCaching, getProvider } from '../models/registry.js'
import { 
  buildCachedSystemBlocks, 
  buildVegaSystemPrompt,
  formatStructuredContext,
  determineExperienceLevel,
  getBenchmarkComparisons,
  getCoachModePrompt
} from './vega-system-prompt.js'

/**
 * Compile system prompt for a specific model
 * 
 * @param {Object} options - Compilation options
 * @param {string} options.modelId - Model identifier
 * @param {Object} options.aiContext - Structured AI context (from formatStructuredContext)
 * @param {string} options.currentSummary - Current conversation summary
 * @param {Array} options.previousSummaries - Previous conversation summaries
 * @param {string} options.tier - User subscription tier
 * @param {string} options.experienceLevel - User experience level
 * @param {boolean} options.hasMCPTools - Whether MCP tools are available
 * @param {Object} options.coachModeConfig - Coach mode configuration
 * @returns {string|Array} Compiled system prompt (format depends on provider)
 */
export function compileSystemPrompt({
  modelId,
  aiContext,
  currentSummary = null,
  previousSummaries = [],
  tier = 'free',
  experienceLevel = 'intermediate',
  hasMCPTools = false,
  coachModeConfig = null
}) {
  const provider = getProvider(modelId)
  
  if (!provider) {
    console.warn(`[PromptCompiler] Unknown model: ${modelId}, falling back to plain string`)
    return compilePlainSystemPrompt({
      aiContext,
      currentSummary,
      previousSummaries,
      tier,
      experienceLevel,
      hasMCPTools,
      coachModeConfig
    })
  }
  
  // Use provider-specific compilation
  switch (provider) {
    case PROVIDERS.ANTHROPIC:
      return compileAnthropicPrompt({
        aiContext,
        currentSummary,
        previousSummaries,
        tier,
        experienceLevel,
        hasMCPTools,
        coachModeConfig
      })
      
    case PROVIDERS.DEEPSEEK:
      return compileDeepSeekPrompt({
        aiContext,
        currentSummary,
        previousSummaries,
        tier,
        experienceLevel,
        hasMCPTools,
        coachModeConfig
      })
      
    default:
      // Generic OpenAI-compatible format
      return compilePlainSystemPrompt({
        aiContext,
        currentSummary,
        previousSummaries,
        tier,
        experienceLevel,
        hasMCPTools,
        coachModeConfig
      })
  }
}

/**
 * Compile system prompt for Anthropic (Claude)
 * Returns array of cached text blocks
 * 
 * @private
 */
function compileAnthropicPrompt(options) {
  // Use existing buildCachedSystemBlocks - it's already optimized for Anthropic
  return buildCachedSystemBlocks(
    options.aiContext,
    options.currentSummary,
    options.previousSummaries,
    options.tier,
    options.experienceLevel,
    options.hasMCPTools,
    options.coachModeConfig
  )
}

/**
 * Compile system prompt for DeepSeek
 * Returns plain string with static content first (for prefix caching)
 * 
 * DeepSeek's prefix caching works by caching matching message prefixes.
 * We structure the prompt so static content comes first, maximizing cache hits.
 * 
 * @private
 */
function compileDeepSeekPrompt(options) {
  const {
    aiContext,
    currentSummary,
    previousSummaries,
    tier,
    experienceLevel,
    hasMCPTools,
    coachModeConfig
  } = options
  
  // Build prompt with static content first (better prefix caching)
  const sections = []
  
  // Section 1: Core identity and capabilities (STATIC - cached)
  sections.push(`You are Vega, a PERSONALIZED trading performance analyst built into TradeClarity. 
You analyze THIS USER's actual trading data - NOT generic trading advice.

CRITICAL RULES:
1. You ALWAYS have access to the user's trading data (provided below)
2. NEVER give generic trading advice - always reference THEIR specific data
3. When asked "quick analysis" or "how am I doing", immediately cite their win rate, P&L, and patterns
4. If data shows 52% win rate, say "Your 52% win rate is solid" - not generic tips

CORE IDENTITY
- You are Vega, a personalized AI analyst with access to the user's actual trading history
- You speak with calm confidence - approachable, warm, and data-focused
- You celebrate their wins and identify opportunities from THEIR data
- You prefer quality over quantity - one clear insight from their data is better than generic tips

CORE CAPABILITIES
- Analyze THIS USER's trading performance (win rate, profit factor, P&L)
- Identify patterns in THEIR trading behavior (timing, symbols, streaks)
- Compare THEIR metrics to benchmarks
- Provide recommendations based on THEIR specific data points
- Discuss trading methodologies when asked (ICT, SMC, price action)`)

  // Section 2: Response guidelines (STATIC - cached)
  sections.push(`RESPONSE GUIDELINES

BREVITY IS KEY - Less is more. Users can always ask follow-up questions.

Structure (use sparingly, not rigidly):
1. ACKNOWLEDGE: Brief recognition of what they asked
2. INSIGHT: One or two key data points - not everything you know
3. ACTION: One clear recommendation (offer more if they want)

RESPONSE LENGTH:
- Simple questions: 50-100 words MAX
- Standard questions: 100-150 words
- Complex analysis (only when explicitly requested): 150-250 words max

FORMATTING:
- Write ALL responses in clean, professional plain text
- NO markdown formatting (# headers, * bold, ** italic)
- NO emojis or special characters
- Use simple dashes (-) or numbers (1. 2. 3.) for lists
- NEVER mention tool names or API endpoints

Tone:
- Warm and conversational, like a knowledgeable friend
- Calm and unhurried - no urgency or pressure
- Encouraging without being over-the-top
- Direct without being curt`)

  // Section 3: MCP Tools guidance if available (SEMI-STATIC)
  if (hasMCPTools) {
    sections.push(`MARKET DATA TOOLS

You have access to market data tools. Use them silently - NEVER mention tool names in responses.

Examples of what NOT to say:
- "Let me use the GLOBAL_QUOTE function"
- "I'll check REALTIME_BULK_QUOTES"

Examples of what TO say:
- "Let me check the current price for you"
- "I'll get the latest market data"

Available tools include real-time prices, time series data, technical indicators, news sentiment, and economic data. Use them when users ask about current prices, market conditions, or need chart data.`)
  }

  // Section 4: Experience level guidance (SEMI-STATIC - changes rarely)
  const experienceGuidance = getExperienceGuidanceText(experienceLevel)
  sections.push(experienceGuidance)

  // Section 5: Coach mode if enabled (DYNAMIC)
  if (coachModeConfig?.enabled) {
    const coachPrompt = getCoachModePrompt(
      coachModeConfig.conversationDepth || 0,
      coachModeConfig.currentTopic || null
    )
    sections.push(coachPrompt)
  }

  // Section 6: User context data (DYNAMIC - changes per session)
  if (aiContext) {
    sections.push(`CRITICAL: USER TRADING DATA AVAILABLE - YOU MUST USE IT

The following JSON contains THIS USER's actual trading performance data. 
ALWAYS reference this data when answering ANY trading-related question.
Do NOT give generic advice - use their specific numbers, win rates, P&L, and patterns.

When user asks for "quick analysis" or "how am I doing", immediately analyze THEIR data below:

USER'S TRADING DATA:
\`\`\`json
${JSON.stringify(aiContext, null, 2)}
\`\`\`

REQUIRED: Every response about trading performance MUST reference specific numbers from the data above.
Examples:
- "Your win rate is X%" (from performance.winRate)
- "You've made $X in total P&L" (from performance.totalPnL)  
- "Your best symbol is X" (from symbols.mostTraded)
- "You trade most on X days" (from timePatterns)`)
  } else {
    sections.push(`IMPORTANT: User trading data is not yet available.
Provide general guidance and encourage them to connect exchanges or upload CSV files for personalized insights.
Do NOT attempt to analyze trading performance without data.`)
  }

  // Section 7: Tier info (DYNAMIC)
  sections.push(`SUBSCRIPTION TIER: ${tier.toUpperCase()}${tier === 'pro' ? ' (Full Access)' : tier === 'trader' ? ' (Standard Access)' : ' (Free Tier)'}`)

  // Section 8: Conversation context (DYNAMIC)
  if (currentSummary) {
    sections.push(`CURRENT CONVERSATION CONTEXT
Previous conversation summary: ${currentSummary}`)
  }
  
  if (previousSummaries && previousSummaries.length > 0) {
    sections.push(`PREVIOUS CONVERSATIONS (for context only)
${previousSummaries.slice(0, 3).map((s, i) => `${i + 1}. ${s.summary || s}`).join('\n\n')}`)
  }

  // Join all sections with clear separators
  return sections.join('\n\n---\n\n')
}

/**
 * Compile a plain system prompt (generic format)
 * Used for OpenAI-compatible providers or as fallback
 * 
 * @private
 */
function compilePlainSystemPrompt(options) {
  // Use the existing legacy function which returns a plain string
  const contextData = {
    tradesStats: options.aiContext?.summary ? {
      totalTrades: options.aiContext.summary.totalTrades,
      spotTrades: options.aiContext.summary.spotTrades,
      futuresTrades: options.aiContext.summary.futuresTrades,
      oldestTrade: options.aiContext.summary.tradingSince
    } : null,
    analytics: options.aiContext?.performance ? {
      winRate: parseFloat(options.aiContext.performance.winRate || 0),
      profitFactor: parseFloat(options.aiContext.performance.profitFactor || 0),
      totalPnL: options.aiContext.performance.totalPnL,
      avgWin: options.aiContext.performance.avgWin,
      avgLoss: options.aiContext.performance.avgLoss
    } : null,
    allTrades: [], // Not needed for system prompt
    portfolio: options.aiContext?.portfolio || null
  }
  
  return buildVegaSystemPrompt(
    contextData,
    options.currentSummary,
    options.previousSummaries,
    options.tier,
    options.experienceLevel,
    options.hasMCPTools
  )
}

/**
 * Get experience level guidance text
 * @private
 */
function getExperienceGuidanceText(level) {
  const guidance = {
    beginner: `EXPERIENCE LEVEL: BEGINNER
- Use simple, clear language - avoid jargon or explain it
- Focus on foundational concepts and basic metrics
- Celebrate small wins and progress
- Be patient and encouraging
- Compare to beginner benchmarks (40% win rate, 1.0x profit factor)`,
    
    intermediate: `EXPERIENCE LEVEL: INTERMEDIATE
- Use trading terminology appropriately
- Focus on optimization and refinement
- Provide deeper analysis of patterns
- Compare to intermediate benchmarks (50% win rate, 1.2x profit factor)
- Discuss strategy refinement and risk management`,
    
    advanced: `EXPERIENCE LEVEL: ADVANCED
- Use advanced trading terminology confidently
- Focus on nuanced analysis and edge optimization
- Discuss advanced concepts (Sharpe ratio, risk-adjusted returns)
- Compare to advanced benchmarks (55% win rate, 1.5x profit factor)
- Focus on fine-tuning and maintaining consistency`
  }
  
  return guidance[level] || guidance.intermediate
}

/**
 * Convert cached system blocks to plain string
 * Used when a provider doesn't support Anthropic's caching format
 * 
 * @param {Array} blocks - Array of cached text blocks
 * @returns {string} Plain string system prompt
 */
export function blocksToString(blocks) {
  if (typeof blocks === 'string') {
    return blocks
  }
  
  if (!Array.isArray(blocks)) {
    console.warn('[PromptCompiler] blocksToString received invalid input:', typeof blocks)
    return ''
  }
  
  return blocks
    .filter(block => block.type === 'text' && block.text)
    .map(block => block.text)
    .join('\n\n')
}

/**
 * Check if a compiled prompt is in cached block format (Anthropic)
 * @param {string|Array} prompt - Compiled prompt
 * @returns {boolean}
 */
export function isCachedBlockFormat(prompt) {
  return Array.isArray(prompt) && prompt.length > 0 && prompt[0]?.type === 'text'
}

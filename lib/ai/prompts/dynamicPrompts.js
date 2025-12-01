// lib/ai/prompts/dynamicPrompts.js
/**
 * Dynamic Prompt Engine
 * 
 * Generates personalized, context-aware prompts based on:
 * - User's trading data (symbols, win rate, P&L, etc.)
 * - Time context (time of day, days since last visit, recent activity)
 * - Conversation history (topics explored, questions asked)
 * - Performance patterns (streaks, changes, anomalies)
 * 
 * Phase 1-2 Implementation (no new DB tables required)
 */

import { determineExperienceLevel } from './vega-system-prompt'

// ============================================================================
// PERSONALIZED PROMPT TEMPLATES
// ============================================================================

/**
 * Templates with data interpolation placeholders
 * 
 * IMPORTANT: These are USER QUESTIONS (what the user types), not AI responses!
 * They should be phrased as questions the user would ask Vega.
 * 
 * Each template has:
 * - template: String with {placeholder} for data - phrased as USER question
 * - condition: Function that returns true if this prompt is relevant
 * - priority: Higher = more likely to be shown (0-100)
 * - category: For diversity selection
 */
const PERSONALIZED_TEMPLATES = {
  // -------------------------------------------------------------------------
  // PERFORMANCE QUESTIONS (High Priority)
  // -------------------------------------------------------------------------
  strongWinRate: {
    template: "What's making my {winRate}% win rate work?",
    condition: (ctx) => ctx.winRate >= 55,
    priority: 75,
    category: 'performance'
  },
  weakWinRate: {
    template: "Why is my win rate only {winRate}%?",
    condition: (ctx) => ctx.winRate > 0 && ctx.winRate < 40,
    priority: 90,
    category: 'performance'
  },
  profitableTrader: {
    template: "What's my edge that's made me ${totalPnL}?",
    condition: (ctx) => ctx.totalPnL > 100,
    priority: 70,
    category: 'performance'
  },
  losingTrader: {
    template: "Why am I down ${totalPnL}? What's going wrong?",
    condition: (ctx) => ctx.totalPnL < -100,
    priority: 95,
    category: 'performance'
  },

  // -------------------------------------------------------------------------
  // SYMBOL-SPECIFIC QUESTIONS (Medium-High Priority)
  // -------------------------------------------------------------------------
  bestSymbol: {
    template: "Why is {bestSymbol} my best performer at {bestSymbolWinRate}%?",
    condition: (ctx) => ctx.bestSymbol && ctx.bestSymbolWinRate >= 60,
    priority: 80,
    category: 'symbols'
  },
  worstSymbol: {
    template: "What's wrong with my {worstSymbol} trades?",
    condition: (ctx) => ctx.worstSymbol && ctx.worstSymbolWinRate < 35 && ctx.worstSymbolTrades >= 5,
    priority: 85,
    category: 'symbols'
  },
  topSymbolFocus: {
    template: "How are my {topSymbol} trades performing?",
    condition: (ctx) => ctx.topSymbol && ctx.topSymbolTrades >= 10,
    priority: 65,
    category: 'symbols'
  },
  diversePortfolio: {
    template: "Am I trading too many symbols ({uniqueSymbols} pairs)?",
    condition: (ctx) => ctx.uniqueSymbols >= 8,
    priority: 60,
    category: 'symbols'
  },

  // -------------------------------------------------------------------------
  // RECENT ACTIVITY QUESTIONS (High Priority - Time Sensitive)
  // -------------------------------------------------------------------------
  recentTrades: {
    template: "How did my last {recentTradeCount} trades go?",
    condition: (ctx) => ctx.recentTradeCount > 0 && ctx.recentTradeCount <= 20,
    priority: 85,
    category: 'activity'
  },
  heavyTrading: {
    template: "Am I overtrading? I took {recentTradeCount} trades this week",
    condition: (ctx) => ctx.recentTradeCount > 20,
    priority: 88,
    category: 'activity'
  },
  noRecentTrades: {
    template: "What should I focus on after {daysSinceLastTrade} days away?",
    condition: (ctx) => ctx.daysSinceLastTrade >= 7 && ctx.daysSinceLastTrade < 30,
    priority: 70,
    category: 'activity'
  },
  longAbsence: {
    template: "Give me a recap - it's been {daysSinceLastTrade} days",
    condition: (ctx) => ctx.daysSinceLastTrade >= 30,
    priority: 75,
    category: 'activity'
  },

  // -------------------------------------------------------------------------
  // STREAKS & PATTERNS QUESTIONS (High Priority)
  // -------------------------------------------------------------------------
  winningStreak: {
    template: "What's working in my {winStreak}-trade win streak?",
    condition: (ctx) => ctx.winStreak >= 3,
    priority: 82,
    category: 'patterns'
  },
  losingStreak: {
    template: "Help me break my {loseStreak}-trade losing streak",
    condition: (ctx) => ctx.loseStreak >= 3,
    priority: 92,
    category: 'patterns'
  },
  consistentTrader: {
    template: "Is {avgTradesPerWeek} trades per week too many?",
    condition: (ctx) => ctx.avgTradesPerWeek >= 5 && ctx.avgTradesPerWeek <= 20,
    priority: 55,
    category: 'patterns'
  },

  // -------------------------------------------------------------------------
  // TIMING QUESTIONS (Medium Priority)
  // -------------------------------------------------------------------------
  bestTimeSlot: {
    template: "Why do I perform better during {bestTimeSlot}?",
    condition: (ctx) => ctx.bestTimeSlot && ctx.bestTimeSlotWinRate >= 55,
    priority: 68,
    category: 'timing'
  },
  worstTimeSlot: {
    template: "Should I avoid trading during {worstTimeSlot}?",
    condition: (ctx) => ctx.worstTimeSlot && ctx.worstTimeSlotWinRate < 40,
    priority: 72,
    category: 'timing'
  },

  // -------------------------------------------------------------------------
  // RISK MANAGEMENT QUESTIONS (Medium-High Priority)
  // -------------------------------------------------------------------------
  highAvgLoss: {
    template: "How can I reduce my average loss of ${avgLoss}?",
    condition: (ctx) => ctx.avgLoss && ctx.avgWin && ctx.lossToWinRatio > 1.5,
    priority: 78,
    category: 'risk'
  },
  goodRiskReward: {
    template: "How can I maintain my {winToLossRatio}x reward ratio?",
    condition: (ctx) => ctx.avgLoss && ctx.avgWin && ctx.winToLossRatio >= 1.5,
    priority: 60,
    category: 'risk'
  },
  positionSizing: {
    template: "Is my position sizing consistent?",
    condition: (ctx) => ctx.largestTrade && ctx.largestTrade > ctx.avgTradeSize * 3,
    priority: 65,
    category: 'risk'
  },

  // -------------------------------------------------------------------------
  // MILESTONE QUESTIONS (Lower Priority but Engaging)
  // -------------------------------------------------------------------------
  tradeCountMilestone: {
    template: "What patterns do you see in my {totalTrades} trades?",
    condition: (ctx) => ctx.totalTrades >= 100 && ctx.totalTrades % 100 < 10,
    priority: 50,
    category: 'milestone'
  },
  firstHundred: {
    template: "I'm almost at 100 trades - what should I know?",
    condition: (ctx) => ctx.totalTrades >= 80 && ctx.totalTrades < 100,
    priority: 55,
    category: 'milestone'
  },

  // -------------------------------------------------------------------------
  // RETURNING USER QUESTIONS (High Priority)
  // -------------------------------------------------------------------------
  welcomeBack: {
    template: "Can we follow up on {lastTopic}?",
    condition: (ctx) => ctx.lastTopic && ctx.daysSinceLastConversation >= 1,
    priority: 88,
    category: 'returning'
  },
  newDataSinceLastVisit: {
    template: "Analyze my {newTradesSinceLastVisit} new trades",
    condition: (ctx) => ctx.newTradesSinceLastVisit >= 5,
    priority: 90,
    category: 'returning'
  }
}

// ============================================================================
// FALLBACK QUESTION POOLS (when no personalized templates match)
// ============================================================================

const FALLBACK_BY_EXPERIENCE = {
  beginner: [
    "What are my biggest trading mistakes?",
    "How can I improve my entries?",
    "Am I risking too much per trade?",
    "Which trades should I avoid?",
    "What's one thing I should focus on?"
  ],
  intermediate: [
    "What patterns appear in my losing trades?",
    "How can I improve my risk-adjusted returns?",
    "Should I specialize in fewer symbols?",
    "What's my optimal trade frequency?",
    "Where's my biggest edge?"
  ],
  advanced: [
    "How can I optimize my position sizing?",
    "What correlations exist in my trades?",
    "Analyze my performance by market conditions",
    "What behavioral patterns affect my trading?",
    "How can I compound my edge?"
  ]
}

const FALLBACK_NO_DATA = [
  "What can Vega help me with?",
  "How do I connect my exchange?",
  "Show me what insights I'll get",
  "What makes Vega different?",
  "How does the AI analysis work?"
]

// ============================================================================
// GREETING SYSTEM
// ============================================================================

const GREETINGS = {
  timeOfDay: {
    morning: "Good morning!",
    afternoon: "Good afternoon!",
    evening: "Good evening!",
    night: "Hey night owl!"
  },
  returning: {
    sameDay: "Back again!",
    nextDay: "Good to see you!",
    fewDays: "Been a few days!",
    week: "It's been a while!",
    month: "Great to see you again!"
  },
  firstTime: "Welcome to Vega!"
}

/**
 * Generate a contextual greeting (deterministic - no randomness)
 */
export function generateGreeting(ctx) {
  const hour = new Date().getHours()
  let timeGreeting = ''
  
  if (hour >= 5 && hour < 12) {
    timeGreeting = GREETINGS.timeOfDay.morning
  } else if (hour >= 12 && hour < 17) {
    timeGreeting = GREETINGS.timeOfDay.afternoon
  } else if (hour >= 17 && hour < 21) {
    timeGreeting = GREETINGS.timeOfDay.evening
  } else {
    timeGreeting = GREETINGS.timeOfDay.night
  }

  // Add returning context
  if (ctx.isFirstVisit) {
    return `${GREETINGS.firstTime} ${getFirstVisitMessage(ctx)}`
  }

  if (ctx.daysSinceLastConversation !== null) {
    let returningGreeting = ''
    if (ctx.daysSinceLastConversation === 0) {
      returningGreeting = GREETINGS.returning.sameDay
    } else if (ctx.daysSinceLastConversation === 1) {
      returningGreeting = GREETINGS.returning.nextDay
    } else if (ctx.daysSinceLastConversation <= 3) {
      returningGreeting = GREETINGS.returning.fewDays
    } else if (ctx.daysSinceLastConversation <= 7) {
      returningGreeting = GREETINGS.returning.week
    } else {
      returningGreeting = GREETINGS.returning.month
    }
    return `${timeGreeting} ${returningGreeting}`
  }

  return timeGreeting
}

function getFirstVisitMessage(ctx) {
  if (ctx.totalTrades > 0) {
    return `I see ${ctx.totalTrades.toLocaleString()} trades to analyze.`
  }
  return "Connect your exchange or upload trades to get started."
}

// ============================================================================
// CONTEXT BUILDER
// ============================================================================

/**
 * Build rich context from user data for prompt generation
 * @param {Object} tradesStats - Basic trade statistics
 * @param {Object} analytics - Full analytics data
 * @param {Array} previousConversations - Array of previous conversation summaries
 * @param {Object} options - Additional options
 */
export function buildPromptContext(tradesStats, analytics, previousConversations = [], options = {}) {
  const now = new Date()
  const ctx = {
    // Basic flags
    hasData: tradesStats && tradesStats.totalTrades > 0,
    isFirstVisit: !previousConversations || previousConversations.length === 0,
    
    // Trade counts
    totalTrades: tradesStats?.totalTrades || 0,
    spotTrades: tradesStats?.spotTrades || 0,
    futuresTrades: tradesStats?.futuresIncome || 0,
    
    // Time context
    timeOfDay: getTimeOfDay(now),
    daysSinceLastTrade: null,
    daysSinceLastConversation: null,
    recentTradeCount: 0,
    recentPeriod: '7 days',
    
    // Performance metrics
    winRate: null,
    totalPnL: null,
    profitFactor: null,
    avgWin: null,
    avgLoss: null,
    lossToWinRatio: null,
    winToLossRatio: null,
    
    // Symbol analysis
    bestSymbol: null,
    bestSymbolWinRate: null,
    worstSymbol: null,
    worstSymbolWinRate: null,
    worstSymbolTrades: 0,
    topSymbol: null,
    topSymbolTrades: 0,
    uniqueSymbols: 0,
    
    // Patterns
    winStreak: 0,
    loseStreak: 0,
    avgTradesPerWeek: 0,
    
    // Timing
    bestTimeSlot: null,
    bestTimeSlotWinRate: null,
    worstTimeSlot: null,
    worstTimeSlotWinRate: null,
    
    // Risk metrics
    largestTrade: null,
    avgTradeSize: null,
    
    // Conversation context
    lastTopic: null,
    exploredTopics: [],
    newTradesSinceLastVisit: 0,
    
    // Experience
    experienceLevel: 'intermediate'
  }

  if (!ctx.hasData) {
    return ctx
  }

  // Calculate days since last trade
  if (tradesStats?.newestTrade) {
    const lastTradeDate = new Date(tradesStats.newestTrade)
    ctx.daysSinceLastTrade = Math.floor((now - lastTradeDate) / (1000 * 60 * 60 * 24))
  }

  // Calculate days since last conversation
  if (previousConversations && previousConversations.length > 0) {
    const lastConv = previousConversations[0] // Most recent first
    if (lastConv.created_at || lastConv.updated_at) {
      const lastConvDate = new Date(lastConv.updated_at || lastConv.created_at)
      ctx.daysSinceLastConversation = Math.floor((now - lastConvDate) / (1000 * 60 * 60 * 24))
    }
    
    // Extract last topic from summary
    ctx.lastTopic = extractTopicFromSummary(lastConv.summary)
    
    // Build explored topics list
    ctx.exploredTopics = extractTopicsFromConversations(previousConversations)
  }

  // Performance metrics from analytics
  if (analytics) {
    ctx.winRate = analytics.winRate ? Math.round(analytics.winRate * 100) / 100 : null
    ctx.totalPnL = analytics.totalPnL ? Math.round(analytics.totalPnL * 100) / 100 : null
    ctx.profitFactor = analytics.profitFactor || null
    ctx.avgWin = analytics.avgWin ? Math.round(analytics.avgWin * 100) / 100 : null
    ctx.avgLoss = analytics.avgLoss ? Math.abs(Math.round(analytics.avgLoss * 100) / 100) : null
    
    if (ctx.avgWin && ctx.avgLoss) {
      ctx.lossToWinRatio = Math.round((ctx.avgLoss / ctx.avgWin) * 10) / 10
      ctx.winToLossRatio = Math.round((ctx.avgWin / ctx.avgLoss) * 10) / 10
    }

    // Symbol analysis
    if (analytics.symbols && typeof analytics.symbols === 'object') {
      const symbolEntries = Object.entries(analytics.symbols)
      if (symbolEntries.length > 0) {
        ctx.uniqueSymbols = symbolEntries.length
        
        // Find best and worst symbols (min 5 trades)
        const qualifiedSymbols = symbolEntries.filter(([_, data]) => (data.totalTrades || data.trades || 0) >= 5)
        
        if (qualifiedSymbols.length > 0) {
          const sorted = qualifiedSymbols.sort((a, b) => {
            const aWinRate = a[1].winRate || 0
            const bWinRate = b[1].winRate || 0
            return bWinRate - aWinRate
          })
          
          const best = sorted[0]
          const worst = sorted[sorted.length - 1]
          
          ctx.bestSymbol = best[0]
          ctx.bestSymbolWinRate = Math.round((best[1].winRate || 0) * 100) / 100
          ctx.worstSymbol = worst[0]
          ctx.worstSymbolWinRate = Math.round((worst[1].winRate || 0) * 100) / 100
          ctx.worstSymbolTrades = worst[1].totalTrades || worst[1].trades || 0
        }
        
        // Find most traded symbol
        const byVolume = symbolEntries.sort((a, b) => {
          const aTrades = a[1].totalTrades || a[1].trades || 0
          const bTrades = b[1].totalTrades || b[1].trades || 0
          return bTrades - aTrades
        })
        
        if (byVolume.length > 0) {
          ctx.topSymbol = byVolume[0][0]
          ctx.topSymbolTrades = byVolume[0][1].totalTrades || byVolume[0][1].trades || 0
        }
      }
    }

    // Time analysis
    if (analytics.hourlyStats || analytics.timeAnalysis) {
      const timeData = analytics.hourlyStats || analytics.timeAnalysis
      // Find best and worst time slots
      const timeSlots = extractTimeSlots(timeData)
      if (timeSlots.best) {
        ctx.bestTimeSlot = timeSlots.best.label
        ctx.bestTimeSlotWinRate = timeSlots.best.winRate
      }
      if (timeSlots.worst) {
        ctx.worstTimeSlot = timeSlots.worst.label
        ctx.worstTimeSlotWinRate = timeSlots.worst.winRate
      }
    }

    // Streak detection
    if (analytics.recentTrades && Array.isArray(analytics.recentTrades)) {
      const streaks = calculateStreaks(analytics.recentTrades)
      ctx.winStreak = streaks.currentWinStreak
      ctx.loseStreak = streaks.currentLoseStreak
    }

    // Recent activity
    if (analytics.recentTrades && Array.isArray(analytics.recentTrades)) {
      ctx.recentTradeCount = analytics.recentTrades.filter(t => {
        const tradeDate = new Date(t.time || t.trade_time)
        const daysDiff = (now - tradeDate) / (1000 * 60 * 60 * 24)
        return daysDiff <= 7
      }).length
    }

    // Trading frequency
    if (tradesStats?.oldestTrade && tradesStats?.newestTrade) {
      const tradingDays = Math.max(1, Math.ceil(
        (new Date(tradesStats.newestTrade) - new Date(tradesStats.oldestTrade)) / (1000 * 60 * 60 * 24)
      ))
      const weeks = Math.max(1, tradingDays / 7)
      ctx.avgTradesPerWeek = Math.round(ctx.totalTrades / weeks)
    }

    // Risk metrics
    if (analytics.largestWin || analytics.largestLoss) {
      ctx.largestTrade = Math.max(
        Math.abs(analytics.largestWin || 0),
        Math.abs(analytics.largestLoss || 0)
      )
    }
    if (analytics.avgTradeSize) {
      ctx.avgTradeSize = analytics.avgTradeSize
    }
  }

  // Experience level
  ctx.experienceLevel = determineExperienceLevel(tradesStats, analytics)

  return ctx
}

// ============================================================================
// PROMPT GENERATOR
// ============================================================================

/**
 * Generate dynamic, personalized prompts
 * @param {Object} ctx - Context from buildPromptContext
 * @param {Object} options - Generation options
 * @returns {Object} { greeting: string, prompts: string[] }
 */
export function generateDynamicPrompts(ctx, options = {}) {
  const {
    maxPrompts = 5,
    includeGreeting = true,
    coachMode = false
  } = options

  // No data case
  if (!ctx.hasData) {
    return {
      greeting: includeGreeting ? generateGreeting(ctx) : null,
      prompts: FALLBACK_NO_DATA.slice(0, maxPrompts)
    }
  }

  const candidates = []

  // Evaluate all personalized templates
  Object.entries(PERSONALIZED_TEMPLATES).forEach(([key, template]) => {
    try {
      if (template.condition(ctx)) {
        const text = interpolateTemplate(template.template, ctx)
        
        // Skip if this topic was recently explored
        const topic = template.category
        const recentlyExplored = ctx.exploredTopics.includes(topic)
        const adjustedPriority = recentlyExplored ? template.priority - 30 : template.priority
        
        candidates.push({
          text,
          priority: adjustedPriority,
          category: template.category,
          key
        })
      }
    } catch (e) {
      // Skip templates that fail to evaluate
      console.warn(`Template ${key} failed:`, e.message)
    }
  })

  // Add fallback questions based on experience level
  const fallbacks = FALLBACK_BY_EXPERIENCE[ctx.experienceLevel] || FALLBACK_BY_EXPERIENCE.intermediate
  fallbacks.forEach((q, i) => {
    candidates.push({
      text: q,
      priority: 30 - i, // Lower priority than personalized
      category: 'fallback',
      key: `fallback_${i}`
    })
  })

  // Sort by priority
  candidates.sort((a, b) => b.priority - a.priority)

  // Select diverse prompts (not all from same category)
  const selected = selectDiversePrompts(candidates, maxPrompts)

  // For coach mode, make prompts shorter
  const finalPrompts = coachMode
    ? selected.map(p => shortenPrompt(p.text))
    : selected.map(p => p.text)

  return {
    greeting: includeGreeting ? generateGreeting(ctx) : null,
    prompts: finalPrompts
  }
}

/**
 * Get coach mode starters (very short prompts)
 */
export function getCoachModeStarters(ctx, maxPrompts = 5) {
  if (!ctx.hasData) {
    return [
      "What can you help me with?",
      "How does this work?",
      "Show me the demo",
      "Teach me about trading"
    ].slice(0, maxPrompts)
  }

  const starters = []

  // Add contextual short prompts
  if (ctx.totalPnL < 0) starters.push("Why am I losing?")
  if (ctx.winRate < 45) starters.push("Fix my win rate")
  if (ctx.loseStreak >= 3) starters.push("Breaking my losing streak")
  if (ctx.winStreak >= 3) starters.push("What's working?")
  if (ctx.bestSymbol) starters.push(`Analyze my ${ctx.bestSymbol}`)
  if (ctx.recentTradeCount > 0) starters.push("Review recent trades")
  
  // Standard starters
  starters.push("Quick analysis")
  starters.push("What should I focus on?")
  starters.push("My biggest weakness")
  starters.push("Where's my edge?")
  starters.push("Improve my trading")

  // Dedupe and return
  return [...new Set(starters)].slice(0, maxPrompts)
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function getTimeOfDay(date) {
  const hour = date.getHours()
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

function interpolateTemplate(template, ctx) {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = ctx[key]
    if (value === null || value === undefined) {
      throw new Error(`Missing context key: ${key}`)
    }
    // Format numbers nicely
    if (typeof value === 'number') {
      if (key.toLowerCase().includes('pnl') || key.toLowerCase().includes('loss') || key.toLowerCase().includes('win')) {
        return Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 })
      }
      if (key.toLowerCase().includes('rate') || key.toLowerCase().includes('ratio')) {
        return value.toFixed(1)
      }
      return value.toLocaleString()
    }
    return value
  })
}

function selectDiversePrompts(candidates, maxPrompts) {
  const selected = []
  const usedCategories = new Set()
  
  // First pass: one from each category (prioritized)
  for (const candidate of candidates) {
    if (selected.length >= maxPrompts) break
    if (!usedCategories.has(candidate.category)) {
      selected.push(candidate)
      usedCategories.add(candidate.category)
    }
  }
  
  // Second pass: fill remaining slots with highest priority
  for (const candidate of candidates) {
    if (selected.length >= maxPrompts) break
    if (!selected.find(s => s.text === candidate.text)) {
      selected.push(candidate)
    }
  }
  
  return selected
}

function shortenPrompt(prompt) {
  // Remove filler words and shorten for coach mode
  return prompt
    .replace(/^(Let's|Want to|Should we|How about we)\s+/i, '')
    .replace(/\s+-\s+.*$/, '') // Remove explanations after dash
    .replace(/\?.*$/, '?') // Keep just the question
    .substring(0, 50) + (prompt.length > 50 ? '...' : '')
}

function extractTopicFromSummary(summary) {
  if (!summary) return null
  
  // Look for key topic indicators in summary
  const topicPatterns = [
    { pattern: /win rate/i, topic: 'win rate' },
    { pattern: /risk management/i, topic: 'risk management' },
    { pattern: /position siz/i, topic: 'position sizing' },
    { pattern: /losing trades?|losses/i, topic: 'losing trades' },
    { pattern: /winning trades?|wins/i, topic: 'winning trades' },
    { pattern: /overtrading/i, topic: 'trading frequency' },
    { pattern: /symbols?|pairs?/i, topic: 'symbol analysis' },
    { pattern: /timing|hours?|session/i, topic: 'timing' },
    { pattern: /pattern|behavior/i, topic: 'trading patterns' }
  ]
  
  for (const { pattern, topic } of topicPatterns) {
    if (pattern.test(summary)) {
      return topic
    }
  }
  
  return null
}

function extractTopicsFromConversations(conversations) {
  const topics = new Set()
  
  conversations.forEach(conv => {
    const topic = extractTopicFromSummary(conv.summary)
    if (topic) topics.add(topic)
    
    // Also check title
    const titleTopic = extractTopicFromSummary(conv.title)
    if (titleTopic) topics.add(titleTopic)
  })
  
  return Array.from(topics)
}

function extractTimeSlots(timeData) {
  // Handle different time data formats
  let slots = []
  
  if (Array.isArray(timeData)) {
    slots = timeData
  } else if (typeof timeData === 'object') {
    slots = Object.entries(timeData).map(([key, value]) => ({
      label: key,
      winRate: value.winRate || value.win_rate || 0,
      trades: value.trades || value.count || 0
    }))
  }
  
  // Filter to slots with enough trades
  const qualified = slots.filter(s => (s.trades || 0) >= 5)
  if (qualified.length === 0) return { best: null, worst: null }
  
  const sorted = qualified.sort((a, b) => (b.winRate || 0) - (a.winRate || 0))
  
  return {
    best: sorted[0],
    worst: sorted[sorted.length - 1]
  }
}

function calculateStreaks(trades) {
  if (!trades || trades.length === 0) {
    return { currentWinStreak: 0, currentLoseStreak: 0 }
  }
  
  // Sort by time descending (most recent first)
  const sorted = [...trades].sort((a, b) => {
    const timeA = new Date(a.time || a.trade_time || 0)
    const timeB = new Date(b.time || b.trade_time || 0)
    return timeB - timeA
  })
  
  let winStreak = 0
  let loseStreak = 0
  
  // Count streak from most recent
  for (const trade of sorted) {
    const pnl = trade.pnl || trade.realizedPnl || trade.realized_pnl || 0
    if (pnl > 0) {
      if (loseStreak === 0) winStreak++
      else break
    } else if (pnl < 0) {
      if (winStreak === 0) loseStreak++
      else break
    }
  }
  
  return { currentWinStreak: winStreak, currentLoseStreak: loseStreak }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  PERSONALIZED_TEMPLATES,
  FALLBACK_BY_EXPERIENCE,
  FALLBACK_NO_DATA
}

// lib/ai/prompts/sampleQuestions.js
/**
 * Dynamic Sample Questions for AI Chat
 * 
 * Provides context-aware sample questions based on:
 * - User experience level (beginner/intermediate/advanced)
 * - Trading performance (profitable/losing)
 * - Specific issues (low win rate, overtrading, etc.)
 */

import { determineExperienceLevel } from './vega-system-prompt'

// Question sets by experience level
const BEGINNER_QUESTIONS = [
  "What are my biggest trading weaknesses?",
  "How can I improve my win rate?",
  "Am I trading too often?",
  "What's my best performing trading time?",
  "Which symbols should I focus on?",
  "How can I reduce my losses?",
  "What patterns do you see in my trades?",
  "Should I change my position sizing?",
  "What's my biggest opportunity for improvement?",
  "How do I compare to other traders?"
]

const INTERMEDIATE_QUESTIONS = [
  "What are my biggest trading weaknesses?",
  "How can I improve my win rate?",
  "What's my best performing trading time?",
  "Which symbols should I focus on?",
  "Am I overtrading?",
  "What's my risk-adjusted return?",
  "What patterns do you see in my losses?",
  "Should I change my position sizing?",
  "What's my biggest opportunity for improvement?",
  "How do I compare to market benchmarks?",
  "What's my optimal trading frequency?",
  "Which trading strategies work best for me?"
]

const ADVANCED_QUESTIONS = [
  "What's my risk-adjusted return?",
  "How do I compare to market benchmarks?",
  "What patterns do you see in my losses?",
  "What's my optimal trading frequency?",
  "Which trading strategies work best for me?",
  "What's my Sharpe ratio and how can I improve it?",
  "How can I optimize my position sizing strategy?",
  "What correlations exist between my trades and market conditions?",
  "What's my edge and how can I maximize it?",
  "How can I improve my risk-adjusted performance?",
  "What behavioral patterns are affecting my trading?",
  "What's my biggest opportunity for improvement?"
]

// Questions for users with no trading data
const NO_DATA_QUESTIONS = [
  "What can Vega help me with?",
  "How do I connect my exchange?",
  "What insights will I get from my trading data?",
  "How does Vega analyze my trades?",
  "What trading metrics does Vega track?",
  "How do I upload my trading data?",
  "What makes Vega different from other analytics tools?"
]

// Coach mode starter prompts - conversational, brief openers
const COACH_MODE_STARTERS = {
  withData: [
    "How's my trading?",
    "What should I focus on?",
    "What's working for me?",
    "Where am I losing money?",
    "Help me improve"
  ],
  withDataAdvanced: [
    "Analyze my edge",
    "What's hurting my performance?",
    "Review my risk management",
    "Where's my opportunity?",
    "What patterns do you see?"
  ],
  noData: [
    "What can you help me with?",
    "How does this work?",
    "What will I learn?",
    "Teach me about trading",
    "What is ICT trading?"
  ],
  education: [
    "Explain fair value gaps",
    "What are order blocks?",
    "How do I find my edge?",
    "Risk management basics",
    "Best time to trade?"
  ]
}

// Issue-specific question priorities
const ISSUE_PRIORITIES = {
  losing: [
    "What patterns do you see in my losses?",
    "How can I reduce my losses?",
    "What are my biggest trading weaknesses?",
    "What's causing me to lose money?",
    "How can I improve my risk management?"
  ],
  lowWinRate: [
    "How can I improve my win rate?",
    "What patterns do you see in my losses?",
    "What are my biggest trading weaknesses?",
    "Which symbols should I focus on?",
    "What's my best performing trading time?"
  ],
  overtrading: [
    "Am I overtrading?",
    "What's my optimal trading frequency?",
    "Am I trading too often?",
    "How can I improve my win rate?",
    "What's my best performing trading time?"
  ],
  poorRiskManagement: [
    "Should I change my position sizing?",
    "How can I improve my risk management?",
    "What's my risk-adjusted return?",
    "How can I reduce my losses?",
    "What patterns do you see in my losses?"
  ]
}

/**
 * Detect specific trading issues from analytics
 */
function detectIssues(analytics, tradesStats) {
  const issues = []
  
  if (!analytics || !tradesStats) return issues
  
  // Check if losing money
  if (analytics.totalPnL !== undefined && analytics.totalPnL < 0) {
    issues.push('losing')
  }
  
  // Check for low win rate (< 40%)
  if (analytics.winRate !== undefined && analytics.winRate < 0.40) {
    issues.push('lowWinRate')
  }
  
  // Check for overtrading (high trade count relative to time period)
  if (tradesStats.totalTrades && tradesStats.oldestTrade) {
    const tradingMonths = Math.max(1, Math.floor(
      (Date.now() - new Date(tradesStats.oldestTrade).getTime()) / (1000 * 60 * 60 * 24 * 30)
    ))
    const tradesPerMonth = tradesStats.totalTrades / tradingMonths
    // More than 50 trades per month might indicate overtrading
    if (tradesPerMonth > 50) {
      issues.push('overtrading')
    }
  }
  
  // Check for poor risk management (high average loss relative to average win)
  if (analytics.avgWin && analytics.avgLoss && Math.abs(analytics.avgLoss) > analytics.avgWin * 1.5) {
    issues.push('poorRiskManagement')
  }
  
  return issues
}

/**
 * Prioritize questions based on detected issues
 */
function prioritizeQuestions(questions, issues) {
  if (issues.length === 0) return questions
  
  const prioritized = []
  const used = new Set()
  
  // First, add issue-specific questions
  issues.forEach(issue => {
    const issueQuestions = ISSUE_PRIORITIES[issue] || []
    issueQuestions.forEach(q => {
      if (questions.includes(q) && !used.has(q)) {
        prioritized.push(q)
        used.add(q)
      }
    })
  })
  
  // Then add remaining questions
  questions.forEach(q => {
    if (!used.has(q)) {
      prioritized.push(q)
    }
  })
  
  return prioritized.length > 0 ? prioritized : questions
}

/**
 * Get dynamic sample questions based on user context
 * 
 * @param {Object} tradesStats - Trading statistics
 * @param {Object} analytics - Analytics data
 * @returns {Array<string>} Array of sample questions
 */
export function getDynamicSampleQuestions(tradesStats, analytics) {
  // No data case
  if (!tradesStats || tradesStats.totalTrades === 0) {
    return NO_DATA_QUESTIONS
  }
  
  // Determine experience level
  const experienceLevel = determineExperienceLevel(tradesStats, analytics)
  
  // Select base question set
  let baseQuestions
  switch (experienceLevel) {
    case 'beginner':
      baseQuestions = [...BEGINNER_QUESTIONS]
      break
    case 'intermediate':
      baseQuestions = [...INTERMEDIATE_QUESTIONS]
      break
    case 'advanced':
      baseQuestions = [...ADVANCED_QUESTIONS]
      break
    default:
      baseQuestions = [...INTERMEDIATE_QUESTIONS]
  }
  
  // Detect specific issues
  const issues = detectIssues(analytics, tradesStats)
  
  // Prioritize questions based on issues
  const prioritizedQuestions = prioritizeQuestions(baseQuestions, issues)
  
  return prioritizedQuestions
}

/**
 * Get experience level for external use
 */
export function getExperienceLevel(tradesStats, analytics) {
  return determineExperienceLevel(tradesStats, analytics)
}

/**
 * Get coach mode starter prompts
 * These are short, conversational openers designed for the interactive coach experience
 * 
 * @param {Object} tradesStats - Trading statistics
 * @param {Object} analytics - Analytics data
 * @returns {Array<string>} Array of coach mode starter prompts
 */
export function getCoachModeStarters(tradesStats, analytics) {
  // No data case - mix of onboarding and education
  if (!tradesStats || tradesStats.totalTrades === 0) {
    // Combine no data and education prompts, shuffle a bit
    return [
      ...COACH_MODE_STARTERS.noData.slice(0, 3),
      ...COACH_MODE_STARTERS.education.slice(0, 2)
    ]
  }
  
  // Determine experience level
  const experienceLevel = determineExperienceLevel(tradesStats, analytics)
  
  // Advanced users get more sophisticated prompts
  if (experienceLevel === 'advanced') {
    return [
      ...COACH_MODE_STARTERS.withDataAdvanced.slice(0, 3),
      ...COACH_MODE_STARTERS.education.slice(0, 2)
    ]
  }
  
  // Beginner/Intermediate - mix of data analysis and education
  return [
    ...COACH_MODE_STARTERS.withData.slice(0, 3),
    ...COACH_MODE_STARTERS.education.slice(0, 2)
  ]
}

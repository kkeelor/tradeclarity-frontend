// app/analyze/utils/insights/insightsPrioritizationEngine.js
// Scores and prioritizes insights by financial impact, actionability, and surprise factor

/**
 * Prioritizes insights by value to the user
 * Returns organized groups: critical, opportunities, behavioral, allScored
 */
export function prioritizeInsights(allInsights, analytics) {
  if (!allInsights || allInsights.length === 0) {
    return {
      critical: [],
      opportunities: [],
      behavioral: [],
      allScored: []
    }
  }

  const scored = allInsights.map(insight => ({
    ...insight,
    score: calculateInsightScore(insight, analytics),
    category: insight.category || categorizeInsight(insight)
  }))

  // Prioritize weaknesses and improvement opportunities over strengths
  // Sort by: weaknesses first, then by score
  const sorted = scored.sort((a, b) => {
    // Weaknesses get priority boost
    const aIsWeakness = a.type === 'weakness'
    const bIsWeakness = b.type === 'weakness'
    
    // If one is weakness and other isn't, weakness wins
    if (aIsWeakness && !bIsWeakness) return -1
    if (!aIsWeakness && bIsWeakness) return 1
    
    // Both same type - sort by score
    return b.score - a.score
  })

  return {
    critical: sorted.filter(i => i.score >= 80).slice(0, 3),  // Top 3 urgent
    opportunities: sorted.filter(i => 
      (i.category === 'opportunity' || i.type === 'strength' || i.type === 'recommendation') && 
      i.score >= 60
    ).slice(0, 3),
    behavioral: sorted.filter(i => 
      (i.category === 'behavioral' || i.type === 'weakness') && 
      i.score >= 60
    ).slice(0, 3),
    allScored: sorted
  }
}

/**
 * Calculate insight score (0-100)
 * Based on:
 * - Financial Impact (0-40 points)
 * - Actionability (0-30 points)
 * - Surprise Factor (0-20 points)
 * - Evidence Strength (0-10 points)
 */
function calculateInsightScore(insight, analytics) {
  let score = 0

  // Financial impact (0-40 points)
  const potentialSavings = insight.potentialSavings || 0
  if (potentialSavings > 1000) score += 40
  else if (potentialSavings > 500) score += 30
  else if (potentialSavings > 100) score += 20
  else if (potentialSavings > 0) score += 10

  // MAJOR BOOST for weaknesses - they're more actionable and motivating
  if (insight.type === 'weakness') {
    score += 15 // Significant boost for weaknesses
    if (potentialSavings > 0) {
      score += 10 // Extra bonus for actionable weaknesses with savings potential
    }
  }
  
  // Penalize strengths - they're less actionable for improvement
  if (insight.type === 'strength' && potentialSavings === 0) {
    score -= 10 // Reduce score for non-actionable strengths
  }

  // Actionability (0-30 points)
  const actionDifficulty = insight.actionDifficulty || 'medium'
  if (actionDifficulty === 'easy') score += 30
  else if (actionDifficulty === 'medium') score += 20
  else if (actionDifficulty === 'hard') score += 10

  // If no action difficulty specified, infer from action steps
  if (!insight.actionDifficulty && insight.actionSteps) {
    if (insight.actionSteps.length <= 2) score += 25 // Easy to implement
    else if (insight.actionSteps.length <= 4) score += 15
    else score += 10
  }

  // Surprise factor (0-20 points)
  if (insight.isCounterIntuitive) score += 20
  if (insight.isCounterIntuitive === false) score += 5 // Still valuable even if expected

  // Check if insight reveals something unexpected
  if (insight.message && (
    insight.message.includes('3x') ||
    insight.message.includes('4x') ||
    insight.message.includes('2x') ||
    insight.message.includes('never seen') ||
    insight.message.includes('surprising')
  )) {
    score += 15
  }

  // Evidence strength (0-10 points)
  const dataPoints = insight.dataPoints || insight.affectedTrades || 0
  if (dataPoints >= 20) score += 10
  else if (dataPoints >= 10) score += 7
  else if (dataPoints >= 5) score += 4
  else if (dataPoints > 0) score += 2

  // Impact level bonus (existing impact field)
  if (insight.impact) {
    score += insight.impact * 2 // Multiplier for existing impact (1-4 scale)
  }

  // Category-specific bonuses
  if (insight.category === 'risk_management' && insight.type === 'weakness') {
    score += 5 // Risk management weaknesses are critical
  }

  if (insight.category === 'opportunity' && insight.type === 'strength') {
    score += 3 // Opportunities are valuable
  }

  return Math.min(100, score)
}

/**
 * Categorize insight based on its content
 */
function categorizeInsight(insight) {
  const title = (insight.title || '').toLowerCase()
  const message = (insight.message || '').toLowerCase()

  if (title.includes('loss') || title.includes('stop') || message.includes('loss')) {
    return 'risk_management'
  }
  if (title.includes('fee') || message.includes('fee') || message.includes('commission')) {
    return 'optimization'
  }
  if (title.includes('time') || title.includes('hour') || message.includes('time')) {
    return 'timing'
  }
  if (title.includes('symbol') || message.includes('symbol') || message.includes('focus')) {
    return 'opportunity'
  }
  if (title.includes('hold') || message.includes('holding') || message.includes('patience')) {
    return 'behavioral'
  }
  if (title.includes('win rate') || message.includes('win rate')) {
    return 'performance'
  }

  return insight.type === 'weakness' ? 'behavioral' : 'opportunity'
}

/**
 * Format insights for display with enhanced value props
 */
export function enhanceInsightForDisplay(insight, analytics) {
  return {
    ...insight,
    // Format potential savings
    formattedSavings: insight.potentialSavings 
      ? `$${insight.potentialSavings.toFixed(0)}` 
      : null,
    
    // Add urgency indicator
    urgency: insight.score >= 80 ? 'critical' : 
             insight.score >= 60 ? 'high' : 
             insight.score >= 40 ? 'medium' : 'low',
    
    // Add benchmark comparison if applicable
    benchmark: getBenchmarkComparison(insight, analytics),
    
    // Format action difficulty
    formattedDifficulty: insight.actionDifficulty || 
      (insight.actionSteps && insight.actionSteps.length <= 2 ? 'easy' : 'medium'),
    
    // Add visual priority
    visualPriority: insight.score >= 80 ? 'hero' : 
                    insight.score >= 60 ? 'featured' : 'standard'
  }
}

/**
 * Get benchmark comparison for insight
 */
function getBenchmarkComparison(insight, analytics) {
  if (!analytics) return null

  const message = (insight.message || '').toLowerCase()
  
  if (message.includes('win rate')) {
    const userWinRate = analytics.winRate || 0
    return {
      metric: 'Win Rate',
      userValue: userWinRate,
      benchmark: 48, // Platform median
      percentile: userWinRate >= 70 ? 'top 10%' : 
                  userWinRate >= 62 ? 'top 25%' : 
                  userWinRate >= 48 ? 'above average' : 'below average'
    }
  }

  if (message.includes('profit factor')) {
    const userPF = analytics.profitFactor || 0
    return {
      metric: 'Profit Factor',
      userValue: userPF,
      benchmark: 1.2, // Platform median
      percentile: userPF >= 2.5 ? 'top 10%' : 
                  userPF >= 1.8 ? 'top 25%' : 
                  userPF >= 1.2 ? 'above average' : 'below average'
    }
  }

  return null
}

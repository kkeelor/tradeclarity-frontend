// app/analyze/utils/insights/whatsNextActions.js
// Generates prioritized "What's Next" actions based on impact, savings, and user context

import { generateValueFirstInsights } from './valueFirstInsights'
import { analyzeDrawdowns } from '../drawdownAnalysis'
import { analyzeTimeBasedPerformance } from '../timeBasedAnalysis'
import { analyzeSymbols } from '../symbolAnalysis'

/**
 * Generate prioritized "What's Next" actions
 * Prioritizes by savings/impact, adapts to user performance state
 * Returns multiple actions grouped by priority
 */
export function generateWhatsNextActions(analytics, psychology, allTrades, tradesStats) {
  const actions = []
  // Handle cases where analytics might be minimal or missing
  const analyticsData = analytics || {}
  const isProfitable = analyticsData.totalPnL !== undefined ? analyticsData.totalPnL >= 0 : null
  const isLosing = analyticsData.totalPnL !== undefined ? analyticsData.totalPnL < 0 : null
  const tradeCount = allTrades?.length || analyticsData.totalTrades || tradesStats?.totalTrades || 0
  const currSymbol = '$' // Can be enhanced later with currency support

  // Determine user context
  const userContext = {
    isProfitable,
    isLosing,
    isNewTrader: tradeCount < 50,
    isExperienced: tradeCount >= 50,
    hasSpotTrades: tradesStats?.spotTrades > 0,
    hasFuturesTrades: tradesStats?.futuresIncome > 0 || tradesStats?.futuresPositions > 0,
    totalPnL: analyticsData.totalPnL || 0,
    totalTrades: tradeCount
  }

  // 1. HIGH IMPACT ACTIONS (Top Priority - Potential Savings)
  const highImpactActions = []

  // Get value-first insights for high-impact actions
  // Only generate if we have sufficient data
  if (tradeCount >= 30 && analyticsData && Object.keys(analyticsData).length > 0 && allTrades && allTrades.length > 0) {
    const valueFirstInsights = generateValueFirstInsights(analyticsData, psychology, allTrades)
    
    // Critical insights (highest impact)
    if (valueFirstInsights?.critical && valueFirstInsights.critical.length > 0) {
      valueFirstInsights.critical.forEach((insight, idx) => {
        if (insight.potentialSavings > 0) {
          highImpactActions.push({
            id: `critical-${idx}`,
            priority: 'high',
            title: insight.title,
            description: insight.message || insight.summary,
            potentialSavings: insight.potentialSavings,
            impact: insight.impact || 4,
            actionType: 'insight',
            action: getActionFromInsight(insight, analyticsData),
            category: insight.category || 'risk_management',
            icon: getIconForCategory(insight.category || 'risk_management'),
            color: 'amber',
            urgency: 'critical'
          })
        }
      })
    }

    // Opportunities with high savings
    if (valueFirstInsights?.opportunities && valueFirstInsights.opportunities.length > 0) {
      valueFirstInsights.opportunities
        .filter(insight => insight.potentialSavings > 50)
        .forEach((insight, idx) => {
          highImpactActions.push({
            id: `opportunity-${idx}`,
            priority: 'high',
            title: insight.title,
            description: insight.message || insight.summary,
            potentialSavings: insight.potentialSavings,
            impact: insight.impact || 3,
            actionType: 'insight',
            action: getActionFromInsight(insight, analyticsData),
            category: insight.category || 'opportunity',
            icon: getIconForCategory(insight.category || 'opportunity'),
            color: 'emerald',
            urgency: 'high'
          })
        })
    }
  }

  // Drawdown analysis for losing traders
  if (isLosing === true && allTrades && allTrades.length > 0) {
    const drawdownAnalysis = analyzeDrawdowns(allTrades)
    if (drawdownAnalysis?.worstDrawdowns && drawdownAnalysis.worstDrawdowns.length > 0) {
      const worstDrawdown = drawdownAnalysis.worstDrawdowns[0]
      if (worstDrawdown.drawdownPercent < -10) {
        highImpactActions.push({
          id: 'drawdown-analysis',
          priority: 'high',
          title: `Address ${Math.abs(worstDrawdown.drawdownPercent).toFixed(1)}% Drawdown`,
          description: `Lost ${currSymbol}${Math.abs(worstDrawdown.drawdownAmount).toFixed(0)} over ${worstDrawdown.durationDays} days`,
          potentialSavings: Math.abs(worstDrawdown.drawdownAmount) * 0.2,
          impact: 4,
          actionType: 'navigation',
          action: { route: '/analyze?tab=overview', label: 'View Drawdown Analysis' },
          category: 'risk_management',
          icon: 'TrendingDown',
          color: 'red',
          urgency: 'critical'
        })
      }
    }
  }

  // 2. QUICK ACTIONS (Easy Wins - 2-3 items)
  const quickActions = []

  // Fee optimization (easy win)
  if (analyticsData.totalCommission > 0 && analyticsData.totalCommission > Math.abs(analyticsData.totalPnL || 0) * 0.1) {
    const feeSavings = analyticsData.totalCommission * 0.5 // Estimate 50% savings with limit orders
    quickActions.push({
      id: 'fee-optimization',
      priority: 'medium',
      title: 'Optimize Trading Fees',
      description: `Save ~${currSymbol}${feeSavings.toFixed(0)}/year by using limit orders`,
      potentialSavings: feeSavings,
      impact: 2,
      actionType: 'navigation',
      action: { route: '/analyze?tab=behavioral', label: 'View Fee Analysis' },
      category: 'optimization',
      icon: 'DollarSign',
      color: 'emerald',
      urgency: 'medium',
      difficulty: 'easy'
    })
  }

  // Time-based optimization (if data available)
  if (allTrades && allTrades.length > 10) {
    const timeAnalysis = analyzeTimeBasedPerformance(allTrades)
    if (timeAnalysis?.bestWorstTimes?.worstHour && timeAnalysis.bestWorstTimes.worstHour.totalPnL < 0) {
      const worstHour = timeAnalysis.bestWorstTimes.worstHour
      const potentialSavings = Math.abs(worstHour.totalPnL) * 0.5
      if (potentialSavings > 20) {
        quickActions.push({
          id: 'time-optimization',
          priority: 'medium',
          title: 'Optimize Trading Hours',
          description: `Avoiding worst hours could save ${currSymbol}${potentialSavings.toFixed(0)}`,
          potentialSavings,
          impact: 3,
          actionType: 'navigation',
          action: { route: '/analyze?tab=overview', label: 'View Time Analysis' },
          category: 'timing',
          icon: 'Clock',
          color: 'cyan',
          urgency: 'medium',
          difficulty: 'medium'
        })
      }
    }
  }

  // Symbol focus (if profitable and multiple symbols)
  if (isProfitable === true && analyticsData.symbols && Object.keys(analyticsData.symbols).length > 1) {
    const symbolAnalysis = analyzeSymbols(allTrades)
    if (symbolAnalysis?.recommendations) {
      const focusRec = symbolAnalysis.recommendations.find(r => r.type === 'focus')
      if (focusRec && focusRec.details && focusRec.details.length > 0) {
        const bestSymbol = focusRec.details[0]
        if (bestSymbol.winRate > 60 && bestSymbol.totalPnL > 0) {
          quickActions.push({
            id: 'symbol-focus',
            priority: 'medium',
            title: `Focus on ${focusRec.symbols[0]}`,
            description: `${focusRec.symbols[0]} has ${bestSymbol.winRate?.toFixed(0)}% win rate`,
            potentialSavings: bestSymbol.totalPnL * 0.3,
            impact: 3,
            actionType: 'navigation',
            action: { route: '/analyze?tab=spot', label: 'View Symbol Analysis' },
            category: 'opportunity',
            icon: 'TrendingUp',
            color: 'emerald',
            urgency: 'medium',
            difficulty: 'medium'
          })
        }
      }
    }
  }

  // 3. EXPLORE DEEPER (Navigation Cards)
  const exploreActions = []

  // Spot Trading
  if (userContext.hasSpotTrades) {
    const spotPnL = analyticsData.spotPnL || 0
    const spotWinRate = analyticsData.spotWinRate || 0
    exploreActions.push({
      id: 'explore-spot',
      priority: 'low',
      title: 'Spot Trading Analysis',
      description: `${tradesStats.spotTrades} trades • ${spotWinRate.toFixed(1)}% win rate`,
      value: spotPnL,
      actionType: 'navigation',
      action: { route: '/analyze?tab=spot', label: 'Analyze Spot Trades' },
      category: 'explore',
      icon: 'PieChart',
      color: 'emerald'
    })
  }

  // Futures Trading
  if (userContext.hasFuturesTrades) {
    const futuresPnL = analyticsData.futuresPnL || 0
    const futuresWinRate = analyticsData.futuresWinRate || 0
    exploreActions.push({
      id: 'explore-futures',
      priority: 'low',
      title: 'Futures Trading Analysis',
      description: `${tradesStats.futuresIncome || 0} trades • ${futuresWinRate.toFixed(1)}% win rate`,
      value: futuresPnL,
      actionType: 'navigation',
      action: { route: '/analyze?tab=futures', label: 'Review Futures Performance' },
      category: 'explore',
      icon: 'Zap',
      color: 'cyan'
    })
  }

  // Behavioral Analysis
  if (psychology && psychology.healthScore !== undefined) {
    const healthScore = psychology.healthScore
    const criticalPatterns = psychology.patterns?.filter(p => p.severity === 'high').length || 0
    exploreActions.push({
      id: 'explore-behavioral',
      priority: 'low',
      title: 'Trading Psychology',
      description: `Health Score: ${healthScore}/100${criticalPatterns > 0 ? ` • ${criticalPatterns} critical patterns` : ''}`,
      value: healthScore,
      actionType: 'navigation',
      action: { route: '/analyze?tab=behavioral', label: 'Discover Trading Psychology Score' },
      category: 'explore',
      icon: 'Brain',
      color: 'purple'
    })
  }

  // Overview (always available)
  exploreActions.push({
    id: 'explore-overview',
    priority: 'low',
    title: 'Complete Trading Overview',
    description: 'View all analytics and insights',
    actionType: 'navigation',
    action: { route: '/analyze?tab=overview', label: 'View Complete Overview' },
    category: 'explore',
    icon: 'BarChart3',
    color: 'slate'
  })

  // 4. CONTEXT-AWARE PRIORITIZATION
  // Adapt actions based on user state
  let prioritizedHighImpact = [...highImpactActions]
  let prioritizedQuick = [...quickActions]

  // If losing money, prioritize risk management
  if (isLosing) {
    prioritizedHighImpact = prioritizedHighImpact.sort((a, b) => {
      const aIsRisk = a.category === 'risk_management'
      const bIsRisk = b.category === 'risk_management'
      if (aIsRisk && !bIsRisk) return -1
      if (!aIsRisk && bIsRisk) return 1
      return b.potentialSavings - a.potentialSavings
    })
  }

  // If profitable, prioritize optimization
  if (isProfitable === true) {
    prioritizedHighImpact = prioritizedHighImpact.sort((a, b) => {
      const aIsOptimization = a.category === 'optimization' || a.category === 'opportunity'
      const bIsOptimization = b.category === 'optimization' || b.category === 'opportunity'
      if (aIsOptimization && !bIsOptimization) return -1
      if (!aIsOptimization && bIsOptimization) return 1
      return b.potentialSavings - a.potentialSavings
    })
  }

  // Sort by potential savings (impact)
  prioritizedHighImpact.sort((a, b) => b.potentialSavings - a.potentialSavings)
  prioritizedQuick.sort((a, b) => b.potentialSavings - a.potentialSavings)

  // Limit high impact to top 3, quick actions to top 3
  prioritizedHighImpact = prioritizedHighImpact.slice(0, 3)
  prioritizedQuick = prioritizedQuick.slice(0, 3)

  return {
    highImpact: prioritizedHighImpact,
    quickActions: prioritizedQuick,
    explore: exploreActions,
    all: [...prioritizedHighImpact, ...prioritizedQuick, ...exploreActions],
    userContext
  }
}

/**
 * Get action details from insight
 */
function getActionFromInsight(insight, analytics) {
  if (insight.action && insight.action.steps) {
    // Determine route based on category
    let route = '/analyze?tab=overview'
    if (insight.category === 'timing') route = '/analyze?tab=overview'
    else if (insight.category === 'opportunity' && insight.bestSymbol) route = '/analyze?tab=spot'
    else if (insight.category === 'behavioral') route = '/analyze?tab=behavioral'
    else if (insight.category === 'risk_management') route = '/analyze?tab=overview'
    
    return {
      route,
      label: insight.action.title || 'View Details',
      steps: insight.action.steps
    }
  }
  
  // Default navigation based on category
  if (insight.category === 'timing') return { route: '/analyze?tab=overview', label: 'View Time Analysis' }
  if (insight.category === 'opportunity') return { route: '/analyze?tab=spot', label: 'View Symbol Analysis' }
  if (insight.category === 'behavioral') return { route: '/analyze?tab=behavioral', label: 'View Psychology Analysis' }
  
  return { route: '/analyze?tab=overview', label: 'View Details' }
}

/**
 * Get icon name for category
 */
function getIconForCategory(category) {
  const iconMap = {
    'risk_management': 'Target',
    'optimization': 'DollarSign',
    'timing': 'Clock',
    'opportunity': 'TrendingUp',
    'behavioral': 'Brain',
    'performance': 'BarChart3'
  }
  return iconMap[category] || 'Lightbulb'
}

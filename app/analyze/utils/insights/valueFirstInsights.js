// app/analyze/utils/insights/valueFirstInsights.js
// Generates value-first insights with concrete dollar amounts and actionable steps

import { calculateStopLossSavings, calculateFeeOptimization, calculateTimingEdge,
         calculateSymbolFocusOpportunity, calculateLossCuttingSavings } from './moneyCalculations'
import { prioritizeInsights, enhanceInsightForDisplay } from './insightsPrioritizationEngine'
import { generateLowActivityInsights } from './lowActivityInsights'

/**
 * Generate all value-first insights with money calculations
 * Adapts to trade count - works with as few as 5 trades
 */
export function generateValueFirstInsights(analytics, psychology, allTrades) {
  const insights = []
  const tradeCount = allTrades?.length || analytics.totalTrades || 0
  
  // For low-activity traders (under 30 trades), use specialized insights
  if (tradeCount < 30) {
    const lowActivityData = generateLowActivityInsights(analytics, psychology, allTrades || [])
    return {
      ...lowActivityData,
      all: lowActivityData.insights.map(insight => enhanceInsightForDisplay(insight, analytics)),
      critical: lowActivityData.insights.filter(i => i.impact >= 3),
      opportunities: lowActivityData.insights.filter(i => i.type === 'opportunity' || i.type === 'strength'),
      behavioral: lowActivityData.insights.filter(i => i.type === 'weakness' || i.category === 'behavioral')
    }
  }

  // For active traders (30+ trades), use full insights
  // 1. Stop Loss Analysis - Lower threshold for smaller accounts
  if (allTrades && allTrades.length > 0) {
    const stopLossInsight = calculateStopLossSavings(allTrades, 0.02)
    // Lower threshold: show even if savings is $20+ (was $50+)
    const minSavings = analytics.totalPnL > 1000 ? 50 : 20
    if (stopLossInsight && stopLossInsight.potentialSavings > minSavings) {
      insights.push({
        type: 'weakness',
        category: 'risk_management',
        title: 'Cut Losses Faster',
        message: stopLossInsight.message,
        summary: `Your average loss is ${(stopLossInsight.avgCurrentLoss / stopLossInsight.avgTargetLoss).toFixed(1)}x what it could be with tighter stops`,
        potentialSavings: stopLossInsight.potentialSavings,
        actionDifficulty: 'medium',
        isCounterIntuitive: false,
        dataPoints: stopLossInsight.affectedTrades,
        affectedTrades: stopLossInsight.affectedTrades,
        confidence: stopLossInsight.affectedTrades >= 10 ? 'high' : stopLossInsight.affectedTrades >= 5 ? 'medium' : 'low',
        action: {
          title: stopLossInsight.action,
          steps: [
            'Set 2% stop loss on every trade before entering',
            'Never move stop loss further away',
            'Use trailing stops to protect profits'
          ],
          expectedImpact: `+$${Math.round(stopLossInsight.potentialSavings / 12)}/month`
        },
        impact: stopLossInsight.potentialSavings > 1000 ? 4 : 3
      })
    }
  }

  // 2. Fee Optimization - Lower threshold
  if (allTrades && allTrades.length > 0) {
    const feeInsight = calculateFeeOptimization(allTrades)
    const minSavings = analytics.totalPnL > 1000 ? 50 : 20
    if (feeInsight && feeInsight.potentialSavings > minSavings) {
      insights.push({
        type: 'recommendation',
        category: 'optimization',
        title: 'Optimize Trading Fees',
        message: feeInsight.message,
        summary: `Using limit orders could save you ${((feeInsight.potentialSavings / feeInsight.currentFees) * 100).toFixed(0)}% annually`,
        potentialSavings: feeInsight.potentialSavings,
        actionDifficulty: 'easy',
        isCounterIntuitive: true,
        dataPoints: feeInsight.affectedTrades,
        affectedTrades: feeInsight.affectedTrades,
        confidence: 'high', // Fees are always accurate
        action: {
          title: feeInsight.action,
          steps: [
            'Use limit orders instead of market orders',
            'Place orders slightly below market price',
            'Wait for order to fill as maker'
          ],
          expectedImpact: `+$${Math.round(feeInsight.potentialSavings / 12)}/month`
        },
        impact: 2
      })
    }
  }

  // 3. Timing Edge - Lower threshold (need 3+ trades per hour instead of 5+)
  if (allTrades && allTrades.length > 0) {
    const timingInsight = calculateTimingEdge(allTrades)
    const minSavings = analytics.totalPnL > 1000 ? 50 : 20
    if (timingInsight && timingInsight.potentialSavings > minSavings) {
      insights.push({
        type: 'recommendation',
        category: 'timing',
        title: 'Optimize Trading Hours',
        message: timingInsight.message,
        summary: `Your win rate during ${timingInsight.bestHours.map(h => h + ':00').join(', ')} is ${timingInsight.bestHoursWinRate.toFixed(0)}% vs ${timingInsight.overallWinRate.toFixed(0)}% overall`,
        potentialSavings: timingInsight.potentialSavings,
        actionDifficulty: 'medium',
        isCounterIntuitive: true,
        dataPoints: timingInsight.affectedTrades,
        affectedTrades: timingInsight.affectedTrades,
        confidence: timingInsight.affectedTrades >= 10 ? 'high' : 'medium',
        worstHours: timingInsight.worstHours,
        bestHours: timingInsight.bestHours,
        bestHoursWinRate: timingInsight.bestHoursWinRate,
        action: {
          title: timingInsight.action,
          steps: [
            `Set trading alerts for ${timingInsight.bestHours.map(h => h + ':00').join(', ')}`,
            `Avoid trading during ${timingInsight.worstHours.map(h => h + ':00').join(', ')}`,
            'Review your trading schedule to align with best hours'
          ],
          expectedImpact: `+$${Math.round(timingInsight.potentialSavings / 12)}/month`
        },
        impact: 3
      })
    }
  }

  // 4. Symbol Focus Opportunity - Requires significant sample size and performance edge
  // Only shows if best symbol has 15+ trades, 2x better than others, and 50%+ win rate
  if (analytics.symbols && Object.keys(analytics.symbols).length > 1) {
    const symbolInsight = calculateSymbolFocusOpportunity(allTrades, analytics.symbols)
    // Increased minimum savings threshold significantly (was 20-50, now 100+)
    const minSavings = 100
    if (symbolInsight && symbolInsight.potentialSavings > minSavings) {
      insights.push({
        type: 'opportunity',
        category: 'opportunity',
        title: 'Focus on Your Best Symbol',
        message: symbolInsight.message,
        summary: `${symbolInsight.bestSymbol} has ${symbolInsight.bestSymbolWinRate.toFixed(0)}% win rate and $${symbolInsight.bestSymbolAvgPnL.toFixed(0)} avg P&L per trade`,
        potentialSavings: symbolInsight.potentialSavings,
        actionDifficulty: 'medium',
        isCounterIntuitive: false,
        dataPoints: 0,
        bestSymbol: symbolInsight.bestSymbol,
        bestSymbolWinRate: symbolInsight.bestSymbolWinRate,
        confidence: 'medium',
        action: {
          title: symbolInsight.action,
          steps: [
            `Increase ${symbolInsight.bestSymbol} allocation to 70%`,
            `Reduce exposure to ${symbolInsight.worstSymbols.join(', ')}`,
            'Study what makes this symbol work for you'
          ],
          expectedImpact: `+$${Math.round(symbolInsight.potentialSavings / 12)}/month`
        },
        impact: 3
      })
    }
  }

  // 5. Loss Cutting (Time-based) - Lower threshold
  if (allTrades && allTrades.length > 0) {
    const lossCuttingInsight = calculateLossCuttingSavings(allTrades)
    const minSavings = analytics.totalPnL > 1000 ? 50 : 20
    if (lossCuttingInsight && lossCuttingInsight.potentialSavings > minSavings) {
      insights.push({
        type: 'weakness',
        category: 'behavioral',
        title: 'Cut Losses Faster',
        message: lossCuttingInsight.message,
        summary: `You hold losing trades ${lossCuttingInsight.holdTimeRatio.toFixed(1)}x longer than winners`,
        potentialSavings: lossCuttingInsight.potentialSavings,
        actionDifficulty: 'medium',
        isCounterIntuitive: false,
        dataPoints: lossCuttingInsight.affectedTrades,
        affectedTrades: lossCuttingInsight.affectedTrades,
        holdTimeRatio: lossCuttingInsight.holdTimeRatio,
        action: {
          title: lossCuttingInsight.action,
          steps: [
            'Set maximum hold time equal to average winning trade duration',
            'Use time-based stop losses',
            'Exit losers as quickly as you exit winners'
          ],
          expectedImpact: `+$${Math.round(lossCuttingInsight.potentialSavings / 12)}/month`
        },
        impact: 3
      })
    }
  }

  // 6. Win Rate Insights (if exceptional)
  if (analytics.winRate >= 60) {
    insights.push({
      type: 'strength',
      category: 'performance',
      title: 'Excellent Win Rate',
      message: `Your ${analytics.winRate.toFixed(1)}% win rate outperforms most traders (48% average)`,
      summary: `You're in the top 25% of traders with this win rate`,
      potentialSavings: 0, // Not a savings opportunity, but a strength
      actionDifficulty: 'hard',
      isCounterIntuitive: false,
      dataPoints: analytics.totalTrades || 0,
      action: {
        title: 'Maintain Your Edge',
        steps: [
          'Document your entry criteria',
          'Consider increasing position sizes on high-probability setups',
          'Avoid changing what\'s working'
        ],
        expectedImpact: 'Maintain current performance'
      },
      impact: 2,
      benchmark: {
        metric: 'Win Rate',
        userValue: analytics.winRate,
        benchmark: 48,
        percentile: analytics.winRate >= 70 ? 'top 10%' : 'top 25%'
      }
    })
  }

  // 7. Profit Factor Insights
  if (analytics.profitFactor >= 1.8) {
    insights.push({
      type: 'strength',
      category: 'performance',
      title: 'Strong Profit Factor',
      message: `Your ${analytics.profitFactor.toFixed(2)}x profit factor shows excellent risk/reward`,
      summary: `You make $${analytics.profitFactor.toFixed(2)} for every $1 you risk`,
      potentialSavings: 0,
      actionDifficulty: 'hard',
      isCounterIntuitive: false,
      dataPoints: analytics.totalTrades || 0,
      action: {
        title: 'Maintain Risk/Reward Ratio',
        steps: [
          'Keep current stop loss and take profit levels',
          'Consider letting winners run even longer',
          'Maintain discipline on entry timing'
        ],
        expectedImpact: 'Maintain current performance'
      },
      impact: 2,
      benchmark: {
        metric: 'Profit Factor',
        userValue: analytics.profitFactor,
        benchmark: 1.2,
        percentile: analytics.profitFactor >= 2.5 ? 'top 10%' : 'top 25%'
      }
    })
  }

  // Prioritize and enhance all insights
  const prioritized = prioritizeInsights(insights, analytics)
  
  return {
    ...prioritized,
    all: prioritized.allScored.map(insight => enhanceInsightForDisplay(insight, analytics))
  }
}

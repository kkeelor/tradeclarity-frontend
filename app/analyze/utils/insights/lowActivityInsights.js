// app/analyze/utils/insights/lowActivityInsights.js
// Generates insights for users with limited trading data (10-50 trades)
// Focuses on benchmarks, education, and emerging patterns

import { getBenchmarkMessage, calculatePercentile } from './benchmarks'

/**
 * Generate insights for low-activity traders
 * Works with as few as 5 trades
 */
export function generateLowActivityInsights(analytics, psychology, allTrades = []) {
  const insights = []
  const tradeCount = allTrades.length || analytics.totalTrades || 0
  
  if (tradeCount === 0) return { insights: [], unlockTiers: getUnlockTiers() }

  // 1. Benchmark Comparisons (works with ANY trade count)
  if (analytics.winRate !== undefined && analytics.winRate !== null) {
    const benchmark = getBenchmarkMessage(analytics.winRate, 'winRate')
    if (benchmark) {
      insights.push({
        type: 'benchmark',
        category: 'performance',
        title: 'How You Compare',
        message: `Your ${analytics.winRate.toFixed(1)}% win rate is ${benchmark.percentile}`,
        summary: benchmark.message,
        percentile: benchmark.percentile,
        userValue: analytics.winRate,
        benchmarkValue: 48, // Platform median
        color: benchmark.color,
        confidence: tradeCount >= 20 ? 'high' : tradeCount >= 10 ? 'medium' : 'low',
        dataPoints: tradeCount,
        action: {
          title: 'Improve Your Win Rate',
          steps: tradeCount >= 20 
            ? [
                'Focus on entry timing - review your best-performing trades',
                'Use stop losses to protect capital',
                'Wait for high-probability setups'
              ]
            : [
                'Focus on entry timing',
                'Use stop losses',
                'Keep trading to unlock deeper insights'
              ],
          expectedImpact: benchmark.level === 'bottom25' ? 'Could improve 10-15%' : 'Maintain current level'
        },
        impact: benchmark.level === 'top10' ? 2 : benchmark.level === 'bottom25' ? 3 : 1,
        potentialSavings: 0 // Educational, not actionable savings
      })
    }
  }

  // 2. Profit Factor Benchmark
  if (analytics.profitFactor !== undefined && analytics.profitFactor !== null) {
    const benchmark = getBenchmarkMessage(analytics.profitFactor, 'profitFactor')
    if (benchmark) {
      insights.push({
        type: 'benchmark',
        category: 'risk_management',
        title: 'Risk/Reward Ratio',
        message: `Your ${analytics.profitFactor.toFixed(2)}x profit factor is ${benchmark.percentile}`,
        summary: benchmark.message,
        percentile: benchmark.percentile,
        userValue: analytics.profitFactor,
        benchmarkValue: 1.2,
        color: benchmark.color,
        confidence: tradeCount >= 20 ? 'high' : tradeCount >= 10 ? 'medium' : 'low',
        dataPoints: tradeCount,
        action: {
          title: analytics.profitFactor < 1.2 ? 'Improve Risk/Reward' : 'Maintain Strategy',
          steps: analytics.profitFactor < 1.2
            ? [
                'Let winners run longer',
                'Cut losses faster',
                'Aim for 2:1 reward-to-risk minimum'
              ]
            : [
                'Continue current approach',
                'Keep risk/reward consistent',
                'Document what works'
              ],
          expectedImpact: analytics.profitFactor < 1.2 ? 'Could reach 1.5x+' : 'Maintain current'
        },
        impact: analytics.profitFactor < 1 ? 4 : analytics.profitFactor < 1.2 ? 3 : 1,
        potentialSavings: 0
      })
    }
  }

  // 3. Early Pattern Detection (even with 10-20 trades)
  if (tradeCount >= 10 && analytics.winningTrades > 0 && analytics.losingTrades > 0) {
    const avgWin = analytics.avgWin || 0
    const avgLoss = Math.abs(analytics.avgLoss || 0)
    
    if (avgWin > 0 && avgLoss > 0) {
      const winLossRatio = avgWin / avgLoss
      
      // Detect if they're cutting winners too early
      if (winLossRatio < 1.5 && analytics.winRate > 50) {
        insights.push({
          type: 'weakness',
          category: 'risk_management',
          title: 'Early Pattern: Cutting Winners Too Early',
          message: `Your winners average $${avgWin.toFixed(0)} vs losses of $${avgLoss.toFixed(0)}. Consider letting winners run longer.`,
          summary: `Win/loss ratio of ${winLossRatio.toFixed(2)}x suggests you're exiting winners too quickly`,
          confidence: tradeCount >= 20 ? 'medium' : 'low',
          dataPoints: tradeCount,
          action: {
            title: 'Let Winners Run',
            steps: [
              'Set profit targets at 2x your stop loss',
              'Use trailing stops instead of fixed targets',
              'Allow 50% of position to run longer'
            ],
            expectedImpact: 'Could improve profit factor by 20-30%'
          },
          impact: 2,
          potentialSavings: avgWin * analytics.winningTrades * 0.2 // Estimate 20% improvement
        })
      }

      // Detect if losses are too large
      if (avgLoss > avgWin * 1.5) {
        insights.push({
          type: 'weakness',
          category: 'risk_management',
          title: 'Early Pattern: Losses Too Large',
          message: `Your average loss ($${avgLoss.toFixed(0)}) is ${(avgLoss/avgWin).toFixed(1)}x your average win. Tighten stop losses.`,
          summary: `Average loss exceeds average win by ${((avgLoss/avgWin - 1) * 100).toFixed(0)}%`,
          confidence: tradeCount >= 15 ? 'medium' : 'low',
          dataPoints: tradeCount,
          action: {
            title: 'Tighten Stop Losses',
            steps: [
              'Set stop loss at 2% of entry price',
              'Never move stop loss further away',
              'Exit losers as quickly as winners'
            ],
            expectedImpact: `Could save $${(avgLoss * analytics.losingTrades * 0.3).toFixed(0)} with tighter stops`
          },
          impact: 3,
          potentialSavings: avgLoss * analytics.losingTrades * 0.3 // Estimate 30% reduction
        })
      }
    }
  }

  // 4. Fee Awareness (works with any trade count)
  if (analytics.totalCommission > 0 && analytics.totalPnL !== 0) {
    const feePercentage = Math.abs(analytics.totalCommission / analytics.totalPnL) * 100
    const feeEfficiency = analytics.totalPnL > 0 
      ? (analytics.totalCommission / analytics.totalPnL) * 100
      : Math.abs(analytics.totalCommission / analytics.totalPnL) * 100

    if (feeEfficiency > 5) {
      insights.push({
        type: 'recommendation',
        category: 'optimization',
        title: 'Fees Are Eating Your Profits',
        message: `Fees represent ${feeEfficiency.toFixed(1)}% of your P&L. Top traders keep fees under 2%.`,
        summary: `$${analytics.totalCommission.toFixed(0)} in fees vs $${Math.abs(analytics.totalPnL).toFixed(0)} P&L`,
        confidence: 'high', // Fees are always accurate
        dataPoints: tradeCount,
        action: {
          title: 'Reduce Trading Fees',
          steps: [
            'Use limit orders (maker fees) instead of market orders',
            'Trade less frequently - quality over quantity',
            'Consider fee rebates or VIP tiers'
          ],
          expectedImpact: `Could save $${(analytics.totalCommission * 0.5).toFixed(0)}/year`
        },
        impact: 2,
        potentialSavings: analytics.totalCommission * 0.5
      })
    }
  }

  // 5. Educational: "What Good Trading Looks Like"
  if (tradeCount >= 5 && tradeCount < 30) {
    insights.push({
      type: 'educational',
      category: 'education',
      title: 'What Successful Traders Do',
      message: 'Based on platform data, profitable traders typically maintain 50%+ win rate and 1.5x+ profit factor.',
      summary: 'Target metrics: 50%+ win rate, 1.5x+ profit factor, fees < 2% of P&L',
      confidence: 'high', // General knowledge
      dataPoints: 0, // Not based on user data
      action: {
        title: 'Learn More',
        steps: [
          'Focus on quality setups over quantity',
          'Use proper risk management (2% rule)',
          'Keep a trading journal'
        ],
        expectedImpact: 'Foundation for improvement'
      },
      impact: 1,
      potentialSavings: 0,
      benchmark: {
        winRate: { target: 50, user: analytics.winRate || 0 },
        profitFactor: { target: 1.5, user: analytics.profitFactor || 0 }
      }
    })
  }

  // 6. Progressive Unlock Teaser
  const unlockTiers = getUnlockTiers()
  const nextTier = unlockTiers.find(tier => tradeCount < tier.minTrades)
  
  if (nextTier) {
    const tradesNeeded = nextTier.minTrades - tradeCount
    insights.push({
      type: 'unlock',
      category: 'progression',
      title: `Unlock Deeper Insights`,
      message: `${tradesNeeded} more ${tradesNeeded === 1 ? 'trade' : 'trades'} to unlock ${nextTier.name}`,
      summary: `With ${nextTier.minTrades} trades, you'll get: ${nextTier.features.join(', ')}`,
      confidence: 'high',
      dataPoints: tradeCount,
      progress: (tradeCount / nextTier.minTrades) * 100,
      tradesNeeded,
      unlockTier: nextTier,
      action: {
        title: 'Keep Trading',
        steps: [
          `Trade ${tradesNeeded} more times`,
          'Connect more exchanges for additional data',
          'Upload historical CSV files'
        ],
        expectedImpact: 'Unlock advanced pattern detection'
      },
      impact: 1,
      potentialSavings: 0
    })
  }

  return {
    insights,
    unlockTiers,
    currentTier: unlockTiers.find(tier => tradeCount >= tier.minTrades && (!tier.maxTrades || tradeCount < tier.maxTrades)) || unlockTiers[0]
  }
}

/**
 * Define unlock tiers based on trade count
 */
function getUnlockTiers() {
  return [
    {
      name: 'Getting Started',
      minTrades: 0,
      maxTrades: 10,
      features: ['Basic metrics', 'Benchmark comparisons', 'Fee awareness']
    },
    {
      name: 'Pattern Detection',
      minTrades: 10,
      maxTrades: 30,
      features: ['Early pattern detection', 'Win/loss ratio analysis', 'Basic timing insights']
    },
    {
      name: 'Behavioral Insights',
      minTrades: 30,
      maxTrades: 100,
      features: ['Deep behavioral patterns', 'Timing optimization', 'Symbol performance analysis']
    },
    {
      name: 'Advanced Analytics',
      minTrades: 100,
      features: ['Statistical significance', 'Complex pattern detection', 'Custom optimizations']
    }
  ]
}

/**
 * Get confidence label for display
 */
export function getConfidenceLabel(confidence, dataPoints) {
  if (confidence === 'high') return 'High Confidence'
  if (confidence === 'medium') return 'Moderate Confidence'
  if (dataPoints >= 20) return 'Moderate Confidence'
  if (dataPoints >= 10) return 'Emerging Pattern'
  return 'Early Signal'
}

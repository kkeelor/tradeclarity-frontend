// app/analyze/utils/behavioralAnalyzer.js
// Deep behavioral analysis - reveals hidden trading patterns and psychology

import { parseSymbolQuoteCurrency } from './currencyFormatter'

/**
 * Analyzes trading behavior and psychology to provide actionable insights
 * that most traders never see
 */
export const analyzeBehavior = (spotTrades, futuresIncome, metadata = {}) => {

  const allTrades = [...spotTrades].sort((a, b) => a.time - b.time)

  if (allTrades.length === 0) {
    return getEmptyBehavioralAnalysis()
  }

  // Core analyses
  const panicPatterns = detectPanicSelling(allTrades)
  const tradingStyle = analyzeTradeStyle(allTrades)
  const feeAnalysis = analyzeFeeEfficiency(allTrades)
  const positionSizing = analyzePositionSizing(allTrades)
  const timingPatterns = analyzeTimingPatterns(allTrades)
  const emotionalState = detectEmotionalTrading(allTrades)
  const consistencyScore = calculateConsistency(allTrades)

  // Calculate Behavioral Health Score (0-100)
  const healthScore = calculateBehavioralHealthScore({
    panicPatterns,
    tradingStyle,
    feeAnalysis,
    positionSizing,
    emotionalState,
    consistencyScore
  })

  // Generate actionable insights
  const insights = generateBehavioralInsights({
    panicPatterns,
    tradingStyle,
    feeAnalysis,
    positionSizing,
    timingPatterns,
    emotionalState,
    healthScore
  })

  // Generate warnings for critical issues
  const warnings = generateWarnings({
    panicPatterns,
    tradingStyle,
    feeAnalysis,
    emotionalState,
    healthScore
  })


  return {
    healthScore,
    panicPatterns,
    tradingStyle,
    feeAnalysis,
    positionSizing,
    timingPatterns,
    emotionalState,
    consistencyScore,
    insights,
    warnings
  }
}

/**
 * Detect panic selling patterns
 */
function detectPanicSelling(trades) {
  const sells = trades.filter(t => !t.isBuyer)
  let panicEvents = []
  let rapidSellCount = 0

  for (let i = 1; i < sells.length; i++) {
    const timeDiff = (sells[i].time - sells[i-1].time) / (1000 * 60) // minutes
    const sameSymbol = sells[i].symbol === sells[i-1].symbol

    if (timeDiff < 10 && sameSymbol) {
      rapidSellCount++
      panicEvents.push({
        timestamp: sells[i].time,
        symbol: sells[i].symbol,
        timeGap: timeDiff,
        value: parseFloat(sells[i].quoteQty)
      })
    }
  }

  const panicScore = Math.min((rapidSellCount / Math.max(sells.length, 1)) * 100, 100)

  return {
    detected: rapidSellCount > 0,
    count: rapidSellCount,
    events: panicEvents,
    severity: panicScore > 30 ? 'high' : panicScore > 10 ? 'medium' : 'low',
    score: panicScore
  }
}

/**
 * Analyze overall trading style
 */
function analyzeTradeStyle(trades) {
  const buys = trades.filter(t => t.isBuyer).length
  const sells = trades.filter(t => !t.isBuyer).length
  const buyToSellRatio = buys / Math.max(sells, 1)

  const makerTrades = trades.filter(t => t.isMaker).length
  const takerTrades = trades.filter(t => !t.isMaker).length
  const makerPercentage = (makerTrades / Math.max(trades.length, 1)) * 100

  // Calculate trade gaps
  const gaps = []
  for (let i = 1; i < trades.length; i++) {
    gaps.push((trades[i].time - trades[i-1].time) / (1000 * 60 * 60)) // hours
  }

  const avgGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0
  const maxGap = gaps.length > 0 ? Math.max(...gaps) : 0
  const rapidTrades = gaps.filter(g => g < 0.083).length // <5 minutes

  let tradingPattern = 'balanced'
  if (buyToSellRatio < 0.2) tradingPattern = 'liquidation'
  else if (buyToSellRatio > 5) tradingPattern = 'accumulation'
  else if (rapidTrades > trades.length * 0.5) tradingPattern = 'rapid'
  else if (avgGap > 24) tradingPattern = 'casual'

  const rapidFirePercent = trades.length > 0 ? (rapidTrades / trades.length) * 100 : 0

  return {
    buyToSellRatio,
    buyVsSellRatio: buyToSellRatio, // UI expects this
    buys,
    sells,
    makerPercentage,
    makerPercent: makerPercentage, // UI expects this
    takerPercentage: 100 - makerPercentage,
    takerPercent: 100 - makerPercentage, // UI expects this
    pattern: tradingPattern,
    avgGapHours: avgGap,
    maxGapHours: maxGap,
    rapidTradeCount: rapidTrades,
    rapidFirePercent, // UI expects this
    isOvertrading: rapidTrades > trades.length * 0.3
  }
}

/**
 * Analyze fee efficiency
 * NOTE: Keeps commission amounts in their native currency
 */
function analyzeFeeEfficiency(trades) {
  const makerTrades = trades.filter(t => t.isMaker)
  const takerTrades = trades.filter(t => !t.isMaker)

  // Helper function to get commission in quote currency
  const getCommissionValue = (trade) => {
    const commission = parseFloat(trade.commission || 0)
    const commissionAsset = trade.commissionAsset || 'USDT'

    // Parse the quote currency from the symbol (e.g., BTCUSDT → USDT, BTCINR → INR)
    const quoteCurrency = parseSymbolQuoteCurrency(trade.symbol)

    // If commission is already in quote currency, return as-is
    if (commissionAsset === quoteCurrency) {
      return commission
    }

    // If commission is in a fiat/stablecoin currency (USDT, USD, USDC, INR), return as-is
    if (['USDT', 'USD', 'USDC', 'INR'].includes(commissionAsset)) {
      return commission
    }

    // If commission is in crypto (like BTC, ETH), convert using trade price
    // For buy orders: commission is in base asset (e.g., BTC)
    if (trade.isBuyer && !['USDT', 'USD', 'USDC', 'INR'].includes(commissionAsset)) {
      // Commission is in crypto, convert to quote currency using trade price
      return commission * parseFloat(trade.price)
    }

    // Default: return as-is
    return commission
  }

  const makerFees = makerTrades.reduce((sum, t) => sum + getCommissionValue(t), 0)
  const takerFees = takerTrades.reduce((sum, t) => sum + getCommissionValue(t), 0)
  const totalFees = makerFees + takerFees

  // Estimate what fees WOULD have been if all taker trades were maker orders (50% less)
  const potentialSavings = takerFees * 0.5

  // Commission by asset (keep original for display)
  const commissionByAsset = {}
  trades.forEach(t => {
    const asset = t.commissionAsset || 'USDT'
    commissionByAsset[asset] = (commissionByAsset[asset] || 0) + parseFloat(t.commission || 0)
  })

  const totalTradeVolume = trades.reduce((sum, t) => sum + parseFloat(t.quoteQty || 0), 0)
  const feePercentage = (totalFees / Math.max(totalTradeVolume, 1)) * 100

  // Efficiency as percentage (100% = all maker, 0% = all taker)
  const efficiencyPercent = trades.length > 0 ? (makerTrades.length / trades.length) * 100 : 0

  return {
    totalFees,        // Now in USDT equivalent
    makerFees,        // Now in USDT equivalent
    takerFees,        // Now in USDT equivalent
    potentialSavings, // Now in USDT equivalent
    commissionByAsset,
    feePercentage,
    efficiency: efficiencyPercent,
    savingsOpportunity: potentialSavings
  }
}

/**
 * Analyze position sizing discipline
 */
function analyzePositionSizing(trades) {
  // Calculate quoteQty if missing: qty * price
  const tradeSizes = trades.map(t => {
    if (t.quoteQty && parseFloat(t.quoteQty) > 0) {
      return parseFloat(t.quoteQty)
    }
    // Fallback: calculate from qty and price
    const qty = parseFloat(t.qty || 0)
    const price = parseFloat(t.price || 0)
    return qty * price
  }).filter(size => size > 0 && !isNaN(size)) // Filter out invalid sizes

  if (tradeSizes.length === 0) {
    return { 
      consistent: true, 
      score: 100,
      consistencyScore: 100,
      avgSize: 0,
      stdDev: 0,
      coefficientOfVariation: 0,
      label: 'No Data',
      largestTrade: 0,
      smallestTrade: 0,
      isConsistent: true,
      hasStrategy: true
    }
  }

  const avgSize = tradeSizes.reduce((a, b) => a + b, 0) / tradeSizes.length
  if (avgSize <= 0 || isNaN(avgSize)) {
    return {
      consistent: true,
      score: 100,
      consistencyScore: 100,
      avgSize: 0,
      stdDev: 0,
      coefficientOfVariation: 0,
      label: 'No Data',
      largestTrade: 0,
      smallestTrade: 0,
      isConsistent: true,
      hasStrategy: true
    }
  }

  const variance = tradeSizes.reduce((sq, n) => sq + Math.pow(n - avgSize, 2), 0) / tradeSizes.length
  let stdDev = Math.sqrt(variance)
  if (isNaN(stdDev)) {
    stdDev = 0
  }

  const coefficientOfVariation = avgSize > 0 ? (stdDev / avgSize) : 0
  const consistencyScore = Math.max(0, Math.min(100, 100 - (coefficientOfVariation * 100)))
  const score = consistencyScore / 100 // Normalize to 0-1

  const largestTrade = Math.max(...tradeSizes)
  const smallestTrade = Math.min(...tradeSizes)

  // Generate label based on score
  let label = 'Erratic'
  if (score >= 0.8) label = 'Highly Consistent'
  else if (score >= 0.6) label = 'Consistent'
  else if (score >= 0.4) label = 'Moderate'

  return {
    avgSize,
    stdDev,
    coefficientOfVariation,
    consistencyScore,
    score, // UI expects this (0-1 range)
    label, // UI expects this
    largestTrade,
    smallestTrade,
    isConsistent: coefficientOfVariation < 0.5,
    hasStrategy: coefficientOfVariation < 0.3
  }
}

/**
 * Analyze timing patterns
 */
function analyzeTimingPatterns(trades) {
  const hourCounts = Array(24).fill(0)
  const dayCounts = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 }

  trades.forEach(t => {
    const date = new Date(t.time)
    hourCounts[date.getHours()]++
    const day = date.toLocaleDateString('en-US', { weekday: 'short' })
    dayCounts[day]++
  })

  const mostActiveHour = hourCounts.indexOf(Math.max(...hourCounts))
  const leastActiveHour = hourCounts.indexOf(Math.min(...hourCounts.filter(c => c > 0)))

  const nightTrades = (hourCounts[22] + hourCounts[23] + hourCounts[0] + hourCounts[1] + hourCounts[2]) / Math.max(trades.length, 1) * 100
  const isNightTrader = nightTrades > 30

  return {
    mostActiveHour,
    leastActiveHour,
    nightTradePercentage: nightTrades,
    isNightTrader,
    hourDistribution: hourCounts,
    dayDistribution: dayCounts
  }
}

/**
 * Detect emotional trading patterns
 */
function detectEmotionalTrading(trades) {
  let revengeTrading = 0
  let chasing = 0
  let impulsive = 0

  // Detect revenge trading (rapid trades after losses)
  const buys = trades.filter(t => t.isBuyer)

  for (let i = 1; i < buys.length; i++) {
    const timeDiff = (buys[i].time - buys[i-1].time) / (1000 * 60)
    if (timeDiff < 30) {
      impulsive++
      // Could be revenge trading or chasing
      if (buys[i].symbol === buys[i-1].symbol) {
        revengeTrading++
      } else {
        chasing++
      }
    }
  }

  const emotionalScore = Math.min(((revengeTrading + chasing) / Math.max(trades.length, 1)) * 100, 100)
  const isEmotional = emotionalScore > 20
  const totalEmotionalEvents = revengeTrading + chasing + impulsive

  return {
    revengeTrading,
    chasing,
    impulsive,
    emotionalScore,
    isEmotional,
    detected: isEmotional, // UI expects this
    count: totalEmotionalEvents, // UI expects this
    severity: emotionalScore > 40 ? 'high' : emotionalScore > 20 ? 'medium' : 'low'
  }
}

/**
 * Calculate overall consistency
 */
function calculateConsistency(trades) {
  if (trades.length < 5) return 50 // Not enough data

  // Time consistency
  const gaps = []
  for (let i = 1; i < trades.length; i++) {
    gaps.push((trades[i].time - trades[i-1].time) / (1000 * 60 * 60))
  }
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length
  const gapStdDev = Math.sqrt(gaps.reduce((sq, n) => sq + Math.pow(n - avgGap, 2), 0) / gaps.length)
  const timeConsistency = Math.max(0, 100 - (gapStdDev / Math.max(avgGap, 1)) * 10)

  // Size consistency (already calculated)
  const sizes = trades.map(t => parseFloat(t.quoteQty))
  const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length
  const sizeStdDev = Math.sqrt(sizes.reduce((sq, n) => sq + Math.pow(n - avgSize, 2), 0) / sizes.length)
  const sizeConsistency = Math.max(0, 100 - (sizeStdDev / Math.max(avgSize, 1)) * 50)

  return Math.round((timeConsistency + sizeConsistency) / 2)
}

/**
 * Calculate Behavioral Health Score (0-100)
 */
function calculateBehavioralHealthScore(analysis) {
  let score = 100

  // Helper function to safely get numeric value
  const safeNumber = (value, defaultValue = 0) => {
    const num = typeof value === 'number' ? value : parseFloat(value)
    return isNaN(num) ? defaultValue : num
  }

  // Deduct for panic selling (up to -30 points)
  const panicScore = safeNumber(analysis.panicPatterns?.score, 0)
  score -= panicScore * 0.3

  // Deduct for poor fee efficiency (up to -20 points)
  // Efficiency is a percentage (0-100), penalize if < 40%
  const feeEfficiency = safeNumber(analysis.feeAnalysis?.efficiency, 0)
  if (feeEfficiency < 40) {
    score -= 20
  } else if (feeEfficiency < 60) {
    score -= 10
  }

  // Deduct for taker addiction (up to -15 points)
  const takerPercentage = safeNumber(analysis.tradingStyle?.takerPercentage, 0)
  if (takerPercentage > 80) {
    score -= 15
  } else if (takerPercentage > 50) {
    score -= 7
  }

  // Deduct for inconsistent position sizing (up to -15 points)
  const positionConsistencyScore = safeNumber(analysis.positionSizing?.consistencyScore, 100)
  score -= (100 - positionConsistencyScore) * 0.15

  // Deduct for emotional trading (up to -20 points)
  const emotionalScore = safeNumber(analysis.emotionalState?.emotionalScore, 0)
  score -= emotionalScore * 0.2

  // Deduct for overtrading (up to -10 points)
  if (analysis.tradingStyle?.isOvertrading) {
    score -= 10
  }

  // Bonus for good consistency
  const consistencyScore = safeNumber(analysis.consistencyScore, 50)
  score += (consistencyScore - 50) * 0.1

  // Ensure final score is a valid number
  const finalScore = Math.round(Math.max(0, Math.min(100, score)))
  return isNaN(finalScore) ? 50 : finalScore
}

/**
 * Generate actionable behavioral insights
 */
function generateBehavioralInsights(data) {
  const insights = []

  // Panic selling insight
  if (data.panicPatterns.detected && data.panicPatterns.count > 3) {
    insights.push({
      type: 'critical',
      category: 'emotional',
      title: 'Panic Selling Detected',
      description: `You've made ${data.panicPatterns.count} rapid-fire sell decisions. This emotional pattern often leads to selling at the worst times.`,
      impact: 'high',
      actionSteps: [
        'Set predetermined exit points before entering trades',
        'Use stop-loss orders instead of manual panic selling',
        'Take a 24-hour cooling off period when you feel the urge to sell rapidly'
      ]
    })
  }

  // Fee hemorrhage insight
  if (data.feeAnalysis.savingsOpportunity > data.feeAnalysis.totalCommission * 0.3) {
    insights.push({
      type: 'opportunity',
      category: 'fees',
      title: 'Fee Optimization Opportunity',
      description: `You're paying $${data.feeAnalysis.totalCommission.toFixed(2)} in fees. By using limit orders instead of market orders, you could save $${data.feeAnalysis.savingsOpportunity.toFixed(2)}.`,
      impact: 'high',
      actionSteps: [
        'Use limit orders (maker) instead of market orders (taker)',
        'Be patient - wait for your limit order to fill',
        `Current maker/taker ratio: ${data.tradingStyle.makerPercentage.toFixed(0)}% / ${data.tradingStyle.takerPercentage.toFixed(0)}%`
      ]
    })
  }

  // Position sizing insight
  if (!data.positionSizing.isConsistent) {
    insights.push({
      type: 'warning',
      category: 'risk',
      title: 'Inconsistent Position Sizing',
      description: `Your trade sizes vary wildly (${data.positionSizing.coefficientOfVariation.toFixed(2)}x variation). This indicates no risk management strategy.`,
      impact: 'medium',
      actionSteps: [
        'Use a fixed % of your portfolio for each trade (recommended: 1-2%)',
        'Never risk more than 5% on a single trade',
        'Create a position sizing calculator or spreadsheet'
      ]
    })
  }

  // Overtrading insight
  if (data.tradingStyle.isOvertrading) {
    insights.push({
      type: 'warning',
      category: 'behavior',
      title: 'Overtrading Detected',
      description: `${data.tradingStyle.rapidTradeCount} of your trades happened within 5 minutes of each other. This increases fees and reduces decision quality.`,
      impact: 'medium',
      actionSteps: [
        'Implement a minimum 1-hour cooling period between trades',
        'Ask yourself: "Would I make this trade if I had to wait 24 hours?"',
        'Quality > Quantity: Fewer, better trades beat many mediocre ones'
      ]
    })
  }

  // Liquidation pattern
  if (data.tradingStyle.pattern === 'liquidation') {
    insights.push({
      type: 'info',
      category: 'pattern',
      title: 'Liquidation Mode Detected',
      description: `You have ${data.tradingStyle.sells} sells but only ${data.tradingStyle.buys} buys (ratio: ${data.tradingStyle.buyToSellRatio.toFixed(2)}). You're exiting positions, not trading.`,
      impact: 'medium',
      actionSteps: [
        'This is normal if you deposited crypto from external wallets',
        'If intentionally liquidating: consider tax implications and timing',
        'If this isn\'t intentional: reassess your trading strategy'
      ]
    })
  }

  // Night trading warning
  if (data.timingPatterns.isNightTrader) {
    insights.push({
      type: 'info',
      category: 'timing',
      title: 'Night Trading Pattern',
      description: `${data.timingPatterns.nightTradePercentage.toFixed(0)}% of your trades happen late at night (10 PM - 3 AM). Decision quality often decreases when tired.`,
      impact: 'low',
      actionSteps: [
        'Compare your win rate for night trades vs day trades',
        'Consider setting a "no trading after 10 PM" rule',
        'Sleep on decisions - volatile markets will still be there tomorrow'
      ]
    })
  }

  return insights
}

/**
 * Generate critical warnings
 */
function generateWarnings(data) {
  const warnings = []

  if (data.healthScore < 40) {
    warnings.push({
      severity: 'critical',
      message: 'Your trading behavior shows multiple red flags. Consider taking a break and reviewing your strategy.',
      category: 'health'
    })
  }

  if (data.panicPatterns.severity === 'high') {
    warnings.push({
      severity: 'high',
      message: 'Frequent panic selling detected. This emotional pattern is destroying your returns.',
      category: 'emotional'
    })
  }

  if (data.emotionalState.isEmotional && data.emotionalState.severity === 'high') {
    warnings.push({
      severity: 'high',
      message: 'High emotional trading activity detected. You may be revenge trading or chasing pumps.',
      category: 'emotional'
    })
  }

  if (data.feeAnalysis.feePercentage > 2) {
    warnings.push({
      severity: 'medium',
      message: `Fees are ${data.feeAnalysis.feePercentage.toFixed(2)}% of your trading volume. This is unsustainably high.`,
      category: 'fees'
    })
  }

  return warnings
}

/**
 * Empty analysis for when there's no data
 */
function getEmptyBehavioralAnalysis() {
  return {
    healthScore: 50,
    panicPatterns: { detected: false, count: 0, events: [], severity: 'low', score: 0 },
    tradingStyle: {
      buyToSellRatio: 0,
      buyVsSellRatio: 0,
      pattern: 'unknown',
      makerPercentage: 0,
      makerPercent: 0,
      takerPercentage: 0,
      takerPercent: 0,
      rapidFirePercent: 0
    },
    feeAnalysis: {
      totalFees: 0,
      makerFees: 0,
      takerFees: 0,
      potentialSavings: 0,
      commissionByAsset: {},
      efficiency: 0,
      feePercentage: 0
    },
    positionSizing: {
      avgSize: 0,
      consistencyScore: 100,
      score: 1,
      label: 'Highly Consistent',
      isConsistent: true
    },
    timingPatterns: { mostActiveHour: 0, isNightTrader: false, nightTradePercentage: 0 },
    emotionalState: {
      revengeTrading: 0,
      chasing: 0,
      emotionalScore: 0,
      isEmotional: false,
      detected: false,
      count: 0
    },
    consistencyScore: 50,
    insights: [],
    warnings: []
  }
}

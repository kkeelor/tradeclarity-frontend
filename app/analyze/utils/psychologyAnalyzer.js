// app/analyze/utils/psychologyAnalyzer.js
// Extracts deep trading psychology insights from trade data

export const analyzeTradingPsychology = (allTrades, spotAnalysis, futuresAnalysis) => {
  console.log('\n=== PSYCHOLOGY ANALYZER ===')
  
  if (!allTrades || allTrades.length === 0) {
    return getEmptyPsychology()
  }

  // Sort trades chronologically
  const sortedTrades = [...allTrades].sort((a, b) => a.time - b.time)
  
  return {
    strengths: analyzeStrengths(sortedTrades, spotAnalysis, futuresAnalysis),
    weaknesses: analyzeWeaknesses(sortedTrades, spotAnalysis, futuresAnalysis),
    recommendations: generateRecommendations(sortedTrades, spotAnalysis, futuresAnalysis),
    behavioralPatterns: analyzeBehavioralPatterns(sortedTrades),
    timeBasedInsights: analyzeTimePatterns(sortedTrades),
    symbolBehavior: analyzeSymbolBehavior(sortedTrades, spotAnalysis, futuresAnalysis),
    emotionalTriggers: detectEmotionalTriggers(sortedTrades),
    disciplineScore: calculateDisciplineScore(sortedTrades, spotAnalysis, futuresAnalysis)
  }
}

// Calculate overall trading discipline score (0-100)
const calculateDisciplineScore = (trades, spotAnalysis, futuresAnalysis) => {
  let score = 50 // Start neutral
  
  // Win rate contribution (+20 max)
  const winRate = spotAnalysis.winRate || 0
  if (winRate >= 60) score += 20
  else if (winRate >= 50) score += 10
  else if (winRate < 40) score -= 10
  
  // Profit factor contribution (+15 max)
  const pf = spotAnalysis.profitFactor || 0
  if (pf >= 2) score += 15
  else if (pf >= 1.5) score += 10
  else if (pf < 1) score -= 15
  
  // Consistency contribution (+15 max)
  const maxConsecLosses = Math.max(
    spotAnalysis.maxConsecutiveLosses || 0,
    futuresAnalysis.maxConsecutiveLosses || 0
  )
  if (maxConsecLosses <= 3) score += 15
  else if (maxConsecLosses <= 5) score += 5
  else score -= 10
  
  return Math.max(0, Math.min(100, score))
}

// Identify user's strengths
const analyzeStrengths = (trades, spotAnalysis, futuresAnalysis) => {
  const strengths = []
  
  // Patient holding on winners
  const winners = trades.filter(t => t.pnl && t.pnl > 0)
  if (winners.length > 0) {
    const avgWinnerHold = calculateAvgHoldTime(winners)
    if (avgWinnerHold > 4 * 60 * 60 * 1000) { // > 4 hours
      strengths.push({
        type: 'patience',
        message: `Patient on winning trades (avg hold: ${formatDuration(avgWinnerHold)})`,
        icon: '✅'
      })
    }
  }
  
  // Good win rate
  const winRate = spotAnalysis.winRate || 0
  if (winRate >= 60) {
    strengths.push({
      type: 'win_rate',
      message: `Strong win rate of ${winRate.toFixed(1)}%`,
      icon: '🎯'
    })
  }
  
  // Good profit factor
  const pf = spotAnalysis.profitFactor || 0
  if (pf >= 2) {
    strengths.push({
      type: 'profit_factor',
      message: `Excellent profit factor: ${pf.toFixed(2)}x`,
      icon: '💪'
    })
  }
  
  // Best performing symbols
  const symbols = { ...spotAnalysis.symbols, ...futuresAnalysis.symbols }
  const bestSymbols = Object.entries(symbols)
    .filter(([_, data]) => data.trades >= 5 && data.winRate >= 60)
    .sort((a, b) => b[1].winRate - a[1].winRate)
    .slice(0, 2)
  
  if (bestSymbols.length > 0) {
    bestSymbols.forEach(([symbol, data]) => {
      strengths.push({
        type: 'symbol_mastery',
        message: `Strong on ${symbol} (${data.winRate.toFixed(0)}% WR, ${data.trades} trades)`,
        icon: '⭐'
      })
    })
  }
  
  // Good at cutting losses
  const losers = trades.filter(t => t.pnl && t.pnl < 0)
  if (losers.length > 0 && winners.length > 0) {
    const avgLoserHold = calculateAvgHoldTime(losers)
    const avgWinnerHold = calculateAvgHoldTime(winners)
    
    if (avgLoserHold < avgWinnerHold * 0.7) {
      strengths.push({
        type: 'loss_cutting',
        message: 'Good at cutting losses quickly',
        icon: '✂️'
      })
    }
  }
  
  return strengths
}

// Identify user's weaknesses
const analyzeWeaknesses = (trades, spotAnalysis, futuresAnalysis) => {
  const weaknesses = []
  
  // Holding losers too long
  const winners = trades.filter(t => t.pnl && t.pnl > 0)
  const losers = trades.filter(t => t.pnl && t.pnl < 0)
  
  if (losers.length > 0 && winners.length > 0) {
    const avgLoserHold = calculateAvgHoldTime(losers)
    const avgWinnerHold = calculateAvgHoldTime(winners)
    
    if (avgLoserHold > avgWinnerHold * 1.5) {
      weaknesses.push({
        type: 'holding_losers',
        message: `Holding losers ${(avgLoserHold / avgWinnerHold).toFixed(1)}x longer than winners`,
        severity: 'high',
        icon: '⚠️'
      })
    }
  }
  
  // Revenge trading detection
  const revengeTradingSessions = detectRevengeTradingSessions(trades)
  if (revengeTradingSessions.length > 0) {
    weaknesses.push({
      type: 'revenge_trading',
      message: `${revengeTradingSessions.length} revenge trading sessions detected`,
      severity: 'high',
      icon: '😤'
    })
  }
  
  // Weekend emotional trading
  const weekendTrades = trades.filter(t => {
    const day = new Date(t.time).getDay()
    return day === 0 || day === 6 // Saturday or Sunday
  })
  
  if (weekendTrades.length >= 10) {
    const weekendWinRate = calculateWinRate(weekendTrades)
    const overallWinRate = spotAnalysis.winRate || 0
    
    if (weekendWinRate < overallWinRate - 15) {
      weaknesses.push({
        type: 'weekend_trading',
        message: `Weekend trading underperforms (${weekendWinRate.toFixed(0)}% vs ${overallWinRate.toFixed(0)}% WR)`,
        severity: 'medium',
        icon: '📅'
      })
    }
  }
  
  // Over-leveraging (futures)
  if (futuresAnalysis.symbols) {
    const highLeverageSymbols = Object.entries(futuresAnalysis.symbols)
      .filter(([_, data]) => data.trades >= 3 && data.winRate < 45)
    
    if (highLeverageSymbols.length > 0) {
      weaknesses.push({
        type: 'overleveraging',
        message: `Poor performance on high-leverage trades`,
        severity: 'high',
        icon: '⚡'
      })
    }
  }
  
  // FOMO coins
  const fomoCoins = detectFOMOCoins({ ...spotAnalysis.symbols, ...futuresAnalysis.symbols })
  if (fomoCoins.length > 0) {
    weaknesses.push({
      type: 'fomo_trading',
      message: `FOMO trading on ${fomoCoins.length} symbols (low win rate)`,
      severity: 'medium',
      icon: '🎲'
    })
  }
  
  // Overconfidence after wins
  const overconfidenceScore = detectOverconfidence(trades)
  if (overconfidenceScore > 1.5) {
    weaknesses.push({
      type: 'overconfidence',
      message: `Position sizes increase ${((overconfidenceScore - 1) * 100).toFixed(0)}% after wins`,
      severity: 'medium',
      icon: '📈'
    })
  }
  
  return weaknesses
}

// Generate actionable recommendations
const generateRecommendations = (trades, spotAnalysis, futuresAnalysis) => {
  const recommendations = []
  
  // Time-based recommendations
  const bestHours = findBestTradingHours(trades)
  if (bestHours.length > 0) {
    const bestHour = bestHours[0]
    recommendations.push({
      type: 'timing',
      title: 'Trade during your peak hours',
      message: `Your best performance: ${bestHour.hourRange} (${bestHour.winRate.toFixed(0)}% WR)`,
      priority: 'high'
    })
  }
  
  const worstHours = findWorstTradingHours(trades)
  if (worstHours.length > 0) {
    const worstHour = worstHours[0]
    recommendations.push({
      type: 'timing',
      title: 'Avoid trading at these times',
      message: `Poor performance: ${worstHour.hourRange} (${worstHour.winRate.toFixed(0)}% WR)`,
      priority: 'high'
    })
  }
  
  // Symbol recommendations
  const symbols = { ...spotAnalysis.symbols, ...futuresAnalysis.symbols }
  const bestSymbol = Object.entries(symbols)
    .filter(([_, data]) => data.trades >= 5)
    .sort((a, b) => b[1].winRate - a[1].winRate)[0]
  
  if (bestSymbol) {
    recommendations.push({
      type: 'symbol',
      title: 'Focus on your best symbol',
      message: `${bestSymbol[0]} is your strength (${bestSymbol[1].winRate.toFixed(0)}% WR)`,
      priority: 'medium'
    })
  }
  
  // Stop loss recommendation
  const losers = trades.filter(t => t.pnl && t.pnl < 0)
  if (losers.length > 0) {
    const avgLoserHold = calculateAvgHoldTime(losers)
    if (avgLoserHold > 4 * 60 * 60 * 1000) { // > 4 hours
      recommendations.push({
        type: 'risk_management',
        title: 'Set time-based stop losses',
        message: `Consider exiting losing trades after 2-3 hours`,
        priority: 'high'
      })
    }
  }
  
  // Leverage recommendation (futures)
  if (futuresAnalysis.symbols && Object.keys(futuresAnalysis.symbols).length > 0) {
    recommendations.push({
      type: 'leverage',
      title: 'Keep leverage conservative',
      message: 'Limit leverage to 3-5x for better consistency',
      priority: 'medium'
    })
  }
  
  return recommendations
}

// Analyze behavioral patterns after wins/losses
const analyzeBehavioralPatterns = (trades) => {
  const patterns = {
    afterWins: { avgSize: 0, avgLeverage: 0, winRate: 0, count: 0 },
    afterLosses: { avgSize: 0, avgLeverage: 0, winRate: 0, count: 0 }
  }
  
  for (let i = 1; i < trades.length; i++) {
    const prevTrade = trades[i - 1]
    const currentTrade = trades[i]
    
    if (!prevTrade.pnl) continue
    
    const currentSize = parseFloat(currentTrade.qty) * parseFloat(currentTrade.price)
    
    if (prevTrade.pnl > 0) {
      // After a win
      patterns.afterWins.avgSize += currentSize
      patterns.afterWins.count++
      if (currentTrade.pnl) {
        patterns.afterWins.winRate += currentTrade.pnl > 0 ? 1 : 0
      }
    } else {
      // After a loss
      patterns.afterLosses.avgSize += currentSize
      patterns.afterLosses.count++
      if (currentTrade.pnl) {
        patterns.afterLosses.winRate += currentTrade.pnl > 0 ? 1 : 0
      }
    }
  }
  
  if (patterns.afterWins.count > 0) {
    patterns.afterWins.avgSize /= patterns.afterWins.count
    patterns.afterWins.winRate = (patterns.afterWins.winRate / patterns.afterWins.count) * 100
  }
  
  if (patterns.afterLosses.count > 0) {
    patterns.afterLosses.avgSize /= patterns.afterLosses.count
    patterns.afterLosses.winRate = (patterns.afterLosses.winRate / patterns.afterLosses.count) * 100
  }
  
  // Calculate overconfidence ratio
  const sizeRatio = patterns.afterWins.avgSize / (patterns.afterLosses.avgSize || 1)
  
  return {
    ...patterns,
    overconfidenceRatio: sizeRatio,
    isOverconfident: sizeRatio > 1.3,
    isFearBased: sizeRatio < 0.7
  }
}

// Analyze time-based patterns
const analyzeTimePatterns = (trades) => {
  const hourlyStats = Array(24).fill(null).map((_, hour) => ({
    hour,
    trades: 0,
    wins: 0,
    losses: 0,
    winRate: 0
  }))
  
  const dailyStats = {
    0: { day: 'Sun', trades: 0, wins: 0, losses: 0, winRate: 0 },
    1: { day: 'Mon', trades: 0, wins: 0, losses: 0, winRate: 0 },
    2: { day: 'Tue', trades: 0, wins: 0, losses: 0, winRate: 0 },
    3: { day: 'Wed', trades: 0, wins: 0, losses: 0, winRate: 0 },
    4: { day: 'Thu', trades: 0, wins: 0, losses: 0, winRate: 0 },
    5: { day: 'Fri', trades: 0, wins: 0, losses: 0, winRate: 0 },
    6: { day: 'Sat', trades: 0, wins: 0, losses: 0, winRate: 0 }
  }
  
  trades.forEach(trade => {
    const date = new Date(trade.time)
    const hour = date.getHours()
    const day = date.getDay()
    
    // Hourly
    hourlyStats[hour].trades++
    if (trade.pnl) {
      if (trade.pnl > 0) hourlyStats[hour].wins++
      else hourlyStats[hour].losses++
    }
    
    // Daily
    dailyStats[day].trades++
    if (trade.pnl) {
      if (trade.pnl > 0) dailyStats[day].wins++
      else dailyStats[day].losses++
    }
  })
  
  // Calculate win rates
  hourlyStats.forEach(stat => {
    if (stat.wins + stat.losses > 0) {
      stat.winRate = (stat.wins / (stat.wins + stat.losses)) * 100
    }
  })
  
  Object.values(dailyStats).forEach(stat => {
    if (stat.wins + stat.losses > 0) {
      stat.winRate = (stat.wins / (stat.wins + stat.losses)) * 100
    }
  })
  
  // Create heatmap data
  const heatmap = []
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour += 4) {
      const dayTrades = trades.filter(t => {
        const d = new Date(t.time)
        return d.getDay() === day && d.getHours() >= hour && d.getHours() < hour + 4
      })
      
      const wins = dayTrades.filter(t => t.pnl && t.pnl > 0).length
      const total = dayTrades.filter(t => t.pnl).length
      const winRate = total > 0 ? (wins / total) * 100 : null
      
      heatmap.push({
        day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day],
        hourRange: `${hour}-${hour + 3}`,
        trades: dayTrades.length,
        winRate,
        color: winRate === null ? 'gray' : winRate >= 70 ? 'green' : winRate >= 50 ? 'yellow' : 'red'
      })
    }
  }
  
  return {
    hourlyStats,
    dailyStats: Object.values(dailyStats),
    heatmap,
    bestHours: hourlyStats
      .filter(h => h.trades >= 3)
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 3),
    worstHours: hourlyStats
      .filter(h => h.trades >= 3)
      .sort((a, b) => a.winRate - b.winRate)
      .slice(0, 3)
  }
}

// Analyze symbol-specific behavior
const analyzeSymbolBehavior = (trades, spotAnalysis, futuresAnalysis) => {
  const symbols = { ...spotAnalysis.symbols, ...futuresAnalysis.symbols }
  const symbolInsights = []
  
  Object.entries(symbols).forEach(([symbol, data]) => {
    if (data.trades < 3) return // Skip low sample size
    
    const symbolTrades = trades.filter(t => t.symbol === symbol)
    const avgHold = calculateAvgHoldTime(symbolTrades)
    
    let insight = {
      symbol,
      trades: data.trades,
      winRate: data.winRate,
      avgHoldTime: formatDuration(avgHold),
      category: 'neutral',
      message: ''
    }
    
    // Categorize
    if (data.winRate >= 65 && data.trades >= 10) {
      insight.category = 'strength'
      insight.message = 'Your go-to symbol - keep trading it!'
      insight.icon = '✅'
    } else if (data.winRate >= 50 && data.trades >= 5) {
      insight.category = 'decent'
      insight.message = 'Solid performance, room for improvement'
      insight.icon = '🟨'
    } else if (data.winRate < 40) {
      insight.category = 'weakness'
      insight.message = data.trades <= 5 ? 'Possible FOMO trades' : 'Consider avoiding'
      insight.icon = '⚠️'
    }
    
    // Detect impulsive trading (very short hold times)
    if (avgHold < 60 * 60 * 1000 && data.winRate < 45) { // < 1 hour
      insight.category = 'fomo'
      insight.message = 'Impulsive entries detected'
      insight.icon = '🎲'
    }
    
    symbolInsights.push(insight)
  })
  
  return symbolInsights.sort((a, b) => b.winRate - a.winRate)
}

// Detect emotional trading triggers
const detectEmotionalTriggers = (trades) => {
  const triggers = []
  
  // Detect tilt/revenge trading
  const revengeSessions = detectRevengeTradingSessions(trades)
  if (revengeSessions.length > 0) {
    triggers.push({
      type: 'revenge_trading',
      severity: 'high',
      message: `${revengeSessions.length} revenge trading sessions detected`,
      description: 'Rapid trades after losses indicate emotional decision-making'
    })
  }
  
  // Detect FOMO
  const fomoTrades = trades.filter(t => {
    const size = parseFloat(t.qty) * parseFloat(t.price)
    // Check if this is significantly larger than average
    return size > 0 // Placeholder - need avg calculation
  })
  
  return triggers
}

// ============= HELPER FUNCTIONS =============

const getEmptyPsychology = () => ({
  strengths: [],
  weaknesses: [],
  recommendations: [],
  behavioralPatterns: {
    afterWins: { avgSize: 0, winRate: 0, count: 0 },
    afterLosses: { avgSize: 0, winRate: 0, count: 0 },
    overconfidenceRatio: 1,
    isOverconfident: false,
    isFearBased: false
  },
  timeBasedInsights: {
    hourlyStats: [],
    dailyStats: [],
    heatmap: [],
    bestHours: [],
    worstHours: []
  },
  symbolBehavior: [],
  emotionalTriggers: [],
  disciplineScore: 50
})

const calculateAvgHoldTime = (trades) => {
  if (trades.length === 0) return 0
  
  let totalTime = 0
  let count = 0
  
  for (let i = 1; i < trades.length; i++) {
    if (trades[i].symbol === trades[i-1].symbol) {
      totalTime += trades[i].time - trades[i-1].time
      count++
    }
  }
  
  return count > 0 ? totalTime / count : 0
}

const formatDuration = (ms) => {
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

const calculateWinRate = (trades) => {
  const completedTrades = trades.filter(t => t.pnl)
  if (completedTrades.length === 0) return 0
  
  const wins = completedTrades.filter(t => t.pnl > 0).length
  return (wins / completedTrades.length) * 100
}

const detectRevengeTradingSessions = (trades) => {
  const sessions = []
  
  for (let i = 0; i < trades.length - 4; i++) {
    const window = trades.slice(i, i + 5)
    const timeSpan = window[4].time - window[0].time
    
    // 5+ trades in 30 minutes after a loss
    if (timeSpan < 30 * 60 * 1000) {
      const hasInitialLoss = window[0].pnl && window[0].pnl < 0
      if (hasInitialLoss) {
        sessions.push({
          startTime: window[0].time,
          trades: window.length,
          timeSpan: formatDuration(timeSpan)
        })
      }
    }
  }
  
  return sessions
}

const detectFOMOCoins = (symbols) => {
  return Object.entries(symbols)
    .filter(([_, data]) => 
      data.trades <= 3 && 
      data.winRate < 40
    )
    .map(([symbol]) => symbol)
}

const detectOverconfidence = (trades) => {
  let afterWinSizes = []
  let afterLossSizes = []
  
  for (let i = 1; i < trades.length; i++) {
    const prevPnL = trades[i - 1].pnl
    const currentSize = parseFloat(trades[i].qty) * parseFloat(trades[i].price)
    
    if (prevPnL > 0) afterWinSizes.push(currentSize)
    else if (prevPnL < 0) afterLossSizes.push(currentSize)
  }
  
  const avgAfterWin = afterWinSizes.length > 0 
    ? afterWinSizes.reduce((a, b) => a + b, 0) / afterWinSizes.length 
    : 0
  
  const avgAfterLoss = afterLossSizes.length > 0
    ? afterLossSizes.reduce((a, b) => a + b, 0) / afterLossSizes.length
    : 0
  
  return avgAfterLoss > 0 ? avgAfterWin / avgAfterLoss : 1
}

const findBestTradingHours = (trades) => {
  const hourlyStats = Array(24).fill(null).map((_, hour) => ({
    hour,
    hourRange: `${hour}:00-${hour + 1}:00`,
    trades: 0,
    wins: 0,
    winRate: 0
  }))
  
  trades.forEach(trade => {
    const hour = new Date(trade.time).getHours()
    hourlyStats[hour].trades++
    if (trade.pnl && trade.pnl > 0) hourlyStats[hour].wins++
  })
  
  hourlyStats.forEach(stat => {
    if (stat.trades > 0) {
      stat.winRate = (stat.wins / stat.trades) * 100
    }
  })
  
  return hourlyStats
    .filter(h => h.trades >= 3)
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 3)
}

const findWorstTradingHours = (trades) => {
  const hourlyStats = Array(24).fill(null).map((_, hour) => ({
    hour,
    hourRange: `${hour}:00-${hour + 1}:00`,
    trades: 0,
    wins: 0,
    winRate: 0
  }))
  
  trades.forEach(trade => {
    const hour = new Date(trade.time).getHours()
    hourlyStats[hour].trades++
    if (trade.pnl && trade.pnl > 0) hourlyStats[hour].wins++
  })
  
  hourlyStats.forEach(stat => {
    if (stat.trades > 0) {
      stat.winRate = (stat.wins / stat.trades) * 100
    }
  })
  
  return hourlyStats
    .filter(h => h.trades >= 3)
    .sort((a, b) => a.winRate - b.winRate)
    .slice(0, 3)
}
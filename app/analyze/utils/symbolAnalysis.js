// app/analyze/utils/symbolAnalysis.js

/**
 * Symbol-Specific Analytics
 * Detailed analysis per trading pair with actionable recommendations
 */

// ============================================
// SYMBOL PERFORMANCE ANALYSIS
// ============================================

export function analyzeSymbolPerformance(trades) {
  if (!trades || trades.length === 0) return []

  const symbolMap = {}

  trades.forEach(trade => {
    const symbol = trade.symbol || 'UNKNOWN'

    if (!symbolMap[symbol]) {
      symbolMap[symbol] = {
        symbol,
        trades: 0,
        wins: 0,
        losses: 0,
        totalPnL: 0,
        totalVolume: 0,
        winningPnL: 0,
        losingPnL: 0,
        largestWin: 0,
        largestLoss: 0,
        consecutiveWins: 0,
        consecutiveLosses: 0,
        currentStreak: 0,
        streakType: null
      }
    }

    const pnl = trade.realizedPnl || 0
    symbolMap[symbol].trades++
    symbolMap[symbol].totalPnL += pnl
    symbolMap[symbol].totalVolume += Math.abs(trade.quantity || 0)

    if (pnl > 0) {
      symbolMap[symbol].wins++
      symbolMap[symbol].winningPnL += pnl
      symbolMap[symbol].largestWin = Math.max(symbolMap[symbol].largestWin, pnl)

      if (symbolMap[symbol].streakType === 'win') {
        symbolMap[symbol].currentStreak++
      } else {
        symbolMap[symbol].currentStreak = 1
        symbolMap[symbol].streakType = 'win'
      }
      symbolMap[symbol].consecutiveWins = Math.max(
        symbolMap[symbol].consecutiveWins,
        symbolMap[symbol].currentStreak
      )
    } else if (pnl < 0) {
      symbolMap[symbol].losses++
      symbolMap[symbol].losingPnL += pnl
      symbolMap[symbol].largestLoss = Math.min(symbolMap[symbol].largestLoss, pnl)

      if (symbolMap[symbol].streakType === 'loss') {
        symbolMap[symbol].currentStreak++
      } else {
        symbolMap[symbol].currentStreak = 1
        symbolMap[symbol].streakType = 'loss'
      }
      symbolMap[symbol].consecutiveLosses = Math.max(
        symbolMap[symbol].consecutiveLosses,
        symbolMap[symbol].currentStreak
      )
    }
  })

  return Object.values(symbolMap).map(symbol => {
    const winRate = symbol.trades > 0 ? (symbol.wins / symbol.trades) * 100 : 0
    const avgWin = symbol.wins > 0 ? symbol.winningPnL / symbol.wins : 0
    const avgLoss = symbol.losses > 0 ? symbol.losingPnL / symbol.losses : 0
    const profitFactor = symbol.losingPnL !== 0 ? Math.abs(symbol.winningPnL / symbol.losingPnL) : symbol.winningPnL > 0 ? 999 : 0
    const avgPnL = symbol.trades > 0 ? symbol.totalPnL / symbol.trades : 0
    const expectancy = (winRate / 100) * avgWin + ((100 - winRate) / 100) * avgLoss

    return {
      ...symbol,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      avgPnL,
      expectancy
    }
  })
}

// ============================================
// SYMBOL RECOMMENDATIONS
// ============================================

export function generateSymbolRecommendations(symbolData) {
  if (!symbolData || symbolData.length === 0) return []

  const recommendations = []

  // Sort by expectancy (best overall metric)
  const sortedByExpectancy = [...symbolData].sort((a, b) => b.expectancy - a.expectancy)

  // Best symbols to focus on
  const topSymbols = sortedByExpectancy
    .filter(s => s.trades >= 10 && s.expectancy > 0) // Minimum 10 trades and positive expectancy
    .slice(0, 3)

  if (topSymbols.length > 0) {
    recommendations.push({
      type: 'focus',
      severity: 'positive',
      title: 'Focus on These Pairs',
      symbols: topSymbols.map(s => s.symbol),
      message: `${topSymbols.map(s => s.symbol).join(', ')} show strong positive expectancy. Focus your trading here.`,
      details: topSymbols.map(s => ({
        symbol: s.symbol,
        winRate: s.winRate,
        expectancy: s.expectancy,
        totalPnL: s.totalPnL,
        profitFactor: s.profitFactor
      }))
    })
  }

  // Worst symbols to avoid
  const worstSymbols = sortedByExpectancy
    .filter(s => s.trades >= 10 && s.expectancy < 0) // Minimum 10 trades and negative expectancy
    .slice(-3)
    .reverse()

  if (worstSymbols.length > 0) {
    recommendations.push({
      type: 'avoid',
      severity: 'high',
      title: 'Avoid These Pairs',
      symbols: worstSymbols.map(s => s.symbol),
      message: `${worstSymbols.map(s => s.symbol).join(', ')} consistently lose money. Stop trading them.`,
      details: worstSymbols.map(s => ({
        symbol: s.symbol,
        winRate: s.winRate,
        expectancy: s.expectancy,
        totalPnL: s.totalPnL,
        profitFactor: s.profitFactor
      }))
    })
  }

  // High volume but low profit
  const inefficientSymbols = symbolData
    .filter(s => s.trades >= 15 && Math.abs(s.avgPnL) < 5)

  if (inefficientSymbols.length > 0) {
    recommendations.push({
      type: 'inefficient',
      severity: 'medium',
      title: 'High Activity, Low Returns',
      symbols: inefficientSymbols.map(s => s.symbol),
      message: `You trade ${inefficientSymbols.map(s => s.symbol).join(', ')} frequently but with minimal profit. Consider larger positions or avoid.`,
      details: inefficientSymbols.map(s => ({
        symbol: s.symbol,
        trades: s.trades,
        avgPnL: s.avgPnL,
        totalPnL: s.totalPnL
      }))
    })
  }

  // Low sample size warning removed - focus on actionable insights only
  // Users don't need to be told about insufficient data, they need insights on what they have

  return recommendations
}

// ============================================
// SYMBOL RANKING
// ============================================

export function rankSymbols(symbolData) {
  if (!symbolData || symbolData.length === 0) return []

  // Filter symbols with minimum trade count
  const qualifiedSymbols = symbolData.filter(s => s.trades >= 5)

  // Multi-factor ranking
  return qualifiedSymbols.map(symbol => {
    let score = 0

    // Win rate score (0-30 points)
    score += (symbol.winRate / 100) * 30

    // Profit factor score (0-25 points)
    const pfScore = Math.min(symbol.profitFactor / 3, 1) * 25
    score += pfScore

    // Expectancy score (0-25 points)
    const expectancyScore = Math.max(0, Math.min(symbol.expectancy / 10, 1)) * 25
    score += expectancyScore

    // Total P&L score (0-20 points)
    const maxPnL = Math.max(...symbolData.map(s => Math.abs(s.totalPnL)))
    const pnlScore = maxPnL > 0 ? (Math.abs(symbol.totalPnL) / maxPnL) * 20 : 0
    score += symbol.totalPnL > 0 ? pnlScore : -pnlScore

    return {
      ...symbol,
      score: Math.max(0, Math.min(100, score)),
      rank: null // Will be assigned after sorting
    }
  })
    .sort((a, b) => b.score - a.score)
    .map((symbol, index) => ({
      ...symbol,
      rank: index + 1
    }))
}

// ============================================
// SYMBOL COMPARISON
// ============================================

export function compareSymbols(symbol1, symbol2, symbolData) {
  const s1 = symbolData.find(s => s.symbol === symbol1)
  const s2 = symbolData.find(s => s.symbol === symbol2)

  if (!s1 || !s2) return null

  return {
    symbol1: symbol1,
    symbol2: symbol2,
    comparison: {
      winRate: {
        winner: s1.winRate > s2.winRate ? symbol1 : symbol2,
        diff: Math.abs(s1.winRate - s2.winRate)
      },
      profitFactor: {
        winner: s1.profitFactor > s2.profitFactor ? symbol1 : symbol2,
        diff: Math.abs(s1.profitFactor - s2.profitFactor)
      },
      totalPnL: {
        winner: s1.totalPnL > s2.totalPnL ? symbol1 : symbol2,
        diff: Math.abs(s1.totalPnL - s2.totalPnL)
      },
      expectancy: {
        winner: s1.expectancy > s2.expectancy ? symbol1 : symbol2,
        diff: Math.abs(s1.expectancy - s2.expectancy)
      }
    }
  }
}

// ============================================
// MAIN ANALYSIS FUNCTION
// ============================================

export function analyzeSymbols(trades) {
  if (!trades || trades.length === 0) {
    return {
      symbolPerformance: [],
      recommendations: [],
      rankings: [],
      summary: null
    }
  }

  const symbolPerformance = analyzeSymbolPerformance(trades)
  const recommendations = generateSymbolRecommendations(symbolPerformance)
  const rankings = rankSymbols(symbolPerformance)

  // Summary statistics
  const summary = {
    totalSymbols: symbolPerformance.length,
    profitableSymbols: symbolPerformance.filter(s => s.totalPnL > 0).length,
    bestSymbol: rankings.length > 0 ? rankings[0] : null,
    worstSymbol: rankings.length > 0 ? rankings[rankings.length - 1] : null
  }

  return {
    symbolPerformance,
    recommendations,
    rankings,
    summary
  }
}

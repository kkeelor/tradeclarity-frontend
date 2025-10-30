// app/analyze/utils/drawdownAnalysis.js

/**
 * Drawdown Analysis - Calculate and analyze equity drawdowns
 * Helps traders understand their worst losing periods and recovery patterns
 */

// ============================================
// EQUITY CURVE CALCULATION
// ============================================

export function calculateEquityCurve(trades) {
  if (!trades || trades.length === 0) return []

  const sortedTrades = [...trades].sort((a, b) =>
    new Date(a.timestamp || a.time) - new Date(b.timestamp || b.time)
  )

  let runningBalance = 0
  const equityCurve = []

  sortedTrades.forEach(trade => {
    runningBalance += trade.realizedPnl || 0
    equityCurve.push({
      timestamp: trade.timestamp || trade.time,
      balance: runningBalance,
      trade: trade
    })
  })

  return equityCurve
}

// ============================================
// DRAWDOWN CALCULATION
// ============================================

export function calculateDrawdowns(equityCurve) {
  if (!equityCurve || equityCurve.length === 0) return []

  const drawdowns = []
  let peak = equityCurve[0].balance
  let peakIndex = 0
  let inDrawdown = false
  let drawdownStart = null

  equityCurve.forEach((point, index) => {
    if (point.balance > peak) {
      // New peak reached
      if (inDrawdown) {
        // End current drawdown
        drawdowns.push({
          ...drawdownStart,
          endDate: equityCurve[index - 1].timestamp,
          endIndex: index - 1,
          endBalance: equityCurve[index - 1].balance,
          recovered: true,
          recoveryDate: point.timestamp,
          recoveryIndex: index
        })
        inDrawdown = false
      }
      peak = point.balance
      peakIndex = index
    } else if (point.balance < peak) {
      // In drawdown
      const drawdownAmount = peak - point.balance
      const drawdownPercent = (drawdownAmount / Math.abs(peak)) * 100

      if (!inDrawdown) {
        // Start new drawdown
        inDrawdown = true
        drawdownStart = {
          startDate: equityCurve[peakIndex].timestamp,
          startIndex: peakIndex,
          peakBalance: peak,
          drawdownAmount: drawdownAmount,
          drawdownPercent: drawdownPercent,
          lowestBalance: point.balance,
          lowestIndex: index
        }
      } else {
        // Update existing drawdown if this is lower
        if (point.balance < drawdownStart.lowestBalance) {
          drawdownStart.lowestBalance = point.balance
          drawdownStart.lowestIndex = index
          drawdownStart.drawdownAmount = drawdownAmount
          drawdownStart.drawdownPercent = drawdownPercent
        }
      }
    }
  })

  // If still in drawdown at the end
  if (inDrawdown) {
    drawdowns.push({
      ...drawdownStart,
      endDate: equityCurve[equityCurve.length - 1].timestamp,
      endIndex: equityCurve.length - 1,
      endBalance: equityCurve[equityCurve.length - 1].balance,
      recovered: false,
      recoveryDate: null,
      recoveryIndex: null
    })
  }

  return drawdowns
}

// ============================================
// UNDERWATER EQUITY CURVE
// ============================================

export function calculateUnderwaterCurve(equityCurve) {
  if (!equityCurve || equityCurve.length === 0) return []

  let peak = equityCurve[0].balance

  return equityCurve.map(point => {
    if (point.balance > peak) {
      peak = point.balance
    }

    const underwaterPercent = peak === 0 ? 0 : ((point.balance - peak) / Math.abs(peak)) * 100

    return {
      timestamp: point.timestamp,
      underwaterPercent: underwaterPercent,
      balance: point.balance,
      peak: peak
    }
  })
}

// ============================================
// WORST DRAWDOWN PERIODS
// ============================================

export function getWorstDrawdowns(drawdowns, limit = 5) {
  if (!drawdowns || drawdowns.length === 0) return []

  return [...drawdowns]
    .sort((a, b) => Math.abs(b.drawdownPercent) - Math.abs(a.drawdownPercent))
    .slice(0, limit)
    .map((dd, index) => {
      const durationDays = dd.recovered
        ? Math.ceil((new Date(dd.recoveryDate) - new Date(dd.startDate)) / (1000 * 60 * 60 * 24))
        : Math.ceil((new Date(dd.endDate) - new Date(dd.startDate)) / (1000 * 60 * 60 * 24))

      const drawdownDays = Math.ceil((new Date(dd.endDate) - new Date(dd.startDate)) / (1000 * 60 * 60 * 24))
      const recoveryDays = dd.recovered
        ? Math.ceil((new Date(dd.recoveryDate) - new Date(dd.endDate)) / (1000 * 60 * 60 * 24))
        : null

      return {
        rank: index + 1,
        startDate: dd.startDate,
        endDate: dd.endDate,
        peakBalance: dd.peakBalance,
        lowestBalance: dd.lowestBalance,
        drawdownAmount: dd.drawdownAmount,
        drawdownPercent: dd.drawdownPercent,
        recovered: dd.recovered,
        recoveryDate: dd.recoveryDate,
        durationDays,
        drawdownDays,
        recoveryDays
      }
    })
}

// ============================================
// DRAWDOWN STATISTICS
// ============================================

export function calculateDrawdownStats(drawdowns) {
  if (!drawdowns || drawdowns.length === 0) {
    return {
      totalDrawdowns: 0,
      averageDrawdown: 0,
      maxDrawdown: 0,
      averageRecoveryTime: 0,
      longestDrawdown: 0,
      currentDrawdown: null
    }
  }

  const recoveredDrawdowns = drawdowns.filter(dd => dd.recovered)
  const currentDrawdown = drawdowns.find(dd => !dd.recovered)

  const avgDrawdown = drawdowns.reduce((sum, dd) => sum + Math.abs(dd.drawdownPercent), 0) / drawdowns.length
  const maxDrawdown = Math.max(...drawdowns.map(dd => Math.abs(dd.drawdownPercent)))

  const avgRecoveryTime = recoveredDrawdowns.length > 0
    ? recoveredDrawdowns.reduce((sum, dd) => {
        const recoveryDays = Math.ceil((new Date(dd.recoveryDate) - new Date(dd.endDate)) / (1000 * 60 * 60 * 24))
        return sum + recoveryDays
      }, 0) / recoveredDrawdowns.length
    : 0

  const longestDrawdown = Math.max(...drawdowns.map(dd => {
    const endDate = dd.recovered ? dd.recoveryDate : dd.endDate
    return Math.ceil((new Date(endDate) - new Date(dd.startDate)) / (1000 * 60 * 60 * 24))
  }))

  return {
    totalDrawdowns: drawdowns.length,
    averageDrawdown: avgDrawdown,
    maxDrawdown: maxDrawdown,
    averageRecoveryTime: avgRecoveryTime,
    longestDrawdown: longestDrawdown,
    currentDrawdown: currentDrawdown ? {
      drawdownPercent: currentDrawdown.drawdownPercent,
      drawdownAmount: currentDrawdown.drawdownAmount,
      durationDays: Math.ceil((new Date(currentDrawdown.endDate) - new Date(currentDrawdown.startDate)) / (1000 * 60 * 60 * 24))
    } : null
  }
}

// ============================================
// DRAWDOWN PATTERN DETECTION
// ============================================

export function detectDrawdownPatterns(drawdowns, trades) {
  if (!drawdowns || drawdowns.length === 0) return []

  const patterns = []

  // Pattern 1: Slow recovery (recovery time > 2x drawdown time)
  const slowRecoveries = drawdowns.filter(dd => {
    if (!dd.recovered) return false
    const drawdownDays = Math.ceil((new Date(dd.endDate) - new Date(dd.startDate)) / (1000 * 60 * 60 * 24))
    const recoveryDays = Math.ceil((new Date(dd.recoveryDate) - new Date(dd.endDate)) / (1000 * 60 * 60 * 24))
    return recoveryDays > drawdownDays * 2
  })

  if (slowRecoveries.length > 0) {
    patterns.push({
      type: 'slow_recovery',
      severity: 'medium',
      title: 'Slow Recovery Pattern',
      message: `${slowRecoveries.length} drawdown(s) took more than 2x longer to recover than the drawdown period itself.`,
      recommendation: 'Consider reducing position sizes after losses to avoid deep holes that are hard to climb out of.'
    })
  }

  // Pattern 2: Frequent small drawdowns
  const smallDrawdowns = drawdowns.filter(dd => Math.abs(dd.drawdownPercent) < 10)
  if (smallDrawdowns.length > drawdowns.length * 0.7) {
    patterns.push({
      type: 'frequent_small',
      severity: 'low',
      title: 'Death by a Thousand Cuts',
      message: `${Math.round((smallDrawdowns.length / drawdowns.length) * 100)}% of your drawdowns are small (<10%), but frequent.`,
      recommendation: 'Many small losses add up. Review your stop-loss strategy and avoid overtrading.'
    })
  }

  // Pattern 3: Large drawdowns (>20%)
  const largeDrawdowns = drawdowns.filter(dd => Math.abs(dd.drawdownPercent) > 20)
  if (largeDrawdowns.length > 0) {
    patterns.push({
      type: 'large_drawdowns',
      severity: 'high',
      title: 'Severe Drawdown Alert',
      message: `You have ${largeDrawdowns.length} drawdown(s) exceeding 20% of your capital.`,
      recommendation: 'Critical: Review risk management. A 50% drawdown requires a 100% gain to recover. Consider position sizing rules.'
    })
  }

  // Pattern 4: Unrecovered drawdown
  const currentDD = drawdowns.find(dd => !dd.recovered)
  if (currentDD && Math.abs(currentDD.drawdownPercent) > 15) {
    patterns.push({
      type: 'current_drawdown',
      severity: 'high',
      title: 'Currently in Drawdown',
      message: `You are currently ${Math.abs(currentDD.drawdownPercent).toFixed(1)}% below your peak balance.`,
      recommendation: 'Focus on capital preservation. Consider reducing position sizes until you recover to break-even.'
    })
  }

  return patterns
}

// ============================================
// MAIN ANALYSIS FUNCTION
// ============================================

export function analyzeDrawdowns(trades) {
  if (!trades || trades.length === 0) {
    return {
      equityCurve: [],
      underwaterCurve: [],
      drawdowns: [],
      worstDrawdowns: [],
      stats: null,
      patterns: []
    }
  }

  const equityCurve = calculateEquityCurve(trades)
  const drawdowns = calculateDrawdowns(equityCurve)
  const underwaterCurve = calculateUnderwaterCurve(equityCurve)
  const worstDrawdowns = getWorstDrawdowns(drawdowns, 5)
  const stats = calculateDrawdownStats(drawdowns)
  const patterns = detectDrawdownPatterns(drawdowns, trades)

  return {
    equityCurve,
    underwaterCurve,
    drawdowns,
    worstDrawdowns,
    stats,
    patterns
  }
}

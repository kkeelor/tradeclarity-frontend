// app/analyze/utils/timeBasedAnalysis.js

/**
 * Time-Based Performance Analysis
 * Analyze trading performance by hour, day of week, and month
 */

// ============================================
// HOUR OF DAY ANALYSIS
// ============================================

export function analyzeByHour(trades) {
  if (!trades || trades.length === 0) return []

  const hourBuckets = Array(24).fill(null).map((_, hour) => ({
    hour,
    trades: 0,
    wins: 0,
    losses: 0,
    totalPnL: 0,
    winRate: 0,
    avgPnL: 0
  }))

  trades.forEach(trade => {
    const timestamp = new Date(trade.timestamp || trade.time)
    const hour = timestamp.getHours()

    hourBuckets[hour].trades++
    hourBuckets[hour].totalPnL += trade.realizedPnl || 0

    if ((trade.realizedPnl || 0) > 0) {
      hourBuckets[hour].wins++
    } else if ((trade.realizedPnl || 0) < 0) {
      hourBuckets[hour].losses++
    }
  })

  return hourBuckets.map(bucket => ({
    ...bucket,
    winRate: bucket.trades > 0 ? (bucket.wins / bucket.trades) * 100 : 0,
    avgPnL: bucket.trades > 0 ? bucket.totalPnL / bucket.trades : 0,
    label: `${bucket.hour.toString().padStart(2, '0')}:00`
  }))
}

// ============================================
// DAY OF WEEK ANALYSIS
// ============================================

export function analyzeByDayOfWeek(trades) {
  if (!trades || trades.length === 0) return []

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  const dayBuckets = Array(7).fill(null).map((_, day) => ({
    day,
    dayName: dayNames[day],
    trades: 0,
    wins: 0,
    losses: 0,
    totalPnL: 0,
    winRate: 0,
    avgPnL: 0
  }))

  trades.forEach(trade => {
    const timestamp = new Date(trade.timestamp || trade.time)
    const day = timestamp.getDay()

    dayBuckets[day].trades++
    dayBuckets[day].totalPnL += trade.realizedPnl || 0

    if ((trade.realizedPnl || 0) > 0) {
      dayBuckets[day].wins++
    } else if ((trade.realizedPnl || 0) < 0) {
      dayBuckets[day].losses++
    }
  })

  return dayBuckets.map(bucket => {
    const completedTrades = bucket.wins + bucket.losses
    return {
      ...bucket,
      winRate: completedTrades > 0 ? (bucket.wins / completedTrades) * 100 : 0,
      avgPnL: bucket.trades > 0 ? bucket.totalPnL / bucket.trades : 0
    }
  })
}

// ============================================
// MONTHLY ANALYSIS
// ============================================

export function analyzeByMonth(trades) {
  if (!trades || trades.length === 0) return []

  const monthBuckets = {}

  trades.forEach(trade => {
    const timestamp = new Date(trade.timestamp || trade.time)
    const monthKey = `${timestamp.getFullYear()}-${(timestamp.getMonth() + 1).toString().padStart(2, '0')}`

    if (!monthBuckets[monthKey]) {
      monthBuckets[monthKey] = {
        month: monthKey,
        year: timestamp.getFullYear(),
        monthNum: timestamp.getMonth() + 1,
        trades: 0,
        wins: 0,
        losses: 0,
        totalPnL: 0,
        winRate: 0,
        avgPnL: 0
      }
    }

    monthBuckets[monthKey].trades++
    monthBuckets[monthKey].totalPnL += trade.realizedPnl || 0

    if ((trade.realizedPnl || 0) > 0) {
      monthBuckets[monthKey].wins++
    } else if ((trade.realizedPnl || 0) < 0) {
      monthBuckets[monthKey].losses++
    }
  })

  return Object.values(monthBuckets)
    .map(bucket => {
      const completedTrades = bucket.wins + bucket.losses
      return {
        ...bucket,
        winRate: completedTrades > 0 ? (bucket.wins / completedTrades) * 100 : 0,
        avgPnL: bucket.trades > 0 ? bucket.totalPnL / bucket.trades : 0,
        monthName: new Date(bucket.year, bucket.monthNum - 1).toLocaleString('default', { month: 'short' })
      }
    })
    .sort((a, b) => a.month.localeCompare(b.month))
}

// ============================================
// TIME-BASED INSIGHTS
// ============================================

export function generateTimeInsights(hourData, dayData, monthData) {
  const insights = []

  // Best/Worst Hour
  if (hourData && hourData.length > 0) {
    const hoursWithTrades = hourData.filter(h => h.trades > 0)
    if (hoursWithTrades.length > 0) {
      const bestHour = hoursWithTrades.reduce((best, h) =>
        h.totalPnL > best.totalPnL ? h : best
      )
      const worstHour = hoursWithTrades.reduce((worst, h) =>
        h.totalPnL < worst.totalPnL ? h : worst
      )

      if (bestHour.totalPnL > 0) {
        insights.push({
          type: 'best_hour',
          category: 'time',
          title: `Best Trading Hour: ${bestHour.label}`,
          message: `You make an average of $${bestHour.avgPnL.toFixed(2)} per trade at ${bestHour.label}`,
          value: bestHour.totalPnL,
          icon: '⏰'
        })
      }

      if (worstHour.totalPnL < 0 && Math.abs(worstHour.totalPnL) > 10) {
        insights.push({
          type: 'worst_hour',
          category: 'time',
          severity: 'medium',
          title: `Avoid Trading at ${worstHour.label}`,
          message: `You lose an average of $${Math.abs(worstHour.avgPnL).toFixed(2)} per trade at this hour`,
          value: worstHour.totalPnL,
          icon: '⏰'
        })
      }
    }
  }

  // Best/Worst Day
  if (dayData && dayData.length > 0) {
    const daysWithTrades = dayData.filter(d => d.trades > 0)
    if (daysWithTrades.length > 0) {
      const bestDay = daysWithTrades.reduce((best, d) =>
        d.totalPnL > best.totalPnL ? d : best
      )
      const worstDay = daysWithTrades.reduce((worst, d) =>
        d.totalPnL < worst.totalPnL ? d : worst
      )

      if (bestDay.totalPnL > 0) {
        insights.push({
          type: 'best_day',
          category: 'time',
          title: `${bestDay.dayName}s are your best day`,
          message: `Win rate: ${bestDay.winRate.toFixed(1)}% with $${bestDay.totalPnL.toFixed(2)} total P&L`,
          value: bestDay.totalPnL,
          icon: '📅'
        })
      }

      if (worstDay.totalPnL < 0) {
        insights.push({
          type: 'worst_day',
          category: 'time',
          severity: 'medium',
          title: `Consider avoiding ${worstDay.dayName}s`,
          message: `Win rate: ${worstDay.winRate.toFixed(1)}% with $${worstDay.totalPnL.toFixed(2)} total P&L`,
          value: worstDay.totalPnL,
          icon: '📅'
        })
      }
    }
  }

  // Monthly Consistency
  if (monthData && monthData.length > 3) {
    const profitableMonths = monthData.filter(m => m.totalPnL > 0).length
    const consistency = (profitableMonths / monthData.length) * 100

    if (consistency >= 70) {
      insights.push({
        type: 'monthly_consistency',
        category: 'time',
        title: 'Highly Consistent Performance',
        message: `${profitableMonths} out of ${monthData.length} months profitable (${consistency.toFixed(0)}%)`,
        value: consistency,
        icon: '📊'
      })
    } else if (consistency < 50) {
      insights.push({
        type: 'monthly_consistency',
        category: 'time',
        severity: 'high',
        title: 'Inconsistent Monthly Performance',
        message: `Only ${profitableMonths} out of ${monthData.length} months profitable (${consistency.toFixed(0)}%)`,
        value: consistency,
        icon: '📊'
      })
    }
  }

  return insights
}

// ============================================
// BEST/WORST TIMES SUMMARY
// ============================================

export function getBestWorstTimes(hourData, dayData) {
  const summary = {
    bestHours: [],
    worstHours: [],
    bestDays: [],
    worstDays: []
  }

  if (hourData && hourData.length > 0) {
    const hoursWithTrades = hourData.filter(h => h.trades >= 3) // Minimum 3 trades for significance
    summary.bestHours = [...hoursWithTrades]
      .sort((a, b) => b.avgPnL - a.avgPnL)
      .slice(0, 3)

    summary.worstHours = [...hoursWithTrades]
      .sort((a, b) => a.avgPnL - b.avgPnL)
      .slice(0, 3)
  }

  if (dayData && dayData.length > 0) {
    const daysWithTrades = dayData.filter(d => d.trades >= 5) // Minimum 5 trades for significance
    summary.bestDays = [...daysWithTrades]
      .sort((a, b) => b.avgPnL - a.avgPnL)
      .slice(0, 3)

    summary.worstDays = [...daysWithTrades]
      .sort((a, b) => a.avgPnL - b.avgPnL)
      .slice(0, 3)
  }

  return summary
}

// ============================================
// MAIN ANALYSIS FUNCTION
// ============================================

export function analyzeTimeBasedPerformance(trades) {
  if (!trades || trades.length === 0) {
    return {
      hourly: [],
      daily: [],
      monthly: [],
      insights: [],
      bestWorstTimes: null
    }
  }

  const hourly = analyzeByHour(trades)
  const daily = analyzeByDayOfWeek(trades)
  const monthly = analyzeByMonth(trades)
  const insights = generateTimeInsights(hourly, daily, monthly)
  const bestWorstTimes = getBestWorstTimes(hourly, daily)

  return {
    hourly,
    daily,
    monthly,
    insights,
    bestWorstTimes
  }
}

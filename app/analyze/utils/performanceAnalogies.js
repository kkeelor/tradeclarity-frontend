// app/analyze/utils/performanceAnalogies.js

/**
 * Performance Analogies - Make trading metrics relatable and understandable
 * Converts abstract numbers into real-world comparisons people can grasp
 */

// ============================================
// HOURLY RATE CALCULATIONS
// ============================================

export function calculateHourlyRate(totalPnL, tradingPeriodDays) {
  if (!tradingPeriodDays || tradingPeriodDays === 0) return null

  // Assume active trading ~2 hours per day (conservative estimate)
  const hoursPerDay = 2
  const totalHours = tradingPeriodDays * hoursPerDay

  return {
    rate: totalPnL / totalHours,
    totalHours,
    daysActive: tradingPeriodDays
  }
}

// ============================================
// REAL-WORLD MONEY COMPARISONS
// ============================================

const PRICE_REFERENCES = [
  { name: 'coffee at Starbucks', price: 5, icon: '☕' },
  { name: 'month of Netflix', price: 15, icon: '📺' },
  { name: 'pizza delivery', price: 25, icon: '🍕' },
  { name: 'tank of gas', price: 50, icon: '⛽' },
  { name: 'nice dinner', price: 75, icon: '🍽️' },
  { name: 'pair of sneakers', price: 100, icon: '👟' },
  { name: 'AirPods', price: 150, icon: '🎧' },
  { name: 'monthly gym membership', price: 50, icon: '💪' },
  { name: 'concert ticket', price: 80, icon: '🎵' },
  { name: 'video game', price: 60, icon: '🎮' }
]

export function getMoneyComparison(amount) {
  const absAmount = Math.abs(amount)

  // Find best fit comparison
  const sorted = PRICE_REFERENCES.slice().sort((a, b) => {
    const diffA = Math.abs(absAmount - a.price)
    const diffB = Math.abs(absAmount - b.price)
    return diffA - diffB
  })

  const bestMatch = sorted[0]
  const quantity = Math.round(absAmount / bestMatch.price)

  if (quantity === 0) {
    return {
      comparison: `Less than ${bestMatch.icon} ${bestMatch.name}`,
      quantity: 0,
      item: bestMatch
    }
  }

  return {
    comparison: quantity === 1
      ? `${bestMatch.icon} ${bestMatch.name}`
      : `${quantity}x ${bestMatch.icon} ${bestMatch.name}`,
    quantity,
    item: bestMatch
  }
}

// ============================================
// TIME ANALOGIES
// ============================================

const TIME_ACTIVITIES = [
  { name: 'TikTok session', minutes: 15 },
  { name: 'coffee break', minutes: 15 },
  { name: 'lunch break', minutes: 30 },
  { name: 'gym workout', minutes: 60 },
  { name: 'episode of a TV show', minutes: 45 },
  { name: 'movie', minutes: 120 },
  { name: 'Netflix binge (3 episodes)', minutes: 135 },
  { name: 'road trip', minutes: 180 }
]

export function getTimeAnalogy(profitPerHour, hourlyRate) {
  // Calculate how long it would take to earn this at minimum wage vs trading
  const minWage = 15 // $15/hr rough average

  if (!hourlyRate || hourlyRate === 0) return null

  const amount = Math.abs(profitPerHour)
  const tradingMinutes = 60 // 1 hour of trading
  const minWageMinutes = (amount / minWage) * 60

  // Find activity that matches the time difference
  const timeSaved = minWageMinutes - tradingMinutes

  if (timeSaved < 0) {
    return {
      message: `In 1 hour of trading, you earned what would take ${minWageMinutes.toFixed(0)} minutes at minimum wage`,
      comparison: null
    }
  }

  const activity = TIME_ACTIVITIES.find(a => Math.abs(a.minutes - timeSaved) < 30)
    || TIME_ACTIVITIES[0]

  return {
    message: profitPerHour > 0
      ? `You saved ${timeSaved.toFixed(0)} minutes vs minimum wage - time for ${activity.name}`
      : `Lost the equivalent of ${activity.name}'s worth of time`,
    activity,
    timeSaved
  }
}

// ============================================
// SPORTS/PERFORMANCE COMPARISONS
// ============================================

export function getSportsAnalogy(winRate) {
  if (winRate >= 70) {
    return {
      comparison: `NBA player shooting percentage (elite level)`,
      category: 'basketball',
      emoji: '🏀',
      detail: 'Only the best shooters maintain 70%+ field goal percentage'
    }
  }

  if (winRate >= 60) {
    return {
      comparison: `Professional tennis player first serve percentage`,
      category: 'tennis',
      emoji: '🎾',
      detail: 'Top pros land 60-65% of first serves'
    }
  }

  if (winRate >= 55) {
    return {
      comparison: `NFL quarterback completion rate`,
      category: 'football',
      emoji: '🏈',
      detail: 'Elite QBs complete 55-65% of their passes'
    }
  }

  if (winRate >= 45) {
    return {
      comparison: `Major league baseball batting average (.450)`,
      category: 'baseball',
      emoji: '⚾',
      detail: 'A .300 hitter (30% success) is considered excellent'
    }
  }

  return {
    comparison: `Below average performance - keep practicing!`,
    category: 'general',
    emoji: '📊',
    detail: 'Most successful strategies have 50%+ win rates'
  }
}

// ============================================
// RISK/REWARD ANALOGIES
// ============================================

export function getRiskRewardAnalogy(profitFactor) {
  if (profitFactor >= 3) {
    return {
      comparison: `Like a casino - the house always wins`,
      emoji: '🎰',
      detail: 'You make $3 for every $1 you risk'
    }
  }

  if (profitFactor >= 2) {
    return {
      comparison: `Like investing in index funds - steady and reliable`,
      emoji: '📈',
      detail: 'You make $2 for every $1 you risk'
    }
  }

  if (profitFactor >= 1.5) {
    return {
      comparison: `Like a good poker player - positive expected value`,
      emoji: '🃏',
      detail: 'You make $1.50 for every $1 you risk'
    }
  }

  if (profitFactor >= 1) {
    return {
      comparison: `Breaking even - flip a coin`,
      emoji: '🪙',
      detail: 'You make about $1 for every $1 you risk'
    }
  }

  return {
    comparison: `Like gambling at a casino - house edge against you`,
    emoji: '🎲',
    detail: 'You lose more than you make'
  }
}

// ============================================
// CRITICAL INSIGHT DETECTOR
// ============================================

export function getMostCriticalInsight(analytics, psychology) {
  const insights = []

  // High-impact negative insights (weaknesses)
  if (psychology?.weaknesses) {
    psychology.weaknesses.forEach(weakness => {
      if (weakness.severity === 'high' || weakness.impact >= 3) {
        insights.push({
          type: 'weakness',
          title: weakness.title || 'Trading Weakness Detected',
          message: weakness.message,
          impact: weakness.impact || 3,
          actionable: weakness.actionable || true
        })
      }
    })
  }

  // Win rate insights
  if (analytics.winRate < 45) {
    insights.push({
      type: 'weakness',
      title: 'Low Win Rate Alert',
      message: `Your ${analytics.winRate.toFixed(1)}% win rate is below optimal. Focus on entry timing and risk management.`,
      impact: 3,
      actionable: true
    })
  } else if (analytics.winRate >= 60) {
    insights.push({
      type: 'strength',
      title: 'Excellent Win Rate',
      message: `${analytics.winRate.toFixed(1)}% win rate - You are outperforming most traders!`,
      impact: 2,
      actionable: false
    })
  }

  // Profit Factor insights
  if (analytics.profitFactor < 1) {
    insights.push({
      type: 'weakness',
      title: 'Negative Profit Factor',
      message: `You are losing more than you make. Review your strategy immediately.`,
      impact: 4,
      actionable: true
    })
  } else if (analytics.profitFactor >= 2) {
    insights.push({
      type: 'strength',
      title: 'Strong Profit Factor',
      message: `${analytics.profitFactor.toFixed(2)}x profit factor - Your strategy is working!`,
      impact: 2,
      actionable: false
    })
  }

  // Loss management
  if (analytics.avgLoss && analytics.avgWin) {
    const lossToWinRatio = Math.abs(analytics.avgLoss) / analytics.avgWin
    if (lossToWinRatio > 2) {
      insights.push({
        type: 'weakness',
        title: 'Cut Losses Faster',
        message: 'Your average loss is 2x your average win. You need tighter stop losses.',
        impact: 3,
        actionable: true
      })
    }
  }

  // Sort by impact (highest first), then by type (weaknesses first)
  const sorted = insights.sort((a, b) => {
    if (b.impact !== a.impact) return b.impact - a.impact
    return a.type === 'weakness' ? -1 : 1
  })

  return sorted[0] || null
}

// ============================================
// MAIN ANALOGY GENERATOR
// ============================================

export function generatePerformanceAnalogies(analytics) {
  const analogies = {}

  // Hourly rate
  if (analytics.totalPnL && analytics.metadata?.tradingPeriodDays) {
    const hourlyData = calculateHourlyRate(
      analytics.totalPnL,
      analytics.metadata.tradingPeriodDays
    )

    if (hourlyData) {
      analogies.hourlyRate = {
        value: hourlyData.rate,
        formatted: `$${Math.abs(hourlyData.rate).toFixed(2)}/hr`,
        message: hourlyData.rate > 0
          ? `You're earning $${hourlyData.rate.toFixed(2)}/hour while trading`
          : `You're losing $${Math.abs(hourlyData.rate).toFixed(2)}/hour while trading`,
        totalHours: hourlyData.totalHours,
        comparison: hourlyData.rate > 15 ? 'Above minimum wage 💪' : 'Below minimum wage 📉'
      }

      // Time analogy
      const timeAnalogy = getTimeAnalogy(hourlyData.rate, hourlyData.rate)
      if (timeAnalogy) {
        analogies.timeAnalogy = timeAnalogy
      }
    }
  }

  // Money comparison
  if (analytics.totalPnL) {
    analogies.moneyComparison = getMoneyComparison(analytics.totalPnL)
  }

  // Sports comparison
  if (analytics.winRate) {
    analogies.sportsComparison = getSportsAnalogy(analytics.winRate)
  }

  // Risk/reward comparison
  if (analytics.profitFactor) {
    analogies.riskRewardComparison = getRiskRewardAnalogy(analytics.profitFactor)
  }

  return analogies
}

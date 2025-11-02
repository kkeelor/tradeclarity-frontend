// app/analyze/utils/insights/benchmarks.js
// Platform benchmarks for comparison

export const PLATFORM_BENCHMARKS = {
  winRate: {
    bottom25: 35,
    median: 48,
    top25: 62,
    top10: 70
  },
  profitFactor: {
    bottom25: 0.8,
    median: 1.2,
    top25: 1.8,
    top10: 2.5
  },
  avgLoss: {
    bottom25: -85,
    median: -45,
    top25: -32,
    top10: -25
  },
  avgWin: {
    bottom25: 25,
    median: 45,
    top25: 75,
    top10: 120
  },
  commissionEfficiency: {
    bottom25: 0.15, // 15% of P&L
    median: 0.08,   // 8% of P&L
    top25: 0.04,    // 4% of P&L
    top10: 0.02     // 2% of P&L
  }
}

/**
 * Get benchmark message for a metric
 */
export function getBenchmarkMessage(userMetric, metricName) {
  const benchmarks = PLATFORM_BENCHMARKS[metricName]
  if (!benchmarks) return null

  if (userMetric >= benchmarks.top10) {
    return {
      level: 'top10',
      message: `🏆 Top 10% (${userMetric.toFixed(1)} vs ${benchmarks.median} avg)`,
      percentile: 'top 10%',
      color: 'emerald'
    }
  } else if (userMetric >= benchmarks.top25) {
    return {
      level: 'top25',
      message: `📈 Above Average (${userMetric.toFixed(1)} vs ${benchmarks.median} avg)`,
      percentile: 'top 25%',
      color: 'emerald'
    }
  } else if (userMetric >= benchmarks.median) {
    return {
      level: 'median',
      message: `📊 Average (${userMetric.toFixed(1)} vs ${benchmarks.median} avg)`,
      percentile: '50th percentile',
      color: 'slate'
    }
  } else if (userMetric >= benchmarks.bottom25) {
    return {
      level: 'belowMedian',
      message: `📉 Below Average (${userMetric.toFixed(1)} vs ${benchmarks.median} avg)`,
      percentile: 'bottom 50%',
      color: 'amber'
    }
  } else {
    const gap = benchmarks.top25 - userMetric
    return {
      level: 'bottom25',
      message: `⚠️ Bottom 25% (${userMetric.toFixed(1)} vs ${benchmarks.median} avg)`,
      percentile: 'bottom 25%',
      color: 'red',
      gap: gap.toFixed(1)
    }
  }
}

/**
 * Calculate percentile rank for a metric
 */
export function calculatePercentile(userMetric, metricName) {
  const benchmarks = PLATFORM_BENCHMARKS[metricName]
  if (!benchmarks) return null

  if (userMetric >= benchmarks.top10) return 95
  if (userMetric >= benchmarks.top25) return 75
  if (userMetric >= benchmarks.median) return 50
  if (userMetric >= benchmarks.bottom25) return 25
  return 10
}

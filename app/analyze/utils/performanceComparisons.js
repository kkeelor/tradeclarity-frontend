// app/analyze/utils/performanceComparisons.js
// Utility to calculate buy-and-hold performance comparisons
// Compares user's actual trading performance vs various benchmarks

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

/**
 * Calculate buy-and-hold performance for various assets
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @param {number} initialInvestment - Starting capital (optional)
 * @returns {Promise<Object>} Performance data for BTC, ETH, SP500, Treasury
 */
export async function calculateBenchmarkPerformance(startDate, endDate, initialInvestment = 10000) {
  try {
    // Fetch historical prices from backend
    const response = await fetch(`${BACKEND_URL}/api/context/benchmarks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate,
        endDate,
        initialInvestment
      })
    })
    
    const data = await response.json()
    if (data.success) {
      return data.benchmarks
    }
    
    // Fallback: return mock data structure if API fails
    return {
      BTC: { returnPercent: 0, finalValue: initialInvestment, error: 'API unavailable' },
      ETH: { returnPercent: 0, finalValue: initialInvestment, error: 'API unavailable' },
      SP500: { returnPercent: 0, finalValue: initialInvestment, error: 'API unavailable' },
      Treasury10Y: { returnPercent: 0, finalValue: initialInvestment, error: 'API unavailable' }
    }
  } catch (error) {
    console.error('Error calculating benchmarks:', error)
    return null
  }
}

/**
 * Extract user's trading timeline from analytics
 * @param {Object} analytics - Analytics object
 * @returns {Object} Trading timeline data
 */
export function extractTradingTimeline(analytics) {
  if (!analytics) return null

  const trades = []
  
  // Extract all trades from analytics.allTrades (contains both spot and futures)
  if (analytics.allTrades && Array.isArray(analytics.allTrades)) {
    analytics.allTrades.forEach(trade => {
      const timestamp = trade.timestamp || trade.time
      if (!timestamp) return

      // Spot trades
      if (trade.type === 'spot' || trade.accountType === 'spot') {
        trades.push({
          timestamp,
          symbol: trade.symbol,
          type: trade.isBuyer ? 'buy' : 'sell',
          price: parseFloat(trade.price || 0),
          quantity: parseFloat(trade.qty || 0),
          value: parseFloat(trade.quoteQty || trade.price * trade.qty || 0),
          pnl: trade.realizedPnL || null,
          accountType: 'spot',
          exchange: trade.exchange
        })
      }
      
      // Futures trades (from income records with REALIZED_PNL)
      if ((trade.type === 'futures' || trade.accountType === 'futures' || trade.incomeType === 'REALIZED_PNL') && trade.income) {
        const pnl = parseFloat(trade.income || 0)
        trades.push({
          timestamp,
          symbol: trade.symbol,
          type: pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'neutral',
          price: null,
          quantity: null,
          value: null,
          pnl,
          accountType: 'futures',
          exchange: trade.exchange
        })
      }
    })
  }

  // Also check for separate spotTrades array if allTrades doesn't exist
  if ((!analytics.allTrades || analytics.allTrades.length === 0) && analytics.spotTrades && Array.isArray(analytics.spotTrades)) {
    analytics.spotTrades.forEach(trade => {
      const timestamp = trade.time || trade.timestamp
      if (!timestamp) return
      
      trades.push({
        timestamp,
        symbol: trade.symbol,
        type: trade.isBuyer ? 'buy' : 'sell',
        price: parseFloat(trade.price || 0),
        quantity: parseFloat(trade.qty || 0),
        value: parseFloat(trade.quoteQty || trade.price * trade.qty || 0),
        pnl: null,
        accountType: 'spot'
      })
    })
  }

  // Sort by timestamp
  trades.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

  return {
    trades,
    startDate: analytics.metadata?.oldestTrade,
    endDate: analytics.metadata?.newestTrade,
    totalPnL: analytics.totalPnL || 0,
    totalTrades: analytics.totalTrades || trades.length,
    symbols: analytics.symbols || {}
  }
}

/**
 * Calculate user's performance metrics
 * @param {Object} analytics - Analytics object
 * @param {number} initialInvestment - Starting capital estimate
 * @returns {Object} Performance metrics
 */
export function calculateUserPerformance(analytics, initialInvestment = 10000) {
  if (!analytics) return null

  const totalPnL = analytics.totalPnL || 0
  const finalValue = initialInvestment + totalPnL
  const returnPercent = initialInvestment > 0 ? (totalPnL / initialInvestment) * 100 : 0

  return {
    initialInvestment,
    totalPnL,
    finalValue,
    returnPercent,
    totalTrades: analytics.totalTrades || 0,
    winRate: analytics.winRate || 0,
    profitFactor: analytics.profitFactor || 0
  }
}

/**
 * Compare user performance vs benchmarks
 * @param {Object} userPerformance - User performance metrics
 * @param {Object} benchmarks - Benchmark performance data
 * @returns {Array} Comparison results
 */
export function comparePerformance(userPerformance, benchmarks) {
  if (!userPerformance || !benchmarks) return []

  const comparisons = []

  Object.entries(benchmarks).forEach(([asset, benchmark]) => {
    if (benchmark.error) return

    const userReturn = userPerformance.returnPercent
    const benchmarkReturn = benchmark.returnPercent || 0
    const difference = userReturn - benchmarkReturn
    const outperformed = difference > 0

    comparisons.push({
      asset,
      assetName: getAssetName(asset),
      userReturn,
      benchmarkReturn,
      difference,
      outperformed,
      userValue: userPerformance.finalValue,
      benchmarkValue: benchmark.finalValue,
      message: generateComparisonMessage(asset, difference, outperformed)
    })
  })

  return comparisons.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
}

function getAssetName(asset) {
  const names = {
    BTC: 'Bitcoin',
    ETH: 'Ethereum',
    SP500: 'S&P 500 Index',
    Treasury10Y: '10-Year Treasury'
  }
  return names[asset] || asset
}

function generateComparisonMessage(asset, difference, outperformed) {
  const absDiff = Math.abs(difference)
  if (absDiff < 1) {
    return `Performed similarly to ${getAssetName(asset)}`
  }
  
  if (outperformed) {
    return `Outperformed ${getAssetName(asset)} by ${absDiff.toFixed(1)}%`
  } else {
    return `Underperformed ${getAssetName(asset)} by ${absDiff.toFixed(1)}%`
  }
}

/**
 * Helper to normalize date for comparison (handles different date formats)
 */
function normalizeDate(dateStr) {
  if (!dateStr) return null
  try {
    const date = new Date(dateStr)
    return date.toISOString().split('T')[0]
  } catch {
    return null
  }
}

/**
 * Find matching date in data array (handles format differences)
 */
function findMatchingDate(dataArray, targetDate) {
  const normalizedTarget = normalizeDate(targetDate)
  if (!normalizedTarget) return null
  
  // Try exact match first
  let match = dataArray.find(item => {
    const itemDate = normalizeDate(item.date)
    return itemDate === normalizedTarget
  })
  
  // If no exact match, try within 1 day
  if (!match) {
    const targetTime = new Date(normalizedTarget).getTime()
    const oneDayMs = 24 * 60 * 60 * 1000
    match = dataArray.find(item => {
      const itemDate = normalizeDate(item.date)
      if (!itemDate) return false
      const itemTime = new Date(itemDate).getTime()
      return Math.abs(itemTime - targetTime) < oneDayMs
    })
  }
  
  return match
}

/**
 * Find correlation between market events and trading performance
 * @param {Array} trades - User trades with timestamps
 * @param {Object} marketData - Market context data (VIX, Fed rates, GDELT, etc.)
 * @returns {Array} Correlation insights
 */
export function findMarketCorrelations(trades, marketData) {
  if (!trades || !marketData) return []

  const insights = []
  
  // Group trades by date
  const tradesByDate = {}
  trades.forEach(trade => {
    const date = normalizeDate(trade.timestamp)
    if (!date) return
    
    if (!tradesByDate[date]) {
      tradesByDate[date] = { trades: [], totalPnL: 0, buyCount: 0, sellCount: 0 }
    }
    tradesByDate[date].trades.push(trade)
    if (trade.pnl) {
      tradesByDate[date].totalPnL += trade.pnl
    }
    if (trade.type === 'buy' || trade.type === 'win') {
      tradesByDate[date].buyCount++
    } else if (trade.type === 'sell' || trade.type === 'loss') {
      tradesByDate[date].sellCount++
    }
  })

  // Check VIX correlations (FRED)
  if (marketData.fredData?.VIXCLS?.observations) {
    const vixData = marketData.fredData.VIXCLS.observations
    
    // High volatility periods (VIX > 25)
    const highVixPeriods = vixData.filter(obs => obs.value > 25)
    highVixPeriods.forEach(vix => {
      const vixDate = normalizeDate(vix.date)
      if (vixDate && tradesByDate[vixDate]) {
        const dayData = tradesByDate[vixDate]
        if (dayData.totalPnL < -50) {
          insights.push({
            type: 'correlation',
            severity: 'high',
            title: 'High VIX Correlation',
            message: `On ${vixDate}, VIX spiked to ${vix.value.toFixed(1)} and you lost $${Math.abs(dayData.totalPnL).toFixed(2)}`,
            date: vixDate,
            metric: 'VIX',
            value: vix.value,
            trades: dayData.trades.length,
            pnl: dayData.totalPnL
          })
        }
      }
    })
    
    // Low volatility periods (VIX < 15) with good performance
    const lowVixPeriods = vixData.filter(obs => obs.value < 15)
    lowVixPeriods.forEach(vix => {
      const vixDate = normalizeDate(vix.date)
      if (vixDate && tradesByDate[vixDate]) {
        const dayData = tradesByDate[vixDate]
        if (dayData.totalPnL > 100) {
          insights.push({
            type: 'correlation',
            severity: 'low',
            title: 'Low VIX Performance',
            message: `On ${vixDate}, low VIX (${vix.value.toFixed(1)}) coincided with $${dayData.totalPnL.toFixed(2)} profit`,
            date: vixDate,
            metric: 'VIX',
            value: vix.value,
            trades: dayData.trades.length,
            pnl: dayData.totalPnL
          })
        }
      }
    })
  }

  // Check Fed Rate changes (FRED)
  if (marketData.fredData?.DFF?.observations) {
    const fedData = marketData.fredData.DFF.observations
    for (let i = 1; i < fedData.length; i++) {
      const prev = fedData[i]
      const curr = fedData[i - 1]
      const rateChange = curr.value - prev.value
      
      // Significant rate change (> 0.25%)
      if (Math.abs(rateChange) > 0.25) {
        const fedDate = normalizeDate(curr.date)
        if (fedDate && tradesByDate[fedDate]) {
          const dayData = tradesByDate[fedDate]
          insights.push({
            type: 'correlation',
            severity: rateChange > 0 ? 'medium' : 'medium',
            title: 'Fed Rate Change',
            message: `On ${fedDate}, Fed rate ${rateChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(rateChange).toFixed(2)}% to ${curr.value.toFixed(2)}%`,
            date: fedDate,
            metric: 'Fed Rate',
            value: curr.value,
            change: rateChange,
            trades: dayData.trades.length,
            pnl: dayData.totalPnL
          })
        }
      }
    }
  }

  // Check GDELT News Sentiment correlations
  if (marketData.gdeltData?.tone) {
    const toneData = marketData.gdeltData.tone
    
    // Very negative sentiment periods (tone < -3)
    const negativeSentiment = toneData.filter(obs => obs.value < -3)
    negativeSentiment.forEach(sentiment => {
      const sentimentDate = normalizeDate(sentiment.date)
      if (sentimentDate && tradesByDate[sentimentDate]) {
        const dayData = tradesByDate[sentimentDate]
        if (dayData.totalPnL < -50) {
          insights.push({
            type: 'correlation',
            severity: 'medium',
            title: 'Negative News Sentiment',
            message: `On ${sentimentDate}, Bitcoin news sentiment was very negative (${sentiment.value.toFixed(2)}) and you lost $${Math.abs(dayData.totalPnL).toFixed(2)}`,
            date: sentimentDate,
            metric: 'GDELT Tone',
            value: sentiment.value,
            trades: dayData.trades.length,
            pnl: dayData.totalPnL
          })
        }
      }
    })
    
    // Very positive sentiment periods (tone > 3)
    const positiveSentiment = toneData.filter(obs => obs.value > 3)
    positiveSentiment.forEach(sentiment => {
      const sentimentDate = normalizeDate(sentiment.date)
      if (sentimentDate && tradesByDate[sentimentDate]) {
        const dayData = tradesByDate[sentimentDate]
        if (dayData.totalPnL > 100) {
          insights.push({
            type: 'correlation',
            severity: 'low',
            title: 'Positive News Sentiment',
            message: `On ${sentimentDate}, Bitcoin news sentiment was very positive (${sentiment.value.toFixed(2)}) and you gained $${dayData.totalPnL.toFixed(2)}`,
            date: sentimentDate,
            metric: 'GDELT Tone',
            value: sentiment.value,
            trades: dayData.trades.length,
            pnl: dayData.totalPnL
          })
        }
      }
    })
  }

  // Check GDELT News Volume correlations
  if (marketData.gdeltData?.volume) {
    const volumeData = marketData.gdeltData.volume
    
    // High news volume periods (top 20%)
    const sortedVolume = [...volumeData].sort((a, b) => b.value - a.value)
    const highVolumeThreshold = sortedVolume[Math.floor(sortedVolume.length * 0.2)]?.value || 0
    
    volumeData.forEach(volume => {
      if (volume.value >= highVolumeThreshold) {
        const volumeDate = normalizeDate(volume.date)
        if (volumeDate && tradesByDate[volumeDate]) {
          const dayData = tradesByDate[volumeDate]
          if (Math.abs(dayData.totalPnL) > 50) {
            insights.push({
              type: 'correlation',
              severity: 'medium',
              title: 'High News Volume',
              message: `On ${volumeDate}, Bitcoin news volume spiked (${volume.value.toFixed(3)}) with ${dayData.totalPnL >= 0 ? 'profit' : 'loss'} of $${Math.abs(dayData.totalPnL).toFixed(2)}`,
              date: volumeDate,
              metric: 'GDELT Volume',
              value: volume.value,
              trades: dayData.trades.length,
              pnl: dayData.totalPnL
            })
          }
        }
      }
    })
  }

  // Sort by severity and date
  const severityOrder = { high: 3, medium: 2, low: 1 }
  insights.sort((a, b) => {
    const severityDiff = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0)
    if (severityDiff !== 0) return severityDiff
    return new Date(b.date) - new Date(a.date)
  })

  return insights.slice(0, 10) // Return top 10 correlations
}

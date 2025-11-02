// app/analyze/utils/insights/moneyCalculations.js
// Calculates concrete dollar amounts for potential savings/opportunities

/**
 * Calculate potential savings from tightening stop losses
 */
export function calculateStopLossSavings(trades, targetStopLossPercent = 0.02) {
  if (!trades || trades.length === 0) return null

  const losers = trades.filter(t => t.pnl && t.pnl < 0)
  if (losers.length === 0) return null

  // Calculate average entry price for losers (estimate from trade data)
  const losersWithEntry = losers.map(trade => {
    // Try to estimate entry value - use realized or qty * price
    const entryValue = trade.realized ? Math.abs(trade.realized / (trade.pnl / Math.abs(trade.pnl || 1))) : 
                         (trade.qty && trade.price ? trade.qty * trade.price : null)
    
    if (!entryValue || entryValue <= 0) return null
    
    const actualLoss = Math.abs(trade.pnl)
    const targetLoss = entryValue * targetStopLossPercent
    
    return {
      actualLoss,
      targetLoss,
      savings: Math.max(0, actualLoss - targetLoss),
      entryValue
    }
  }).filter(t => t !== null)

  if (losersWithEntry.length === 0) return null

  const totalSavings = losersWithEntry.reduce((sum, t) => sum + t.savings, 0)
  const avgCurrentLoss = losersWithEntry.reduce((sum, t) => sum + t.actualLoss, 0) / losersWithEntry.length
  const avgTargetLoss = losersWithEntry.reduce((sum, t) => sum + t.targetLoss, 0) / losersWithEntry.length
  const lossReduction = ((avgCurrentLoss - avgTargetLoss) / avgCurrentLoss) * 100

  return {
    potentialSavings: totalSavings,
    avgCurrentLoss,
    avgTargetLoss,
    lossReduction,
    affectedTrades: losersWithEntry.length,
    message: `Tightening stop losses to ${(targetStopLossPercent * 100).toFixed(0)}% would've saved $${totalSavings.toFixed(0)}`,
    action: `Set ${(targetStopLossPercent * 100).toFixed(0)}% stop loss on every trade`
  }
}

/**
 * Calculate potential savings from using limit orders instead of market orders
 */
export function calculateFeeOptimization(trades) {
  if (!trades || trades.length === 0) return null

  // Identify taker trades (market orders typically)
  // This is an estimate - real implementation would need actual maker/taker flag
  const takerTrades = trades.filter(t => {
    // If we have commission data, higher commissions often indicate taker
    // For now, estimate based on trade characteristics
    return t.commission && t.commission > 0
  })

  if (takerTrades.length === 0) return null

  const totalTakerFees = takerTrades.reduce((sum, t) => sum + (t.commission || 0), 0)
  
  // Estimate: Maker fees are typically 50-70% of taker fees (or even rebates)
  // Conservative estimate: 50% savings
  const potentialSavings = totalTakerFees * 0.5
  
  // Extrapolate to yearly estimate
  const tradingDays = calculateTradingDays(trades)
  const yearlySavings = tradingDays > 0 ? (potentialSavings / tradingDays) * 365 : potentialSavings

  return {
    potentialSavings: yearlySavings,
    currentFees: totalTakerFees,
    affectedTrades: takerTrades.length,
    message: `Using limit orders instead of market orders could save ~$${yearlySavings.toFixed(0)}/year`,
    action: 'Use limit orders (maker) instead of market orders (taker)'
  }
}

/**
 * Calculate potential savings from avoiding worst trading times
 */
export function calculateTimingEdge(trades) {
  if (!trades || trades.length === 0) return null

  // Group trades by hour
  const hourlyGroups = {}
  trades.forEach(trade => {
    const timestamp = trade.timestamp || trade.time
    if (!timestamp) return
    
    const date = new Date(timestamp)
    const hour = date.getHours()
    const dayOfWeek = date.getDay() // 0 = Sunday
    
    if (!hourlyGroups[hour]) {
      hourlyGroups[hour] = []
    }
    hourlyGroups[hour].push({
      ...trade,
      dayOfWeek
    })
  })

  // Calculate P&L per hour
  const hourlyPerf = Object.entries(hourlyGroups)
    .map(([hour, hourTrades]) => {
      const pnl = hourTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
      const count = hourTrades.length
      return {
        hour: parseInt(hour),
        pnl,
        count,
        avgPnL: count > 0 ? pnl / count : 0,
        trades: hourTrades
      }
    })
    .filter(h => h.count >= 2) // Lower threshold: 2+ trades per hour (was 3+)

  if (hourlyPerf.length === 0) return null

  // Sort by performance
  const sortedByPerf = [...hourlyPerf].sort((a, b) => b.avgPnL - a.avgPnL)
  const bestHours = sortedByPerf.slice(0, 3)
  const worstHours = sortedByPerf.slice(-3).reverse()

  // Calculate loss from worst hours
  const worstHoursLoss = worstHours.reduce((sum, h) => sum + h.pnl, 0)
  const worstHoursTrades = worstHours.reduce((sum, h) => sum + h.count, 0)

  // Calculate gain from best hours (for comparison)
  const bestHoursGain = bestHours.reduce((sum, h) => sum + h.pnl, 0)
  const bestHoursWinRate = bestHours.reduce((sum, h) => {
    const wins = h.trades.filter(t => t.pnl > 0).length
    return sum + (wins / h.count)
  }, 0) / bestHours.length

  const overallWinRate = trades.filter(t => t.pnl > 0).length / trades.length

  return {
    potentialSavings: Math.abs(worstHoursLoss),
    worstHours: worstHours.map(h => h.hour),
    bestHours: bestHours.map(h => h.hour),
    worstHoursLoss,
    bestHoursGain,
    bestHoursWinRate: bestHoursWinRate * 100,
    overallWinRate: overallWinRate * 100,
    affectedTrades: worstHoursTrades,
    message: `Avoiding trading between ${worstHours.map(h => h.hour + ':00').join(', ')} would've saved $${Math.abs(worstHoursLoss).toFixed(0)}`,
    action: `Focus trading during ${bestHours.map(h => h.hour + ':00').join(', ')} (${bestHoursWinRate.toFixed(0)}% win rate vs ${(overallWinRate * 100).toFixed(0)}% overall)`
  }
}

/**
 * Check if a symbol is a stablecoin pair (e.g., USDCUSDT, BUSDUSDT)
 */
function isStablecoinPair(symbol) {
  if (!symbol || typeof symbol !== 'string') return false
  
  const symbolUpper = symbol.toUpperCase()
  
  // Common stablecoin pairs - these shouldn't generate significant trading profits
  const stablecoinPairs = [
    'USDCUSDT', 'USDTUSDC',
    'BUSDUSDT', 'USDTBUSD',
    'USDTUSDT', // Edge case
    'USDCUSDC', // Edge case
    'BUSDBUSD', // Edge case
    'DAIUSDT', 'USDTDAI',
    'TUSDUSDT', 'USDTTUSD',
    'USDPUSDT', 'USDTUSDP',
    'FDUSDUSDT', 'USDTFDUSD',
    'USDCBUSD', 'BUSDUSDC',
    'DAIUSDC', 'USDCDAI',
    'PAXUSDT', 'USDTPAX',
    'GUSDUSDT', 'USDTGUSD'
  ]
  
  return stablecoinPairs.includes(symbolUpper)
}

/**
 * Calculate potential savings from focusing on best performing symbols
 * Only suggests if there's statistically significant evidence (multiple trades, consistent performance)
 */
export function calculateSymbolFocusOpportunity(trades, symbolData) {
  if (!trades || !symbolData || Object.keys(symbolData).length === 0) return null

  const symbolEntries = Object.entries(symbolData)
    .filter(([symbol, data]) => {
      // Filter out stablecoin pairs and ensure minimum trade count (increased from 3 to 15)
      // Need sufficient sample size to make meaningful recommendations
      return !isStablecoinPair(symbol) && data.trades >= 15
    })
    .map(([symbol, data]) => ({
      symbol,
      pnl: data.realized || data.netPnL || 0,
      winRate: data.winRate || 0,
      trades: data.trades || 0,
      avgPnL: data.trades > 0 ? (data.realized || data.netPnL || 0) / data.trades : 0
    }))
    .sort((a, b) => b.avgPnL - a.avgPnL)

  // Need at least 2 symbols with sufficient trades AND best symbol must significantly outperform
  if (symbolEntries.length < 2) return null

  const bestSymbol = symbolEntries[0]
  
  // Additional validation: Best symbol must have significantly better performance
  // Check if it's at least 2x better than the average of other qualified symbols
  const otherSymbols = symbolEntries.slice(1)
  const avgOtherPnL = otherSymbols.reduce((sum, s) => sum + s.avgPnL, 0) / otherSymbols.length
  
  // Best symbol must be at least 2x better than average of others
  if (bestSymbol.avgPnL <= avgOtherPnL * 2) return null
  
  // Check that best symbol has consistent positive performance (not just lucky trades)
  // Must have positive avg P&L AND reasonable win rate (at least 50%)
  if (bestSymbol.avgPnL <= 0 || bestSymbol.winRate < 50) return null

  const worstSymbols = symbolEntries.slice(-3)
  
  // Calculate what they'd make if they focused 70% on best symbol instead of spreading evenly
  const totalTrades = symbolEntries.reduce((sum, s) => sum + s.trades, 0)
  const currentAvgPnL = symbolEntries.reduce((sum, s) => sum + s.avgPnL * s.trades, 0) / totalTrades
  
  const focusedTrades = Math.floor(totalTrades * 0.7)
  const focusedPnL = bestSymbol.avgPnL * focusedTrades
  const diversifiedPnL = currentAvgPnL * totalTrades
  
  const opportunity = focusedPnL - diversifiedPnL
  
  // Only return if opportunity is meaningful (at least $100 potential)
  if (opportunity < 100) return null

  return {
    potentialSavings: opportunity,
    bestSymbol: bestSymbol.symbol,
    bestSymbolWinRate: bestSymbol.winRate,
    bestSymbolAvgPnL: bestSymbol.avgPnL,
    worstSymbols: worstSymbols.map(s => s.symbol),
    message: `Focusing 70% on ${bestSymbol.symbol} could increase profits by $${opportunity.toFixed(0)}`,
    action: `Increase ${bestSymbol.symbol} allocation to 70% of trading volume`
  }
}

/**
 * Calculate potential savings from cutting losses faster (time-based)
 */
export function calculateLossCuttingSavings(trades) {
  if (!trades || trades.length === 0) return null

  const winners = trades.filter(t => t.pnl && t.pnl > 0)
  const losers = trades.filter(t => t.pnl && t.pnl < 0)

  if (losers.length === 0 || winners.length === 0) return null

  // Calculate average hold time
  const avgLoserHold = calculateAvgHoldTime(losers)
  const avgWinnerHold = calculateAvgHoldTime(winners)

  if (!avgLoserHold || !avgWinnerHold) return null

  // Calculate how much they'd save if they cut losses at same time as winners
  const holdTimeRatio = avgLoserHold / avgWinnerHold

  if (holdTimeRatio < 1.5) return null // Not a problem if ratio is reasonable

  // Estimate: If they cut losses faster, they'd save on the extended losses
  // Simplified calculation: assume losses grow linearly with time
  const avgLoss = losers.reduce((sum, t) => sum + Math.abs(t.pnl), 0) / losers.length
  const estimatedSavingsPerTrade = avgLoss * (1 - (1 / holdTimeRatio))
  const totalSavings = estimatedSavingsPerTrade * losers.length

  return {
    potentialSavings: totalSavings,
    avgLoserHoldHours: avgLoserHold / (1000 * 60 * 60),
    avgWinnerHoldHours: avgWinnerHold / (1000 * 60 * 60),
    holdTimeRatio,
    affectedTrades: losers.length,
    message: `Cutting losses ${(holdTimeRatio - 1).toFixed(1)}x faster could save $${totalSavings.toFixed(0)}`,
    action: 'Set maximum hold time for losing trades equal to average winning trade hold time'
  }
}

// Helper functions
function calculateAvgHoldTime(trades) {
  if (!trades || trades.length === 0) return null
  
  // Sort trades by time
  const sortedTrades = [...trades]
    .map(t => ({
      ...t,
      time: t.timestamp ? new Date(t.timestamp).getTime() : (t.time || 0)
    }))
    .filter(t => t.time > 0)
    .sort((a, b) => a.time - b.time)

  if (sortedTrades.length < 2) return null

  // For spot trades: calculate time between buy and sell of same symbol
  // For futures: calculate time between open and close
  let totalTime = 0
  let count = 0

  // Group by symbol to find buy-sell pairs
  const symbolGroups = {}
  sortedTrades.forEach(trade => {
    const symbol = trade.symbol || 'UNKNOWN'
    if (!symbolGroups[symbol]) {
      symbolGroups[symbol] = []
    }
    symbolGroups[symbol].push(trade)
  })

  // Calculate hold times for each symbol
  Object.values(symbolGroups).forEach(symbolTrades => {
    // Simple approach: time between first and last trade of same symbol
    // This is an approximation - real calculation would pair buys with sells
    if (symbolTrades.length >= 2) {
      const firstTrade = symbolTrades[0]
      const lastTrade = symbolTrades[symbolTrades.length - 1]
      const holdTime = lastTrade.time - firstTrade.time
      if (holdTime > 0) {
        totalTime += holdTime
        count++
      }
    }
  })

  return count > 0 ? totalTime / count : null
}

function calculateTradingDays(trades) {
  if (!trades || trades.length === 0) return 0

  const dates = trades
    .map(t => {
      const timestamp = t.timestamp || t.time
      if (!timestamp) return null
      return new Date(timestamp).toDateString()
    })
    .filter(d => d !== null)

  return new Set(dates).size
}

// app/analyze/utils/masterAnalyzer.js
// Orchestrates spot and futures analysis, provides combined metrics

import { analyzeSpotTrades } from './spotAnalyzer'
import { analyzeFuturesTrades } from './futuresAnalyzer'
import { analyzeTradingPsychology } from './psychologyAnalyzer'

export const analyzeData = (allData) => {
  console.log('\n=== MASTER ANALYZER ===')
  
  // allData can be either:
  // 1. Array of trades (legacy format) - has { symbol, time, qty, price, isBuyer, accountType }
  // 2. Object with { spotTrades, futuresIncome, futuresPositions } - new format
  
  let spotTrades = []
  let futuresData = { income: [], trades: [], positions: [] }
  
  if (Array.isArray(allData)) {
    // Legacy format: array of trades with accountType
    spotTrades = allData.filter(t => t.accountType === 'SPOT')
    const futuresTrades = allData.filter(t => t.accountType === 'FUTURES')
    futuresData = { trades: futuresTrades, income: [], positions: [] }
    
    console.log('Using legacy format')
    console.log('Spot trades:', spotTrades.length)
    console.log('Futures trades:', futuresTrades.length)
  } else if (allData && typeof allData === 'object') {
    // New format: structured object
    spotTrades = allData.spotTrades || []
    futuresData = {
      income: allData.futuresIncome || [],
      trades: allData.futuresTrades || [],
      positions: allData.futuresPositions || []
    }
    
    console.log('Using structured format')
    console.log('Spot trades:', spotTrades.length)
    console.log('Futures income records:', futuresData.income.length)
    console.log('Futures positions:', futuresData.positions.length)
  }

  // Analyze spot trades
  const spotAnalysis = analyzeSpotTrades(spotTrades)
  
  // Analyze futures data
  const futuresAnalysis = analyzeFuturesTrades(futuresData)

  // Combine metrics
  const totalPnL = spotAnalysis.totalPnL + futuresAnalysis.netPnL
  const totalInvested = spotAnalysis.totalInvested // Futures doesn't track "invested" the same way
  
  // CRITICAL: Total trades calculation
  // Spot: Each buy AND sell is counted as a transaction (industry standard for spot trading)
  // Futures: Each completed trade (realized P&L record) is one trade
  const totalTrades = spotAnalysis.totalTrades + futuresAnalysis.totalTrades
  
  // Completed trades = closed positions that resulted in win or loss
  const completedTrades = spotAnalysis.completedTrades + futuresAnalysis.completedTrades
  const winningTrades = spotAnalysis.winningTrades + futuresAnalysis.winningTrades
  const losingTrades = spotAnalysis.losingTrades + futuresAnalysis.losingTrades
  const totalCommission = spotAnalysis.totalCommission + futuresAnalysis.totalCommission

  // Combined symbols (merge spot and futures)
  const allSymbols = { ...spotAnalysis.symbols, ...futuresAnalysis.symbols }
  
  // Find best performing symbol across both
  const symbols = Object.keys(allSymbols)
  const bestSymbol = symbols.reduce((best, symbol) => {
    const bestPnL = allSymbols[best]?.realized || allSymbols[best]?.netPnL || -Infinity
    const currentPnL = allSymbols[symbol]?.realized || allSymbols[symbol]?.netPnL || -Infinity
    return currentPnL > bestPnL ? symbol : best
  }, symbols[0])

  // Merge time-based data
  const mergeDayData = (spotDays, futuresDays) => {
    const merged = { ...spotDays }
    Object.entries(futuresDays).forEach(([day, data]) => {
      if (!merged[day]) {
        merged[day] = { wins: 0, losses: 0, pnl: 0, count: 0 }
      }
      merged[day].wins += data.wins
      merged[day].losses += data.losses
      merged[day].pnl += data.pnl
      merged[day].count += data.count
    })
    return merged
  }

  const mergeHourData = (spotHours, futuresHours) => {
    return spotHours.map((spot, i) => ({
      hour: spot.hour,
      trades: spot.trades + futuresHours[i].trades,
      pnl: spot.pnl + futuresHours[i].pnl
    }))
  }

  const mergeMonthlyData = (spotMonthly, futuresMonthly) => {
    const merged = { ...spotMonthly }
    Object.entries(futuresMonthly).forEach(([month, pnl]) => {
      merged[month] = (merged[month] || 0) + pnl
    })
    return merged
  }

  const tradesByDay = mergeDayData(spotAnalysis.tradesByDay, futuresAnalysis.tradesByDay)
  const tradesByHour = mergeHourData(spotAnalysis.tradesByHour, futuresAnalysis.tradesByHour)
  const monthlyPnL = mergeMonthlyData(spotAnalysis.monthlyPnL, futuresAnalysis.monthlyPnL)

  // Day performance for charts
  const dayPerformance = Object.entries(tradesByDay).map(([day, data]) => ({
    day,
    pnl: data.pnl,
    winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
    count: data.count
  })).sort((a, b) => b.pnl - a.pnl)

  // Hour performance for charts
  const hourPerformance = tradesByHour
    .map((h, i) => ({ ...h, hour: i }))
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, 3)

  // Monthly data for charts
  const monthlyData = Object.entries(monthlyPnL)
    .map(([month, pnl]) => ({ month, pnl }))
    .slice(-12)

  // Trade size distribution (mainly for spot, futures uses margin)
  const tradeSizes = {
    small: spotTrades.filter(t => parseFloat(t.qty) * parseFloat(t.price) < 100).length,
    medium: spotTrades.filter(t => {
      const val = parseFloat(t.qty) * parseFloat(t.price)
      return val >= 100 && val < 1000
    }).length,
    large: spotTrades.filter(t => parseFloat(t.qty) * parseFloat(t.price) >= 1000).length
  }

  // Overall stats - weighted averages
  const avgWin = winningTrades > 0 
    ? (spotAnalysis.avgWin * spotAnalysis.winningTrades + futuresAnalysis.avgWin * futuresAnalysis.winningTrades) / winningTrades
    : 0
  const avgLoss = losingTrades > 0
    ? (spotAnalysis.avgLoss * spotAnalysis.losingTrades + futuresAnalysis.avgLoss * futuresAnalysis.losingTrades) / losingTrades
    : 0
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0

  const largestWin = Math.max(spotAnalysis.largestWin, futuresAnalysis.largestWin)
  const largestLoss = Math.min(spotAnalysis.largestLoss, futuresAnalysis.largestLoss)
  const maxConsecutiveWins = Math.max(spotAnalysis.maxConsecutiveWins, futuresAnalysis.maxConsecutiveWins)
  const maxConsecutiveLosses = Math.max(spotAnalysis.maxConsecutiveLosses, futuresAnalysis.maxConsecutiveLosses)

  // Build combined trades array for psychology analysis
  // For futures, convert income records to trade-like objects for psychology analysis
  const futuresTradesForPsych = futuresData.income
    .filter(inc => inc.incomeType === 'REALIZED_PNL')
    .map(inc => ({
      symbol: inc.symbol,
      time: inc.time,
      pnl: parseFloat(inc.income || 0),
      qty: 0, // Not relevant for futures income
      price: 0, // Not relevant for futures income
      accountType: 'FUTURES'
    }))

  const allTradesForPsychology = [...spotTrades, ...futuresTradesForPsych]
  
  // Analyze trading psychology
  const psychology = analyzeTradingPsychology(allTradesForPsychology, spotAnalysis, futuresAnalysis)

  console.log('\n=== MASTER ANALYSIS COMPLETE ===')
  console.log('Total P&L:', totalPnL.toFixed(2), `(Spot: ${spotAnalysis.totalPnL.toFixed(2)}, Futures: ${futuresAnalysis.netPnL.toFixed(2)})`)
  console.log('Total Transactions:', totalTrades, `(Spot: ${spotAnalysis.totalTrades}, Futures: ${futuresAnalysis.totalTrades})`)
  console.log('Completed Trades:', completedTrades, `(${winningTrades}W / ${losingTrades}L)`)
  console.log('Win Rate:', completedTrades > 0 ? (winningTrades / completedTrades * 100).toFixed(2) + '%' : '0%')
  console.log('Psychology Score:', psychology.disciplineScore)

  return {
    // Overall metrics
    totalPnL,
    totalInvested,
    roi: totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0,
    totalTrades,  // Total transactions (buy + sell for spot, realized PnL count for futures)
    completedTrades,  // Only closed positions with W/L outcome
    buyTrades: spotTrades.filter(t => t.isBuyer).length,
    sellTrades: spotTrades.filter(t => !t.isBuyer).length,
    winningTrades,
    losingTrades,
    winRate: completedTrades > 0 ? (winningTrades / completedTrades) * 100 : 0,
    
    // Performance metrics
    avgWin,
    avgLoss,
    profitFactor,
    largestWin,
    largestLoss,
    maxConsecutiveWins,
    maxConsecutiveLosses,
    totalCommission,
    
    // Symbols
    symbols: allSymbols,
    bestSymbol,
    
    // Time-based data
    dayPerformance,
    hourPerformance,
    monthlyData,
    tradeSizes,
    
    // Spot-specific metrics
    spotPnL: spotAnalysis.totalPnL,
    spotTrades: spotAnalysis.totalTrades,  // All spot transactions (buys + sells)
    spotCompletedTrades: spotAnalysis.completedTrades,  // Closed positions only
    spotWins: spotAnalysis.winningTrades,
    spotLosses: spotAnalysis.losingTrades,
    spotWinRate: spotAnalysis.winRate,
    spotInvested: spotAnalysis.totalInvested,
    spotRoi: spotAnalysis.roi,
    
    // Futures-specific metrics
    futuresPnL: futuresAnalysis.netPnL,
    futuresRealizedPnL: futuresAnalysis.realizedPnL,
    futuresUnrealizedPnL: futuresAnalysis.unrealizedPnL,
    futuresTrades: futuresAnalysis.totalTrades,  // Completed futures trades
    futuresCompletedTrades: futuresAnalysis.completedTrades,
    futuresWins: futuresAnalysis.winningTrades,
    futuresLosses: futuresAnalysis.losingTrades,
    futuresWinRate: futuresAnalysis.winRate,
    futuresCommission: futuresAnalysis.totalCommission,
    futuresFundingFees: futuresAnalysis.totalFundingFees,
    futuresOpenPositions: futuresAnalysis.openPositions,
    futuresFundingBySymbol: futuresAnalysis.fundingBySymbol,
    futuresCommissionBySymbol: futuresAnalysis.commissionBySymbol,
    futuresIncomeByType: futuresAnalysis.incomeByType,
    
    // Psychology analysis
    psychology,
    
    // Detailed analysis objects (for drill-down views)
    spotAnalysis,
    futuresAnalysis
  }
}
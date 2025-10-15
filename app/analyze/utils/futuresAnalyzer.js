// app/analyze/utils/futuresAnalyzer.js
// Handles FUTURES trading analysis using income records (realized P&L, commissions, funding fees)
// NOTE: For futures, totalTrades = count of unique REALIZED_PNL records (each represents a completed trade)
// This is different from spot where we count each transaction (buy AND sell separately)

export const analyzeFuturesTrades = (futuresData) => {
  console.log('\n=== FUTURES ANALYZER ===')
  
  // futuresData should contain: { trades, income, orders, positions }
  const { income = [], trades = [], positions = [] } = futuresData

  console.log('Income records:', income.length)
  console.log('Trade records:', trades.length)
  console.log('Current positions:', positions.length)

  if (income.length === 0 && trades.length === 0) {
    return getEmptyFuturesAnalysis()
  }

  // Process income records - this is the GOLD for futures
  const incomeBySymbol = {}
  const incomeByType = {
    REALIZED_PNL: 0,
    COMMISSION: 0,
    FUNDING_FEE: 0,
    TRANSFER: 0,
    LIQUIDATION: 0,
    OTHER: 0
  }

  const tradesByDay = {}
  const tradesByHour = Array(24).fill(0).map((_, i) => ({ hour: `${i}:00`, trades: 0, pnl: 0 }))
  const monthlyPnL = {}
  const fundingBySymbol = {}
  const commissionBySymbol = {}

  let winningTrades = 0
  let losingTrades = 0
  let avgWin = 0
  let avgLoss = 0
  let largestWin = 0
  let largestLoss = 0
  let consecutiveWins = 0
  let consecutiveLosses = 0
  let maxConsecutiveWins = 0
  let maxConsecutiveLosses = 0

  // Track unique trades (not just income records)
  // Each unique tradeId represents ONE completed futures trade
  const uniqueTradeIds = new Set()

  // Group income by symbol
  income.forEach(inc => {
    const symbol = inc.symbol || 'UNKNOWN'
    const amount = parseFloat(inc.income || 0)
    const type = inc.incomeType || 'OTHER'
    const date = new Date(inc.time)

    if (!incomeBySymbol[symbol]) {
      incomeBySymbol[symbol] = {
        realized: 0,
        commission: 0,
        funding: 0,
        trades: 0,
        wins: 0,
        losses: 0,
        tradeIds: new Set()
      }
    }

    // Track by type
    if (incomeByType[type] !== undefined) {
      incomeByType[type] += amount
    } else {
      incomeByType.OTHER += amount
    }

    // Track unique trades - only count REALIZED_PNL records for trade count
    // This is the KEY difference from spot: one REALIZED_PNL = one completed trade
    if (type === 'REALIZED_PNL' && inc.tradeId) {
      uniqueTradeIds.add(inc.tradeId)
      incomeBySymbol[symbol].tradeIds.add(inc.tradeId)
    }

    // Categorize by income type
    if (type === 'REALIZED_PNL') {
      incomeBySymbol[symbol].realized += amount
      
      // Track win/loss for each realized P&L
      if (amount > 0) {
        incomeBySymbol[symbol].wins++
        winningTrades++
        avgWin += amount
        largestWin = Math.max(largestWin, amount)
        consecutiveWins++
        consecutiveLosses = 0
        maxConsecutiveWins = Math.max(maxConsecutiveWins, consecutiveWins)

        const day = date.toLocaleDateString('en-US', { weekday: 'short' })
        if (!tradesByDay[day]) tradesByDay[day] = { wins: 0, losses: 0, pnl: 0, count: 0 }
        tradesByDay[day].wins++
        tradesByDay[day].count++
      } else if (amount < 0) {
        incomeBySymbol[symbol].losses++
        losingTrades++
        avgLoss += Math.abs(amount)
        largestLoss = Math.min(largestLoss, amount)
        consecutiveLosses++
        consecutiveWins = 0
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, consecutiveLosses)

        const day = date.toLocaleDateString('en-US', { weekday: 'short' })
        if (!tradesByDay[day]) tradesByDay[day] = { wins: 0, losses: 0, pnl: 0, count: 0 }
        tradesByDay[day].losses++
        tradesByDay[day].count++
      }

      // Track monthly
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      if (!monthlyPnL[monthKey]) monthlyPnL[monthKey] = 0
      monthlyPnL[monthKey] += amount

      // Track hourly
      const hour = date.getHours()
      tradesByHour[hour].trades++
      tradesByHour[hour].pnl += amount

      // Track daily
      const day = date.toLocaleDateString('en-US', { weekday: 'short' })
      if (tradesByDay[day]) {
        tradesByDay[day].pnl += amount
      }

    } else if (type === 'COMMISSION') {
      incomeBySymbol[symbol].commission += amount
      if (!commissionBySymbol[symbol]) commissionBySymbol[symbol] = 0
      commissionBySymbol[symbol] += Math.abs(amount)

    } else if (type === 'FUNDING_FEE') {
      incomeBySymbol[symbol].funding += amount
      if (!fundingBySymbol[symbol]) fundingBySymbol[symbol] = 0
      fundingBySymbol[symbol] += amount
    }
  })

  // Calculate averages
  avgWin = winningTrades > 0 ? avgWin / winningTrades : 0
  avgLoss = losingTrades > 0 ? avgLoss / losingTrades : 0
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0

  // Build symbol analytics
  const symbolAnalytics = {}
  Object.entries(incomeBySymbol).forEach(([symbol, data]) => {
    const netPnL = data.realized + data.commission + data.funding
    
    // For each symbol, count unique trades
    const symbolTotalTrades = data.tradeIds.size > 0 
      ? data.tradeIds.size 
      : income.filter(i => i.symbol === symbol && i.incomeType === 'REALIZED_PNL').length
    
    symbolAnalytics[symbol] = {
      realized: data.realized,
      commission: data.commission,
      funding: data.funding,
      netPnL,
      trades: symbolTotalTrades,  // Count of completed trades for this symbol
      wins: data.wins,
      losses: data.losses,
      winRate: data.wins + data.losses > 0 ? (data.wins / (data.wins + data.losses)) * 100 : 0,
      accountType: 'FUTURES'
    }
  })

  // Process open positions for unrealized P&L
  const openPositions = positions
    .filter(p => parseFloat(p.positionAmt) !== 0)
    .map(p => ({
      symbol: p.symbol,
      size: parseFloat(p.positionAmt),
      entryPrice: parseFloat(p.entryPrice),
      markPrice: parseFloat(p.markPrice || p.entryPrice),
      unrealizedProfit: parseFloat(p.unrealizedProfit || 0),
      leverage: parseFloat(p.leverage || 1),
      margin: parseFloat(p.initialMargin || 0),
      side: parseFloat(p.positionAmt) > 0 ? 'LONG' : 'SHORT'
    }))

  const unrealizedPnL = openPositions.reduce((sum, pos) => sum + pos.unrealizedProfit, 0)

  // Calculate totals
  const realizedPnL = incomeByType.REALIZED_PNL
  const totalCommission = Math.abs(incomeByType.COMMISSION)
  const totalFundingFees = incomeByType.FUNDING_FEE
  const netPnL = realizedPnL + incomeByType.COMMISSION + totalFundingFees

  const completedTrades = winningTrades + losingTrades
  
  // CRITICAL: Total trades for futures = count of unique REALIZED_PNL records
  // This represents the number of times we closed a position and realized profit/loss
  // If no tradeIds are available, fall back to counting REALIZED_PNL records
  const totalTradesCount = uniqueTradeIds.size > 0 
    ? uniqueTradeIds.size 
    : income.filter(i => i.incomeType === 'REALIZED_PNL').length

  console.log('\n=== FUTURES ANALYSIS COMPLETE ===')
  console.log('Realized P&L:', realizedPnL.toFixed(2))
  console.log('Total Commission:', totalCommission.toFixed(2))
  console.log('Total Funding Fees:', totalFundingFees.toFixed(2))
  console.log('Net P&L:', netPnL.toFixed(2))
  console.log('Unrealized P&L:', unrealizedPnL.toFixed(2))
  console.log('Total Trades (completed futures trades):', totalTradesCount)
  console.log('Completed Trades (with W/L outcome):', completedTrades)
  console.log('Win Rate:', completedTrades > 0 ? (winningTrades / completedTrades * 100).toFixed(2) + '%' : '0%')
  console.log('Open Positions:', openPositions.length)

  return {
    totalPnL: netPnL,
    realizedPnL,
    unrealizedPnL,
    totalCommission,
    totalFundingFees,
    netPnL,
    totalTrades: totalTradesCount,  // Count of completed futures trades (unique REALIZED_PNL records)
    completedTrades,  // Trades with win/loss outcome
    winningTrades,
    losingTrades,
    winRate: completedTrades > 0 ? (winningTrades / completedTrades) * 100 : 0,
    avgWin,
    avgLoss,
    profitFactor,
    largestWin,
    largestLoss,
    maxConsecutiveWins,
    maxConsecutiveLosses,
    symbols: symbolAnalytics,
    openPositions,
    tradesByDay,
    tradesByHour,
    monthlyPnL,
    fundingBySymbol,
    commissionBySymbol,
    incomeByType
  }
}

function getEmptyFuturesAnalysis() {
  return {
    totalPnL: 0,
    realizedPnL: 0,
    unrealizedPnL: 0,
    totalCommission: 0,
    totalFundingFees: 0,
    netPnL: 0,
    totalTrades: 0,
    completedTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    avgWin: 0,
    avgLoss: 0,
    profitFactor: 0,
    largestWin: 0,
    largestLoss: 0,
    maxConsecutiveWins: 0,
    maxConsecutiveLosses: 0,
    symbols: {},
    openPositions: [],
    tradesByDay: {},
    tradesByHour: Array(24).fill(0).map((_, i) => ({ hour: `${i}:00`, trades: 0, pnl: 0 })),
    monthlyPnL: {},
    fundingBySymbol: {},
    commissionBySymbol: {},
    incomeByType: {
      REALIZED_PNL: 0,
      COMMISSION: 0,
      FUNDING_FEE: 0,
      TRANSFER: 0,
      LIQUIDATION: 0,
      OTHER: 0
    }
  }
}
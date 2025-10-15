// app/analyze/utils/spotAnalyzer.js
// Handles traditional SPOT trading analysis with position tracking

export const analyzeSpotTrades = (spotTrades) => {
  console.log('\n=== SPOT ANALYZER ===')
  console.log('Total spot trades:', spotTrades.length)

  if (spotTrades.length === 0) {
    return {
      totalPnL: 0,
      totalInvested: 0,
      roi: 0,
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
      totalCommission: 0,
      symbols: {},
      tradesByDay: {},
      tradesByHour: Array(24).fill(0).map((_, i) => ({ hour: `${i}:00`, trades: 0, pnl: 0 })),
      monthlyPnL: {}
    }
  }

  const tradesBySymbol = {}
  const tradesByDay = {}
  const tradesByHour = Array(24).fill(0).map((_, i) => ({ hour: `${i}:00`, trades: 0, pnl: 0 }))
  const monthlyPnL = {}

  // Group trades by symbol
  spotTrades.forEach(trade => {
    if (!tradesBySymbol[trade.symbol]) {
      tradesBySymbol[trade.symbol] = []
    }
    tradesBySymbol[trade.symbol].push(trade)

    // Track by day
    const date = new Date(trade.time)
    const day = date.toLocaleDateString('en-US', { weekday: 'short' })
    if (!tradesByDay[day]) {
      tradesByDay[day] = { wins: 0, losses: 0, pnl: 0, count: 0 }
    }

    // Track by hour
    const hour = date.getHours()
    tradesByHour[hour].trades++
  })

  let totalPnL = 0
  let totalInvested = 0
  let winningTrades = 0
  let losingTrades = 0
  let totalCommission = 0
  let avgWin = 0
  let avgLoss = 0
  let largestWin = 0
  let largestLoss = 0
  let maxConsecutiveWins = 0
  let maxConsecutiveLosses = 0
  let consecutiveWins = 0
  let consecutiveLosses = 0

  const symbolAnalytics = {}

  // Process each symbol with position tracking
  Object.entries(tradesBySymbol).forEach(([symbol, trades]) => {
    trades.sort((a, b) => a.time - b.time)

    let position = 0
    let totalCost = 0
    let realized = 0
    let buys = 0
    let sells = 0
    let symbolWins = 0
    let symbolLosses = 0

    console.log(`\nAnalyzing SPOT ${symbol}: ${trades.length} trades`)

    trades.forEach((trade, index) => {
      const qty = parseFloat(trade.qty)
      const price = parseFloat(trade.price)
      const value = qty * price
      const commission = parseFloat(trade.commission || 0)
      totalCommission += commission

      const date = new Date(trade.time)
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      if (!monthlyPnL[monthKey]) monthlyPnL[monthKey] = 0

      if (trade.isBuyer) {
        // BUY: Accumulate position
        position += qty
        totalCost += value
        totalInvested += value
        buys++

        console.log(`  [${index}] BUY: ${qty} @ ${price} (Position: ${position.toFixed(4)})`)
      } else {
        // SELL: Realize profit/loss
        if (position > 0) {
          const avgCost = totalCost / position
          const pnl = (price - avgCost) * qty - commission
          realized += pnl
          monthlyPnL[monthKey] += pnl

          console.log(`  [${index}] SELL: ${qty} @ ${price} | AvgCost: ${avgCost.toFixed(2)} | PnL: ${pnl.toFixed(2)}`)

          // Track win/loss
          if (pnl > 0) {
            symbolWins++
            winningTrades++
            avgWin += pnl
            largestWin = Math.max(largestWin, pnl)
            consecutiveWins++
            consecutiveLosses = 0
            maxConsecutiveWins = Math.max(maxConsecutiveWins, consecutiveWins)

            const day = date.toLocaleDateString('en-US', { weekday: 'short' })
            tradesByDay[day].wins++
            tradesByDay[day].count++
          } else {
            symbolLosses++
            losingTrades++
            avgLoss += Math.abs(pnl)
            largestLoss = Math.min(largestLoss, pnl)
            consecutiveLosses++
            consecutiveWins = 0
            maxConsecutiveLosses = Math.max(maxConsecutiveLosses, consecutiveLosses)

            const day = date.toLocaleDateString('en-US', { weekday: 'short' })
            tradesByDay[day].losses++
            tradesByDay[day].count++
          }

          tradesByDay[date.toLocaleDateString('en-US', { weekday: 'short' })].pnl += pnl
          tradesByHour[date.getHours()].pnl += pnl

          // Reduce position
          position -= qty
          totalCost = position > 0 ? (totalCost / (position + qty)) * position : 0
        }

        sells++
      }
    })

    // Store symbol analytics
    symbolAnalytics[symbol] = {
      realized,
      position,
      avgPrice: position > 0 ? totalCost / position : 0,
      trades: trades.length,
      buys,
      sells,
      wins: symbolWins,
      losses: symbolLosses,
      winRate: symbolWins + symbolLosses > 0 ? (symbolWins / (symbolWins + symbolLosses)) * 100 : 0,
      accountType: 'SPOT'
    }

    totalPnL += realized
    console.log(`${symbol} Summary: Realized: ${realized.toFixed(2)}, Wins: ${symbolWins}, Losses: ${symbolLosses}`)
  })

  // Calculate averages
  avgWin = winningTrades > 0 ? avgWin / winningTrades : 0
  avgLoss = losingTrades > 0 ? avgLoss / losingTrades : 0
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0

  const completedTrades = winningTrades + losingTrades

  console.log('\n=== SPOT ANALYSIS COMPLETE ===')
  console.log('Total P&L:', totalPnL.toFixed(2))
  console.log('Completed Trades:', completedTrades)
  console.log('Win Rate:', completedTrades > 0 ? (winningTrades / completedTrades * 100).toFixed(2) + '%' : '0%')

  return {
    totalPnL,
    totalInvested,
    roi: totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0,
    totalTrades: spotTrades.length,
    completedTrades,
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
    totalCommission,
    symbols: symbolAnalytics,
    tradesByDay,
    tradesByHour,
    monthlyPnL
  }
}
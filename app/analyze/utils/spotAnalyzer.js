// app/analyze/utils/spotAnalyzer.js
// Handles traditional SPOT trading analysis with position tracking
// NOTE: In spot trading, each buy AND each sell is counted as a transaction (industry standard)
// A "completed trade" means a buy+sell pair that results in a win or loss

export const analyzeSpotTrades = (spotTrades) => {
  console.log('\n=== SPOT ANALYZER ===')
  console.log('Total spot transactions:', spotTrades.length)

  if (spotTrades.length === 0) {
    return {
      totalPnL: 0,
      totalInvested: 0,
      roi: 0,
      totalTrades: 0,  // Total transactions (buys + sells)
      completedTrades: 0,  // Closed positions with W/L
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

    console.log(`\nAnalyzing SPOT ${symbol}: ${trades.length} transactions`)

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

          // Track win/loss - this creates a "completed trade"
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
        } else {
          // SELL with no position = External deposit was sold
          // Don't count this in P&L, but track it separately
          const saleValue = value - commission

          console.log(`  [${index}] SELL (EXTERNAL): ${qty} @ ${price} | Sale Value: ${saleValue.toFixed(2)} | ⚠️ No cost basis (external deposit)`)

          // Track as external sale (informational only, not in P&L)
          if (!symbolAnalytics[symbol]) symbolAnalytics[symbol] = {}
          if (!symbolAnalytics[symbol].externalSales) {
            symbolAnalytics[symbol].externalSales = {
              count: 0,
              totalValue: 0,
              quantity: 0
            }
          }
          symbolAnalytics[symbol].externalSales.count++
          symbolAnalytics[symbol].externalSales.totalValue += saleValue
          symbolAnalytics[symbol].externalSales.quantity += qty
        }

        sells++
      }
    })

    // Store symbol analytics (preserve any existing data like externalSales)
    symbolAnalytics[symbol] = {
      ...(symbolAnalytics[symbol] || {}),
      realized,
      position,
      avgPrice: position > 0 ? totalCost / position : 0,
      trades: trades.length,  // Total transactions for this symbol
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

  // Completed trades = positions that were closed (resulted in win or loss)
  const completedTrades = winningTrades + losingTrades

  console.log('\n=== SPOT ANALYSIS COMPLETE ===')
  console.log('Total P&L:', totalPnL.toFixed(2))
  console.log('Total Transactions:', spotTrades.length, '(buys + sells)')
  console.log('Completed Round-Trips:', completedTrades, '(closed positions)')
  console.log('Win Rate:', completedTrades > 0 ? (winningTrades / completedTrades * 100).toFixed(2) + '%' : '0%')

  return {
    totalPnL,
    totalInvested,
    roi: totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0,
    totalTrades: spotTrades.length,  // ALL transactions (buys + sells) - industry standard for spot
    completedTrades,  // Only closed positions (buy+sell pairs with W/L outcome)
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
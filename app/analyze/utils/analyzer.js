// app/analyze/utils/analyzer.js

export const analyzeData = (allTrades) => {
  const tradesBySymbol = {}
  const tradesByDay = {}
  const tradesByHour = Array(24).fill(0).map((_, i) => ({ hour: `${i}:00`, trades: 0, pnl: 0 }))
  const tradeSizes = { small: 0, medium: 0, large: 0 }
  
  // Separate spot and futures trades
  const spotTrades = allTrades.filter(t => t.accountType === 'SPOT')
  const futuresTrades = allTrades.filter(t => t.accountType === 'FUTURES')
  
  console.log('=== INITIAL TRADE BREAKDOWN ===')
  console.log('Total Trades:', allTrades.length)
  console.log('Spot Trades:', spotTrades.length)
  console.log('Futures Trades:', futuresTrades.length)
  
  // Organize trades by symbol
  allTrades.forEach(trade => {
    if (!tradesBySymbol[trade.symbol]) {
      tradesBySymbol[trade.symbol] = []
    }
    tradesBySymbol[trade.symbol].push(trade)
    
    const date = new Date(trade.time)
    const day = date.toLocaleDateString('en-US', { weekday: 'short' })
    if (!tradesByDay[day]) tradesByDay[day] = { wins: 0, losses: 0, pnl: 0, count: 0 }
    
    const hour = date.getHours()
    tradesByHour[hour].trades++
    
    const value = parseFloat(trade.qty) * parseFloat(trade.price)
    if (value < 100) tradeSizes.small++
    else if (value < 1000) tradeSizes.medium++
    else tradeSizes.large++
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
  let totalBuys = 0
  let totalSells = 0
  
  // Spot and Futures specific metrics
  let spotPnL = 0
  let futuresPnL = 0
  let spotTrades_count = 0
  let futuresTrades_count = 0
  let spotWins = 0
  let spotLosses = 0
  let futuresWins = 0
  let futuresLosses = 0
  
  const symbolAnalytics = {}
  const monthlyPnL = {}

  // Process each symbol
  Object.entries(tradesBySymbol).forEach(([symbol, trades]) => {
    trades.sort((a, b) => a.time - b.time)
    
    const isSpot = trades[0].accountType === 'SPOT'
    const isFutures = trades[0].accountType === 'FUTURES'
    
    let position = 0
    let totalCost = 0
    let realized = 0
    let buys = 0
    let sells = 0
    let symbolWins = 0
    let symbolLosses = 0
    let consecutiveWins = 0
    let consecutiveLosses = 0

    console.log(`\n=== Analyzing ${symbol} (${trades[0].accountType}) ===`)
    console.log(`Total trades: ${trades.length}`)

    trades.forEach((trade, index) => {
      const qty = parseFloat(trade.qty)
      const price = parseFloat(trade.price)
      const value = qty * price
      const commission = parseFloat(trade.commission || 0)
      totalCommission += commission

      const date = new Date(trade.time)
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      if (!monthlyPnL[monthKey]) monthlyPnL[monthKey] = 0

      // Handle SPOT trades (traditional buy/sell with position tracking)
      if (isSpot) {
        if (trade.isBuyer) {
          position += qty
          totalCost += value
          totalInvested += value
          buys++
          totalBuys++
          console.log(`  [${index}] BUY: ${qty} @ ${price} (Position: ${position})`)
        } else {
          const avgCost = position > 0 ? totalCost / position : 0
          const pnl = (price - avgCost) * qty - commission
          realized += pnl
          monthlyPnL[monthKey] += pnl
          spotPnL += pnl
          spotTrades_count++
          
          console.log(`  [${index}] SELL: ${qty} @ ${price} | AvgCost: ${avgCost} | PnL: ${pnl.toFixed(2)}`)
          
          if (pnl > 0) {
            symbolWins++
            winningTrades++
            spotWins++
            avgWin += pnl
            largestWin = Math.max(largestWin, pnl)
            consecutiveWins++
            consecutiveLosses = 0
            maxConsecutiveWins = Math.max(maxConsecutiveWins, consecutiveWins)
          } else {
            symbolLosses++
            losingTrades++
            spotLosses++
            avgLoss += Math.abs(pnl)
            largestLoss = Math.min(largestLoss, pnl)
            consecutiveLosses++
            consecutiveWins = 0
            maxConsecutiveLosses = Math.max(maxConsecutiveLosses, consecutiveLosses)
          }
          
          const day = date.toLocaleDateString('en-US', { weekday: 'short' })
          if (pnl > 0) tradesByDay[day].wins++
          else tradesByDay[day].losses++
          tradesByDay[day].pnl += pnl
          tradesByDay[day].count++
          
          const hour = date.getHours()
          tradesByHour[hour].pnl += pnl
          
          position -= qty
          totalCost -= avgCost * qty
          sells++
          totalSells++
        }
      }
      
      // Handle FUTURES trades (each trade can have direct PnL)
      if (isFutures) {
        const realizedPnl = parseFloat(trade.realizedPnl || 0)
        
        if (trade.isBuyer) {
          buys++
          totalBuys++
          totalInvested += value
          console.log(`  [${index}] FUTURES BUY: ${qty} @ ${price}`)
        } else {
          sells++
          totalSells++
          console.log(`  [${index}] FUTURES SELL: ${qty} @ ${price}`)
        }
        
        // For futures, we track realized PnL directly from the trade
        if (realizedPnl !== 0) {
          realized += realizedPnl
          monthlyPnL[monthKey] += realizedPnl
          futuresPnL += realizedPnl
          futuresTrades_count++
          
          console.log(`  [${index}] Realized PnL: ${realizedPnl.toFixed(2)}`)
          
          if (realizedPnl > 0) {
            symbolWins++
            winningTrades++
            futuresWins++
            avgWin += realizedPnl
            largestWin = Math.max(largestWin, realizedPnl)
            consecutiveWins++
            consecutiveLosses = 0
            maxConsecutiveWins = Math.max(maxConsecutiveWins, consecutiveWins)
          } else {
            symbolLosses++
            losingTrades++
            futuresLosses++
            avgLoss += Math.abs(realizedPnl)
            largestLoss = Math.min(largestLoss, realizedPnl)
            consecutiveLosses++
            consecutiveWins = 0
            maxConsecutiveLosses = Math.max(maxConsecutiveLosses, consecutiveLosses)
          }
          
          const day = date.toLocaleDateString('en-US', { weekday: 'short' })
          if (realizedPnl > 0) tradesByDay[day].wins++
          else tradesByDay[day].losses++
          tradesByDay[day].pnl += realizedPnl
          tradesByDay[day].count++
          
          const hour = date.getHours()
          tradesByHour[hour].pnl += realizedPnl
        }
      }
    })

    symbolAnalytics[symbol] = { 
      realized, 
      position, 
      avgCost: position > 0 ? totalCost / position : 0, 
      trades: trades.length, 
      buys, 
      sells,
      wins: symbolWins,
      losses: symbolLosses,
      winRate: symbolWins + symbolLosses > 0 ? (symbolWins / (symbolWins + symbolLosses)) * 100 : 0,
      accountType: trades[0].accountType
    }
    totalPnL += realized
    
    console.log(`Summary: Realized: ${realized.toFixed(2)}, Wins: ${symbolWins}, Losses: ${symbolLosses}`)
  })

  avgWin = winningTrades > 0 ? avgWin / winningTrades : 0
  avgLoss = losingTrades > 0 ? avgLoss / losingTrades : 0
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0

  const symbols = Object.keys(symbolAnalytics)
  const bestSymbol = symbols.reduce((best, symbol) => 
    symbolAnalytics[symbol].realized > (symbolAnalytics[best]?.realized || -Infinity) ? symbol : best, symbols[0])

  const dayPerformance = Object.entries(tradesByDay).map(([day, data]) => ({
    day,
    pnl: data.pnl,
    winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
    count: data.count
  })).sort((a, b) => b.pnl - a.pnl)

  const hourPerformance = tradesByHour
    .map((h, i) => ({ ...h, hour: i }))
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, 3)

  const monthlyData = Object.entries(monthlyPnL)
    .map(([month, pnl]) => ({ month, pnl }))
    .slice(-12)

  const completedTrades = winningTrades + losingTrades

  // Debug logging
  console.log('\n=== FINAL TRADE ANALYSIS ===')
  console.log('Total Trades (Buy + Sell):', allTrades.length)
  console.log('Total Buys:', totalBuys)
  console.log('Total Sells:', totalSells)
  console.log('Completed Round Trips:', completedTrades)
  console.log('Winning Trades:', winningTrades)
  console.log('Losing Trades:', losingTrades)
  console.log('Win Rate:', completedTrades > 0 ? (winningTrades / completedTrades * 100).toFixed(2) + '%' : '0%')
  console.log('Max Consecutive Wins:', maxConsecutiveWins)
  console.log('Max Consecutive Losses:', maxConsecutiveLosses)
  console.log('Total PnL:', totalPnL.toFixed(2))
  console.log('\n--- SPOT vs FUTURES ---')
  console.log('Spot PnL:', spotPnL.toFixed(2))
  console.log('Spot Completed:', spotTrades_count, `(${spotWins}W / ${spotLosses}L)`)
  console.log('Futures PnL:', futuresPnL.toFixed(2))
  console.log('Futures Completed:', futuresTrades_count, `(${futuresWins}W / ${futuresLosses}L)`)

  return { 
    totalPnL, 
    totalInvested, 
    roi: totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0, 
    totalTrades: allTrades.length,
    completedTrades,
    buyTrades: totalBuys,
    sellTrades: totalSells,
    winningTrades,
    losingTrades,
    winRate: completedTrades > 0 ? (winningTrades / completedTrades) * 100 : 0,
    symbols: symbolAnalytics, 
    bestSymbol,
    totalCommission,
    avgWin,
    avgLoss,
    profitFactor,
    largestWin,
    largestLoss,
    maxConsecutiveWins,
    maxConsecutiveLosses,
    dayPerformance,
    hourPerformance,
    monthlyData,
    tradeSizes,
    // New futures-specific metrics
    spotPnL,
    futuresPnL,
    spotTrades: spotTrades.length,
    futuresTrades: futuresTrades.length,
    spotCompletedTrades: spotTrades_count,
    futuresCompletedTrades: futuresTrades_count,
    spotWinRate: spotWins + spotLosses > 0 ? (spotWins / (spotWins + spotLosses)) * 100 : 0,
    futuresWinRate: futuresWins + futuresLosses > 0 ? (futuresWins / (futuresWins + futuresLosses)) * 100 : 0,
    spotWins,
    spotLosses,
    futuresWins,
    futuresLosses
  }
}
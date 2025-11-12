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

    // Track by day (use UTC for consistency across timezones)
    const date = new Date(trade.time)
    const day = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
    if (!tradesByDay[day]) {
      tradesByDay[day] = { wins: 0, losses: 0, pnl: 0, count: 0 }
    }

    // Track by hour (use UTC)
    const hour = date.getUTCHours()
    tradesByHour[hour].trades++
  })

  let totalPnL = 0
  let totalInvested = 0 // Will track max capital at risk, not cumulative buys
  let maxCapitalAtRisk = 0 // Track peak capital deployed
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
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
      if (!monthlyPnL[monthKey]) monthlyPnL[monthKey] = 0

      if (trade.isBuyer) {
        // BUY: Accumulate position
        position += qty
        totalCost += value
        buys++

        // Track max capital at risk (peak capital deployed in open positions)
        maxCapitalAtRisk = Math.max(maxCapitalAtRisk, totalCost)

        console.log(`  [${index}] BUY: ${qty} @ ${price} (Position: ${position.toFixed(4)}, Cost: ${totalCost.toFixed(2)})`)
      } else {
        // SELL: Realize profit/loss
        if (position > 0) {
          const avgCost = totalCost / position
          // CRITICAL FIX: Only calculate P&L for the amount we actually have
          // If selling more than position (shouldn't happen, but handle gracefully)
          const qtyToSell = Math.min(qty, position)
          // Commission is proportional to the quantity being sold (if qty > position, only charge commission on what we have)
          const commissionForPnL = commission * (qtyToSell / qty)
          const pnl = (price - avgCost) * qtyToSell - commissionForPnL
          realized += pnl
          monthlyPnL[monthKey] += pnl

          if (qty > position) {
            console.warn(`  [${index}] SELL WARNING: Selling ${qty} but only ${position} available. Calculating P&L for ${qtyToSell} only.`)
          }
          console.log(`  [${index}] SELL: ${qtyToSell} @ ${price} | AvgCost: ${avgCost.toFixed(2)} | PnL: ${pnl.toFixed(2)}`)

          // Track win/loss - this creates a "completed trade"
          if (pnl > 0) {
            symbolWins++
            winningTrades++
            avgWin += pnl
            largestWin = Math.max(largestWin, pnl)
            consecutiveWins++
            consecutiveLosses = 0
            maxConsecutiveWins = Math.max(maxConsecutiveWins, consecutiveWins)

            const day = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
            tradesByDay[day].wins++
            tradesByDay[day].count++
          } else if (pnl < 0) {
            symbolLosses++
            losingTrades++
            avgLoss += Math.abs(pnl)
            largestLoss = Math.min(largestLoss, pnl)
            consecutiveLosses++
            consecutiveWins = 0
            maxConsecutiveLosses = Math.max(maxConsecutiveLosses, consecutiveLosses)

            const day = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
            tradesByDay[day].losses++
            tradesByDay[day].count++
          } else {
            // Breakeven trade (pnl === 0)
            // Reset consecutive streaks on breakeven
            consecutiveWins = 0
            consecutiveLosses = 0
            // Don't count as win or loss in statistics
          }

          tradesByDay[date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })].pnl += pnl
          tradesByHour[date.getUTCHours()].pnl += pnl

          // Reduce position and adjust cost basis - only by the amount actually sold
          position -= qtyToSell
          // Remaining cost = position * avgCost (clearer than the confusing formula)
          totalCost = position > 0 ? position * avgCost : 0
          
          // FIXED: Improved excess handling - only mark as external if excess is significant
          // Small excesses (< 0.1% of position or < 0.0001) are likely rounding/precision errors
          if (qty > qtyToSell) {
            const excessQty = qty - qtyToSell
            const excessPercent = position > 0 ? (excessQty / position) * 100 : 100
            const isSignificantExcess = excessQty > 0.0001 && excessPercent > 0.1
            
            if (isSignificantExcess) {
              // Significant excess - likely external deposit or data issue
              const excessValue = excessQty * price
              const excessCommission = commission * (excessQty / qty) // Proportional commission
              const excessSaleValue = Math.max(0, excessValue - excessCommission) // Ensure non-negative
              
              console.log(`  [${index}] SELL (EXTERNAL EXCESS): ${excessQty.toFixed(8)} @ ${price} | Sale Value: $${excessSaleValue.toFixed(4)} | ⚠️ Excess ${excessPercent.toFixed(2)}% (likely external deposit or missing historical data)`)
              
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
              symbolAnalytics[symbol].externalSales.totalValue += excessSaleValue
              symbolAnalytics[symbol].externalSales.quantity += excessQty
            } else {
              // Tiny excess - likely rounding error, absorb into position
              console.log(`  [${index}] SELL (MINOR EXCESS ABSORBED): ${excessQty.toFixed(8)} excess (${excessPercent.toFixed(4)}%) - treating as rounding error`)
              // Adjust position to account for the tiny excess (set to slightly negative to balance)
              position -= excessQty
            }
          }
        } else {
          // SELL with no position = External deposit was sold OR missing historical buy data
          // Don't count this in P&L, but track it separately
          const saleValue = Math.max(0, value - commission) // Ensure non-negative

          // FIXED: Better logging to distinguish potential data issues
          const saleValueFormatted = saleValue < 0.01 
            ? saleValue.toFixed(8) // More precision for tiny amounts
            : saleValue.toFixed(2)
          
          console.log(`  [${index}] SELL (EXTERNAL): ${qty} @ ${price} | Sale Value: $${saleValueFormatted} | ⚠️ No cost basis (external deposit or missing historical buy data)`)

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

  // Use max capital at risk for totalInvested (not cumulative buys)
  totalInvested = maxCapitalAtRisk

  // Calculate averages
  avgWin = winningTrades > 0 ? avgWin / winningTrades : 0
  avgLoss = losingTrades > 0 ? avgLoss / losingTrades : 0

  // Calculate profit factor: Gross Profit / Gross Loss
  // NOT avgWin / avgLoss (that's different when win/loss counts differ)
  const totalGrossProfit = winningTrades > 0 ? avgWin * winningTrades : 0
  const totalGrossLoss = losingTrades > 0 ? avgLoss * losingTrades : 0
  const profitFactor = totalGrossLoss > 0 ? totalGrossProfit / totalGrossLoss : 0

  // Completed trades = positions that were closed (resulted in win or loss)
  const completedTrades = winningTrades + losingTrades

  console.log('\n=== SPOT ANALYSIS COMPLETE ===')
  console.log('Total P&L:', totalPnL.toFixed(2))
  console.log('Max Capital At Risk:', totalInvested.toFixed(2))
  console.log('Total Transactions:', spotTrades.length, '(buys + sells)')
  console.log('Completed Round-Trips:', completedTrades, '(closed positions)')
  console.log('Win Rate:', completedTrades > 0 ? (winningTrades / completedTrades * 100).toFixed(2) + '%' : '0%')
  console.log('ROI:', totalInvested > 0 ? (totalPnL / totalInvested * 100).toFixed(2) + '%' : 'N/A')

  // Extract open positions (symbols with position > 0) for unrealized P&L calculation
  const openPositions = Object.entries(symbolAnalytics)
    .filter(([symbol, data]) => data.position > 0)
    .map(([symbol, data]) => ({
      symbol,
      quantity: data.position,
      avgEntryPrice: data.avgPrice,
      costBasis: data.position * data.avgPrice
    }))

  return {
    totalPnL,
    totalInvested, // Now represents max capital at risk
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
    monthlyPnL,
    openPositions // For calculating unrealized P&L with current market prices
  }
}
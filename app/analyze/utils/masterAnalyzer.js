// app/analyze/utils/masterAnalyzer.js
// Orchestrates spot and futures analysis, provides combined metrics

import { analyzeSpotTrades } from './spotAnalyzer'
import { analyzeFuturesTrades } from './futuresAnalyzer'
import { analyzeTradingPsychology } from './psychologyAnalyzer'
import { analyzeBehavior } from './behavioralAnalyzer'
import { autoConvertToUSD } from './currencyConverter'

export const analyzeData = async (allData) => {
  // VERY VISIBLE LOG - should appear in browser console
  console.warn('%c?????? === MASTER ANALYZER STARTED === ??????', 'color: #00ff00; font-size: 20px; font-weight: bold; background: #000; padding: 5px;')
  console.warn('Raw data keys:', Object.keys(allData || {}))
  console.warn('Has metadata:', !!allData?.metadata)
  console.warn('Has spotHoldings:', !!allData?.metadata?.spotHoldings)
  console.warn('spotHoldings count:', allData?.metadata?.spotHoldings?.length || 0)
  if (allData?.metadata?.spotHoldings) {
    console.warn('Sample holdings:', allData.metadata.spotHoldings.slice(0, 3))
  } else {
    console.error('??? NO HOLDINGS IN INPUT DATA ???')
  }

  // STEP 1: Auto-detect currency and convert to USD if needed
  // This ensures all subsequent analysis uses consistent USD values
  const convertedData = await autoConvertToUSD(allData)

  console.log('After conversion - Has metadata:', !!convertedData?.metadata)
  console.log('After conversion - Has spotHoldings:', !!convertedData?.metadata?.spotHoldings)
  console.log('After conversion - spotHoldings count:', convertedData?.metadata?.spotHoldings?.length || 0)

  // allData can be either:
  // 1. Array of trades (legacy format) - has { symbol, time, qty, price, isBuyer, accountType }
  // 2. Object with { spotTrades, futuresIncome, futuresPositions, metadata } - new format

  let spotTrades = []
  let futuresData = { income: [], trades: [], positions: [] }
  let metadata = {}

  if (Array.isArray(convertedData)) {
    // Legacy format: array of trades with accountType
    spotTrades = convertedData.filter(t => t.accountType === 'SPOT')
    const futuresTrades = convertedData.filter(t => t.accountType === 'FUTURES')
    futuresData = { trades: futuresTrades, income: [], positions: [] }

    console.log('Using legacy format')
    console.log('Spot trades:', spotTrades.length)
    console.log('Futures trades:', futuresTrades.length)
  } else if (convertedData && typeof convertedData === 'object') {
    // New format: structured object
    spotTrades = convertedData.spotTrades || []
    futuresData = {
      income: convertedData.futuresIncome || [],
      trades: convertedData.futuresTrades || [],
      positions: convertedData.futuresPositions || []
    }
    metadata = convertedData.metadata || {}

    console.log('Using structured format')
    console.log('Spot trades:', spotTrades.length)
    console.log('Futures income records:', futuresData.income.length)
    console.log('Futures positions:', futuresData.positions.length)
    console.log('Currency:', metadata.convertedToUSD ? `USD (converted from ${metadata.originalCurrency})` : (metadata.primaryCurrency || 'USD'))
    console.log('Metadata keys:', Object.keys(metadata))
    console.log('Final metadata.spotHoldings count:', metadata.spotHoldings?.length || 0)
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

  // Calculate profit factor: Gross Profit / Gross Loss
  // Total gross profit and loss across both spot and futures
  const totalGrossProfit = (spotAnalysis.avgWin * spotAnalysis.winningTrades) +
                          (futuresAnalysis.avgWin * futuresAnalysis.winningTrades)
  const totalGrossLoss = (spotAnalysis.avgLoss * spotAnalysis.losingTrades) +
                        (futuresAnalysis.avgLoss * futuresAnalysis.losingTrades)
  const profitFactor = totalGrossLoss > 0 ? totalGrossProfit / totalGrossLoss : 0

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

  // Analyze deep behavioral patterns
  const behavioral = analyzeBehavior(spotTrades, futuresData.income, metadata)

  // ====================================
  // STANDARDIZED ALL TRADES ARRAY
  // ====================================
  // Create a unified array of all trades in standardized format for advanced analytics
  // This enables drawdown analysis, time-based analysis, and symbol-specific analysis

  const normalizeSpotTrade = (trade) => {
    // Spot trades: Calculate P&L from price difference (stored in spotAnalyzer results)
    // For individual trades, we approximate P&L from commission as spot doesn't have direct P&L
    const commission = parseFloat(trade.commission || 0)
    const qty = parseFloat(trade.qty || 0)
    const price = parseFloat(trade.price || 0)
    const quoteQty = parseFloat(trade.quoteQty || qty * price)

    return {
      timestamp: trade.time ? new Date(trade.time).toISOString() : new Date().toISOString(),
      realizedPnl: trade.isBuyer ? 0 : quoteQty, // Simplified: sells generate PnL, buys are investments
      symbol: trade.symbol || 'UNKNOWN',
      quantity: qty,
      price: price,
      type: 'spot',
      side: trade.isBuyer ? 'buy' : 'sell',
      exchange: metadata.exchanges ? metadata.exchanges[0] : 'unknown',
      commission: commission
    }
  }

  const normalizeFuturesTrade = (income) => {
    const incomeAmount = parseFloat(income.income || 0)

    return {
      timestamp: income.time ? new Date(income.time).toISOString() : new Date().toISOString(),
      realizedPnl: incomeAmount,
      symbol: income.symbol || 'UNKNOWN',
      quantity: 0, // Futures income doesn't have quantity
      price: 0,
      type: 'futures',
      side: income.incomeType === 'REALIZED_PNL' ? 'close' : income.incomeType?.toLowerCase() || 'unknown',
      exchange: metadata.exchanges ? metadata.exchanges[0] : 'unknown',
      incomeType: income.incomeType || 'UNKNOWN'
    }
  }

  // Normalize all trades
  const normalizedSpotTrades = spotTrades.map(normalizeSpotTrade)
  const normalizedFuturesTrades = futuresData.income
    .filter(inc => inc.incomeType === 'REALIZED_PNL' || inc.incomeType === 'COMMISSION')
    .map(normalizeFuturesTrade)

  // Combine and sort by timestamp
  const allTrades = [...normalizedSpotTrades, ...normalizedFuturesTrades]
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

  console.log('?? Standardized trades created:', allTrades.length, `(${normalizedSpotTrades.length} spot, ${normalizedFuturesTrades.length} futures)`)

  console.log('\n=== MASTER ANALYSIS COMPLETE ===')
  console.log('Total P&L:', totalPnL.toFixed(2), `(Spot: ${spotAnalysis.totalPnL.toFixed(2)}, Futures: ${futuresAnalysis.netPnL.toFixed(2)})`)
  console.log('Total Transactions:', totalTrades, `(Spot: ${spotAnalysis.totalTrades}, Futures: ${futuresAnalysis.totalTrades})`)
  console.log('Completed Trades:', completedTrades, `(${winningTrades}W / ${losingTrades}L)`)
  console.log('Win Rate:', completedTrades > 0 ? (winningTrades / completedTrades * 100).toFixed(2) + '%' : '0%')
  console.log('Psychology Score:', psychology.disciplineScore)
  console.log('Behavioral Health Score:', behavioral.healthScore)

  // Calculate spot unrealized P&L if holdings data is available
  // Match spotHoldings (current market prices) with openPositions (from trade history)
  let spotUnrealizedPnL = 0
  const unmatchedHoldings = []
  const unmatchedPositions = []
  const matchedPairs = []
  
  console.log('\n=== CHECKING HOLDINGS DATA ===')
  console.log(`metadata exists: ${!!metadata}`)
  console.log(`spotHoldings exists: ${!!metadata?.spotHoldings}`)
  console.log(`spotHoldings is array: ${Array.isArray(metadata?.spotHoldings)}`)
  console.log(`spotHoldings count: ${metadata?.spotHoldings?.length || 0}`)
  console.log(`spotAnalysis.openPositions exists: ${!!spotAnalysis.openPositions}`)
  console.log(`spotAnalysis.openPositions count: ${spotAnalysis.openPositions?.length || 0}`)
  
  if (metadata?.spotHoldings && Array.isArray(metadata.spotHoldings) && spotAnalysis.openPositions && spotAnalysis.openPositions.length > 0) {
    // Create a map of open positions by normalized symbol for faster lookup
    const openPositionsMap = new Map()
    spotAnalysis.openPositions.forEach(pos => {
      const normalizedSymbol = pos.symbol?.toUpperCase().replace(/[\/\-]/g, '').replace('USDT', '')
      if (!openPositionsMap.has(normalizedSymbol)) {
        openPositionsMap.set(normalizedSymbol, [])
      }
      openPositionsMap.get(normalizedSymbol).push(pos)
    })
    
    spotUnrealizedPnL = metadata.spotHoldings.reduce((total, holding) => {
      const holdingAsset = holding.asset?.toUpperCase().trim()
      const normalizedHoldingAsset = holdingAsset?.replace(/[\/\-]/g, '').replace('USDT', '')
      
      // Try to find matching open position
      let openPosition = null
      const candidatePositions = openPositionsMap.get(normalizedHoldingAsset) || []
      
      // Try exact match first
      openPosition = candidatePositions.find(pos => {
        const posSymbol = pos.symbol?.toUpperCase()
        return holdingAsset === posSymbol || 
               holdingAsset === posSymbol.replace('USDT', '') ||
               holdingAsset === posSymbol.replace('/USDT', '') ||
               posSymbol === holdingAsset + 'USDT' ||
               posSymbol.replace(/[\/\-]/g, '').replace('USDT', '') === normalizedHoldingAsset
      })
      
      if (openPosition && holding.price && holding.quantity) {
        const currentPrice = parseFloat(holding.price)
        const avgEntryPrice = parseFloat(openPosition.avgEntryPrice)
        const holdingQuantity = parseFloat(holding.quantity)
        const positionQuantity = parseFloat(openPosition.quantity || 0)
        
        // Use the minimum of holding quantity and position quantity to avoid overstating P&L
        // This handles cases where holdings include external deposits
        const quantityToUse = Math.min(holdingQuantity, positionQuantity > 0 ? positionQuantity : holdingQuantity)
        
        // Calculate unrealized P&L: (currentPrice - avgEntryPrice) * quantity
        if (!isNaN(currentPrice) && !isNaN(avgEntryPrice) && !isNaN(quantityToUse) && avgEntryPrice > 0 && quantityToUse > 0) {
          const unrealizedPnL = (currentPrice - avgEntryPrice) * quantityToUse
          
          matchedPairs.push({
            asset: holdingAsset,
            holdingQuantity,
            positionQuantity,
            quantityUsed: quantityToUse,
            currentPrice,
            avgEntryPrice,
            unrealizedPnL,
            match: 'full'
          })
          
          return total + unrealizedPnL
        } else {
          matchedPairs.push({
            asset: holdingAsset,
            holdingQuantity,
            positionQuantity,
            currentPrice,
            avgEntryPrice,
            match: 'invalid',
            reason: `Invalid values: currentPrice=${currentPrice}, avgEntryPrice=${avgEntryPrice}, quantityToUse=${quantityToUse}`
          })
        }
      } else {
        unmatchedHoldings.push({
          asset: holdingAsset,
          quantity: holding.quantity,
          price: holding.price,
          usdValue: holding.usdValue
        })
      }
      
      return total
    }, 0)
    
    // Track open positions that don't have matching holdings
    spotAnalysis.openPositions.forEach(pos => {
      const posSymbol = pos.symbol?.toUpperCase()
      const normalizedPosSymbol = posSymbol?.replace(/[\/\-]/g, '').replace('USDT', '')
      const hasMatchingHolding = metadata.spotHoldings.some(h => {
        const holdingAsset = h.asset?.toUpperCase().trim()
        const normalizedHoldingAsset = holdingAsset?.replace(/[\/\-]/g, '').replace('USDT', '')
        return normalizedHoldingAsset === normalizedPosSymbol ||
               holdingAsset === posSymbol ||
               holdingAsset === posSymbol.replace('USDT', '') ||
               holdingAsset === posSymbol.replace('/USDT', '') ||
               posSymbol === holdingAsset + 'USDT'
      })
      
      if (!hasMatchingHolding) {
        unmatchedPositions.push({
          symbol: posSymbol,
          quantity: pos.quantity,
          avgEntryPrice: pos.avgEntryPrice
        })
      }
    })
    
    console.log('\n=== SPOT UNREALIZED P&L CALCULATION ===')
    console.log(`Total Unrealized P&L: ${spotUnrealizedPnL.toFixed(2)}`)
    console.log(`Matched pairs: ${matchedPairs.length}`)
    matchedPairs.forEach(pair => {
      console.log(`  ${pair.asset}: ${pair.holdingQuantity} holdings, ${pair.positionQuantity} position, used ${pair.quantityUsed}, P&L: ${pair.unrealizedPnL?.toFixed(2) || 'N/A'} (${pair.match})`)
    })
    if (unmatchedHoldings.length > 0) {
      console.warn(`??  ${unmatchedHoldings.length} holdings without matching open positions:`)
      unmatchedHoldings.forEach(h => {
        console.warn(`    - ${h.asset}: ${h.quantity} @ $${h.price} (value: $${h.usdValue})`)
      })
    }
    if (unmatchedPositions.length > 0) {
      console.warn(`??  ${unmatchedPositions.length} open positions without matching holdings:`)
      unmatchedPositions.forEach(p => {
        console.warn(`    - ${p.symbol}: ${p.quantity} @ avg $${p.avgEntryPrice}`)
      })
    }
  }

  return {
    // Currency info
    currency: metadata.primaryCurrency || 'USD',
    metadata,

    // ===== NEW: STANDARDIZED RAW TRADE DATA =====
    // All trades in a unified format for advanced analytics
    allTrades,  // Complete array of normalized trades with timestamp, realizedPnl, symbol, etc.

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
    spotUnrealizedPnL, // Calculated from holdings vs trade history
    spotOpenPositions: spotAnalysis.openPositions || [],
    
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
    
    // Combined unrealized P&L
    totalUnrealizedPnL: spotUnrealizedPnL + (futuresAnalysis.unrealizedPnL || 0),
    
    // Psychology analysis
    psychology,

    // Behavioral analysis (deep insights)
    behavioral,

    // Detailed analysis objects (for drill-down views)
    spotAnalysis,
    futuresAnalysis
  }
}
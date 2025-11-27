// lib/snaptrade-transform.js
// Transform Snaptrade activities/transactions to TradeClarity trades format

/**
 * Transform Snaptrade activity to TradeClarity trade format
 * @param {Object} activity - Snaptrade activity object
 * @returns {Object|null} TradeClarity trade object or null if not a trade
 */
export function transformActivityToTrade(activity) {
  // Only process BUY and SELL activities
  if (activity.type !== 'BUY' && activity.type !== 'SELL') {
    return null
  }

  // Extract symbol information
  const symbol = activity.symbol?.symbol || activity.symbol?.raw_symbol || 'UNKNOWN'
  const description = activity.symbol?.description || symbol

  // Extract account information
  const accountId = activity.account?.id || null
  const accountName = activity.account?.name || 'Unknown Account'

  // Extract trade details
  // Snaptrade uses 'units' field (can be negative for SELL, positive for BUY)
  const units = parseFloat(activity.units || activity.quantity || 0)
  const quantity = Math.abs(units) // Always positive for quantity
  const qty = quantity // Alias for analyzeData compatibility
  const price = parseFloat(activity.price || 0)
  const amount = parseFloat(activity.amount || 0)
  const fee = parseFloat(activity.fee || 0)

  // Extract dates
  const tradeDate = activity.trade_date || activity.settlement_date || null
  const settlementDate = activity.settlement_date || tradeDate || null
  const tradeTimestamp = tradeDate ? new Date(tradeDate).getTime() : Date.now()
  const tradeTimeISO = tradeDate ? new Date(tradeDate).toISOString() : new Date().toISOString()

  // Determine side (BUY = true, SELL = false)
  // Snaptrade: units are negative for SELL, positive for BUY
  // Primary source: activity.type, fallback to units sign
  const isBuyer = activity.type === 'BUY' || (activity.type !== 'SELL' && units > 0)

  // Create TradeClarity trade object
  const trade = {
    // Trade identification
    symbol: symbol,
    side: activity.type, // 'BUY' or 'SELL'
    isBuyer: isBuyer,
    type: 'MARKET', // Snaptrade doesn't provide order type, default to MARKET

    // Trade details - include both quantity and qty for compatibility
    quantity: quantity,
    qty: qty, // Required by analyzeData
    units: units, // Keep original units value
    price: price,
    quote_quantity: amount, // Total value
    commission: fee,
    commission_asset: activity.currency?.code || 'USD',

    // Timestamps - include both time and trade_time for compatibility
    timestamp: tradeTimestamp,
    time: tradeTimeISO, // Required by analyzeData (ISO string)
    trade_time: tradeTimeISO, // Also include trade_time
    trade_date: tradeDate,
    settlement_date: settlementDate,

    // Trade IDs
    trade_id: activity.id || `snaptrade-${Date.now()}-${Math.random()}`,
    order_id: activity.id || activity.external_reference_id || null,

    // Account information
    account_id: accountId,
    account_name: accountName,
    brokerage: activity.institution || activity.account?.institution_name || 'Unknown',

    // Account type (Snaptrade supports various account types)
    accountType: 'SPOT', // Required by analyzeData (camelCase)
    account_type: 'SPOT', // Also include snake_case

    // Exchange
    exchange: 'snaptrade',
    is_futures: false,

    // Metadata
    description: activity.description || `${activity.type} ${quantity} ${symbol}`,
    currency: activity.currency?.code || 'USD',

    // Raw data for reference
    raw_data: activity,
  }

  return trade
}

/**
 * Transform array of Snaptrade activities to TradeClarity trades
 * @param {Array} activities - Array of Snaptrade activity objects
 * @returns {Array} Array of TradeClarity trade objects
 */
export function transformActivitiesToTrades(activities) {
  if (!Array.isArray(activities)) {
    return []
  }

  const trades = activities
    .map(transformActivityToTrade)
    .filter(trade => trade !== null) // Filter out non-trade activities

  return trades
}

/**
 * Transform Snaptrade holdings to portfolio snapshot format
 * @param {Object} holdings - Snaptrade holdings object
 * @returns {Object} Portfolio snapshot object
 */
export function transformHoldingsToSnapshot(holdings) {
  if (!holdings || !holdings.account) {
    return null
  }

  const positions = holdings.positions || []
  const balances = holdings.balances || [] // API returns "balances" not "cash"
  const optionPositions = holdings.option_positions || []

  // Transform positions to holdings format
  const spotHoldings = positions.map(position => {
    // Symbol can be nested: position.symbol.symbol or position.symbol directly
    const symbolObj = position.symbol?.symbol || position.symbol
    const symbol = symbolObj?.symbol || symbolObj || 'UNKNOWN'
    const price = parseFloat(position.price || 0)
    const units = parseFloat(position.units || 0)
    const value = price * units

    return {
      symbol: symbol,
      name: symbolObj?.description || symbol,
      quantity: units,
      price: price,
      usdValue: value,
      averageCost: parseFloat(position.average_purchase_price || 0),
      openPnl: parseFloat(position.open_pnl || 0),
      // Currency is direct child of position per API docs
      currency: position.currency?.code || symbolObj?.currency?.code || 'USD',
      isCashEquivalent: position.cash_equivalent || false,
      exchange: 'snaptrade',
    }
  })

  // Calculate total cash from balances
  // Balances structure per API: { currency: {...}, cash: number, buying_power: number }
  const totalCash = balances.reduce((sum, balance) => {
    // Try different possible field names for cash amount
    const cashAmount = balance.cash ?? balance.amount ?? balance.total?.amount ?? 0
    return sum + parseFloat(cashAmount)
  }, 0)

  // Get primary currency from first balance
  const primaryCurrency = balances[0]?.currency?.code || 'USD'

  // Calculate total value from positions + cash
  const totalPositionValue = spotHoldings.reduce((sum, h) => sum + h.usdValue, 0)
  const totalValue = totalPositionValue + totalCash

  return {
    account_id: holdings.account?.id || null,
    account_name: holdings.account?.name || 'Unknown',
    total_portfolio_value: totalValue,
    total_spot_value: totalPositionValue,
    total_futures_value: 0,
    holdings: spotHoldings,
    balances: balances, // Include raw balances for reference
    cash: totalCash,
    primary_currency: primaryCurrency,
    account_type: 'SPOT',
    exchange: 'snaptrade',
    option_positions: optionPositions, // Include options data
  }
}

/**
 * Group trades by account for batch processing
 * @param {Array} trades - Array of TradeClarity trade objects
 * @returns {Object} Trades grouped by account_id
 */
export function groupTradesByAccount(trades) {
  const grouped = {}

  trades.forEach(trade => {
    const accountId = trade.account_id || 'unknown'
    if (!grouped[accountId]) {
      grouped[accountId] = []
    }
    grouped[accountId].push(trade)
  })

  return grouped
}

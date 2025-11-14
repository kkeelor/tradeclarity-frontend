// lib/marketContext.js
// Utilities for market context API calls

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

/**
 * Detect user's traded assets from normalized trade data
 * @param {Object} normalizedData - Normalized trade data with spotTrades, futuresIncome, etc.
 * @returns {Promise<{success: boolean, instruments: string[], baseAssets: string[]}>}
 */
export async function detectAssets(normalizedData) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/context/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ normalizedData })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error detecting assets:', error)
    throw error
  }
}

/**
 * Get comprehensive market context aggregating all data sources
 * @param {Object} params - { normalizedData, startDate, endDate, instruments }
 * @returns {Promise<Object>}
 */
export async function getComprehensiveContext({ normalizedData, startDate, endDate, instruments }) {
  try {
    // Build payload - prefer instruments over normalizedData to reduce payload size
    const payload = instruments && instruments.length > 0
      ? {
          instruments,
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          endDate: endDate ? new Date(endDate).toISOString() : undefined
        }
      : {
          normalizedData,
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          endDate: endDate ? new Date(endDate).toISOString() : undefined,
          instruments
        }
    
    const response = await fetch(`${BACKEND_URL}/api/context/comprehensive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching comprehensive market context:', error)
    throw error
  }
}

/**
 * Get trade-level insights for a specific trade
 * @param {Object} trade - Trade object with symbol, time, price, isBuyer, etc.
 * @param {Object} normalizedData - Optional normalized data for asset detection
 * @returns {Promise<Object>}
 */
export async function getTradeInsights(trade, normalizedData = null) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/context/insights/trade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trade: {
          symbol: trade.symbol,
          time: trade.time || trade.timestamp,
          price: trade.price,
          isBuyer: trade.isBuyer !== undefined ? trade.isBuyer : (trade.side === 'buy' || trade.type === 'buy'),
          quantity: trade.quantity || trade.qty,
          ...trade
        },
        normalizedData
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching trade insights:', error)
    throw error
  }
}

/**
 * Get drawdown insights for a drawdown period
 * @param {Object} drawdown - Drawdown object with startDate, endDate, loss, lossPercent
 * @param {Object} normalizedData - Optional normalized data for asset detection
 * @returns {Promise<Object>}
 */
export async function getDrawdownInsights(drawdown, normalizedData = null) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/context/insights/drawdown`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        drawdown: {
          startDate: drawdown.startDate,
          endDate: drawdown.endDate,
          loss: drawdown.loss || drawdown.drawdownAmount,
          lossPercent: drawdown.lossPercent || drawdown.drawdownPercent,
          ...drawdown
        },
        normalizedData
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching drawdown insights:', error)
    throw error
  }
}

/**
 * Get WebSocket status
 * @returns {Promise<Object>}
 */
export async function getWebSocketStatus() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/ws/coindesk/status`)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching WebSocket status:', error)
    throw error
  }
}

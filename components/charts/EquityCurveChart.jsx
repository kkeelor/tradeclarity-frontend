'use client'

/**
 * EquityCurveChart - Shows cumulative P&L over time
 * 
 * Beautiful area chart showing equity growth/decline with smooth animations
 * Ideal for showing overall portfolio performance
 */

import { memo, useCallback } from 'react'
import TradingViewChart, { CHART_COLORS } from './TradingViewChart'

/**
 * Transform trades data into equity curve format
 * @param {Array} trades - Array of trades with timestamp and realizedPnl
 * @param {number} startingBalance - Starting balance (default 0 for relative view)
 * @returns {Array} Data points for the chart
 */
export function transformToEquityCurve(trades, startingBalance = 0) {
  if (!trades || trades.length === 0) return []

  // Sort by timestamp
  const sortedTrades = [...trades]
    .filter(t => t.timestamp && (t.realizedPnl !== undefined && t.realizedPnl !== null && t.realizedPnl !== 0))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

  if (sortedTrades.length === 0) return []

  let cumulative = startingBalance
  const dataPoints = []

  // Add starting point
  const firstDate = new Date(sortedTrades[0].timestamp)
  dataPoints.push({
    time: Math.floor(firstDate.getTime() / 1000),
    value: startingBalance,
  })

  // Group trades by day and accumulate
  const dailyPnL = {}
  sortedTrades.forEach(trade => {
    const date = new Date(trade.timestamp)
    const dayKey = Math.floor(date.setHours(0, 0, 0, 0) / 1000)
    
    if (!dailyPnL[dayKey]) {
      dailyPnL[dayKey] = 0
    }
    dailyPnL[dayKey] += trade.realizedPnl || 0
  })

  // Convert to cumulative equity curve
  Object.keys(dailyPnL)
    .sort((a, b) => Number(a) - Number(b))
    .forEach(dayKey => {
      cumulative += dailyPnL[dayKey]
      dataPoints.push({
        time: Number(dayKey),
        value: cumulative,
      })
    })

  return dataPoints
}

/**
 * EquityCurveChart Component
 * 
 * @param {Object} props
 * @param {Array} props.data - Pre-transformed data points [{time, value}]
 * @param {Array} props.trades - Raw trades to transform (alternative to data)
 * @param {number} props.height - Chart height
 * @param {string} props.title - Chart title
 * @param {boolean} props.showVolume - Whether to show trade volume below
 */
function EquityCurveChart({ 
  data, 
  trades, 
  height = 300,
  title,
  className = '',
}) {
  // Use provided data or transform trades
  const chartData = data || (trades ? transformToEquityCurve(trades) : [])

  const handleChartReady = useCallback((chart, { colors }) => {
    if (chartData.length === 0) return

    // Determine if overall performance is positive or negative
    const isPositive = chartData.length > 1 
      ? chartData[chartData.length - 1].value >= chartData[0].value 
      : true

    // Create area series with dynamic coloring
    const areaSeries = chart.addAreaSeries({
      lineColor: isPositive ? colors.upColor : colors.downColor,
      topColor: isPositive ? colors.areaTopColor : 'rgba(239, 68, 68, 0.4)',
      bottomColor: isPositive ? colors.areaBottomColor : 'rgba(239, 68, 68, 0.0)',
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: isPositive ? colors.upColor : colors.downColor,
      crosshairMarkerBackgroundColor: '#000',
      priceFormat: {
        type: 'custom',
        formatter: (price) => {
          const sign = price >= 0 ? '+' : ''
          return `${sign}$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        },
      },
    })

    areaSeries.setData(chartData)

    // Add baseline at zero if we have negative values
    const hasNegative = chartData.some(d => d.value < 0)
    if (hasNegative) {
      areaSeries.createPriceLine({
        price: 0,
        color: 'rgba(255, 255, 255, 0.2)',
        lineWidth: 1,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: 'Breakeven',
      })
    }

    // Fit content with padding
    chart.timeScale().fitContent()
  }, [chartData])

  if (chartData.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-white/5 rounded-lg border border-white/10 ${className}`} style={{ height }}>
        <p className="text-white/40 text-sm">No data available</p>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {title && (
        <div className="absolute top-2 left-3 z-10">
          <span className="text-xs font-medium text-white/60">{title}</span>
        </div>
      )}
      <TradingViewChart 
        height={height} 
        onChartReady={handleChartReady}
        className="rounded-lg overflow-hidden"
      />
    </div>
  )
}

export default memo(EquityCurveChart)

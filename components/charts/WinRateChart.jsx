'use client'

/**
 * WinRateChart - Shows win rate over time or by category
 * 
 * Line chart showing win rate progression with reference lines
 */

import { memo, useCallback } from 'react'
import TradingViewChart, { CHART_COLORS } from './TradingViewChart'

/**
 * Calculate rolling win rate from trades
 * @param {Array} trades - Array of trades with timestamp and realizedPnl
 * @param {number} windowSize - Rolling window size (number of trades)
 * @returns {Array} Win rate data points
 */
export function calculateRollingWinRate(trades, windowSize = 20) {
  if (!trades || trades.length < windowSize) return []

  const sortedTrades = [...trades]
    .filter(t => t.timestamp && t.realizedPnl !== undefined && t.realizedPnl !== null && t.realizedPnl !== 0)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

  if (sortedTrades.length < windowSize) return []

  const dataPoints = []

  for (let i = windowSize - 1; i < sortedTrades.length; i++) {
    const window = sortedTrades.slice(i - windowSize + 1, i + 1)
    const wins = window.filter(t => t.realizedPnl > 0).length
    const winRate = (wins / windowSize) * 100

    const date = new Date(sortedTrades[i].timestamp)
    dataPoints.push({
      time: Math.floor(date.getTime() / 1000),
      value: winRate,
    })
  }

  return dataPoints
}

/**
 * Transform hourly/daily performance data to win rate format
 * @param {Array} data - Array of {hour/day, winRate, trades, wins}
 * @returns {Array} Data points for chart
 */
export function transformPerformanceToWinRate(data) {
  if (!data || data.length === 0) return []

  return data.map((item, index) => {
    // Calculate win rate if not provided
    let winRate = item.winRate
    if (winRate === undefined && item.wins !== undefined && item.trades !== undefined && item.trades > 0) {
      winRate = (item.wins / item.trades) * 100
    }

    // Create sequential time for ordered data (like hours or days)
    const baseTime = new Date('2024-01-01').getTime() / 1000
    const time = baseTime + (index * 86400) // One day apart for visual spacing

    return {
      time,
      value: winRate || 0,
      label: item.hour || item.day || item.label || `${index}`,
    }
  }).filter(d => d.value > 0) // Only show periods with trades
}

/**
 * WinRateChart Component
 * 
 * @param {Object} props
 * @param {Array} props.data - Pre-transformed data points [{time, value}]
 * @param {Array} props.trades - Raw trades for rolling win rate calculation
 * @param {Array} props.hourlyData - Hourly performance data
 * @param {Array} props.dailyData - Daily performance data  
 * @param {number} props.height - Chart height
 * @param {string} props.title - Chart title
 * @param {number} props.targetWinRate - Target win rate to show as reference line
 */
function WinRateChart({ 
  data, 
  trades,
  hourlyData,
  dailyData,
  height = 250,
  title,
  targetWinRate = 50,
  className = '',
}) {
  // Determine chart data
  let chartData = data
  if (!chartData && trades) {
    chartData = calculateRollingWinRate(trades)
  } else if (!chartData && hourlyData) {
    chartData = transformPerformanceToWinRate(hourlyData)
  } else if (!chartData && dailyData) {
    chartData = transformPerformanceToWinRate(dailyData)
  }
  chartData = chartData || []

  const handleChartReady = useCallback((chart, { colors }) => {
    if (chartData.length === 0) return

    // Calculate average win rate
    const avgWinRate = chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length
    const isAboveTarget = avgWinRate >= targetWinRate

    // Create line series
    const lineSeries = chart.addLineSeries({
      color: isAboveTarget ? colors.upColor : colors.downColor,
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      priceFormat: {
        type: 'custom',
        formatter: (price) => `${price.toFixed(1)}%`,
      },
    })

    lineSeries.setData(chartData)

    // Add target win rate line
    lineSeries.createPriceLine({
      price: targetWinRate,
      color: 'rgba(255, 255, 255, 0.3)',
      lineWidth: 1,
      lineStyle: 2, // Dashed
      axisLabelVisible: true,
      title: `${targetWinRate}% target`,
    })

    // Add 50% breakeven line if different from target
    if (targetWinRate !== 50) {
      lineSeries.createPriceLine({
        price: 50,
        color: 'rgba(255, 255, 255, 0.15)',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: false,
      })
    }

    // Set y-axis range
    chart.priceScale('right').applyOptions({
      scaleMargins: { top: 0.1, bottom: 0.1 },
      autoScale: true,
    })

    chart.timeScale().fitContent()
  }, [chartData, targetWinRate])

  if (chartData.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-white/5 rounded-lg border border-white/10 ${className}`} style={{ height }}>
        <p className="text-white/40 text-sm">Not enough data for win rate chart</p>
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

export default memo(WinRateChart)

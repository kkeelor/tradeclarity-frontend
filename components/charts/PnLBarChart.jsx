'use client'

/**
 * PnLBarChart - Shows P&L as histogram bars (daily, weekly, monthly)
 * 
 * Positive bars in green, negative in red
 * Great for showing performance breakdown by time period
 */

import { memo, useCallback } from 'react'
import TradingViewChart, { CHART_COLORS } from './TradingViewChart'

/**
 * Transform monthly/daily data to histogram format
 * @param {Array} data - Array of {month/day, pnl} or {time, value}
 * @returns {Array} Histogram data points
 */
export function transformToHistogram(data) {
  if (!data || data.length === 0) return []

  return data.map(item => {
    let time
    const value = item.pnl ?? item.value ?? 0

    // Handle different date formats
    if (item.time) {
      time = typeof item.time === 'number' ? item.time : Math.floor(new Date(item.time).getTime() / 1000)
    } else if (item.month) {
      // Format: "2024-01" or "Jan 2024"
      const date = new Date(item.month + '-01')
      time = Math.floor(date.getTime() / 1000)
    } else if (item.day) {
      // Day of week - map to a date (for display purposes)
      const dayMap = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 }
      const dayIndex = dayMap[item.day] ?? 0
      // Use a reference date to show day of week
      const refDate = new Date('2024-01-07') // A Sunday
      refDate.setDate(refDate.getDate() + dayIndex)
      time = Math.floor(refDate.getTime() / 1000)
    } else if (item.date) {
      time = Math.floor(new Date(item.date).getTime() / 1000)
    } else {
      return null
    }

    return {
      time,
      value,
      color: value >= 0 ? CHART_COLORS.histogramPositive : CHART_COLORS.histogramNegative,
    }
  }).filter(Boolean)
}

/**
 * PnLBarChart Component
 * 
 * @param {Object} props
 * @param {Array} props.data - Pre-transformed data points [{time, value, color}]
 * @param {Array} props.monthlyData - Monthly P&L data to transform [{month, pnl}]
 * @param {Array} props.dailyData - Daily P&L data to transform [{day, pnl}]
 * @param {number} props.height - Chart height
 * @param {string} props.title - Chart title
 */
function PnLBarChart({ 
  data, 
  monthlyData,
  dailyData,
  height = 250,
  title,
  className = '',
}) {
  // Use provided data or transform monthly/daily data
  let chartData = data
  if (!chartData && monthlyData) {
    chartData = transformToHistogram(monthlyData)
  } else if (!chartData && dailyData) {
    chartData = transformToHistogram(dailyData)
  }
  chartData = chartData || []

  const handleChartReady = useCallback((chart, { colors }) => {
    if (chartData.length === 0) return

    // Create histogram series
    const histogramSeries = chart.addHistogramSeries({
      priceFormat: {
        type: 'custom',
        formatter: (price) => {
          const sign = price >= 0 ? '+' : ''
          return `${sign}$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        },
      },
      priceScaleId: 'right',
    })

    histogramSeries.setData(chartData)

    // Add zero line
    histogramSeries.createPriceLine({
      price: 0,
      color: 'rgba(255, 255, 255, 0.15)',
      lineWidth: 1,
      lineStyle: 0, // Solid
      axisLabelVisible: false,
    })

    // Fit content
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

export default memo(PnLBarChart)

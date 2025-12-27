'use client'

/**
 * PerformanceComparisonChart - Multi-line chart for comparing metrics
 * 
 * Shows multiple series on one chart (e.g., spot vs futures, symbol comparison)
 */

import { memo, useCallback } from 'react'
import TradingViewChart, { CHART_COLORS } from './TradingViewChart'

// Additional colors for multiple series
const SERIES_COLORS = [
  '#10b981', // emerald
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#14b8a6', // teal
]

/**
 * PerformanceComparisonChart Component
 * 
 * @param {Object} props
 * @param {Array} props.series - Array of series configs [{name, data: [{time, value}], color?}]
 * @param {number} props.height - Chart height
 * @param {string} props.title - Chart title
 * @param {boolean} props.showLegend - Whether to show legend
 * @param {string} props.valueFormat - 'currency', 'percent', or 'number'
 */
function PerformanceComparisonChart({ 
  series = [],
  height = 300,
  title,
  showLegend = true,
  valueFormat = 'currency',
  className = '',
}) {
  const handleChartReady = useCallback((chart) => {
    if (series.length === 0) return

    const seriesInstances = []

    series.forEach((s, index) => {
      if (!s.data || s.data.length === 0) return

      const color = s.color || SERIES_COLORS[index % SERIES_COLORS.length]

      // Create line series for each
      const lineSeries = chart.addLineSeries({
        color,
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        title: s.name,
        priceFormat: {
          type: 'custom',
          formatter: (price) => {
            if (valueFormat === 'currency') {
              const sign = price >= 0 ? '+' : ''
              return `${sign}$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            } else if (valueFormat === 'percent') {
              return `${price.toFixed(1)}%`
            } else {
              return price.toLocaleString()
            }
          },
        },
      })

      // Transform data if needed
      const chartData = s.data.map(d => ({
        time: typeof d.time === 'number' ? d.time : Math.floor(new Date(d.time).getTime() / 1000),
        value: d.value,
      }))

      lineSeries.setData(chartData)
      seriesInstances.push({ series: lineSeries, name: s.name, color })
    })

    // Add zero line for currency format
    if (valueFormat === 'currency' && seriesInstances.length > 0) {
      seriesInstances[0].series.createPriceLine({
        price: 0,
        color: 'rgba(255, 255, 255, 0.15)',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: false,
      })
    }

    chart.timeScale().fitContent()
  }, [series, valueFormat])

  if (series.length === 0 || series.every(s => !s.data || s.data.length === 0)) {
    return (
      <div className={`flex items-center justify-center bg-white/5 rounded-lg border border-white/10 ${className}`} style={{ height }}>
        <p className="text-white/40 text-sm">No data available</p>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {/* Title and Legend */}
      <div className="absolute top-2 left-3 right-3 z-10 flex items-center justify-between">
        {title && (
          <span className="text-xs font-medium text-white/60">{title}</span>
        )}
        {showLegend && (
          <div className="flex items-center gap-3">
            {series.map((s, index) => (
              <div key={s.name} className="flex items-center gap-1.5">
                <div 
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: s.color || SERIES_COLORS[index % SERIES_COLORS.length] }}
                />
                <span className="text-[10px] text-white/50">{s.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <TradingViewChart 
        height={height} 
        onChartReady={handleChartReady}
        className="rounded-lg overflow-hidden"
      />
    </div>
  )
}

export default memo(PerformanceComparisonChart)

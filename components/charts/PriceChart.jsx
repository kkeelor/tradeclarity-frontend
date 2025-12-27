'use client'

/**
 * PriceChart - Shows market price data (candlesticks or line)
 * 
 * Used by Vega to display price charts for assets like Gold, BTC, stocks
 * Data comes from MCP tools (TIME_SERIES_INTRADAY, etc.)
 */

import { memo, useCallback } from 'react'
import TradingViewChart, { CHART_COLORS } from './TradingViewChart'

/**
 * Transform MCP time series data to chart format
 * @param {Array} data - Array of OHLCV data from MCP tools
 * @returns {Array} Candlestick data points
 */
export function transformPriceData(data) {
  if (!data || !Array.isArray(data)) return []

  return data
    .map(item => {
      // Handle various data formats from MCP tools
      let time
      if (item.time) {
        time = typeof item.time === 'number' ? item.time : Math.floor(new Date(item.time).getTime() / 1000)
      } else if (item.timestamp) {
        time = Math.floor(new Date(item.timestamp).getTime() / 1000)
      } else if (item.date) {
        time = Math.floor(new Date(item.date).getTime() / 1000)
      } else {
        return null
      }

      // For candlestick data
      if (item.open !== undefined && item.high !== undefined && item.low !== undefined && item.close !== undefined) {
        return {
          time,
          open: parseFloat(item.open),
          high: parseFloat(item.high),
          low: parseFloat(item.low),
          close: parseFloat(item.close),
        }
      }

      // For simple line data
      if (item.value !== undefined || item.close !== undefined || item.price !== undefined) {
        return {
          time,
          value: parseFloat(item.value ?? item.close ?? item.price),
        }
      }

      return null
    })
    .filter(Boolean)
    .sort((a, b) => a.time - b.time)
}

/**
 * Transform volume data
 * @param {Array} data - Array with volume data
 * @returns {Array} Volume histogram data
 */
export function transformVolumeData(data) {
  if (!data || !Array.isArray(data)) return []

  return data
    .map(item => {
      let time
      if (item.time) {
        time = typeof item.time === 'number' ? item.time : Math.floor(new Date(item.time).getTime() / 1000)
      } else if (item.timestamp) {
        time = Math.floor(new Date(item.timestamp).getTime() / 1000)
      } else if (item.date) {
        time = Math.floor(new Date(item.date).getTime() / 1000)
      } else {
        return null
      }

      if (item.volume === undefined) return null

      const isUp = item.close >= item.open
      return {
        time,
        value: parseFloat(item.volume),
        color: isUp ? CHART_COLORS.volumeUpColor : CHART_COLORS.volumeDownColor,
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.time - b.time)
}

/**
 * PriceChart Component
 * 
 * @param {Object} props
 * @param {Array} props.data - Price data (can be OHLCV or simple values)
 * @param {string} props.symbol - Symbol being displayed (e.g., "GOLD", "BTC")
 * @param {string} props.chartType - "candlestick", "line", or "area" (default: auto-detect)
 * @param {boolean} props.showVolume - Whether to show volume below price
 * @param {number} props.height - Chart height
 * @param {string} props.title - Chart title
 */
function PriceChart({ 
  data = [], 
  symbol = '',
  chartType,
  showVolume = false,
  height = 300,
  title,
  className = '',
}) {
  // Transform data
  const chartData = transformPriceData(data)
  const volumeData = showVolume ? transformVolumeData(data) : []

  // Auto-detect chart type based on data
  const effectiveChartType = chartType || (
    chartData.length > 0 && chartData[0].open !== undefined ? 'candlestick' : 'line'
  )

  const handleChartReady = useCallback((chart, { colors }) => {
    if (chartData.length === 0) return

    if (effectiveChartType === 'candlestick') {
      // Candlestick series
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: colors.upColor,
        downColor: colors.downColor,
        borderUpColor: colors.upColor,
        borderDownColor: colors.downColor,
        wickUpColor: colors.upColor,
        wickDownColor: colors.downColor,
      })
      candlestickSeries.setData(chartData)
    } else if (effectiveChartType === 'area') {
      // Area series
      const areaSeries = chart.addAreaSeries({
        lineColor: colors.lineColor,
        topColor: colors.areaTopColor,
        bottomColor: colors.areaBottomColor,
        lineWidth: 2,
      })
      areaSeries.setData(chartData)
    } else {
      // Line series (default)
      const lineSeries = chart.addLineSeries({
        color: colors.lineColor,
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
      })
      lineSeries.setData(chartData)
    }

    // Add volume if requested
    if (showVolume && volumeData.length > 0) {
      const volumeSeries = chart.addHistogramSeries({
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: 'volume',
      })

      chart.priceScale('volume').applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      })

      volumeSeries.setData(volumeData)
    }

    // Fit content
    chart.timeScale().fitContent()
  }, [chartData, volumeData, effectiveChartType, showVolume])

  if (chartData.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-white/5 rounded-lg border border-white/10 ${className}`} style={{ height }}>
        <p className="text-white/40 text-sm">No price data available</p>
      </div>
    )
  }

  // Calculate price change for display
  const firstPrice = chartData[0]?.close || chartData[0]?.value || 0
  const lastPrice = chartData[chartData.length - 1]?.close || chartData[chartData.length - 1]?.value || 0
  const priceChange = lastPrice - firstPrice
  const priceChangePercent = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0
  const isPositive = priceChange >= 0

  return (
    <div className={`relative ${className}`}>
      {/* Header with symbol and price */}
      <div className="absolute top-2 left-3 right-3 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {symbol && (
            <span className="text-xs font-semibold text-white/80">{symbol}</span>
          )}
          {title && !symbol && (
            <span className="text-xs font-medium text-white/60">{title}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-white/80">
            ${lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className={`text-[10px] font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
          </span>
        </div>
      </div>
      <TradingViewChart 
        height={height} 
        onChartReady={handleChartReady}
        className="rounded-lg overflow-hidden"
      />
    </div>
  )
}

export default memo(PriceChart)

'use client'

/**
 * PriceChart - Shows market price data (candlesticks or line)
 * 
 * Used by Vega to display price charts for assets like Gold, BTC, stocks
 * Data comes from MCP tools (TIME_SERIES_INTRADAY, etc.)
 */

import { memo, useCallback, useRef, useEffect, useMemo } from 'react'
import TradingViewChart, { CHART_COLORS } from './TradingViewChart'
import { LineSeries, CandlestickSeries, AreaSeries, HistogramSeries } from 'lightweight-charts'

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
  timeRange = null, // { days, startTime, endTime } from backend
}) {
  // Transform data - use useMemo to avoid unnecessary recalculations
  const chartData = useMemo(() => {
    return transformPriceData(data)
  }, [data])
  
  const volumeData = useMemo(() => {
    return showVolume ? transformVolumeData(data) : []
  }, [data, showVolume])
  const seriesRef = useRef(null)
  const chartInstanceRef = useRef(null)


  // Auto-detect chart type based on data
  const effectiveChartType = chartType || (
    chartData.length > 0 && chartData[0].open !== undefined ? 'candlestick' : 'line'
  )

  const handleChartReady = useCallback((chart, { colors }) => {
    if (!chart) {
      console.error('[PriceChart] Chart instance is null/undefined')
      return
    }
    
    // Store chart instance
    chartInstanceRef.current = chart
    
    if (chartData.length === 0) {
      console.warn('[PriceChart] No chart data available')
      return
    }

    try {
      // Remove existing series if any
      // Only remove if we have a valid series reference and chart has removeSeries method
      if (seriesRef.current && chart && typeof chart.removeSeries === 'function') {
        try {
          // Verify the series is still valid before removing
          if (seriesRef.current && typeof seriesRef.current.setData === 'function') {
            chart.removeSeries(seriesRef.current)
          }
        } catch (removeError) {
          // Series might already be removed or invalid, ignore
          console.warn('[PriceChart] Error removing series (non-fatal):', removeError)
        }
        seriesRef.current = null
      }
      
      // Use addSeries with series definitions (v5 API as shown in GitHub README)
      if (effectiveChartType === 'candlestick') {
        const candlestickSeries = chart.addSeries(CandlestickSeries, {
          upColor: colors.upColor,
          downColor: colors.downColor,
          borderUpColor: colors.upColor,
          borderDownColor: colors.downColor,
          wickUpColor: colors.upColor,
          wickDownColor: colors.downColor,
        })
        candlestickSeries.setData(chartData)
        seriesRef.current = candlestickSeries
      } else if (effectiveChartType === 'area') {
        const areaSeries = chart.addSeries(AreaSeries, {
          lineColor: colors.lineColor,
          topColor: colors.areaTopColor,
          bottomColor: colors.areaBottomColor,
          lineWidth: 2,
        })
        areaSeries.setData(chartData)
        seriesRef.current = areaSeries
      } else {
        const lineSeries = chart.addSeries(LineSeries, {
          color: colors.lineColor,
          lineWidth: 2,
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 4,
        })
        lineSeries.setData(chartData)
        seriesRef.current = lineSeries
      }

      // Add volume if requested
      if (showVolume && volumeData.length > 0) {
        const volumeSeries = chart.addSeries(HistogramSeries, {
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

      // Set visible range based on timeRange if provided
      if (timeRange && timeRange.startTime && timeRange.endTime) {
        // Set visible range to exactly match the requested time window
        try {
          chart.timeScale().setVisibleRange({
            from: timeRange.startTime,
            to: timeRange.endTime
          })
          // Log visible range for debugging
          if (process.env.NODE_ENV === 'development') {
            console.log('[PriceChart] Set visible range:', {
              from: timeRange.startTime,
              to: timeRange.endTime,
              days: timeRange.days,
              fromDate: new Date(timeRange.startTime * 1000).toISOString(),
              toDate: new Date(timeRange.endTime * 1000).toISOString()
            })
          }
        } catch (rangeError) {
          console.warn('[PriceChart] Error setting visible range, using fitContent:', rangeError)
          chart.timeScale().fitContent()
        }
      } else {
        // Fallback: fit content to show all data
        chart.timeScale().fitContent()
      }
    } catch (error) {
      console.error('[PriceChart] Error setting up chart:', error)
    }
  }, [chartData, volumeData, effectiveChartType, showVolume])

  // Update chart data when it changes (after initial setup)
  useEffect(() => {
    if (!chartInstanceRef.current || !seriesRef.current || chartData.length === 0) {
      return
    }

    try {
      seriesRef.current.setData(chartData)
      chartInstanceRef.current.timeScale().fitContent()
    } catch (error) {
      console.error('[PriceChart] Error updating chart data:', error)
    }
  }, [chartData])

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

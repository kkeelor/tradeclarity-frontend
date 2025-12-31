'use client'

/**
 * TradingViewChart - Base wrapper for TradingView Lightweight Charts
 * 
 * This is a reusable React wrapper that handles:
 * - Chart lifecycle (create/destroy)
 * - Responsive sizing
 * - Dark theme styling consistent with TradeClarity
 * - Smooth animations and transitions
 */

import { useEffect, useRef, useCallback, memo } from 'react'
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts'

// TradeClarity dark theme colors
const CHART_COLORS = {
  background: 'transparent',
  textColor: 'rgba(255, 255, 255, 0.6)',
  gridColor: 'rgba(255, 255, 255, 0.05)',
  borderColor: 'rgba(255, 255, 255, 0.1)',
  crosshairColor: 'rgba(255, 255, 255, 0.3)',
  // Series colors
  upColor: '#10b981',      // emerald-500
  downColor: '#ef4444',    // red-500
  lineColor: '#10b981',    // emerald-500
  areaTopColor: 'rgba(16, 185, 129, 0.4)',
  areaBottomColor: 'rgba(16, 185, 129, 0.0)',
  volumeUpColor: 'rgba(16, 185, 129, 0.5)',
  volumeDownColor: 'rgba(239, 68, 68, 0.5)',
  histogramPositive: '#10b981',
  histogramNegative: '#ef4444',
}

/**
 * Default chart options for TradeClarity styling
 */
const getDefaultOptions = (width, height) => ({
  width,
  height,
  layout: {
    background: { type: ColorType.Solid, color: CHART_COLORS.background },
    textColor: CHART_COLORS.textColor,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 11,
  },
  grid: {
    vertLines: { color: CHART_COLORS.gridColor },
    horzLines: { color: CHART_COLORS.gridColor },
  },
  crosshair: {
    mode: CrosshairMode.Normal,
    vertLine: {
      color: CHART_COLORS.crosshairColor,
      width: 1,
      style: 2, // Dashed
      labelBackgroundColor: 'rgba(16, 185, 129, 0.9)',
    },
    horzLine: {
      color: CHART_COLORS.crosshairColor,
      width: 1,
      style: 2,
      labelBackgroundColor: 'rgba(16, 185, 129, 0.9)',
    },
  },
  rightPriceScale: {
    borderColor: CHART_COLORS.borderColor,
    scaleMargins: { top: 0.1, bottom: 0.1 },
  },
  timeScale: {
    borderColor: CHART_COLORS.borderColor,
    timeVisible: true,
    secondsVisible: false,
    tickMarkFormatter: (time) => {
      const date = new Date(time * 1000)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    },
  },
  handleScroll: { mouseWheel: true, pressedMouseMove: true },
  handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
})

/**
 * Base TradingView Chart Component
 * 
 * @param {Object} props
 * @param {number} props.height - Chart height in pixels
 * @param {Object} props.options - Additional chart options to merge
 * @param {Function} props.onChartReady - Callback when chart is initialized, receives (chart, api) 
 * @param {string} props.className - Additional CSS classes
 */
function TradingViewChart({ 
  height = 300, 
  options = {}, 
  onChartReady,
  className = '',
}) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const resizeObserverRef = useRef(null)
  const onChartReadyRef = useRef(onChartReady)

  // Keep callback ref up to date
  useEffect(() => {
    onChartReadyRef.current = onChartReady
  }, [onChartReady])

  // Handle resize - use ref callback to avoid dependency issues
  const handleResize = useCallback(() => {
    const chart = chartRef.current
    const container = containerRef.current
    if (chart && container) {
      const { width } = container.getBoundingClientRect()
      chart.applyOptions({ width })
    }
  }, [])

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const { width } = container.getBoundingClientRect()

    // Create chart with merged options
    const chartOptions = {
      ...getDefaultOptions(width, height),
      ...options,
    }

    const chart = createChart(container, chartOptions)
    chartRef.current = chart

    // Set up resize observer for responsive behavior
    resizeObserverRef.current = new ResizeObserver(handleResize)
    resizeObserverRef.current.observe(container)

    // Notify parent that chart is ready
    // lightweight-charts v5 chart is ready immediately after creation
    // Call callback immediately with chart instance (not through ref to avoid timing issues)
    if (onChartReadyRef.current) {
      // Use the chart instance directly from closure, not from ref
      // This ensures we have the correct instance with all methods
      onChartReadyRef.current(chart, { colors: CHART_COLORS })
    }

    // Cleanup
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
      }
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }
    }
  }, [height]) // Only depend on height - handleResize and onChartReady are stable

  // Update options without recreating chart
  useEffect(() => {
    if (chartRef.current && options) {
      chartRef.current.applyOptions(options)
    }
  }, [options])

  return (
    <div 
      ref={containerRef}
      className={`w-full ${className}`}
      style={{ height: `${height}px` }}
    />
  )
}

export default memo(TradingViewChart)
export { CHART_COLORS, getDefaultOptions }

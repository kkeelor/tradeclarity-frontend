'use client'

/**
 * VegaChartRenderer - Renders charts based on Vega AI's requests
 * 
 * This component interprets chart specifications from Vega and renders
 * the appropriate TradingView chart. Vega can request charts using
 * a simple JSON format in its responses.
 * 
 * Chart Request Format (embedded in AI response):
 * [CHART]
 * {
 *   "type": "equity_curve" | "pnl_bar" | "win_rate" | "comparison",
 *   "title": "Chart Title",
 *   "dataKey": "trades" | "monthlyData" | "dayPerformance" | "hourPerformance" | "custom",
 *   "options": { ...chart-specific options }
 * }
 * [/CHART]
 */

import { memo, useMemo } from 'react'
import dynamic from 'next/dynamic'

// Dynamic imports to avoid SSR issues with canvas
const EquityCurveChart = dynamic(() => import('./EquityCurveChart'), { ssr: false })
const PnLBarChart = dynamic(() => import('./PnLBarChart'), { ssr: false })
const WinRateChart = dynamic(() => import('./WinRateChart'), { ssr: false })
const PerformanceComparisonChart = dynamic(() => import('./PerformanceComparisonChart'), { ssr: false })
const PriceChart = dynamic(() => import('./PriceChart'), { ssr: false })

/**
 * Available chart types that Vega can request
 */
export const CHART_TYPES = {
  // Trading analytics charts
  EQUITY_CURVE: 'equity_curve',
  PNL_BAR: 'pnl_bar',
  WIN_RATE: 'win_rate',
  COMPARISON: 'comparison',
  MONTHLY_PNL: 'monthly_pnl',
  DAILY_PERFORMANCE: 'daily_performance',
  HOURLY_PERFORMANCE: 'hourly_performance',
  // Market price charts
  PRICE: 'price',
  CANDLESTICK: 'candlestick',
  LINE: 'line',
}

/**
 * Parse chart request from Vega's response text
 * @param {string} responseText - Full response text from Vega
 * @returns {Object|null} Chart config or null if no chart requested
 */
export function parseChartRequest(responseText) {
  if (!responseText || typeof responseText !== 'string') return null

  const chartMatch = responseText.match(/\[CHART\]([\s\S]*?)\[\/CHART\]/i)
  if (!chartMatch) return null

  try {
    const chartJson = chartMatch[1].trim()
    const config = JSON.parse(chartJson)
    return config
  } catch (error) {
    console.warn('[VegaChartRenderer] Failed to parse chart config:', error)
    return null
  }
}

/**
 * Remove chart block from response text (for clean message display)
 * @param {string} responseText - Full response text
 * @returns {string} Text without chart block
 */
export function removeChartBlock(responseText) {
  if (!responseText || typeof responseText !== 'string') return responseText
  return responseText.replace(/\[CHART\][\s\S]*?\[\/CHART\]/gi, '').trim()
}

/**
 * Get data for chart from analytics context
 * @param {string} dataKey - Key indicating which data to use
 * @param {Object} analytics - Full analytics object
 * @param {Array} allTrades - All trades array
 * @returns {any} The requested data
 */
function getChartData(dataKey, analytics, allTrades) {
  switch (dataKey) {
    case 'trades':
      return allTrades
    case 'monthlyData':
      return analytics?.monthlyData
    case 'dayPerformance':
      return analytics?.dayPerformance
    case 'hourPerformance':
      return analytics?.hourPerformance
    case 'spotTrades':
      return allTrades?.filter(t => t.type === 'spot' || t.accountType === 'spot')
    case 'futuresTrades':
      return allTrades?.filter(t => t.type === 'futures' || t.accountType === 'futures')
    default:
      return null
  }
}

/**
 * VegaChartRenderer Component
 * 
 * @param {Object} props
 * @param {Object} props.chartConfig - Chart configuration from Vega
 * @param {Object} props.analytics - Analytics data context
 * @param {Array} props.allTrades - All trades for the user
 * @param {number} props.height - Chart height (default 250)
 */
function VegaChartRenderer({
  chartConfig,
  analytics,
  allTrades,
  height = 250,
  className = '',
}) {
  // Memoize data extraction
  const chartData = useMemo(() => {
    if (!chartConfig) return null

    const dataKey = chartConfig.dataKey || 'trades'
    return getChartData(dataKey, analytics, allTrades)
  }, [chartConfig, analytics, allTrades])

  if (!chartConfig) return null

  const { type, title, options = {} } = chartConfig

  // Render appropriate chart based on type
  switch (type) {
    case CHART_TYPES.EQUITY_CURVE:
      return (
        <div className={`my-4 ${className}`}>
          <EquityCurveChart
            trades={chartData}
            data={options.data}
            height={height}
            title={title || 'Equity Curve'}
          />
        </div>
      )

    case CHART_TYPES.PNL_BAR:
    case CHART_TYPES.MONTHLY_PNL:
      return (
        <div className={`my-4 ${className}`}>
          <PnLBarChart
            monthlyData={chartConfig.dataKey === 'monthlyData' ? chartData : undefined}
            dailyData={chartConfig.dataKey === 'dayPerformance' ? chartData : undefined}
            data={options.data}
            height={height}
            title={title || 'P&L by Period'}
          />
        </div>
      )

    case CHART_TYPES.DAILY_PERFORMANCE:
      return (
        <div className={`my-4 ${className}`}>
          <PnLBarChart
            dailyData={analytics?.dayPerformance}
            height={height}
            title={title || 'Daily Performance'}
          />
        </div>
      )

    case CHART_TYPES.HOURLY_PERFORMANCE:
      return (
        <div className={`my-4 ${className}`}>
          <PnLBarChart
            data={analytics?.hourPerformance?.map((h, i) => ({
              time: new Date('2024-01-01').getTime() / 1000 + i * 3600,
              value: h.pnl || 0,
              color: (h.pnl || 0) >= 0 ? '#10b981' : '#ef4444',
            }))}
            height={height}
            title={title || 'Hourly Performance'}
          />
        </div>
      )

    case CHART_TYPES.WIN_RATE:
      return (
        <div className={`my-4 ${className}`}>
          <WinRateChart
            trades={chartData}
            hourlyData={chartConfig.dataKey === 'hourPerformance' ? chartData : undefined}
            dailyData={chartConfig.dataKey === 'dayPerformance' ? chartData : undefined}
            height={height}
            title={title || 'Win Rate'}
            targetWinRate={options.targetWinRate || 50}
          />
        </div>
      )

    case CHART_TYPES.COMPARISON:
      // Build series from options
      const series = options.series || []
      if (series.length === 0 && analytics) {
        // Default comparison: spot vs futures
        if (analytics.spotPnL !== undefined && analytics.futuresPnL !== undefined) {
          // Create simple comparison data
        }
      }
      return (
        <div className={`my-4 ${className}`}>
          <PerformanceComparisonChart
            series={series}
            height={height}
            title={title || 'Comparison'}
            valueFormat={options.valueFormat || 'currency'}
          />
        </div>
      )

    // Market price charts (from MCP tools)
    case CHART_TYPES.PRICE:
    case CHART_TYPES.CANDLESTICK:
    case CHART_TYPES.LINE:
      return (
        <div className={`my-4 ${className}`}>
          <PriceChart
            data={options.data || []}
            symbol={options.symbol || title}
            chartType={type === CHART_TYPES.CANDLESTICK ? 'candlestick' : type === CHART_TYPES.LINE ? 'line' : undefined}
            showVolume={options.showVolume || false}
            height={height}
            title={title}
          />
        </div>
      )

    default:
      console.warn(`[VegaChartRenderer] Unknown chart type: ${type}`)
      return null
  }
}

export default memo(VegaChartRenderer)

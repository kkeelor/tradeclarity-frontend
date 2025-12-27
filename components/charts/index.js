/**
 * TradingView Charts - Export all chart components
 * 
 * These charts use TradingView Lightweight Charts for
 * professional-grade, Binance-level smooth visualizations
 */

// Base component
export { default as TradingViewChart, CHART_COLORS, getDefaultOptions } from './TradingViewChart'

// Trading analytics chart types
export { default as EquityCurveChart, transformToEquityCurve } from './EquityCurveChart'
export { default as PnLBarChart, transformToHistogram } from './PnLBarChart'
export { default as WinRateChart, calculateRollingWinRate, transformPerformanceToWinRate } from './WinRateChart'
export { default as PerformanceComparisonChart } from './PerformanceComparisonChart'

// Market price charts
export { default as PriceChart, transformPriceData, transformVolumeData } from './PriceChart'

// Chart renderer for Vega AI
export { default as VegaChartRenderer, CHART_TYPES, parseChartRequest, removeChartBlock } from './VegaChartRenderer'

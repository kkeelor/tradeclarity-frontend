// app/analyze/components/MarketContext/EconomicIndicators.jsx
// Task 2.4: Economic Indicators Section

'use client'

import { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'
import { TrendingUp, TrendingDown, AlertTriangle, Info, Activity, DollarSign } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

const INDICATOR_INFO = {
  VIXCLS: {
    name: 'VIX (Volatility Index)',
    description: 'Measures market volatility expectations. Higher values indicate increased fear and uncertainty.',
    impact: 'High VIX (>30) often correlates with market stress and crypto volatility.'
  },
  DFF: {
    name: 'Federal Funds Rate',
    description: 'The interest rate at which banks lend to each other overnight. Set by the Federal Reserve.',
    impact: 'Rate increases typically strengthen USD and can pressure crypto markets.'
  },
  DGS10: {
    name: '10-Year Treasury Yield',
    description: 'The yield on 10-year US Treasury bonds. Reflects long-term economic expectations.',
    impact: 'Rising yields can indicate economic strength but may reduce risk asset appeal.'
  },
  CPIAUCSL: {
    name: 'Consumer Price Index (CPI)',
    description: 'Measures inflation by tracking price changes in consumer goods and services.',
    impact: 'High inflation can drive investors to crypto as a hedge, but also triggers Fed rate hikes.'
  },
  UNRATE: {
    name: 'Unemployment Rate',
    description: 'Percentage of labor force that is unemployed and actively seeking employment.',
    impact: 'High unemployment can indicate economic weakness, affecting risk asset demand.'
  }
}

export default function EconomicIndicators({
  comprehensiveContext,
  dateRange,
  analytics
}) {
  const [expandedIndicator, setExpandedIndicator] = useState(null)
  const [selectedIndicator, setSelectedIndicator] = useState(null)

  // Process economic indicators
  const indicators = useMemo(() => {
    if (!comprehensiveContext?.economic?.indicators) return []

    return Object.entries(comprehensiveContext.economic.indicators).map(([key, indicator]) => {
      const value = parseFloat(indicator.value || 0)
      const changePercent = parseFloat(indicator.changePercent || 0)
      const info = INDICATOR_INFO[key] || { name: key, description: '', impact: '' }
      
      // Determine color based on indicator type and value
      let color = 'slate'
      let status = 'Normal'
      
      if (key === 'VIXCLS') {
        if (value > 30) {
          color = 'red'
          status = 'High Stress'
        } else if (value > 20) {
          color = 'yellow'
          status = 'Elevated'
        } else {
          color = 'emerald'
          status = 'Normal'
        }
      } else if (key === 'DFF' || key === 'DGS10') {
        // For rates, increases are generally negative for crypto
        color = changePercent > 0 ? 'red' : changePercent < 0 ? 'emerald' : 'slate'
        status = changePercent > 0 ? 'Rising' : changePercent < 0 ? 'Falling' : 'Stable'
      } else if (key === 'CPIAUCSL') {
        // High inflation can be both positive (hedge) and negative (Fed response)
        color = value > 3 ? 'yellow' : 'emerald'
        status = value > 3 ? 'Elevated' : 'Normal'
      } else if (key === 'UNRATE') {
        // High unemployment is negative
        color = value > 5 ? 'red' : 'emerald'
        status = value > 5 ? 'High' : 'Low'
      }

      return {
        key,
        name: info.name,
        description: info.description,
        impact: info.impact,
        value,
        changePercent,
        date: indicator.date,
        color,
        status,
        unit: key.includes('RATE') || key.includes('DFF') || key.includes('DGS') ? '%' : ''
      }
    })
  }, [comprehensiveContext])

  // Detect significant changes during user's trading period
  const significantChanges = useMemo(() => {
    if (!analytics || !indicators.length) return []

    const changes = indicators
      .filter(ind => Math.abs(ind.changePercent) > 10) // More than 10% change
      .map(ind => ({
        indicator: ind,
        message: `${ind.name} ${ind.changePercent >= 0 ? 'increased' : 'decreased'} by ${Math.abs(ind.changePercent).toFixed(1)}% during your trading period`
      }))

    return changes
  }, [indicators, analytics])

  // PHASE 2 TASK 2.3: Generate sparkline data from real historical data if available
  const getSparklineData = (indicator) => {
    // Check if API provides historical data for this indicator
    const economicData = comprehensiveContext?.economic
    if (!economicData || !economicData.indicators) {
      return []
    }

    const indicatorData = economicData.indicators[indicator.key]
    if (!indicatorData) {
      return []
    }

    // Check if historical timeline exists (array format)
    if (indicatorData.timeline && Array.isArray(indicatorData.timeline)) {
      // Use real historical data
      return indicatorData.timeline
        .filter(point => {
          // Filter to last 30 days for sparkline
          const pointDate = new Date(point.date || point.timestamp || point.time)
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          return pointDate >= thirtyDaysAgo
        })
        .map(point => ({
          date: point.date || new Date(point.timestamp || point.time).toISOString().split('T')[0],
          value: parseFloat(point.value || 0),
          timestamp: new Date(point.timestamp || point.time || point.date).getTime()
        }))
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
        .slice(-30) // Last 30 points
    }

    // Check if observations array exists (FRED API format)
    if (indicatorData.observations && Array.isArray(indicatorData.observations)) {
      return indicatorData.observations
        .filter(obs => {
          const obsDate = new Date(obs.date || obs.timestamp)
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          return obsDate >= thirtyDaysAgo && obs.value !== null && obs.value !== undefined
        })
        .map(obs => ({
          date: obs.date || new Date(obs.timestamp).toISOString().split('T')[0],
          value: parseFloat(obs.value || 0),
          timestamp: new Date(obs.date || obs.timestamp).getTime()
        }))
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-30) // Last 30 points
    }

    // Fallback: If only current value exists, create minimal sparkline with current value
    // Don't generate fake random data - just show current value
    if (indicator.value !== undefined && indicator.value !== null) {
      const now = new Date()
      return [{
        date: now.toISOString().split('T')[0],
        value: indicator.value,
        timestamp: now.getTime()
      }]
    }

    // No data available
    return []
  }

  // Custom tooltip
  const SparklineTooltip = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null

    return (
      <div className="bg-black/95 border border-slate-700 rounded-lg p-2 shadow-xl">
        <div className="text-xs text-slate-400">{payload[0]?.payload?.date}</div>
        <div className="text-sm font-semibold text-white">
          {parseFloat(payload[0]?.value || 0).toFixed(2)}
        </div>
      </div>
    )
  }

  if (indicators.length === 0) {
    return (
      <div className="bg-black/40 rounded-xl p-5 border border-slate-700/50">
        <div className="text-slate-400 text-center py-8">No economic indicators available</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Significant Changes Alert */}
      {significantChanges.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-amber-300 mb-2">Significant Changes Detected</h4>
              <div className="space-y-1">
                {significantChanges.slice(0, 3).map((change, idx) => (
                  <div key={idx} className="text-xs text-amber-200">
                    • {change.message}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Indicator Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {indicators.map((indicator) => {
          const sparklineData = getSparklineData(indicator)
          const isExpanded = expandedIndicator === indicator.key
          
          return (
            <div
              key={indicator.key}
              className={`bg-black/40 rounded-xl p-4 border transition-all cursor-pointer ${
                isExpanded
                  ? 'border-emerald-500/50 bg-emerald-500/5'
                  : 'border-slate-700/50 hover:border-slate-600'
              }`}
              onClick={() => setExpandedIndicator(isExpanded ? null : indicator.key)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-white">{indicator.name}</h4>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedIndicator(indicator)
                      }}
                      className="text-slate-400 hover:text-slate-300"
                    >
                      <Info className="w-3 h-3" />
                    </button>
                  </div>
                  <div className={`text-xs font-medium ${
                    indicator.color === 'red' ? 'text-red-400' :
                    indicator.color === 'yellow' ? 'text-yellow-400' :
                    indicator.color === 'emerald' ? 'text-emerald-400' :
                    'text-slate-400'
                  }`}>
                    {indicator.status}
                  </div>
                </div>
                {indicator.changePercent !== 0 && (
                  <div className={`flex items-center gap-1 ${
                    indicator.changePercent >= 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}>
                    {indicator.changePercent >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span className="text-sm font-semibold">
                      {Math.abs(indicator.changePercent).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Current Value */}
              <div className="text-2xl font-bold text-white mb-3">
                {indicator.value.toFixed(2)}{indicator.unit}
              </div>

              {/* Sparkline Chart */}
              {!isExpanded && (
                <div className="h-16 -mx-4 -mb-4">
                  {sparklineData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sparklineData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={
                            indicator.color === 'red' ? '#EF4444' :
                            indicator.color === 'yellow' ? '#F59E0B' :
                            indicator.color === 'emerald' ? '#10B981' :
                            '#6B7280'
                          }
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-slate-500">
                      No historical data
                    </div>
                  )}
                </div>
              )}

              {/* Expanded View */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  {sparklineData.length > 0 ? (
                    <>
                      <div className="h-32 mb-3">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={sparklineData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis
                              dataKey="date"
                              stroke="#9CA3AF"
                              fontSize={10}
                              tickFormatter={(value) => {
                                const date = new Date(value)
                                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                              }}
                            />
                            <YAxis stroke="#9CA3AF" fontSize={10} />
                            <Tooltip content={<SparklineTooltip />} />
                            <Line
                              type="monotone"
                              dataKey="value"
                              stroke={
                                indicator.color === 'red' ? '#EF4444' :
                                indicator.color === 'yellow' ? '#F59E0B' :
                                indicator.color === 'emerald' ? '#10B981' :
                                '#6B7280'
                              }
                              strokeWidth={2}
                              dot={false}
                            />
                            <ReferenceLine
                              y={indicator.value}
                              stroke="#9CA3AF"
                              strokeDasharray="3 3"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="text-xs text-slate-400">
                        <div className="mb-1">Last updated: {indicator.date || 'N/A'}</div>
                        <div>Period change: {indicator.changePercent >= 0 ? '+' : ''}{indicator.changePercent.toFixed(2)}%</div>
                        <div className="mt-1 text-slate-500">
                          {sparklineData.length} data point{sparklineData.length !== 1 ? 's' : ''} shown
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-sm text-slate-400 mb-2">No historical data available</div>
                      <div className="text-xs text-slate-500">
                        Historical timeline data is not included in the API response for this indicator.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Indicator Info Dialog */}
      {selectedIndicator && (
        <Dialog open={!!selectedIndicator} onOpenChange={() => setSelectedIndicator(null)}>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">{selectedIndicator.name}</DialogTitle>
              <DialogDescription className="text-slate-400">
                {selectedIndicator.description}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <div className="text-sm font-semibold text-slate-300 mb-2">Current Value</div>
                <div className="text-2xl font-bold text-white">
                  {selectedIndicator.value.toFixed(2)}{selectedIndicator.unit}
                </div>
              </div>
              {selectedIndicator.changePercent !== 0 && (
                <div>
                  <div className="text-sm font-semibold text-slate-300 mb-2">Period Change</div>
                  <div className={`text-xl font-bold ${
                    selectedIndicator.changePercent >= 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}>
                    {selectedIndicator.changePercent >= 0 ? '+' : ''}
                    {selectedIndicator.changePercent.toFixed(2)}%
                  </div>
                </div>
              )}
              <div>
                <div className="text-sm font-semibold text-slate-300 mb-2">Impact on Crypto</div>
                <div className="text-sm text-slate-400">{selectedIndicator.impact}</div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

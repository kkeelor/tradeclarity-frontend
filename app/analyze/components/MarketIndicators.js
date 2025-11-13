// app/analyze/components/MarketIndicators.js
// Component to display FRED economic indicators

'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Activity, DollarSign, BarChart3, Loader2 } from 'lucide-react'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

export default function MarketIndicators() {
  const [indicators, setIndicators] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchIndicators()
  }, [])

  const fetchIndicators = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${BACKEND_URL}/api/context/fred/latest`)
      const data = await response.json()
      
      if (data.success) {
        setIndicators(data.indicators)
      } else {
        setError(data.error || 'Failed to fetch indicators')
      }
    } catch (err) {
      console.error('Error fetching market indicators:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
        <span className="text-xs text-slate-400 ml-2">Loading market data...</span>
      </div>
    )
  }

  if (error || !indicators) {
    return null // Fail silently - don't show error in dashboard
  }

  // Key indicators to display (most relevant for trading)
  const keyIndicators = [
    { id: 'VIXCLS', label: 'VIX', icon: Activity, format: (v) => v.toFixed(1) },
    { id: 'DFF', label: 'Fed Rate', icon: DollarSign, format: (v) => `${v.toFixed(2)}%` },
    { id: 'DGS10', label: '10Y Treasury', icon: BarChart3, format: (v) => `${v.toFixed(2)}%` },
    { id: 'SP500', label: 'S&P 500', icon: TrendingUp, format: (v) => v.toFixed(0) }
  ]

  const availableIndicators = keyIndicators.filter(ind => indicators[ind.id])

  if (availableIndicators.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold text-slate-400/80 uppercase tracking-wider">Market Context</p>
      <div className="grid grid-cols-2 gap-2">
        {availableIndicators.map((ind) => {
          const data = indicators[ind.id]
          const Icon = ind.icon
          const changePercent = data.changePercent ? parseFloat(data.changePercent) : null
          const isPositive = changePercent !== null && changePercent > 0
          const isNegative = changePercent !== null && changePercent < 0

          return (
            <div
              key={ind.id}
              className="p-2.5 rounded-lg border border-slate-500/20 bg-slate-500/5 hover:bg-slate-500/10 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-1.5 flex-1 min-w-0">
                  <Icon className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-slate-400 mb-0.5">{ind.label}</div>
                    <div className="text-xs font-semibold text-slate-200">
                      {ind.format(data.value)}
                    </div>
                  </div>
                </div>
                {changePercent !== null && (
                  <div className={`flex items-center gap-0.5 flex-shrink-0 ${isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-slate-400'}`}>
                    {isPositive ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : isNegative ? (
                      <TrendingDown className="w-3 h-3" />
                    ) : null}
                    <span className="text-[10px] font-medium">
                      {isPositive ? '+' : ''}{changePercent.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

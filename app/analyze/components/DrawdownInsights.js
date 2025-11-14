// app/analyze/components/DrawdownInsights.js
// Component to display drawdown insights from market context API

'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Loader2, AlertCircle, TrendingDown, Calendar, BarChart3 } from 'lucide-react'
import { getDrawdownInsights } from '@/lib/marketContext'

export default function DrawdownInsights({ drawdown, normalizedData = null, onInsightsLoaded = null }) {
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!drawdown || !drawdown.startDate || !drawdown.endDate) return

    const fetchInsights = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getDrawdownInsights(drawdown, normalizedData)
        if (data.success) {
          setInsights(data.insights)
          if (onInsightsLoaded) {
            onInsightsLoaded(data.insights)
          }
        }
      } catch (err) {
        console.error('Error fetching drawdown insights:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchInsights()
  }, [drawdown, normalizedData, onInsightsLoaded])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Analyzing market context during drawdown...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-400 py-2">
        <AlertCircle className="w-4 h-4" />
        <span>Failed to load insights: {error}</span>
      </div>
    )
  }

  if (!insights || insights.length === 0) {
    return null
  }

  return (
    <div className="mt-3 p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-red-400" />
        <span className="text-sm font-semibold text-red-300">Drawdown Analysis</span>
        <span className="text-xs text-slate-500">
          {new Date(drawdown.startDate).toLocaleDateString()} - {new Date(drawdown.endDate).toLocaleDateString()}
        </span>
      </div>
      
      <div className="mb-3 p-3 bg-black/40 rounded-lg border border-slate-700/50">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Loss</span>
          <span className="text-lg font-bold text-red-400">
            {drawdown.lossPercent < 0 ? '' : '-'}{Math.abs(drawdown.lossPercent || drawdown.drawdownPercent || 0).toFixed(2)}%
          </span>
        </div>
        {drawdown.loss && (
          <div className="text-xs text-slate-500 mt-1">
            ${Math.abs(drawdown.loss || drawdown.drawdownAmount || 0).toFixed(2)}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {insights.map((insight, idx) => (
          <div key={idx} className="bg-black/40 rounded-lg p-3 border border-slate-700/50">
            <div className="flex items-start gap-2">
              <BarChart3 className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-200 mb-1">
                  {insight.title || 'Market Context Insight'}
                </div>
                <div className="text-xs text-slate-400 mb-2">
                  {insight.message || insight.description}
                </div>
                {insight.factors && insight.factors.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs font-medium text-slate-300 mb-1">Contributing Factors:</div>
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-400">
                      {insight.factors.map((factor, fIdx) => (
                        <li key={fIdx}>{factor}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {insight.recommendation && (
                  <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded text-xs text-emerald-300">
                    <span className="font-medium">Recommendation: </span>
                    {insight.recommendation}
                  </div>
                )}
                {insight.marketConditions && (
                  <div className="mt-2 pt-2 border-t border-slate-700/50">
                    <div className="text-xs text-slate-500">
                      <div className="font-medium text-slate-400 mb-1">Market Conditions:</div>
                      {insight.marketConditions.map((condition, cIdx) => (
                        <div key={cIdx} className="ml-2">• {condition}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

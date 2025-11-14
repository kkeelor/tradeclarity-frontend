// app/analyze/components/TradeInsights.js
// Component to display trade-level insights from market context API

'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Loader2, AlertCircle, TrendingUp, TrendingDown, Calendar } from 'lucide-react'
import { getTradeInsights } from '@/lib/marketContext'

export default function TradeInsights({ trade, normalizedData = null, onInsightsLoaded = null }) {
  const [insights, setInsights] = useState(null)
  const [marketContext, setMarketContext] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!trade || !trade.time) return

    const fetchInsights = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getTradeInsights(trade, normalizedData)
        if (data.success) {
          setInsights(data.insights)
          setMarketContext(data.marketContext)
          if (onInsightsLoaded) {
            onInsightsLoaded(data.insights, data.marketContext)
          }
        }
      } catch (err) {
        console.error('Error fetching trade insights:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchInsights()
  }, [trade, normalizedData, onInsightsLoaded])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Analyzing market context...</span>
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
    <div className="mt-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-semibold text-amber-300">Market Context Insights</span>
      </div>
      <div className="space-y-2">
        {insights.map((insight, idx) => (
          <div key={idx} className="text-xs text-slate-300">
            <div className="flex items-start gap-2">
              {insight.type === 'positive' ? (
                <TrendingUp className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
              ) : insight.type === 'negative' ? (
                <TrendingDown className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
              ) : (
                <Calendar className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <div className="font-medium text-slate-200">{insight.title || 'Market Insight'}</div>
                <div className="text-slate-400 mt-0.5">{insight.message || insight.description}</div>
                {insight.recommendation && (
                  <div className="text-emerald-300 mt-1 italic">{insight.recommendation}</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {marketContext && (
        <div className="mt-3 pt-3 border-t border-amber-500/10">
          <div className="text-xs text-slate-400">
            <div>Market conditions at trade time:</div>
            {marketContext.coindesk && (
              <div className="mt-1">
                Price: ${marketContext.coindesk.price?.toFixed(2) || 'N/A'}
                {marketContext.coindesk.changePercent && (
                  <span className={`ml-2 ${marketContext.coindesk.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ({marketContext.coindesk.changePercent >= 0 ? '+' : ''}{marketContext.coindesk.changePercent.toFixed(2)}%)
                  </span>
                )}
              </div>
            )}
            {marketContext.gdelt && marketContext.gdelt.tone && (
              <div className="mt-1">
                News Sentiment: {marketContext.gdelt.tone > 0 ? 'Positive' : marketContext.gdelt.tone < 0 ? 'Negative' : 'Neutral'} ({marketContext.gdelt.tone.toFixed(2)})
              </div>
            )}
            {marketContext.fred && (
              <div className="mt-1">
                VIX: {marketContext.fred.vix?.toFixed(1) || 'N/A'} | 
                Fed Rate: {marketContext.fred.fedRate?.toFixed(2) || 'N/A'}%
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// app/vega/components/VegaWelcome.js
'use client'

import { useMemo } from 'react'
import { Sparkles, TrendingUp, DollarSign, PieChart, Target, AlertCircle } from 'lucide-react'

export default function VegaWelcome({ 
  analytics, 
  tradesStats, 
  metadata, 
  onPromptClick 
}) {
  // Calculate portfolio value from spotHoldings
  const portfolioData = useMemo(() => {
    if (!metadata?.spotHoldings || !Array.isArray(metadata.spotHoldings)) {
      return null
    }

    const totalValue = metadata.spotHoldings.reduce((sum, holding) => {
      const usdValue = parseFloat(holding.usdValue || 0)
      return sum + usdValue
    }, 0)

    // Get top holdings by value
    const sortedHoldings = [...metadata.spotHoldings]
      .sort((a, b) => parseFloat(b.usdValue || 0) - parseFloat(a.usdValue || 0))
      .slice(0, 5)

    return {
      totalValue,
      topHoldings: sortedHoldings
    }
  }, [metadata])

  // Generate insights from analytics
  const insights = useMemo(() => {
    if (!analytics || !tradesStats) return []

    const insightsList = []

    // Win rate insight
    if (analytics.winRate !== undefined) {
      // winRate is already a percentage (0-100), no need to multiply
      const winRate = analytics.winRate
      if (winRate >= 60) {
        insightsList.push({
          type: 'strength',
          text: `Strong ${winRate.toFixed(1)}% win rate`,
          icon: TrendingUp
        })
      } else if (winRate < 40) {
        insightsList.push({
          type: 'weakness',
          text: `Win rate of ${winRate.toFixed(1)}% needs improvement`,
          icon: AlertCircle
        })
      }
    }

    // Profit factor insight
    if (analytics.profitFactor !== undefined) {
      const pf = analytics.profitFactor
      if (pf >= 2) {
        insightsList.push({
          type: 'strength',
          text: `Excellent ${pf.toFixed(2)}x profit factor`,
          icon: TrendingUp
        })
      } else if (pf < 1) {
        insightsList.push({
          type: 'weakness',
          text: `Profit factor of ${pf.toFixed(2)}x indicates losses`,
          icon: AlertCircle
        })
      }
    }

    // Total trades insight
    if (tradesStats.totalTrades > 0) {
      insightsList.push({
        type: 'info',
        text: `${tradesStats.totalTrades.toLocaleString()} trades analyzed`,
        icon: Target
      })
    }

    return insightsList.slice(0, 3) // Limit to 3 insights
  }, [analytics, tradesStats])

  // Generate context-aware prompts
  const prompts = useMemo(() => {
    const promptList = []

    if (!analytics || !tradesStats) {
      // Default prompts when no data
      return [
        "What are my biggest trading weaknesses?",
        "How can I improve my win rate?",
        "What's my best performing trading time?",
        "Which symbols should I focus on?"
      ]
    }

    // Win rate based prompts
    if (analytics.winRate !== undefined && analytics.winRate < 0.5) {
      promptList.push("What are my biggest trading weaknesses?")
      promptList.push("How can I improve my win rate?")
    } else if (analytics.winRate >= 0.6) {
      promptList.push("What are my trading strengths?")
      promptList.push("How can I scale my winning strategies?")
    }

    // Profit factor based prompts
    if (analytics.profitFactor !== undefined && analytics.profitFactor < 1) {
      promptList.push("Why am I losing money overall?")
    }

    // Time-based prompts (if available)
    if (analytics.bestHour || analytics.worstHour) {
      promptList.push("What's my best performing trading time?")
    }

    // Symbol-based prompts
    if (analytics.symbols && Object.keys(analytics.symbols).length > 0) {
      promptList.push("Which symbols should I focus on?")
      promptList.push("Which symbols should I avoid?")
    }

    // Portfolio prompts
    if (portfolioData && portfolioData.totalValue > 0) {
      promptList.push("What's my total portfolio value?")
      promptList.push("How is my portfolio distributed?")
    }

    // Fill with defaults if needed
    const defaultPrompts = [
      "What patterns do you see in my trading?",
      "Am I overtrading?",
      "What's my risk-adjusted return?",
      "How do I compare to market benchmarks?"
    ]

    // Remove duplicates and combine
    const uniquePrompts = [...new Set([...promptList, ...defaultPrompts])]
    return uniquePrompts.slice(0, 5) // Return top 5
  }, [analytics, tradesStats, portfolioData])

  if (!tradesStats || tradesStats.totalTrades === 0) {
    return null // Don't show welcome if no trades
  }

  return (
    <div className="mb-8 space-y-6">
      {/* Welcome Message */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <h2 className="text-xl font-semibold text-white/90">
            Welcome! I've analyzed your trading data
          </h2>
        </div>
        
        {/* Portfolio Value & Asset Distribution */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-white/70">
          {portfolioData && portfolioData.totalValue > 0 && (
            <>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>
                  Portfolio Value: <span className="text-white/90 font-semibold">
                    ${portfolioData.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </span>
              </div>
              {portfolioData.topHoldings.length > 0 && (
                <div className="flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-emerald-400" />
                  <span>
                    Top Holdings: {portfolioData.topHoldings.slice(0, 3).map((h, idx) => (
                      <span key={idx}>
                        {h.asset}
                        {idx < Math.min(2, portfolioData.topHoldings.length - 1) && ', '}
                      </span>
                    ))}
                  </span>
                </div>
              )}
            </>
          )}
          {tradesStats.totalTrades > 0 && (
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              <span>
                {tradesStats.totalTrades.toLocaleString()} trades analyzed
              </span>
            </div>
          )}
        </div>

        {/* Insights */}
        {insights.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
            {insights.map((insight, idx) => {
              const Icon = insight.icon
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
                    insight.type === 'strength'
                      ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400'
                      : insight.type === 'weakness'
                      ? 'bg-red-400/10 border-red-400/30 text-red-400'
                      : 'bg-white/5 border-white/10 text-white/70'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{insight.text}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Context-Aware Prompt Buttons */}
      {prompts.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-white/60 text-center">
            Try asking me:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {prompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => onPromptClick(prompt)}
                className="px-4 py-2 text-sm text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg transition-all duration-200 font-medium"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

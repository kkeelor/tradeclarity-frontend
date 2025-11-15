// app/analyze/components/MarketContext/AIInsights.jsx
// Task 3.1: AI-Generated Insights Panel

'use client'

import { useMemo } from 'react'
import {
  Sparkles, TrendingUp, TrendingDown, AlertTriangle, Lightbulb,
  Target, Activity, Newspaper, DollarSign, ExternalLink
} from 'lucide-react'
import { analyzeDrawdowns } from '../../utils/drawdownAnalysis'

export default function AIInsights({
  comprehensiveContext,
  analytics,
  userPerformance,
  comparisons,
  dateRange
}) {
  // Generate comprehensive insights
  const insights = useMemo(() => {
    const generatedInsights = []
    
    if (!comprehensiveContext || !analytics) return []

    // 1. Performance vs Market Insight
    if (userPerformance && comparisons.length > 0) {
      const comparison = comparisons[0]
      const outperformance = userPerformance.returnPercent - (comparison.marketReturn || 0)
      
      if (Math.abs(outperformance) > 2) {
        generatedInsights.push({
          type: outperformance > 0 ? 'positive' : 'negative',
          priority: 'high',
          icon: Target,
          title: outperformance > 0 ? 'You Outperformed the Market' : 'Market Outperformed You',
          message: `Your return of ${userPerformance.returnPercent >= 0 ? '+' : ''}${userPerformance.returnPercent.toFixed(2)}% ${outperformance > 0 ? 'beat' : 'lagged'} the market by ${Math.abs(outperformance).toFixed(2)} percentage points.`,
          details: `Market return: ${comparison.marketReturn >= 0 ? '+' : ''}${comparison.marketReturn.toFixed(2)}%`,
          category: 'performance'
        })
      }
    }

    // 2. Drawdown Analysis Insight
    if (analytics?.allTrades) {
      const trades = analytics.allTrades.map(trade => ({
        timestamp: trade.timestamp || trade.time,
        realizedPnl: trade.realizedPnl || trade.income || 0
      }))
      
      const drawdownAnalysis = analyzeDrawdowns(trades)
      const worstDrawdown = drawdownAnalysis.worstDrawdowns?.[0]
      
      if (worstDrawdown && Math.abs(worstDrawdown.drawdownPercent) > 10) {
        const drawdownStart = new Date(worstDrawdown.startDate)
        const drawdownEnd = new Date(worstDrawdown.endDate)
        
        // Check market conditions during drawdown
        const vixDuringDrawdown = comprehensiveContext?.economic?.indicators?.VIXCLS
        const sentimentDuringDrawdown = comprehensiveContext?.newsSentiment?.articles?.filter(article => {
          const articleDate = new Date(article.time_published || article.date)
          return articleDate >= drawdownStart && articleDate <= drawdownEnd
        })
        
        const avgSentiment = sentimentDuringDrawdown?.length > 0
          ? sentimentDuringDrawdown.reduce((sum, a) => sum + (parseFloat(a.overall_sentiment_score) || 0), 0) / sentimentDuringDrawdown.length
          : null
        
        generatedInsights.push({
          type: 'warning',
          priority: 'high',
          icon: TrendingDown,
          title: 'Significant Drawdown Detected',
          message: `Your worst drawdown of ${Math.abs(worstDrawdown.drawdownPercent).toFixed(1)}% occurred from ${drawdownStart.toLocaleDateString()} to ${drawdownEnd.toLocaleDateString()}.`,
          details: [
            vixDuringDrawdown && parseFloat(vixDuringDrawdown.value) > 25
              ? `VIX was elevated at ${parseFloat(vixDuringDrawdown.value).toFixed(1)} during this period`
              : null,
            avgSentiment !== null && avgSentiment < -0.1
              ? `News sentiment was bearish (${avgSentiment.toFixed(2)}) during this period`
              : null,
            worstDrawdown.recovered
              ? `You recovered ${worstDrawdown.recoveryDays} days later`
              : 'This drawdown is still ongoing'
          ].filter(Boolean).join('. '),
          category: 'drawdown'
        })
      }
    }

    // 3. VIX Correlation Insight
    const vix = comprehensiveContext?.economic?.indicators?.VIXCLS
    if (vix && userPerformance) {
      const vixValue = parseFloat(vix.value || 0)
      const vixChange = parseFloat(vix.changePercent || 0)
      
      if (vixValue > 30 && userPerformance.returnPercent < 0) {
        generatedInsights.push({
          type: 'info',
          priority: 'medium',
          icon: Activity,
          title: 'High Volatility Period',
          message: `VIX spiked to ${vixValue.toFixed(1)} (${vixChange >= 0 ? '+' : ''}${vixChange.toFixed(1)}%) during your trading period, indicating elevated market stress.`,
          details: 'High volatility periods often correlate with market-wide drawdowns, not necessarily poor trading decisions.',
          category: 'volatility'
        })
      }
    }

    // 4. News Sentiment Correlation
    const articles = comprehensiveContext?.newsSentiment?.articles
    if (articles && articles.length > 0) {
      const avgSentiment = articles.reduce((sum, a) => 
        sum + (parseFloat(a.overall_sentiment_score) || 0), 0) / articles.length
      
      if (userPerformance && Math.abs(avgSentiment) > 0.15) {
        const sentimentCorrelation = avgSentiment > 0 && userPerformance.returnPercent > 0
          || avgSentiment < 0 && userPerformance.returnPercent < 0
        
        generatedInsights.push({
          type: sentimentCorrelation ? 'positive' : 'warning',
          priority: 'medium',
          icon: Newspaper,
          title: sentimentCorrelation 
            ? 'Sentiment Aligned with Performance'
            : 'Sentiment Mismatch',
          message: sentimentCorrelation
            ? `News sentiment (${avgSentiment >= 0 ? '+' : ''}${avgSentiment.toFixed(2)}) aligned with your ${userPerformance.returnPercent >= 0 ? 'positive' : 'negative'} performance.`
            : `News sentiment was ${avgSentiment > 0 ? 'bullish' : 'bearish'} (${avgSentiment >= 0 ? '+' : ''}${avgSentiment.toFixed(2)}), but your performance was ${userPerformance.returnPercent >= 0 ? 'positive' : 'negative'}.`,
          details: `Analyzed ${articles.length} articles from ${new Date(dateRange.start).toLocaleDateString()} to ${new Date(dateRange.end).toLocaleDateString()}.`,
          category: 'sentiment'
        })
      }
    }

    // 5. Economic Indicator Impact
    const indicators = comprehensiveContext?.economic?.indicators
    if (indicators && userPerformance) {
      const significantChanges = Object.entries(indicators)
        .filter(([key, ind]) => Math.abs(parseFloat(ind.changePercent || 0)) > 15)
        .slice(0, 2)
      
      significantChanges.forEach(([key, indicator]) => {
        const change = parseFloat(indicator.changePercent || 0)
        const indicatorName = key === 'VIXCLS' ? 'VIX' :
                             key === 'DFF' ? 'Fed Rate' :
                             key === 'DGS10' ? '10Y Treasury' :
                             key === 'CPIAUCSL' ? 'CPI' :
                             key === 'UNRATE' ? 'Unemployment' : key
        
        generatedInsights.push({
          type: Math.abs(change) > 20 ? 'warning' : 'info',
          priority: 'medium',
          icon: DollarSign,
          title: `${indicatorName} Changed Significantly`,
          message: `${indicatorName} ${change >= 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)}% during your trading period.`,
          details: `Current value: ${parseFloat(indicator.value || 0).toFixed(2)}${key.includes('RATE') || key.includes('DFF') || key.includes('DGS') ? '%' : ''}`,
          category: 'economic'
        })
      })
    }

    // 6. Trade Timing Insight
    if (analytics?.allTrades && analytics.allTrades.length > 0) {
      const trades = analytics.allTrades
      const buyTrades = trades.filter(t => t.isBuyer || t.side === 'buy')
      const sellTrades = trades.filter(t => !t.isBuyer || t.side === 'sell')
      
      if (buyTrades.length > 0 && sellTrades.length > 0) {
        // Calculate average buy vs sell prices (simplified)
        const avgBuyPrice = buyTrades.reduce((sum, t) => sum + (t.price || 0), 0) / buyTrades.length
        const avgSellPrice = sellTrades.reduce((sum, t) => sum + (t.price || 0), 0) / sellTrades.length
        
        if (avgSellPrice > avgBuyPrice * 1.05) {
          generatedInsights.push({
            type: 'positive',
            priority: 'low',
            icon: TrendingUp,
            title: 'Good Entry/Exit Timing',
            message: `Your average sell price was ${((avgSellPrice / avgBuyPrice - 1) * 100).toFixed(1)}% higher than your average buy price.`,
            details: `Average buy: $${avgBuyPrice.toFixed(2)}, Average sell: $${avgSellPrice.toFixed(2)}`,
            category: 'timing'
          })
        }
      }
    }

    // Sort by priority (high -> medium -> low)
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    return generatedInsights.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
  }, [comprehensiveContext, analytics, userPerformance, comparisons, dateRange])

  if (insights.length === 0) {
    return (
      <div className="bg-black/40 rounded-xl p-5 border border-slate-700/50">
        <div className="text-slate-400 text-center py-8">
          <Lightbulb className="w-8 h-8 mx-auto mb-2 text-slate-500" />
          <p>Generating insights...</p>
        </div>
      </div>
    )
  }

  const mainInsight = insights[0]
  const supportingInsights = insights.slice(1)

  return (
    <div className="space-y-6">
      {/* Main Insight Card */}
      {mainInsight && (
        <div className={`bg-gradient-to-br rounded-xl p-6 border-2 ${
          mainInsight.type === 'positive'
            ? 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30'
            : mainInsight.type === 'negative'
            ? 'from-red-500/20 to-red-500/5 border-red-500/30'
            : mainInsight.type === 'warning'
            ? 'from-amber-500/20 to-amber-500/5 border-amber-500/30'
            : 'from-blue-500/20 to-blue-500/5 border-blue-500/30'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${
              mainInsight.type === 'positive'
                ? 'bg-emerald-500/20'
                : mainInsight.type === 'negative'
                ? 'bg-red-500/20'
                : mainInsight.type === 'warning'
                ? 'bg-amber-500/20'
                : 'bg-blue-500/20'
            }`}>
              {mainInsight.icon && (
                <mainInsight.icon className={`w-6 h-6 ${
                  mainInsight.type === 'positive'
                    ? 'text-emerald-400'
                    : mainInsight.type === 'negative'
                    ? 'text-red-400'
                    : mainInsight.type === 'warning'
                    ? 'text-amber-400'
                    : 'text-blue-400'
                }`} />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-xl font-bold text-white">Key Insight</h3>
                <span className={`px-2 py-1 text-xs rounded ${
                  mainInsight.priority === 'high'
                    ? 'bg-red-500/20 text-red-300'
                    : mainInsight.priority === 'medium'
                    ? 'bg-yellow-500/20 text-yellow-300'
                    : 'bg-slate-500/20 text-slate-300'
                }`}>
                  {mainInsight.priority.toUpperCase()}
                </span>
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">{mainInsight.title}</h4>
              <p className="text-slate-300 mb-3">{mainInsight.message}</p>
              {mainInsight.details && (
                <div className="text-sm text-slate-400 bg-black/30 rounded-lg p-3">
                  {Array.isArray(mainInsight.details) ? (
                    <ul className="list-disc list-inside space-y-1">
                      {mainInsight.details.map((detail, idx) => (
                        <li key={idx}>{detail}</li>
                      ))}
                    </ul>
                  ) : (
                    mainInsight.details
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Supporting Insights */}
      {supportingInsights.length > 0 && (
        <div className="bg-black/40 rounded-xl p-5 border border-slate-700/50">
          <h4 className="text-md font-semibold text-white mb-4">Additional Insights</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {supportingInsights.map((insight, idx) => {
              const Icon = insight.icon || Sparkles
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${
                    insight.type === 'positive'
                      ? 'bg-emerald-500/10 border-emerald-500/20'
                      : insight.type === 'negative'
                      ? 'bg-red-500/10 border-red-500/20'
                      : insight.type === 'warning'
                      ? 'bg-amber-500/10 border-amber-500/20'
                      : 'bg-blue-500/10 border-blue-500/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 mt-0.5 ${
                      insight.type === 'positive'
                        ? 'text-emerald-400'
                        : insight.type === 'negative'
                        ? 'text-red-400'
                        : insight.type === 'warning'
                        ? 'text-amber-400'
                        : 'text-blue-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-semibold text-white mb-1">{insight.title}</h5>
                      <p className="text-xs text-slate-400 mb-2">{insight.message}</p>
                      {insight.details && (
                        <div className="text-xs text-slate-500">
                          {Array.isArray(insight.details) ? insight.details[0] : insight.details}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

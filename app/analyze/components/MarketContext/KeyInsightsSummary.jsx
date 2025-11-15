// app/analyze/components/MarketContext/KeyInsightsSummary.jsx
// Top actionable insights displayed prominently at the top

'use client'

import { useMemo } from 'react'
import { 
  TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Target,
  CheckCircle2, XCircle, ArrowRight
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function KeyInsightsSummary({
  comprehensiveContext,
  userPerformance,
  comparisons,
  analytics,
  selectedAsset
}) {
  const keyInsights = useMemo(() => {
    const insights = []

    if (!comprehensiveContext || !userPerformance) return insights

    // 1. Performance vs Market
    if (comparisons.length > 0) {
      const comparison = comparisons[0]
      const outperformance = userPerformance.returnPercent - (comparison.marketReturn || 0)
      
      if (Math.abs(outperformance) > 1) {
        insights.push({
          type: outperformance > 0 ? 'success' : 'warning',
          icon: outperformance > 0 ? TrendingUp : TrendingDown,
          title: outperformance > 0 
            ? `You Beat the Market by ${Math.abs(outperformance).toFixed(1)}%`
            : `Market Outperformed You by ${Math.abs(outperformance).toFixed(1)}%`,
          message: outperformance > 0
            ? `Your ${userPerformance.returnPercent >= 0 ? '+' : ''}${userPerformance.returnPercent.toFixed(1)}% return significantly outperformed the ${comparison.assetName || 'market'} benchmark.`
            : `The market returned ${comparison.marketReturn >= 0 ? '+' : ''}${comparison.marketReturn.toFixed(1)}% while you achieved ${userPerformance.returnPercent >= 0 ? '+' : ''}${userPerformance.returnPercent.toFixed(1)}%.`,
          action: outperformance > 0
            ? 'Consider analyzing what strategies worked during this period'
            : 'Review your trading strategy - market conditions may have been challenging',
          priority: 'high'
        })
      }
    }

    // 2. Market Sentiment Impact
    if (comprehensiveContext?.newsSentiment?.articles?.length > 0) {
      const articles = comprehensiveContext.newsSentiment.articles
      const avgSentiment = articles.reduce((sum, a) => 
        sum + (parseFloat(a.overall_sentiment_score) || 0), 0) / articles.length
      
      const sentimentLabel = avgSentiment > 0.1 ? 'Bullish' : avgSentiment < -0.1 ? 'Bearish' : 'Neutral'
      
      if (Math.abs(avgSentiment) > 0.15) {
        insights.push({
          type: avgSentiment > 0 ? 'info' : 'warning',
          icon: avgSentiment > 0 ? TrendingUp : TrendingDown,
          title: `${sentimentLabel} Market Sentiment During Your Trading Period`,
          message: `News sentiment averaged ${avgSentiment >= 0 ? '+' : ''}${avgSentiment.toFixed(2)} with ${articles.length} articles analyzed.`,
          action: avgSentiment > 0
            ? 'Bullish sentiment may have helped your trades - consider similar conditions'
            : 'Bearish sentiment may have hurt performance - review risk management',
          priority: 'medium'
        })
      }
    }

    // 3. Volatility Impact
    if (comprehensiveContext?.economic?.indicators?.VIXCLS) {
      const vix = parseFloat(comprehensiveContext.economic.indicators.VIXCLS.value || 0)
      
      if (vix > 25) {
        insights.push({
          type: 'warning',
          icon: AlertTriangle,
          title: 'High Volatility Period',
          message: `VIX was ${vix.toFixed(1)} during this period, indicating elevated market stress.`,
          action: 'High volatility can amplify both gains and losses - review your position sizing',
          priority: 'high'
        })
      } else if (vix < 15 && userPerformance.returnPercent < 0) {
        insights.push({
          type: 'info',
          icon: Lightbulb,
          title: 'Low Volatility, Yet Negative Returns',
          message: `VIX was ${vix.toFixed(1)} (low stress) but you still lost money.`,
          action: 'Consider if your strategy works better in volatile conditions',
          priority: 'medium'
        })
      }
    }

    // 4. Win Rate Analysis
    if (userPerformance.winRate !== undefined) {
      const winRate = userPerformance.winRate
      
      if (winRate < 40 && userPerformance.returnPercent > 0) {
        insights.push({
          type: 'success',
          icon: Target,
          title: 'Low Win Rate, But Profitable',
          message: `You achieved ${userPerformance.returnPercent.toFixed(1)}% return with only ${winRate.toFixed(1)}% win rate.`,
          action: 'Your risk-reward ratio is working - you\'re making more on wins than losing on losses',
          priority: 'medium'
        })
      } else if (winRate > 60 && userPerformance.returnPercent < 0) {
        insights.push({
          type: 'warning',
          icon: AlertTriangle,
          title: 'High Win Rate, But Negative Returns',
          message: `You won ${winRate.toFixed(1)}% of trades but still lost ${Math.abs(userPerformance.returnPercent).toFixed(1)}%.`,
          action: 'Review your risk management - losses may be too large relative to wins',
          priority: 'high'
        })
      }
    }

    // Sort by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    return insights.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]).slice(0, 3)
  }, [comprehensiveContext, userPerformance, comparisons, analytics, selectedAsset])

  if (keyInsights.length === 0) {
    return null
  }

  const getTypeStyles = (type) => {
    switch (type) {
      case 'success':
        return {
          border: 'border-emerald-500/30',
          bg: 'bg-emerald-500/10',
          iconColor: 'text-emerald-400',
          badge: 'profit'
        }
      case 'warning':
        return {
          border: 'border-yellow-500/30',
          bg: 'bg-yellow-500/10',
          iconColor: 'text-yellow-400',
          badge: 'warning'
        }
      case 'info':
        return {
          border: 'border-blue-500/30',
          bg: 'bg-blue-500/10',
          iconColor: 'text-blue-400',
          badge: 'default'
        }
      default:
        return {
          border: 'border-slate-700/50',
          bg: 'bg-black/40',
          iconColor: 'text-slate-400',
          badge: 'default'
        }
    }
  }

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-purple-400" />
        <h2 className="text-lg font-bold text-white">Key Insights</h2>
        <Badge variant="default" className="ml-2">
          {keyInsights.length} insights
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {keyInsights.map((insight, idx) => {
          const styles = getTypeStyles(insight.type)
          const Icon = insight.icon
          
          return (
            <Card 
              key={idx}
              className={`${styles.bg} ${styles.border} border hover:border-opacity-50 transition-all`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 ${styles.bg} rounded-lg`}>
                    <Icon className={`w-5 h-5 ${styles.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-white text-sm leading-tight">
                        {insight.title}
                      </h3>
                      <Badge variant={styles.badge} className="text-xs flex-shrink-0">
                        {insight.priority === 'high' ? 'High' : 'Medium'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                      {insight.message}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-300 pt-2 border-t border-slate-700/50">
                      <ArrowRight className="w-3 h-3" />
                      <span className="italic">{insight.action}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

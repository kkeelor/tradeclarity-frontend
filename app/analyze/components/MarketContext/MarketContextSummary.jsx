// app/analyze/components/MarketContext/MarketContextSummary.jsx
// PHASE 7 TASK 7.1: Compact Summary Dashboard

'use client'

import { useMemo, memo } from 'react'
import { DollarSign, TrendingUp, TrendingDown, Activity, Target, BarChart3, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

/**
 * PHASE 7 TASK 7.1: Compact Summary Dashboard
 * Shows key metrics at-a-glance with progress bars and badges
 */
function MarketContextSummary({
  comprehensiveContext,
  realTimePrices,
  detectedAssets,
  userPerformance,
  comparisons,
  onViewDetails
}) {
  // Get current price
  const currentPrice = useMemo(() => {
    const primaryInstrument = detectedAssets?.instruments?.[0]
    if (!primaryInstrument) return null
    
    if (realTimePrices[primaryInstrument]) {
      return realTimePrices[primaryInstrument]
    }
    if (comprehensiveContext?.price?.data?.[primaryInstrument]) {
      const data = comprehensiveContext.price.data[primaryInstrument]
      return {
        price: parseFloat(data.value || 0),
        changePercent: 0
      }
    }
    return null
  }, [comprehensiveContext, realTimePrices, detectedAssets])

  // Calculate market sentiment
  const marketSentiment = useMemo(() => {
    if (!comprehensiveContext?.newsSentiment?.articles) return null
    
    const articles = comprehensiveContext.newsSentiment.articles
    if (articles.length === 0) return null
    
    const avgSentiment = articles.reduce((sum, a) => 
      sum + (parseFloat(a.overall_sentiment_score) || 0), 0) / articles.length
    
    return {
      score: avgSentiment,
      label: avgSentiment > 0.1 ? 'Bullish' : avgSentiment < -0.1 ? 'Bearish' : 'Neutral',
      color: avgSentiment > 0.1 ? 'emerald' : avgSentiment < -0.1 ? 'red' : 'yellow',
      articleCount: articles.length
    }
  }, [comprehensiveContext])

  // Get VIX data
  const vixData = useMemo(() => {
    if (!comprehensiveContext?.economic?.indicators?.VIXCLS) return null
    
    const vix = comprehensiveContext.economic.indicators.VIXCLS
    const vixValue = parseFloat(vix.value || 0)
    
    return {
      value: vixValue,
      status: vixValue > 30 ? 'High Stress' : vixValue > 20 ? 'Elevated' : 'Normal',
      color: vixValue > 30 ? 'red' : vixValue > 20 ? 'yellow' : 'emerald',
      // VIX progress: 0-50 scale (normalize to 0-100%)
      progress: Math.min((vixValue / 50) * 100, 100)
    }
  }, [comprehensiveContext])

  // User performance metrics
  const performanceMetrics = useMemo(() => {
    if (!userPerformance) return null

    const winRate = userPerformance.winRate || 0
    const roi = userPerformance.returnPercent || 0
    
    return {
      winRate: {
        value: winRate,
        progress: winRate, // Already 0-100
        color: winRate >= 60 ? 'emerald' : winRate >= 40 ? 'yellow' : 'red',
        label: winRate >= 60 ? 'Excellent' : winRate >= 40 ? 'Good' : 'Needs Improvement'
      },
      roi: {
        value: roi,
        // Normalize ROI to 0-100% progress (assuming -50% to +50% range)
        progress: Math.max(0, Math.min(100, ((roi + 50) / 100) * 100)),
        color: roi > 10 ? 'emerald' : roi > 0 ? 'yellow' : 'red',
        label: roi > 10 ? 'Strong' : roi > 0 ? 'Positive' : 'Negative'
      }
    }
  }, [userPerformance])

  // Sentiment progress (normalize -1 to +1 to 0-100%)
  const sentimentProgress = marketSentiment 
    ? Math.max(0, Math.min(100, ((marketSentiment.score + 1) / 2) * 100))
    : 50

  return (
    <div className="space-y-4">
      {/* Key Metrics Grid - Compact Layout */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Current Price - Compact */}
        {currentPrice && (
          <Card className="bg-black/40 border-slate-700/50 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">Price</span>
              <DollarSign className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-white mb-1">
              ${parseFloat(currentPrice.price || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
            {currentPrice.changePercent !== undefined && currentPrice.changePercent !== 0 && (
              <div className={`text-xs flex items-center gap-1 ${
                currentPrice.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {currentPrice.changePercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(currentPrice.changePercent).toFixed(1)}%
              </div>
            )}
          </Card>
        )}

        {/* Market Sentiment - With Progress Bar */}
        {marketSentiment && (
          <Card className="bg-black/40 border-slate-700/50 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">Sentiment</span>
              <Badge 
                variant={marketSentiment.color === 'emerald' ? 'profit' : marketSentiment.color === 'red' ? 'loss' : 'warning'}
                className="text-xs"
              >
                {marketSentiment.label}
              </Badge>
            </div>
            <div className="text-lg font-bold text-white mb-2">
              {marketSentiment.score >= 0 ? '+' : ''}{marketSentiment.score.toFixed(2)}
            </div>
            <Progress 
              value={sentimentProgress} 
              className="h-1.5 bg-slate-700 [&>div]:bg-purple-400"
            />
            <div className="text-xs text-slate-500 mt-1">{marketSentiment.articleCount} articles</div>
          </Card>
        )}

        {/* VIX - With Progress Bar */}
        {vixData && (
          <Card className="bg-black/40 border-slate-700/50 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">VIX</span>
              <Activity className="w-3 h-3 text-blue-400" />
            </div>
            <div className="text-lg font-bold text-white mb-2">{vixData.value.toFixed(1)}</div>
            <Progress 
              value={vixData.progress} 
              className={`h-1.5 bg-slate-700 ${
                vixData.color === 'red' ? '[&>div]:bg-red-400' :
                vixData.color === 'yellow' ? '[&>div]:bg-yellow-400' :
                '[&>div]:bg-emerald-400'
              }`}
            />
            <div className={`text-xs mt-1 ${
              vixData.color === 'red' ? 'text-red-400' :
              vixData.color === 'yellow' ? 'text-yellow-400' :
              'text-emerald-400'
            }`}>
              {vixData.status}
            </div>
          </Card>
        )}

        {/* User Performance - With Progress Bar */}
        {performanceMetrics && (
          <Card className="bg-black/40 border-slate-700/50 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">Your ROI</span>
              <Target className="w-3 h-3 text-amber-400" />
            </div>
            <div className={`text-lg font-bold mb-2 ${
              performanceMetrics.roi.color === 'emerald' ? 'text-emerald-400' :
              performanceMetrics.roi.color === 'red' ? 'text-red-400' :
              'text-yellow-400'
            }`}>
              {performanceMetrics.roi.value >= 0 ? '+' : ''}{performanceMetrics.roi.value.toFixed(1)}%
            </div>
            <Progress 
              value={performanceMetrics.roi.progress} 
              className={`h-1.5 bg-slate-700 ${
                performanceMetrics.roi.color === 'emerald' ? '[&>div]:bg-emerald-400' :
                performanceMetrics.roi.color === 'red' ? '[&>div]:bg-red-400' :
                '[&>div]:bg-yellow-400'
              }`}
            />
            <div className="text-xs text-slate-500 mt-1">{performanceMetrics.roi.label}</div>
          </Card>
        )}
      </div>

      {/* Performance Metrics Row - Win Rate & Comparison */}
      {performanceMetrics && comparisons.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Win Rate */}
          <Card className="bg-black/40 border-slate-700/50 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">Win Rate</span>
              <Badge 
                variant={performanceMetrics.winRate.color === 'emerald' ? 'profit' : performanceMetrics.winRate.color === 'red' ? 'loss' : 'warning'}
                className="text-xs"
              >
                {performanceMetrics.winRate.label}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className={`text-2xl font-bold ${
                performanceMetrics.winRate.color === 'emerald' ? 'text-emerald-400' :
                performanceMetrics.winRate.color === 'red' ? 'text-red-400' :
                'text-yellow-400'
              }`}>
                {performanceMetrics.winRate.value.toFixed(0)}%
              </div>
              <div className="flex-1">
                <Progress 
                  value={performanceMetrics.winRate.progress} 
                  className={`h-2 bg-slate-700 ${
                    performanceMetrics.winRate.color === 'emerald' ? '[&>div]:bg-emerald-400' :
                    performanceMetrics.winRate.color === 'red' ? '[&>div]:bg-red-400' :
                    '[&>div]:bg-yellow-400'
                  }`}
                />
              </div>
            </div>
          </Card>

          {/* Market Comparison */}
          <Card className="bg-black/40 border-slate-700/50 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">vs {comparisons[0]?.assetName || 'Market'}</span>
              {comparisons[0]?.outperformed ? (
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
            </div>
            <div className={`text-2xl font-bold mb-1 ${
              comparisons[0]?.outperformed ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {comparisons[0]?.difference >= 0 ? '+' : ''}{comparisons[0]?.difference?.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-500">
              {comparisons[0]?.outperformed ? 'Outperforming' : 'Underperforming'}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

export default memo(MarketContextSummary)

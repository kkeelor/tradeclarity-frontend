// app/analyze/components/MarketContext/CurrentMarketState.jsx
// Task 1.3: Current Market State Cards
// PHASE 7 TASK 7.4: Updated to use MetricCard with progress bars

'use client'

import { DollarSign, Activity, Newspaper, Target, TrendingUp, TrendingDown } from 'lucide-react'
import { useMemo, memo } from 'react'
import { MetricCard, StatusCard } from './MetricCard'

function CurrentMarketState({
  comprehensiveContext,
  realTimePrices,
  detectedAssets,
  userPerformance,
  comparisons
}) {
  // Get current price data
  const getCurrentPrice = (instrument) => {
    if (realTimePrices[instrument]) {
      return realTimePrices[instrument]
    }
    if (comprehensiveContext?.price?.data?.[instrument]) {
      const data = comprehensiveContext.price.data[instrument]
      return {
        price: parseFloat(data.value) || 0,
        changePercent: 0,
        timestamp: new Date().toISOString()
      }
    }
    return null
  }

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
      trend: vix.changePercent ? (parseFloat(vix.changePercent) >= 0 ? 'up' : 'down') : null
    }
  }, [comprehensiveContext])

  // Get primary instrument price
  const primaryInstrument = detectedAssets?.instruments?.[0]
  const priceData = primaryInstrument ? getCurrentPrice(primaryInstrument) : null

  // Calculate sentiment progress (normalize -1 to +1 to 0-100%)
  const sentimentProgress = marketSentiment 
    ? Math.max(0, Math.min(100, ((marketSentiment.score + 1) / 2) * 100))
    : null

  // Calculate VIX progress (0-50 scale normalized to 0-100%)
  const vixProgress = vixData 
    ? Math.min((vixData.value / 50) * 100, 100)
    : null

  // Calculate ROI progress (normalize -50% to +50% to 0-100%)
  const roiProgress = userPerformance && comparisons.length > 0
    ? Math.max(0, Math.min(100, ((userPerformance.returnPercent + 50) / 100) * 100))
    : null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Current Price Card */}
      {primaryInstrument && priceData && (
        <MetricCard
          title="Current Price"
          value={priceData.price}
          valueFormat="currency"
          icon={DollarSign}
          color={priceData.changePercent >= 0 ? 'emerald' : 'red'}
          badgeLabel={priceData.changePercent >= 0 ? 'Up' : 'Down'}
          badgeVariant={priceData.changePercent >= 0 ? 'profit' : 'loss'}
          subtitle={`${priceData.changePercent >= 0 ? '+' : ''}${priceData.changePercent.toFixed(2)}% • ${primaryInstrument}`}
          tooltip="Current market price of the selected asset with 24h change percentage"
        />
      )}

      {/* Market Sentiment Card */}
      {marketSentiment && (
        <MetricCard
          title="Market Sentiment"
          value={marketSentiment.score}
          valueFormat="default"
          progress={sentimentProgress}
          color={marketSentiment.color}
          badgeLabel={marketSentiment.label}
          badgeVariant={marketSentiment.color === 'emerald' ? 'profit' : marketSentiment.color === 'red' ? 'loss' : 'warning'}
          icon={Newspaper}
          subtitle={`${marketSentiment.articleCount} articles analyzed`}
          tooltip="Average sentiment score from news articles. Positive values indicate bullish sentiment, negative values indicate bearish sentiment."
        />
      )}

      {/* VIX Card */}
      {vixData && (
        <StatusCard
          title="Volatility (VIX)"
          status={vixData.value.toFixed(1)}
          statusLabel={vixData.status}
          icon={Activity}
          color={vixData.color}
          tooltip="VIX (Volatility Index) measures market fear and expected volatility. Values above 30 indicate high stress, 20-30 is elevated, below 20 is normal."
        />
      )}

      {/* Your Performance Card */}
      {userPerformance && comparisons.length > 0 && (
        <MetricCard
          title="Your Performance"
          value={userPerformance.returnPercent}
          valueFormat="percent"
          progress={roiProgress}
          color={userPerformance.returnPercent >= 0 ? 'emerald' : 'red'}
          badgeLabel={comparisons[0]?.outperformed ? 'Beat Market' : 'Under Market'}
          badgeVariant={comparisons[0]?.outperformed ? 'profit' : 'loss'}
          icon={Target}
          subtitle={`vs ${comparisons[0]?.assetName || 'Market'}`}
          tooltip="Your return on investment compared to market performance. Shows whether you outperformed or underperformed the market."
        />
      )}
    </div>
  )
}

export default memo(CurrentMarketState)

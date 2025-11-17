// app/analyze/components/EnhancedMarketInsights.js
// Enhanced Market Insights with personalized context and crypto indicators

'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Activity, DollarSign, BarChart3, Loader2, AlertTriangle, Info, Sparkles, Zap, Target } from 'lucide-react'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

/**
 * Enhanced Market Insights Component
 * Shows personalized market context, crypto indicators, and timing insights
 */
export default function EnhancedMarketInsights({ analytics, allTrades, tradesStats }) {
  const [marketData, setMarketData] = useState(null)
  const [cryptoIndicators, setCryptoIndicators] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchMarketData()
  }, [])

  const fetchMarketData = async () => {
    try {
      setLoading(true)
      
      // Fetch FRED indicators (traditional markets)
      const fredResponse = await fetch(`${BACKEND_URL}/api/context/fred/latest`)
      const fredData = await fredResponse.json()
      
      // Fetch crypto indicators (if available)
      let cryptoData = null
      try {
        const cryptoResponse = await fetch(`${BACKEND_URL}/api/context/crypto/indicators`)
        if (cryptoResponse.ok) {
          cryptoData = await cryptoResponse.json()
        }
      } catch (e) {
        // Crypto API might not be available, that's okay
      }

      setMarketData(fredData.success ? fredData.indicators : null)
      setCryptoIndicators(cryptoData?.success ? cryptoData.indicators : null)
    } catch (err) {
      console.error('Error fetching market data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
        <span className="text-xs text-slate-400 ml-2">Loading market insights...</span>
      </div>
    )
  }

  if (error) {
    return null // Fail silently
  }

  // Extract user's most traded symbols
  const userSymbols = extractUserSymbols(allTrades)
  
  // Calculate market timing insights
  const timingInsights = calculateTimingInsights(analytics, marketData, cryptoIndicators)
  
  // Calculate volatility context
  const volatilityContext = calculateVolatilityContext(analytics, marketData)

  return (
    <div className="space-y-4">
      {/* Hero Insight - Most Compelling */}
      {timingInsights && timingInsights.currentAlignment >= 70 && (
        <div className="relative p-4 rounded-xl bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent border-l-4 border-emerald-500/60">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-emerald-300 mb-1">Perfect Market Timing</div>
              <div className="text-[11px] text-slate-200 leading-relaxed mb-2">
                Current market conditions align {timingInsights.currentAlignment.toFixed(0)}% with your historical best performance periods
              </div>
              <div className="flex items-center gap-2 text-[10px] text-emerald-400/80">
                <div className="flex items-center gap-1">
                  {timingInsights.bestConditions.slice(0, 2).map((condition, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30">
                      {condition}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 text-right">
              <div className="text-lg font-bold text-emerald-400">{timingInsights.currentAlignment.toFixed(0)}%</div>
              <div className="text-[9px] text-emerald-400/60">Match</div>
            </div>
          </div>
        </div>
      )}

      {/* Personalized Market Context */}
      {timingInsights && timingInsights.currentAlignment < 70 && (
        <MarketTimingCard insights={timingInsights} analytics={analytics} />
      )}

      {/* Enhanced Market Indicators Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold text-emerald-400/80 uppercase tracking-wider">Live Market Data</p>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] text-slate-500">Real-time</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {/* Traditional Market Indicators */}
          {marketData && (
            <>
              {marketData.VIXCLS && (
                <IndicatorCard
                  label="VIX"
                  value={marketData.VIXCLS.value.toFixed(1)}
                  changePercent={marketData.VIXCLS.changePercent}
                  icon={Activity}
                  description="Volatility Index"
                  isHigh={marketData.VIXCLS.value > 25}
                  isLow={marketData.VIXCLS.value < 15}
                />
              )}
              {marketData.DFF && (
                <IndicatorCard
                  label="Fed Rate"
                  value={`${marketData.DFF.value.toFixed(2)}%`}
                  changePercent={marketData.DFF.changePercent}
                  icon={DollarSign}
                  description="Federal Funds Rate"
                />
              )}
              {marketData.DGS10 && (
                <IndicatorCard
                  label="10Y Treasury"
                  value={`${marketData.DGS10.value.toFixed(2)}%`}
                  changePercent={marketData.DGS10.changePercent}
                  icon={BarChart3}
                  description="10-Year Yield"
                />
              )}
              {marketData.SP500 && (
                <IndicatorCard
                  label="S&P 500"
                  value={marketData.SP500.value.toFixed(0)}
                  changePercent={marketData.SP500.changePercent}
                  icon={TrendingUp}
                  description="S&P 500 Index"
                />
              )}
            </>
          )}

          {/* Crypto Indicators */}
          {cryptoIndicators && (
            <>
              {cryptoIndicators.BTC_DOMINANCE && (
                <IndicatorCard
                  label="BTC Dominance"
                  value={`${cryptoIndicators.BTC_DOMINANCE.value.toFixed(1)}%`}
                  changePercent={cryptoIndicators.BTC_DOMINANCE.changePercent}
                  icon={Activity}
                  description="Bitcoin Market Share"
                  isHigh={cryptoIndicators.BTC_DOMINANCE.value > 50}
                  isLow={cryptoIndicators.BTC_DOMINANCE.value < 40}
                />
              )}
              {cryptoIndicators.ETH_BTC_RATIO && (
                <IndicatorCard
                  label="ETH/BTC"
                  value={cryptoIndicators.ETH_BTC_RATIO.value.toFixed(4)}
                  changePercent={cryptoIndicators.ETH_BTC_RATIO.changePercent}
                  icon={BarChart3}
                  description="Ethereum/Bitcoin Ratio"
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Volatility Context Alert */}
      {volatilityContext && volatilityContext.shouldAlert && (
        <VolatilityAlert context={volatilityContext} userSymbols={userSymbols} />
      )}

      {/* Market Condition Summary */}
      {timingInsights && timingInsights.marketCondition && (
        <MarketConditionSummary condition={timingInsights.marketCondition} />
      )}
    </div>
  )
}

/**
 * Market Timing Card - Shows when market conditions align with user's best performance
 */
function MarketTimingCard({ insights, analytics }) {
  if (!insights || !insights.hasTimingData) return null

  const { bestConditions, currentAlignment, recommendation } = insights

  if (!bestConditions || bestConditions.length === 0) return null

  const alignmentPercent = currentAlignment || 0
  const isGoodAlignment = alignmentPercent >= 70
  const isModerateAlignment = alignmentPercent >= 50 && alignmentPercent < 70

  return (
    <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-l-2 border-emerald-500/40 transition-all">
      <div className="flex items-start gap-2 mb-2">
        <Target className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-semibold text-emerald-300 mb-1">Market Timing Insight</div>
          <div className="text-[10px] text-slate-300 leading-relaxed mb-2">
            {recommendation || `Your best performance aligns ${alignmentPercent.toFixed(0)}% with current market conditions`}
          </div>
          
          {bestConditions.length > 0 && (
            <div className="space-y-1">
              {bestConditions.slice(0, 2).map((condition, idx) => (
                <div key={idx} className="text-[9px] text-slate-400 flex items-center gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${isGoodAlignment ? 'bg-emerald-400' : isModerateAlignment ? 'bg-amber-400' : 'bg-slate-500'}`} />
                  {condition}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={`text-xs font-bold flex-shrink-0 ${isGoodAlignment ? 'text-emerald-400' : isModerateAlignment ? 'text-amber-400' : 'text-slate-400'}`}>
          {alignmentPercent.toFixed(0)}%
        </div>
      </div>
    </div>
  )
}

/**
 * Indicator Card Component
 */
function IndicatorCard({ label, value, changePercent, icon: Icon, description, isHigh, isLow }) {
  const changeValue = changePercent ? parseFloat(changePercent) : null
  const isPositive = changeValue !== null && changeValue > 0
  const isNegative = changeValue !== null && changeValue < 0

  return (
    <div className={`p-2.5 rounded-lg border-l-2 transition-all ${
      isHigh ? 'border-red-500/40 bg-gradient-to-r from-red-500/10 to-transparent' :
      isLow ? 'border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 to-transparent' :
      'border-slate-500/20 bg-slate-500/5 hover:bg-slate-500/10'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-1.5 flex-1 min-w-0">
          <Icon className={`w-3 h-3 flex-shrink-0 mt-0.5 ${
            isHigh ? 'text-red-400' :
            isLow ? 'text-emerald-400' :
            'text-slate-400'
          }`} />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-slate-400 mb-0.5">{label}</div>
            <div className={`text-xs font-semibold ${
              isHigh ? 'text-red-300' :
              isLow ? 'text-emerald-300' :
              'text-slate-200'
            }`}>
              {value}
            </div>
            {description && (
              <div className="text-[9px] text-slate-500 mt-0.5">{description}</div>
            )}
          </div>
        </div>
        {changePercent !== null && (
          <div className={`flex items-center gap-0.5 flex-shrink-0 ${
            isPositive ? 'text-emerald-400' : 
            isNegative ? 'text-red-400' : 
            'text-slate-400'
          }`}>
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : isNegative ? (
              <TrendingDown className="w-3 h-3" />
            ) : null}
            <span className="text-[10px] font-medium">
              {isPositive ? '+' : ''}{changeValue.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Volatility Alert Component
 */
function VolatilityAlert({ context, userSymbols }) {
  const { level, message, impact } = context

  const isHigh = level === 'high'
  const isExtreme = level === 'extreme'

  return (
    <div className={`p-3 rounded-xl border-l-2 transition-all ${
      isExtreme ? 'border-red-500/50 bg-gradient-to-r from-red-500/10 to-transparent' :
      isHigh ? 'border-amber-500/50 bg-gradient-to-r from-amber-500/10 to-transparent' :
      'border-slate-500/20 bg-slate-500/5'
    }`}>
      <div className="flex items-start gap-2">
        <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${
          isExtreme ? 'text-red-400' :
          isHigh ? 'text-amber-400' :
          'text-slate-400'
        }`} />
        <div className="flex-1 min-w-0">
          <div className={`text-[10px] font-semibold mb-1 ${
            isExtreme ? 'text-red-300' :
            isHigh ? 'text-amber-300' :
            'text-slate-300'
          }`}>
            {isExtreme ? 'Extreme Volatility' : 'High Volatility'} Alert
          </div>
          <div className="text-[10px] text-slate-300 leading-relaxed mb-1">
            {message}
          </div>
          {userSymbols.length > 0 && (
            <div className="text-[9px] text-slate-400 mt-1">
              Your symbols: {userSymbols.slice(0, 3).join(', ')}{userSymbols.length > 3 ? '...' : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Market Condition Summary
 */
function MarketConditionSummary({ condition }) {
  const { label, description, sentiment } = condition
  const isBullish = sentiment === 'bullish'
  const isBearish = sentiment === 'bearish'
  const isNeutral = sentiment === 'neutral'

  return (
    <div className={`p-2.5 rounded-lg border-l-2 transition-all ${
      isBullish ? 'border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 to-transparent' :
      isBearish ? 'border-red-500/40 bg-gradient-to-r from-red-500/10 to-transparent' :
      'border-slate-500/20 bg-slate-500/5'
    }`}>
      <div className="flex items-start gap-2">
        <Info className={`w-3 h-3 flex-shrink-0 mt-0.5 ${
          isBullish ? 'text-emerald-400' :
          isBearish ? 'text-red-400' :
          'text-slate-400'
        }`} />
        <div className="flex-1 min-w-0">
          <div className={`text-[10px] font-semibold mb-0.5 ${
            isBullish ? 'text-emerald-300' :
            isBearish ? 'text-red-300' :
            'text-slate-300'
          }`}>
            {label}
          </div>
          <div className="text-[9px] text-slate-400 leading-relaxed">
            {description}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Extract user's most traded symbols from trades
 */
function extractUserSymbols(allTrades) {
  if (!allTrades || !Array.isArray(allTrades)) return []
  
  const symbolCounts = {}
  allTrades.forEach(trade => {
    if (trade.symbol) {
      symbolCounts[trade.symbol] = (symbolCounts[trade.symbol] || 0) + 1
    }
  })
  
  return Object.entries(symbolCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([symbol]) => symbol)
}

/**
 * Calculate market timing insights based on user's performance and current market conditions
 */
function calculateTimingInsights(analytics, marketData, cryptoIndicators) {
  if (!analytics || !marketData) return null

  // Simple heuristic: Check if current market conditions match historical best performance
  // This is a placeholder - can be enhanced with actual historical analysis
  
  const vix = marketData.VIXCLS?.value
  const fedRate = marketData.DFF?.value
  
  if (!vix && !fedRate) return null

  // Determine market condition
  let marketCondition = {
    label: 'Neutral Market',
    description: 'Mixed signals from market indicators',
    sentiment: 'neutral'
  }

  if (vix) {
    if (vix > 25) {
      marketCondition = {
        label: 'High Volatility',
        description: 'VIX above 25 indicates elevated market stress',
        sentiment: 'bearish'
      }
    } else if (vix < 15) {
      marketCondition = {
        label: 'Low Volatility',
        description: 'VIX below 15 suggests calm market conditions',
        sentiment: 'bullish'
      }
    }
  }

  // Calculate alignment (simplified - can be enhanced with actual performance correlation)
  const alignment = 65 // Placeholder - would calculate based on historical performance

  return {
    hasTimingData: true,
    bestConditions: [
      vix < 20 ? 'Low volatility periods' : null,
      fedRate < 5 ? 'Lower interest rate environment' : null
    ].filter(Boolean),
    currentAlignment: alignment,
    recommendation: alignment >= 70 
      ? 'Current market conditions align well with your historical best performance'
      : alignment >= 50
      ? 'Market conditions are moderately favorable'
      : 'Consider being more cautious - market conditions differ from your best periods',
    marketCondition
  }
}

/**
 * Calculate volatility context based on market indicators
 */
function calculateVolatilityContext(analytics, marketData) {
  if (!marketData || !marketData.VIXCLS) return null

  const vix = marketData.VIXCLS.value
  const vixChange = marketData.VIXCLS.changePercent ? parseFloat(marketData.VIXCLS.changePercent) : 0

  if (vix > 30 || (vix > 25 && vixChange > 10)) {
    return {
      level: 'extreme',
      message: 'Extreme volatility detected. Consider reducing position sizes and tightening risk management.',
      impact: 'high',
      shouldAlert: true
    }
  }

  if (vix > 20 || (vix > 18 && vixChange > 5)) {
    return {
      level: 'high',
      message: 'Elevated volatility detected. Market conditions may be more unpredictable than usual.',
      impact: 'medium',
      shouldAlert: true
    }
  }

  return null
}

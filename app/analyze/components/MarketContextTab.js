// app/analyze/components/MarketContextTab.js
// Revamped Market Context tab using comprehensive context API
// Based on MARKET_CONTEXT_UX_PLAN.md

'use client'

import { useState, useEffect } from 'react'
import { 
  Globe, Loader2, AlertCircle, Calendar, Sparkles, Target, Zap, 
  TrendingUp, TrendingDown, BarChart3, Newspaper, Activity, 
  DollarSign, X, Maximize2, Clock, TrendingUp as TrendingUpIcon 
} from 'lucide-react'
import { 
  AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, BarChart, Bar, ComposedChart, ReferenceLine, 
  ReferenceDot, Cell, Legend 
} from 'recharts'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  calculateBenchmarkPerformance, 
  extractTradingTimeline, 
  calculateUserPerformance, 
  comparePerformance 
} from '../utils/performanceComparisons'
import { detectAssets, getComprehensiveContext } from '@/lib/marketContext'
import { getWebSocketClient } from '@/lib/coindeskWebSocket'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

export default function MarketContextTab({ analytics }) {
  // Core state
  const [normalizedData, setNormalizedData] = useState(null)
  const [detectedAssets, setDetectedAssets] = useState(null)
  const [comprehensiveContext, setComprehensiveContext] = useState(null)
  const [loading, setLoading] = useState({ comprehensive: true, assets: false })
  const [error, setError] = useState({ comprehensive: null, assets: null })
  
  // Time period state
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [selectedPeriod, setSelectedPeriod] = useState('custom') // 'custom', '7d', '30d', '90d', 'trade-range', 'drawdown'
  
  // Real-time WebSocket state
  const [wsStatus, setWsStatus] = useState('disconnected')
  const [realTimePrices, setRealTimePrices] = useState({})
  
  // Performance & insights
  const [userPerformance, setUserPerformance] = useState(null)
  const [benchmarks, setBenchmarks] = useState(null)
  const [comparisons, setComparisons] = useState([])
  const [tradingTimeline, setTradingTimeline] = useState(null)
  const [insights, setInsights] = useState([])
  
  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [expandedChart, setExpandedChart] = useState(null)

  // Initialize: Reconstruct normalized data from analytics
  useEffect(() => {
    if (!analytics) return

    const normalized = {
      spotTrades: [],
      futuresIncome: [],
      futuresPositions: [],
      metadata: analytics.metadata || {}
    }

    // Extract from allTrades
    if (analytics.allTrades && Array.isArray(analytics.allTrades)) {
      analytics.allTrades.forEach(trade => {
        if (trade.type === 'spot' || trade.accountType === 'spot') {
          normalized.spotTrades.push({
            symbol: trade.symbol,
            qty: String(trade.quantity || trade.qty || 0),
            price: String(trade.price || 0),
            quoteQty: String(trade.value || trade.price * (trade.quantity || trade.qty) || 0),
            commission: String(trade.commission || 0),
            commissionAsset: trade.commissionAsset || 'USDT',
            isBuyer: trade.side === 'buy' || trade.isBuyer === true,
            isMaker: trade.isMaker || false,
            time: trade.timestamp || trade.time,
            orderId: trade.orderId || '',
            id: trade.id || '',
            accountType: 'SPOT'
          })
        } else if (trade.type === 'futures' || trade.accountType === 'futures') {
          if (trade.income || trade.realizedPnL) {
            normalized.futuresIncome.push({
              symbol: trade.symbol,
              income: String(trade.income || trade.realizedPnL || 0),
              incomeType: 'REALIZED_PNL',
              time: trade.timestamp || trade.time,
              ...trade
            })
          }
        }
      })
    }

    // Check for rawData
    if (analytics.rawData) {
      if (analytics.rawData.spotTrades) normalized.spotTrades = analytics.rawData.spotTrades
      if (analytics.rawData.futuresIncome) normalized.futuresIncome = analytics.rawData.futuresIncome
      if (analytics.rawData.futuresPositions) normalized.futuresPositions = analytics.rawData.futuresPositions
    }

    setNormalizedData(normalized)
    
    // Set initial date range to trade range
    if (analytics?.metadata?.oldestTrade && analytics?.metadata?.newestTrade) {
      const oldest = new Date(analytics.metadata.oldestTrade).toISOString().split('T')[0]
      const newest = new Date(analytics.metadata.newestTrade).toISOString().split('T')[0]
      setDateRange({ start: oldest, end: newest })
      setSelectedPeriod('trade-range')
    }
  }, [analytics])

  // Detect assets - optimized to send only symbols
  useEffect(() => {
    if (!normalizedData) return

    const detectUserAssets = async () => {
      try {
        setLoading(prev => ({ ...prev, assets: true }))
        
        // Create minimal payload - only symbols needed for asset detection
        const minimalData = {
          spotTrades: (normalizedData.spotTrades || []).map(t => ({ symbol: t.symbol })),
          futuresIncome: (normalizedData.futuresIncome || []).map(t => ({ symbol: t.symbol })),
          futuresUserTrades: (normalizedData.futuresUserTrades || []).map(t => ({ symbol: t.symbol })),
          metadata: normalizedData.metadata || {}
        }
        
        const { detectAssets } = await import('@/lib/marketContext')
        const assetData = await detectAssets(minimalData)
        if (assetData.success) {
          setDetectedAssets(assetData)
        }
      } catch (error) {
        console.error('Error detecting assets:', error)
        setError(prev => ({ ...prev, assets: error.message }))
      } finally {
        setLoading(prev => ({ ...prev, assets: false }))
      }
    }

    detectUserAssets()
  }, [normalizedData])

  // Fetch comprehensive context (default behavior, not toggle)
  // Optimized: Only send instruments if available, minimal normalizedData
  useEffect(() => {
    if (!dateRange.start || !dateRange.end) return
    // Wait for assets to be detected if we don't have them yet
    if (!detectedAssets && normalizedData) return

    const fetchComprehensive = async () => {
      try {
        setLoading(prev => ({ ...prev, comprehensive: true }))
        
        // If we have detected assets, use them directly (no need to send all trade data)
        // Otherwise, send minimal data for asset detection (limit to 100 trades to reduce payload)
        const payload = detectedAssets?.instruments && detectedAssets.instruments.length > 0
          ? {
              instruments: detectedAssets.instruments,
              startDate: dateRange.start,
              endDate: dateRange.end
            }
          : normalizedData
          ? {
              normalizedData: {
                spotTrades: (normalizedData.spotTrades || []).slice(0, 100).map(t => ({ symbol: t.symbol })),
                futuresIncome: (normalizedData.futuresIncome || []).slice(0, 100).map(t => ({ symbol: t.symbol })),
                metadata: normalizedData.metadata || {}
              },
              startDate: dateRange.start,
              endDate: dateRange.end
            }
          : {
              instruments: ['BTC-USD'], // Fallback to BTC if no data
              startDate: dateRange.start,
              endDate: dateRange.end
            }
        
        const context = await getComprehensiveContext(payload)

        if (context.success) {
          setComprehensiveContext(context.context)
          generateInsights(context.context)
        }
      } catch (error) {
        console.error('Error fetching comprehensive context:', error)
        setError(prev => ({ ...prev, comprehensive: error.message }))
      } finally {
        setLoading(prev => ({ ...prev, comprehensive: false }))
      }
    }

    fetchComprehensive()
  }, [dateRange, detectedAssets])

  // WebSocket for real-time prices
  useEffect(() => {
    if (!normalizedData || !detectedAssets?.instruments || detectedAssets.instruments.length === 0) {
      setWsStatus('disconnected')
      return
    }

    const wsClient = getWebSocketClient()
    setWsStatus('connecting')
    
    const handlePriceUpdate = (data) => {
      if (data.type === 'price_update' && data.instrument) {
        setRealTimePrices(prev => ({
          ...prev,
          [data.instrument]: {
            price: data.data?.value || data.price,
            change: data.change || 0,
            changePercent: data.changePercent || 0,
            timestamp: data.timestamp || new Date().toISOString()
          }
        }))
      }
    }

    wsClient.connect(
      normalizedData,
      handlePriceUpdate,
      (err) => { console.error('WS error:', err); setWsStatus('error') },
      () => { setWsStatus('connected') },
      () => { setWsStatus('disconnected') }
    )

    return () => {
      wsClient.disconnect()
      setWsStatus('disconnected')
    }
  }, [normalizedData, detectedAssets])

  // Extract trading timeline
  useEffect(() => {
    if (analytics && dateRange.start && dateRange.end) {
      const timeline = extractTradingTimeline(analytics)
      setTradingTimeline(timeline)
      const initialInvestment = analytics.totalInvested || 10000
      const performance = calculateUserPerformance(analytics, initialInvestment)
      setUserPerformance(performance)
    }
  }, [analytics, dateRange])

  // Fetch benchmarks (using local calculation, not API endpoint)
  useEffect(() => {
    if (dateRange.start && dateRange.end && analytics?.metadata?.oldestTrade) {
      const fetchBenchmarks = async () => {
        try {
          const initialInvestment = analytics?.totalInvested || 10000
          const benchmarkData = await calculateBenchmarkPerformance(
            dateRange.start,
            dateRange.end,
            initialInvestment
          )
          if (benchmarkData) {
            setBenchmarks(benchmarkData)
          }
        } catch (err) {
          // Silently fail - benchmarks are optional
          console.debug('Benchmarks calculation skipped:', err.message)
        }
      }
      fetchBenchmarks()
    }
  }, [dateRange, analytics])

  // Calculate comparisons
  useEffect(() => {
    if (userPerformance && benchmarks) {
      const comps = comparePerformance(userPerformance, benchmarks)
      setComparisons(comps)
    }
  }, [userPerformance, benchmarks])

  // Generate insights from comprehensive context
  const generateInsights = (context) => {
    const generatedInsights = []
    
    if (!context) return

    // Price insights
    if (context.price?.data) {
      const priceData = Object.values(context.price.data)[0]
      if (priceData) {
        generatedInsights.push({
          type: 'price',
          title: 'Market Price Context',
          message: `Current market index: $${priceData.value != null ? parseFloat(priceData.value).toFixed(2) : 'N/A'}`,
          icon: DollarSign
        })
      }
    }

    // Economic insights
    if (context.economic?.indicators) {
      const vix = context.economic.indicators.VIXCLS
      if (vix?.value) {
        const vixValue = parseFloat(vix.value)
        if (vixValue > 30) {
          generatedInsights.push({
            type: 'warning',
            title: 'High Volatility Period',
            message: `VIX is at ${vixValue.toFixed(1)} - elevated market stress`,
            icon: AlertCircle
          })
        }
      }
    }

    // News sentiment insights
    if (context.newsSentiment?.articles) {
      const avgSentiment = context.newsSentiment.articles.reduce((sum, article) => 
        sum + (parseFloat(article.overall_sentiment_score) || 0), 0) / context.newsSentiment.articles.length
      
      if (avgSentiment < -0.1) {
        generatedInsights.push({
          type: 'negative',
          title: 'Negative News Sentiment',
          message: `Average sentiment: ${avgSentiment.toFixed(2)} (bearish)`,
          icon: TrendingDown
        })
      } else if (avgSentiment > 0.1) {
        generatedInsights.push({
          type: 'positive',
          title: 'Positive News Sentiment',
          message: `Average sentiment: ${avgSentiment.toFixed(2)} (bullish)`,
          icon: TrendingUp
        })
      }
    }

    setInsights(generatedInsights)
  }

  // Handle period selection
  const handlePeriodSelect = (period) => {
    setSelectedPeriod(period)
    const now = new Date()
    let start, end

    switch (period) {
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        end = now
        break
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        end = now
        break
      case '90d':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        end = now
        break
      case 'trade-range':
        if (analytics?.metadata?.oldestTrade && analytics?.metadata?.newestTrade) {
          start = new Date(analytics.metadata.oldestTrade)
          end = new Date(analytics.metadata.newestTrade)
        }
        break
      default:
        return // custom - don't change dates
    }

    if (start && end) {
      setDateRange({
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      })
    }
  }

  // Get current market price from comprehensive context or real-time
  const getCurrentPrice = (instrument) => {
    // Try real-time first
    if (realTimePrices[instrument]) {
      return realTimePrices[instrument]
    }
    // Fall back to comprehensive context
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

  return (
    <div className="space-y-6">
      {/* Header with Time Period Selector */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-emerald-400" />
            <h2 className="text-2xl font-bold text-white">Market Context</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : wsStatus === 'connecting' ? 'bg-yellow-400' : 'bg-red-400'}`} />
            <span className="text-xs text-slate-400">{wsStatus === 'connected' ? 'Live' : wsStatus === 'connecting' ? 'Connecting...' : 'Offline'}</span>
          </div>
        </div>

        {/* Time Period Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {['7d', '30d', '90d', 'trade-range', 'custom'].map(period => (
            <button
              key={period}
              onClick={() => handlePeriodSelect(period)}
              className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                selectedPeriod === period
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800/50 border-slate-600 text-slate-400 hover:border-slate-500'
              }`}
            >
              {period === 'trade-range' ? 'Trade Range' : period === 'custom' ? 'Custom' : period.toUpperCase()}
            </button>
          ))}
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white border border-slate-600 rounded-lg hover:border-slate-500 transition-colors flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            <span>{new Date(dateRange.start).toLocaleDateString()} - {new Date(dateRange.end).toLocaleDateString()}</span>
          </button>
        </div>

        {showDatePicker && (
          <div className="flex items-center gap-3 p-4 bg-black/40 rounded-lg border border-slate-700/50">
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1 block">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => {
                  setDateRange(prev => ({ ...prev, start: e.target.value }))
                  setSelectedPeriod('custom')
                }}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                max={dateRange.end}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1 block">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => {
                  setDateRange(prev => ({ ...prev, end: e.target.value }))
                  setSelectedPeriod('custom')
                }}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                min={dateRange.start}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
        )}

        {/* Detected Assets */}
        {detectedAssets && (
          <div className="p-3 bg-black/40 rounded-lg border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-300">Your Traded Assets</span>
              <span className="text-xs text-slate-500">({detectedAssets.instruments?.length || 0})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {detectedAssets.baseAssets?.slice(0, 10).map((asset, idx) => {
                const instrument = detectedAssets.instruments?.find(inst => inst.startsWith(asset))
                const priceData = instrument ? getCurrentPrice(instrument) : null
                return (
                  <div key={idx} className="px-3 py-1.5 bg-slate-800/50 rounded text-xs text-slate-300 border border-slate-700/50">
                    <span className="font-medium">{asset}</span>
                    {priceData && (
                      <span className={`ml-2 ${parseFloat(priceData.changePercent || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ${parseFloat(priceData.price || 0).toFixed(2)} ({parseFloat(priceData.changePercent || 0) >= 0 ? '+' : ''}{parseFloat(priceData.changePercent || 0).toFixed(2)}%)
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading.comprehensive && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <span className="text-sm text-slate-400 ml-3">Loading comprehensive market context...</span>
        </div>
      )}

      {/* Error State */}
      {error.comprehensive && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span>Failed to load market context: {error.comprehensive}</span>
          </div>
        </div>
      )}

      {/* Current Market State Dashboard */}
      {comprehensiveContext && !loading.comprehensive && (
        <>
          {/* Current Market State Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Price Card */}
            {detectedAssets?.instruments?.[0] && (() => {
              const instrument = detectedAssets.instruments[0]
              const priceData = getCurrentPrice(instrument)
              const priceInfo = comprehensiveContext.price?.data?.[instrument]
              return (
                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-emerald-400 font-medium">Current Price</span>
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {priceData ? `$${parseFloat(priceData.price || 0).toFixed(2)}` : priceInfo ? `$${parseFloat(priceInfo.value || 0).toFixed(2)}` : 'N/A'}
                  </div>
                  {priceData && parseFloat(priceData.changePercent || 0) !== 0 && (
                    <div className={`text-sm ${parseFloat(priceData.changePercent || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {parseFloat(priceData.changePercent || 0) >= 0 ? '+' : ''}{parseFloat(priceData.changePercent || 0).toFixed(2)}%
                    </div>
                  )}
                  <div className="text-xs text-slate-500 mt-1">{instrument}</div>
                </div>
              )
            })()}

            {/* VIX Card */}
            {comprehensiveContext.economic?.indicators?.VIXCLS && (() => {
              const vix = comprehensiveContext.economic.indicators.VIXCLS
              const vixValue = parseFloat(vix.value || 0)
              return (
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-blue-400 font-medium">VIX</span>
                    <Activity className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">{vixValue.toFixed(1)}</div>
                  <div className={`text-sm ${vixValue > 30 ? 'text-red-400' : vixValue > 20 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                    {vixValue > 30 ? 'High Stress' : vixValue > 20 ? 'Elevated' : 'Normal'}
                  </div>
                </div>
              )
            })()}

            {/* News Sentiment Card */}
            {comprehensiveContext.newsSentiment?.articles && (() => {
              const articles = comprehensiveContext.newsSentiment.articles
              const avgSentiment = articles.reduce((sum, a) => sum + (parseFloat(a.overall_sentiment_score) || 0), 0) / articles.length
              return (
                <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-purple-400 font-medium">News Sentiment</span>
                    <Newspaper className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className={`text-2xl font-bold mb-1 ${avgSentiment >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {avgSentiment >= 0 ? '+' : ''}{avgSentiment.toFixed(2)}
                  </div>
                  <div className="text-sm text-slate-400">
                    {avgSentiment > 0.1 ? 'Bullish' : avgSentiment < -0.1 ? 'Bearish' : 'Neutral'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{articles.length} articles</div>
                </div>
              )
            })()}

            {/* Performance vs Market */}
            {userPerformance && comparisons.length > 0 && (() => {
              const comparison = comparisons[0]
              return (
                <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-amber-400 font-medium">Your Performance</span>
                    <Target className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className={`text-2xl font-bold mb-1 ${userPerformance.returnPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {userPerformance.returnPercent >= 0 ? '+' : ''}{userPerformance.returnPercent.toFixed(2)}%
                  </div>
                  <div className="text-sm text-slate-400">
                    {comparison.outperformed ? 'Beat Market' : 'Under Market'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">vs {comparison.assetName}</div>
                </div>
              )
            })()}
          </div>

          {/* AI-Generated Insights */}
          {insights.length > 0 && (
            <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-semibold text-amber-300">Market Insights</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {insights.map((insight, idx) => {
                  const Icon = insight.icon || Sparkles
                  return (
                    <div key={idx} className="bg-black/40 rounded-lg p-3 border border-slate-700/50">
                      <div className="flex items-start gap-2">
                        <Icon className={`w-4 h-4 mt-0.5 ${
                          insight.type === 'positive' ? 'text-emerald-400' :
                          insight.type === 'negative' ? 'text-red-400' :
                          insight.type === 'warning' ? 'text-yellow-400' :
                          'text-blue-400'
                        }`} />
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-white">{insight.title}</div>
                          <div className="text-xs text-slate-400 mt-1">{insight.message}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Detailed Sections - Using Comprehensive Context Data */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Economic Indicators */}
            {comprehensiveContext.economic?.indicators && (
              <div className="bg-black/40 rounded-xl p-5 border border-slate-700/50">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-emerald-300">Economic Indicators</h3>
                </div>
                <div className="space-y-3">
                  {Object.entries(comprehensiveContext.economic.indicators).map(([key, indicator]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-white">{indicator.name || key}</div>
                        <div className="text-xs text-slate-400">{indicator.date || 'N/A'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">
                          {parseFloat(indicator.value || 0).toFixed(2)}
                          {key.includes('RATE') || key.includes('DFF') || key.includes('DGS') ? '%' : ''}
                        </div>
                        {indicator.changePercent != null && (
                          <div className={`text-xs ${parseFloat(indicator.changePercent || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {parseFloat(indicator.changePercent || 0) >= 0 ? '+' : ''}{parseFloat(indicator.changePercent || 0).toFixed(2)}%
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* News Articles */}
            {comprehensiveContext.newsSentiment?.articles && (
              <div className="bg-black/40 rounded-xl p-5 border border-slate-700/50">
                <div className="flex items-center gap-2 mb-4">
                  <Newspaper className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-semibold text-purple-300">Top News</h3>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {comprehensiveContext.newsSentiment.articles.slice(0, 5).map((article, idx) => (
                    <div key={idx} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-white line-clamp-2 mb-1">{article.title}</h4>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span>{article.source}</span>
                            <span className={`px-2 py-0.5 rounded ${
                              article.overall_sentiment_label === 'Bullish' ? 'bg-emerald-500/20 text-emerald-300' :
                              article.overall_sentiment_label === 'Bearish' ? 'bg-red-500/20 text-red-300' :
                              'bg-slate-500/20 text-slate-400'
                            }`}>
                              {article.overall_sentiment_label}
                            </span>
                          </div>
                        </div>
                        {article.url && (
                          <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">
                            <Newspaper className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// app/analyze/components/MarketContextTab.js
// Revamped Market Context tab using comprehensive context API
// Based on MARKET_CONTEXT_FRONTEND_TASKS.md

'use client'

import { useState, useEffect } from 'react'
import { 
  Globe, Loader2, AlertCircle, Sparkles, Zap, RefreshCw, BarChart3, Newspaper,
  TrendingUp, Activity, Brain
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  calculateBenchmarkPerformance, 
  extractTradingTimeline, 
  calculateUserPerformance, 
  comparePerformance 
} from '../utils/performanceComparisons'
import { detectAssets, getComprehensiveContext } from '@/lib/marketContext'
import { getWebSocketClient } from '@/lib/coindeskWebSocket'
import MarketContextIntroduction from './MarketContext/MarketContextIntroduction'
import { DashboardSkeleton } from './MarketContext/LoadingSkeletons'
import { ErrorBoundary } from './MarketContext/ErrorBoundary'
import { ErrorFallback } from './MarketContext/ErrorFallback'
import { useMobile } from './MarketContext/useMobile'
import { SkipLink } from './MarketContext/Accessibility'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

export default function MarketContextTab({ analytics }) {
  // Mobile detection
  const { isMobile, isTablet } = useMobile()
  
  // Core state
  const [normalizedData, setNormalizedData] = useState(null)
  const [detectedAssets, setDetectedAssets] = useState(null)
  const [comprehensiveContext, setComprehensiveContext] = useState(null)
  const [loading, setLoading] = useState({ comprehensive: true, assets: false })
  const [error, setError] = useState({ comprehensive: null, assets: null })
  
  // Time period state - default to last 30 days
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  
  // Real-time WebSocket state
  const [wsStatus, setWsStatus] = useState('disconnected')
  const [realTimePrices, setRealTimePrices] = useState({})
  
  // Performance & insights
  const [userPerformance, setUserPerformance] = useState(null)
  const [benchmarks, setBenchmarks] = useState(null)
  const [comparisons, setComparisons] = useState([])
  const [tradingTimeline, setTradingTimeline] = useState(null)
  
  // UI state
  const [lastRefresh, setLastRefresh] = useState(new Date())

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
    
    // Set initial date range to trade range if available, otherwise use last 30 days
    if (analytics?.metadata?.oldestTrade && analytics?.metadata?.newestTrade) {
      const oldest = new Date(analytics.metadata.oldestTrade).toISOString().split('T')[0]
      const newest = new Date(analytics.metadata.newestTrade).toISOString().split('T')[0]
      setDateRange({ start: oldest, end: newest })
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

        // PHASE 4 TASK 4.1: Validate API response structure
        if (context.success && context.context) {
          const { validateApiResponse, validatePriceData, validateSentimentData, validateEconomicData, validateVolumeData } = await import('../utils/marketContextDataParser')
          
          const primaryInstrument = detectedAssets?.instruments?.[0]
          const validation = validateApiResponse(context)
          const priceValidation = validatePriceData(context.context.price, primaryInstrument)
          const sentimentValidation = validateSentimentData(context.context.newsSentiment)
          const economicValidation = validateEconomicData(context.context.economic)
          const volumeValidation = validateVolumeData(context.context.volume, primaryInstrument)
          
          // Log validation results in development
          if (process.env.NODE_ENV === 'development') {
            if (validation.errors.length > 0 || priceValidation.errors.length > 0) {
              console.error('❌ API Response Validation Errors:', {
                api: validation.errors,
                price: priceValidation.errors
              })
            }
            if (validation.warnings.length > 0 || priceValidation.warnings.length > 0) {
              console.warn('⚠️ API Response Validation Warnings:', {
                api: validation.warnings,
                price: priceValidation.warnings,
                sentiment: sentimentValidation.warnings,
                economic: economicValidation.warnings,
                volume: volumeValidation.warnings
              })
            }
          }
          
          // If critical errors, don't set context
          if (validation.errors.length > 0 || priceValidation.errors.length > 0) {
            setError(prev => ({ 
              ...prev, 
              comprehensive: `Data validation failed: ${[...validation.errors, ...priceValidation.errors].join(', ')}` 
            }))
            return
          }
        }

        // PHASE 1 TASK 1.1: Log API response structure for analysis
        if (context.success && context.context) {
          console.group('🔍 Market Context API Response Structure Analysis')
          console.log('Full API Response:', context)
          console.log('Context Object Keys:', Object.keys(context.context))
          
          // Analyze price data structure
          if (context.context.price) {
            console.log('Price Data Structure:', {
              hasPrice: !!context.context.price,
              priceKeys: Object.keys(context.context.price),
              dataKeys: context.context.price.data ? Object.keys(context.context.price.data) : 'No data key',
              sampleInstrument: detectedAssets?.instruments?.[0] || 'BTC-USD',
              sampleData: context.context.price.data?.[detectedAssets?.instruments?.[0] || 'BTC-USD']
            })
            
            // Check if price data is single object or array
            const sampleInstrument = detectedAssets?.instruments?.[0] || 'BTC-USD'
            const samplePriceData = context.context.price.data?.[sampleInstrument]
            if (samplePriceData) {
              console.log('Price Data Type:', {
                isArray: Array.isArray(samplePriceData),
                isObject: typeof samplePriceData === 'object' && !Array.isArray(samplePriceData),
                structure: samplePriceData,
                keys: Object.keys(samplePriceData)
              })
            }
          } else {
            console.warn('⚠️ No price data in response')
          }
          
          // Analyze volume data
          if (context.context.volume) {
            console.log('Volume Data Structure:', {
              hasVolume: !!context.context.volume,
              volumeKeys: Object.keys(context.context.volume),
              sampleData: context.context.volume
            })
          } else {
            console.warn('⚠️ No volume data in response')
          }
          
          // Analyze sentiment data
          if (context.context.newsSentiment) {
            console.log('Sentiment Data Structure:', {
              hasSentiment: !!context.context.newsSentiment,
              sentimentKeys: Object.keys(context.context.newsSentiment),
              articlesCount: context.context.newsSentiment.articles?.length || 0,
              sampleArticle: context.context.newsSentiment.articles?.[0]
            })
          }
          
          // Analyze economic indicators
          if (context.context.economic) {
            console.log('Economic Data Structure:', {
              hasEconomic: !!context.context.economic,
              economicKeys: Object.keys(context.context.economic),
              indicators: context.context.economic.indicators ? Object.keys(context.context.economic.indicators) : [],
              sampleIndicator: context.context.economic.indicators?.VIXCLS
            })
          }
          
          console.groupEnd()
        }

        if (context.success) {
          setComprehensiveContext(context.context)
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


  // Handle refresh
  const handleRefresh = async () => {
    setLastRefresh(new Date())
    // Trigger re-fetch by updating dateRange slightly
    setDateRange(prev => ({ ...prev }))
  }


  return (
    <ErrorBoundary>
      <SkipLink href="#market-context-main" />
      <div id="market-context-main" className="space-y-6" role="main" aria-label="Market Context Dashboard">
      {/* Header - Actions Only */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-4">
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <button
            onClick={handleRefresh}
            disabled={loading.comprehensive}
            className="flex items-center gap-2 px-3 py-2 text-xs sm:text-sm text-slate-300 hover:text-white border border-slate-600 rounded-lg hover:border-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            aria-label="Refresh market data"
          >
            <RefreshCw className={`w-4 h-4 ${loading.comprehensive ? 'animate-spin' : ''}`} />
            {!isMobile && <span>Refresh</span>}
          </button>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : wsStatus === 'connecting' ? 'bg-yellow-400' : 'bg-red-400'}`} />
            <span className="text-xs text-slate-400">{wsStatus === 'connected' ? 'Live' : wsStatus === 'connecting' ? 'Connecting...' : 'Offline'}</span>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading.comprehensive && <DashboardSkeleton />}

      {/* Error State */}
      {error.comprehensive && (
        <ErrorFallback
          error={error.comprehensive}
          retry={() => {
            setError(prev => ({ ...prev, comprehensive: null }))
            setDateRange(prev => ({ ...prev }))
          }}
          type="network"
        />
      )}

      {/* Main Content Flow */}
      {analytics && (
        <>
          {/* INTRODUCTION: What is Market Context? */}
          <MarketContextIntroduction
            selectedAsset={detectedAssets?.instruments?.[0]}
            dateRange={dateRange}
          />
        </>
      )}
      </div>
    </ErrorBoundary>
  )
}

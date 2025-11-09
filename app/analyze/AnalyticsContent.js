// app/analyze/AnalyticsContent.js
'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import AuthScreen from './components/AuthScreen'
import { analyzeData } from './utils/masterAnalyzer'
import { getCurrencySymbol } from './utils/currencyFormatter'
import { getCurrencyRates } from './utils/currencyConverter'
import AnalyticsView from './components/AnalyticsView'
import demoFuturesData from './demo-data/demo-futures-data.json'
import demoSpotData from './demo-data/demo-spot-data.json'
import { EXCHANGES } from './utils/exchanges'
import { TrendingUp, BarChart3, Brain, Zap, Sparkles } from 'lucide-react'

// Loading screens (same as TradeClarityContent)
function DemoLoadingScreen({ progress, onComplete }) {
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    { icon: 'BarChart3', label: 'Loading trade data', duration: 600 },
    { icon: 'Brain', label: 'Analyzing patterns', duration: 800 },
    { icon: 'Zap', label: 'Calculating insights', duration: 700 },
    { icon: 'Sparkles', label: 'Preparing your dashboard', duration: 500 }
  ]

  useEffect(() => {
    const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0)
    let elapsed = 0

    const interval = setInterval(() => {
      elapsed += 50
      const newProgress = Math.min((elapsed / totalDuration) * 100, 100)
      setLoadingProgress(newProgress)

      let accumulatedDuration = 0
      for (let i = 0; i < steps.length; i++) {
        accumulatedDuration += steps[i].duration
        if (elapsed < accumulatedDuration) {
          setCurrentStep(i)
          break
        }
      }

      if (elapsed >= totalDuration) {
        clearInterval(interval)
      }
    }, 50)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (loadingProgress >= 100 && onComplete) {
      const timer = setTimeout(() => onComplete(), 400)
      return () => clearTimeout(timer)
    }
  }, [loadingProgress, onComplete])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold">TradeClarity</h1>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-purple-600/20 border-2 border-purple-400/40 rounded-full text-purple-200 text-sm font-semibold shadow-lg shadow-purple-500/20">
            <Sparkles className="w-4 h-4 text-purple-300" />
            Demo Mode
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 space-y-6">
          <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <div className="text-center text-sm text-slate-400">
            {Math.round(loadingProgress)}% complete
          </div>
        </div>
      </div>
    </div>
  )
}

// Loading screen component for real mode (fetching from database)
function RealModeLoadingScreen({ progress, onComplete }) {
  const [dots, setDots] = useState('.')
  const [progressPercent, setProgressPercent] = useState(0)
  const [isDataReady, setIsDataReady] = useState(false)
  const [startTime] = useState(Date.now())
  const MIN_ANIMATION_DURATION = 2000 // Minimum 2 seconds for smooth animation

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '.' : prev + '.')
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // Detect when data is ready based on progress message
  useEffect(() => {
    if (progress) {
      const lowerProgress = progress.toLowerCase()
      if (lowerProgress.includes('complete') || lowerProgress.includes('preparing')) {
        setIsDataReady(true)
      }
    }
  }, [progress])

  const getCurrentStep = () => {
    if (!progress) return { icon: TrendingUp, label: 'Initializing', step: 0, percent: 5 }

    const lowerProgress = progress.toLowerCase()

    if (lowerProgress.includes('fetching') || lowerProgress.includes('loading')) {
      return { icon: BarChart3, label: progress, step: 1, percent: 45 }
    }

    if (lowerProgress.includes('normalizing') || lowerProgress.includes('processing')) {
      return { icon: Brain, label: progress, step: 2, percent: 70 }
    }

    if (lowerProgress.includes('analyzing') || lowerProgress.includes('calculating')) {
      return { icon: Sparkles, label: progress, step: 3, percent: 90 }
    }

    if (lowerProgress.includes('complete') || lowerProgress.includes('preparing')) {
      return { icon: Sparkles, label: progress, step: 3, percent: 100 }
    }

    return { icon: Sparkles, label: progress || 'Processing', step: 1, percent: 30 }
  }

  const currentStep = getCurrentStep()
  const CurrentIcon = currentStep.icon

  // Smooth progress animation - always animate to target, ensure we reach 100%
  useEffect(() => {
    let targetPercent = currentStep.percent

    // If data is NOT ready yet, cap at 95% to prevent finishing too early
    if (!isDataReady && targetPercent >= 95) {
      targetPercent = 95
    }

    // If data is ready, always target 100%
    if (isDataReady) {
      targetPercent = 100
    }

    // Animate towards target
    if (progressPercent < targetPercent) {
      const interval = setInterval(() => {
        setProgressPercent(prev => {
          const next = Math.min(prev + 1, targetPercent)
          if (next >= targetPercent) {
            clearInterval(interval)
            return targetPercent
          }
          return next
        })
      }, 20)
      return () => clearInterval(interval)
    }
  }, [currentStep.percent, isDataReady, progressPercent])
  
  // Ensure we always animate to 100% when data is ready
  useEffect(() => {
    if (isDataReady && progressPercent < 100) {
      const interval = setInterval(() => {
        setProgressPercent(prev => {
          const next = Math.min(prev + 1, 100)
          if (next >= 100) {
            clearInterval(interval)
            return 100
          }
          return next
        })
      }, 20)
      return () => clearInterval(interval)
    }
  }, [isDataReady, progressPercent])

  // When data is ready AND we're at 100%, wait for minimum duration before completing
  useEffect(() => {
    if (isDataReady && progressPercent >= 100 && onComplete) {
      const elapsed = Date.now() - startTime
      const remainingTime = Math.max(0, MIN_ANIMATION_DURATION - elapsed)
      
      const timer = setTimeout(() => {
        onComplete()
      }, remainingTime + 400) // Brief pause at 100% for visual satisfaction
      return () => clearTimeout(timer)
    }
  }, [isDataReady, progressPercent, onComplete, startTime])

  const steps = [
    { icon: Zap, label: 'Connecting' },
    { icon: BarChart3, label: 'Fetching' },
    { icon: Brain, label: 'Processing' },
    { icon: Sparkles, label: 'Analyzing' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 mb-6">
            <TrendingUp className="w-10 h-10 text-emerald-400" />
            <h1 className="text-3xl font-bold">TradeClarity</h1>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
                <CurrentIcon className="w-10 h-10 text-emerald-400 animate-pulse" />
              </div>
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 animate-ping" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-center">
              <div className="text-slate-300 font-medium text-lg mb-2">
                {currentStep.label}{dots}
              </div>
              <div className="text-sm text-slate-400">
                {progressPercent < 100
                  ? 'Loading your trading data'
                  : 'Loading complete! Preparing dashboard...'}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Progress</span>
                <span className="font-mono font-bold">{progressPercent}%</span>
              </div>
              <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-200 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {steps.map((step, index) => {
              const StepIcon = step.icon
              return (
                <div 
                  key={index}
                  className={`flex flex-col items-center gap-1 transition-all duration-300 ${
                    index <= currentStep.step ? 'opacity-100' : 'opacity-30'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    index < currentStep.step 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : index === currentStep.step
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'bg-slate-700/50 text-slate-500'
                  }`}>
                    <StepIcon className="w-4 h-4" />
                  </div>
                  <div className="text-[10px] text-slate-400 text-center leading-tight">
                    {step.label}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="text-center text-sm text-slate-400">
          Loading your trading analytics...
        </div>
      </div>
    </div>
  )
}

export default function AnalyticsContent() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('loading')
  const [analytics, setAnalytics] = useState(null)
  const [currency, setCurrency] = useState('USD')
  const [currencyMetadata, setCurrencyMetadata] = useState(null)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [loadingComplete, setLoadingComplete] = useState(false)
  const [cachedData, setCachedData] = useState(null)
  const [progress, setProgress] = useState('Fetching your trading data...')
  const hasLoadedRef = useRef(false) // Track if we've already loaded data to prevent double-loading
  const [activeTabFromUrl, setActiveTabFromUrl] = useState('overview')

  // Watch for URL tab parameter changes
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    const validTabs = ['overview', 'behavioral', 'spot', 'futures']
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTabFromUrl(tabParam)
    } else {
      setActiveTabFromUrl('overview')
    }
  }, [searchParams])

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      // If already loaded, don't reload (prevents double-loading in React Strict Mode)
      if (hasLoadedRef.current) {
        console.log('? [AnalyticsContent] Already loaded, skipping reload')
        return
      }
      hasLoadedRef.current = true

      const demo = searchParams.get('demo')
      
      if (demo === 'true') {
        // Demo mode
        setIsDemoMode(true)
        setStatus('loading')
        
        try {
          const normalizedSpotTrades = demoSpotData.map(trade => ({
            symbol: trade.symbol,
            qty: String(trade.qty),
            price: String(trade.price),
            quoteQty: String(parseFloat(trade.qty) * parseFloat(trade.price)),
            commission: String(trade.commission || 0),
            commissionAsset: trade.commissionAsset || 'USDT',
            isBuyer: trade.isBuyer,
            isMaker: false,
            time: trade.time,
            orderId: trade.orderId,
            id: trade.id,
            accountType: 'SPOT'
          }))

          const demoData = {
            spotTrades: normalizedSpotTrades,
            futuresIncome: demoFuturesData.income,
            futuresPositions: demoFuturesData.positions,
            metadata: {
              primaryCurrency: 'USD',
              availableCurrencies: ['USD', 'INR', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CNY', 'SGD', 'CHF'],
              supportsCurrencySwitch: true,
              accountType: 'MIXED',
              hasFutures: true,
              futuresPositions: demoFuturesData.positions.length,
              spotTrades: normalizedSpotTrades.length,
              futuresIncome: demoFuturesData.income.length,
              spotHoldings: [
                { asset: 'BTC', quantity: 0.3971906, usdValue: 18296.45, exchange: 'binance' },
                { asset: 'USDT', quantity: 3872.19, usdValue: 3872.19, exchange: 'binance' },
                { asset: 'DOT', quantity: 275.43, usdValue: 1960.30, exchange: 'binance' },
                { asset: 'AVAX', quantity: 27.00, usdValue: 1003.91, exchange: 'binance' },
                { asset: 'ARB', quantity: 620.54, usdValue: 813.91, exchange: 'binance' },
                { asset: 'ETH', quantity: 0.185, usdValue: 444.00, exchange: 'binance' },
                { asset: 'SOL', quantity: 2.85, usdValue: 370.50, exchange: 'binance' },
                { asset: 'LINK', quantity: 18.75, usdValue: 300.00, exchange: 'binance' },
                { asset: 'ADA', quantity: 2850.0, usdValue: 1710.00, exchange: 'binance' },
                { asset: 'BNB', quantity: 0.85, usdValue: 280.50, exchange: 'binance' },
                { asset: 'XRP', quantity: 1200.0, usdValue: 660.00, exchange: 'binance' },
                { asset: 'MATIC', quantity: 450.0, usdValue: 382.50, exchange: 'binance' },
                { asset: 'DOGE', quantity: 8500.0, usdValue: 1275.00, exchange: 'binance' }
              ],
              totalPortfolioValue: 30468.27,
              totalSpotValue: 30468.27,
              totalFuturesValue: 0
            }
          }

          const analysis = await analyzeData(demoData)
          setAnalytics(analysis)
          setCurrencyMetadata(demoData.metadata)
          // Load saved currency preference from localStorage
          const savedCurrency = typeof window !== 'undefined' ? localStorage.getItem('tradeclarity_currency') : null
          if (savedCurrency) {
            setCurrency(savedCurrency)
          }
          setLoadingComplete(true)
        } catch (err) {
          console.error('Demo loading error:', err)
          setStatus('error')
        }
      } else {
        // Real mode - check for pre-analyzed data first (from DashboardContent connection flow)
        setStatus('loading')
        
        try {
          // Check for pre-analyzed data from DashboardContent.handleConnect()
          const preAnalyzedDataStr = sessionStorage.getItem('preAnalyzedData')
          
          if (preAnalyzedDataStr) {
            console.log('? [AnalyticsContent] Using pre-analyzed data from DashboardContent')
            const preAnalyzedData = JSON.parse(preAnalyzedDataStr)
            
            // Clear sessionStorage after reading (delayed to allow React Strict Mode double-mount)
            // Use setTimeout to allow both mounts in React Strict Mode to access the data
            setTimeout(() => {
              sessionStorage.removeItem('preAnalyzedData')
            }, 1000)
            
            // Use the pre-analyzed data directly
            setAnalytics(preAnalyzedData.analytics)
            setCurrencyMetadata(preAnalyzedData.currencyMetadata)
            setCachedData(preAnalyzedData.data)
            
            // Use persisted currency or the one from preAnalyzedData
            const savedCurrency = typeof window !== 'undefined' ? localStorage.getItem('tradeclarity_currency') : null
            if (savedCurrency) {
              setCurrency(savedCurrency)
            } else {
              setCurrency(preAnalyzedData.currency || 'USD')
            }
            
            setProgress('Preparing your dashboard...')
            await new Promise(resolve => setTimeout(resolve, 50))
            // Loading screen will handle completion via onComplete callback
            return
          }
          
          // No pre-analyzed data - fetch from database (existing flow)
          // Start with fetching message
          setProgress('Fetching your trading data...')
          await new Promise(resolve => setTimeout(resolve, 100))
          
          // Check sessionStorage for filters from dashboard
          const selectedSourcesStr = sessionStorage.getItem('selectedSources')
          const selectedConnectionId = sessionStorage.getItem('selectedConnectionId')
          const selectedExchange = sessionStorage.getItem('selectedExchange')
          
          // Clear sessionStorage after reading
          sessionStorage.removeItem('selectedSources')
          sessionStorage.removeItem('selectedConnectionId')
          sessionStorage.removeItem('selectedExchange')
          
          let url = '/api/trades/fetch'
          const params = new URLSearchParams()
          
          if (selectedSourcesStr) {
            const selectedSources = JSON.parse(selectedSourcesStr)
            const exchangeIds = selectedSources.filter(s => s.type === 'exchange').map(s => s.id)
            const csvIds = selectedSources.filter(s => s.type === 'csv').map(s => s.id)
            
            if (exchangeIds.length > 0) {
              params.append('connectionIds', exchangeIds.join(','))
            }
            if (csvIds.length > 0) {
              params.append('csvIds', csvIds.join(','))
            }
          } else if (selectedConnectionId) {
            params.append('connectionId', selectedConnectionId)
          } else if (selectedExchange) {
            params.append('exchange', selectedExchange)
          }
          
          if (params.toString()) {
            url += '?' + params.toString()
          }
          
          const response = await fetch(url)
          
          if (!response.ok) {
            throw new Error('Failed to fetch trades')
          }

          setProgress('Processing trade data...')
          await new Promise(resolve => setTimeout(resolve, 100))
          
          const data = await response.json()
          
          if (!data.success) {
            // Check if it's a NO_DATA error (graceful)
            if (data.error === 'NO_DATA') {
              setStatus('no_data')
              return
            }
            throw new Error(data.message || 'No trading data available')
          }

          setCachedData(data)
          setProgress('Analyzing patterns and calculating insights...')
          await new Promise(resolve => setTimeout(resolve, 100))
          
          // Ensure currency rates are cached before conversion
          try {
            await getCurrencyRates()
            console.log('? Currency rates cached for conversion')
          } catch (rateError) {
            console.warn('?? Could not fetch currency rates:', rateError.message)
          }
          
          const analysis = await analyzeData(data)
          setAnalytics(analysis)
          setCurrencyMetadata(data.metadata)
          
          // Use persisted currency or default to USD
          const savedCurrency = typeof window !== 'undefined' ? localStorage.getItem('tradeclarity_currency') : null
          if (savedCurrency) {
            setCurrency(savedCurrency)
          }
          
          // Always set progress to "Preparing" to trigger 100% animation
          // Use setTimeout to ensure state update propagates before component might unmount
          setProgress('Preparing your dashboard...')
          
          // Small delay to ensure React state updates propagate to the loading screen
          // This ensures isDataReady gets set and animation can complete
          await new Promise(resolve => setTimeout(resolve, 50))
          
          // Don't set loadingComplete here - let the loading screen handle it via onComplete callback
          // The loading screen will detect "Preparing" message, set isDataReady=true, animate to 100%,
          // then call onComplete which sets loadingComplete=true
        } catch (err) {
          console.error('Error loading analytics:', err)
          setStatus('error')
        }
      }
    }

    loadData()
  }, [searchParams]) // Only depend on searchParams, not analytics (to prevent infinite loops)

  // Handle filter changes (re-fetch with filters)
  const handleFilterExchanges = async (exchanges) => {
    try {
      const response = await fetch('/api/exchange/list')
      const data = await response.json()

      if (data.success && data.connections) {
        const selectedSources = exchanges.map(exchangeName => {
          const connection = data.connections.find(conn =>
            conn.exchange.toLowerCase() === exchangeName.toLowerCase()
          )
          return connection ? { type: 'exchange', id: connection.id, name: exchangeName } : null
        }).filter(Boolean)

        if (selectedSources.length === 0) return

        const params = new URLSearchParams()
        const exchangeIds = selectedSources.filter(s => s.type === 'exchange').map(s => s.id)
        if (exchangeIds.length > 0) {
          params.append('connectionIds', exchangeIds.join(','))
        }

        const fetchResponse = await fetch(`/api/trades/fetch?${params.toString()}`)
        const fetchData = await fetchResponse.json()

        if (fetchData.success) {
          // Ensure currency rates are cached before conversion
          try {
            await getCurrencyRates()
          } catch (rateError) {
            console.warn('?? Could not fetch currency rates:', rateError.message)
          }
          
          const analysis = await analyzeData(fetchData)
          setAnalytics(analysis)
          setCurrencyMetadata(fetchData.metadata)
          // Preserve currency preference from localStorage
          const savedCurrency = typeof window !== 'undefined' ? localStorage.getItem('tradeclarity_currency') : null
          if (savedCurrency) {
            setCurrency(savedCurrency)
          }
        }
      }
    } catch (error) {
      console.error('Error filtering exchanges:', error)
    }
  }

  // Transition to connected when loading completes
  useEffect(() => {
    if (loadingComplete && analytics && status === 'loading') {
      setStatus('connected')
    }
  }, [loadingComplete, analytics, status])

  if (authLoading && searchParams.get('demo') !== 'true') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-300">Loading...</span>
        </div>
      </div>
    )
  }

  if (!user && searchParams.get('demo') !== 'true') {
    return <AuthScreen onAuthSuccess={() => {}} />
  }

  if (status === 'loading') {
    return isDemoMode ? (
      <DemoLoadingScreen
        progress="Loading demo data..."
        onComplete={() => setLoadingComplete(true)}
      />
    ) : (
      <RealModeLoadingScreen
        progress={progress}
        onComplete={() => setLoadingComplete(true)}
      />
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Failed to load analytics</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (status === 'no_data') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto bg-slate-800/50 border border-slate-700/50 rounded-2xl flex items-center justify-center">
            <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-100 mb-2">No Trading Data Available</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              You don't have any trading data yet. Please upload CSV files or connect an exchange to view analytics.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.push('/data')}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-105"
            >
              Upload CSV Files
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-slate-800/60 hover:bg-slate-800/80 border border-slate-700/50 hover:border-slate-600/70 rounded-xl font-semibold text-sm transition-all"
            >
              Connect Exchange
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'connected' && analytics) {
    // Use tab from URL state (updated via useEffect)
    const currentTab = activeTabFromUrl || 'overview'

    return (
      <AnalyticsView
        analytics={analytics}
        currency={currency}
        currSymbol={getCurrencySymbol(currency)}
        currencyMetadata={currencyMetadata}
        setCurrency={setCurrency}
        isDemoMode={isDemoMode}
        isAuthenticated={!!user}
        exchangeConfig={EXCHANGES.binance}
        onDisconnect={() => router.push('/dashboard')}
        onUploadClick={() => router.push('/dashboard')}
        onViewAllExchanges={() => router.push('/analyze')}
        onFilterExchanges={handleFilterExchanges}
        initialTab={currentTab}
        key={currentTab} // Force re-render when tab changes
      />
    )
  }

  return null
}

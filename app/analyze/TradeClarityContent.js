// app/analyze/TradeClarityContent.js
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext' // NEW: Auth context
import AuthScreen from './components/AuthScreen' // NEW: Auth screen
import { analyzeData } from './utils/masterAnalyzer'
import { EXCHANGES, getExchangeList } from './utils/exchanges'
import LoginForm from './components/LoginForm'
import Dashboard from './components/Dashboard'
import CSVUploadFlow from './components/CSVUploadFlow'
import AnalyticsView from './components/AnalyticsView'
import demoFuturesData from './demo-data/demo-futures-data.json'
import demoSpotData from './demo-data/demo-spot-data.json'
import { TrendingUp, Sparkles, BarChart3, Brain, Zap, Lightbulb } from 'lucide-react'

// Loading screen component for demo mode
function DemoLoadingScreen({ progress, onComplete }) {
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    { icon: BarChart3, label: 'Loading trade data', duration: 600 },
    { icon: Brain, label: 'Analyzing patterns', duration: 800 },
    { icon: Zap, label: 'Calculating insights', duration: 700 },
    { icon: Sparkles, label: 'Preparing your dashboard', duration: 500 }
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

  // When progress reaches 100%, notify parent after brief delay
  useEffect(() => {
    if (loadingProgress >= 100 && onComplete) {
      const timer = setTimeout(() => {
        onComplete()
      }, 400) // Brief pause at 100% for visual satisfaction
      return () => clearTimeout(timer)
    }
  }, [loadingProgress, onComplete])

  const CurrentIcon = steps[currentStep].icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 mb-6">
            <TrendingUp className="w-10 h-10 text-emerald-400" />
            <h1 className="text-3xl font-bold">TradeClarity</h1>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-400 text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Demo Mode
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
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300 font-medium">{steps[currentStep].label}</span>
              <span className="text-slate-400">{Math.round(loadingProgress)}%</span>
            </div>
            <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {steps.map((step, index) => {
              const StepIcon = step.icon
              return (
                <div 
                  key={index}
                  className={`flex flex-col items-center gap-1 transition-all duration-300 ${
                    index <= currentStep ? 'opacity-100' : 'opacity-30'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    index < currentStep 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : index === currentStep
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'bg-slate-700/50 text-slate-500'
                  }`}>
                    <StepIcon className="w-4 h-4" />
                  </div>
                  <div className="text-[10px] text-slate-400 text-center leading-tight">
                    {step.label.split(' ')[0]}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="pt-4 text-center text-xs text-slate-400 border-t border-slate-700/50 flex items-center justify-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
            <span>Did you know? 80% of traders lose money due to poor psychology, not bad strategy.</span>
          </div>
        </div>

        <div className="text-center text-sm text-slate-400">
          Analyzing sample data from a real Binance Futures account
        </div>
      </div>
    </div>
  )
}

// Loading screen component for real mode (API connection)
function RealModeLoadingScreen({ progress, onComplete }) {
  const [dots, setDots] = useState('.')
  const [progressPercent, setProgressPercent] = useState(0)
  const [isDataReady, setIsDataReady] = useState(false)

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

    if (lowerProgress.includes('connecting')) {
      return { icon: Zap, label: progress, step: 0, percent: 20 }
    }

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

  // Smooth progress animation that caps at 95% until data is ready
  useEffect(() => {
    let targetPercent = currentStep.percent

    // If data is NOT ready yet, cap at 95% to prevent finishing too early
    if (!isDataReady && targetPercent >= 95) {
      targetPercent = 95
    }

    if (progressPercent < targetPercent) {
      const interval = setInterval(() => {
        setProgressPercent(prev => {
          const next = prev + 1
          if (next >= targetPercent) {
            clearInterval(interval)
            return targetPercent
          }
          return next
        })
      }, 20)
      return () => clearInterval(interval)
    }
  }, [currentStep.percent, isDataReady])

  // When data is ready AND we're at 100%, notify parent after brief delay
  useEffect(() => {
    if (isDataReady && progressPercent >= 100 && onComplete) {
      const timer = setTimeout(() => {
        onComplete()
      }, 400) // Brief pause at 100% for visual satisfaction
      return () => clearTimeout(timer)
    }
  }, [isDataReady, progressPercent, onComplete])

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
                  ? 'Fetching your trading data from the exchange'
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

          <div className="pt-4 text-center text-xs text-slate-400 border-t border-slate-700/50">
            🔒 Your API keys are encrypted and never stored
          </div>
        </div>

        <div className="text-center text-sm text-slate-400">
          This may take 10-30 seconds depending on your trade history
        </div>
      </div>
    </div>
  )
}

export default function TradeClarityContent() {
  const { user, loading: authLoading } = useAuth() // NEW: Get auth state
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')
  const [analytics, setAnalytics] = useState(null)
  const [exchange, setExchange] = useState('binance')
  const [currency, setCurrency] = useState('USD')
  const [currencyMetadata, setCurrencyMetadata] = useState(null)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [showAPIConnection, setShowAPIConnection] = useState(false)
  const [showCSVUpload, setShowCSVUpload] = useState(false)
  const [pendingTradeStorage, setPendingTradeStorage] = useState(null) // For background DB storage
  const [cachedData, setCachedData] = useState(null) // Cache for fetched data
  const [currentConnectionId, setCurrentConnectionId] = useState(null) // Track which exchange is shown
  const [loadingComplete, setLoadingComplete] = useState(false) // Track when loading animation completes

  const exchangeList = getExchangeList()
  const currentExchange = EXCHANGES[exchange]

  // Background effect: Store trades to database after analytics loads
  useEffect(() => {
    if (pendingTradeStorage && status === 'connected' && !isDemoMode) {
      const { spotTrades, futuresIncome, userId, exchange: exchangeName, connectionId, metadata } = pendingTradeStorage

      console.log('📥 [Background] Storing trades to database...', {
        spotTrades: spotTrades?.length || 0,
        futuresIncome: futuresIncome?.length || 0,
        hasPortfolioData: !!metadata?.spotHoldings
      })

      // Call storage endpoint in background (fire and forget)
      fetch('/api/trades/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spotTrades,
          futuresIncome,
          userId,
          exchange: exchangeName,
          connectionId,
          metadata // Include metadata for portfolio snapshot
        })
      })
        .then(res => res.json())
        .then(data => {
          console.log('✅ [Background] Trades stored:', data)
          if (data.portfolioSnapshotStored) {
            console.log('📊 Portfolio snapshot saved successfully')
          }
        })
        .catch(err => {
          console.error('❌ [Background] Failed to store trades:', err)
          // Don't show error to user, this is background operation
        })

      // Clear pending storage after triggering
      setPendingTradeStorage(null)
    }
  }, [pendingTradeStorage, status, isDemoMode])

  const getCurrencySymbol = (curr) => {
    const symbols = {
      'USD': '$',
      'USDT': '$',
      'INR': '₹',
      'EUR': '€',
      'GBP': '£'
    }
    return symbols[curr] || '$'
  }

  useEffect(() => {
    const demo = searchParams.get('demo')
    if (demo === 'true' && status === 'idle') {
      setStatus('loading')
      handleTryDemo()
    }
  }, [searchParams])

  const handleTryDemo = () => {
    setStatus('connecting')
    setProgress('Loading demo data...')
    setIsDemoMode(true)
    setLoadingComplete(false)

    try {
      setTimeout(async () => {
        console.log('📊 Loading demo data...')

        const spotData = require('./demo-data/demo-spot-data.json')

        console.log('Demo spot trades:', spotData.length)
        console.log('Demo futures income:', demoFuturesData.income.length)

        const normalizedSpotTrades = spotData.map(trade => ({
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
            availableCurrencies: ['USD'],
            supportsCurrencySwitch: false,
            accountType: 'MIXED',
            hasFutures: true,
            futuresPositions: demoFuturesData.positions.length,
            spotTrades: normalizedSpotTrades.length,
            futuresIncome: demoFuturesData.income.length
          }
        }

        setProgress('Analyzing demo data...')
        const analysis = await analyzeData(demoData)

        console.log('✅ Demo analysis complete:', analysis)
        console.log('Spot trades:', analysis.spotTrades)
        console.log('Futures trades:', analysis.futuresTrades)

        setAnalytics(analysis)
        setCurrencyMetadata(demoData.metadata)
        // Don't set connected yet - wait for loading animation
      }, 1000)
    } catch (err) {
      console.error('Demo loading error:', err)
      setError('Failed to load demo data')
      setStatus('error')
    }
  }

  const handleViewAnalytics = async (connectionIdOrSources = null, exchangeName = null) => {
    setStatus('connecting')
    setError('')
    setProgress('Loading your saved trading data...')
    setLoadingComplete(false)

    try {
      // Handle two calling patterns:
      // 1. Legacy: (connectionId, exchangeName) - single source
      // 2. New: (selectedSources) - array of sources
      let selectedSources = null
      let safeConnectionId = null
      let safeExchangeName = null

      if (Array.isArray(connectionIdOrSources)) {
        // New pattern: array of selected sources
        selectedSources = connectionIdOrSources
        console.log('🔍 [handleViewAnalytics] Called with selectedSources:', selectedSources)
      } else {
        // Legacy pattern: single connection ID or exchange name
        safeConnectionId = connectionIdOrSources && typeof connectionIdOrSources === 'string' ? connectionIdOrSources : null
        safeExchangeName = exchangeName && typeof exchangeName === 'string' ? exchangeName.toLowerCase() : null
        console.log('🔍 [handleViewAnalytics] Called with:', {
          raw: { connectionId: connectionIdOrSources, exchangeName },
          safe: { safeConnectionId, safeExchangeName }
        })
      }

      // Check cache: only re-fetch if switching to different data set
      let cacheKey
      if (selectedSources) {
        cacheKey = `selected:${selectedSources.map(s => `${s.type}:${s.id}`).join(',')}`
      } else {
        cacheKey = safeConnectionId || safeExchangeName || 'all'
      }

      if (cachedData && currentConnectionId === cacheKey) {
        console.log('✅ Using cached data for:', cacheKey)
        setProgress('Analyzing your trading data...')

        const analysis = await analyzeData(cachedData)
        setAnalytics(analysis)
        setCurrencyMetadata(cachedData.metadata)
        setCurrency(cachedData.metadata?.primaryCurrency || 'USD')
        setProgress('Analysis complete! Preparing dashboard...')
        // Don't set connected yet - wait for loading animation
        return
      }

      // Build URL with filters
      let url = '/api/trades/fetch'
      const params = new URLSearchParams()

      if (selectedSources && selectedSources.length > 0) {
        // New pattern: filter by multiple selected sources
        const exchangeIds = selectedSources
          .filter(s => s.type === 'exchange')
          .map(s => s.id)

        const csvIds = selectedSources
          .filter(s => s.type === 'csv')
          .map(s => s.id)

        if (exchangeIds.length > 0) {
          console.log('📎 Adding connectionIds to params:', exchangeIds)
          params.append('connectionIds', exchangeIds.join(','))
        }

        if (csvIds.length > 0) {
          console.log('📄 Adding csvIds to params:', csvIds)
          params.append('csvIds', csvIds.join(','))
        }
      } else if (safeConnectionId) {
        // Legacy: single connection
        console.log('📎 Adding connectionId to params:', safeConnectionId)
        params.append('connectionId', safeConnectionId)
      } else if (safeExchangeName) {
        // Legacy: single exchange
        console.log('📎 Adding exchange to params:', safeExchangeName)
        params.append('exchange', safeExchangeName)
      }
      // If no filters, fetch ALL trades (combined analytics)

      if (params.toString()) {
        url += '?' + params.toString()
      }

      console.log(`📡 Fetching trades from DB: ${url}`)

      // Fetch saved trades from database
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Failed to fetch saved trades')
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error('No trading data available')
      }

      console.log('✅ Saved trades loaded:', {
        spotTrades: data.spotTrades?.length || 0,
        futuresIncome: data.futuresIncome?.length || 0,
        exchange: exchangeName || 'all',
        cached: false
      })

      // Cache the data
      setCachedData(data)
      setCurrentConnectionId(cacheKey)

      setProgress('Analyzing your trading data...')

      const analysis = await analyzeData(data)

      console.log('📊 Analysis complete:', analysis)

      setAnalytics(analysis)
      setCurrencyMetadata(data.metadata)
      setCurrency(data.metadata?.primaryCurrency || 'USD')
      setProgress('Analysis complete! Preparing dashboard...')
      // Don't set connected yet - wait for loading animation
    } catch (err) {
      console.error('View analytics error:', err)
      setError(err.message || 'Failed to load analytics')
      setStatus('error')
    }
  }

  const handleConnect = async (apiKey, apiSecret, preFetchedData = null) => {
    setStatus('connecting')
    setError('')
    setProgress('Connecting to exchange...')
    setLoadingComplete(false)

    try {
      let data

      // If data was already fetched (from new flow), use it
      if (preFetchedData) {
        console.log('✅ Using pre-fetched data:', {
          spotTrades: preFetchedData.spotTrades?.length || 0,
          futuresIncome: preFetchedData.futuresIncome?.length || 0,
          metadata: preFetchedData.metadata
        })
        data = preFetchedData
      } else {
        // Legacy flow: fetch from backend directly
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
        const endpoint = `${backendUrl}/api/${exchange}/fetch-all`

        console.log(`📡 Connecting to: ${endpoint}`)

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ apiKey, apiSecret })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
        }

        const responseData = await response.json()
        data = responseData.data || responseData // Handle both {data: ...} and direct response

        console.log('✅ Data received from backend:', data)
        console.log('📊 Data structure:', {
          success: responseData.success,
          hasDataKey: !!responseData.data,
          spotTrades: data.spotTrades?.length || 0,
          futuresIncome: data.futuresIncome?.length || 0,
          futuresUserTrades: data.futuresUserTrades?.length || 0,
          futuresPositions: data.futuresPositions?.length || 0,
          metadata: data.metadata
        })
      }

      setProgress('Analyzing your trading data...')

      const analysis = await analyzeData(data)

      console.log('📊 Analysis complete:', analysis)

      setAnalytics(analysis)
      setCurrencyMetadata(data.metadata)
      setCurrency(data.metadata?.primaryCurrency || 'USD')

      // Trigger background storage if we have fetched data (not demo mode)
      if (preFetchedData && preFetchedData.userId && preFetchedData.connectionId) {
        setPendingTradeStorage({
          spotTrades: preFetchedData.spotTrades || [],
          futuresIncome: preFetchedData.futuresIncome || [],
          userId: preFetchedData.userId,
          exchange: preFetchedData.exchange,
          connectionId: preFetchedData.connectionId,
          metadata: preFetchedData.metadata // Include metadata for portfolio snapshot
        })
      }

      setProgress('Analysis complete! Preparing dashboard...')
      // Don't set connected yet - wait for loading animation
    } catch (err) {
      console.error('Connection error:', err)
      setError(err.message || 'Failed to connect to exchange. Please check your API credentials.')
      setStatus('error')
    }
  }

  // Transition to connected state when loading animation completes
  useEffect(() => {
    if (loadingComplete && analytics && status === 'connecting') {
      setStatus('connected')
    }
  }, [loadingComplete, analytics, status])

  // Check if demo mode is requested
  const isDemoRequested = searchParams.get('demo') === 'true'

  // NEW: Show loading while checking authentication
  if (authLoading && !isDemoRequested) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-300">Loading...</span>
        </div>
      </div>
    )
  }

  // NEW: Show auth screen if not authenticated AND not demo mode
  if (!user && !isDemoRequested) {
    return <AuthScreen onAuthSuccess={() => {
      console.log('User authenticated successfully')
    }} />
  }

  // Rest of component - show dashboard, connection forms, or analytics
  if (status === 'idle' || status === 'error') {
    // Show API connection form if user selected API method
    if (showAPIConnection) {
      return (
        <LoginForm
          exchangeList={exchangeList}
          exchange={exchange}
          setExchange={setExchange}
          currentExchange={currentExchange}
          onConnect={handleConnect}
          onTryDemo={handleTryDemo}
          status={status}
          error={error}
          progress={progress}
        />
      )
    }

    // Show CSV upload form if user selected CSV method
    if (showCSVUpload) {
      return (
        <CSVUploadFlow
          onBack={() => setShowCSVUpload(false)}
        />
      )
    }

    // Otherwise show dashboard
    return (
      <Dashboard
        onConnectExchange={() => setShowAPIConnection(true)}
        onTryDemo={handleTryDemo}
        onConnectWithCSV={() => setShowCSVUpload(true)}
        onViewAnalytics={handleViewAnalytics}
      />
    )
  }

  if (status === 'connecting' || status === 'loading') {
    return isDemoMode ? (
      <DemoLoadingScreen
        progress={progress}
        onComplete={() => setLoadingComplete(true)}
      />
    ) : (
      <RealModeLoadingScreen
        progress={progress}
        onComplete={() => setLoadingComplete(true)}
      />
    )
  }

  if (status === 'connected' && analytics) {
    return (
      <AnalyticsView
        analytics={analytics}
        currency={currency}
        currencySymbol={getCurrencySymbol(currency)}
        currencyMetadata={currencyMetadata}
        onCurrencyChange={setCurrency}
        isDemoMode={isDemoMode}
        isAuthenticated={!!user}
        exchangeConfig={currentExchange}
        onDisconnect={() => {
          // If in demo mode without auth, redirect to auth page
          if (isDemoMode && !user) {
            window.location.href = '/analyze'
            return
          }
          // Reset to dashboard view
          setStatus('idle')
          setAnalytics(null)
          setIsDemoMode(false)
          setShowAPIConnection(false)
          setShowCSVUpload(false)
          setCachedData(null)
          setCurrentConnectionId(null)
          setLoadingComplete(false)
        }}
        onUploadClick={() => {
          // If in demo mode without auth, redirect to auth page
          if (isDemoMode && !user) {
            window.location.href = '/analyze'
            return
          }
          // Navigate to CSV upload
          setStatus('idle')
          setAnalytics(null)
          setShowAPIConnection(false)
          setShowCSVUpload(true)
          setLoadingComplete(false)
        }}
        onViewAllExchanges={() => {
          // View combined analytics for all exchanges
          handleViewAnalytics()
        }}
        onFilterExchanges={(exchanges) => {
          // Re-fetch data with filtered exchanges
          console.log('🔍 Filtering by exchanges:', exchanges)
          // Build selected sources array from exchange names
          const selectedSources = exchanges.map(exchangeName => {
            // Find matching connection for this exchange
            const connection = connections.find(conn => conn.exchange.toLowerCase() === exchangeName.toLowerCase())
            return connection ? { type: 'exchange', id: connection.id, name: exchangeName } : null
          }).filter(Boolean)

          console.log('📊 Mapped to sources:', selectedSources)
          handleViewAnalytics(selectedSources)
        }}
        setCurrency={setCurrency}
      />
    )
  }

  return null
}
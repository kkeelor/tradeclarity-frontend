// app/dashboard/DashboardContent.js
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import AuthScreen from '../analyze/components/AuthScreen'
import Dashboard from '../analyze/components/Dashboard'
import LoginForm from '../analyze/components/LoginForm'
import CSVUploadFlow from '../analyze/components/CSVUploadFlow'
import { EXCHANGES, getExchangeList } from '../analyze/utils/exchanges'
import { analyzeData } from '../analyze/utils/masterAnalyzer'
import { TrendingUp, BarChart3, Brain, Zap, Sparkles } from 'lucide-react'
import { useMultipleTabs } from '@/lib/hooks/useMultipleTabs'

// Loading screen component for real mode (API connection) - from main branch
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
            Your API keys are encrypted and securely stored
          </div>
        </div>

        <div className="text-center text-sm text-slate-400">
          This may take 10-30 seconds depending on your trade history
        </div>
      </div>
    </div>
  )
}

export default function DashboardContent() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  useMultipleTabs() // Register this tab
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')
  const [exchange, setExchange] = useState('binance')
  const [showAPIConnection, setShowAPIConnection] = useState(false)
  const [showCSVUpload, setShowCSVUpload] = useState(false)
  const [loadingComplete, setLoadingComplete] = useState(false)

  const exchangeList = getExchangeList()
  const currentExchange = EXCHANGES[exchange]

  // Listen for switch requests from other tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'tradeclarity_switch_to_dashboard') {
        // This tab is the dashboard - focus it
        window.focus()
        localStorage.removeItem('tradeclarity_switch_to_dashboard')
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const handleConnect = async (apiKey, apiSecret, preFetchedData = null) => {
    // If we're already connecting and receiving data, update progress and analyze
    if (status === 'connecting' && preFetchedData) {
      setProgress('Analyzing your trading data...')
      
      try {
        const analysis = await analyzeData(preFetchedData)

        // Store analytics and data in sessionStorage for AnalyticsContent
        sessionStorage.setItem('preAnalyzedData', JSON.stringify({
          analytics: analysis,
          data: preFetchedData,
          currencyMetadata: preFetchedData.metadata,
          currency: preFetchedData.metadata?.primaryCurrency || 'USD'
        }))

        setProgress('Analysis complete! Preparing dashboard...')
      } catch (err) {
        console.error('? [DashboardContent] Analysis error:', err)
        setError(err.message || 'Failed to analyze trading data')
        setStatus('error')
        setProgress('')
      }
      return
    }

    // Initial connection - show loader immediately
    setStatus('connecting')
    setError('')
    setProgress('Connecting to exchange...')
    setLoadingComplete(false)

    // If data is already provided, analyze immediately
    if (preFetchedData) {
      try {
        setProgress('Analyzing your trading data...')
        const analysis = await analyzeData(preFetchedData)

        // Store analytics and data in sessionStorage for AnalyticsContent
        sessionStorage.setItem('preAnalyzedData', JSON.stringify({
          analytics: analysis,
          data: preFetchedData,
          currencyMetadata: preFetchedData.metadata,
          currency: preFetchedData.metadata?.primaryCurrency || 'USD'
        }))

        setProgress('Analysis complete! Preparing dashboard...')
      } catch (err) {
        console.error('? [DashboardContent] Connection error:', err)
        setError(err.message || 'Failed to connect to exchange. Please check your API credentials.')
        setStatus('error')
        setProgress('')
      }
      return
    }

    // Legacy flow: fetch from backend directly (shouldn't happen in new flow)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
      const endpoint = `${backendUrl}/api/${exchange}/fetch-all`

      setProgress('Fetching trade data from exchange...')

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
      const data = responseData.data || responseData

      setProgress('Analyzing your trading data...')
      const analysis = await analyzeData(data)

      // Store analytics and data in sessionStorage for AnalyticsContent
      sessionStorage.setItem('preAnalyzedData', JSON.stringify({
        analytics: analysis,
        data,
        currencyMetadata: data.metadata,
        currency: data.metadata?.primaryCurrency || 'USD'
      }))

      setProgress('Analysis complete! Preparing dashboard...')
    } catch (err) {
      console.error('? [DashboardContent] Connection error:', err)
      setError(err.message || 'Failed to connect to exchange. Please check your API credentials.')
      setStatus('error')
      setProgress('')
    }
  }

  // Navigate to analytics page when loading completes (after exchange connection)
  useEffect(() => {
    if (loadingComplete && status === 'connecting') {
      router.push('/analyze')
    }
  }, [loadingComplete, status, router])

  const handleViewAnalytics = async (connectionIdOrSources = null, exchangeName = null) => {
    // Navigate to analytics page - it will handle fetching data
    // Store the selection in sessionStorage so AnalyticsContent can use it
    if (Array.isArray(connectionIdOrSources)) {
      // New pattern: array of selected sources
      sessionStorage.setItem('selectedSources', JSON.stringify(connectionIdOrSources))
    } else if (connectionIdOrSources && typeof connectionIdOrSources === 'string') {
      // Legacy pattern: single connection ID
      sessionStorage.setItem('selectedConnectionId', connectionIdOrSources)
    } else if (exchangeName && typeof exchangeName === 'string') {
      // Legacy pattern: single exchange name
      sessionStorage.setItem('selectedExchange', exchangeName)
    }
    // If no filters, analytics page will fetch all data
    
    // Navigate immediately
    router.push('/analyze')
  }

  const handleTryDemo = () => {
    // Navigate to analytics page with demo flag
    router.push('/analyze?demo=true')
  }

  // Check for API connection request from DataManagement page
  useEffect(() => {
    const shouldShowAPIConnection = sessionStorage.getItem('showAPIConnection')
    if (shouldShowAPIConnection === 'true') {
      sessionStorage.removeItem('showAPIConnection')
      setShowAPIConnection(true)
    }
  }, [])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-300">Loading...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthScreen onAuthSuccess={() => {}} />
  }

  // Show loading screen during connection (check this BEFORE showing LoginForm)
  if (status === 'connecting') {
    return (
      <RealModeLoadingScreen
        progress={progress}
        onComplete={() => setLoadingComplete(true)}
      />
    )
  }

  if (showAPIConnection) {
    return (
      <LoginForm
        exchangeList={exchangeList}
        exchange={exchange}
        setExchange={setExchange}
        currentExchange={currentExchange}
        onConnect={handleConnect}
        onTryDemo={handleTryDemo}
        onBack={() => setShowAPIConnection(false)}
        status={status}
        error={error}
        progress={progress}
      />
    )
  }

  if (showCSVUpload) {
    return (
      <CSVUploadFlow
        onBack={() => setShowCSVUpload(false)}
      />
    )
  }

  return (
    <Dashboard
      onConnectExchange={() => setShowAPIConnection(true)}
      onTryDemo={handleTryDemo}
      onConnectWithCSV={() => setShowCSVUpload(true)}
      onViewAnalytics={handleViewAnalytics}
    />
  )
}

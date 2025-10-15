// app/analyze/TradeClarityContent.js
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { analyzeData } from './utils/masterAnalyzer'
import { EXCHANGES, getExchangeList } from './utils/exchanges'
import LoginForm from './components/LoginForm'
import AnalyticsView from './components/AnalyticsView'
import demoFuturesData from './demo-data/demo-futures-data.json'
import demoSpotData from './demo-data/demo-spot-data.json'
import { TrendingUp, Sparkles, BarChart3, Brain, Zap } from 'lucide-react'

// Loading screen component for demo mode
function DemoLoadingScreen({ progress }) {
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    { icon: BarChart3, label: 'Loading trade data', duration: 600 },
    { icon: Brain, label: 'Analyzing patterns', duration: 800 },
    { icon: Zap, label: 'Calculating insights', duration: 700 },
    { icon: Sparkles, label: 'Preparing your dashboard', duration: 500 }
  ]

  useEffect(() => {
    // Simulate progress
    const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0)
    let elapsed = 0
    
    const interval = setInterval(() => {
      elapsed += 50
      const newProgress = Math.min((elapsed / totalDuration) * 100, 95)
      setLoadingProgress(newProgress)
      
      // Update current step
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

  const CurrentIcon = steps[currentStep].icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
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

        {/* Loading Animation */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 space-y-6">
          {/* Current Step Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
                <CurrentIcon className="w-10 h-10 text-emerald-400 animate-pulse" />
              </div>
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 animate-ping" />
            </div>
          </div>

          {/* Progress Bar */}
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

          {/* Steps Indicator */}
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

          {/* Fun fact */}
          <div className="pt-4 text-center text-xs text-slate-400 border-t border-slate-700/50">
            💡 Did you know? 80% of traders lose money due to poor psychology, not bad strategy.
          </div>
        </div>

        {/* Additional Info */}
        <div className="text-center text-sm text-slate-400">
          Analyzing sample data from a real Binance Futures account
        </div>
      </div>
    </div>
  )
}

export default function TradeClarityContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')
  const [analytics, setAnalytics] = useState(null)
  const [exchange, setExchange] = useState('binance')
  const [currency, setCurrency] = useState('USD')
  const [currencyMetadata, setCurrencyMetadata] = useState(null)
  const [isDemoMode, setIsDemoMode] = useState(false)

  const exchangeList = getExchangeList()
  const currentExchange = EXCHANGES[exchange]

  // Currency symbol mapping
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

  // Auto-load demo if coming from landing page with demo=true
  useEffect(() => {
    const demo = searchParams.get('demo')
    if (demo === 'true' && status === 'idle') {
      // Set to loading state immediately to prevent form flash
      setStatus('loading')
      handleTryDemo()
    }
  }, [searchParams])

  const handleTryDemo = () => {
  setStatus('connecting')
  setProgress('Loading demo data...')
  setIsDemoMode(true)

  try {
    setTimeout(() => {
      console.log('📊 Loading demo data...')
      
      // Import the spot data
      const spotData = require('./demo-data/demo-spot-data.json')
      
      console.log('Demo spot trades:', spotData.length)
      console.log('Demo futures income:', demoFuturesData.income.length)
      
      // Normalize spot data
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
      const analysis = analyzeData(demoData)
      
      console.log('✅ Demo analysis complete:', analysis)
      console.log('Spot trades:', analysis.spotTrades)
      console.log('Futures trades:', analysis.futuresTrades)
      
      setAnalytics(analysis)
      setCurrencyMetadata(demoData.metadata)
      setStatus('connected')
      setProgress('')
    }, 2700)
  } catch (err) {
    console.error('❌ Error loading demo:', err)
    setError('Failed to load demo data: ' + err.message)
    setStatus('error')
    setProgress('')
  }
}

  const handleConnect = async (apiKey, apiSecret) => {
    if (!apiKey || !apiSecret) {
      setError('Please enter both API key and secret')
      return
    }

    setStatus('connecting')
    setError('')
    setIsDemoMode(false)

    try {
      // Fetch trades using exchange-specific function
      const rawData = await currentExchange.fetchTrades(apiKey, apiSecret, setProgress)
      
      console.log('🔍 RAW DATA:', rawData)
      console.log('🔍 Has futuresIncome?', rawData.futuresIncome?.length || 0)
      
      setProgress('Normalizing data...')
      
      // Normalize trades to common format
      const normalizedData = currentExchange.normalizeTrades(rawData)
      
      console.log('🔍 NORMALIZED DATA:', normalizedData)
      console.log('🔍 After normalize - futuresIncome?', normalizedData.futuresIncome?.length || 0)
      console.log('🔍 After normalize - spotTrades?', normalizedData.spotTrades?.length || 0)
      
      // Check if we have the new structured format or legacy format
      const isStructuredFormat = normalizedData.spotTrades !== undefined && normalizedData.futuresIncome !== undefined
      
      if (isStructuredFormat) {
        setProgress(`Analyzing ${normalizedData.spotTrades.length} spot trades + ${normalizedData.futuresIncome.length} futures records...`)
      } else {
        // Legacy format
        const trades = normalizedData.trades || normalizedData
        setProgress(`Analyzing ${trades.length} trades...`)
      }
      
      // Analyze using master analyzer (handles both formats)
      const analysis = analyzeData(normalizedData)
      
      console.log('🔍 ANALYSIS RESULT:', analysis)
      console.log('🔍 Futures trades count:', analysis.futuresTrades)
      console.log('🔍 Futures P&L:', analysis.futuresPnL)
      console.log('🔍 Spot trades count:', analysis.spotTrades)
      console.log('🔍 Has psychology?', !!analysis.psychology)
      
      setAnalytics(analysis)
      setCurrencyMetadata(normalizedData.metadata)
      
      // Set initial currency
      if (normalizedData.metadata?.primaryCurrency) {
        setCurrency(normalizedData.metadata.primaryCurrency)
      }
      
      setStatus('connected')
      setProgress('')
    } catch (err) {
      console.error('❌ Error in handleConnect:', err)
      setError(err.message)
      setStatus('error')
      setProgress('')
    }
  }

  const handleDisconnect = () => {
    setStatus('idle')
    setAnalytics(null)
    setCurrency('USD')
    setCurrencyMetadata(null)
    setIsDemoMode(false)
  }

  // Filter analytics by currency for CoinDCX
  const getFilteredAnalytics = () => {
    if (!analytics || !currencyMetadata?.supportsCurrencySwitch) {
      return analytics
    }

    // Filter symbols that match the selected currency
    const filteredSymbols = {}
    const currencySuffix = currency === 'INR' ? 'INR' : 'USDT'
    
    Object.entries(analytics.symbols).forEach(([symbol, data]) => {
      if (symbol.endsWith(currencySuffix)) {
        filteredSymbols[symbol] = data
      }
    })

    // Recalculate totals for filtered symbols
    let totalPnL = 0
    let winningTrades = 0
    let losingTrades = 0

    Object.values(filteredSymbols).forEach(symbolData => {
      totalPnL += symbolData.realized || symbolData.netPnL || 0
      winningTrades += symbolData.wins
      losingTrades += symbolData.losses
    })

    const bestSymbol = Object.keys(filteredSymbols).reduce((best, symbol) => 
      (filteredSymbols[symbol].realized || filteredSymbols[symbol].netPnL || 0) > 
      (filteredSymbols[best]?.realized || filteredSymbols[best]?.netPnL || -Infinity) ? symbol : best, 
      Object.keys(filteredSymbols)[0]
    )

    return {
      ...analytics,
      symbols: filteredSymbols,
      totalPnL,
      winningTrades,
      losingTrades,
      winRate: winningTrades + losingTrades > 0 ? (winningTrades / (winningTrades + losingTrades)) * 100 : 0,
      bestSymbol
    }
  }

  const displayAnalytics = getFilteredAnalytics()
  const currSymbol = getCurrencySymbol(currency)

  // Show loading animation for demo mode
  if (status === 'loading' || status === 'connecting') {
    return <DemoLoadingScreen progress={progress} />
  }

  // Render analytics view if connected
  if (status === 'connected' && displayAnalytics) {
    return (
      <>
        {isDemoMode && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 text-center text-sm font-medium shadow-lg">
            📊 Demo Mode: Viewing sample futures trading data from Binance
          </div>
        )}
        <div className={isDemoMode ? 'pt-10' : ''}>
          <AnalyticsView
            analytics={displayAnalytics}
            currSymbol={currSymbol}
            exchangeConfig={currentExchange.config}
            currencyMetadata={currencyMetadata}
            currency={currency}
            setCurrency={setCurrency}
            onDisconnect={handleDisconnect}
          />
        </div>
      </>
    )
  }

  // Render login form by default
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
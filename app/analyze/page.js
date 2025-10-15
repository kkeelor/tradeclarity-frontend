'use client'

import { useState } from 'react'
import { analyzeData } from './utils/masterAnalyzer'
import { EXCHANGES, getExchangeList } from './utils/exchanges'
import LoginForm from './components/LoginForm'
import AnalyticsView from './components/AnalyticsView'
import demoFuturesData from './demo-data/demo-futures-data.json'

export default function TradeClarity() {
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

  const handleTryDemo = () => {
    setStatus('connecting')
    setProgress('Loading demo data...')
    setIsDemoMode(true)

    try {
      // Simulate loading delay for better UX
      setTimeout(() => {
        console.log('📊 Loading demo data...')
        console.log('Demo futures income:', demoFuturesData.income.length)
        
        // Prepare demo data in the format expected by analyzers
        const demoData = {
          spotTrades: [], // No spot trades in demo
          futuresIncome: demoFuturesData.income,
          futuresPositions: demoFuturesData.positions,
          metadata: {
            primaryCurrency: 'USD',
            availableCurrencies: ['USD'],
            supportsCurrencySwitch: false,
            accountType: 'FUTURES',
            hasFutures: true,
            futuresPositions: demoFuturesData.positions.length,
            spotTrades: 0,
            futuresIncome: demoFuturesData.income.length
          }
        }

        setProgress('Analyzing demo data...')
        
        // Analyze using master analyzer
        const analysis = analyzeData(demoData)
        
        console.log('✅ Demo analysis complete:', analysis)
        console.log('Futures P&L:', analysis.futuresPnL)
        console.log('Futures trades:', analysis.futuresTrades)
        
        setAnalytics(analysis)
        setCurrencyMetadata(demoData.metadata)
        setStatus('connected')
        setProgress('')
      }, 800) // Small delay for UX
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
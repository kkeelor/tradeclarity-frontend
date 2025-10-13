'use client'

import { useState } from 'react'
import { analyzeData } from './utils/analyzer'
import { EXCHANGES, getExchangeList } from './utils/exchanges'
import LoginForm from './components/LoginForm'
import AnalyticsView from './components/AnalyticsView'

export default function TradeClarity() {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')
  const [analytics, setAnalytics] = useState(null)
  const [exchange, setExchange] = useState('binance')
  const [currency, setCurrency] = useState('USD')
  const [currencyMetadata, setCurrencyMetadata] = useState(null)

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

  const handleConnect = async (apiKey, apiSecret) => {
    if (!apiKey || !apiSecret) {
      setError('Please enter both API key and secret')
      return
    }

    setStatus('connecting')
    setError('')

    try {
      // Fetch trades using exchange-specific function
      const rawData = await currentExchange.fetchTrades(apiKey, apiSecret, setProgress)
      
      const rawTrades = rawData.trades || rawData
      const metadata = rawData.metadata || {}
      
      setProgress(`Normalizing ${rawTrades.length} trades...`)
      
      // Normalize trades to common format
      const normalizedData = currentExchange.normalizeTrades(rawData)
      const normalizedTrades = normalizedData.trades || normalizedData
      const tradeMetadata = normalizedData.metadata || metadata

      setProgress(`Analyzing ${normalizedTrades.length} trades...`)
      
      // Analyze using common logic
      const analysis = analyzeData(normalizedTrades)
      
      setAnalytics(analysis)
      setCurrencyMetadata(tradeMetadata)
      
      // Set initial currency
      if (tradeMetadata.primaryCurrency) {
        setCurrency(tradeMetadata.primaryCurrency)
      }
      
      setStatus('connected')
      setProgress('')
    } catch (err) {
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
    let totalInvested = 0
    let totalCommission = 0
    let winningTrades = 0
    let losingTrades = 0

    Object.values(filteredSymbols).forEach(symbolData => {
      totalPnL += symbolData.realized
      winningTrades += symbolData.wins
      losingTrades += symbolData.losses
    })

    const bestSymbol = Object.keys(filteredSymbols).reduce((best, symbol) => 
      filteredSymbols[symbol].realized > (filteredSymbols[best]?.realized || -Infinity) ? symbol : best, 
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
      <AnalyticsView
        analytics={displayAnalytics}
        currSymbol={currSymbol}
        exchangeConfig={currentExchange.config}
        currencyMetadata={currencyMetadata}
        currency={currency}
        setCurrency={setCurrency}
        onDisconnect={handleDisconnect}
      />
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
      status={status}
      error={error}
      progress={progress}
    />
  )
}
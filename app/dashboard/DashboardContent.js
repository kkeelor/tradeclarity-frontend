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

export default function DashboardContent() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')
  const [exchange, setExchange] = useState('binance')
  const [showAPIConnection, setShowAPIConnection] = useState(false)
  const [showCSVUpload, setShowCSVUpload] = useState(false)

  const exchangeList = getExchangeList()
  const currentExchange = EXCHANGES[exchange]

  const handleConnect = async (apiKey, apiSecret, preFetchedData = null) => {
    console.log('?? handleConnect called', { hasData: !!preFetchedData })
    setStatus('connecting')
    setError('')
    setProgress('Connection successful! Redirecting to analytics...')

    try {
      // Note: LoginForm already calls /api/exchange/connect which:
      // 1. Saves encrypted credentials to database
      // 2. Fetches and stores trade data in database
      // So we don't need to fetch data here - just navigate to /analyze
      // The /analyze page will fetch data from the database
      
      // Small delay to show success message and ensure UI updates
      await new Promise(resolve => setTimeout(resolve, 800))
      
      console.log('?? Navigating to /analyze...')
      // Navigate to analytics page - it will fetch data from database
      router.push('/analyze')
    } catch (err) {
      console.error('? Connection error:', err)
      setError(err.message || 'Failed to connect to exchange')
      setStatus('error')
      setProgress('')
    }
  }

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

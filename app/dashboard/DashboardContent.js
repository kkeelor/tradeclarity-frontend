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
    setStatus('connecting')
    setError('')
    setProgress('Connecting to exchange...')

    try {
      let data

      if (preFetchedData) {
        data = preFetchedData
      } else {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
        const endpoint = `${backendUrl}/api/${exchange}/fetch-all`

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey, apiSecret })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP ${response.status}`)
        }

        const responseData = await response.json()
        data = responseData.data || responseData
      }

      setProgress('Analyzing your trading data...')
      
      // Navigate to analytics page - it will handle data fetching
      router.push('/analyze')
    } catch (err) {
      console.error('Connection error:', err)
      setError(err.message || 'Failed to connect to exchange')
      setStatus('error')
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

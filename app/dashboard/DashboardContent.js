// app/dashboard/DashboardContent.js
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import Dashboard from '../analyze/components/Dashboard'
import LoginForm from '../analyze/components/LoginForm'
import CSVUploadFlow from '../analyze/components/CSVUploadFlow'
import { EXCHANGES, getExchangeList } from '../analyze/utils/exchanges'
import { analyzeData } from '../analyze/utils/masterAnalyzer'
import { TrendingUp, BarChart3, Brain, Zap, Sparkles } from 'lucide-react'

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
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 mb-6">
            <TrendingUp className="w-10 h-10 text-emerald-400" />
            <h1 className="text-3xl font-bold">TradeClarity</h1>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-8 space-y-6 backdrop-blur-sm">
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
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')
  const [exchange, setExchange] = useState('binance')
  const [showAPIConnection, setShowAPIConnection] = useState(false)
  const [showCSVUpload, setShowCSVUpload] = useState(false)
  const [loadingComplete, setLoadingComplete] = useState(false)
  
  // Store user reference for use in async callbacks
  const userRef = useRef(user)
  useEffect(() => {
    userRef.current = user
  }, [user])

  // Redirect to login page if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/dashboard')
    }
  }, [user, authLoading, router])

  const exchangeList = getExchangeList()
  const currentExchange = EXCHANGES[exchange]


  const handleSnaptradeConnection = async () => {
    console.log('🚀 [Snaptrade Flow] Starting Snaptrade connection flow')
    setStatus('connecting')
    setError('')
    setProgress('Connecting to Snaptrade...')

    // CRITICAL: Open popup IMMEDIATELY to preserve user gesture chain
    // Chrome blocks popups opened after async operations
    const width = 600
    const height = 700
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2

    // Open popup with loading page first
    const popup = window.open(
      '/snaptrade/loading',
      'Snaptrade Connection',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    )

    if (!popup) {
      console.error('❌ [Snaptrade Flow] Popup blocked')
      setStatus('error')
      setProgress('')
      setError('Popup blocked. Please allow popups for this site and try again.')
      return
    }

    try {
      console.log('✅ [Snaptrade Flow] Popup opened, calling initiate-connection API')
      // Call initiate-connection API (handles registration check and login URL generation)
      let response
      try {
        response = await fetch('/api/snaptrade/initiate-connection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customRedirect: `${window.location.origin}/snaptrade/callback?status=success`,
          }),
        })
      } catch (fetchError) {
        console.error('❌ [Snaptrade Flow] Fetch error (network/request failed):', {
          message: fetchError?.message,
          name: fetchError?.name,
          stack: fetchError?.stack,
        })
        popup.close()
        throw new Error(`Network error: ${fetchError?.message || 'Failed to connect to server'}`)
      }

      console.log('📡 [Snaptrade Flow] API response status:', response.status, response.statusText)
      
      let data
      try {
        const responseText = await response.text()
        console.log('📡 [Snaptrade Flow] API response text:', responseText?.substring(0, 500))
        data = responseText ? JSON.parse(responseText) : {}
      } catch (parseError) {
        console.error('❌ [Snaptrade Flow] Failed to parse response:', parseError)
        data = { error: 'Invalid response from server' }
      }
      
      console.log('📡 [Snaptrade Flow] API response data:', {
        success: data.success,
        hasRedirectURI: !!data.redirectURI,
        hasSessionId: !!data.sessionId,
        wasRegistered: data.wasRegistered,
        error: data.error,
        errorDetails: data.details,
        code: data.code,
      })

      if (!response.ok) {
        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          details: data.details,
          code: data.code,
          fullData: data,
        }
        console.error('❌ [Snaptrade Flow] API error:', JSON.stringify(errorDetails, null, 2))
        popup.close()
        // Handle duplicate user error
        if (data.code === 'DUPLICATE_USER' || response.status === 409) {
          throw new Error('Your account is already connected to Snaptrade. Please contact support if you need assistance.')
        }
        const errorMessage = data.error || data.details?.message || `Failed to initiate Snaptrade connection (${response.status})`
        throw new Error(errorMessage)
      }

      console.log('✅ [Snaptrade Flow] Login URL received, updating popup location')
      // Update popup location to Snaptrade URL (maintains user gesture chain)
      popup.location.href = data.redirectURI

      console.log('✅ [Snaptrade Flow] Popup opened, waiting for callback')
      setProgress('Waiting for brokerage connection...')

      // Listen for callback via message from callback page
      const handleMessage = (event) => {
        console.log('📨 [Snaptrade Flow] Message received:', {
          origin: event.origin,
          expectedOrigin: window.location.origin,
          type: event.data?.type,
          data: event.data,
        })

        // Only process messages from our own origin (callback page)
        // Ignore messages from Snaptrade's domain (app.snaptrade.com)
        if (event.origin !== window.location.origin) {
          console.log('ℹ️ [Snaptrade Flow] Message from external origin (likely Snaptrade modal), ignoring:', event.origin)
          return
        }

        // Only process messages with our expected type
        if (!event.data || typeof event.data !== 'object' || !event.data.type) {
          console.log('ℹ️ [Snaptrade Flow] Message without expected type, ignoring')
          return
        }

        if (event.data.type === 'snaptrade_connected') {
          console.log('✅ [Snaptrade Flow] Connection successful, starting data fetch')
          window.removeEventListener('message', handleMessage)
          setProgress('Brokerage connected! Syncing connections...')

          // Wait a moment for Snaptrade to process, then sync connections and fetch accounts
          setTimeout(async () => {
            try {
              // Sync SnapTrade accounts to exchange_connections table
              console.log('🔄 [Snaptrade Flow] Syncing connections...')
              const syncResponse = await fetch('/api/snaptrade/sync-connections', {
                method: 'POST',
              })
              if (syncResponse.ok) {
                const syncData = await syncResponse.json()
                console.log('✅ [Snaptrade Flow] Sync complete:', syncData)
              } else {
                console.warn('⚠️ [Snaptrade Flow] Sync failed, but continuing')
              }
              
              console.log('📊 [Snaptrade Flow] Fetching accounts...')
              setProgress('Brokerage connected! Fetching your data...')
              // Fetch accounts
              const accountsResponse = await fetch('/api/snaptrade/accounts')
              console.log('📊 [Snaptrade Flow] Accounts response:', {
                status: accountsResponse.status,
                ok: accountsResponse.ok,
              })
              
              if (accountsResponse.ok) {
                const accountsData = await accountsResponse.json()
                console.log('📊 [Snaptrade Flow] Accounts data:', {
                  accountCount: accountsData.accounts?.length || 0,
                  accounts: accountsData.accounts?.map(a => ({ id: a.id, name: a.name, institution: a.institution_name })),
                })
                const accounts = accountsData.accounts || []

                if (accounts.length > 0) {
                  // Fetch transactions for all accounts
                  console.log('📊 [Snaptrade Flow] Fetching transactions...')
                  setProgress('Fetching transaction history...')
                  const transactionsResponse = await fetch('/api/snaptrade/transactions')
                  console.log('📊 [Snaptrade Flow] Transactions response:', {
                    status: transactionsResponse.status,
                    ok: transactionsResponse.ok,
                  })
                  
                  if (transactionsResponse.ok) {
                    const transactionsData = await transactionsResponse.json()
                    console.log('📊 [Snaptrade Flow] Transactions data:', {
                      activityCount: transactionsData.activities?.length || 0,
                      firstFew: transactionsData.activities?.slice(0, 3),
                    })
                    const activities = transactionsData.activities || []

                    // Fetch holdings data
                    console.log('📊 [Snaptrade Flow] Fetching holdings...')
                    setProgress('Fetching account balances...')
                    const holdingsResponse = await fetch('/api/snaptrade/holdings')
                    console.log('📊 [Snaptrade Flow] Holdings response:', {
                      status: holdingsResponse.status,
                      ok: holdingsResponse.ok,
                    })
                    
                    let holdingsData = null
                    if (holdingsResponse.ok) {
                      const holdingsResult = await holdingsResponse.json()
                      holdingsData = holdingsResult.holdings
                      console.log('📊 [Snaptrade Flow] Holdings data:', {
                        hasHoldings: !!holdingsData,
                        isArray: Array.isArray(holdingsData),
                        accountCount: Array.isArray(holdingsData) ? holdingsData.length : 0,
                        holdingsStructure: Array.isArray(holdingsData) && holdingsData.length > 0 ? {
                          firstAccount: {
                            accountId: holdingsData[0]?.account?.id,
                            accountName: holdingsData[0]?.account?.name,
                            positionsCount: holdingsData[0]?.positions?.length || 0,
                            cashCount: holdingsData[0]?.cash?.length || 0,
                            totalValue: holdingsData[0]?.total_value,
                            positions: holdingsData[0]?.positions?.slice(0, 3).map(p => ({
                              symbol: p.symbol?.symbol,
                              units: p.units,
                              price: p.price,
                              value: p.units * p.price,
                            })),
                            cash: holdingsData[0]?.cash?.map(c => ({
                              currency: c.currency?.code || c.currency,
                              amount: c.amount,
                            })),
                          },
                        } : holdingsData,
                      })
                    } else {
                      const errorData = await holdingsResponse.json().catch(() => ({}))
                      console.error('❌ [Snaptrade Flow] Failed to fetch holdings:', {
                        status: holdingsResponse.status,
                        error: errorData,
                      })
                    }

                    if (activities.length > 0) {
                      // Transform Snaptrade activities to TradeClarity format
                      console.log('🔄 [Snaptrade Flow] Transforming trades...')
                      const { transformActivitiesToTrades } = await import('@/lib/snaptrade-transform')
                      const transformedTrades = transformActivitiesToTrades(activities)
                      console.log('✅ [Snaptrade Flow] Transformed trades:', {
                        originalCount: activities.length,
                        transformedCount: transformedTrades.length,
                        sampleTrade: transformedTrades[0],
                      })

                      // Prepare data for analysis
                      const analysisData = {
                        spotTrades: transformedTrades,
                        futuresTrades: [],
                        futuresIncome: [],
                        metadata: {
                          primaryCurrency: 'USD',
                          exchanges: ['snaptrade'],
                          source: 'snaptrade',
                        },
                      }

                      // Transform and analyze data
                      console.log('📊 [Snaptrade Flow] Analyzing data...')
                      setProgress('Analyzing your trading data...')
                      const analysis = await analyzeData(analysisData)
                      console.log('✅ [Snaptrade Flow] Analysis complete:', {
                        hasAnalysis: !!analysis,
                        analysisKeys: analysis ? Object.keys(analysis) : [],
                      })

                      // Calculate tradesStats
                      const allTradesArray = transformedTrades
                      const sortedTrades = [...allTradesArray].sort((a, b) => {
                        const timeA = a.time || a.trade_time || 0
                        const timeB = b.time || b.trade_time || 0
                        return new Date(timeA) - new Date(timeB)
                      })
                      
                      const tradesStats = {
                        totalTrades: allTradesArray.length,
                        spotTrades: transformedTrades.length,
                        futuresIncome: 0,
                        futuresPositions: 0,
                        oldestTrade: sortedTrades.length > 0 ? (sortedTrades[0].time || sortedTrades[0].trade_time) : null,
                        newestTrade: sortedTrades.length > 0 ? (sortedTrades[sortedTrades.length - 1].time || sortedTrades[sortedTrades.length - 1].trade_time) : null,
                        primaryCurrency: 'USD',
                        exchanges: ['snaptrade'],
                      }

                      // Store analytics and data in sessionStorage for VegaAI
                      sessionStorage.setItem('preAnalyzedData', JSON.stringify({
                        analytics: analysis,
                        data: analysisData,
                        tradesStats: tradesStats,
                        currencyMetadata: analysisData.metadata,
                        currency: 'USD',
                        holdings: holdingsData, // Include holdings data
                      }))

                      // Store trades
                      console.log('💾 [Snaptrade Flow] Storing trades...')
                      const currentUser = userRef.current
                      if (!currentUser) {
                        console.error('❌ [Snaptrade Flow] No user found for storing trades')
                      } else {
                        const storeResponse = await fetch('/api/trades/store', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            spotTrades: transformedTrades,
                            futuresIncome: [],
                            userId: currentUser.id,
                            exchange: 'snaptrade',
                            metadata: {
                              primaryCurrency: 'USD',
                              exchanges: ['snaptrade'],
                              source: 'snaptrade',
                            },
                          }),
                        })
                        
                        const storeData = await storeResponse.json().catch(() => ({}))
                        console.log('💾 [Snaptrade Flow] Store response:', {
                          status: storeResponse.status,
                          ok: storeResponse.ok,
                          data: storeData,
                        })
                        
                        if (!storeResponse.ok) {
                          console.error('❌ [Snaptrade Flow] Failed to store trades:', {
                            status: storeResponse.status,
                            error: storeData,
                          })
                        }
                      }

                      // Sync SnapTrade connections to exchange_connections table
                      console.log('🔄 [Snaptrade Flow] Syncing connections...')
                      try {
                        const syncResponse = await fetch('/api/snaptrade/sync-connections', {
                          method: 'POST',
                        })
                        if (syncResponse.ok) {
                          const syncData = await syncResponse.json()
                          console.log('✅ [Snaptrade Flow] Connections synced:', syncData)
                        } else {
                          console.warn('⚠️ [Snaptrade Flow] Sync failed, but continuing')
                        }
                      } catch (syncError) {
                        console.error('❌ [Snaptrade Flow] Sync error:', syncError)
                        // Don't block the flow if sync fails
                      }

                      console.log('✅ [Snaptrade Flow] Flow complete, redirecting to Vega AI')
                      setStatus('success')
                      setProgress('')
                      router.push('/vega')
                    } else {
                      console.warn('⚠️ [Snaptrade Flow] No transactions found')
                      setStatus('idle')
                      setProgress('')
                      setError('No transactions found. Please ensure your brokerage account has trading history.')
                    }
                  } else {
                    const errorData = await transactionsResponse.json().catch(() => ({}))
                    console.error('❌ [Snaptrade Flow] Failed to fetch transactions:', {
                      status: transactionsResponse.status,
                      error: errorData,
                    })
                    setStatus('idle')
                    setProgress('')
                    setError('Failed to fetch transactions. Please try again.')
                  }
                } else {
                  console.warn('⚠️ [Snaptrade Flow] No accounts found')
                  setStatus('idle')
                  setProgress('')
                  setError('No accounts found. Please ensure your brokerage account is connected.')
                }
              } else {
                let errorData = {}
                try {
                  const text = await accountsResponse.text()
                  console.error('❌ [Snaptrade Flow] Failed to fetch accounts - raw response:', text)
                  errorData = JSON.parse(text)
                } catch (e) {
                  console.error('❌ [Snaptrade Flow] Failed to parse error response:', e)
                }
                
                console.error('❌ [Snaptrade Flow] Failed to fetch accounts:', {
                  status: accountsResponse.status,
                  statusText: accountsResponse.statusText,
                  error: errorData,
                  url: accountsResponse.url,
                })
                setStatus('idle')
                setProgress('')
                setError(errorData.error || `Failed to fetch accounts (${accountsResponse.status}). Please check server logs.`)
              }
            } catch (err) {
              console.error('❌ [Snaptrade Flow] Error fetching Snaptrade data:', {
                error: err,
                message: err.message,
                stack: err.stack,
              })
              setStatus('idle')
              setProgress('')
              setError(err.message || 'Failed to fetch your trading data')
            }
          }, 2000)
        } else if (event.data.type === 'snaptrade_error') {
          console.error('❌ [Snaptrade Flow] Connection error from callback:', event.data.error)
          window.removeEventListener('message', handleMessage)
          setStatus('idle')
          setProgress('')
          setError(event.data.error || 'Failed to connect brokerage')
        }
      }

      window.addEventListener('message', handleMessage)
      console.log('👂 [Snaptrade Flow] Message listener attached')

      // Fallback: Check if popup closed (user might have closed it manually)
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          console.log('⚠️ [Snaptrade Flow] Popup closed by user')
          clearInterval(checkClosed)
          window.removeEventListener('message', handleMessage)
          // Only reset if we're still in connecting state (user closed before completion)
          if (status === 'connecting') {
            setStatus('idle')
            setProgress('')
          }
        }
      }, 500)
    } catch (err) {
      const errorDetails = {
        message: err?.message || 'Unknown error',
        name: err?.name,
        stack: err?.stack,
        toString: err?.toString(),
      }
      console.error('❌ [Snaptrade Flow] Connection error:', JSON.stringify(errorDetails, null, 2))
      console.error('❌ [Snaptrade Flow] Raw error object:', err)
      setStatus('error')
      setProgress('')
      setError(err?.message || 'Failed to connect with Snaptrade')
    }
  }

  const handleConnect = async (apiKey, apiSecret, preFetchedData = null) => {
    // If we're already connecting and receiving data, update progress and analyze
    if (status === 'connecting' && preFetchedData) {
      setProgress('Analyzing your trading data...')
      
      try {
        const analysis = await analyzeData(preFetchedData)

        // Calculate tradesStats from raw data
        const allTradesArray = [
          ...(preFetchedData.spotTrades || []),
          ...(preFetchedData.futuresTrades || []),
          ...(preFetchedData.futuresIncome || [])
        ]
        const sortedTrades = [...allTradesArray].sort((a, b) => {
          const timeA = a.time || a.trade_time || 0
          const timeB = b.time || b.trade_time || 0
          return new Date(timeA) - new Date(timeB)
        })
        
        const tradesStats = {
          totalTrades: allTradesArray.length,
          spotTrades: preFetchedData.spotTrades?.length || 0,
          futuresIncome: preFetchedData.futuresIncome?.length || 0,
          futuresPositions: preFetchedData.futuresPositions?.length || 0,
          oldestTrade: sortedTrades.length > 0 ? (sortedTrades[0].time || sortedTrades[0].trade_time) : null,
          newestTrade: sortedTrades.length > 0 ? (sortedTrades[sortedTrades.length - 1].time || sortedTrades[sortedTrades.length - 1].trade_time) : null,
          primaryCurrency: preFetchedData.metadata?.primaryCurrency || 'USD',
          exchanges: preFetchedData.metadata?.exchanges || []
        }

        // Store analytics and data in sessionStorage for VegaAI
        sessionStorage.setItem('preAnalyzedData', JSON.stringify({
          analytics: analysis,
          data: preFetchedData,
          tradesStats: tradesStats,
          currencyMetadata: preFetchedData.metadata,
          currency: preFetchedData.metadata?.primaryCurrency || 'USD'
        }))

        setProgress('Analysis complete! Redirecting to Vega AI...')
        setLoadingComplete(true)
        
        // Redirect to VegaAI after a brief delay
        setTimeout(() => {
          router.push('/vega')
        }, 500)
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

        // Calculate tradesStats from raw data
        const allTradesArray = [
          ...(preFetchedData.spotTrades || []),
          ...(preFetchedData.futuresTrades || []),
          ...(preFetchedData.futuresIncome || [])
        ]
        const sortedTrades = [...allTradesArray].sort((a, b) => {
          const timeA = a.time || a.trade_time || 0
          const timeB = b.time || b.trade_time || 0
          return new Date(timeA) - new Date(timeB)
        })
        
        const tradesStats = {
          totalTrades: allTradesArray.length,
          spotTrades: preFetchedData.spotTrades?.length || 0,
          futuresIncome: preFetchedData.futuresIncome?.length || 0,
          futuresPositions: preFetchedData.futuresPositions?.length || 0,
          oldestTrade: sortedTrades.length > 0 ? (sortedTrades[0].time || sortedTrades[0].trade_time) : null,
          newestTrade: sortedTrades.length > 0 ? (sortedTrades[sortedTrades.length - 1].time || sortedTrades[sortedTrades.length - 1].trade_time) : null,
          primaryCurrency: preFetchedData.metadata?.primaryCurrency || 'USD',
          exchanges: preFetchedData.metadata?.exchanges || []
        }

        // Store analytics and data in sessionStorage for VegaAI
        sessionStorage.setItem('preAnalyzedData', JSON.stringify({
          analytics: analysis,
          data: preFetchedData,
          tradesStats: tradesStats,
          currencyMetadata: preFetchedData.metadata,
          currency: preFetchedData.metadata?.primaryCurrency || 'USD'
        }))

        setProgress('Analysis complete! Redirecting to Vega AI...')
        setLoadingComplete(true)
        
        // Redirect to VegaAI after a brief delay
        setTimeout(() => {
          router.push('/vega')
        }, 500)
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

      // Calculate tradesStats from raw data
      const allTradesArray = [
        ...(data.spotTrades || []),
        ...(data.futuresTrades || []),
        ...(data.futuresIncome || [])
      ]
      const sortedTrades = [...allTradesArray].sort((a, b) => {
        const timeA = a.time || a.trade_time || 0
        const timeB = b.time || b.trade_time || 0
        return new Date(timeA) - new Date(timeB)
      })
      
      const tradesStats = {
        totalTrades: allTradesArray.length,
        spotTrades: data.spotTrades?.length || 0,
        futuresIncome: data.futuresIncome?.length || 0,
        futuresPositions: data.futuresPositions?.length || 0,
        oldestTrade: sortedTrades.length > 0 ? (sortedTrades[0].time || sortedTrades[0].trade_time) : null,
        newestTrade: sortedTrades.length > 0 ? (sortedTrades[sortedTrades.length - 1].time || sortedTrades[sortedTrades.length - 1].trade_time) : null,
        primaryCurrency: data.metadata?.primaryCurrency || 'USD',
        exchanges: data.metadata?.exchanges || []
      }

      // Store analytics and data in sessionStorage for VegaAI
      sessionStorage.setItem('preAnalyzedData', JSON.stringify({
        analytics: analysis,
        data,
        tradesStats: tradesStats,
        currencyMetadata: data.metadata,
        currency: data.metadata?.primaryCurrency || 'USD'
      }))

      setProgress('Analysis complete! Redirecting to Vega AI...')
      setLoadingComplete(true)
      
      // Redirect to VegaAI after a brief delay
      setTimeout(() => {
        router.push('/vega')
      }, 500)
    } catch (err) {
      console.error('? [DashboardContent] Connection error:', err)
      setError(err.message || 'Failed to connect to exchange. Please check your API credentials.')
      setStatus('error')
      setProgress('')
    }
  }

  // Navigate to VegaAI page when loading completes (after exchange connection)
  useEffect(() => {
    if (loadingComplete && status === 'connecting') {
      router.push('/vega')
    }
  }, [loadingComplete, status, router])

  const handleViewAnalytics = async (connectionIdOrSources = null, exchangeName = null) => {
    // Navigate to Vega AI page - analytics redirects now go to Vega
    // Store the selection in sessionStorage (Vega can use this if needed)
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
    // If no filters, Vega will fetch all data
    
    // Navigate immediately
    router.push('/vega')
  }

  const handleTryDemo = () => {
    // Navigate to demo video page
    router.push('/demo')
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
    return null // Redirect is happening (useEffect above handles the redirect)
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
      onConnectSnaptrade={handleSnaptradeConnection}
      onViewAnalytics={handleViewAnalytics}
    />
  )
}

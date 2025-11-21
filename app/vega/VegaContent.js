// app/vega/VegaContent.js
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import AuthScreen from '../analyze/components/AuthScreen'
import { analyzeData } from '../analyze/utils/masterAnalyzer'
import AIChat from '../analyze/components/AIChat'
import Header from '../analyze/components/Header'
import { useMultipleTabs } from '@/lib/hooks/useMultipleTabs'
import { EXCHANGES, getExchangeList } from '../analyze/utils/exchanges'
import { Loader2, Brain, Sparkles } from 'lucide-react'

export default function VegaContent() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  useMultipleTabs() // Register this tab for multi-tab detection
  const [analytics, setAnalytics] = useState(null)
  const [allTrades, setAllTrades] = useState([])
  const [tradesStats, setTradesStats] = useState(null)
  const [currencyMetadata, setCurrencyMetadata] = useState(null)
  const [currency, setCurrency] = useState('USD')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Listen for switch requests from other tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'tradeclarity_switch_to_dashboard' && window.location.pathname === '/vega') {
        // This tab is VegaAI - focus it
        window.focus()
        localStorage.removeItem('tradeclarity_switch_to_dashboard')
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Load analytics data on mount
  useEffect(() => {
    if (authLoading) return

    const loadAnalytics = async () => {
      try {
        setLoading(true)
        
        // Try to get from sessionStorage first (if redirected from exchange connection)
        const preAnalyzedData = sessionStorage.getItem('preAnalyzedData')
        if (preAnalyzedData) {
          const parsed = JSON.parse(preAnalyzedData)
          setAnalytics(parsed.analytics)
          setAllTrades(parsed.data?.trades || [])
          setTradesStats(parsed.data?.tradesStats || null)
          setCurrencyMetadata(parsed.currencyMetadata)
          setCurrency(parsed.currency || 'USD')
          // Clear sessionStorage after loading
          sessionStorage.removeItem('preAnalyzedData')
          setLoading(false)
          return
        }

        // Otherwise, fetch from cache
        const response = await fetch('/api/analytics/cache')
        const data = await response.json()

        if (data.success && data.analytics) {
          setAnalytics(data.analytics)
          setAllTrades(data.allTrades || [])
          setTradesStats(data.tradesStats || null)
          setCurrencyMetadata(data.currencyMetadata)
          setCurrency(data.currency || 'USD')
        } else {
          // No data available
          setAnalytics(null)
          setAllTrades([])
          setTradesStats(null)
        }
      } catch (err) {
        console.error('Error loading analytics:', err)
        setError(err.message || 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      loadAnalytics()
    } else {
      setLoading(false)
    }
  }, [user, authLoading])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
          <p className="text-white/60">Loading Vega AI...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthScreen />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md">
          <Brain className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-semibold">Error Loading Data</h2>
          <p className="text-white/60">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-emerald-400/10 hover:bg-emerald-400/15 border border-emerald-400/30 rounded-lg text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Header
        exchangeConfig={null}
        currencyMetadata={currencyMetadata}
        currency={currency}
        setCurrency={setCurrency}
        onNavigateDashboard={() => router.push('/dashboard')}
        onNavigateUpload={() => router.push('/data')}
        onNavigateAll={() => router.push('/analyze')}
        onNavigateVega={() => router.push('/vega')}
        onSignOut={async () => {
          await fetch('/api/auth/signout', { method: 'POST' })
          router.push('/')
        }}
        hasDataSources={!!tradesStats && tradesStats.totalTrades > 0}
      />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center">
              <Brain className="w-6 h-6 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold text-white/90">Vega AI</h1>
          </div>
          <p className="text-white/60 text-sm">
            Your AI trading assistant powered by Claude
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <AIChat
            analytics={analytics}
            allTrades={allTrades}
            tradesStats={tradesStats}
            onConnectExchange={() => router.push('/dashboard')}
            onUploadCSV={() => router.push('/data')}
          />
        </div>
      </main>
    </div>
  )
}

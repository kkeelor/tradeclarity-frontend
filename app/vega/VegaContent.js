// app/vega/VegaContent.js
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import AuthScreen from '../analyze/components/AuthScreen'
import { analyzeData } from '../analyze/utils/masterAnalyzer'
import AIChat from '../analyze/components/AIChat'
import Header from '../analyze/components/Header'
import { useMultipleTabs } from '@/lib/hooks/useMultipleTabs'
import { EXCHANGES, getExchangeList } from '../analyze/utils/exchanges'
import { Loader2, Brain } from 'lucide-react'
import Footer from '../components/Footer'

export default function VegaContent() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  useMultipleTabs() // Register this tab for multi-tab detection
  const [analytics, setAnalytics] = useState(null)
  const [allTrades, setAllTrades] = useState([])
  const [tradesStats, setTradesStats] = useState(null)
  const [metadata, setMetadata] = useState(null)
  const [currencyMetadata, setCurrencyMetadata] = useState(null)
  const [currency, setCurrency] = useState('USD')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const chatInputRef = useRef(null)

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
          console.log('[VegaContent] Loading from sessionStorage:', {
            hasAnalytics: !!parsed.analytics,
            hasData: !!parsed.data,
            tradesStats: parsed.tradesStats || parsed.data?.tradesStats,
            totalTrades: (parsed.tradesStats || parsed.data?.tradesStats)?.totalTrades,
            tradesCount: parsed.data?.trades?.length || parsed.data?.spotTrades?.length
          })
          setAnalytics(parsed.analytics)
          setAllTrades(parsed.data?.trades || parsed.analytics?.allTrades || [])
          setTradesStats(parsed.tradesStats || parsed.data?.tradesStats || null)
          setMetadata(parsed.data?.metadata || parsed.currencyMetadata || null)
          setCurrencyMetadata(parsed.currencyMetadata)
          setCurrency(parsed.currency || 'USD')
          // Clear sessionStorage after loading
          sessionStorage.removeItem('preAnalyzedData')
          setLoading(false)
          return
        }

        // Otherwise, fetch from cache and stats endpoint
        const [cacheResponse, statsResponse] = await Promise.all([
          fetch('/api/analytics/cache'),
          fetch('/api/trades/stats')
        ])
        
        // Check if responses are OK before parsing JSON
        let cacheData = { success: false, analytics: null }
        let statsData = { success: false, metadata: null }
        
        if (cacheResponse.ok) {
          try {
            const contentType = cacheResponse.headers.get('content-type')
            if (contentType && contentType.includes('application/json')) {
              cacheData = await cacheResponse.json()
            } else {
              console.warn('[VegaContent] Cache API returned non-JSON response')
            }
          } catch (error) {
            console.error('[VegaContent] Error parsing cache response:', error)
          }
        } else {
          console.warn(`[VegaContent] Cache API returned ${cacheResponse.status}`)
        }
        
        if (statsResponse.ok) {
          try {
            const contentType = statsResponse.headers.get('content-type')
            if (contentType && contentType.includes('application/json')) {
              statsData = await statsResponse.json()
            } else {
              console.warn('[VegaContent] Stats API returned non-JSON response')
            }
          } catch (error) {
            console.error('[VegaContent] Error parsing stats response:', error)
          }
        } else {
          console.warn(`[VegaContent] Stats API returned ${statsResponse.status}`)
        }

        console.log('[VegaContent] Loading from API:', {
          cacheSuccess: cacheData.success,
          hasAnalytics: !!cacheData.analytics,
          statsSuccess: statsData.success,
          tradesStats: statsData.metadata,
          totalTrades: statsData.metadata?.totalTrades
        })

        if (cacheData.success && cacheData.analytics) {
          setAnalytics(cacheData.analytics)
          setAllTrades(cacheData.allTrades || [])
          
          // Extract metadata from analytics if available
          const metadataFromAnalytics = cacheData.analytics.metadata || null
          setMetadata(metadataFromAnalytics)
          setCurrencyMetadata(metadataFromAnalytics)
          setCurrency(metadataFromAnalytics?.primaryCurrency || 'USD')
        } else {
          // No analytics cache available
          setAnalytics(null)
          setAllTrades([])
          setMetadata(null)
        }

        // Always set tradesStats from stats endpoint (works even without cache)
        if (statsData.success && statsData.metadata) {
          setTradesStats(statsData.metadata)
          // Also update currency from stats if metadata wasn't available
          if (!cacheData.success || !cacheData.analytics) {
            setCurrency(statsData.metadata.primaryCurrency || 'USD')
            setCurrencyMetadata({
              primaryCurrency: statsData.metadata.primaryCurrency || 'USD',
              availableCurrencies: statsData.metadata.availableCurrencies || ['USD'],
              supportsCurrencySwitch: statsData.metadata.supportsCurrencySwitch || false
            })
          }
        } else {
          // No trades stats available
          console.warn('[VegaContent] No tradesStats available:', statsData)
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
    <div className="min-h-screen bg-black text-white flex flex-col">
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
      
      <main className="max-w-6xl mx-auto px-6 py-6 flex flex-col flex-1 min-h-0">
        <div className="mb-4 text-center space-y-2 flex-shrink-0">
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center">
              <Brain className="w-5 h-5 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white/90">Vega AI</h1>
          </div>
          <p className="text-white/60 text-xs">
            Your AI trading assistant powered by Claude
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <AIChat
            ref={chatInputRef}
            analytics={analytics}
            allTrades={allTrades}
            tradesStats={tradesStats}
            metadata={metadata}
            onConnectExchange={() => router.push('/dashboard')}
            onUploadCSV={() => router.push('/data')}
            isVegaPage={true}
          />
        </div>
      </main>

      <Footer />
    </div>
  )
}

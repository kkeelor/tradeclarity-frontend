// app/vega/VegaContent.js
'use client'

import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import AuthScreen from '../analyze/components/AuthScreen'
import AIChat from '../analyze/components/AIChat'
import Header from '../analyze/components/Header'
import { Loader2, Brain, Sparkles, Zap, TrendingUp, Shield, ArrowRight, RefreshCw, Menu, X } from 'lucide-react'
import AuthModal from '../components/AuthModal'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'

// OPTIMIZATION: Lazy load VegaSidebar - it's not critical for initial render
const VegaSidebar = lazy(() => import('./components/VegaSidebar'))

// OPTIMIZATION: Lazy load heavy analysis function - only needed for demo mode
const loadAnalyzeData = () => import('../analyze/utils/masterAnalyzer').then(m => m.analyzeData)

// OPTIMIZATION: Demo data loaded dynamically only when needed (saves ~50-100KB from main bundle)
const loadDemoData = async () => {
  const [spotData, futuresData] = await Promise.all([
    import('../analyze/demo-data/demo-spot-data.json').then(m => m.default),
    import('../analyze/demo-data/demo-futures-data.json').then(m => m.default)
  ])
  return { spotData, futuresData }
}

export default function VegaContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const [analytics, setAnalytics] = useState(null)
  const [allTrades, setAllTrades] = useState([])
  const [tradesStats, setTradesStats] = useState(null)
  const [metadata, setMetadata] = useState(null)
  const [currencyMetadata, setCurrencyMetadata] = useState(null)
  const [currency, setCurrency] = useState('USD')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // Initialize demo mode from URL immediately (synchronously)
  const [isDemoMode, setIsDemoMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('demo') === 'true'
    }
    return false
  })
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showTokenLimitModal, setShowTokenLimitModal] = useState(false)
  const [demoTokensUsed, setDemoTokensUsed] = useState(0)
  const [coachMode, setCoachMode] = useState(() => {
    // Load from localStorage on initial render
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vega_coach_mode')
      // Default to true if no saved preference exists
      return saved === null ? true : saved === 'true'
    }
    return true
  })
  const chatRef = useRef(null)
  const [currentConversationId, setCurrentConversationId] = useState(null)
  const [refreshingAnalytics, setRefreshingAnalytics] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isDisclaimerExpanded, setIsDisclaimerExpanded] = useState(false)
  
  // Persist coach mode preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vega_coach_mode', coachMode.toString())
    }
  }, [coachMode])
  
  // Check for demo mode from query params (also check window.location as fallback)
  const isDemoRequested = searchParams?.get('demo') === 'true' || 
    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === 'true')
  
  // OPTIMIZATION: Track demo token usage via events only (removed 500ms polling)
  useEffect(() => {
    if (!isDemoMode || !isDemoRequested) return
    
    const updateTokenDisplay = () => {
      if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem('vega_demo_tokens_used')
        const tokens = stored ? parseInt(stored, 10) : 0
        setDemoTokensUsed(tokens)
      }
    }
    
    // Initial load
    updateTokenDisplay()
    
    // Listen for storage changes (when AIChat updates tokens)
    const handleStorageChange = (e) => {
      if (e.key === 'vega_demo_tokens_used') {
        updateTokenDisplay()
      }
    }
    
    // Listen for custom event from AIChat (same-tab updates)
    const handleTokensUpdated = () => {
      updateTokenDisplay()
    }
    
    // Listen for token limit reached event
    const handleTokenLimitReached = () => {
      updateTokenDisplay()
      setShowTokenLimitModal(true)
    }
    
    // OPTIMIZATION: Removed setInterval polling - use only event-based updates
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('demoTokensUpdated', handleTokensUpdated)
    window.addEventListener('demoTokenLimitReached', handleTokenLimitReached)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('demoTokensUpdated', handleTokensUpdated)
      window.removeEventListener('demoTokenLimitReached', handleTokenLimitReached)
    }
  }, [isDemoMode, isDemoRequested])


  // OPTIMIZATION: Store API fetch promises to start early
  // Store promises that resolve to parsed JSON data, not Response objects
  const apiFetchRef = useRef(null)
  
  // OPTIMIZATION: Start API fetch as early as possible (don't wait for auth to complete)
  // This runs in parallel with auth checking
  useEffect(() => {
    // Only start fetch for authenticated flow (not demo mode)
    if (isDemoRequested) return
    
    // Start fetching immediately and parse JSON - we'll use results when auth completes
    apiFetchRef.current = Promise.all([
      fetch('/api/analytics/cache')
        .then(async (res) => {
          if (!res.ok) return { success: false, analytics: null }
          try {
            const contentType = res.headers.get('content-type')
            if (contentType && contentType.includes('application/json')) {
              return await res.json()
            }
            return { success: false, analytics: null }
          } catch (error) {
            console.error('[VegaContent] Error parsing cache response:', error)
            return { success: false, analytics: null }
          }
        })
        .catch(() => ({ success: false, analytics: null })),
      fetch('/api/trades/stats')
        .then(async (res) => {
          if (!res.ok) return { success: false, metadata: null }
          try {
            const contentType = res.headers.get('content-type')
            if (contentType && contentType.includes('application/json')) {
              return await res.json()
            }
            return { success: false, metadata: null }
          } catch (error) {
            console.error('[VegaContent] Error parsing stats response:', error)
            return { success: false, metadata: null }
          }
        })
        .catch(() => ({ success: false, metadata: null }))
    ])
  }, [isDemoRequested])

  // Set demo mode immediately if requested (before auth checks)
  // Also check on mount in case searchParams wasn't ready initially
  useEffect(() => {
    const checkDemo = () => {
      const urlDemo = searchParams?.get('demo') === 'true' || 
        (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === 'true')
      if (urlDemo) {
        setIsDemoMode(true)
      }
    }
    checkDemo()
  }, [searchParams])

  // Function to refresh analytics manually
  const refreshAnalytics = async () => {
    if (isDemoMode || !user) return
    
    try {
      setRefreshingAnalytics(true)
      
      // Trigger analytics computation
      const response = await fetch('/api/analytics/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      let result = null
      try {
        result = await response.json()
      } catch (parseError) {
        console.error('Failed to parse analytics response:', parseError)
        throw new Error(`Failed to refresh analytics (${response.status}): ${response.statusText}`)
      }
      
      if (!response.ok) {
        const errorMsg = result?.message || result?.error || `Failed to refresh analytics (${response.status})`
        console.error('Analytics refresh error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMsg,
          result: result
        })
        // Don't throw - just log and return early
        return
      }
      
      if (result.success) {
        // Reload analytics cache
        const cacheResponse = await fetch('/api/analytics/cache')
        if (cacheResponse.ok) {
          const cacheData = await cacheResponse.json()
          if (cacheData.success && cacheData.analytics) {
            setAnalytics(cacheData.analytics)
            setAllTrades(cacheData.allTrades || [])
            const metadataFromAnalytics = cacheData.analytics.metadata || null
            setMetadata(metadataFromAnalytics)
            setCurrencyMetadata(metadataFromAnalytics)
          }
        }
        
        // Reload stats
        const statsResponse = await fetch('/api/trades/stats')
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          if (statsData.success && statsData.metadata) {
            setTradesStats(statsData.metadata)
          }
        }
        
        // Show success message
        toast.success('Analytics refreshed successfully')
      } else {
        console.error('Analytics computation failed:', {
          success: result.success,
          message: result.message,
          error: result.error
        })
        // Don't show toast for errors - just log
      }
    } catch (error) {
      console.error('Error refreshing analytics:', {
        error: error.message,
        stack: error.stack,
        name: error.name
      })
      // Don't show toast - just log to console
    } finally {
      setRefreshingAnalytics(false)
    }
  }

  // Load analytics data on mount
  useEffect(() => {
    // Wait for auth loading to complete (unless in demo mode)
    if (authLoading && !isDemoRequested) return

    const loadAnalytics = async () => {
      try {
        setLoading(true)
        
        // Demo mode - load demo data dynamically
        if (isDemoRequested) {
          try {
            // OPTIMIZATION: Dynamic imports for demo data and analyzer
            const [{ spotData: demoSpotData, futuresData: demoFuturesData }, analyzeData] = await Promise.all([
              loadDemoData(),
              loadAnalyzeData()
            ])
            
            const normalizedSpotTrades = demoSpotData.map(trade => ({
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
                availableCurrencies: ['USD', 'INR', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CNY', 'SGD', 'CHF'],
                supportsCurrencySwitch: true,
                accountType: 'MIXED',
                hasFutures: true,
                futuresPositions: demoFuturesData.positions.length,
                spotTrades: normalizedSpotTrades.length,
                futuresIncome: demoFuturesData.income.length,
                spotHoldings: [
                  { asset: 'BTC', quantity: 0.3971906, usdValue: 18296.45, exchange: 'binance' },
                  { asset: 'USDT', quantity: 3872.19, usdValue: 3872.19, exchange: 'binance' },
                  { asset: 'DOT', quantity: 275.43, usdValue: 1960.30, exchange: 'binance' },
                  { asset: 'AVAX', quantity: 27.00, usdValue: 1003.91, exchange: 'binance' },
                  { asset: 'ARB', quantity: 620.54, usdValue: 813.91, exchange: 'binance' },
                  { asset: 'ETH', quantity: 0.185, usdValue: 444.00, exchange: 'binance' },
                  { asset: 'SOL', quantity: 2.85, usdValue: 370.50, exchange: 'binance' },
                  { asset: 'LINK', quantity: 18.75, usdValue: 300.00, exchange: 'binance' },
                  { asset: 'ADA', quantity: 2850.0, usdValue: 1710.00, exchange: 'binance' },
                  { asset: 'BNB', quantity: 0.85, usdValue: 280.50, exchange: 'binance' },
                  { asset: 'XRP', quantity: 1200.0, usdValue: 660.00, exchange: 'binance' },
                  { asset: 'MATIC', quantity: 450.0, usdValue: 382.50, exchange: 'binance' },
                  { asset: 'DOGE', quantity: 8500.0, usdValue: 1275.00, exchange: 'binance' }
                ],
                totalPortfolioValue: 30468.27,
                totalSpotValue: 30468.27,
                totalFuturesValue: 0
              }
            }

            const analysis = await analyzeData(demoData)
            setAnalytics(analysis)
            setAllTrades(analysis.allTrades || normalizedSpotTrades)
            setCurrencyMetadata(demoData.metadata)
            setMetadata(demoData.metadata)
            // Load saved currency preference from localStorage
            const savedCurrency = typeof window !== 'undefined' ? localStorage.getItem('tradeclarity_currency') : null
            if (savedCurrency) {
              setCurrency(savedCurrency)
            } else {
              setCurrency('USD')
            }
            // Set demo trades stats
            setTradesStats({
              totalTrades: normalizedSpotTrades.length,
              spotTrades: normalizedSpotTrades.length,
              futuresIncome: demoFuturesData.income.length,
              futuresPositions: demoFuturesData.positions.length,
              primaryCurrency: 'USD'
            })
            setLoading(false)
            return
          } catch (err) {
            console.error('Demo loading error:', err)
            setError('Failed to load demo data')
            setLoading(false)
            return
          }
        }
        
        // Real mode - require authentication
        if (!user) {
          setLoading(false)
          return
        }
        
        // Try to get from sessionStorage first (if redirected from exchange connection)
        const preAnalyzedData = sessionStorage.getItem('preAnalyzedData')
        if (preAnalyzedData) {
          const parsed = JSON.parse(preAnalyzedData)
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

        // OPTIMIZATION: Use pre-fetched API data (started earlier in parallel with auth)
        // The promise now resolves to parsed JSON data, not Response objects
        let cacheData = { success: false, analytics: null }
        let statsData = { success: false, metadata: null }
        
        if (apiFetchRef.current) {
          [cacheData, statsData] = await apiFetchRef.current
        } else {
          // Fallback if ref wasn't set - fetch and parse immediately
          const [cacheResponse, statsResponse] = await Promise.all([
            fetch('/api/analytics/cache'),
            fetch('/api/trades/stats')
          ])
          
          if (cacheResponse.ok) {
            try {
              const contentType = cacheResponse.headers.get('content-type')
              if (contentType && contentType.includes('application/json')) {
                cacheData = await cacheResponse.json()
              }
            } catch (error) {
              console.error('[VegaContent] Error parsing cache response:', error)
            }
          }
          
          if (statsResponse.ok) {
            try {
              const contentType = statsResponse.headers.get('content-type')
              if (contentType && contentType.includes('application/json')) {
                statsData = await statsResponse.json()
              }
            } catch (error) {
              console.error('[VegaContent] Error parsing stats response:', error)
            }
          }
        }

        if (cacheData.success && cacheData.analytics) {
          setAnalytics(cacheData.analytics)
          setAllTrades(cacheData.allTrades || [])
          
          const metadataFromAnalytics = cacheData.analytics.metadata || null
          setMetadata(metadataFromAnalytics)
          setCurrencyMetadata(metadataFromAnalytics)
          setCurrency(metadataFromAnalytics?.primaryCurrency || 'USD')
        } else {
          setAnalytics(null)
          setAllTrades([])
          setMetadata(null)
        }

        if (statsData.success && statsData.metadata) {
          setTradesStats(statsData.metadata)
          if (!cacheData.success || !cacheData.analytics) {
            setCurrency(statsData.metadata.primaryCurrency || 'USD')
            setCurrencyMetadata({
              primaryCurrency: statsData.metadata.primaryCurrency || 'USD',
              availableCurrencies: statsData.metadata.availableCurrencies || ['USD'],
              supportsCurrencySwitch: statsData.metadata.supportsCurrencySwitch || false
            })
          }
        } else {
          setTradesStats(null)
        }
      } catch (err) {
        console.error('Error loading analytics:', err)
        setError(err.message || 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }

    loadAnalytics()
  }, [user, authLoading, isDemoRequested, router])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-emerald-400 mx-auto" />
          <p className="text-sm sm:text-base text-white/60">Loading Vega AI...</p>
        </div>
      </div>
    )
  }

  // Show auth screen only if not in demo mode and not authenticated
  if (!user && !isDemoMode) {
    return <AuthScreen />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 sm:p-6">
        <div className="text-center space-y-4 max-w-md">
          <Brain className="w-10 h-10 sm:w-12 sm:h-12 text-red-400 mx-auto" />
          <h2 className="text-lg sm:text-xl font-semibold">Error Loading Data</h2>
          <p className="text-sm sm:text-base text-white/60">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base bg-emerald-400/10 hover:bg-emerald-400/15 border border-emerald-400/30 rounded-lg text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
      <Header
        exchangeConfig={null}
        currencyMetadata={null}
        currency={currency}
        setCurrency={setCurrency}
        onNavigateDashboard={() => {
          if (!user && isDemoMode) {
            router.push('/login')
          } else {
            router.push('/dashboard')
          }
        }}
        onNavigateUpload={() => {
          if (!user && isDemoMode) {
            router.push('/login')
          } else {
            router.push('/data')
          }
        }}
        onNavigateAll={() => router.push('/vega')}
        onNavigateVega={() => router.push('/vega')}
        onSignOut={() => {
          if (!user && isDemoMode) {
            setShowAuthModal(true)
          } else {
            fetch('/api/auth/signout', { method: 'POST' }).then(() => {
              router.push('/')
            })
          }
        }}
        hasDataSources={!!tradesStats && tradesStats.totalTrades > 0}
        isDemoMode={isDemoMode}
      />
      
      {/* Main Content Area - Full width flex container */}
      <main className="flex flex-col md:flex-row flex-1 min-h-0 bg-black overflow-hidden">

        {/* Mobile Sidebar Drawer */}
        {isMobileSidebarOpen && (
          <>
            {/* Backdrop */}
            <div
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            {/* Mobile Sidebar */}
            <div className="md:hidden fixed inset-y-0 left-0 w-64 bg-zinc-950 border-r border-white/5 z-50 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <span className="text-lg font-semibold text-white">Chat History</span>
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close sidebar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <Suspense fallback={
                  <div className="p-4">
                    <div className="w-full h-12 bg-white/5 rounded-xl animate-pulse" />
                  </div>
                }>
                  <VegaSidebar 
                    onNewChat={() => {
                      setIsMobileSidebarOpen(false)
                      if (chatRef.current?.isNewChat?.()) {
                        return
                      }
                      setCurrentConversationId(null)
                      chatRef.current?.clearChat()
                    }}
                    onSelectChat={(conversationId) => {
                      setIsMobileSidebarOpen(false)
                      setCurrentConversationId(conversationId)
                      if (chatRef.current && conversationId) {
                        chatRef.current.loadConversation(conversationId)
                      }
                    }}
                    currentConversationId={currentConversationId}
                    coachMode={coachMode}
                    setCoachMode={setCoachMode}
                    isMobile={true}
                  />
                </Suspense>
              </div>
            </div>
          </>
        )}

        {/* OPTIMIZATION: Lazy-loaded Sidebar with Suspense fallback */}
        <Suspense fallback={
          <div className="w-64 hidden md:flex flex-col border-r border-white/5 bg-zinc-950/30 flex-shrink-0 h-full">
            <div className="p-4">
              <div className="w-full h-12 bg-white/5 rounded-xl animate-pulse" />
            </div>
          </div>
        }>
          <VegaSidebar 
            onNewChat={() => {
              // Don't do anything if already on new chat screen
              if (chatRef.current?.isNewChat?.()) {
                return
              }
              setCurrentConversationId(null)
              chatRef.current?.clearChat()
            }}
            onSelectChat={(conversationId) => {
              setCurrentConversationId(conversationId)
              // Load conversation messages into AIChat
              if (chatRef.current && conversationId) {
                chatRef.current.loadConversation(conversationId)
              }
            }}
            currentConversationId={currentConversationId}
            coachMode={coachMode}
            setCoachMode={setCoachMode}
            isMobile={false}
          />
        </Suspense>

        {/* Chat Area */}
        <div className="flex flex-col flex-1 h-full relative min-w-0 md:ml-0">
          {/* Demo Mode Banner (Overlay or Top Bar) */}
          {isDemoMode && !user && (
            <div className="absolute top-2 left-2 right-2 sm:top-4 sm:left-4 sm:right-4 z-20 flex justify-center pointer-events-none">
              <div className="bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 rounded-full px-2.5 py-1.5 sm:px-4 sm:py-2 flex items-center gap-1.5 sm:gap-3 shadow-lg pointer-events-auto max-w-full">
                 <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-400 flex-shrink-0" />
                 <span className="text-[10px] sm:text-xs text-white/90 font-medium whitespace-nowrap">Demo Mode</span>
                 <div className="w-px h-2 sm:h-3 bg-white/10 flex-shrink-0" />
                 <button
                    onClick={() => setShowAuthModal(true)}
                    className="text-[10px] sm:text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-0.5 sm:gap-1 whitespace-nowrap"
                  >
                    Sign In <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </button>
              </div>
            </div>
          )}

          <div className="flex flex-col flex-1 min-h-0 relative">
            {/* Vega AI Disclaimer */}
            <div className={`px-2 sm:px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 ${isDemoMode && !user ? 'mt-12 sm:mt-16' : ''} relative`}>
              <div className="sm:hidden">
                {/* Mobile: Single line with read more */}
                <p className="text-[10px] text-amber-400/80 text-center leading-relaxed pr-12">
                  <strong>Disclaimer:</strong> Vega AI provides AI-powered trading insights.{' '}
                  {!isDisclaimerExpanded && (
                    <button
                      onClick={() => setIsDisclaimerExpanded(true)}
                      className="text-amber-300 hover:text-amber-200 underline font-medium"
                    >
                      Read more
                    </button>
                  )}
                </p>
                {isDisclaimerExpanded && (
                  <p className="text-[10px] text-amber-400/80 text-center leading-relaxed pr-12 mt-1">
                    This is not financial advice. Always conduct your own research and consult with a qualified financial advisor before making trading decisions.{' '}
                    <button
                      onClick={() => setIsDisclaimerExpanded(false)}
                      className="text-amber-300 hover:text-amber-200 underline font-medium"
                    >
                      Show less
                    </button>
                  </p>
                )}
              </div>
              <p className="hidden sm:block text-xs text-amber-400/80 text-center leading-relaxed pr-24">
                <strong>Disclaimer:</strong> Vega AI provides AI-powered trading insights and analysis. 
                This is not financial advice. Always conduct your own research and consult with a qualified financial advisor before making trading decisions.
              </p>
              
              {/* Refresh Button - Top Right */}
              {!isDemoMode && user && (
                <div className="absolute top-1/2 -translate-y-1/2 right-2 sm:right-4">
                  <button
                    onClick={refreshAnalytics}
                    disabled={refreshingAnalytics}
                    className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1 sm:py-1.5 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    title="Refresh analytics data"
                  >
                    <RefreshCw className={`w-3 sm:w-3.5 h-3 sm:h-3.5 ${refreshingAnalytics ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline font-medium">Refresh</span>
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex-1 min-h-0">
              <AIChat
                ref={chatRef}
                analytics={analytics}
                allTrades={allTrades}
                tradesStats={tradesStats}
                metadata={metadata}
                conversationId={currentConversationId}
                onConnectExchange={() => {
                  if (!user && isDemoMode) {
                    router.push('/login')
                  } else {
                    router.push('/dashboard')
                  }
                }}
                onUploadCSV={() => {
                  if (!user && isDemoMode) {
                    router.push('/login')
                  } else {
                    router.push('/data')
                  }
                }}
                isVegaPage={true}
                isFullPage={true}
                isDemoMode={isDemoMode}
                coachMode={coachMode}
                onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Auth Modal */}
      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onAuthSuccess={(user) => {
          setShowAuthModal(false)
        }}
      />

      {/* Token Limit Reached Modal */}
      <Dialog open={showTokenLimitModal} onOpenChange={setShowTokenLimitModal}>
        <DialogContent className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 max-w-md">
          <DialogHeader>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-emerald-400" />
              </div>
              <DialogTitle className="text-xl font-semibold text-white">
                Demo limit reached
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-sm">
                You've used all {demoTokensUsed.toLocaleString()} demo tokens. Sign up to continue with your own trades.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 text-sm text-slate-300">
                <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Analyze your real trading data</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-slate-300">
                <Zap className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>10,000 tokens/month on free plan</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-slate-300">
                <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Unlimited conversations</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  setShowTokenLimitModal(false)
                  setShowAuthModal(true)
                }}
                className="w-full h-11 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 rounded-xl font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-[1.02] disabled:hover:scale-100"
              >
                Sign Up - It's Free
                <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-xs text-center text-slate-500 mt-2">
                No credit card required
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

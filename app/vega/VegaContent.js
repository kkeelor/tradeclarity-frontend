// app/vega/VegaContent.js
'use client'

import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import AIChat from '../analyze/components/AIChat'
import Header from '../analyze/components/Header'
import { Loader2, Brain, Sparkles, Zap, TrendingUp, Shield, ArrowRight, RefreshCw, Menu, X } from 'lucide-react'
import AuthModal from '../components/AuthModal'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'

// OPTIMIZATION: Lazy load VegaSidebar - it's not critical for initial render
const VegaSidebar = lazy(() => import('./components/VegaSidebar'))


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
  const [showAuthModal, setShowAuthModal] = useState(false)
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
  const [subscription, setSubscription] = useState(null)
  
  // Persist coach mode preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vega_coach_mode', coachMode.toString())
    }
  }, [coachMode])
  
  // Fetch subscription
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user?.id) return
      
      try {
        // Check cache first (5 minute TTL)
        const cacheKey = `subscription_${user.id}`
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          try {
            const { data: subscriptionData, timestamp } = JSON.parse(cached)
            const age = Date.now() - timestamp
            const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
            
            if (age < CACHE_TTL) {
              setSubscription(subscriptionData)
              return
            }
          } catch (e) {
            // Invalid cache, continue to fetch
          }
        }
        
        const response = await fetch(`/api/subscriptions/current?userId=${user.id}`)
        if (response.ok) {
          const data = await response.json()
          const subscriptionData = data.subscription
          setSubscription(subscriptionData)
          
          // Cache the subscription data
          if (subscriptionData) {
            localStorage.setItem(cacheKey, JSON.stringify({
              data: subscriptionData,
              timestamp: Date.now()
            }))
          }
        }
      } catch (error) {
        console.error('Error fetching subscription:', error)
      }
    }
    
    fetchSubscription()
  }, [user])
  


  // OPTIMIZATION: Store API fetch promises to start early
  // Store promises that resolve to parsed JSON data, not Response objects
  const apiFetchRef = useRef(null)
  
  // OPTIMIZATION: Start API fetch as early as possible (don't wait for auth to complete)
  // This runs in parallel with auth checking
  useEffect(() => {
    
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
  }, [])

  // Function to refresh analytics manually
  const refreshAnalytics = async () => {
    if (!user) return
    
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
    // Wait for auth loading to complete
    if (authLoading) return

    const loadAnalytics = async () => {
      try {
        setLoading(true)
        
        // Require authentication
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
  }, [user, authLoading, router])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

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

  if (!user) {
    return null
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
        onNavigateDashboard={() => router.push('/dashboard')}
        onNavigateUpload={() => router.push('/data')}
        onNavigateAll={() => router.push('/vega')}
        onNavigateVega={() => router.push('/vega')}
        onSignOut={() => {
          fetch('/api/auth/signout', { method: 'POST' }).then(() => {
            router.push('/')
          })
        }}
        subscription={subscription}
        hasDataSources={!!tradesStats && tradesStats.totalTrades > 0}
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
          <div className="flex flex-col flex-1 min-h-0 relative">
            {/* Vega AI Disclaimer */}
            <div className="px-2 sm:px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 relative">
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
            </div>
            
            <div className="flex-1 min-h-0">
              <AIChat
                ref={chatRef}
                analytics={analytics}
                allTrades={allTrades}
                tradesStats={tradesStats}
                metadata={metadata}
                conversationId={currentConversationId}
                onConnectExchange={() => router.push('/dashboard')}
                onUploadCSV={() => router.push('/data')}
                isVegaPage={true}
                isFullPage={true}
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

      <Dialog>
        <DialogContent>
          <div>
            <div>
              <button
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

// app/vega/VegaContent.js
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import AuthScreen from '../analyze/components/AuthScreen'
import { analyzeData } from '../analyze/utils/masterAnalyzer'
import AIChat from '../analyze/components/AIChat'
import Header from '../analyze/components/Header'
import { useMultipleTabs } from '@/lib/hooks/useMultipleTabs'
import { EXCHANGES, getExchangeList } from '../analyze/utils/exchanges'
import { Loader2, Brain, LogIn, Sparkles, Zap, TrendingUp, Shield, ArrowRight, HelpCircle, MessageCircle } from 'lucide-react'
import Footer from '../components/Footer'
import AuthModal from '../components/AuthModal'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import demoFuturesData from '../analyze/demo-data/demo-futures-data.json'
import demoSpotData from '../analyze/demo-data/demo-spot-data.json'

export default function VegaContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
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
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showTokenLimitModal, setShowTokenLimitModal] = useState(false)
  const [demoTokensUsed, setDemoTokensUsed] = useState(0)
  const [coachMode, setCoachMode] = useState(() => {
    // Load from localStorage on initial render
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vega_coach_mode')
      return saved === 'true'
    }
    return false
  })
  const chatInputRef = useRef(null)
  
  // Persist coach mode preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vega_coach_mode', coachMode.toString())
    }
  }, [coachMode])
  
  // Check for demo mode from query params
  const isDemoRequested = searchParams?.get('demo') === 'true'
  
  // Track demo token usage from sessionStorage
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
    
    // Listen for custom event from AIChat
    const handleTokensUpdated = () => {
      updateTokenDisplay()
    }
    
    // Listen for token limit reached event
    const handleTokenLimitReached = () => {
      updateTokenDisplay()
      setShowTokenLimitModal(true)
    }
    
    // Poll for changes (since storage event only fires in other tabs)
    const interval = setInterval(updateTokenDisplay, 500)
    
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('demoTokensUpdated', handleTokensUpdated)
    window.addEventListener('demoTokenLimitReached', handleTokenLimitReached)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('demoTokensUpdated', handleTokensUpdated)
      window.removeEventListener('demoTokenLimitReached', handleTokenLimitReached)
    }
  }, [isDemoMode, isDemoRequested])

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
    // Wait for auth loading to complete (unless in demo mode)
    if (authLoading && !isDemoRequested) return

    // If user is signed in and demo is requested, redirect to dashboard
    if (user && isDemoRequested) {
      router.replace('/dashboard')
      return
    }

    const loadAnalytics = async () => {
      try {
        setLoading(true)
        
        // Demo mode - load demo data
        if (isDemoRequested) {
          setIsDemoMode(true)
          try {
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

    loadAnalytics()
  }, [user, authLoading, isDemoRequested])

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

  // Show auth screen only if not in demo mode and not authenticated
  if (!user && !isDemoMode) {
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
            // Show auth modal for unauthenticated users
            setShowAuthModal(true)
          } else {
            // Sign out authenticated users
            fetch('/api/auth/signout', { method: 'POST' }).then(() => {
              router.push('/')
            })
          }
        }}
        hasDataSources={!!tradesStats && tradesStats.totalTrades > 0}
        isDemoMode={isDemoMode}
      />
      
      <main className="max-w-6xl mx-auto px-6 py-6 flex flex-col flex-1 min-h-0">
        {/* Demo Mode Banner for unauthenticated users */}
        {isDemoMode && !user && (
          <div className="mb-4 p-4 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between gap-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Demo Mode</p>
                <p className="text-xs text-white/60">You're viewing sample data. Sign in to analyze your own trades.</p>
              </div>
            </div>
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-4 py-2 bg-emerald-400/10 hover:bg-emerald-400/15 border border-emerald-400/30 rounded-lg text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          </div>
        )}
        
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
          
          {/* Coach Mode Toggle */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setCoachMode(!coachMode)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      coachMode
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                        : 'bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-slate-300 hover:border-slate-600/50'
                    }`}
                  >
                    <MessageCircle className={`w-3.5 h-3.5 ${coachMode ? 'text-emerald-400' : ''}`} />
                    <span>Coach Mode</span>
                    <div className={`w-8 h-4 rounded-full transition-colors relative ${coachMode ? 'bg-emerald-500/30' : 'bg-slate-700/50'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${coachMode ? 'bg-emerald-400 left-4' : 'bg-slate-500 left-0.5'}`} />
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="font-medium mb-1">Coach Mode</p>
                  <p className="text-xs leading-relaxed">
                    {coachMode 
                      ? 'Interactive coaching with concise responses and guided follow-up options. Click to switch to standard mode.'
                      : 'Enable for more interactive, concise responses with guided follow-up options. Great for focused improvement.'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {/* Demo Token Limit Display */}
          {isDemoMode && !user && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <div className={`px-3 py-1.5 border rounded-lg text-xs flex items-center gap-2 ${
                demoTokensUsed >= 2700 
                  ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                  : demoTokensUsed >= 2100
                  ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                  : 'bg-slate-800/50 border-slate-700/50'
              }`}>
                <span className={demoTokensUsed >= 2100 ? 'text-current' : 'text-slate-400'}>Demo tokens: </span>
                <span className={`font-medium ${demoTokensUsed >= 2100 ? 'text-current' : 'text-white'}`}>
                  {demoTokensUsed.toLocaleString()}
                </span>
                <span className={demoTokensUsed >= 2100 ? 'text-current opacity-80' : 'text-slate-500'}> / 3,000</span>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className={`w-3.5 h-3.5 transition-colors  ${
                      demoTokensUsed >= 2700 
                        ? 'text-red-400 hover:text-red-300' 
                        : demoTokensUsed >= 2100
                        ? 'text-orange-400 hover:text-orange-300'
                        : 'text-white/40 hover:text-white/60'
                    }`} />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="font-medium mb-1">AI Token Usage</p>
                    <p className="text-xs leading-relaxed mb-2">
                      Tokens are consumed each time you ask Vega AI a question. Each conversation uses tokens based on the complexity and length of your question and the response.
                    </p>
                    <p className="text-xs leading-relaxed">
                      <strong>Demo limit:</strong> 3,000 tokens. Sign up for a free account to get 10,000 tokens/month.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <AIChat
            ref={chatInputRef}
            analytics={analytics}
            allTrades={allTrades}
            tradesStats={tradesStats}
            metadata={metadata}
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
            isDemoMode={isDemoMode}
            coachMode={coachMode}
          />
        </div>
      </main>

      <Footer />

      {/* Auth Modal */}
      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onAuthSuccess={(user) => {
          // Auth success - page will reload to update state
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
            {/* Benefits - minimal list */}
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

            {/* CTA */}
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

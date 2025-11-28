// app/page.js
'use client'

import { useState, useEffect, useRef } from 'react'
import { TrendingUp, Shield, Zap, ArrowRight, Sparkles, Lock, Eye, Brain, TrendingDown, Target, AlertCircle, LogOut, LayoutDashboard, HelpCircle, ChevronRight, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import ThemeToggle from './components/ThemeToggle'
import { useAuth } from '@/lib/AuthContext'
import { useMultipleTabs } from '@/lib/hooks/useMultipleTabs'
import Footer from './components/Footer'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

// Typing animation component
function TypingAnimation({ texts, className = '' }) {
  const [displayedText, setDisplayedText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const typeIntervalRef = useRef(null)
  const deleteIntervalRef = useRef(null)
  const animationTimeoutRef = useRef(null)
  const charIndexRef = useRef(0)

  useEffect(() => {
    const currentText = texts[currentIndex]
    setIsTyping(true)
    setIsDeleting(false)
    setDisplayedText('')
    charIndexRef.current = 0

    // Clear any existing intervals
    if (typeIntervalRef.current) clearInterval(typeIntervalRef.current)
    if (deleteIntervalRef.current) clearInterval(deleteIntervalRef.current)
    if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current)

    // Typing animation
    typeIntervalRef.current = setInterval(() => {
      if (charIndexRef.current < currentText.length) {
        charIndexRef.current++
        setDisplayedText(currentText.substring(0, charIndexRef.current))
      } else {
        clearInterval(typeIntervalRef.current)
        setIsTyping(false)
        
        // Wait 3 seconds before deleting
        animationTimeoutRef.current = setTimeout(() => {
          setIsDeleting(true)
          deleteIntervalRef.current = setInterval(() => {
            if (charIndexRef.current > 0) {
              charIndexRef.current--
              setDisplayedText(currentText.substring(0, charIndexRef.current))
            } else {
              clearInterval(deleteIntervalRef.current)
              setIsDeleting(false)
              // Move to next text (cycles through all)
              setCurrentIndex((prev) => (prev + 1) % texts.length)
            }
          }, 30) // Delete speed
        }, 3000) // Wait 3 seconds before deleting
      }
    }, 50) // Typing speed

    return () => {
      if (typeIntervalRef.current) clearInterval(typeIntervalRef.current)
      if (deleteIntervalRef.current) clearInterval(deleteIntervalRef.current)
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current)
    }
  }, [currentIndex, texts])

  return (
    <span className={className}>
      {displayedText}
      <span className={`inline-block w-0.5 h-[1em] bg-slate-200/80 ml-1 align-middle ${isTyping || isDeleting ? 'animate-pulse' : ''}`} />
    </span>
  )
}

export default function LandingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { hasOtherTabs, otherTabCount } = useMultipleTabs()
  const [isPrimaryHovered, setIsPrimaryHovered] = useState(false)
  const [isSecondaryHovered, setIsSecondaryHovered] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showTabDialog, setShowTabDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState(null)

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
      window.location.href = '/'
    } catch (error) {
      console.error('Sign out error:', error)
      window.location.href = '/'
    }
  }

  const handleDashboardClick = (e) => {
    // Check if there are other active tabs
    if (hasOtherTabs && user) {
      e.preventDefault()
      setPendingNavigation('/dashboard')
      setShowTabDialog(true)
      return
    }
    // Normal navigation
    router.push('/dashboard')
  }

  const handleSwitchToTab = () => {
    // Try to focus existing tab by broadcasting a message
    localStorage.setItem('tradeclarity_switch_to_dashboard', Date.now().toString())
    setShowTabDialog(false)
    setPendingNavigation(null)
    
    // Show message that user should check other tab
    setTimeout(() => {
      alert('Please check your other tab. If it doesn\'t switch automatically, click Dashboard there.')
    }, 100)
  }

  const handleContinueInThisTab = () => {
    setShowTabDialog(false)
    if (pendingNavigation) {
      router.push(pendingNavigation)
      setPendingNavigation(null)
    }
  }

  // Listen for switch requests from other tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'tradeclarity_switch_to_dashboard' && window.location.pathname === '/dashboard') {
        // This tab is the dashboard - focus it
        window.focus()
        localStorage.removeItem('tradeclarity_switch_to_dashboard')
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="p-4 md:p-6 flex justify-between items-center border-b border-slate-800/50">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-gold" />
          <span className="text-lg md:text-xl font-bold bg-gradient-to-r from-gold-400 to-gold-600 bg-clip-text text-transparent">TradeClarity</span>
        </button>
        <div className="flex items-center gap-2 md:gap-4">
          {!user && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/pricing')}
                className="text-xs md:text-sm"
              >
                Pricing
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/vega?demo=true')}
                className="text-xs md:text-sm"
              >
                View Demo
              </Button>
            </>
          )}
          {user && (
            <div className="relative flex items-center gap-2 md:gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <p className="text-[10px] text-slate-500 leading-tight">Signed in as</p>
                <p className="text-xs text-slate-300 font-medium truncate max-w-[200px]">{user?.email}</p>
              </div>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-slate-900 font-semibold text-sm hover:shadow-lg hover:shadow-emerald-500/20 transition-all flex-shrink-0"
              >
                {user?.user_metadata?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
              </button>

              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-lg shadow-2xl z-50 overflow-hidden">
                    <div className="p-2.5 border-b border-slate-700/50">
                      <p className="text-[10px] text-slate-500 mb-0.5">Signed in as</p>
                      <p className="text-xs text-slate-300 truncate">{user?.email}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        setShowUserMenu(false)
                        handleDashboardClick(e)
                      }}
                      className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors flex items-center gap-2"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      Dashboard
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        handleSignOut()
                      }}
                      className="w-full px-3 py-2 text-left text-xs text-slate-400 hover:text-red-400 hover:bg-slate-700/50 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 md:px-6 py-12 md:py-20">
        <div className="max-w-4xl text-center space-y-6 md:space-y-8">
          {/* Headline */}
          <div className="space-y-3 md:space-y-4">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight leading-tight">
              Wealth isn't built in distraction,
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                it's built in clarity.
              </span>
            </h1>
            
            <div className="text-base md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed px-4 min-h-[4rem] flex flex-col items-center justify-center mt-12 md:mt-16">
              <p className="mb-2 text-white/60 text-sm md:text-base">
                Ask Vega:
              </p>
              <div className="w-full max-w-xl bg-slate-800/30 border border-slate-700/30 rounded-lg px-4 py-3">
                <div className="text-slate-200 font-normal text-sm md:text-base">
                  <TypingAnimation 
                    texts={[
                      "Am I actually profitable, or am I lying to myself?",
                      "What are the technicals on NVDA today?",
                      "Why do I keep making the same mistakes?",
                      "What if I just bought Bitcoin instead of trading, would I be more profitable?",
                      "What's the market sentiment right now?",
                      "Which tickers am I secretly terrible at trading?",
                      "What's the RSI on Bitcoin?",
                      "Am I cutting winners too early and holding losers too long?",
                      "Which sectors are outperforming today?",
                      "Am I letting FOMO drive my trading decisions?",
                      "What patterns are secretly costing me money?",
                      "What's the support level on TSLA?",
                      "Do I trade better in bull markets or bear markets?",
                      "Would I have made more money just buying the S&P 500?",
                      "Are we in a bull or bear market?"
                    ]}
                    className="text-slate-200 font-normal"
                  />
                </div>
              </div>
            </div>
            <p className="text-sm md:text-base text-slate-500 max-w-xl mx-auto px-4 pt-2">
              Vega analyzes your trading data to reveal hidden patterns, behavioral insights, and actionable recommendations. <Link href="/faq" className="text-emerald-400 hover:text-emerald-300 underline transition-colors">Learn more</Link> or check out our <Link href="/pricing" className="text-emerald-400 hover:text-emerald-300 underline transition-colors">pricing</Link>.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              /* Signed in - Show single Dashboard button */
              <Button
                variant="primary"
                size="xl"
                onClick={handleDashboardClick}
                onMouseEnter={() => setIsPrimaryHovered(true)}
                onMouseLeave={() => setIsPrimaryHovered(false)}
                className="hover:scale-105"
              >
                <LayoutDashboard className={`w-5 h-5 transition-transform duration-300 ${isPrimaryHovered ? 'rotate-12' : ''}`} />
                Go to Dashboard
                <ArrowRight className={`w-5 h-5 transition-transform duration-300 ${isPrimaryHovered ? 'translate-x-1' : ''}`} />
              </Button>
            ) : (
              <>
                {/* Primary CTA - Try Demo */}
                <Button
                  variant="primary"
                  size="xl"
                  onClick={() => router.push('/vega?demo=true')}
                  onMouseEnter={() => setIsPrimaryHovered(true)}
                  onMouseLeave={() => setIsPrimaryHovered(false)}
                  className="hover:scale-105"
                >
                  <Sparkles className={`w-5 h-5 transition-transform duration-300 ${isPrimaryHovered ? 'rotate-12' : ''}`} />
                  Try Demo
                  <ArrowRight className={`w-5 h-5 transition-transform duration-300 ${isPrimaryHovered ? 'translate-x-1' : ''}`} />
                </Button>

                {/* Secondary CTA - Get Started */}
                <Button
                  variant="outline"
                  size="xl"
                  onClick={handleDashboardClick}
                  onMouseEnter={() => setIsSecondaryHovered(true)}
                  onMouseLeave={() => setIsSecondaryHovered(false)}
                >
                  <Brain className="w-5 h-5" />
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* Trust Indicators */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-8 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-gold" />
              <span>Read-only access</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-gold" />
              <span>Encrypted storage</span>
            </div>
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-gold" />
              <span>Smart insights</span>
            </div>
          </div>
        </div>
      </main>

      {/* Pain Points Section */}
      <section className="py-12 md:py-20 px-4 md:px-6 border-t border-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4">
              Trading Insights That Matter
            </h2>
            <p className="text-slate-400 text-base md:text-lg px-4">
              Vega analyzes your trading patterns to reveal what's really happening in your portfolio.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Pain 1 */}
            <div className="bg-gradient-to-br from-red-500/5 to-orange-500/5 border border-red-500/20 rounded-2xl p-6">
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center mb-4">
                <TrendingDown className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-loss">The Stop Loss Hunter</h3>
              <p className="text-slate-300 text-sm">
                Vega detected that your stop losses get hit right before reversals. The pattern is clear: you're setting stops too tight, missing profitable moves. 
                <span className="text-white font-semibold"> Vega can show you exactly when this happens.</span>
              </p>
            </div>

            {/* Pain 2 */}
            <div className="bg-gradient-to-br from-orange-500/5 to-yellow-500/5 border border-orange-500/20 rounded-2xl p-6">
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-orange-400">Paper Hands Syndrome</h3>
              <p className="text-slate-300 text-sm">
                Analysis reveals you sell winners at +5% but hold losers to -50%. The data shows this pattern costs you thousands. 
                <span className="text-white font-semibold"> Vega identifies exactly when you do this.</span>
              </p>
            </div>

            {/* Pain 3 */}
            <div className="bg-gradient-to-br from-purple-500/5 to-pink-500/5 border border-purple-500/20 rounded-2xl p-6">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-purple-400">Revenge Trading</h3>
              <p className="text-slate-300 text-sm">
                Vega detected emotional trading patterns: after losses, your win rate drops from 61% to 18%. Get alerts before revenge trades happen. 
                <span className="text-white font-semibold"> Stop the cycle before it starts.</span>
              </p>
            </div>
          </div>

          {/* The Kicker - with the moved statement */}
          <div className="mt-12 space-y-8">
            {/* MOVED: The market observation statement */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800/50 border border-slate-700/50 rounded-full text-slate-300 text-sm backdrop-blur-sm">
                <Brain className="w-4 h-4 text-emerald-400" />
                Vega analyzes thousands of trades in seconds. Why guess when you can know?
              </div>
            </div>
            
            {/* Original kicker content */}
            <div className="text-center">
              <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-3">
                The difference data makes?
              </p>
              <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
                You <span className="italic">know</span> you're making mistakes. Vega shows you <span className="font-bold text-white">exactly how often</span>, 
                <span className="font-bold text-white"> how much it's costing you</span>, and <span className="font-bold text-white">what to do about it</span>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 md:py-20 px-4 md:px-6 bg-gradient-to-b from-transparent to-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4">
              Analytics That Actually Help
            </h2>
            <p className="text-slate-400 text-base md:text-lg px-4">
              Vega doesn't give generic advice. It analyzes <span className="text-white font-semibold">YOUR</span> trading data to find actionable insights.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 hover:border-emerald-500/30 transition-all group">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Brain className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Psychology Analysis</h3>
              <p className="text-slate-400 mb-4">
                Vega detects behavioral patterns: Are you holding losers 3x longer than winners? Trading bigger after losses? Get precise insights about your trading psychology.
              </p>
              <div className="text-emerald-400 text-sm font-medium">
                "Vega showed me patterns I never noticed" - Every trader
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 hover:border-cyan-500/30 transition-all group">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Eye className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Hidden Patterns</h3>
              <p className="text-slate-400 mb-4">
                Vega scans thousands of trades to find patterns: Maybe you're 80% profitable on Tuesdays but lose every Thursday. Or you crush it before 10am but give it all back in the afternoon.
              </p>
              <div className="text-cyan-400 text-sm font-medium">
                Patterns invisible to the human eye
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 hover:border-purple-500/30 transition-all group">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Actionable Recommendations</h3>
              <p className="text-slate-400 mb-4">
                Get specific, data-driven advice from Vega: "Stop trading ETH, you're 12% win rate. Focus on BTC where you're 68%." Not generic discipline tips—real insights from your data.
              </p>
              <div className="text-purple-400 text-sm font-medium">
                Recommendations based on YOUR trading data
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Real Insights Section */}
<section className="py-12 md:py-20 px-4 md:px-6 bg-slate-900/50">
  <div className="max-w-6xl mx-auto">
    <div className="text-center mb-10 md:mb-16">
      <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-3 md:mb-4 px-4">
        Patterns That Are
        <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
          Costing You Money
        </span>
      </h2>
      <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto px-4">
        Real insights from traders who connected their exchange to TradeClarity
      </p>
    </div>

    <div className="grid md:grid-cols-2 gap-6 md:gap-8 mb-8 md:mb-12">
      {/* Insight 1 - Time-based */}
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-2xl p-6 md:p-8 hover:border-purple-500/30 transition-all">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div className="text-purple-400 font-semibold text-sm mb-2">VEGA DETECTED: TIME PATTERN</div>
            <h3 className="text-2xl font-bold mb-3">Your 9PM Trades Are Killing You</h3>
          </div>
        </div>
        <div className="space-y-3 text-slate-300 mb-4">
          <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
            <span>Before 6 PM win rate:</span>
            <span className="font-bold text-profit">68%</span>
          </div>
          <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
            <span>After 9 PM win rate:</span>
            <span className="font-bold text-loss">31%</span>
          </div>
        </div>
        <p className="text-slate-400 italic">
          "Vega detected my fatigue pattern. I had no idea it was destroying my edge. Now I just stop trading after dinner."
        </p>
      </div>

      {/* Insight 2 - Symbol focus */}
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-2xl p-6 md:p-8 hover:border-cyan-500/30 transition-all">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <div className="text-cyan-400 font-semibold text-sm mb-2">VEGA IDENTIFIED: HIDDEN EDGE</div>
            <h3 className="text-2xl font-bold mb-3">You Have a Hidden Superpower</h3>
          </div>
        </div>
        <div className="space-y-3 text-slate-300 mb-4">
          <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
            <span>Win rate on SOL:</span>
            <span className="font-bold text-profit">76%</span>
          </div>
          <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
            <span>Win rate on 23 other coins:</span>
            <span className="font-bold text-loss">42%</span>
          </div>
        </div>
        <p className="text-slate-400 italic">
          "Vega showed me I was 'diversifying' myself into losses. Focusing on my edge changed everything."
        </p>
      </div>

      {/* Insight 3 - Psychology */}
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-2xl p-6 md:p-8 hover:border-red-500/30 transition-all">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <div className="text-red-400 font-semibold text-sm mb-2">VEGA ALERT: EMOTIONAL TRADING</div>
            <h3 className="text-2xl font-bold mb-3">The Revenge Trade Tax</h3>
          </div>
        </div>
        <div className="space-y-3 text-slate-300 mb-4">
          <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
            <span>Normal trade win rate:</span>
            <span className="font-bold text-profit">61%</span>
          </div>
          <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
            <span>After-loss trades:</span>
            <span className="font-bold text-loss">18%</span>
          </div>
          <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
            <span>Cost in 90 days:</span>
            <span className="font-bold text-loss">$8,400</span>
          </div>
        </div>
        <p className="text-slate-400 italic">
          "Vega caught my revenge trading pattern. I didn't realize I was doing it. The insights don't lie."
        </p>
      </div>

      {/* Insight 4 - Position holding */}
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-2xl p-6 md:p-8 hover:border-orange-500/30 transition-all">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div className="text-orange-400 font-semibold text-sm mb-2">VEGA DETECTED: BEHAVIOR PATTERN</div>
            <h3 className="text-2xl font-bold mb-3">Winners vs Losers Hold Time</h3>
          </div>
        </div>
        <div className="space-y-3 text-slate-300 mb-4">
          <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
            <span>Avg winner hold time:</span>
            <span className="font-bold text-profit">2.3 hours</span>
          </div>
          <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
            <span>Avg loser hold time:</span>
            <span className="font-bold text-loss">18.7 hours</span>
          </div>
        </div>
        <p className="text-slate-400 italic">
          "Vega revealed I was cutting winners and letting losers run. I was doing it backwards without knowing."
        </p>
      </div>
    </div>

    {/* CTA */}
    <div className="text-center">
      <p className="text-xl text-slate-300 mb-6">
        What patterns is Vega finding in <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 font-bold">your</span> trades?
      </p>
      <Button
        variant="primary"
        size="lg"
        onClick={() => {
          if (user) {
            router.push('/dashboard')
          } else {
            router.push('/vega?demo=true')
          }
        }}
        className="hover:scale-105"
      >
        <Eye className="w-5 h-5" />
        {user ? 'View My Dashboard' : 'See My Patterns Now'}
      </Button>
    </div>
  </div>
</section>

      {/* Final CTA */}
      <section className="py-12 md:py-20 px-4 md:px-6 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-y border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center space-y-4 md:space-y-6">
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold leading-tight px-4">
            Ready to see what Vega can
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              discover in your trading?
            </span>
          </h2>
          <p className="text-base md:text-xl text-slate-300 max-w-2xl mx-auto px-4">
            Connect your exchange in 30 seconds. Vega will analyze your trades and reveal insights that stick with you forever.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {user ? (
              <Button
                variant="primary"
                size="lg"
                onClick={handleDashboardClick}
                className="hover:scale-105"
              >
                <LayoutDashboard className="w-5 h-5" />
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => router.push('/vega?demo=true')}
                  className="hover:scale-105"
                >
                  <Sparkles className="w-5 h-5" />
                  Try The Demo First
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleDashboardClick}
                  className="hover:scale-105 hover:border-gold"
                >
                  Connect My Exchange
                </Button>
              </>
            )}
          </div>
          <p className="text-sm text-slate-500 pt-4">
            No credit card. No signup. Just insights about your trading.
          </p>
        </div>
      </section>

      {/* FAQ Preview Section */}
      <section className="py-12 md:py-20 px-4 md:px-6 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-500/20 rounded-xl mb-4">
              <HelpCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-400 text-base md:text-lg">
              Quick answers to common questions about TradeClarity
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 hover:border-emerald-500/30 transition-all">
              <h3 className="text-lg font-semibold text-white mb-2">How does Vega analyze my trades?</h3>
              <p className="text-sm text-slate-400 mb-4">
                Vega connects to your exchange via read-only API keys or analyzes CSV files. Advanced algorithms process thousands of trades to identify patterns, detect behavioral issues, and generate personalized insights.
              </p>
              <Link href="/faq" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium inline-flex items-center gap-1 transition-colors">
                Learn more <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 hover:border-emerald-500/30 transition-all">
              <h3 className="text-lg font-semibold text-white mb-2">Is my trading data safe?</h3>
              <p className="text-sm text-slate-400 mb-4">
                Yes, absolutely. We use read-only API keys, meaning Vega can only analyze your trades - we cannot execute trades or access your funds. All data is encrypted and processed securely.
              </p>
              <Link href="/faq" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium inline-flex items-center gap-1 transition-colors">
                Learn more <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 hover:border-emerald-500/30 transition-all">
              <h3 className="text-lg font-semibold text-white mb-2">Can I use TradeClarity for free?</h3>
              <p className="text-sm text-slate-400 mb-4">
                Yes! Our free plan includes 500 trades analyzed per month, 1 exchange connection, and full access to all analytics features. Perfect for getting started.
              </p>
              <Link href="/pricing" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium inline-flex items-center gap-1 transition-colors">
                View pricing <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 hover:border-emerald-500/30 transition-all">
              <h3 className="text-lg font-semibold text-white mb-2">What exchanges are supported?</h3>
              <p className="text-sm text-slate-400 mb-4">
                TradeClarity currently supports Binance and CoinDCX, with more exchanges coming soon. You can also upload CSV files from any exchange.
              </p>
              <Link href="/faq" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium inline-flex items-center gap-1 transition-colors">
                Learn more <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="text-center">
            <Link href="/faq">
              <Button variant="outline" size="lg" className="hover:scale-105">
                View All FAQs
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* Multiple Tabs Dialog */}
      <Dialog open={showTabDialog} onOpenChange={setShowTabDialog}>
        <DialogContent className="bg-black border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-white/90 flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-emerald-400" />
              Another Tab Already Open
            </DialogTitle>
            <DialogDescription className="text-sm text-white/60">
              {otherTabCount === 1 
                ? 'You have TradeClarity open in another tab. Would you like to switch to that tab or continue here?'
                : `You have TradeClarity open in ${otherTabCount} other tabs. Would you like to switch to one of them or continue here?`}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <button
              onClick={handleSwitchToTab}
              className="w-full px-4 py-3 bg-emerald-400/10 hover:bg-emerald-400/15 border border-emerald-400/30 hover:border-emerald-400/40 rounded-lg font-medium transition-all text-white/90 hover:text-white flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Switch to Other Tab
            </button>
            <button
              onClick={handleContinueInThisTab}
              className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg font-medium transition-all text-white/70 hover:text-white/90"
            >
              Continue in This Tab
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
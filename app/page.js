'use client'

import { useState, useEffect, useRef, memo } from 'react'
import { TrendingUp, Shield, Zap, ArrowRight, Sparkles, Lock, Eye, Brain, TrendingDown, Target, AlertCircle, LogOut, LayoutDashboard, HelpCircle, ChevronRight, MessageCircle, Link as LinkIcon, Globe, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import { useAuth } from '@/lib/AuthContext'
import Footer from './components/Footer'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

// Typing animation component - memoized to prevent unnecessary re-renders
const TypingAnimation = memo(function TypingAnimation({ texts, className = '' }) {
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
      <span className={`inline-block w-0.5 h-[1em] bg-white/50 ml-1 align-middle ${isTyping || isDeleting ? 'animate-pulse' : ''}`} />
    </span>
  )
})

export default function LandingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [isPrimaryHovered, setIsPrimaryHovered] = useState(false)
  const [isSecondaryHovered, setIsSecondaryHovered] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
      window.location.href = '/'
    } catch (error) {
      console.error('Sign out error:', error)
      window.location.href = '/'
    }
  }

  const handleDashboardClick = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex justify-between items-center">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity group"
          >
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-lg font-bold text-white/90">TradeClarity</span>
          </button>
          
          <div className="flex items-center gap-3 md:gap-6">
            {!user && (
              <>
                <Link href="/pricing" className="text-sm text-white/60 hover:text-white transition-colors">
                  Pricing
                </Link>
                <Link href="/demo?from=/" className="text-sm text-white/60 hover:text-white transition-colors">
                  Demo
                </Link>
              </>
            )}
            {user && (
              <div className="relative flex items-center gap-3">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-medium text-xs hover:bg-emerald-500/20 transition-all"
                >
                  {user?.user_metadata?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                </button>

                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden py-1">
                      <div className="px-3 py-2 border-b border-white/5">
                        <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Signed in as</p>
                        <p className="text-xs text-white/80 truncate">{user?.email}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          setShowUserMenu(false)
                          handleDashboardClick(e)
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                      </button>
                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          handleSignOut()
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-white/60 hover:text-red-400 hover:bg-white/5 transition-colors flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center pt-32 pb-20 px-4 md:px-6 relative overflow-hidden">
        {/* Abstract background blobs */}
        <div className="absolute top-1/4 -left-64 w-96 h-96 bg-emerald-500/20 rounded-full blur-[128px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-64 w-96 h-96 bg-cyan-500/10 rounded-full blur-[128px] pointer-events-none" />

        <div className="max-w-4xl w-full text-center space-y-12 relative z-10">
            {/* Headline */}
          <div className="space-y-6">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]">
              <span className="text-white/40">Stop staring at charts. </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 animate-pulse-subtle">
                Start talking to them.
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed font-light">
              Meet <span className="text-emerald-400 font-medium">Vega</span>, your personal AI trading coach. 
              Connect your brokerage instantly and get chat-based insights into your psychology, strategy, and hidden leaks.
            </p>

            {/* Interactive Typing Element */}
            <div className="h-16 flex items-center justify-center">
              <div className="px-6 py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                 <span className="text-emerald-400 mr-3 font-mono">AI Coach &gt;</span>
                 <TypingAnimation 
                    texts={[
                      "Score my portfolio out of 10 and tell me why.",
                      "What am I doing wrong with my money?",
                      "Am I taking too much risk without realizing it?",
                      "Why do my profits feel so inconsistent?",
                      "What should I focus on to improve from here?"
                    ]}
                    className="text-white/80 font-mono text-sm md:text-base"
                  />
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              <Button
                variant="primary"
                size="xl"
                onClick={handleDashboardClick}
                className="min-w-[200px] h-14 text-base font-semibold bg-white text-black hover:bg-white/90 hover:scale-[1.02] transition-all rounded-full"
              >
                Go to Dashboard
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            ) : (
              <>
                <Button
                  variant="primary"
                  size="xl"
                  onClick={() => router.push('/demo?from=/')}
                  className="min-w-[200px] h-14 text-base font-semibold bg-emerald-500 text-black hover:bg-emerald-400 hover:scale-[1.02] transition-all rounded-full border-none shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)]"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  View Demo
                </Button>

                <Button
                  variant="outline"
                  size="xl"
                  onClick={handleDashboardClick}
                  className="min-w-[200px] h-14 text-base font-medium bg-transparent border-white/20 text-white hover:bg-white/5 hover:border-white/40 rounded-full"
                >
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Value Proposition Grid - Sleek & Minimal */}
      <section className="py-24 px-4 border-t border-white/5 bg-zinc-950/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-white/90">
              Trading Insights That Matter
            </h2>
            <p className="text-white/50 text-lg">
              Vega analyzes your trading patterns to reveal what's really happening.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="p-8 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-colors group">
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Target className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold mb-3 text-white/90">Precision Analysis</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Stop guessing where you're bleeding money. Vega identifies exactly which setups, times, and assets are dragging down your P&L.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-8 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-colors group">
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Brain className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold mb-3 text-white/90">Psychology Decoder</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Detect emotional tilting before it drains your account. Vega spots revenge trading, hesitation, and FOMO in your raw data.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-8 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-colors group">
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <MessageCircle className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold mb-3 text-white/90">Interactive Coach</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Don't just look at dashboards. Talk to your data. Ask Vega specific questions and get instant, evidence-based answers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Minimal Step-by-Step */}
      <section className="py-24 px-4 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
             <div>
               <h2 className="text-3xl font-bold mb-6 text-white/90">From Chaos to Clarity</h2>
               <div className="space-y-8">
                 <div className="flex gap-4">
                   <div className="flex-shrink-0 w-8 h-8 rounded-full border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono text-sm">1</div>
                   <div>
                     <h4 className="text-white font-medium mb-1">Connect</h4>
                     <p className="text-white/50 text-sm">Securely link your brokerage or upload data.</p>
                   </div>
                 </div>
                 <div className="flex gap-4">
                   <div className="flex-shrink-0 w-8 h-8 rounded-full border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono text-sm">2</div>
                   <div>
                     <h4 className="text-white font-medium mb-1">Analyze</h4>
                     <p className="text-white/50 text-sm">AI engine scans for 50+ behavioral patterns.</p>
                   </div>
                 </div>
                 <div className="flex gap-4">
                   <div className="flex-shrink-0 w-8 h-8 rounded-full border border-purple-500/30 flex items-center justify-center text-purple-400 font-mono text-sm">3</div>
                   <div>
                     <h4 className="text-white font-medium mb-1">Improve</h4>
                     <p className="text-white/50 text-sm">Get actionable insights to fix leaks and grow.</p>
                   </div>
                 </div>
               </div>
               
               <div className="mt-10">
                 <Button 
                   onClick={handleDashboardClick}
                   variant="ghost" 
                   className="text-white/70 hover:text-white pl-0 hover:bg-transparent group"
                 >
                   Start your journey <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                 </Button>
               </div>
             </div>

             {/* Abstract Visual Representation */}
             <div className="relative aspect-square rounded-2xl bg-zinc-900 border border-white/5 p-8 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-purple-500/5" />
                
                <div className="relative z-10 w-full max-w-sm space-y-3">
                  {/* Mock Chat Interface */}
                  <div className="flex justify-end">
                    <div className="bg-emerald-500/10 text-emerald-300 text-xs px-3 py-2 rounded-lg rounded-tr-none max-w-[80%]">
                      Why is my win rate dropping?
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-zinc-800 text-white/70 text-xs px-3 py-2 rounded-lg rounded-tl-none max-w-[90%]">
                      I noticed you tend to over-trade after 2 PM. Your win rate drops from 68% in the morning to 32% in the afternoon.
                    </div>
                  </div>
                   <div className="flex justify-start">
                    <div className="bg-zinc-800 text-white/70 text-xs px-3 py-2 rounded-lg rounded-tl-none max-w-[90%] border-l-2 border-red-400">
                      Recommendation: Set a hard stop-trading rule at 1:30 PM.
                    </div>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* FAQ Section - Clean List */}
      <section className="py-24 px-4 border-t border-white/5 bg-zinc-950/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold mb-8 text-center text-white/90">Common Questions</h2>
          <div className="space-y-4">
            <div className="p-6 rounded-xl bg-zinc-900/30 border border-white/5 hover:bg-zinc-900/50 transition-colors">
              <h3 className="font-medium text-white/90 mb-2">Is my data safe?</h3>
              <p className="text-sm text-white/50">Yes. We use read-only access and bank-level encryption. We cannot execute trades or move funds.</p>
            </div>
            <div className="p-6 rounded-xl bg-zinc-900/30 border border-white/5 hover:bg-zinc-900/50 transition-colors">
              <h3 className="font-medium text-white/90 mb-2">What exchanges do you support?</h3>
              <p className="text-sm text-white/50">We support major brokerages via SnapTrade and accept universal CSV uploads for any platform.</p>
            </div>
            <div className="p-6 rounded-xl bg-zinc-900/30 border border-white/5 hover:bg-zinc-900/50 transition-colors">
              <h3 className="font-medium text-white/90 mb-2">Can I try it for free?</h3>
              <p className="text-sm text-white/50">Absolutely. You can explore the demo mode or connect and analyze up to 500 trades/month on the free plan.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />

    </div>
  )
}

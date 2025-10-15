// app/page.js
'use client'

import { useState } from 'react'
import { TrendingUp, Shield, Zap, ArrowRight, Sparkles, Lock, Eye, Brain, TrendingDown, Target, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import ThemeToggle from './components/ThemeToggle'

export default function LandingPage() {
  const router = useRouter()
  const [isPrimaryHovered, setIsPrimaryHovered] = useState(false)
  const [isSecondaryHovered, setIsSecondaryHovered] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="p-6 flex justify-between items-center border-b border-slate-800/50">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-8 h-8 text-emerald-400" />
          <span className="text-xl font-bold">TradeClarity</span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button 
            onClick={() => router.push('/analyze?demo=true')}
            className="px-4 py-2 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-colors"
          >
            View Demo
          </button>
          <button 
            onClick={() => router.push('/analyze')}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 rounded-lg text-sm font-medium transition-colors"
          >
            Connect Exchange
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 -mt-20">
        <div className="max-w-4xl text-center space-y-8">
          {/* Headline */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              The market can only go two ways. Why does it always pick the one that ruins you?
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
              Why do you always
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
                buy the top?
              </span>
            </h1>
            
            <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              You take profit at +2%, then watch it moon to +50%. You "diamond hands" your loser to -80% while it bleeds out. 
              <span className="text-white font-semibold"> There's a pattern. You just can't see it.</span>
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* Primary CTA - Try Demo */}
            <button
              onClick={() => router.push('/analyze?demo=true')}
              onMouseEnter={() => setIsPrimaryHovered(true)}
              onMouseLeave={() => setIsPrimaryHovered(false)}
              className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/50"
            >
              <span className="flex items-center gap-3">
                <Sparkles className={`w-5 h-5 transition-transform duration-300 ${isPrimaryHovered ? 'rotate-12' : ''}`} />
                See The Demo
                <ArrowRight className={`w-5 h-5 transition-transform duration-300 ${isPrimaryHovered ? 'translate-x-1' : ''}`} />
              </span>
            </button>

            {/* Secondary CTA - Connect Exchange */}
            <button
              onClick={() => router.push('/analyze')}
              onMouseEnter={() => setIsSecondaryHovered(true)}
              onMouseLeave={() => setIsSecondaryHovered(false)}
              className="group px-8 py-4 bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-emerald-500/50 rounded-xl font-semibold text-lg transition-all duration-300"
            >
              <span className="flex items-center gap-3">
                <Lock className="w-5 h-5" />
                Analyze My Trades
              </span>
            </button>
          </div>

          {/* Trust Indicators */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-8 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Read-only access</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Keys never stored</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Analysis in seconds</span>
            </div>
          </div>
        </div>
      </main>

      {/* Pain Points Section */}
      <section className="py-20 px-6 border-t border-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Sound familiar?
            </h2>
            <p className="text-slate-400 text-lg">
              Every trader has these moments. But most never realize the pattern.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Pain 1 */}
            <div className="bg-gradient-to-br from-red-500/5 to-orange-500/5 border border-red-500/20 rounded-2xl p-6">
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center mb-4">
                <TrendingDown className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-red-400">The Stop Loss Hunter</h3>
              <p className="text-slate-300 text-sm">
                You set a stop loss. Gets hit. Then the price immediately reverses and goes exactly where you predicted. 
                <span className="text-white font-semibold"> Every. Single. Time.</span>
              </p>
            </div>

            {/* Pain 2 */}
            <div className="bg-gradient-to-br from-orange-500/5 to-yellow-500/5 border border-orange-500/20 rounded-2xl p-6">
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-orange-400">Paper Hands Syndrome</h3>
              <p className="text-slate-300 text-sm">
                Up 5%? Sell immediately. "Better safe than sorry." Then watch it 10x while you're out. 
                <span className="text-white font-semibold"> But that -50% loser? You'll hold that forever.</span>
              </p>
            </div>

            {/* Pain 3 */}
            <div className="bg-gradient-to-br from-purple-500/5 to-pink-500/5 border border-purple-500/20 rounded-2xl p-6">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-purple-400">Revenge Trading</h3>
              <p className="text-slate-300 text-sm">
                Lost $500? Time to make it back with one big trade. 
                <span className="text-white font-semibold"> Narrator: He did not make it back.</span> In fact, he's now down $2000.
              </p>
            </div>
          </div>

          {/* The Kicker */}
          <div className="mt-12 text-center">
            <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-3">
              The worst part?
            </p>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
              You <span className="italic">know</span> you're doing it. You just don't know <span className="font-bold text-white">how often</span>, 
              <span className="font-bold text-white"> how much it's costing you</span>, or <span className="font-bold text-white">how to actually fix it</span>.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-transparent to-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              What you'll actually discover
            </h2>
            <p className="text-slate-400 text-lg">
              Not generic "trade with the trend" BS. Real insights about <span className="text-white font-semibold">YOUR</span> trading.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 hover:border-emerald-500/30 transition-all group">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Brain className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Your Trading Psychology Score</h3>
              <p className="text-slate-400 mb-4">
                Are you holding losers 3x longer than winners? Trading bigger after losses? We'll tell you exactly what you're doing wrong.
              </p>
              <div className="text-emerald-400 text-sm font-medium">
                "Holy shit, I didn't realize I was doing this" - Every trader
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 hover:border-cyan-500/30 transition-all group">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Eye className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Your Hidden Patterns</h3>
              <p className="text-slate-400 mb-4">
                Maybe you're 80% profitable on Tuesdays but lose every Thursday. Or you crush it before 10am but give it all back in the afternoon.
              </p>
              <div className="text-cyan-400 text-sm font-medium">
                These patterns are invisible until someone shows you
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 hover:border-purple-500/30 transition-all group">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">What To Actually Do</h3>
              <p className="text-slate-400 mb-4">
                Not "be more disciplined" bullshit. Specific changes: "Stop trading ETH, you're 12% win rate. Focus on BTC where you're 68%."
              </p>
              <div className="text-purple-400 text-sm font-medium">
                Based on YOUR data, not some guru's opinion
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Results */}
      <section className="py-20 px-6 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              The "oh shit" moment
            </h2>
            <p className="text-slate-400 text-lg">
              When traders actually see their patterns
            </p>
          </div>

          <div className="space-y-6">
            {/* Testimonial 1 */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
              <p className="text-slate-300 text-lg mb-4 italic">
                "I thought I was being strategic by cutting losses quickly. Turns out I was cutting winners even faster. 
                I held losses for an average of 4 days but sold winners in 6 hours. No wonder I'm not profitable."
              </p>
              <div className="text-sm text-slate-500">- Every trader who's ever looked at their data honestly</div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
              <p className="text-slate-300 text-lg mb-4 italic">
                "Discovered I lose money on 80% of my 'revenge trades' after a loss. I'd triple my position size and my win rate dropped to 15%. 
                Those revenge trades cost me $12k in 3 months."
              </p>
              <div className="text-sm text-slate-500">- That moment when you realize you're your own worst enemy</div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
              <p className="text-slate-300 text-lg mb-4 italic">
                "I've been randomly trading 47 different coins. My win rate on BTC: 71%. On everything else: 38%. 
                Why the hell was I not just trading BTC?"
              </p>
              <div className="text-sm text-slate-500">- When the data slaps you in the face</div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-y border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-5xl font-bold leading-tight">
            Ready to see what you've been
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              missing this whole time?
            </span>
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Takes 30 seconds to connect. The insights will stick with you forever.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => router.push('/analyze?demo=true')}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105 flex items-center gap-2 hover:shadow-2xl hover:shadow-purple-500/30"
            >
              <Sparkles className="w-5 h-5" />
              Try The Demo First
            </button>
            <button
              onClick={() => router.push('/analyze')}
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/30"
            >
              Connect My Exchange
            </button>
          </div>
          <p className="text-sm text-slate-500 pt-4">
            No credit card. No signup. Just brutal honesty about your trading.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 text-center text-slate-500 text-sm space-y-2">
        <p className="font-medium">Built for traders who are tired of guessing</p>
        <p>© 2025 TradeClarity. Your data stays yours. Always.</p>
      </footer>
    </div>
  )
}
// app/page.js
'use client'

import { useState } from 'react'
import { TrendingUp, Shield, Zap, ArrowRight, Sparkles, Lock, Eye, Brain } from 'lucide-react'
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
              Discover Your Hidden Trading Patterns
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
              Stop guessing.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                Start knowing.
              </span>
            </h1>
            
            <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              See what your broker won't tell you. Connect your exchange and discover the psychology behind every trade in seconds.
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
                Try Demo Now
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
                Connect My Exchange
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
              <span>Never stores keys</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Instant analysis</span>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="py-20 px-6 border-t border-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              What You'll Discover
            </h2>
            <p className="text-slate-400 text-lg">
              Insights that make you go "Wow, this is so true!"
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 hover:border-emerald-500/30 transition-all">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Trading Psychology</h3>
              <p className="text-slate-400">
                Discover if you're holding losers too long, revenge trading after losses, or making emotional decisions.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 hover:border-cyan-500/30 transition-all">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center mb-4">
                <Eye className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Hidden Patterns</h3>
              <p className="text-slate-400">
                See your best trading hours, which symbols you're strongest with, and where you're leaving money on the table.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 hover:border-purple-500/30 transition-all">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Actionable Insights</h3>
              <p className="text-slate-400">
                Get specific recommendations on how to improve, based on your actual trading data - not generic advice.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to see your trading clearly?
          </h2>
          <p className="text-slate-400 text-lg">
            Start with the demo or connect your exchange in seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => router.push('/analyze?demo=true')}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105 flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Try Demo Now
            </button>
            <button
              onClick={() => router.push('/analyze')}
              className="px-8 py-4 bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-emerald-500/50 rounded-xl font-semibold text-lg transition-all duration-300"
            >
              Connect Exchange
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-slate-800/50 text-center text-slate-500 text-sm">
        <p>© 2025 TradeClarity. Built for traders who want to grow.</p>
      </footer>
    </div>
  )
}
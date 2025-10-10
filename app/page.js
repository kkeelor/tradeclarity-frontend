'use client'

import { useState } from 'react'
import { TrendingUp, Shield, Zap, ArrowRight, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const router = useRouter()
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col">
      <header className="p-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-8 h-8 text-emerald-400" />
          <span className="text-xl font-bold">TradeClarity</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/analyze')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors border border-slate-700 hover:border-emerald-400/50"
          >
            Try Now
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 -mt-20">
        <div className="max-w-4xl text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-6xl md:text-7xl font-bold tracking-tight">
              Stop guessing.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                Start knowing.
              </span>
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              See what your broker won't tell you. Connect your exchange and discover your hidden trading patterns in seconds.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => router.push('/analyze')}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="group relative px-8 py-4 bg-emerald-500 hover:bg-emerald-400 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/50"
            >
              <span className="flex items-center gap-3">
                Connect Your Exchange
                <ArrowRight className={`w-5 h-5 transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`} />
              </span>
            </button>
            
            <button
              onClick={() => router.push('/analyze')}
              className="group relative px-8 py-4 bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-emerald-400/50 rounded-xl font-semibold text-lg transition-all duration-300"
            >
              <span className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                Try Now
              </span>
            </button>
          </div>
          
          <p className="text-sm text-slate-500 mt-3">
            Free forever. No credit card required.
          </p>

          <div className="pt-12 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="space-y-2">
              <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center mx-auto">
                <Shield className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-sm text-slate-400">Read-only access</p>
            </div>
            <div className="space-y-2">
              <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center mx-auto">
                <Zap className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-sm text-slate-400">Instant insights</p>
            </div>
            <div className="space-y-2">
              <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center mx-auto">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-sm text-slate-400">Better decisions</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="p-6 text-center text-sm text-slate-500">
        Trusted by 10,000+ traders worldwide
      </footer>
    </div>
  )
}
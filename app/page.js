// app/page.js
'use client'

import { useState } from 'react'
import { TrendingUp, Shield, Zap, ArrowRight, Sparkles, Lock, Eye, Brain, TrendingDown, Target, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import ThemeToggle from './components/ThemeToggle'

export default function LandingPage() {
  const router = useRouter()
  const [isPrimaryHovered, setIsPrimaryHovered] = useState(false)
  const [isSecondaryHovered, setIsSecondaryHovered] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col">
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/analyze?demo=true')}
            className="text-xs md:text-sm"
          >
            View Demo
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 md:px-6 py-12 md:py-20">
        <div className="max-w-4xl text-center space-y-6 md:space-y-8">
          {/* Headline */}
          <div className="space-y-3 md:space-y-4">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-tight">
              Why do you always
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
                buy the top?
              </span>
            </h1>
            
            <p className="text-base md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed px-4">
              Ever sell a winner at +5%, only to watch it 10x? Ever hold a loser to -70% because "it'll come back"? You're not alone.
              <br />
              <span className="text-white font-semibold"> There's a pattern. You just can't see it, yet.</span>
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* Primary CTA - Try Demo */}
            <Button
              variant="primary"
              size="xl"
              onClick={() => router.push('/analyze?demo=true')}
              onMouseEnter={() => setIsPrimaryHovered(true)}
              onMouseLeave={() => setIsPrimaryHovered(false)}
              className="hover:scale-105"
            >
              <Sparkles className={`w-5 h-5 transition-transform duration-300 ${isPrimaryHovered ? 'rotate-12' : ''}`} />
              See The Demo
              <ArrowRight className={`w-5 h-5 transition-transform duration-300 ${isPrimaryHovered ? 'translate-x-1' : ''}`} />
            </Button>

            {/* Secondary CTA - Connect Exchange */}
            <Button
              variant="outline"
              size="xl"
              onClick={() => router.push('/analyze')}
              onMouseEnter={() => setIsSecondaryHovered(true)}
              onMouseLeave={() => setIsSecondaryHovered(false)}
            >
              <Lock className="w-5 h-5" />
              Analyze My Trades
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-8 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-gold" />
              <span>Read-only access</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-gold" />
              <span>Keys never stored</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-gold" />
              <span>Analysis in seconds</span>
            </div>
          </div>
        </div>
      </main>

      {/* Pain Points Section */}
      <section className="py-12 md:py-20 px-4 md:px-6 border-t border-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4">
              Sound familiar?
            </h2>
            <p className="text-slate-400 text-base md:text-lg px-4">
              Every trader has these moments. But most never realize the pattern.
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

          {/* The Kicker - with the moved statement */}
          <div className="mt-12 space-y-8">
            {/* MOVED: The market observation statement */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800/50 border border-slate-700/50 rounded-full text-slate-300 text-sm backdrop-blur-sm">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                The market can only go two ways. Why does it always pick the one that ruins you?
              </div>
            </div>
            
            {/* Original kicker content */}
            <div className="text-center">
              <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-3">
                The worst part?
              </p>
              <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
                You <span className="italic">know</span> you're doing it. You just don't know <span className="font-bold text-white">how often</span>, 
                <span className="font-bold text-white"> how much it's costing you</span>, or <span className="font-bold text-white">how to actually fix it</span>.
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
              What you'll actually discover
            </h2>
            <p className="text-slate-400 text-base md:text-lg px-4">
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

      {/* Real Insights Section */}
<section className="py-12 md:py-20 px-4 md:px-6 bg-slate-900/50">
  <div className="max-w-6xl mx-auto">
    <div className="text-center mb-10 md:mb-16">
      <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-3 md:mb-4 px-4">
        The Patterns You Can't See
        <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
          Are Costing You Money
        </span>
      </h2>
      <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto px-4">
        These are real insights from real traders who connected TradeClarity
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
            <div className="text-purple-400 font-semibold text-sm mb-2">TIME PATTERN DETECTED</div>
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
          "I had no idea fatigue was destroying my edge. Now I just stop trading after dinner."
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
            <div className="text-cyan-400 font-semibold text-sm mb-2">EDGE IDENTIFIED</div>
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
          "I was 'diversifying' myself into losses. Focus changed everything."
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
            <div className="text-red-400 font-semibold text-sm mb-2">EMOTIONAL TRADING ALERT</div>
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
          "I didn't realize I was revenge trading. The data doesn't lie."
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
            <div className="text-orange-400 font-semibold text-sm mb-2">BEHAVIOR PATTERN</div>
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
          "Cut your winners, let your losers run. I was doing it backwards without knowing."
        </p>
      </div>
    </div>

    {/* CTA */}
    <div className="text-center">
      <p className="text-xl text-slate-300 mb-6">
        What patterns are hiding in <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 font-bold">your</span> trades?
      </p>
      <Button
        variant="primary"
        size="lg"
        onClick={() => router.push('/analyze?demo=true')}
        className="hover:scale-105"
      >
        <Eye className="w-5 h-5" />
        See My Patterns Now
      </Button>
    </div>
  </div>
</section>

      {/* Final CTA */}
      <section className="py-12 md:py-20 px-4 md:px-6 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-y border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center space-y-4 md:space-y-6">
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold leading-tight px-4">
            Ready to see what you've been
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              missing this whole time?
            </span>
          </h2>
          <p className="text-base md:text-xl text-slate-300 max-w-2xl mx-auto px-4">
            Takes 30 seconds to connect. The insights will stick with you forever.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push('/analyze?demo=true')}
              className="hover:scale-105"
            >
              <Sparkles className="w-5 h-5" />
              Try The Demo First
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push('/analyze')}
              className="hover:scale-105 hover:border-gold"
            >
              Connect My Exchange
            </Button>
          </div>
          <p className="text-sm text-slate-500 pt-4">
            No credit card. No signup. Just brutal honesty about your trading.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 md:py-8 px-4 md:px-6 text-center text-slate-500 text-xs md:text-sm space-y-2">
        <p className="font-medium">Built for traders who are tired of guessing</p>
        <p>© 2025 TradeClarity. Your data stays yours. Always.</p>
      </footer>
    </div>
  )
}
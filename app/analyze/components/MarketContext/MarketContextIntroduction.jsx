// app/analyze/components/MarketContext/MarketContextIntroduction.jsx
// Introduction and explanation of Market Context page

'use client'

import { Info, TrendingUp, Target, Lightbulb, Clock, BarChart3, Zap, Brain } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function MarketContextIntroduction({ 
  selectedAsset,
  dateRange 
}) {
  return (
    <div className="space-y-6 mb-6">
      {/* Page Introduction Overview */}
      <Card className="bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-emerald-500/10 border-blue-500/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Info className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-2">
                What is Market Context?
              </h2>
              <p className="text-slate-300 mb-4 leading-relaxed">
                Market Context transforms your trading analytics from "what happened" to "why it happened." 
                We combine your trade data with real-time market conditions—price movements, volatility, 
                news sentiment, and economic indicators—to reveal <strong className="text-white">why</strong> your trades 
                performed the way they did and <strong className="text-white">when</strong> market conditions 
                worked for or against you.
              </p>
              <p className="text-slate-400 text-sm italic">
                Think of it as a weather report for your trading—showing you the conditions that surrounded each trade.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Vision Card */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Target className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-3">
                From "What Happened" to "Why It Happened"
              </h2>
              <p className="text-slate-300 mb-4 leading-relaxed text-base">
                Just as a sailor needs to know wind patterns and tides to navigate effectively, Market Context shows you the 
                <strong className="text-white"> market conditions</strong> that surrounded your trades—revealing 
                <strong className="text-white"> why</strong> certain periods were profitable and 
                <strong className="text-white"> when</strong> external factors helped or hurt your performance.
              </p>
              <p className="text-slate-400 text-sm">
                Instead of just seeing your P&L numbers, discover the story behind them.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Core Capabilities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Trade Timeline Visualization */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Clock className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-2">Trade Timeline Visualization</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Like a GPS showing your route, the timeline maps your trading journey over time. See your trades 
                  plotted alongside market events—like watching a movie with subtitles that explain what was happening 
                  in the market during each scene.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Market Condition Analysis */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <BarChart3 className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-2">Market Condition Analysis</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Imagine checking the weather before a picnic. Market Condition Analysis shows you whether you were 
                  trading in a "sunny market" (favorable conditions) or a "stormy market" (volatile/unfavorable). 
                  This helps explain why some trades succeeded while others struggled.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Correlation */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-2">Performance Correlation</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Like comparing your running pace to the terrain—were you faster on flat ground or uphill? 
                  Performance Correlation reveals how your trading performance aligns with market movements, 
                  showing if you outperformed during bull markets, bear markets, or sideways trends.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Real-time Insights */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Zap className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-2">Real-time Insights</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Think of it as having a co-pilot watching the road while you drive. Real-time insights monitor 
                  current market conditions and alert you to opportunities or risks, helping you make better 
                  timing decisions for future trades.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Features Summary */}
      <Card className="bg-gradient-to-r from-slate-800/50 to-slate-800/30 border-slate-700">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Brain className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-3">What You'll Discover</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                  <span className="text-slate-300">Which market conditions favor your trading style</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                  <span className="text-slate-300">Optimal times to enter or exit positions</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                  <span className="text-slate-300">How your performance compares to market benchmarks</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-2 flex-shrink-0" />
                  <span className="text-slate-300">Patterns that predict better trading outcomes</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

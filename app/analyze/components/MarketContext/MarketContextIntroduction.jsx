// app/analyze/components/MarketContext/MarketContextIntroduction.jsx
// Introduction and explanation of Market Context page

'use client'

import { Info, TrendingUp, Target, Lightbulb } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function MarketContextIntroduction({ 
  selectedAsset,
  dateRange 
}) {
  return (
    <Card className="bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-emerald-500/10 border-blue-500/20 mb-6">
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
              Market Context analyzes how external market conditions affected your trading performance. 
              We combine your trade data with real-time market data—including price movements, news sentiment, 
              economic indicators, and volatility—to reveal <strong className="text-white">why</strong> your trades 
              performed the way they did and <strong className="text-white">when</strong> market conditions 
              worked for or against you.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-white text-sm mb-1">Performance Analysis</div>
                  <div className="text-xs text-slate-400">
                    Compare your returns to market benchmarks and identify outperformance patterns
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-white text-sm mb-1">Timing Insights</div>
                  <div className="text-xs text-slate-400">
                    Understand if you traded during favorable or unfavorable market conditions
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-white text-sm mb-1">Actionable Insights</div>
                  <div className="text-xs text-slate-400">
                    Get specific recommendations on when to trade based on market conditions
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

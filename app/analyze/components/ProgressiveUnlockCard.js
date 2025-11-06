// app/analyze/components/ProgressiveUnlockCard.js
// Shows what insights unlock as user trades more

'use client'

import { Lock, TrendingUp, ChevronRight, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getConfidenceLabel } from '../utils/insights/lowActivityInsights'

export default function ProgressiveUnlockCard({ unlockTier, currentTrades, totalTrades }) {
  if (!unlockTier) return null

  const progress = Math.min(100, (totalTrades / unlockTier.minTrades) * 100)
  const tradesNeeded = Math.max(0, unlockTier.minTrades - totalTrades)

  return (
    <div className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10 backdrop-blur">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 opacity-50" />
      
      <div className="relative p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-purple-300 mb-1">
              {tradesNeeded > 0 ? `Unlock ${unlockTier.name}` : `${unlockTier.name} Unlocked`}
            </h4>
            {tradesNeeded > 0 ? (
              <p className="text-xs text-slate-300 mb-3">
                {tradesNeeded} more {tradesNeeded === 1 ? 'trade' : 'trades'} to unlock deeper insights
              </p>
            ) : (
              <p className="text-xs text-slate-300 mb-3">
                You've unlocked advanced pattern detection!
              </p>
            )}
          </div>
        </div>

        {tradesNeeded > 0 && (
          <>
            {/* Progress bar */}
            <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Features that will unlock */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-300 mb-2">Coming Soon:</div>
              {unlockTier.features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-slate-400">
                  <Lock className="w-3 h-3 text-purple-400/50" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {tradesNeeded === 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-emerald-300 mb-2">Available Now:</div>
            {unlockTier.features.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                <ChevronRight className="w-3 h-3 text-emerald-400" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function ConfidenceBadge({ confidence, dataPoints }) {
  const label = getConfidenceLabel(confidence, dataPoints)
  const variant = confidence === 'high' ? 'profit' : confidence === 'medium' ? 'warning' : 'secondary'

  return (
    <Badge variant={variant} className="inline-flex items-center gap-1">
      <span className="relative flex h-1.5 w-1.5">
        {confidence === 'high' && (
          <>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </>
        )}
        {confidence === 'medium' && (
          <span className="inline-flex rounded-full h-1.5 w-1.5 bg-yellow-500"></span>
        )}
        {confidence === 'low' && (
          <span className="inline-flex rounded-full h-1.5 w-1.5 bg-slate-500"></span>
        )}
      </span>
      {label}
    </Badge>
  )
}

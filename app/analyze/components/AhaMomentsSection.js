// app/analyze/components/AhaMomentsSection.js
// Hero section displaying top value-first insights

'use client'

import { useState } from 'react'
import { AlertCircle, Zap, TrendingUp, Clock, Target, DollarSign, ChevronRight, AlertTriangle, Award } from 'lucide-react'
import { ConfidenceBadge } from './ProgressiveUnlockCard'

export default function AhaMomentsSection({ insights, currency = 'USD', currSymbol = '$' }) {
  if (!insights || insights.critical.length === 0) return null

  const topInsight = insights.critical[0]
  const secondaryInsights = insights.critical.slice(1, 3).concat(insights.opportunities.slice(0, 1)).slice(0, 2)

  return (
    <div className="space-y-4">
      {/* Hero Insight - Biggest Opportunity */}
      {topInsight && (
        <div className={`relative overflow-hidden rounded-3xl border backdrop-blur transition-all duration-300 hover:scale-[1.01] ${
          topInsight.type === 'weakness'
            ? 'border-red-500/30 bg-red-500/10 shadow-lg shadow-red-500/10'
            : 'border-emerald-500/30 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
        }`}>
          <div className={`absolute inset-0 bg-gradient-to-br transition-opacity duration-500 ${
            topInsight.type === 'weakness'
              ? 'from-red-500/15 via-transparent to-orange-500/10'
              : 'from-emerald-500/15 via-transparent to-cyan-500/10'
          }`} />
          
          <div className="relative p-6 md:p-8">
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                topInsight.type === 'weakness'
                  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}>
                {topInsight.type === 'weakness' ? (
                  <AlertCircle className="w-7 h-7" />
                ) : (
                  <Zap className="w-7 h-7" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${
                    topInsight.type === 'weakness' ? 'text-red-300' : 'text-emerald-300'
                  }`}>
                    {topInsight.type === 'weakness' ? '🚨 Biggest Opportunity' : '💰 Biggest Opportunity'}
                  </span>
                  {topInsight.confidence && (
                    <ConfidenceBadge confidence={topInsight.confidence} dataPoints={topInsight.dataPoints} />
                  )}
                  {topInsight.potentialSavings > 0 && (
                    <span className={`text-lg font-bold ${
                      topInsight.type === 'weakness' ? 'text-red-400' : 'text-emerald-400'
                    }`}>
                      {currSymbol}{topInsight.potentialSavings.toFixed(0)}
                    </span>
                  )}
                </div>

                <h3 className="text-xl md:text-2xl font-bold text-white mb-3">
                  {topInsight.title}
                </h3>

                <p className="text-sm md:text-base text-slate-300 mb-4 leading-relaxed">
                  {topInsight.message}
                </p>

                {topInsight.action && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Expected Impact: {topInsight.action.expectedImpact}</span>
                    </div>
                    {topInsight.action.steps && topInsight.action.steps.length > 0 && (
                      <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <div className="text-xs font-semibold text-slate-300 mb-2">Action Steps:</div>
                        <ul className="space-y-1.5">
                          {topInsight.action.steps.slice(0, 3).map((step, idx) => (
                            <li key={idx} className="text-xs text-slate-400 flex items-start gap-2">
                              <Separator className="text-emerald-400 mt-0.5" />
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {topInsight.benchmark && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="text-xs text-slate-400">
                      <span className="font-semibold">Benchmark: </span>
                      {topInsight.benchmark.percentile}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Secondary Insights Grid */}
      {secondaryInsights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {secondaryInsights.map((insight, idx) => (
            <InsightCard key={idx} insight={insight} currSymbol={currSymbol} />
          ))}
        </div>
      )}
    </div>
  )
}

function InsightCard({ insight, currSymbol }) {
  const getIcon = () => {
    if (insight.category === 'timing') return Clock
    if (insight.category === 'opportunity' || insight.type === 'strength') return Award
    if (insight.type === 'weakness') return AlertTriangle
    return TrendingUp
  }

  const Icon = getIcon()

  const getColorClasses = () => {
    if (insight.type === 'weakness') {
      return {
        border: 'border-red-500/20',
        bg: 'bg-red-500/5',
        iconBg: 'bg-red-500/20',
        iconColor: 'text-red-400',
        titleColor: 'text-red-300',
        amountColor: 'text-red-400'
      }
    }
    if (insight.type === 'strength' || insight.type === 'opportunity') {
      return {
        border: 'border-emerald-500/20',
        bg: 'bg-emerald-500/5',
        iconBg: 'bg-emerald-500/20',
        iconColor: 'text-emerald-400',
        titleColor: 'text-emerald-300',
        amountColor: 'text-emerald-400'
      }
    }
    return {
      border: 'border-cyan-500/20',
      bg: 'bg-cyan-500/5',
      iconBg: 'bg-cyan-500/20',
      iconColor: 'text-cyan-400',
      titleColor: 'text-cyan-300',
      amountColor: 'text-cyan-400'
    }
  }

  const colors = getColorClasses()

  return (
    <div className={`relative overflow-hidden rounded-2xl border backdrop-blur transition-all duration-300 hover:scale-[1.02] ${colors.border} ${colors.bg}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-50" />
      
      <div className="relative p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${colors.iconBg} ${colors.iconColor} border-opacity-30`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className={`text-sm font-semibold ${colors.titleColor}`}>
                {insight.title}
              </h4>
              {insight.confidence && (
                <ConfidenceBadge confidence={insight.confidence} dataPoints={insight.dataPoints || 0} />
              )}
            </div>
            {insight.potentialSavings > 0 && (
              <div className={`text-xl font-bold ${colors.amountColor}`}>
                {currSymbol}{insight.potentialSavings.toFixed(0)}
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-300 mb-3 line-clamp-2">
          {insight.summary || insight.message}
        </p>

        {insight.action && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <ChevronRight className="w-3 h-3" />
            <span className="truncate">{insight.action.title}</span>
          </div>
        )}

        {insight.benchmark && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="text-xs text-slate-500">
              {insight.benchmark.percentile}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

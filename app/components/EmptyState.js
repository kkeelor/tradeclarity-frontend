// app/components/EmptyState.js
'use client'

import { Button } from '@/components/ui'

/**
 * EmptyState Component
 *
 * Handles 3 scenarios:
 * 1. "empty" - No data at all (motivational)
 * 2. "limited" - Some data but not enough for full analysis (encouraging)
 * 3. "info" - Informational message (neutral)
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "empty", // "empty" | "limited" | "info"
  children
}) {
  const variantStyles = {
    empty: {
      iconBg: "bg-slate-800/50",
      iconColor: "text-slate-400",
      titleColor: "text-slate-200",
      descColor: "text-slate-400"
    },
    limited: {
      iconBg: "bg-yellow-500/10",
      iconColor: "text-yellow-400",
      titleColor: "text-yellow-400",
      descColor: "text-slate-300"
    },
    info: {
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-400",
      titleColor: "text-blue-400",
      descColor: "text-slate-300"
    }
  }

  const styles = variantStyles[variant]

  return (
    <div className="flex flex-col items-center justify-center py-12 md:py-16 px-4 md:px-6">
      <div className={`w-14 h-14 md:w-16 md:h-16 ${styles.iconBg} rounded-2xl flex items-center justify-center mb-4 md:mb-6`}>
        <Icon className={`w-7 h-7 md:w-8 md:h-8 ${styles.iconColor}`} />
      </div>

      <h3 className={`text-lg md:text-xl font-bold ${styles.titleColor} mb-2 md:mb-3 text-center`}>
        {title}
      </h3>

      <p className={`${styles.descColor} text-sm md:text-base text-center max-w-md mb-6 leading-relaxed`}>
        {description}
      </p>

      {children}

      {action && (
        <Button
          variant={variant === "empty" ? "outline" : "ghost"}
          onClick={action.onClick}
          className="mt-4"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}

/**
 * LimitedDataNotice Component
 * Shows encouraging message when user has some data but not much
 */
export function LimitedDataNotice({ tradeCount, minRecommended = 20 }) {
  if (tradeCount >= minRecommended) return null

  const remaining = minRecommended - tradeCount
  const percentage = Math.round((tradeCount / minRecommended) * 100)

  return (
    <div className="mb-6 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 border border-yellow-500/20 rounded-xl p-4 md:p-6">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 md:w-6 md:h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-yellow-400 font-semibold text-sm md:text-base mb-2">
            Getting Started - {tradeCount} {tradeCount === 1 ? 'Trade' : 'Trades'} Analyzed
          </h4>
          <p className="text-slate-300 text-xs md:text-sm mb-3">
            You're off to a great start! We recommend at least <span className="font-semibold text-white">{minRecommended} trades</span> for accurate behavioral insights. You're <span className="font-semibold text-white">{percentage}% there</span> - just {remaining} more {remaining === 1 ? 'trade' : 'trades'} to go.
          </p>

          {/* Progress bar */}
          <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>

          <p className="text-slate-400 text-xs mt-2">
            💡 Tip: Keep trading and check back in a few days for deeper insights
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * DataQualityBanner Component
 * Shows positive reinforcement for good data quality
 */
export function DataQualityBanner({ tradeCount, symbolCount }) {
  // Only show if data is good quality
  if (tradeCount < 50) return null

  return (
    <div className="mb-6 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 border border-emerald-500/20 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-emerald-400 font-medium text-sm">
            Great data quality!
          </p>
          <p className="text-slate-400 text-xs">
            {tradeCount} trades across {symbolCount} symbols - perfect for deep analysis
          </p>
        </div>
      </div>
    </div>
  )
}

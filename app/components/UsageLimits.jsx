// app/components/UsageLimits.jsx
'use client'

import { Database, BarChart3, FileText } from 'lucide-react'
import { getRemainingQuota, getEffectiveTier, TIER_LIMITS } from '@/lib/featureGates'

export default function UsageLimits({ subscription, compact = false, actualUsage = null }) {
  if (!subscription) return null

  // Use effective tier (considers cancel_at_period_end)
  const effectiveTier = getEffectiveTier(subscription)
  const quota = getRemainingQuota(subscription)
  const tierLimits = TIER_LIMITS[effectiveTier] || TIER_LIMITS.free
  
  const limits = {
    connections: tierLimits.maxConnections,
    trades: tierLimits.maxTradesPerMonth,
    reports: tierLimits.maxReportsPerMonth,
  }

  // Use actual usage data if provided, otherwise fall back to subscription fields
  const usage = actualUsage || {
    connections: subscription.exchanges_connected || 0,
    trades: subscription.trades_analyzed_this_month || 0,
    reports: subscription.reports_generated_this_month || 0,
  }

  const getUsagePercentage = (used, limit) => {
    if (limit === Infinity) return 0
    return Math.min(100, (used / limit) * 100)
  }

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  if (compact) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <UsageItem
          icon={Database}
          label="Connections"
          used={usage.connections}
          limit={limits.connections}
          percentage={getUsagePercentage(usage.connections, limits.connections)}
          color={getUsageColor(getUsagePercentage(usage.connections, limits.connections))}
        />
        <UsageItem
          icon={BarChart3}
          label="Trades"
          used={usage.trades}
          limit={limits.trades}
          percentage={getUsagePercentage(usage.trades, limits.trades)}
          color={getUsageColor(getUsagePercentage(usage.trades, limits.trades))}
        />
        <UsageItem
          icon={FileText}
          label="Reports"
          used={usage.reports}
          limit={limits.reports}
          percentage={limits.reports === 0 ? 0 : getUsagePercentage(usage.reports, limits.reports)}
          color={limits.reports === 0 ? 'bg-white/20' : getUsageColor(getUsagePercentage(usage.reports, limits.reports))}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-white/90 mb-4">Usage This Month</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <UsageItem
          icon={Database}
          label="Exchange Connections"
          used={usage.connections}
          limit={limits.connections}
          percentage={getUsagePercentage(usage.connections, limits.connections)}
          color={getUsageColor(getUsagePercentage(usage.connections, limits.connections))}
        />
        <UsageItem
          icon={BarChart3}
          label="Trades Analyzed"
          used={usage.trades}
          limit={limits.trades}
          percentage={getUsagePercentage(usage.trades, limits.trades)}
          color={getUsageColor(getUsagePercentage(usage.trades, limits.trades))}
        />
        <UsageItem
          icon={FileText}
          label="Reports Generated"
          used={usage.reports}
          limit={limits.reports}
          percentage={limits.reports === 0 ? 0 : getUsagePercentage(usage.reports, limits.reports)}
          color={limits.reports === 0 ? 'bg-white/20' : getUsageColor(getUsagePercentage(usage.reports, limits.reports))}
        />
      </div>
    </div>
  )
}

function UsageItem({ icon: Icon, label, used, limit, percentage, color }) {
  const displayLimit = limit === Infinity ? '∞' : limit
  const displayUsed = used || 0

  return (
    <div className="rounded-xl border border-white/10 bg-black p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-white/60" />
        <p className="text-xs text-white/60 font-medium">{label}</p>
      </div>
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-semibold text-white/90">{displayUsed}</span>
          <span className="text-sm text-white/50">/ {displayLimit}</span>
        </div>
        {limit !== Infinity && limit !== 0 && (
          <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full ${color} transition-all duration-300`}
              style={{ width: `${Math.min(100, percentage)}%` }}
            />
          </div>
        )}
        {limit === Infinity && (
          <div className="w-full bg-white/5 rounded-full h-2">
            <div className="h-full bg-white/60 w-full" />
          </div>
        )}
        {limit === 0 && (
          <div className="w-full bg-white/5 rounded-full h-2">
            <div className="h-full bg-white/20 w-full" />
          </div>
        )}
      </div>
    </div>
  )
}

// app/analyze/components/MarketContext/MetricCard.jsx
// PHASE 7 TASK 7.4: Reusable Metric Card Component with Progress Bars

'use client'

import { useMemo } from 'react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { HelpCircle } from 'lucide-react'

/**
 * PHASE 7 TASK 7.4: Metric Card Component
 * Displays a metric with progress bar, badge, and optional tooltip
 * 
 * @param {string} title - Metric title
 * @param {number|string} value - Metric value (number or formatted string)
 * @param {number} progress - Progress value (0-100) for progress bar
 * @param {string} color - Color theme: 'emerald' (good), 'red' (bad), 'yellow' (neutral), 'blue', 'purple', 'amber'
 * @param {string} badgeLabel - Badge text (e.g., "Excellent", "Needs Improvement")
 * @param {string} badgeVariant - Badge variant: 'profit', 'loss', 'warning', 'default'
 * @param {React.ReactNode} icon - Icon component
 * @param {string} subtitle - Subtitle text below value
 * @param {string} tooltip - Tooltip explanation text
 * @param {string} valueFormat - Format: 'percent', 'currency', 'number', 'default'
 * @param {number} minValue - Minimum value for normalization (optional)
 * @param {number} maxValue - Maximum value for normalization (optional)
 * @param {boolean} showProgress - Whether to show progress bar (default: true)
 * @param {boolean} compact - Compact layout (default: false)
 */
export function MetricCard({
  title,
  value,
  progress,
  color = 'emerald',
  badgeLabel,
  badgeVariant,
  icon: Icon,
  subtitle,
  tooltip,
  valueFormat = 'default',
  minValue,
  maxValue,
  showProgress = true,
  compact = false
}) {
  // Normalize progress if min/max values provided
  const normalizedProgress = useMemo(() => {
    if (progress !== undefined) return Math.max(0, Math.min(100, progress))
    if (minValue !== undefined && maxValue !== undefined && typeof value === 'number') {
      return Math.max(0, Math.min(100, ((value - minValue) / (maxValue - minValue)) * 100))
    }
    return null
  }, [progress, value, minValue, maxValue])

  // Format value based on format type
  const formattedValue = useMemo(() => {
    if (typeof value === 'string') return value
    
    switch (valueFormat) {
      case 'percent':
        return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
      case 'currency':
        return `$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      case 'number':
        return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
      default:
        // For default, show with sign if it's a number
        if (typeof value === 'number') {
          return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`
        }
        return value
    }
  }, [value, valueFormat])

  // Determine badge variant from color if not provided
  const finalBadgeVariant = badgeVariant || (
    color === 'emerald' ? 'profit' :
    color === 'red' ? 'loss' :
    color === 'yellow' ? 'warning' :
    'default'
  )

  // Color classes
  const colorClasses = {
    emerald: {
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      progress: '[&>div]:bg-emerald-400',
      icon: 'text-emerald-400'
    },
    red: {
      text: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      progress: '[&>div]:bg-red-400',
      icon: 'text-red-400'
    },
    yellow: {
      text: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      progress: '[&>div]:bg-yellow-400',
      icon: 'text-yellow-400'
    },
    blue: {
      text: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      progress: '[&>div]:bg-blue-400',
      icon: 'text-blue-400'
    },
    purple: {
      text: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      progress: '[&>div]:bg-purple-400',
      icon: 'text-purple-400'
    },
    amber: {
      text: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      progress: '[&>div]:bg-amber-400',
      icon: 'text-amber-400'
    }
  }

  const theme = colorClasses[color] || colorClasses.emerald

  const cardContent = (
    <Card className={`${theme.bg} ${theme.border} border rounded-xl p-3 hover:border-opacity-40 transition-colors ${compact ? 'p-2' : ''}`}>
      <CardContent className="p-0">
        {/* Header: Title + Icon + Badge */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {Icon && <Icon className={`w-3 h-3 ${theme.icon}`} aria-hidden="true" />}
            <span className={`text-xs ${compact ? 'text-[10px]' : ''} text-slate-400 font-medium`}>
              {title}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {badgeLabel && (
              <Badge 
                variant={finalBadgeVariant}
                className={`text-xs ${compact ? 'text-[10px] px-1.5 py-0' : ''}`}
              >
                {badgeLabel}
              </Badge>
            )}
            {tooltip && (
              <HoverCard>
                <HoverCardTrigger asChild>
                  <HelpCircle className={`w-3 h-3 ${compact ? 'w-2.5 h-2.5' : ''} text-slate-500 cursor-help`} />
                </HoverCardTrigger>
                <HoverCardContent className="max-w-xs">
                  <p className="text-sm">{tooltip}</p>
                </HoverCardContent>
              </HoverCard>
            )}
          </div>
        </div>

        {/* Value */}
        <div className={`${theme.text} font-bold mb-2 ${compact ? 'text-lg' : 'text-xl md:text-2xl'}`}>
          {formattedValue}
        </div>

        {/* Progress Bar + Subtitle Row */}
        <div className="space-y-1">
          {showProgress && normalizedProgress !== null && (
            <Progress 
              value={normalizedProgress} 
              className={`h-1.5 bg-slate-700 ${theme.progress}`}
            />
          )}
          {subtitle && (
            <div className={`text-xs ${compact ? 'text-[10px]' : ''} text-slate-500`}>
              {subtitle}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  // Wrap in hover card if tooltip provided and no icon tooltip
  if (tooltip && !Icon) {
    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          {cardContent}
        </HoverCardTrigger>
        <HoverCardContent className="max-w-xs">
          <p className="text-sm">{tooltip}</p>
        </HoverCardContent>
      </HoverCard>
    )
  }

  return cardContent
}

/**
 * Comparison Card: Shows two metrics side-by-side with comparison
 */
export function ComparisonCard({
  title,
  primaryValue,
  primaryLabel,
  secondaryValue,
  secondaryLabel,
  comparison,
  icon: Icon,
  tooltip
}) {
  const isPositive = comparison >= 0

  return (
    <Card className="bg-black/40 border-slate-700/50 rounded-xl p-3 hover:border-slate-600 transition-colors">
      <CardContent className="p-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-3 h-3 text-slate-400" />}
            <span className="text-xs text-slate-400 font-medium">{title}</span>
          </div>
          {tooltip && (
            <HoverCard>
              <HoverCardTrigger asChild>
                <HelpCircle className="w-3 h-3 text-slate-500 cursor-help" />
              </HoverCardTrigger>
              <HoverCardContent className="max-w-xs">
                <p className="text-sm">{tooltip}</p>
              </HoverCardContent>
            </HoverCard>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Primary Metric */}
          <div>
            <div className="text-xs text-slate-500 mb-1">{primaryLabel}</div>
            <div className={`text-lg font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {primaryValue}
            </div>
          </div>

          {/* Secondary Metric */}
          <div>
            <div className="text-xs text-slate-500 mb-1">{secondaryLabel}</div>
            <div className="text-lg font-bold text-slate-300">{secondaryValue}</div>
          </div>
        </div>

        {/* Comparison */}
        <div className="mt-3 pt-3 border-t border-slate-700">
          <div className={`text-sm font-semibold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{comparison.toFixed(1)}% difference
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Status Card: Shows status indicator with badge
 */
export function StatusCard({
  title,
  status,
  statusLabel,
  icon: Icon,
  color = 'emerald',
  tooltip
}) {
  const colorClasses = {
    emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    red: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    yellow: { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
    blue: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' }
  }

  const theme = colorClasses[color] || colorClasses.emerald

  return (
    <Card className={`${theme.bg} ${theme.border} border rounded-xl p-3`}>
      <CardContent className="p-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {Icon && <Icon className={`w-3 h-3 ${theme.text}`} />}
            <span className="text-xs text-slate-400 font-medium">{title}</span>
          </div>
          {tooltip && (
            <HoverCard>
              <HoverCardTrigger asChild>
                <HelpCircle className="w-3 h-3 text-slate-500 cursor-help" />
              </HoverCardTrigger>
              <HoverCardContent className="max-w-xs">
                <p className="text-sm">{tooltip}</p>
              </HoverCardContent>
            </HoverCard>
          )}
        </div>

        <div className={`text-lg font-bold ${theme.text} mb-2`}>
          {status}
        </div>

        {statusLabel && (
          <Badge 
            variant={color === 'emerald' ? 'profit' : color === 'red' ? 'loss' : 'warning'}
            className="text-xs"
          >
            {statusLabel}
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}

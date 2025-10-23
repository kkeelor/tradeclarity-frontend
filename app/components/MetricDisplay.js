// app/components/MetricDisplay.js
'use client'

import { Card } from './Card'
import { IconBadge } from './IconBadge'

/**
 * Displays a metric value with optional subtitle and icon
 */
export function MetricDisplay({
  label,
  value,
  subtitle,
  icon,
  color = "white",
  good,
  className = ""
}) {
  // Check if value is negative to color it red
  const isNegative = typeof value === 'string' && (value.includes('-') || (parseFloat(value.replace(/[^0-9.-]/g, '')) < 0))
  const isPositive = typeof value === 'string' && (value.includes('+') || (parseFloat(value.replace(/[^0-9.-]/g, '')) > 0))

  // Determine color based on value or good prop
  let valueColor = `text-${color}`
  if (isPositive || good === true) {
    valueColor = 'text-emerald-400'
  } else if (isNegative || good === false) {
    valueColor = 'text-red-400'
  }

  // Determine icon color
  let iconColor = 'slate'
  if (good === true) iconColor = 'emerald'
  else if (good === false) iconColor = 'red'

  return (
    <Card variant="glass" className={`hover:border-slate-600/50 transition-all ${className}`}>
      {(icon || label) && (
        <div className="flex items-center gap-2 mb-2">
          {icon && <IconBadge icon={icon} color={iconColor} size="sm" />}
          {label && (
            <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
          )}
        </div>
      )}
      <div className={`text-2xl font-bold mb-1 ${valueColor}`}>{value}</div>
      {subtitle && <div className="text-xs text-slate-500">{subtitle}</div>}
    </Card>
  )
}

/**
 * Large metric display for hero/featured metrics
 */
export function LargeMetricDisplay({
  label,
  sublabel,
  value,
  icon,
  color,
  metadata,
  className = ""
}) {
  const isProfitable = typeof value === 'string' && !value.includes('-')

  return (
    <div className={`text-center md:text-left ${className}`}>
      {/* Header with icon and labels */}
      <div className="flex items-center gap-3 mb-4">
        {icon && (
          <IconBadge
            icon={icon}
            color={isProfitable ? 'emerald' : 'red'}
            size="2xl"
          />
        )}
        <div>
          {label && (
            <div className="text-sm text-slate-400 uppercase tracking-wider font-medium">
              {label}
            </div>
          )}
          {sublabel && <div className="text-xs text-slate-500">{sublabel}</div>}
        </div>
      </div>

      {/* Large value */}
      <div
        className={`text-6xl md:text-7xl font-bold mb-2 ${
          color || (isProfitable ? 'text-emerald-400' : 'text-red-400')
        }`}
      >
        {value}
      </div>

      {/* Metadata */}
      {metadata && (
        <div className="flex items-center gap-4 text-sm text-slate-400 flex-wrap">
          {metadata}
        </div>
      )}
    </div>
  )
}

/**
 * Simple stat display (value + label, no card wrapper)
 */
export function SimpleStat({ label, value, color = "white" }) {
  return (
    <div>
      <div className={`text-4xl font-bold mb-2 text-${color}`}>{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
    </div>
  )
}

/**
 * Stat row for tables or lists (label on left, value on right)
 */
export function StatRow({ label, value, color, className = "" }) {
  return (
    <div className={`flex justify-between items-center py-2 border-b border-slate-700/30 last:border-0 ${className}`}>
      <span className="text-slate-300">{label}</span>
      <span className={`font-mono font-bold text-lg ${color || 'text-white'}`}>{value}</span>
    </div>
  )
}

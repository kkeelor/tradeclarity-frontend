// app/components/SectionHeader.js
'use client'

import { IconBadge } from './IconBadge'

/**
 * Reusable section header with icon, title, and subtitle
 */
export function SectionHeader({
  icon,
  title,
  subtitle,
  color = "emerald",
  size = "md",
  className = ""
}) {
  const titleSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl"
  }

  const iconSizes = {
    sm: "sm",
    md: "md",
    lg: "lg",
    xl: "xl"
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {icon && <IconBadge icon={icon} color={color} size={iconSizes[size]} />}
      <div>
        <h3 className={`${titleSizes[size]} font-bold`}>{title}</h3>
        {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
      </div>
    </div>
  )
}

/**
 * Section header with action button or additional content
 */
export function SectionHeaderWithAction({
  icon,
  title,
  subtitle,
  action,
  color = "emerald",
  className = ""
}) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <SectionHeader icon={icon} title={title} subtitle={subtitle} color={color} />
      {action && <div>{action}</div>}
    </div>
  )
}

/**
 * Simple text-only section header (no icon)
 */
export function SimpleSectionHeader({ title, subtitle, icon: Icon, className = "" }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {Icon && <Icon className="w-6 h-6 text-emerald-400" />}
      <h3 className="text-xl font-bold">{title}</h3>
      {subtitle && <span className="text-slate-400 text-sm">• {subtitle}</span>}
    </div>
  )
}

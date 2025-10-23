// app/components/IconBadge.js
'use client'

/**
 * Reusable icon badge component with consistent styling
 * Displays an icon within a rounded, colored background
 */
export function IconBadge({
  icon: Icon,
  color = "emerald",
  size = "md",
  className = ""
}) {
  const sizeMap = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-14 h-14",
    "2xl": "w-16 h-16"
  }

  const iconSizeMap = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
    xl: "w-7 h-7",
    "2xl": "w-8 h-8"
  }

  // Color mappings for consistent theming
  const colorClasses = {
    emerald: "bg-emerald-500/20 text-emerald-400",
    red: "bg-red-500/20 text-red-400",
    cyan: "bg-cyan-500/20 text-cyan-400",
    purple: "bg-purple-500/20 text-purple-400",
    yellow: "bg-yellow-500/20 text-yellow-400",
    orange: "bg-orange-500/20 text-orange-400",
    blue: "bg-blue-500/20 text-blue-400",
    slate: "bg-slate-500/20 text-slate-400",
  }

  return (
    <div className={`${sizeMap[size]} ${colorClasses[color]} rounded-xl flex items-center justify-center flex-shrink-0 ${className}`}>
      <Icon className={iconSizeMap[size]} />
    </div>
  )
}

/**
 * Icon badge with gradient background
 */
export function GradientIconBadge({
  icon: Icon,
  gradient = "from-emerald-500/20 to-cyan-500/20",
  size = "md",
  iconColor = "text-emerald-400",
  className = ""
}) {
  const sizeMap = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-14 h-14"
  }

  const iconSizeMap = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
    xl: "w-7 h-7"
  }

  return (
    <div className={`${sizeMap[size]} bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center flex-shrink-0 ${className}`}>
      <Icon className={`${iconSizeMap[size]} ${iconColor}`} />
    </div>
  )
}

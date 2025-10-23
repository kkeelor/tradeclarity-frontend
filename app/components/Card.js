// app/components/Card.js
'use client'

import { Card as ShadcnCard, CardContent } from '@/components/ui'
import { cn } from '@/lib/utils'

/**
 * Reusable card wrapper component with consistent styling
 * Built on shadcn Card component with custom variants
 * Used throughout the app for containers, sections, and panels
 */
export function Card({ children, className = "", variant = "default" }) {
  const variants = {
    default: "bg-slate-800/50 border-slate-700",
    glass: "bg-slate-800/30 backdrop-blur-sm border-slate-700/50",
    gradient: "bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border-slate-700/50",
  }

  return (
    <ShadcnCard className={cn("p-6", variants[variant], className)}>
      {children}
    </ShadcnCard>
  )
}

/**
 * Card with hover effects for interactive cards
 */
export function InteractiveCard({ children, className = "", onClick, variant = "glass" }) {
  const variants = {
    default: "bg-slate-800/50 border-slate-700 hover:border-slate-600",
    glass: "bg-slate-800/30 backdrop-blur-sm border-slate-700/50 hover:border-slate-600/50",
  }

  return (
    <ShadcnCard
      onClick={onClick}
      className={cn("p-6 transition-all cursor-pointer", variants[variant], className)}
    >
      {children}
    </ShadcnCard>
  )
}

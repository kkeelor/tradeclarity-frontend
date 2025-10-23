// app/components/Modal.js
'use client'

import { X } from 'lucide-react'
import { IconBadge } from './IconBadge'

/**
 * Reusable modal component with backdrop and animations
 */
export function Modal({
  isOpen,
  onClose,
  title,
  icon,
  iconColor = "emerald",
  children,
  maxWidth = "2xl",
  className = ""
}) {
  if (!isOpen) return null

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`bg-slate-900 border border-slate-700 rounded-2xl ${maxWidthClasses[maxWidth]} w-full p-8 shadow-2xl ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            {icon && <IconBadge icon={icon} color={iconColor} size="lg" />}
            <h3 className="text-2xl font-bold">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  )
}

/**
 * Modal content section helper components
 */
export function ModalSection({ children, className = "" }) {
  return <div className={`space-y-6 ${className}`}>{children}</div>
}

export function ModalDescription({ children, className = "" }) {
  return <p className={`text-slate-300 leading-relaxed text-lg ${className}`}>{children}</p>
}

export function ModalMetrics({ data, title = "Key Metrics" }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
      <div className="text-sm font-semibold text-slate-400 mb-3">{title}</div>
      <div className="space-y-2">
        {Object.entries(data).map(([key, value]) => (
          <div
            key={key}
            className="flex justify-between items-center py-2 border-b border-slate-700/30 last:border-0"
          >
            <span className="text-slate-300">{key}</span>
            <span className="font-mono font-bold text-lg">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ModalActionSteps({ steps, icon: Icon }) {
  return (
    <div>
      <div className="text-lg font-semibold mb-4 flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5 text-yellow-400" />}
        Action Steps
      </div>
      <ul className="space-y-3">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3 bg-slate-800/30 p-4 rounded-lg">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm flex-shrink-0">
              {i + 1}
            </div>
            <span className="text-slate-300 leading-relaxed">{step}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

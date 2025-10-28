// app/components/Alert.js
'use client'

import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useEffect, useState } from 'react'

/**
 * Alert variants with their corresponding colors and icons
 */
const variants = {
  success: {
    icon: CheckCircle2,
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
    titleColor: 'text-emerald-300',
  },
  error: {
    icon: AlertCircle,
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    iconColor: 'text-red-400',
    titleColor: 'text-red-300',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    iconColor: 'text-yellow-400',
    titleColor: 'text-yellow-300',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    iconColor: 'text-blue-400',
    titleColor: 'text-blue-300',
  },
}

/**
 * Single Alert Component
 * Can be used standalone or within the AlertProvider
 */
export function Alert({
  variant = 'info',
  title,
  message,
  onClose,
  autoDismiss = false,
  dismissAfter = 5000,
  actions = null,
  className = '',
}) {
  const [isVisible, setIsVisible] = useState(true)
  const config = variants[variant]
  const Icon = config.icon

  useEffect(() => {
    if (autoDismiss) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => onClose?.(), 300) // Wait for animation
      }, dismissAfter)

      return () => clearTimeout(timer)
    }
  }, [autoDismiss, dismissAfter, onClose])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => onClose?.(), 300)
  }

  return (
    <div
      className={`
        ${config.bgColor} ${config.borderColor}
        border rounded-xl p-4 shadow-lg
        transition-all duration-300 ease-in-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
        ${className}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className={`font-semibold ${config.titleColor} mb-1`}>
              {title}
            </h4>
          )}
          {message && (
            <p className="text-slate-300 text-sm leading-relaxed">
              {message}
            </p>
          )}

          {/* Actions */}
          {actions && (
            <div className="flex gap-2 mt-3">
              {actions}
            </div>
          )}
        </div>

        {/* Close button */}
        {onClose && (
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Inline Alert (non-floating, embedded in page)
 */
export function InlineAlert({ variant = 'info', title, message, onClose, className = '' }) {
  return (
    <Alert
      variant={variant}
      title={title}
      message={message}
      onClose={onClose}
      className={className}
    />
  )
}

/**
 * Compact Alert (smaller, for less important messages)
 */
export function CompactAlert({ variant = 'info', message, onClose, className = '' }) {
  const config = variants[variant]
  const Icon = config.icon

  return (
    <div
      className={`
        ${config.bgColor} ${config.borderColor}
        border rounded-lg p-3 shadow-md
        flex items-center gap-2
        ${className}
      `}
    >
      <Icon className={`w-4 h-4 ${config.iconColor} flex-shrink-0`} />
      <p className="text-slate-300 text-sm flex-1">{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

/**
 * Alert with actions (confirm/cancel)
 */
export function ConfirmAlert({
  variant = 'warning',
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  confirmVariant = 'danger',
  isLoading = false,
}) {
  const config = variants[variant]
  const Icon = config.icon

  return (
    <div
      className={`
        ${config.bgColor} ${config.borderColor}
        border rounded-xl p-6 shadow-lg
      `}
    >
      <div className="flex items-start gap-4 mb-4">
        <div className={`${config.iconColor} bg-slate-800/50 p-3 rounded-full`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h4 className={`font-bold text-lg ${config.titleColor} mb-2`}>
            {title}
          </h4>
          <p className="text-slate-300 leading-relaxed">
            {message}
          </p>
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors disabled:opacity-50"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={`
            px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50
            ${confirmVariant === 'danger'
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-emerald-500 hover:bg-emerald-600 text-white'
            }
          `}
        >
          {isLoading ? 'Processing...' : confirmText}
        </button>
      </div>
    </div>
  )
}

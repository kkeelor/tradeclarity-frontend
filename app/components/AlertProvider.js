// app/components/AlertProvider.js
'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { Alert } from './Alert'

const AlertContext = createContext(null)

/**
 * Toast positions
 */
const positions = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
}

/**
 * AlertProvider - Context provider for global toast notifications
 *
 * Usage in layout.js:
 * <AlertProvider>
 *   {children}
 * </AlertProvider>
 */
export function AlertProvider({ children, position = 'top-right', maxToasts = 5 }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random()
    const newToast = {
      id,
      variant: 'info',
      autoDismiss: true,
      dismissAfter: 5000,
      ...toast,
    }

    setToasts((prev) => {
      const updated = [newToast, ...prev]
      // Limit number of toasts
      return updated.slice(0, maxToasts)
    })

    return id
  }, [maxToasts])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setToasts([])
  }, [])

  // Convenience methods for different variants
  const success = useCallback((message, options = {}) => {
    return addToast({ variant: 'success', message, ...options })
  }, [addToast])

  const error = useCallback((message, options = {}) => {
    return addToast({ variant: 'error', message, ...options })
  }, [addToast])

  const warning = useCallback((message, options = {}) => {
    return addToast({ variant: 'warning', message, ...options })
  }, [addToast])

  const info = useCallback((message, options = {}) => {
    return addToast({ variant: 'info', message, ...options })
  }, [addToast])

  const value = {
    addToast,
    removeToast,
    clearAll,
    success,
    error,
    warning,
    info,
  }

  return (
    <AlertContext.Provider value={value}>
      {children}

      {/* Toast container */}
      <div
        className={`fixed ${positions[position]} z-[100] flex flex-col gap-3 max-w-md w-full pointer-events-none`}
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
      >
        <div className="flex flex-col gap-3 overflow-y-auto pointer-events-auto">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="animate-in slide-in-from-top-2 duration-300"
            >
              <Alert
                variant={toast.variant}
                title={toast.title}
                message={toast.message}
                onClose={() => removeToast(toast.id)}
                autoDismiss={toast.autoDismiss}
                dismissAfter={toast.dismissAfter}
                actions={toast.actions}
              />
            </div>
          ))}
        </div>
      </div>
    </AlertContext.Provider>
  )
}

/**
 * useAlert Hook - Access alert methods from any component
 *
 * Usage:
 * const alert = useAlert()
 * alert.success('File uploaded successfully!')
 * alert.error('Failed to upload file')
 * alert.warning('This action cannot be undone')
 * alert.info('New feature available')
 */
export function useAlert() {
  const context = useContext(AlertContext)
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider')
  }
  return context
}

/**
 * Standalone toast function for use outside React components
 * (for use in API calls, utility functions, etc.)
 */
let globalToastHandler = null

export function setGlobalToastHandler(handler) {
  globalToastHandler = handler
}

export const toast = {
  success: (message, options) => globalToastHandler?.success(message, options),
  error: (message, options) => globalToastHandler?.error(message, options),
  warning: (message, options) => globalToastHandler?.warning(message, options),
  info: (message, options) => globalToastHandler?.info(message, options),
}

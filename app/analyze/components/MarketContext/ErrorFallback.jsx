// app/analyze/components/MarketContext/ErrorFallback.jsx
// Task 5.2: Error Handling & Fallbacks

'use client'

import { AlertCircle, RefreshCw, WifiOff, Clock, Database } from 'lucide-react'

export function ErrorFallback({ 
  error, 
  retry, 
  type = 'generic' 
}) {
  const errorConfig = {
    network: {
      icon: WifiOff,
      title: 'Network Error',
      message: 'Unable to connect to the server. Please check your internet connection and try again.',
      color: 'red'
    },
    'rate-limit': {
      icon: Clock,
      title: 'Rate Limit Reached',
      message: 'Too many requests. Please wait a moment and try again.',
      color: 'yellow'
    },
    timeout: {
      icon: Clock,
      title: 'Request Timeout',
      message: 'The request took too long. Please try again.',
      color: 'yellow'
    },
    data: {
      icon: Database,
      title: 'Data Unavailable',
      message: 'Some data sources are temporarily unavailable. Showing cached data if available.',
      color: 'blue'
    },
    validation: {
      icon: AlertCircle,
      title: 'Data Validation Failed',
      message: 'The received data does not match the expected format. Please try refreshing or contact support if the issue persists.',
      color: 'yellow'
    },
    generic: {
      icon: AlertCircle,
      title: 'Error',
      message: typeof error === 'string' ? error : error?.message || 'An unexpected error occurred.',
      color: 'red'
    }
  }

  const config = errorConfig[type]
  const Icon = config.icon

  return (
    <div className={`bg-${config.color}-500/10 border border-${config.color}-500/20 rounded-xl p-6`}>
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg bg-${config.color}-500/20`}>
          <Icon className={`w-6 h-6 text-${config.color}-400`} />
        </div>
        <div className="flex-1">
          <h3 className={`text-lg font-semibold text-${config.color}-300 mb-2`}>
            {config.title}
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            {config.message}
          </p>
          {retry && (
            <button
              onClick={retry}
              className={`flex items-center gap-2 px-4 py-2 bg-${config.color}-500/20 hover:bg-${config.color}-500/30 border border-${config.color}-500/30 rounded-lg text-sm text-${config.color}-300 transition-colors`}
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  message,
  action 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="bg-black/40 rounded-xl p-8 border border-slate-700/50 max-w-md w-full text-center">
        <div className="p-4 rounded-full bg-slate-800/50 w-fit mx-auto mb-4">
          <Icon className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        {message && (
          <p className="text-sm text-slate-400 mb-4">{message}</p>
        )}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  )
}

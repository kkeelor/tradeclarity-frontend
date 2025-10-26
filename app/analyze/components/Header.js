// app/analyze/components/Header.js

import { TrendingUp, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import ThemeToggle from '../../components/ThemeToggle'

export default function Header({ 
  exchangeConfig, 
  currencyMetadata, 
  currency, 
  setCurrency, 
  onDisconnect,
  isDemoMode = false
}) {
  const router = useRouter()

  return (
    <header className="border-b border-slate-800 backdrop-blur-sm bg-slate-900/50 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          {/* Clickable Logo - Takes user to landing page */}
          <button 
            onClick={() => router.push('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <TrendingUp className="w-6 h-6 text-emerald-400" />
            <span className="text-lg font-bold">TradeClarity</span>
          </button>
          
          {exchangeConfig && (
            <span className="text-xs text-slate-400 ml-2">
              {exchangeConfig.icon} {exchangeConfig.displayName}
            </span>
          )}
          {currencyMetadata?.supportsCurrencySwitch && (
            <span className="text-xs text-cyan-400 ml-2">• {currency}</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* Theme Toggle - Always visible */}
          <ThemeToggle />
          
          {/* Demo Mode CTA Button */}
          {isDemoMode && (
            <button
              onClick={() => {
                console.log('Button clicked! Navigating to /analyze')
                // Force full page reload to clear demo mode
                window.location.href = '/analyze'
              }}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 rounded-lg font-semibold text-sm transition-all duration-300 hover:scale-105 flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              Discover YOUR patterns
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          
          {/* Currency Switcher - Only in real mode */}
          {!isDemoMode && currencyMetadata?.supportsCurrencySwitch && currencyMetadata.availableCurrencies.length > 1 && (
            <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 rounded-lg p-1">
              {currencyMetadata.availableCurrencies.map((curr) => (
                <button
                  key={curr}
                  onClick={() => setCurrency(curr)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                    currency === curr
                      ? 'bg-emerald-500 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>
          )}
          
          {/* Disconnect Button - Only in real mode */}
          {!isDemoMode && (
            <button 
              onClick={onDisconnect} 
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
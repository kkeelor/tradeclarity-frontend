// app/analyze/components/Header.js

import { TrendingUp } from 'lucide-react'

export default function Header({ 
  exchangeConfig, 
  currencyMetadata, 
  currency, 
  setCurrency, 
  onDisconnect 
}) {
  return (
    <header className="border-b border-slate-800 backdrop-blur-sm bg-slate-900/50 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-emerald-400" />
          <span className="text-lg font-bold">TradeClarity</span>
          <span className="text-xs text-slate-400 ml-2">
            {exchangeConfig.icon} {exchangeConfig.displayName}
          </span>
          {currencyMetadata?.supportsCurrencySwitch && (
            <span className="text-xs text-cyan-400 ml-2">• {currency}</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {currencyMetadata?.supportsCurrencySwitch && currencyMetadata.availableCurrencies.length > 1 && (
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
          <button 
            onClick={onDisconnect} 
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Disconnect
          </button>
        </div>
      </div>
    </header>
  )
}
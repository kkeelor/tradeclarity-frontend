// app/analyze/components/Header.js

import { useState, useRef, useEffect } from 'react'
import { TrendingUp, ArrowRight, LayoutDashboard, Upload, BarChart3, LogOut, ChevronDown } from 'lucide-react'
import ThemeToggle from '../../components/ThemeToggle'
import { getCurrencySymbol } from '../utils/currencyFormatter'

function NavButton({ icon: Icon, label, onClick }) {
  if (!onClick) return null

  return (
    <button
      onClick={onClick}
      className="group inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:text-white"
    >
      <Icon className="h-4 w-4 text-slate-500 transition-colors group-hover:text-emerald-300" />
      {label}
    </button>
  )
}

function CurrencyDropdown({ currencies, selectedCurrency, onSelectCurrency }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const currencyNames = {
    'USD': 'US Dollar',
    'INR': 'Indian Rupee',
    'EUR': 'Euro',
    'GBP': 'British Pound',
    'JPY': 'Japanese Yen',
    'AUD': 'Australian Dollar',
    'CAD': 'Canadian Dollar',
    'CNY': 'Chinese Yuan',
    'SGD': 'Singapore Dollar',
    'CHF': 'Swiss Franc'
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-full border border-white/5 bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-emerald-400/40 hover:bg-emerald-400/10 hover:text-white"
      >
        <span>{getCurrencySymbol(selectedCurrency)}</span>
        <span>{selectedCurrency}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-lg shadow-2xl z-50 overflow-hidden max-h-80 overflow-y-auto">
          {currencies.map((curr) => (
            <button
              key={curr}
              onClick={() => {
                onSelectCurrency(curr)
                setIsOpen(false)
              }}
              className={`w-full px-3 py-2 text-left text-xs transition flex items-center gap-2 ${
                selectedCurrency === curr
                  ? 'bg-emerald-400/20 text-emerald-300 font-medium'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              <span className="w-8 text-right">{getCurrencySymbol(curr)}</span>
              <span className="flex-1">{curr}</span>
              <span className="text-[10px] text-slate-500">{currencyNames[curr] || ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Header({
  exchangeConfig,
  currencyMetadata,
  currency,
  setCurrency,
  onDisconnect,
  onNavigateDashboard,
  onNavigateUpload,
  onNavigateAll,
  onSignOut,
  isDemoMode = false
}) {
  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, onClick: onNavigateDashboard },
    { label: 'Upload CSV', icon: Upload, onClick: onNavigateUpload },
    { label: 'All Data', icon: BarChart3, onClick: onNavigateAll }
  ].filter(item => Boolean(item.onClick))

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-slate-950/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-8">
          <button
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.03] px-3 py-1 text-sm font-semibold text-white/90 transition hover:border-emerald-400/40 hover:bg-emerald-400/10 hover:text-white"
          >
            <TrendingUp className="h-5 w-5 text-emerald-300" />
            TradeClarity
          </button>

          {navItems.length > 0 && (
            <nav className="hidden items-center gap-2 md:flex">
              {navItems.map(item => (
                <NavButton key={item.label} {...item} />
              ))}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          {exchangeConfig && (
            <span className="hidden items-center gap-2 rounded-full border border-white/5 bg-white/[0.02] px-3 py-1 text-xs text-slate-300/80 sm:inline-flex">
              {exchangeConfig.icon}
              {exchangeConfig.displayName}
            </span>
          )}

          {currencyMetadata?.supportsCurrencySwitch && currencyMetadata.availableCurrencies.length > 1 && (
            <CurrencyDropdown
              currencies={currencyMetadata.availableCurrencies}
              selectedCurrency={currency}
              onSelectCurrency={setCurrency}
            />
          )}

          {isDemoMode && (
            <button
              onClick={() => {
                if (onNavigateDashboard) {
                  onNavigateDashboard()
                } else {
                  window.location.href = '/dashboard'
                }
              }}
              className="hidden items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:from-emerald-300 hover:to-cyan-300 md:inline-flex"
            >
              Discover yours
              <ArrowRight className="h-4 w-4" />
            </button>
          )}

          <ThemeToggle />

          {!isDemoMode && (
            <button
              onClick={onDisconnect}
              className="rounded-full border border-white/5 px-3 py-1 text-xs font-medium text-slate-400 transition hover:border-rose-400/50 hover:bg-rose-400/10 hover:text-rose-200"
            >
              Disconnect
            </button>
          )}

          {onSignOut && (
            <button
              onClick={onSignOut}
              className="hidden items-center gap-2 rounded-full border border-white/5 px-3 py-1 text-xs font-medium text-slate-500 transition hover:border-white/10 hover:bg-white/10 hover:text-white md:inline-flex"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
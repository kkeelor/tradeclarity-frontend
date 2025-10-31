// app/analyze/components/Header.js

import { TrendingUp, ArrowRight, LayoutDashboard, Upload, BarChart3, LogOut } from 'lucide-react'
import ThemeToggle from '../../components/ThemeToggle'

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

          {!isDemoMode && currencyMetadata?.supportsCurrencySwitch && currencyMetadata.availableCurrencies.length > 1 && (
            <div className="flex items-center gap-1 rounded-full border border-white/5 bg-white/[0.02] p-1">
              {currencyMetadata.availableCurrencies.map((curr) => (
                <button
                  key={curr}
                  onClick={() => setCurrency(curr)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    currency === curr
                      ? 'bg-emerald-400 text-slate-900'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>
          )}

          {isDemoMode && (
            <button
              onClick={() => window.location.href = '/analyze'}
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
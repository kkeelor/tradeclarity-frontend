// app/analyze/components/Header.js

import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { TrendingUp, ArrowRight, LayoutDashboard, Database, BarChart3, LogOut, ChevronDown, Menu, X, Tag, CreditCard } from 'lucide-react'
import ThemeToggle from '../../components/ThemeToggle'
import { getCurrencySymbol } from '../utils/currencyFormatter'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

function NavButton({ icon: Icon, label, onClick, isActive = false, disabled = false }) {
  if (!onClick) return null

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`group inline-flex items-center justify-center gap-1 md:gap-2 rounded-full px-2 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs font-medium transition-colors flex-shrink-0 whitespace-nowrap min-w-[32px] md:min-w-auto ${
        disabled
          ? 'text-slate-500 cursor-not-allowed'
          : isActive
          ? 'text-white'
          : 'text-slate-300 hover:text-white'
      }`}
      style={{ minHeight: '32px' }}
    >
      <Icon className={`h-3 w-3 md:h-4 md:w-4 transition-colors flex-shrink-0 ${
        disabled
          ? 'text-slate-600'
          : isActive
          ? 'text-emerald-300'
          : 'text-slate-500 group-hover:text-emerald-300'
      }`} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function CurrencyDropdown({ currencies, selectedCurrency, onSelectCurrency }) {
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-full border border-white/5 bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-emerald-400/40 hover:bg-emerald-400/10 hover:text-white">
          <span>{getCurrencySymbol(selectedCurrency)}</span>
          <span>{selectedCurrency}</span>
          <ChevronDown className="h-3 w-3 transition-transform" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-black border-white/10">
        {currencies.map((curr) => (
          <DropdownMenuItem
            key={curr}
            onClick={() => onSelectCurrency(curr)}
            className={`flex items-center gap-2 text-xs cursor-pointer ${
              selectedCurrency === curr
                ? 'bg-white/10 text-white/90 font-medium data-[highlighted]:bg-white/10 data-[highlighted]:text-white/90'
                : 'text-white/70 data-[highlighted]:bg-white/10 data-[highlighted]:text-white/90'
            }`}
          >
            <span className="w-8 text-right">{getCurrencySymbol(curr)}</span>
            <span className="flex-1">{curr}</span>
            <span className="text-[10px] text-white/40">{currencyNames[curr] || ''}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
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
  isDemoMode = false,
  hasDataSources = true // Default to true to allow access unless explicitly disabled
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, onClick: onNavigateDashboard || (() => router.push('/dashboard')), path: '/dashboard' },
    { label: 'Your Data', icon: Database, onClick: onNavigateUpload || (() => router.push('/data')), path: '/data' },
    { label: 'Analytics', icon: BarChart3, onClick: onNavigateAll || (() => router.push('/analyze')), path: '/analyze', disabled: !hasDataSources && !isDemoMode },
    { label: 'Pricing', icon: Tag, onClick: () => router.push('/pricing'), path: '/pricing' },
    { label: 'Billing', icon: CreditCard, onClick: () => router.push('/billing'), path: '/billing' }
  ].filter(item => Boolean(item.onClick))

  // Close mobile menu on ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isMobileMenuOpen])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  const handleNavClick = (callback) => {
    setIsMobileMenuOpen(false)
    if (callback) callback()
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/5 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-2 sm:gap-4 px-2 sm:px-4 py-3 sm:py-4 overflow-hidden">
          <div className="flex items-center gap-1 sm:gap-2 md:gap-4 lg:gap-8 min-w-0 flex-1">
            {/* Mobile Menu Button */}
            {navItems.length > 0 && (
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}

            <button
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-1 sm:gap-2 rounded-full border border-white/5 bg-white/[0.03] px-2 sm:px-3 py-1 text-sm font-semibold text-white/90 transition hover:border-emerald-400/40 hover:bg-emerald-400/10 hover:text-white flex-shrink-0"
            >
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-300" />
              <span className="hidden sm:inline">TradeClarity</span>
            </button>

            {navItems.length > 0 && (
              <nav className="hidden md:flex items-center gap-1 md:gap-2 overflow-x-auto scrollbar-hide min-w-0">
                {navItems.map(item => {
                  const isActive = pathname === item.path || (item.path === '/dashboard' && pathname?.startsWith('/dashboard'))
                  return (
                    <NavButton key={item.label} {...item} isActive={isActive} disabled={item.disabled} />
                  )
                })}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0">
            {exchangeConfig && (
              <span className="hidden items-center gap-2 rounded-full border border-white/5 bg-white/[0.02] px-3 py-1 text-xs text-slate-300/80 sm:inline-flex">
                {exchangeConfig.icon}
                <span className="hidden md:inline">{exchangeConfig.displayName}</span>
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
                <span className="hidden lg:inline">Discover yours</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            <ThemeToggle />

            {onSignOut && (
              <button
                onClick={onSignOut}
                className="hidden items-center gap-2 rounded-full border border-white/5 px-3 py-1 text-xs font-medium text-slate-500 transition hover:border-white/10 hover:bg-white/10 hover:text-white md:inline-flex"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden lg:inline">Sign out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && navItems.length > 0 && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Mobile Menu Drawer */}
          <div className="md:hidden fixed inset-y-0 left-0 w-64 bg-slate-900/95 backdrop-blur-xl border-r border-white/5 z-50 transform transition-transform duration-300 ease-in-out">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <span className="text-lg font-bold text-white">Navigation</span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation Items */}
              <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {navItems.map(item => {
                  const Icon = item.icon
                  const isActive = pathname === item.path || (item.path === '/dashboard' && pathname?.startsWith('/dashboard'))
                  const isDisabled = item.disabled
                  return (
                    <button
                      key={item.label}
                      onClick={() => !isDisabled && handleNavClick(item.onClick)}
                      disabled={isDisabled}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-300 ${
                        isDisabled
                          ? 'text-slate-600 cursor-not-allowed opacity-50'
                          : isActive
                          ? 'bg-white/10 text-white'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${
                        isDisabled
                          ? 'text-slate-600'
                          : isActive
                          ? 'text-emerald-300'
                          : 'text-slate-400'
                      }`} />
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </nav>

              {/* Footer Actions */}
              {onSignOut && (
                <div className="p-4 border-t border-white/5">
                  <button
                    onClick={() => handleNavClick(onSignOut)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
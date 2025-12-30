// app/analyze/components/Header.js

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp, ArrowRight, LayoutDashboard, Database, BarChart3, LogOut, ChevronDown, Menu, X, Tag, CreditCard, Brain, Crown, HelpCircle } from 'lucide-react'
import FeedbackModal from '../../components/FeedbackModal'
import { getCurrencySymbol } from '../utils/currencyFormatter'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuth } from '@/lib/AuthContext'

// User Menu Component with Portal to avoid overflow-hidden clipping
function UserMenuButton({ user, onSignOut, showUserMenu, setShowUserMenu }) {
  const buttonRef = useRef(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 })

  useEffect(() => {
    if (showUserMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + 8, // 8px = mt-2 equivalent
        right: window.innerWidth - rect.right
      })
    }
  }, [showUserMenu])

  return (
    <>
      <div className="relative" ref={buttonRef}>
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="w-8 h-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center text-white/90 font-medium text-sm hover:bg-white/15 hover:border-white/20 transition-all duration-300"
        >
          {user?.user_metadata?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
        </button>
      </div>

      {showUserMenu && typeof window !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setShowUserMenu(false)}
          />
          <div 
            className="fixed w-48 bg-black border border-white/10 rounded-xl z-[9999] overflow-hidden shadow-2xl"
            style={{
              top: `${menuPosition.top}px`,
              right: `${menuPosition.right}px`
            }}
          >
            <div className="p-3 border-b border-white/5">
              <p className="text-[10px] text-white/50 mb-0.5">Signed in as</p>
              <p className="text-xs text-white/80 truncate">{user?.email}</p>
            </div>
            {onSignOut && (
              <button
                onClick={() => {
                  setShowUserMenu(false)
                  onSignOut()
                }}
                className="w-full px-3 py-2 text-left text-xs text-white/60 hover:text-red-400 hover:bg-white/5 transition-colors flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            )}
          </div>
        </>,
        document.body
      )}
    </>
  )
}

function NavButton({ icon: Icon, label, href, onClick, isActive = false, disabled = false }) {
  
  if (disabled) {
    return (
      <button
        disabled={true}
        className="group inline-flex items-center justify-center gap-1 md:gap-2 rounded-full px-2 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs font-medium transition-colors flex-shrink-0 whitespace-nowrap min-w-[32px] md:min-w-auto text-slate-500 cursor-not-allowed"
        style={{ minHeight: '32px' }}
      >
        <Icon className="h-3 w-3 md:h-4 md:w-4 transition-colors flex-shrink-0 text-slate-600" />
        <span className="hidden sm:inline">{label}</span>
      </button>
    )
  }

  if (href) {
    const handleClick = (e) => {
      // Only call custom onClick if it's a regular click (not right-click, middle-click, etc.)
      if (onClick && e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault()
        onClick()
      }
      // Otherwise, let the Link handle navigation naturally (allows right-click context menu)
    }
    
    const activeClasses = isActive 
      ? 'text-white bg-emerald-500/30 border border-emerald-400/60 shadow-lg shadow-emerald-500/20' 
      : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
    
    return (
      <Link
        href={href}
        onClick={handleClick}
        className={`group inline-flex items-center justify-center gap-1 md:gap-2 rounded-full px-2 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs font-medium transition-all duration-200 flex-shrink-0 whitespace-nowrap min-w-[32px] md:min-w-auto ${activeClasses}`}
        style={{ 
          minHeight: '32px',
          ...(isActive && {
            backgroundColor: 'rgba(16, 185, 129, 0.3)',
            borderColor: 'rgba(16, 185, 129, 0.6)',
            boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.2), 0 4px 6px -2px rgba(16, 185, 129, 0.1)'
          })
        }}
      >
        <Icon className={`h-3 w-3 md:h-4 md:w-4 transition-colors flex-shrink-0 ${
          isActive
            ? 'text-emerald-300'
            : 'text-slate-500 group-hover:text-emerald-300'
        }`} />
        <span className="hidden sm:inline">{label}</span>
      </Link>
    )
  }

  if (!onClick) return null

  return (
    <button
      onClick={onClick}
      className={`group inline-flex items-center justify-center gap-1 md:gap-2 rounded-full px-2 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs font-medium transition-all duration-200 flex-shrink-0 whitespace-nowrap min-w-[32px] md:min-w-auto ${
        isActive
          ? '!text-white !bg-emerald-500/30 !border !border-emerald-400/60 shadow-lg shadow-emerald-500/20'
          : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
      }`}
      style={{ minHeight: '32px' }}
    >
      <Icon className={`h-3 w-3 md:h-4 md:w-4 transition-colors flex-shrink-0 ${
        isActive
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
  onNavigateVega,
  onSignOut,
  subscription = null, // Optional subscription object with tier property
  showSubscriptionBadge = false, // Whether to show subscription badge in header
  isDemoMode = false,
  hasDataSources = true, // Default to true to allow access unless explicitly disabled
  mobilePaddingLeft = false // Add left padding on mobile (for Dashboard sidebar)
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)

  // Default sign out handler if onSignOut is not provided
  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
      router.push('/')
    } catch (error) {
      console.error('Sign out error:', error)
      router.push('/')
    }
  }
  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', onClick: onNavigateDashboard, path: '/dashboard' },
    { label: 'Your Data', icon: Database, href: '/data', onClick: onNavigateUpload, path: '/data' },
    { label: 'VegaAI', icon: Brain, href: '/vega', onClick: onNavigateVega || (() => router.push('/vega')), path: '/vega' },
    // Analytics removed from nav - redirects now go to VegaAI
    // { label: 'Analytics', icon: BarChart3, href: '/analyze', onClick: onNavigateAll, path: '/analyze', disabled: !hasDataSources && !isDemoMode },
    { label: 'Pricing', icon: Tag, href: '/pricing', path: '/pricing' },
    { label: 'Billing', icon: CreditCard, href: '/billing', path: '/billing' }
  ].filter(item => Boolean(item.href || item.onClick))

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
      <header className="sticky top-0 z-30 border-b border-white/5 bg-black/70 backdrop-blur-xl">
        <div className={`mx-auto flex w-full max-w-[1400px] items-center justify-between gap-2 sm:gap-4 px-2 sm:px-4 py-3 sm:py-4 overflow-hidden ${mobilePaddingLeft ? 'pl-14 md:pl-4' : ''}`}>
          <div className="flex items-center gap-1 sm:gap-2 md:gap-4 lg:gap-8 min-w-0 flex-1">
            {/* Mobile Menu Button - Hidden when used in Dashboard (which has its own sidebar) */}
            {navItems.length > 0 && pathname !== '/dashboard' && (
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-lg bg-slate-800/90 backdrop-blur border border-white/5 hover:bg-slate-700/90 transition-all flex-shrink-0"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5 text-white" />
              </button>
            )}

            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <button
                onClick={() => window.location.href = '/'}
                className="flex items-center gap-1 sm:gap-2 rounded-full border border-white/5 bg-white/[0.03] px-2 sm:px-3 py-1 text-sm font-semibold text-white/90 transition hover:border-emerald-400/40 hover:bg-emerald-400/10 hover:text-white flex-shrink-0"
              >
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-300" />
                <span className="hidden sm:inline">TradeClarity</span>
              </button>
              {showSubscriptionBadge && subscription && (
                <Badge 
                  variant="outline" 
                  className={`${
                    subscription.tier === 'pro' || subscription.tier === 'trader'
                      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400' 
                      : 'border-blue-400/30 bg-blue-400/10 text-blue-400'
                  } font-semibold uppercase tracking-wider text-[9px] px-1.5 py-0.5 flex items-center gap-1 hidden sm:flex`}
                >
                  {subscription.tier === 'pro' && <Crown className="w-2.5 h-2.5 text-emerald-400" />}
                  {subscription.tier}
                </Badge>
              )}
            </div>

            {navItems.length > 0 && (
              <nav className="hidden md:flex items-center gap-1 md:gap-2 overflow-x-auto scrollbar-hide min-w-0">
                {navItems.map(item => {
                  const isActive = pathname === item.path || 
                    (item.path === '/dashboard' && pathname?.startsWith('/dashboard')) ||
                    (item.path === '/data' && pathname?.startsWith('/data')) ||
                    (item.path === '/vega' && pathname?.startsWith('/vega')) ||
                    (item.path === '/pricing' && pathname === '/pricing') ||
                    (item.path === '/billing' && pathname === '/billing')
                  return (
                    <NavButton 
                      key={item.label} 
                      icon={item.icon}
                      label={item.label}
                      href={item.href}
                      onClick={item.onClick}
                      isActive={isActive} 
                      disabled={item.disabled} 
                    />
                  )
                })}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0">
            {exchangeConfig && (
              <span className="hidden items-center gap-1.5 sm:gap-2 rounded-full border border-white/5 bg-white/[0.02] px-2 sm:px-3 py-1 text-[10px] sm:text-xs text-slate-300/80 sm:inline-flex">
                {exchangeConfig.icon}
                <span className="hidden md:inline">{exchangeConfig.displayName}</span>
              </span>
            )}

            {currencyMetadata?.supportsCurrencySwitch && currencyMetadata.availableCurrencies.length > 1 && (
              <div className="flex items-center gap-1 sm:gap-1.5">
                <CurrencyDropdown
                  currencies={currencyMetadata.availableCurrencies}
                  selectedCurrency={currency}
                  onSelectCurrency={setCurrency}
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white/40 hover:text-white/60 transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="font-medium mb-1">Currency Display</p>
                      <p className="text-xs leading-relaxed">
                        Change the display currency for all metrics, charts, and values across the app. Your actual trades remain in their original currency - this only affects how they're displayed.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}

            <button
              onClick={() => setShowFeedbackModal(true)}
              className="text-[10px] sm:text-xs text-white/50 hover:text-white/80 transition-colors hidden xs:inline-block"
            >
              Feedback
            </button>

            {user && (
              <UserMenuButton 
                user={user}
                onSignOut={onSignOut}
                showUserMenu={showUserMenu}
                setShowUserMenu={setShowUserMenu}
              />
            )}

            {!user && onSignOut && (
              <button
                onClick={onSignOut}
                className="hidden items-center gap-2 rounded-full border border-white/5 px-3 py-1 text-xs font-medium text-slate-500 transition hover:border-white/10 hover:bg-white/10 hover:text-white md:inline-flex"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden lg:inline">Sign in</span>
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
          <div className="md:hidden fixed inset-y-0 left-0 w-64 bg-white/[0.03] backdrop-blur border-r border-white/5 z-50 transform transition-transform duration-300 ease-in-out">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <span className="text-lg font-bold text-white">Navigation</span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-lg bg-slate-800/90 backdrop-blur border border-white/5 hover:bg-slate-700/90 transition-all"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>

              {/* Navigation Items */}
              <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {navItems.map(item => {
                  const Icon = item.icon
                  const isActive = pathname === item.path || 
                    (item.path === '/dashboard' && pathname?.startsWith('/dashboard')) ||
                    (item.path === '/data' && pathname?.startsWith('/data')) ||
                    (item.path === '/vega' && pathname?.startsWith('/vega')) ||
                    (item.path === '/pricing' && pathname === '/pricing') ||
                    (item.path === '/billing' && pathname === '/billing')
                  const isDisabled = item.disabled
                  
                  if (isDisabled) {
                    return (
                      <button
                        key={item.label}
                        disabled={true}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-300 text-slate-600 cursor-not-allowed opacity-50"
                      >
                        <Icon className="h-5 w-5 text-slate-600" />
                        <span>{item.label}</span>
                      </button>
                    )
                  }
                  
                  if (item.href) {
                    const handleLinkClick = (e) => {
                      // Only call custom onClick if it's a regular click (not right-click, middle-click, etc.)
                      if (item.onClick && e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                        e.preventDefault()
                        handleNavClick(item.onClick)
                      }
                      // Otherwise, let the Link handle navigation naturally (allows right-click context menu)
                    }
                    
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={handleLinkClick}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-300 ${
                          isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                            : 'text-slate-300 hover:bg-white/[0.05] border border-transparent'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </Link>
                    )
                  }
                  
                  return (
                    <button
                      key={item.label}
                      onClick={() => handleNavClick(item.onClick)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-300 ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                          : 'text-slate-300 hover:bg-white/[0.05] border border-transparent'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </nav>

              {/* Footer Actions */}
              {user && (
                <div className="p-4 border-t border-white/5">
                  <button
                    onClick={() => handleNavClick(onSignOut || handleSignOut)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-300 text-slate-400 hover:bg-white/[0.05] hover:text-red-400 border border-transparent"
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

      <FeedbackModal open={showFeedbackModal} onOpenChange={setShowFeedbackModal} />
    </>
  )
}
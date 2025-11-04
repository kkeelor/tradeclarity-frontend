'use client'

import { useState, useEffect } from 'react'
import { Home, Database, Sparkles, LogOut, TrendingUp, Twitter, Linkedin, Menu, X } from 'lucide-react'
import { toast } from 'sonner'

export default function Sidebar({
  activePage = 'dashboard',
  onDashboardClick,
  onUploadClick,
  onMyPatternsClick,
  onSignOutClick,
  isMyPatternsDisabled = false,
  isDemoMode = false
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Close mobile menu on ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isMobileOpen) {
        setIsMobileOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isMobileOpen])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileOpen])

  const handleSignOut = async () => {
    console.log('🔴 Sign out button clicked')

    // Set a timeout to force reload if signOut takes too long
    const timeoutId = setTimeout(() => {
      console.log('🔴 SignOut timeout - forcing reload anyway')
      window.location.href = '/'
    }, 3000)

    try {
      console.log('🔴 Calling server-side sign out API...')
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
      })

      console.log('🔴 API response status:', response.status)
      const data = await response.json()
      console.log('🔴 API response data:', data)

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error('🔴 Sign out error:', data.error)
        toast.error('Failed to sign out. Refreshing anyway...')
      } else {
        console.log('🔴 Sign out successful!')
        toast.success('Signed out successfully')
      }

      // Redirect to landing page (with slight delay for toast to show)
      console.log('🔴 Redirecting to landing page...')
      setTimeout(() => {
        window.location.href = '/'
      }, 500)
    } catch (error) {
      console.error('🔴 Sign out catch error:', error)
      clearTimeout(timeoutId)
      toast.error('Sign out error. Refreshing...')
      // Still redirect even on error
      setTimeout(() => {
        window.location.href = '/'
      }, 500)
    }
  }

  const handleNavClick = (callback) => {
    setIsMobileOpen(false)
    if (callback) callback()
  }

  const SidebarContent = () => (
    <aside className="w-64 border-r border-white/5 bg-white/[0.03] backdrop-blur flex flex-col">
      <div className="p-6 border-b border-white/5">
        <button
          onClick={() => window.location.href = '/'}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity duration-300 cursor-pointer"
        >
          <TrendingUp className="w-6 h-6 text-emerald-400" />
          <span className="text-lg font-bold">TradeClarity</span>
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <button
          onClick={() => handleNavClick(onDashboardClick)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
            activePage === 'dashboard'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
              : 'text-slate-300 hover:bg-white/[0.05] border border-transparent'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => handleNavClick(onUploadClick)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
            activePage === 'upload'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
              : 'text-slate-300 hover:bg-white/[0.05] border border-transparent'
          }`}
        >
          <Database className="w-5 h-5" />
          <span>Your Data</span>
        </button>

        <button
          onClick={() => handleNavClick(onMyPatternsClick)}
          disabled={isMyPatternsDisabled}
          className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
            activePage === 'patterns'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
              : 'text-slate-300 hover:bg-white/[0.05] border border-transparent'
          }`}
        >
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5" />
            <span>My Patterns</span>
          </div>
        </button>

        <button
          onClick={() => handleNavClick(onSignOutClick || handleSignOut)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-white/[0.05] hover:text-red-400 transition-all duration-300 border border-transparent"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </nav>

      {/* Social Links */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center justify-center gap-4">
          <a
            href="https://x.com/trdclrty"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-cyan-400 transition-colors duration-300"
            title="Follow us on X"
          >
            <Twitter className="w-4 h-4" />
          </a>
          <a
            href="https://www.linkedin.com/in/karankeelor/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-blue-400 transition-colors duration-300"
            title="Connect on LinkedIn"
          >
            <Linkedin className="w-4 h-4" />
          </a>
        </div>
      </div>
    </aside>
  )

  return (
    <>
      {/* Mobile Hamburger Button - Only show on mobile (md and below) */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-slate-800/90 backdrop-blur border border-white/5 hover:bg-slate-700/90 transition-all"
        aria-label="Open menu"
        style={{ zIndex: 50 }}
      >
        <Menu className="w-6 h-6 text-white" />
      </button>

      {/* Desktop Sidebar - Always hidden (sidebar only for mobile drawer) */}
      {/* Removed desktop sidebar - pages handle their own navigation */}

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`md:hidden fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="relative h-full">
          {/* Close Button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-lg bg-slate-800/90 backdrop-blur border border-white/5 hover:bg-slate-700/90 transition-all z-10"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Mobile Sidebar Content */}
          <SidebarContent />
        </div>
      </div>
    </>
  )
}

'use client'

import { Home, Upload, Sparkles, LogOut, TrendingUp, Twitter, Linkedin } from 'lucide-react'
import { useAlert } from '@/app/components'

export default function Sidebar({
  activePage = 'dashboard',
  onDashboardClick,
  onUploadClick,
  onMyPatternsClick,
  onSignOutClick,
  isMyPatternsDisabled = false,
  isDemoMode = false
}) {
  const alert = useAlert()

  const handleSignOut = async () => {
    console.log('🔴 Sign out button clicked')

    // Set a timeout to force reload if signOut takes too long
    const timeoutId = setTimeout(() => {
      console.log('🔴 SignOut timeout - forcing reload anyway')
      window.location.href = '/analyze'
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
        alert.error('Failed to sign out. Refreshing anyway...')
      } else {
        console.log('🔴 Sign out successful!')
        alert.success('Signed out successfully')
      }

      // Force a page reload to clear all state (with slight delay for toast to show)
      console.log('🔴 Reloading page...')
      setTimeout(() => {
        window.location.href = '/analyze'
      }, 500)
    } catch (error) {
      console.error('🔴 Sign out catch error:', error)
      clearTimeout(timeoutId)
      alert.error('Sign out error. Refreshing...')
      // Still reload even on error
      setTimeout(() => {
        window.location.href = '/analyze'
      }, 500)
    }
  }

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/50 backdrop-blur-sm flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <button
          onClick={() => window.location.href = '/'}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <TrendingUp className="w-6 h-6 text-emerald-400" />
          <span className="text-lg font-bold">TradeClarity</span>
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <button
          onClick={onDashboardClick}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
            activePage === 'dashboard'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-300 hover:bg-slate-800/50'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={onUploadClick}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
            activePage === 'upload'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-300 hover:bg-slate-800/50'
          }`}
        >
          <Upload className="w-5 h-5" />
          <span>Upload Files</span>
        </button>

        <button
          onClick={onMyPatternsClick}
          disabled={isMyPatternsDisabled}
          className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            activePage === 'patterns'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-300 hover:bg-slate-800/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5" />
            <span>My Patterns</span>
          </div>
        </button>

        <button
          onClick={onSignOutClick || handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800/50 hover:text-red-400 transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </nav>

      {/* Social Links */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center justify-center gap-4">
          <a
            href="https://x.com/trdclrty"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-cyan-400 transition-colors"
            title="Follow us on X"
          >
            <Twitter className="w-4 h-4" />
          </a>
          <a
            href="https://www.linkedin.com/in/karankeelor/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-blue-400 transition-colors"
            title="Connect on LinkedIn"
          >
            <Linkedin className="w-4 h-4" />
          </a>
        </div>
      </div>
    </aside>
  )
}

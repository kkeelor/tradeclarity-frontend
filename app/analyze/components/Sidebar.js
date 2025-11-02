'use client'

import { Home, Upload, Sparkles, LogOut, TrendingUp, Twitter, Linkedin } from 'lucide-react'
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

  return (
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
          onClick={onDashboardClick}
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
          onClick={onUploadClick}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
            activePage === 'upload'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
              : 'text-slate-300 hover:bg-white/[0.05] border border-transparent'
          }`}
        >
          <Upload className="w-5 h-5" />
          <span>Upload Files</span>
        </button>

        <button
          onClick={onMyPatternsClick}
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
          onClick={onSignOutClick || handleSignOut}
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
}

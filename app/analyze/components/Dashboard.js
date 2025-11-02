// app/analyze/components/Dashboard.js
'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Plus, Upload, Trash2, AlertCircle, Link as LinkIcon, FileText, Download, Play, LogOut, BarChart3, Sparkles, Database, CheckSquare, Square, Loader2, ChevronRight, Zap } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { toast } from 'sonner'
import ThemeToggle from '@/app/components/ThemeToggle'
import { getMostCriticalInsight, getAllInsights } from '../utils/performanceAnalogies'
import { analyzeData } from '../utils/masterAnalyzer'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { ExchangeIcon } from '@/components/ui'
import { DashboardStatsSkeleton, DataSourceSkeleton } from '@/app/components/LoadingSkeletons'
import ConnectExchangeModal from './ConnectExchangeModal'

export default function Dashboard({ onConnectExchange, onTryDemo, onConnectWithCSV, onViewAnalytics }) {
  const { user } = useAuth()
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [connectedExchanges, setConnectedExchanges] = useState([])
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [loadingExchanges, setLoadingExchanges] = useState(true)
  const [loadingFiles, setLoadingFiles] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)
  const [tradesStats, setTradesStats] = useState(null)
  const [criticalInsight, setCriticalInsight] = useState(null)
  const [allInsights, setAllInsights] = useState([])
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0)
  const [selectedSources, setSelectedSources] = useState([]) // Array of {type: 'exchange'|'csv', id: string}

  // Exchange deletion state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingExchange, setDeletingExchange] = useState(null)
  const [deleteStats, setDeleteStats] = useState(null)
  const [deleteLinkedCSVs, setDeleteLinkedCSVs] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  // Fetch connected exchanges and uploaded files on mount
  useEffect(() => {
    fetchConnectedExchanges()
    fetchUploadedFiles()
    fetchTradesStats()
  }, [])

  // Rotate through insights every 6 seconds
  useEffect(() => {
    if (!allInsights || allInsights.length <= 1) return // Don't rotate if there's only one or no insights

    const interval = setInterval(() => {
      setCurrentInsightIndex((prev) => (prev + 1) % allInsights.length)
    }, 6000) // Change insight every 6 seconds

    return () => clearInterval(interval)
  }, [allInsights])

  const fetchConnectedExchanges = async () => {
    const startTime = Date.now()
    try {
      console.log('📡 [Dashboard] Fetching connected exchanges...')
      const response = await fetch('/api/exchange/list')
      const data = await response.json()

      console.log('📡 [Dashboard] API response:', data)

      if (data.success) {
        const formatted = data.connections.map(conn => ({
          id: conn.id,
          name: conn.exchange.charAt(0).toUpperCase() + conn.exchange.slice(1),
          exchange: conn.exchange,
          connectedAt: conn.created_at,
          lastSynced: conn.last_synced || conn.updated_at || conn.created_at
        }))
        console.log('✅ [Dashboard] Formatted exchanges:', formatted)
        setConnectedExchanges(formatted)
      } else {
        console.log('❌ [Dashboard] API returned error:', data.error)
      }
    } catch (error) {
      console.error('❌ [Dashboard] Error fetching exchanges:', error)
    } finally {
      // Ensure minimum 350ms loading time for skeleton visibility
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 350 - elapsed)
      setTimeout(() => setLoadingExchanges(false), remaining)
    }
  }

  const fetchUploadedFiles = async () => {
    const startTime = Date.now()
    try {
      const response = await fetch('/api/csv/list')
      const data = await response.json()

      if (data.success) {
        setUploadedFiles(data.files || [])
      }
    } catch (error) {
      console.error('Error fetching uploaded files:', error)
    } finally {
      // Ensure minimum 350ms loading time for skeleton visibility
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 350 - elapsed)
      setTimeout(() => setLoadingFiles(false), remaining)
    }
  }

  const fetchTradesStats = async () => {
    const startTime = Date.now()
    try {
      const response = await fetch('/api/trades/fetch')
      const data = await response.json()

      if (data.success && data.metadata) {
        setTradesStats(data.metadata)

        // Analyze data to get critical insight
        if (data.spotTrades || data.futuresIncome) {
          try {
            // analyzeData is now async due to currency conversion
            const analytics = await analyzeData(data)
            const psychology = analytics.psychology || {}
            const insight = getMostCriticalInsight(analytics, psychology)
            const insights = getAllInsights(analytics, psychology)
            setCriticalInsight(insight)
            setAllInsights(insights || [])
            setCurrentInsightIndex(0) // Reset to first insight
          } catch (error) {
            console.error('Error analyzing trades for insight:', error)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching trades stats:', error)
    } finally {
      // Ensure minimum 350ms loading time for skeleton visibility
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 350 - elapsed)
      setTimeout(() => setLoadingStats(false), remaining)
    }
  }

  // Selection handlers
  const toggleSource = (type, id) => {
    setSelectedSources(prev => {
      const exists = prev.find(s => s.type === type && s.id === id)
      if (exists) {
        return prev.filter(s => !(s.type === type && s.id === id))
      } else {
        return [...prev, { type, id }]
      }
    })
  }

  const isSourceSelected = (type, id) => {
    return selectedSources.some(s => s.type === type && s.id === id)
  }

  const selectAll = () => {
    // Only include unlinked files (linked files are included with their exchanges)
    const unlinkedFiles = uploadedFiles.filter(file => !file.exchange_connection_id)
    const allSources = [
      ...connectedExchanges.map(ex => ({ type: 'exchange', id: ex.id })),
      ...unlinkedFiles.map(file => ({ type: 'csv', id: file.id }))
    ]
    setSelectedSources(allSources)
  }

  const deselectAll = () => {
    setSelectedSources([])
  }

  // Get linked files count for an exchange
  const getLinkedFilesCount = (exchangeId) => {
    return uploadedFiles.filter(file => file.exchange_connection_id === exchangeId).length
  }

  // Get only unlinked files
  const unlinkedFiles = uploadedFiles.filter(file => !file.exchange_connection_id)

  const handleViewSelected = () => {
    if (selectedSources.length === 0) return

    console.log('📊 Viewing analytics for selected sources:', selectedSources)

    // Pass selected sources to analytics view for filtering
    onViewAnalytics(selectedSources)
  }

  const handleDeleteClick = async (exchange) => {
    // Fetch deletion impact stats
    try {
      const response = await fetch('/api/exchange/delete-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: exchange.id })
      })

      if (!response.ok) {
        toast.error('Failed to preview deletion impact')
        return
      }

      const stats = await response.json()

      setDeletingExchange(exchange)
      setDeleteStats(stats)
      setDeleteLinkedCSVs(false) // Reset checkbox
      setShowDeleteConfirm(true)
    } catch (error) {
      console.error('Error previewing deletion:', error)
      alert.error('Failed to preview deletion impact')
    }
  }

  const handleDeleteConfirm = async () => {
    setIsDeleting(true)

    try {
      const response = await fetch('/api/exchange/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: deletingExchange.id,
          deleteLinkedCSVs: deleteLinkedCSVs
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Remove from list
        setConnectedExchanges(prev => prev.filter(ex => ex.id !== deletingExchange.id))

        // Show success message
        const message = deleteLinkedCSVs
          ? `Exchange disconnected. ${data.totalTradesDeleted} trades and ${data.csvFilesDeleted} CSV files deleted.`
          : `Exchange disconnected. ${data.apiTradesDeleted} API trades deleted. ${data.csvFilesUnlinked} CSV files kept.`

        toast.success('Exchange Disconnected', {
          description: message,
          duration: 8000
        })

        // Refresh files list if CSVs were affected
        if (deleteLinkedCSVs || data.csvFilesUnlinked > 0) {
          await fetchUploadedFiles()
        }

        // Refresh stats to update the Trading Overview section
        await fetchTradesStats()
      } else {
        toast.error(data.error || 'Failed to delete exchange connection')
      }
    } catch (error) {
      console.error('Error deleting exchange:', error)
      toast.error('Failed to delete exchange connection')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
      setDeletingExchange(null)
      setDeleteStats(null)
    }
  }

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files)
    const newFiles = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: (file.size / 1024).toFixed(2) + ' KB',
      uploadedAt: new Date().toISOString(),
      file: file
    }))
    setUploadedFiles([...uploadedFiles, ...newFiles])
  }

  const handleDeleteFile = (fileId) => {
    setUploadedFiles(uploadedFiles.filter(f => f.id !== fileId))
  }

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleConnectionMethod = (method) => {
    if (method === 'api') {
      // Go to API key connection flow
      onConnectExchange()
    } else if (method === 'csv') {
      // Go to CSV upload flow
      if (onConnectWithCSV) {
        onConnectWithCSV()
      }
    }
  }

  const handleSignOut = async () => {
    console.log('🔴 Sign out button clicked')
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
      } else {
        console.log('🔴 Sign out successful!')
      }

      console.log('🔴 Redirecting to landing page...')
      window.location.href = '/'
    } catch (error) {
      console.error('🔴 Sign out catch error:', error)
      clearTimeout(timeoutId)
      window.location.href = '/'
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(46,204,149,0.08),_transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(59,130,246,0.06),_transparent_55%)]" />
      
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-8">
            <button
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.03] px-3 py-1 text-sm font-semibold text-white/90 transition-all duration-300 hover:border-emerald-400/40 hover:bg-emerald-400/10 hover:text-white"
            >
              <TrendingUp className="h-5 w-5 text-emerald-300" />
              TradeClarity
            </button>

            <nav className="hidden items-center gap-2 md:flex">
              <button
                onClick={onConnectWithCSV}
                className="group inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-slate-300 transition-all duration-300 hover:text-white"
              >
                <Upload className="h-4 w-4 text-slate-500 transition-colors group-hover:text-emerald-300" />
                Upload Files
              </button>
              <button
                onClick={() => onViewAnalytics()}
                disabled={connectedExchanges.length === 0 && !loadingExchanges}
                className={`group inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
                  connectedExchanges.length === 0 && !loadingExchanges
                    ? 'text-slate-500 cursor-not-allowed'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Sparkles className={`h-4 w-4 transition-colors ${
                  connectedExchanges.length === 0 && !loadingExchanges
                    ? 'text-slate-600'
                    : 'text-slate-500 group-hover:text-emerald-300'
                }`} />
                My Patterns
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-slate-900 font-semibold text-sm hover:shadow-lg hover:shadow-emerald-500/20 transition-all duration-300"
              >
                {user?.user_metadata?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
              </button>

              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-lg shadow-2xl z-20 overflow-hidden">
                    <div className="p-2.5 border-b border-slate-700/50">
                      <p className="text-[10px] text-slate-500 mb-0.5">Signed in as</p>
                      <p className="text-xs text-slate-300 truncate">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        handleSignOut()
                      }}
                      className="w-full px-3 py-2 text-left text-xs text-slate-400 hover:text-red-400 hover:bg-slate-700/50 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative mx-auto w-full max-w-[1400px] px-4 pb-16 pt-10 space-y-10">
        {/* Greeting Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-100 tracking-tight">
              {getGreeting()}{user?.user_metadata?.name ? `, ${user.user_metadata.name.split(' ')[0]}` : ''}
            </h1>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              {user?.email}
              {tradesStats && tradesStats.totalTrades > 0 && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400 font-medium">{tradesStats.totalTrades} trades analyzed</span>
                </>
              )}
            </p>
          </div>
        </div>
            {/* Stats Overview & Smart Recommendations */}
            {loadingStats ? (
              <DashboardStatsSkeleton />
            ) : tradesStats && tradesStats.totalTrades > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {/* Stats Card */}
                <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-white/[0.03] shadow-lg shadow-emerald-500/5 backdrop-blur p-5 md:p-6 transition-all duration-300 hover:scale-[1.02] hover:border-white/10">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10" />
                  <div className="absolute -top-24 -right-20 w-72 h-72 bg-emerald-500/20 blur-3xl rounded-full opacity-50" />
                  <div className="relative">
                    <h3 className="text-xs font-semibold text-slate-300 mb-4 uppercase tracking-wider">Your Trading Overview</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.05] backdrop-blur-sm">
                        <span className="text-xs text-slate-400">Total Trades</span>
                        <span className="text-sm font-bold text-slate-100">{tradesStats.totalTrades.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.05] backdrop-blur-sm">
                        <span className="text-xs text-slate-400">Exchanges Connected</span>
                        <span className="text-sm font-bold text-emerald-400">{connectedExchanges.length}</span>
                      </div>
                      {tradesStats.oldestTrade && (
                        <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.05] backdrop-blur-sm">
                          <span className="text-xs text-slate-400">Data Range</span>
                          <span className="text-xs font-medium text-slate-300">
                            {new Date(tradesStats.oldestTrade).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - Present
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Smart Recommendations */}
                <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-emerald-500/5 shadow-lg shadow-emerald-500/10 backdrop-blur p-5 md:p-6 transition-all duration-300 hover:scale-[1.02] hover:border-emerald-500/40 hover:bg-emerald-500/10 group">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10" />
                  <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/20 blur-2xl rounded-full opacity-50 group-hover:opacity-75 transition-opacity duration-300" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">What's Next</h3>
                    </div>
                    {connectedExchanges.length === 1 ? (
                      <p className="text-xs text-slate-300 leading-relaxed mb-4">
                        Add another exchange to compare performance across platforms and get deeper insights
                      </p>
                    ) : (
                      <p className="text-xs text-slate-300 leading-relaxed mb-4">
                        View your combined analytics to see patterns across all {connectedExchanges.length} exchanges and discover hidden opportunities
                      </p>
                    )}
                    <button
                      onClick={() => connectedExchanges.length === 1 ? setShowConnectModal(true) : onViewAnalytics()}
                      className="group/btn text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-all duration-300 inline-flex items-center gap-1.5 hover:gap-2"
                    >
                      {connectedExchanges.length === 1 ? 'Add Exchange' : 'View Combined Analytics'}
                      <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* First-time user experience */
              <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-white/[0.03] shadow-lg shadow-emerald-500/5 backdrop-blur p-6 md:p-8">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10" />
                <div className="absolute -top-16 -right-16 w-40 h-40 bg-emerald-500/10 blur-3xl rounded-full" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-slate-200">
                      {user?.user_metadata?.name ? `Hey ${user.user_metadata.name.split(' ')[0]}` : 'Hey there'}, let's get started
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Connect your first exchange to unlock powerful insights into your trading patterns, performance metrics, and psychology.
                    Not ready to connect? Try the demo to see what's possible.
                  </p>
                </div>
              </div>
            )}

            {/* Dynamic Trading Insight Card - Rotates through insights */}
            {!loadingStats && allInsights.length > 0 && tradesStats && tradesStats.totalTrades > 0 && (() => {
              const currentInsight = allInsights[currentInsightIndex]
              if (!currentInsight) return null

              const isWeakness = currentInsight.type === 'weakness'

              return (
                <button
                  onClick={onViewAnalytics}
                  className={`w-full group relative overflow-hidden flex items-center gap-3 px-5 py-4 rounded-3xl border backdrop-blur transition-all duration-500 hover:scale-[1.02] text-left ${
                    isWeakness
                      ? 'border-red-500/20 bg-red-500/5 shadow-lg shadow-red-500/5 hover:border-red-500/40 hover:bg-red-500/10'
                      : 'border-emerald-500/20 bg-emerald-500/5 shadow-lg shadow-emerald-500/5 hover:border-emerald-500/40 hover:bg-emerald-500/10'
                  }`}
                  key={currentInsightIndex} // Key helps React animate the transition
                >
                  <div className={`absolute inset-0 bg-gradient-to-br transition-opacity duration-500 ${
                    isWeakness
                      ? 'from-red-500/10 via-transparent to-orange-500/10'
                      : 'from-emerald-500/10 via-transparent to-cyan-500/10'
                  }`} />
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm border transition-all duration-500 ${
                    isWeakness
                      ? 'bg-red-500/20 text-red-400 border-red-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  }`}>
                    {isWeakness ? <AlertCircle className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                  </div>

                  <div className="flex-1 min-w-0 relative">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold transition-colors duration-500 ${
                        isWeakness ? 'text-red-300' : 'text-emerald-300'
                      }`}>
                        {currentInsight.title}
                      </span>
                      {currentInsight.impact && (
                        <span className="flex items-center gap-0.5">
                          {[...Array(currentInsight.impact)].map((_, i) => (
                            <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${
                              isWeakness ? 'bg-red-400/70' : 'bg-emerald-400/70'
                            }`} />
                          ))}
                        </span>
                      )}
                      <span className="text-xs text-slate-300 truncate">• {currentInsight.message}</span>
                    </div>
                    {allInsights.length > 1 && (
                      <div className="flex items-center gap-1 mt-2">
                        {allInsights.map((_, index) => (
                          <div
                            key={index}
                            className={`h-1 rounded-full transition-all duration-300 ${
                              index === currentInsightIndex
                                ? isWeakness
                                  ? 'bg-red-400 w-2'
                                  : 'bg-emerald-400 w-2'
                                : 'bg-slate-600 w-1'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <ChevronRight className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:translate-x-1 ${
                    isWeakness ? 'text-red-400/70' : 'text-emerald-400/70'
                  }`} />
                </button>
              )
            })()}

            {/* Quick Actions */}
            <section>
              <div className="grid grid-cols-3 gap-4 md:gap-6">
                <button
                  onClick={() => setShowConnectModal(true)}
                  className="group relative overflow-hidden p-5 md:p-6 rounded-3xl border border-white/5 bg-white/[0.03] shadow-lg shadow-emerald-500/5 backdrop-blur hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all duration-300 hover:scale-[1.02] text-left"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute -top-8 -right-8 w-24 h-24 bg-emerald-500/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-emerald-500/20 group-hover:bg-emerald-500/30 border border-emerald-500/30 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                        <LinkIcon className="w-5 h-5 text-emerald-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-200">Connect Exchange</h3>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Link via API or CSV
                    </p>
                  </div>
                </button>

                <button
                  onClick={onConnectWithCSV}
                  className="group relative overflow-hidden p-5 md:p-6 rounded-3xl border border-white/5 bg-white/[0.03] shadow-lg shadow-blue-500/5 backdrop-blur hover:border-blue-500/40 hover:bg-blue-500/5 transition-all duration-300 hover:scale-[1.02] text-left"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute -top-8 -right-8 w-24 h-24 bg-blue-500/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-blue-500/20 group-hover:bg-blue-500/30 border border-blue-500/30 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                        <Upload className="w-5 h-5 text-blue-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-200">Upload CSV</h3>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Import trade history
                    </p>
                  </div>
                </button>

                <button
                  onClick={onTryDemo}
                  className="group relative overflow-hidden p-5 md:p-6 rounded-3xl border border-white/5 bg-white/[0.03] shadow-lg shadow-purple-500/5 backdrop-blur hover:border-purple-500/40 hover:bg-purple-500/5 transition-all duration-300 hover:scale-[1.02] text-left"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute -top-8 -right-8 w-24 h-24 bg-purple-500/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-purple-500/20 group-hover:bg-purple-500/30 border border-purple-500/30 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                        <Play className="w-5 h-5 text-purple-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-200">Try Demo</h3>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Explore sample data
                    </p>
                  </div>
                </button>
              </div>
            </section>

            {/* Data Sources Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-center">
                      <Database className="w-4 h-4 text-slate-400" />
                    </div>
                    <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                      Data Sources ({connectedExchanges.length + unlinkedFiles.length})
                    </h2>
                  </div>
                  {(connectedExchanges.length > 0 || unlinkedFiles.length > 0) && (
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        onClick={selectAll}
                        className="text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                      >
                        Select All
                      </button>
                      <span className="text-slate-600">•</span>
                      <button
                        onClick={deselectAll}
                        className="text-slate-500 hover:text-slate-400 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowConnectModal(true)}
                  className="group text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1.5 font-medium hover:gap-2"
                >
                  <Plus className="w-3.5 h-3.5 transition-transform group-hover:rotate-90" />
                  Add
                </button>
              </div>

              {loadingExchanges || loadingFiles ? (
                <DataSourceSkeleton count={2} />
              ) : connectedExchanges.length === 0 && unlinkedFiles.length === 0 ? (
                <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-white/[0.03] shadow-lg shadow-emerald-500/5 backdrop-blur p-10 md:p-12 text-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10" />
                  <div className="absolute -top-20 -right-20 w-48 h-48 bg-emerald-500/10 blur-3xl rounded-full" />
                  <div className="relative">
                    <div className="w-16 h-16 bg-white/[0.05] border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Database className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-300 mb-2">
                      No data sources yet
                    </p>
                    <p className="text-xs text-slate-400 mb-6 max-w-md mx-auto">
                      Connect an exchange or upload CSV files to get started with powerful trading insights
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => setShowConnectModal(true)}
                        className="group px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 rounded-xl text-sm font-semibold transition-all duration-300 inline-flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-105"
                      >
                        <Plus className="w-4 h-4" />
                        Connect Exchange
                      </button>
                      <button
                        onClick={onConnectWithCSV}
                        className="group px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 rounded-xl text-sm font-semibold transition-all duration-300 inline-flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:scale-105"
                      >
                        <Upload className="w-4 h-4" />
                        Upload CSV
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Connected Exchanges */}
                  {connectedExchanges.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-slate-400 mb-3 px-1 uppercase tracking-wider">API Connections</h3>
                      <div className="space-y-2">
                        {connectedExchanges.map(exchange => {
                          const selected = isSourceSelected('exchange', exchange.id)
                          const linkedCount = getLinkedFilesCount(exchange.id)
                          return (
                            <div
                              key={exchange.id}
                              onClick={() => toggleSource('exchange', exchange.id)}
                              className={`group relative overflow-hidden rounded-3xl border ${
                                selected
                                  ? 'border-emerald-500/40 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
                                  : 'border-white/5 bg-white/[0.03] shadow-lg shadow-emerald-500/5'
                              } backdrop-blur p-4 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:border-white/10`}
                            >
                              {selected && (
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10" />
                              )}
                              <div className="relative">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                                      selected
                                        ? 'border-emerald-500 bg-emerald-500 shadow-lg shadow-emerald-500/30'
                                        : 'border-slate-600 bg-transparent group-hover:border-slate-500'
                                    }`}>
                                      {selected && <CheckSquare className="w-3 h-3 text-white" />}
                                    </div>
                                    <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center p-2">
                                      <ExchangeIcon exchange={exchange.exchange} size={20} className="w-full h-full" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1.5">
                                        <span className="text-sm font-semibold text-slate-200">{exchange.name}</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-xs">
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                          <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                          </span>
                                          <span className="text-emerald-400 font-medium">API</span>
                                        </div>
                                        {linkedCount > 0 && (
                                          <>
                                            <span className="text-slate-600">•</span>
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                                              <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                                              </span>
                                              <span className="text-cyan-400 font-medium">{linkedCount} CSV{linkedCount > 1 ? 's' : ''}</span>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={() => onViewAnalytics([{ type: 'exchange', id: exchange.id }])}
                                      className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 hover:border-emerald-500/50 rounded-xl text-xs font-semibold text-emerald-400 transition-all duration-300 hover:scale-105"
                                    >
                                      View
                                    </button>
                                    <button
                                      onClick={() => handleDeleteClick(exchange)}
                                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-300 border border-transparent hover:border-red-500/30"
                                      title="Disconnect exchange"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Uploaded CSV Files (Unlinked Only) */}
                  {unlinkedFiles.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-slate-400 mb-3 px-1 uppercase tracking-wider">Uploaded Files (Not Linked)</h3>
                      <div className="space-y-2">
                        {unlinkedFiles.map(file => {
                          const selected = isSourceSelected('csv', file.id)
                          return (
                            <div
                              key={file.id}
                              onClick={() => toggleSource('csv', file.id)}
                              className={`group relative overflow-hidden rounded-3xl border ${
                                selected
                                  ? 'border-emerald-500/40 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
                                  : 'border-white/5 bg-white/[0.03] shadow-lg shadow-blue-500/5'
                              } backdrop-blur p-4 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:border-white/10`}
                            >
                              {selected && (
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10" />
                              )}
                              <div className="relative">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-300 ${
                                      selected
                                        ? 'border-emerald-500 bg-emerald-500 shadow-lg shadow-emerald-500/30'
                                        : 'border-white/20 bg-transparent group-hover:border-white/30'
                                    }`}>
                                      {selected && <CheckSquare className="w-3 h-3 text-white" />}
                                    </div>
                                    <div className="w-12 h-12 bg-blue-500/20 border border-blue-500/30 rounded-xl flex items-center justify-center">
                                      <FileText className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                        <span className="text-sm font-semibold text-slate-200 truncate">
                                          {file.label || file.filename}
                                        </span>
                                        <span className="px-2 py-0.5 bg-white/[0.05] border border-white/10 text-slate-300 text-[10px] font-medium rounded-md">
                                          {file.account_type}
                                        </span>
                                        <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-medium rounded-md">
                                          CSV
                                        </span>
                                      </div>
                                      <p className="text-xs text-slate-400">
                                        {file.trades_count || 0} trades • {(file.size / 1024).toFixed(1)} KB
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {(connectedExchanges.length > 0 || unlinkedFiles.length > 0) && (
                    <div className="pt-3 flex items-center gap-3">
                      <button
                        onClick={handleViewSelected}
                        disabled={selectedSources.length === 0}
                        className={`group flex-1 py-3.5 rounded-3xl font-semibold text-sm transition-all duration-300 inline-flex items-center justify-center gap-2 ${
                          selectedSources.length > 0
                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-105'
                            : 'bg-white/[0.03] text-slate-500 cursor-not-allowed border border-white/5'
                        }`}
                      >
                        <Sparkles className="w-4 h-4" />
                        Analyze Selected ({selectedSources.length})
                      </button>
                      <button
                        onClick={() => onViewAnalytics()}
                        className="group flex-1 py-3.5 bg-white/[0.03] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 rounded-3xl font-semibold text-sm text-slate-200 hover:text-white transition-all duration-300 inline-flex items-center justify-center gap-2 hover:scale-105"
                      >
                        <BarChart3 className="w-4 h-4" />
                        View All Data
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
        </main>

      {/* Connect Exchange Modal */}
      <ConnectExchangeModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onSelectMethod={handleConnectionMethod}
      />

      {/* Exchange Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm && deletingExchange && deleteStats} onOpenChange={(open) => {
        if (!open) {
          setShowDeleteConfirm(false)
          setDeletingExchange(null)
          setDeleteStats(null)
          setDeleteLinkedCSVs(false)
        }
      }}>
        <AlertDialogContent
          className="max-w-md"
          onEscapeKeyDown={() => {
            setShowDeleteConfirm(false)
            setDeletingExchange(null)
            setDeleteStats(null)
            setDeleteLinkedCSVs(false)
          }}
          onPointerDownOutside={() => {
            setShowDeleteConfirm(false)
            setDeletingExchange(null)
            setDeleteStats(null)
            setDeleteLinkedCSVs(false)
          }}
        >
          <AlertDialogHeader>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-500/10 ring-4 ring-red-500/20">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div className="flex-1">
                <AlertDialogTitle className="text-xl">
                  Disconnect {deletingExchange?.name}?
                </AlertDialogTitle>
                <AlertDialogDescription className="mt-2">
                  This action will permanently delete data associated with this exchange connection.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          {/* Custom delete statistics content */}
          <div className="space-y-3 border-t border-slate-700/50 pt-4">
            <div className="flex items-center justify-between rounded-lg bg-slate-800/50 px-4 py-3">
              <span className="text-sm text-slate-300">API-imported trades</span>
              <span className="font-semibold text-red-400">{deleteStats?.apiTrades || 0} deleted</span>
            </div>

            {deleteStats?.csvFiles > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-amber-500/10 px-4 py-3">
                  <span className="text-sm text-slate-300">Linked CSV files</span>
                  <span className="font-semibold text-amber-400">{deleteStats.csvFiles} files ({deleteStats.csvTrades} trades)</span>
                </div>

                <label className="flex items-start gap-3 rounded-lg bg-slate-800/30 p-3 cursor-pointer hover:bg-slate-800/50 transition-colors border border-slate-700/30">
                  <input
                    type="checkbox"
                    checked={deleteLinkedCSVs}
                    onChange={(e) => setDeleteLinkedCSVs(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-600 text-red-500 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                  />
                  <span className="text-sm text-slate-300 leading-relaxed">
                    Also delete linked CSV files and their {deleteStats.csvTrades} trades
                  </span>
                </label>
              </div>
            )}
          </div>

          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500"
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </span>
              ) : (
                'Delete Connection'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

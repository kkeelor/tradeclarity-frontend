// app/analyze/components/Dashboard.js
'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Plus, Upload, Trash2, AlertCircle, Link as LinkIcon, FileText, Download, Play, LogOut, BarChart3, Sparkles, Database, CheckSquare, Square, Loader2, ChevronRight, Zap } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { toast } from 'sonner'
import { getMostCriticalInsight } from '../utils/performanceAnalogies'
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
import { DashboardStatsSkeleton, DataSourceSkeleton } from '@/app/components/LoadingSkeletons'
import ConnectExchangeModal from './ConnectExchangeModal'
import Sidebar from './Sidebar'

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
          icon: conn.exchange === 'binance' ? '🟡' : '🇮🇳',
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
            setCriticalInsight(insight)
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

    // Extract connection IDs and determine if we're viewing all or specific sources
    const exchangeIds = selectedSources
      .filter(s => s.type === 'exchange')
      .map(s => s.id)

    // For simplicity, if mixed or multiple sources selected, view all
    // In the future, this could be enhanced to filter by specific sources
    onViewAnalytics()
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex">
      <Sidebar
        activePage="dashboard"
        onDashboardClick={() => {}}
        onUploadClick={onConnectWithCSV}
        onMyPatternsClick={() => onViewAnalytics()}
        onSignOutClick={handleSignOut}
        isMyPatternsDisabled={connectedExchanges.length === 0 && !loadingExchanges}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-slate-800/50 backdrop-blur-xl bg-slate-900/30 sticky top-0 z-10">
          <div className="px-6 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-semibold text-slate-100">
                {getGreeting()}{user?.user_metadata?.name ? `, ${user.user_metadata.name.split(' ')[0]}` : ''}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                {user?.email}
                {tradesStats && tradesStats.totalTrades > 0 && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400">{tradesStats.totalTrades} trades analyzed</span>
                  </>
                )}
              </p>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-slate-900 font-semibold text-sm hover:shadow-lg hover:shadow-emerald-500/20 transition-all"
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
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Stats Overview & Smart Recommendations */}
            {loadingStats ? (
              <DashboardStatsSkeleton />
            ) : tradesStats && tradesStats.totalTrades > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Stats Card */}
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
                  <h3 className="text-xs font-medium text-slate-400 mb-3">Your Trading Overview</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Total Trades</span>
                      <span className="text-sm font-semibold text-slate-200">{tradesStats.totalTrades.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Exchanges Connected</span>
                      <span className="text-sm font-semibold text-slate-200">{connectedExchanges.length}</span>
                    </div>
                    {tradesStats.oldestTrade && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Data Range</span>
                        <span className="text-xs text-slate-400">
                          {new Date(tradesStats.oldestTrade).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - Present
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Smart Recommendations */}
                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                  <h3 className="text-xs font-medium text-emerald-400 mb-2">What's Next</h3>
                  {connectedExchanges.length === 1 ? (
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Add another exchange to compare performance across platforms and get deeper insights
                    </p>
                  ) : (
                    <p className="text-xs text-slate-300 leading-relaxed">
                      View your combined analytics to see patterns across all {connectedExchanges.length} exchanges and discover hidden opportunities
                    </p>
                  )}
                  <button
                    onClick={() => connectedExchanges.length === 1 ? setShowConnectModal(true) : onViewAnalytics()}
                    className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors inline-flex items-center gap-1"
                  >
                    {connectedExchanges.length === 1 ? 'Add Exchange' : 'View Combined Analytics'} →
                  </button>
                </div>
              </div>
            ) : (
              /* First-time user experience */
              <div className="bg-gradient-to-br from-slate-800/40 to-slate-800/20 border border-slate-700/30 rounded-xl p-5">
                <h3 className="text-sm font-medium text-slate-200 mb-2">
                  {user?.user_metadata?.name ? `Hey ${user.user_metadata.name.split(' ')[0]}` : 'Hey there'}, let's get started
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Connect your first exchange to unlock powerful insights into your trading patterns, performance metrics, and psychology.
                  Not ready to connect? Try the demo to see what's possible.
                </p>
              </div>
            )}

            {/* Compact Active Insight Banner */}
            {!loadingStats && criticalInsight && tradesStats && tradesStats.totalTrades > 0 && (
              <button
                onClick={onViewAnalytics}
                className={`w-full group flex items-center gap-3 px-4 py-3 rounded-lg border transition-all text-left ${
                  criticalInsight.type === 'weakness'
                    ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/40 hover:bg-red-500/10'
                    : 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/10'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  criticalInsight.type === 'weakness'
                    ? 'bg-red-500/10 text-red-400'
                    : 'bg-emerald-500/10 text-emerald-400'
                }`}>
                  {criticalInsight.type === 'weakness' ? <AlertCircle className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${
                      criticalInsight.type === 'weakness' ? 'text-red-400' : 'text-emerald-400'
                    }`}>
                      {criticalInsight.title}
                    </span>
                    {criticalInsight.impact && (
                      <span className="flex items-center gap-0.5">
                        {[...Array(criticalInsight.impact)].map((_, i) => (
                          <div key={i} className={`w-1 h-1 rounded-full ${
                            criticalInsight.type === 'weakness' ? 'bg-red-400/60' : 'bg-emerald-400/60'
                          }`} />
                        ))}
                      </span>
                    )}
                    <span className="text-xs text-slate-400 truncate">• {criticalInsight.message}</span>
                  </div>
                </div>

                <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-1 ${
                  criticalInsight.type === 'weakness' ? 'text-red-400/60' : 'text-emerald-400/60'
                }`} />
              </button>
            )}

            {/* Quick Actions */}
            <section>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setShowConnectModal(true)}
                  className="group relative p-4 bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/50 hover:border-emerald-500/30 rounded-xl transition-all text-left"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 bg-emerald-500/10 group-hover:bg-emerald-500/20 rounded-lg flex items-center justify-center transition-colors">
                      <LinkIcon className="w-4 h-4 text-emerald-400" />
                    </div>
                    <h3 className="text-sm font-medium text-slate-200">Connect Exchange</h3>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Link via API or CSV
                  </p>
                </button>

                <button
                  onClick={onConnectWithCSV}
                  className="group relative p-4 bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/50 hover:border-blue-500/30 rounded-xl transition-all text-left"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 bg-blue-500/10 group-hover:bg-blue-500/20 rounded-lg flex items-center justify-center transition-colors">
                      <Upload className="w-4 h-4 text-blue-400" />
                    </div>
                    <h3 className="text-sm font-medium text-slate-200">Upload CSV</h3>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Import trade history
                  </p>
                </button>

                <button
                  onClick={onTryDemo}
                  className="group relative p-4 bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/50 hover:border-purple-500/30 rounded-xl transition-all text-left"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 bg-purple-500/10 group-hover:bg-purple-500/20 rounded-lg flex items-center justify-center transition-colors">
                      <Play className="w-4 h-4 text-purple-400" />
                    </div>
                    <h3 className="text-sm font-medium text-slate-200">Try Demo</h3>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Explore sample data
                  </p>
                </button>
              </div>
            </section>

            {/* Data Sources Section */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Data Sources ({connectedExchanges.length + unlinkedFiles.length})
                  </h2>
                  {(connectedExchanges.length > 0 || unlinkedFiles.length > 0) && (
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        onClick={selectAll}
                        className="text-emerald-400 hover:text-emerald-300 transition-colors"
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
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>

              {loadingExchanges || loadingFiles ? (
                <DataSourceSkeleton count={2} />
              ) : connectedExchanges.length === 0 && unlinkedFiles.length === 0 ? (
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-8 text-center">
                  <div className="w-12 h-12 bg-slate-700/50 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Database className="w-5 h-5 text-slate-500" />
                  </div>
                  <p className="text-sm text-slate-400 mb-1">
                    No data sources yet
                  </p>
                  <p className="text-xs text-slate-500 mb-4">
                    Connect an exchange or upload CSV files to get started
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setShowConnectModal(true)}
                      className="px-4 py-2 bg-emerald-500/90 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-all inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Connect Exchange
                    </button>
                    <button
                      onClick={onConnectWithCSV}
                      className="px-4 py-2 bg-blue-500/90 hover:bg-blue-500 rounded-lg text-sm font-medium transition-all inline-flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload CSV
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Connected Exchanges */}
                  {connectedExchanges.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium text-slate-500 mb-2 px-1">API Connections</h3>
                      <div className="space-y-2">
                        {connectedExchanges.map(exchange => {
                          const selected = isSourceSelected('exchange', exchange.id)
                          const linkedCount = getLinkedFilesCount(exchange.id)
                          return (
                            <div
                              key={exchange.id}
                              onClick={() => toggleSource('exchange', exchange.id)}
                              className={`group bg-slate-800/40 border rounded-xl p-4 transition-all cursor-pointer ${
                                selected
                                  ? 'border-emerald-500/50 bg-emerald-500/5'
                                  : 'border-slate-700/50 hover:border-slate-600/50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                    selected
                                      ? 'border-emerald-500 bg-emerald-500'
                                      : 'border-slate-600 bg-transparent'
                                  }`}>
                                    {selected && <CheckSquare className="w-3 h-3 text-white" />}
                                  </div>
                                  <div className="w-10 h-10 bg-slate-700/50 rounded-lg flex items-center justify-center text-xl">
                                    {exchange.icon}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm font-medium text-slate-200">{exchange.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                      <div className="flex items-center gap-1.5">
                                        <span className="relative flex h-2 w-2">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                        <span className="text-slate-400">API</span>
                                      </div>
                                      {linkedCount > 0 && (
                                        <>
                                          <span className="text-slate-600">•</span>
                                          <div className="flex items-center gap-1.5">
                                            <span className="relative flex h-2 w-2">
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                            </span>
                                            <span className="text-slate-400">{linkedCount} CSV file{linkedCount > 1 ? 's' : ''} linked</span>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => onViewAnalytics(exchange.id, exchange.name.toLowerCase())}
                                    className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/30 rounded-lg text-xs font-medium text-emerald-400 transition-all"
                                  >
                                    View
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClick(exchange)}
                                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-colors"
                                    title="Disconnect exchange"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
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
                      <h3 className="text-xs font-medium text-slate-500 mb-2 px-1">Uploaded Files (Not Linked)</h3>
                      <div className="space-y-2">
                        {unlinkedFiles.map(file => {
                          const selected = isSourceSelected('csv', file.id)
                          return (
                            <div
                              key={file.id}
                              onClick={() => toggleSource('csv', file.id)}
                              className={`group bg-slate-800/40 border rounded-xl p-4 transition-all cursor-pointer ${
                                selected
                                  ? 'border-emerald-500/50 bg-emerald-500/5'
                                  : 'border-slate-700/50 hover:border-slate-600/50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                    selected
                                      ? 'border-emerald-500 bg-emerald-500'
                                      : 'border-slate-600 bg-transparent'
                                  }`}>
                                    {selected && <CheckSquare className="w-3 h-3 text-white" />}
                                  </div>
                                  <div className="w-10 h-10 bg-slate-700/50 rounded-lg flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-blue-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-slate-200 truncate">
                                        {file.label || file.filename}
                                      </span>
                                      <span className="px-2 py-0.5 bg-slate-700/50 text-slate-400 text-[10px] rounded">
                                        {file.account_type}
                                      </span>
                                      <span className="text-xs text-slate-500">CSV</span>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                      {file.trades_count || 0} trades • {(file.size / 1024).toFixed(1)} KB
                                    </p>
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
                    <div className="pt-2 flex items-center gap-3">
                      <button
                        onClick={handleViewSelected}
                        disabled={selectedSources.length === 0}
                        className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all inline-flex items-center justify-center gap-2 ${
                          selectedSources.length > 0
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                            : 'bg-slate-700/30 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Sparkles className="w-4 h-4" />
                        Analyze Selected ({selectedSources.length})
                      </button>
                      <button
                        onClick={() => onViewAnalytics()}
                        className="flex-1 py-3 bg-slate-700/50 hover:bg-slate-700/70 rounded-xl font-medium text-sm text-slate-300 hover:text-white transition-all inline-flex items-center justify-center gap-2"
                      >
                        <BarChart3 className="w-4 h-4" />
                        View All Data
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

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

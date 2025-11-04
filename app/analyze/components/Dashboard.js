// app/analyze/components/Dashboard.js
'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { TrendingUp, Plus, Upload, Trash2, AlertCircle, Link as LinkIcon, FileText, Download, Play, LogOut, BarChart3, Sparkles, Database, CheckSquare, Square, Loader2, ChevronRight, Zap, Brain, Clock, DollarSign, PieChart, TrendingDown, Target, Lightbulb, LayoutDashboard, Tag } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { toast } from 'sonner'
import ThemeToggle from '@/app/components/ThemeToggle'
import { getMostCriticalInsight, getAllInsights, generatePerformanceAnalogies } from '../utils/performanceAnalogies'
import { generateValueFirstInsights } from '../utils/insights/valueFirstInsights'
import { prioritizeInsights, enhanceInsightForDisplay } from '../utils/insights/insightsPrioritizationEngine'
import { analyzeDrawdowns } from '../utils/drawdownAnalysis'
import { analyzeTimeBasedPerformance } from '../utils/timeBasedAnalysis'
import { analyzeSymbols } from '../utils/symbolAnalysis'
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
import Sidebar from './Sidebar'
import Footer from '../../components/Footer'

/**
 * Generate combined insights from balance sheet (overview) and behavioral tabs
 * Replicates the same logic used in AnalyticsView OverviewTab
 * Returns up to 5 insights mixing improvements, strengths, and behavioral insights
 */
function generateCombinedInsights(analytics, psychology, spotTrades, futuresIncome) {
  const allAvailableInsights = []
  const currSymbol = '$' // Default, can be improved later
  
  try {
    const allTrades = analytics.allTrades || []
    
    // 1. Value-first insights (already prioritized)
    const valueFirstInsights = generateValueFirstInsights(analytics, psychology, allTrades)
    if (valueFirstInsights?.allScored) {
      allAvailableInsights.push(...valueFirstInsights.allScored.map(insight => ({
        ...insight,
        source: 'value-first'
      })))
    } else if (valueFirstInsights?.all) {
      allAvailableInsights.push(...valueFirstInsights.all.map(insight => ({
        ...insight,
        source: 'value-first'
      })))
    }
    
    // 2. Drawdown insights
    const drawdownAnalysis = analyzeDrawdowns(allTrades)
    if (drawdownAnalysis?.worstDrawdowns && drawdownAnalysis.worstDrawdowns.length > 0) {
      drawdownAnalysis.worstDrawdowns.slice(0, 2).forEach((worst, idx) => {
        if (worst.drawdownPercent < -5) {
          allAvailableInsights.push({
            type: 'weakness',
            category: 'risk_management',
            title: idx === 0 
              ? `Worst Drawdown: ${Math.abs(worst.drawdownPercent).toFixed(1)}%`
              : `Drawdown: ${Math.abs(worst.drawdownPercent).toFixed(1)}%`,
            message: `Lost ${currSymbol}${Math.abs(worst.drawdownAmount).toFixed(0)} over ${worst.durationDays} days`,
            summary: worst.recovered 
              ? `Recovered in ${worst.recoveryDays} days` 
              : 'Still in drawdown',
            potentialSavings: Math.abs(worst.drawdownAmount) * 0.2,
            impact: worst.drawdownPercent < -20 ? 4 : worst.drawdownPercent < -10 ? 3 : 2,
            source: 'drawdown'
          })
        }
      })
    }
    
    // 3. Time-based insights
    const timeAnalysis = analyzeTimeBasedPerformance(allTrades)
    if (timeAnalysis?.bestWorstTimes) {
      const { worstHour } = timeAnalysis.bestWorstTimes
      if (worstHour && worstHour.trades >= 5 && worstHour.totalPnL < 0) {
        allAvailableInsights.push({
          type: 'weakness',
          category: 'timing',
          title: `Avoid ${worstHour.label}`,
          message: `Only ${worstHour.winRate.toFixed(0)}% win rate, losing ${currSymbol}${Math.abs(worstHour.avgPnL).toFixed(2)} per trade`,
          summary: `Consider avoiding trading during ${worstHour.label}`,
          potentialSavings: Math.abs(worstHour.totalPnL) * 0.5,
          impact: worstHour.winRate < 40 ? 3 : 2,
          source: 'timing-analysis'
        })
      }
    }
    
    // 4. Symbol insights
    const symbolAnalysis = analyzeSymbols(allTrades)
    if (symbolAnalysis?.recommendations && symbolAnalysis.recommendations.length > 0) {
      symbolAnalysis.recommendations.forEach(rec => {
        if (rec.type === 'avoid' && rec.symbols.length > 0) {
          allAvailableInsights.push({
            type: 'weakness',
            category: 'opportunity',
            title: `Avoid ${rec.symbols.join(', ')}`,
            message: rec.message,
            summary: `These symbols consistently lose money`,
            potentialSavings: rec.details?.reduce((sum, s) => sum + Math.abs(s.totalPnL || 0), 0) || 0,
            impact: rec.severity === 'high' ? 3 : 2,
            source: 'symbol'
          })
        }
      })
    }
    
    // 5. Performance insights (from analogies)
    const analogies = generatePerformanceAnalogies(analytics)
    if (analogies?.hourlyRate && analogies.hourlyRate.rate < -10) {
      const hourlyRate = analogies.hourlyRate.rate
      allAvailableInsights.push({
        type: 'weakness',
        category: 'performance',
        title: 'Negative Hourly Rate',
        message: `You're losing ${currSymbol}${Math.abs(hourlyRate).toFixed(2)}/hour while trading`,
        summary: `Review your strategy - this suggests fundamental issues`,
        potentialSavings: Math.abs(hourlyRate * analogies.hourlyRate.totalHours) * 0.5,
        impact: hourlyRate < -20 ? 4 : 3,
        source: 'analogy'
      })
    }
    
    if (analytics.profitFactor < 1) {
      allAvailableInsights.push({
        type: 'weakness',
        category: 'performance',
        title: 'Profit Factor Below 1.0',
        message: `Your profit factor of ${analytics.profitFactor.toFixed(2)}x means you're losing more than you win`,
        summary: 'Critical: This strategy is not profitable long-term',
        potentialSavings: analytics.totalPnL < 0 ? Math.abs(analytics.totalPnL) * 0.5 : 0,
        impact: 4,
        source: 'analogy'
      })
    }
    
    // 6. Psychology insights from behavioral analysis
    if (psychology?.weaknesses && psychology.weaknesses.length > 0) {
      psychology.weaknesses.forEach(weakness => {
        if (weakness.severity === 'high' || weakness.impact >= 3) {
          allAvailableInsights.push({
            type: 'weakness',
            category: 'behavioral',
            title: weakness.title || 'Behavioral Weakness',
            message: weakness.message,
            summary: weakness.message,
            impact: weakness.impact || 3,
            source: 'psychology'
          })
        }
      })
    }
    
    // Now prioritize and enhance all insights (same as balance sheet)
    const prioritizedInsights = prioritizeInsights(allAvailableInsights, analytics)
    let sortedInsights = prioritizedInsights.allScored.map(insight => 
      enhanceInsightForDisplay(insight, analytics)
    )
    
    // Separate into improvements (weaknesses + opportunities) and strengths
    const weaknesses = sortedInsights.filter(i => i.type === 'weakness')
    const opportunities = sortedInsights.filter(i => i.type === 'opportunity' || i.type === 'recommendation')
    const strengths = sortedInsights.filter(i => i.type === 'strength')
    
    // Collect all improvements (weaknesses + opportunities) - prioritize these
    const improvements = [...weaknesses, ...opportunities]
    
    // Get meaningful strengths
    const meaningfulStrengths = strengths.filter(s => 
      s.potentialSavings > 0 || 
      (s.action && s.action.steps && s.action.steps.length > 0) ||
      s.score >= 65 ||
      s.impact >= 3
    )
    
    // Combine and prioritize: weaknesses/opportunities first, then strengths
    // Limit to 5 total, prioritizing high-impact improvements
    const combined = [...improvements, ...meaningfulStrengths]
    
    // Sort by: weaknesses first, then by impact/score
    const sorted = combined.sort((a, b) => {
      // Weaknesses get priority
      if (a.type === 'weakness' && b.type !== 'weakness') return -1
      if (a.type !== 'weakness' && b.type === 'weakness') return 1
      // Then by impact or score
      return (b.impact || b.score || 0) - (a.impact || a.score || 0)
    })
    
    return sorted.slice(0, 5)
  } catch (error) {
    console.error('Error generating combined insights:', error)
    return []
  }
}

export default function Dashboard({ onConnectExchange, onTryDemo, onConnectWithCSV, onViewAnalytics }) {
  const router = useRouter()
  const pathname = usePathname()
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

  // Auto-rotate through insights every 6 seconds - highlights active insight
  useEffect(() => {
    if (!allInsights || allInsights.length <= 1) return // Don't rotate if there's only one or no insights

    const interval = setInterval(() => {
      setCurrentInsightIndex((prev) => (prev + 1) % allInsights.length)
    }, 6000) // Change active insight every 6 seconds

    return () => clearInterval(interval)
  }, [allInsights])
  
  // Auto-scroll to active insight when it changes
  useEffect(() => {
    if (allInsights.length <= 1) return
    
    const insightElement = document.querySelector(`[data-insight-index="${currentInsightIndex}"]`)
    if (insightElement) {
      insightElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [currentInsightIndex, allInsights.length])

  const fetchConnectedExchanges = async () => {
    const startTime = Date.now()
    try {
      console.log('?? [Dashboard] Fetching connected exchanges...')
      const response = await fetch('/api/exchange/list')
      const data = await response.json()

      console.log('?? [Dashboard] API response:', data)

      if (data.success) {
        const formatted = data.connections.map(conn => ({
          id: conn.id,
          name: conn.exchange.charAt(0).toUpperCase() + conn.exchange.slice(1),
          exchange: conn.exchange,
          connectedAt: conn.created_at,
          lastSynced: conn.last_synced || conn.updated_at || conn.created_at
        }))
        console.log('? [Dashboard] Formatted exchanges:', formatted)
        setConnectedExchanges(formatted)
      } else {
        console.log('? [Dashboard] API returned error:', data.error)
      }
    } catch (error) {
      console.error('? [Dashboard] Error fetching exchanges:', error)
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

        // Analyze data to get critical insight - only if we have actual trades
        const hasTrades = (data.spotTrades && data.spotTrades.length > 0) || 
                          (data.futuresIncome && data.futuresIncome.length > 0) ||
                          (data.futuresUserTrades && data.futuresUserTrades.length > 0)
        
        if (hasTrades) {
          try {
            // analyzeData is now async due to currency conversion
            const analytics = await analyzeData(data)
            const psychology = analytics.psychology || {}
            const insight = getMostCriticalInsight(analytics, psychology)
            
            // Generate combined insights from balance sheet and behavioral tabs
            const combinedInsights = generateCombinedInsights(analytics, psychology, data.spotTrades || [], data.futuresIncome || [])
            
            setCriticalInsight(insight)
            setAllInsights(combinedInsights)
            setCurrentInsightIndex(0) // Reset to first insight
          } catch (error) {
            console.error('Error analyzing trades for insight:', error)
          }
        } else {
          // No trades - clear insights
          setCriticalInsight(null)
          setAllInsights([])
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

    console.log('?? Viewing analytics for selected sources:', selectedSources)

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
    console.log('?? Sign out button clicked')
    const timeoutId = setTimeout(() => {
      console.log('?? SignOut timeout - forcing reload anyway')
      window.location.href = '/'
    }, 3000)

    try {
      console.log('?? Calling server-side sign out API...')
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
      })
      console.log('?? API response status:', response.status)
      const data = await response.json()
      console.log('?? API response data:', data)
      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error('?? Sign out error:', data.error)
      } else {
        console.log('?? Sign out successful!')
      }

      console.log('?? Redirecting to landing page...')
      window.location.href = '/'
    } catch (error) {
      console.error('?? Sign out catch error:', error)
      clearTimeout(timeoutId)
      window.location.href = '/'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex">
      {/* Mobile-only Sidebar */}
      <div className="md:hidden">
        <Sidebar
          activePage="dashboard"
          onDashboardClick={() => {}}
          onUploadClick={() => router.push('/data')}
          onMyPatternsClick={() => {
            if (connectedExchanges.length > 0 || !loadingExchanges) {
              onViewAnalytics()
            }
          }}
          onSignOutClick={handleSignOut}
          isMyPatternsDisabled={connectedExchanges.length === 0 && !loadingExchanges}
          isDemoMode={false}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-white/5 bg-slate-950/70 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-2 sm:gap-4 px-2 sm:px-4 py-3 sm:py-4 pl-14 md:pl-4">
            <div className="flex items-center gap-1 sm:gap-2 md:gap-4 lg:gap-8 min-w-0 flex-1">
              <button
                onClick={() => window.location.href = '/'}
                className="flex items-center gap-1 sm:gap-2 rounded-full border border-white/5 bg-white/[0.03] px-2 sm:px-3 py-1 text-sm font-semibold text-white/90 transition-all duration-300 hover:border-emerald-400/40 hover:bg-emerald-400/10 hover:text-white flex-shrink-0"
              >
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-300" />
                <span className="hidden sm:inline">TradeClarity</span>
              </button>

              <nav className="hidden md:flex items-center gap-1 md:gap-2 overflow-x-auto scrollbar-hide min-w-0">
                <button
                  onClick={() => router.push('/dashboard')}
                  className={`group inline-flex items-center justify-center gap-1 md:gap-2 rounded-full px-2 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs font-medium transition-all duration-300 flex-shrink-0 whitespace-nowrap ${
                    pathname === '/dashboard' || pathname?.startsWith('/dashboard')
                      ? 'text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  style={{ minHeight: '32px', minWidth: '32px' }}
                >
                  <LayoutDashboard className={`h-3 w-3 md:h-4 md:w-4 transition-colors flex-shrink-0 ${
                    pathname === '/dashboard' || pathname?.startsWith('/dashboard')
                      ? 'text-emerald-300'
                      : 'text-slate-500 group-hover:text-emerald-300'
                  }`} />
                  <span className="hidden sm:inline">Dashboard</span>
                </button>
                <button
                  onClick={() => router.push('/data')}
                  className={`group inline-flex items-center justify-center gap-1 md:gap-2 rounded-full px-2 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs font-medium transition-all duration-300 flex-shrink-0 whitespace-nowrap ${
                    pathname === '/data'
                      ? 'text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  style={{ minHeight: '32px', minWidth: '32px' }}
                >
                  <Database className={`h-3 w-3 md:h-4 md:w-4 transition-colors flex-shrink-0 ${
                    pathname === '/data'
                      ? 'text-emerald-300'
                      : 'text-slate-500 group-hover:text-emerald-300'
                  }`} />
                  <span className="hidden sm:inline">Your Data</span>
                </button>
                <button
                  onClick={() => onViewAnalytics()}
                  disabled={connectedExchanges.length === 0 && !loadingExchanges}
                  className={`group inline-flex items-center justify-center gap-1 md:gap-2 rounded-full px-2 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs font-medium transition-all duration-300 flex-shrink-0 whitespace-nowrap ${
                    connectedExchanges.length === 0 && !loadingExchanges
                      ? 'text-slate-500 cursor-not-allowed'
                      : pathname === '/analyze' || pathname?.startsWith('/analyze')
                      ? 'text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  style={{ minHeight: '32px', minWidth: '32px' }}
                >
                  <BarChart3 className={`h-3 w-3 md:h-4 md:w-4 transition-colors flex-shrink-0 ${
                    connectedExchanges.length === 0 && !loadingExchanges
                      ? 'text-slate-600'
                      : pathname === '/analyze' || pathname?.startsWith('/analyze')
                      ? 'text-emerald-300'
                      : 'text-slate-500 group-hover:text-emerald-300'
                  }`} />
                  <span className="hidden sm:inline">Analytics</span>
                </button>
                <button
                  onClick={() => router.push('/pricing')}
                  className={`group inline-flex items-center justify-center gap-1 md:gap-2 rounded-full px-2 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs font-medium transition-all duration-300 flex-shrink-0 whitespace-nowrap ${
                    pathname === '/pricing'
                      ? 'text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  style={{ minHeight: '32px', minWidth: '32px' }}
                >
                  <Tag className={`h-3 w-3 md:h-4 md:w-4 transition-colors flex-shrink-0 ${
                    pathname === '/pricing'
                      ? 'text-emerald-300'
                      : 'text-slate-500 group-hover:text-emerald-300'
                  }`} />
                  <span className="hidden sm:inline">Pricing</span>
                </button>
              </nav>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0">
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
        <main className="relative mx-auto w-full max-w-[1400px] px-4 sm:px-6 pb-16 pt-10 space-y-10">
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
                  <span className="text-slate-600">?</span>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 px-1">
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
                        <span className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                          {connectedExchanges.length}
                          {connectedExchanges.length > 0 && (
                            <span className="text-slate-500 font-normal ml-1 flex items-center">
                              (
                              {connectedExchanges.map((exchange, index) => (
                                <span key={exchange.id} className="inline-flex items-center">
                                  <ExchangeIcon exchange={exchange.exchange} size={12} className="w-3 h-3" />
                                  {index < connectedExchanges.length - 1 && <span className="mx-0.5">,</span>}
                                </span>
                              ))}
                              )
                            </span>
                          )}
                        </span>
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
                    
                    {tradesStats && tradesStats.totalTrades > 0 ? (
                      <div className="space-y-4">
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Explore deeper insights into your trading patterns:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Overview CTA */}
                          <button
                            onClick={() => router.push('/analyze?tab=overview')}
                            className="text-left text-xs text-slate-300 hover:text-emerald-300 font-medium transition-colors duration-200 flex items-start gap-2 p-2 rounded-lg hover:bg-white/5"
                          >
                            <BarChart3 className="w-4 h-4 text-emerald-400/70 flex-shrink-0 mt-0.5" />
                            <span>View complete trading overview</span>
                          </button>
                          
                          {/* Spot Trading CTA */}
                          {tradesStats.spotTrades > 0 && (
                            <button
                              onClick={() => router.push('/analyze?tab=spot')}
                              className="text-left text-xs text-slate-300 hover:text-emerald-300 font-medium transition-colors duration-200 flex items-start gap-2 p-2 rounded-lg hover:bg-white/5"
                            >
                              <PieChart className="w-4 h-4 text-emerald-400/70 flex-shrink-0 mt-0.5" />
                              <span>Analyze {tradesStats.spotTrades} spot trades</span>
                            </button>
                          )}
                          
                          {/* Futures Trading CTA */}
                          {(tradesStats.futuresIncome > 0 || tradesStats.futuresPositions > 0) && (
                            <button
                              onClick={() => router.push('/analyze?tab=futures')}
                              className="text-left text-xs text-slate-300 hover:text-emerald-300 font-medium transition-colors duration-200 flex items-start gap-2 p-2 rounded-lg hover:bg-white/5"
                            >
                              <Zap className="w-4 h-4 text-emerald-400/70 flex-shrink-0 mt-0.5" />
                              <span>Review futures performance</span>
                            </button>
                          )}
                          
                          {/* Time-based Analysis CTA */}
                          {tradesStats.totalTrades > 10 && (
                            <button
                              onClick={() => router.push('/analyze?tab=overview')}
                              className="text-left text-xs text-slate-300 hover:text-emerald-300 font-medium transition-colors duration-200 flex items-start gap-2 p-2 rounded-lg hover:bg-white/5"
                            >
                              <Clock className="w-4 h-4 text-emerald-400/70 flex-shrink-0 mt-0.5" />
                              <span>Discover peak trading hours</span>
                            </button>
                          )}
                          
                          {/* Symbol Analysis CTA */}
                          {tradesStats.spotTrades > 5 && (
                            <button
                              onClick={() => router.push('/analyze?tab=spot')}
                              className="text-left text-xs text-slate-300 hover:text-emerald-300 font-medium transition-colors duration-200 flex items-start gap-2 p-2 rounded-lg hover:bg-white/5"
                            >
                              <TrendingUp className="w-4 h-4 text-emerald-400/70 flex-shrink-0 mt-0.5" />
                              <span>Find most profitable coins</span>
                            </button>
                          )}
                          
                          {/* Behavioral CTA */}
                          {criticalInsight && (
                            <button
                              onClick={() => router.push('/analyze?tab=behavioral')}
                              className="text-left text-xs text-slate-300 hover:text-emerald-300 font-medium transition-colors duration-200 flex items-start gap-2 p-2 rounded-lg hover:bg-white/5"
                            >
                              <Brain className="w-4 h-4 text-emerald-400/70 flex-shrink-0 mt-0.5" />
                              <span>Discover trading psychology score</span>
                            </button>
                          )}
                          
                          {/* Fee Analysis CTA */}
                          {criticalInsight && tradesStats.totalTrades > 20 && (
                            <button
                              onClick={() => router.push('/analyze?tab=behavioral')}
                              className="text-left text-xs text-slate-300 hover:text-emerald-300 font-medium transition-colors duration-200 flex items-start gap-2 p-2 rounded-lg hover:bg-white/5"
                            >
                              <DollarSign className="w-4 h-4 text-emerald-400/70 flex-shrink-0 mt-0.5" />
                              <span>Optimize trading fees</span>
                            </button>
                          )}
                          
                          {/* Combined Analytics CTA */}
                          {connectedExchanges.length > 1 && (
                            <button
                              onClick={() => onViewAnalytics()}
                              className="text-left text-xs text-slate-300 hover:text-emerald-300 font-medium transition-colors duration-200 flex items-start gap-2 p-2 rounded-lg hover:bg-white/5"
                            >
                              <LinkIcon className="w-4 h-4 text-emerald-400/70 flex-shrink-0 mt-0.5" />
                              <span>Compare all {connectedExchanges.length} exchanges</span>
                            </button>
                          )}
                          
                          {/* Add Exchange CTA */}
                          {connectedExchanges.length === 1 && (
                            <button
                              onClick={() => setShowConnectModal(true)}
                              className="text-left text-xs text-slate-300 hover:text-emerald-300 font-medium transition-colors duration-200 flex items-start gap-2 p-2 rounded-lg hover:bg-white/5"
                            >
                              <Plus className="w-4 h-4 text-emerald-400/70 flex-shrink-0 mt-0.5" />
                              <span>Add another exchange</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : connectedExchanges.length === 1 ? (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-300 leading-relaxed mb-2">
                          Add another exchange to compare performance across platforms and get deeper insights
                        </p>
                        <button
                          onClick={() => setShowConnectModal(true)}
                          className="group/btn text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-all duration-300 inline-flex items-center gap-1.5 hover:gap-2"
                        >
                          Add Exchange
                          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-300 leading-relaxed mb-2">
                          View your combined analytics to see patterns across all {connectedExchanges.length} exchanges and discover hidden opportunities
                        </p>
                        <button
                          onClick={() => onViewAnalytics()}
                          className="group/btn text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-all duration-300 inline-flex items-center gap-1.5 hover:gap-2"
                        >
                          View Analytics
                          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* First-time user experience - Enhanced */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                {/* Main CTA Card */}
                <div className="lg:col-span-2 relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent shadow-lg shadow-emerald-500/10 backdrop-blur p-6 md:p-8">
                  <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/20 blur-3xl rounded-full opacity-50" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h2 className="text-lg md:text-xl font-semibold text-slate-100">
                          {user?.user_metadata?.name ? `Welcome, ${user.user_metadata.name.split(' ')[0]}!` : 'Welcome to TradeClarity!'}
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">Your trading blind spots, finally revealed</p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-slate-300 leading-relaxed mb-6">
                      Connect your exchange or upload CSV files to unlock powerful insights into your trading patterns, 
                      psychology, and hidden opportunities. See what's really affecting your performance.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 mb-6">
                      <button
                        onClick={() => setShowConnectModal(true)}
                        className="group flex-1 px-5 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 rounded-xl text-sm font-semibold text-white transition-all duration-300 inline-flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-105"
                      >
                        <LinkIcon className="w-4 h-4" />
                        Connect Exchange
                        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </button>
                      <button
                        onClick={() => router.push('/data')}
                        className="group flex-1 px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 rounded-xl text-sm font-semibold text-white transition-all duration-300 inline-flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:scale-105"
                      >
                        <Upload className="w-4 h-4" />
                        Upload CSV
                        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </button>
                      <button
                        onClick={onTryDemo}
                        className="group px-5 py-3 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 rounded-xl text-sm font-semibold text-slate-300 hover:text-white transition-all duration-300 inline-flex items-center justify-center gap-2 hover:scale-105"
                      >
                        <Play className="w-4 h-4" />
                        Try Demo
                      </button>
                    </div>

                    {/* Value Props */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-white/10">
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Brain className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-200">Psychology Insights</div>
                          <div className="text-[10px] text-slate-400">Discover your hidden patterns</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-200">Performance Analysis</div>
                          <div className="text-[10px] text-slate-400">Find what's really working</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Lightbulb className="w-3.5 h-3.5 text-purple-400" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-200">Actionable Tips</div>
                          <div className="text-[10px] text-slate-400">Get personalized recommendations</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Start Guide */}
                <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-white/[0.03] shadow-lg shadow-emerald-500/5 backdrop-blur p-5 md:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-slate-200">Quick Start</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-emerald-400">1</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-slate-200 mb-1">Connect or Upload</div>
                        <div className="text-[11px] text-slate-400 leading-relaxed">
                          Link your exchange via API or upload CSV files with your trade history
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-blue-400">2</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-slate-200 mb-1">Analyze Your Data</div>
                        <div className="text-[11px] text-slate-400 leading-relaxed">
                          We'll analyze your trades and identify patterns you never knew existed
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-purple-400">3</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-slate-200 mb-1">Discover Insights</div>
                        <div className="text-[11px] text-slate-400 leading-relaxed">
                          Get actionable recommendations to improve your trading performance
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-white/10">
                    <button
                      onClick={onTryDemo}
                      className="w-full text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors inline-flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Watch demo walkthrough
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Trading Insights Section - Horizontal scrolling row */}
            {!loadingStats && allInsights.length > 0 && tradesStats && tradesStats.totalTrades > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Trading Insights</h3>
                  <span className="text-xs text-slate-500">({allInsights.length})</span>
                </div>
                
                {/* Horizontal scrolling container with insights and button */}
                <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
                  {/* Insights row - up to 5 insights */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {allInsights.map((insight, index) => {
                      const isWeakness = insight.type === 'weakness'
                      const isOpportunity = insight.type === 'opportunity' || insight.type === 'recommendation'
                      const isStrength = insight.type === 'strength'
                      const isActive = index === currentInsightIndex
                      
                      // Color scheme matching balance sheet: amber for weaknesses, orange for opportunities, emerald for strengths
                      const colorClasses = isWeakness
                        ? 'border-amber-500/20 bg-amber-500/5 shadow-lg shadow-amber-500/5'
                        : isOpportunity
                        ? 'border-orange-500/20 bg-orange-500/5 shadow-lg shadow-orange-500/5'
                        : 'border-emerald-500/20 bg-emerald-500/5 shadow-lg shadow-emerald-500/5'
                      
                      const textColor = isWeakness
                        ? 'text-amber-300'
                        : isOpportunity
                        ? 'text-orange-300'
                        : 'text-emerald-300'
                      
                      const iconBgColor = isWeakness
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        : isOpportunity
                        ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      
                      const dotColor = isWeakness
                        ? 'bg-amber-400/70'
                        : isOpportunity
                        ? 'bg-orange-400/70'
                        : 'bg-emerald-400/70'
                      
                      const gradientColor = isWeakness
                        ? 'from-amber-500/10 via-transparent to-orange-500/10'
                        : isOpportunity
                        ? 'from-orange-500/10 via-transparent to-amber-500/10'
                        : 'from-emerald-500/10 via-transparent to-cyan-500/10'
                      
                      return (
                        <div
                          key={index}
                          data-insight-index={index}
                          className={`group relative overflow-hidden flex items-center gap-2 px-3 py-2.5 rounded-xl border backdrop-blur transition-all duration-300 flex-shrink-0 min-w-[280px] max-w-[320px] ${colorClasses} ${
                            isActive ? 'ring-2 ring-emerald-500/30 scale-[1.02]' : ''
                          }`}
                        >
                          <div className={`absolute inset-0 bg-gradient-to-br transition-opacity duration-300 ${gradientColor}`} />
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 backdrop-blur-sm border transition-all duration-300 ${iconBgColor}`}>
                            {isWeakness ? <AlertCircle className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                          </div>

                          <div className="flex-1 min-w-0 relative">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-xs font-semibold transition-colors duration-300 ${textColor}`}>
                                {insight.title}
                              </span>
                              {insight.impact && (
                                <span className="flex items-center gap-0.5">
                                  {[...Array(Math.min(insight.impact, 3))].map((_, i) => (
                                    <div key={i} className={`w-1 h-1 rounded-full transition-colors duration-300 ${dotColor}`} />
                                  ))}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-300 truncate block mt-0.5">{insight.message || insight.summary}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* View Analytics button - Fixed on the right */}
                  <button
                    onClick={onViewAnalytics}
                    className="group flex-shrink-0 px-4 py-2.5 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 hover:from-emerald-500/20 hover:to-emerald-600/20 border border-emerald-500/30 hover:border-emerald-500/50 rounded-xl text-xs font-semibold text-emerald-300 hover:text-emerald-200 transition-all duration-300 inline-flex items-center gap-2 hover:scale-[1.02] whitespace-nowrap"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Explore All</span>
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>

                {/* Clickable dots indicator */}
                {allInsights.length > 1 && (
                  <div className="flex items-center justify-center gap-1.5 pt-1">
                    {allInsights.map((insight, index) => {
                      const isActive = index === currentInsightIndex
                      const isWeakness = insight?.type === 'weakness'
                      const isOpportunity = insight?.type === 'opportunity' || insight?.type === 'recommendation'
                      
                      return (
                        <button
                          key={index}
                          onClick={() => setCurrentInsightIndex(index)}
                          className={`rounded-full transition-all duration-300 hover:scale-125 cursor-pointer ${
                            isActive
                              ? isWeakness
                                ? 'bg-amber-400 w-2.5 h-2.5'
                                : isOpportunity
                                ? 'bg-orange-400 w-2.5 h-2.5'
                                : 'bg-emerald-400 w-2.5 h-2.5'
                              : 'bg-slate-600 w-1.5 h-1.5 hover:bg-slate-500'
                          }`}
                          aria-label={`View insight ${index + 1}: ${insight.title}`}
                          title={insight.title}
                        />
                      )
                    })}
                  </div>
                )}
              </section>
            )}

            {/* Quick Actions - Only show for users with data */}
            {tradesStats && tradesStats.totalTrades > 0 && (
              <section>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 px-1">
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
                  onClick={() => router.push('/data')}
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
            )}

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
                      <span className="text-slate-600">?</span>
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
                        onClick={() => router.push('/data')}
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
                                            <span className="text-slate-600">?</span>
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
                                        {file.trades_count || 0} trades ? {(file.size / 1024).toFixed(1)} KB
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
                        View Analytics
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
        </main>

        {/* Footer */}
        <Footer />

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
    </div>
  )
}

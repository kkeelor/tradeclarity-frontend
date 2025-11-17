// app/analyze/components/Dashboard.js
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { TrendingUp, Plus, Upload, Trash2, AlertCircle, Link as LinkIcon, FileText, Download, Play, LogOut, BarChart3, Sparkles, Database, CheckSquare, Square, Loader2, ChevronRight, Zap, Brain, Clock, DollarSign, PieChart, TrendingDown, Target, Lightbulb, LayoutDashboard, Tag, CreditCard, Crown, Infinity } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { toast } from 'sonner'
import ThemeToggle from '@/app/components/ThemeToggle'
import { getMostCriticalInsight, getAllInsights, generatePerformanceAnalogies } from '../utils/performanceAnalogies'
import { generateValueFirstInsights } from '../utils/insights/valueFirstInsights'
import { prioritizeInsights, enhanceInsightForDisplay } from '../utils/insights/insightsPrioritizationEngine'
import { generateWhatsNextActions } from '../utils/insights/whatsNextActions'
import MarketIndicators from './MarketIndicators'
import TopHeadlines from './TopHeadlines'
import NewsTicker from './NewsTicker'
import EnhancedMarketInsights from './EnhancedMarketInsights'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ExchangeIcon, Separator } from '@/components/ui'
import { Badge } from '@/components/ui/badge'
import { DashboardStatsSkeleton, DataSourceSkeleton } from '@/app/components/LoadingSkeletons'
import ConnectExchangeModal from './ConnectExchangeModal'
import Sidebar from './Sidebar'
import Footer from '../../components/Footer'
import UsageLimits from '../../components/UsageLimits'
import { TIER_LIMITS, canAddConnection, getTierDisplayName } from '@/lib/featureGates'
import { getUpgradeToastConfig } from '@/app/components/UpgradePrompt'

/**
 * Plan Progress Bar Component
 * Shows progress from current tier to next tier
 */
function PlanProgressBar({ currentTier, actualUsage, onClick }) {
  const getNextTier = (tier) => {
    if (tier === 'free') return 'trader'
    if (tier === 'trader') return 'pro'
    return null
  }

  const getProgress = () => {
    const nextTier = getNextTier(currentTier)
    if (!nextTier) return { percentage: 0, label: 'PRO', nextLabel: null }

    const currentLimits = TIER_LIMITS[currentTier]
    const nextLimits = TIER_LIMITS[nextTier]

    // Calculate progress for each metric - bar fills as user approaches ANY limit
    const progressMetrics = []

    // Connections progress - fill based on how close to current limit
    if (currentLimits.maxConnections !== Infinity) {
      const currentLimit = currentLimits.maxConnections
      const used = actualUsage.connections
      // Progress is based on how close to hitting the current limit (0-100%)
      const progress = Math.min(100, (used / currentLimit) * 100)
      progressMetrics.push({ 
        type: 'connections', 
        progress, 
        used, 
        currentLimit, 
        isAtLimit: used >= currentLimit 
      })
    }

    // Trades progress - fill based on how close to current limit
    if (currentLimits.maxTradesPerMonth !== Infinity) {
      const currentLimit = currentLimits.maxTradesPerMonth
      const used = actualUsage.trades
      // Progress is based on how close to hitting the current limit (0-100%)
      const progress = Math.min(100, (used / currentLimit) * 100)
      progressMetrics.push({ 
        type: 'trades', 
        progress, 
        used, 
        currentLimit, 
        isAtLimit: used >= currentLimit 
      })
    }

    // Use the maximum progress across all metrics - if ANY limit is hit, bar is full
    const maxProgress = progressMetrics.length > 0 
      ? Math.max(...progressMetrics.map(m => m.progress))
      : 0

    // Check if any limit is hit
    const anyLimitHit = progressMetrics.some(m => m.isAtLimit)

    return {
      percentage: maxProgress,
      label: currentTier.toUpperCase(),
      nextLabel: nextTier.toUpperCase(),
      metrics: progressMetrics,
      anyLimitHit
    }
  }

  const progress = getProgress()
  if (!progress.nextLabel) return null

  const router = useRouter()
  const nextTierName = currentTier === 'free' ? 'Trader' : currentTier === 'trader' ? 'Pro' : null
  const isAtLimit = progress.percentage >= 100

  const handleUpgradeClick = (e) => {
    e.stopPropagation()
    router.push('/pricing')
  }

  return (
    <div className="space-y-2">
      <div 
        onClick={onClick}
        className="cursor-pointer group"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {progress.label}
            </span>
            <span className="text-[10px] text-slate-600">━━━━━━━━━━━━━━━━━━━━</span>
            <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider group-hover:text-emerald-300 transition-colors">
              {progress.nextLabel}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 group-hover:text-slate-400 transition-colors">
            {Math.round(progress.percentage)}%
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
            style={{ width: `${Math.min(100, progress.percentage)}%` }}
          />
        </div>
      </div>
      
      {/* Upgrade Button - Shows when at 100%, positioned below progress bar, 1/4 width, aligned right */}
      {isAtLimit && nextTierName && (
        <div className="flex justify-end">
          <button
            onClick={handleUpgradeClick}
            className="w-1/4 py-2 px-3 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white text-xs font-semibold transition-all duration-300 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3 h-3" />
            <span>Upgrade</span>
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Usage Breakdown Modal Component
 * Shows detailed usage breakdown similar to AnalyticsView breakdown modals
 */
function UsageBreakdownModal({ open, onOpenChange, subscription, actualUsage }) {
  const router = useRouter()
  
  if (!subscription) return null

  const currentTier = subscription.tier
  const nextTier = currentTier === 'free' ? 'trader' : currentTier === 'trader' ? 'pro' : null

  const currentLimits = TIER_LIMITS[currentTier]
  const nextLimits = nextTier ? TIER_LIMITS[nextTier] : null

  const usageData = [
    {
      label: 'Exchange Connections',
      used: actualUsage.connections,
      currentLimit: currentLimits.maxConnections,
      nextLimit: nextLimits?.maxConnections,
      icon: Database,
      color: 'text-blue-400'
    },
    {
      label: 'Trades Analyzed',
      used: actualUsage.trades,
      currentLimit: currentLimits.maxTradesPerMonth,
      nextLimit: nextLimits?.maxTradesPerMonth,
      icon: BarChart3,
      color: 'text-emerald-400'
    }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-slate-100">
            Usage Breakdown
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-400">
            Your current usage and limits
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          {usageData.map((item) => {
            const Icon = item.icon
            const currentLimitDisplay = item.currentLimit === Infinity ? '∞' : item.currentLimit
            const nextLimitDisplay = item.nextLimit === Infinity ? '∞' : item.nextLimit
            // Calculate percentage - handle edge cases
            const used = item.used || 0  // Ensure used is always a number
            const percentage = item.currentLimit === Infinity 
              ? 0 
              : item.currentLimit === 0 || item.currentLimit === null || item.currentLimit === undefined
              ? 0  // If limit is 0/null/undefined, show 0% (unfilled)
              : Math.min(100, Math.max(0, (used / item.currentLimit) * 100))  // Ensure percentage is between 0-100
            
            return (
              <div key={item.label} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${item.color}`} />
                  <span className="text-sm font-medium text-slate-300">{item.label}</span>
                </div>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-2xl font-bold text-white">{used}</span>
                  <span className="text-sm text-slate-400">
                    / {currentLimitDisplay}
                    {nextLimitDisplay && nextLimitDisplay !== currentLimitDisplay && (
                      <span className="text-slate-600 ml-1">→ {nextLimitDisplay}</span>
                    )}
                  </span>
                </div>
                {item.currentLimit !== Infinity && (
                  <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full ${percentage >= 90 ? 'bg-red-500' : percentage >= 75 ? 'bg-amber-500' : 'bg-emerald-500'} transition-all duration-300`}
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                  </div>
                )}
                {item.currentLimit === Infinity && (
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div className="h-full bg-emerald-500 w-full" />
                  </div>
                )}
              </div>
            )
          })}
          {nextTier && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="flex items-center justify-center gap-2">
                <p className="text-xs text-slate-400 text-center">
                  Upgrade to <span className="text-emerald-400 font-semibold">{nextTier.toUpperCase()}</span> for higher limits
                </p>
                <button
                  onClick={() => router.push('/pricing')}
                  className="text-emerald-400 hover:text-emerald-300 transition-colors flex items-center"
                  aria-label="View pricing"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

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

/**
 * Get icon component by name
 */
function getIconComponent(iconName) {
  const iconMap = {
    Target: Target,
    DollarSign: DollarSign,
    Clock: Clock,
    TrendingUp: TrendingUp,
    Brain: Brain,
    BarChart3: BarChart3,
    PieChart: PieChart,
    Zap: Zap,
    TrendingDown: TrendingDown,
    Lightbulb: Lightbulb
  }
  return iconMap[iconName] || Lightbulb
}

export default function Dashboard({ onConnectExchange, onTryDemo, onConnectWithCSV, onViewAnalytics }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
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
  const [whatsNextActions, setWhatsNextActions] = useState(null)

  // Exchange deletion state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingExchange, setDeletingExchange] = useState(null)
  const [deleteStats, setDeleteStats] = useState(null)
  const [deleteLinkedCSVs, setDeleteLinkedCSVs] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [subscription, setSubscription] = useState(null)
  const [loadingSubscription, setLoadingSubscription] = useState(true)
  const [showUsageModal, setShowUsageModal] = useState(false)

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  // Fetch connected exchanges and uploaded files on mount
  useEffect(() => {
    // Parallelize all API calls for faster loading
    Promise.all([
      fetchConnectedExchanges(),
      fetchUploadedFiles(),
      fetchTradesStats(),
      fetchSubscription()
    ]).catch(error => {
      console.error('Error loading dashboard data:', error)
    })

    // Check if we should show connect modal (from DataManagement page)
    const shouldShowModal = sessionStorage.getItem('showConnectModal')
    if (shouldShowModal === 'true') {
      sessionStorage.removeItem('showConnectModal')
      setShowConnectModal(true)
    }
  }, [])

  // Auto-connect exchange after upgrade
  useEffect(() => {
    const autoConnect = searchParams?.get('autoConnect')
    if (autoConnect === 'true') {
      const pendingConnection = sessionStorage.getItem('pendingExchangeConnection')
      
      if (pendingConnection) {
        try {
          const connectionData = JSON.parse(pendingConnection)
          const { exchange, apiKey, apiSecret, timestamp } = connectionData
          
          // Check if data is not too old (24 hours max)
          const age = Date.now() - timestamp
          const MAX_AGE = 24 * 60 * 60 * 1000 // 24 hours
          
          if (age > MAX_AGE) {
            sessionStorage.removeItem('pendingExchangeConnection')
            // Remove autoConnect param
            router.replace('/dashboard', { scroll: false })
            return
          }
          
          // Auto-connect the exchange
          const connectExchange = async () => {
            try {
              const response = await fetch('/api/exchange/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  exchange,
                  apiKey,
                  apiSecret
                })
              })
              
              const data = await response.json()
              
              // Refresh exchanges list to check actual connection state
              await fetchConnectedExchanges()
              
              // Check if exchange is actually connected (even if API returned error)
              const exchangeLower = exchange.toLowerCase()
              const isActuallyConnected = connectedExchanges.some(ex => ex.name.toLowerCase() === exchangeLower)
              
              if (response.ok && data.success) {
                // API says success - connection created
                sessionStorage.removeItem('pendingExchangeConnection')
                router.replace('/dashboard', { scroll: false })
                
                toast.success(
                  `${exchange.charAt(0).toUpperCase() + exchange.slice(1)} connected successfully!`,
                  {
                    description: 'Your exchange has been connected and data is being fetched.',
                    duration: 5000
                  }
                )
              } else if (isActuallyConnected) {
                // Exchange is connected despite API error - treat as success
                sessionStorage.removeItem('pendingExchangeConnection')
                router.replace('/dashboard', { scroll: false })
                
                // Check if it's a duplicate connection error
                if (data.error === 'DUPLICATE_CONNECTION' || data.message?.includes('already')) {
                  toast.success(
                    `${exchange.charAt(0).toUpperCase() + exchange.slice(1)} is already connected!`,
                    {
                      duration: 5000
                    }
                  )
                } else {
                  toast.success(
                    `${exchange.charAt(0).toUpperCase() + exchange.slice(1)} connected successfully!`,
                    {
                      description: 'Your exchange has been connected.',
                      duration: 5000
                    }
                  )
                }
              } else {
                // Real error - exchange is not connected
                console.error('❌ [Dashboard] Auto-connect failed:', data)
                sessionStorage.removeItem('pendingExchangeConnection')
                router.replace('/dashboard', { scroll: false })
                
                toast.error('Auto-connect failed', {
                  description: data.message || 'Please try connecting manually from the dashboard.',
                  duration: 6000
                })
              }
            } catch (error) {
              console.error('❌ [Dashboard] Error during auto-connect:', error)
              
              // Check if connection might have succeeded despite exception
              await fetchConnectedExchanges()
              const exchangeLower = exchange.toLowerCase()
              const isActuallyConnected = connectedExchanges.some(ex => ex.name.toLowerCase() === exchangeLower)
              
              if (isActuallyConnected) {
                // Exchange is connected, show success
                sessionStorage.removeItem('pendingExchangeConnection')
                router.replace('/dashboard', { scroll: false })
                
                toast.success(
                  `${exchange.charAt(0).toUpperCase() + exchange.slice(1)} connected successfully!`,
                  {
                    description: 'Your exchange has been connected.',
                    duration: 5000
                  }
                )
              } else {
                // Real error
                sessionStorage.removeItem('pendingExchangeConnection')
                router.replace('/dashboard', { scroll: false })
                
                toast.error('Auto-connect error', {
                  description: 'Please try connecting manually from the dashboard.',
                  duration: 6000
                })
              }
            }
          }
          
          // Small delay to ensure subscription is updated
          setTimeout(connectExchange, 1000)
        } catch (error) {
          console.error('Error parsing pending connection:', error)
          sessionStorage.removeItem('pendingExchangeConnection')
          router.replace('/dashboard', { scroll: false })
        }
      } else {
        // No pending connection, just remove param
        router.replace('/dashboard', { scroll: false })
      }
    }
  }, [searchParams, router])

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

  // Helper function to get cached analytics data
  const getCachedAnalytics = () => {
    try {
      const cached = sessionStorage.getItem('lastAnalytics')
      if (!cached) return { analytics: null, psychology: null, allTrades: null }
      const parsed = JSON.parse(cached)
      return {
        analytics: parsed.analytics || null,
        psychology: parsed.psychology || null,
        allTrades: parsed.allTrades || null
      }
    } catch (e) {
      return { analytics: null, psychology: null, allTrades: null }
    }
  }

  // Memoize cached analytics data
  const cachedAnalyticsData = useMemo(() => getCachedAnalytics(), [])

  // Generate "What's Next" actions when tradesStats is available
  useEffect(() => {
    if (!tradesStats || tradesStats.totalTrades === 0) {
      setWhatsNextActions(null)
      return
    }

    // Try to get cached analytics data if available
    const { analytics: analyticsData, psychology: psychologyData, allTrades: allTradesData } = cachedAnalyticsData

    // Generate actions (works with minimal data too)
    const actions = generateWhatsNextActions(analyticsData, psychologyData, allTradesData, tradesStats)
    setWhatsNextActions(actions)
  }, [tradesStats, cachedAnalyticsData])

  const fetchConnectedExchanges = async () => {
    const startTime = Date.now()
    try {
      const response = await fetch('/api/exchange/list')
      const data = await response.json()

      if (data.success) {
        const formatted = data.connections.map(conn => ({
          id: conn.id,
          name: conn.exchange.charAt(0).toUpperCase() + conn.exchange.slice(1),
          exchange: conn.exchange,
          connectedAt: conn.created_at,
          lastSynced: conn.last_synced || conn.updated_at || conn.created_at
        }))
        setConnectedExchanges(formatted)
      } else {
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
      // Only fetch metadata/stats, not full trade data
      // This is much faster as it doesn't load all trades
      const response = await fetch('/api/trades/stats')
      const data = await response.json()

      if (data.success && data.metadata) {
        setTradesStats(data.metadata)
        // Don't analyze here - lazy load analysis only when viewing analytics
      }
    } catch (error) {
      console.error('Error fetching trades stats:', error)
      // Fallback: try the old endpoint if stats endpoint doesn't exist yet
      try {
        const fallbackResponse = await fetch('/api/trades/fetch?metadataOnly=true')
        const fallbackData = await fallbackResponse.json()
        if (fallbackData.success && fallbackData.metadata) {
          setTradesStats(fallbackData.metadata)
        }
      } catch (fallbackError) {
        console.error('Fallback fetch also failed:', fallbackError)
      }
    } finally {
      // Ensure minimum 350ms loading time for skeleton visibility
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 350 - elapsed)
      setTimeout(() => setLoadingStats(false), remaining)
    }
  }

  const fetchSubscription = async () => {
    try {
      // Check cache first (5 minute TTL)
      const cacheKey = `subscription_${user?.id}`
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        try {
          const { data: subscriptionData, timestamp } = JSON.parse(cached)
          const age = Date.now() - timestamp
          const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
          
          if (age < CACHE_TTL) {
            setSubscription(subscriptionData)
            setLoadingSubscription(false)
            return
          }
        } catch (e) {
          // Invalid cache, continue to fetch
        }
      }

      setLoadingSubscription(true)
      if (user?.id) {
        const response = await fetch(`/api/subscriptions/current?userId=${user.id}`)
        if (response.ok) {
          const data = await response.json()
          const subscriptionData = data.subscription
          setSubscription(subscriptionData)
          
          // Cache the subscription data
          localStorage.setItem(cacheKey, JSON.stringify({
            data: subscriptionData,
            timestamp: Date.now()
          }))
        }
      }
    } catch (error) {
      console.error('Error fetching subscription:', error)
    } finally {
      setLoadingSubscription(false)
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

  const handleOpenConnectModal = async () => {
    // Check connection limit before opening modal
    if (!subscription) {
      // If subscription not loaded yet, just open modal (will be checked on backend)
      setShowConnectModal(true)
      return
    }

    // Check if user can add another connection
    const canAdd = canAddConnection({
      ...subscription,
      exchanges_connected: connectedExchanges.length
    })

    if (!canAdd) {
      const limit = TIER_LIMITS[subscription.tier || 'free'].maxConnections
      const toastConfig = getUpgradeToastConfig({
        type: 'connection',
        current: connectedExchanges.length,
        limit,
        tier: subscription.tier || 'free'
      })
      
      if (toastConfig) {
        toast.error('Connection Limit Reached', toastConfig)
      } else {
        toast.error(`Connection limit reached (${connectedExchanges.length}/${limit})`)
      }
      return
    }

    setShowConnectModal(true)
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
    const timeoutId = setTimeout(() => {
      window.location.href = '/'
    }, 3000)

    try {
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
      })
      const data = await response.json()
      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error('Sign out error:', data.error)
      }

      window.location.href = '/'
    } catch (error) {
      console.error('Sign out error:', error)
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
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <button
                  onClick={() => window.location.href = '/'}
                  className="flex items-center gap-1 sm:gap-2 rounded-full border border-white/5 bg-white/[0.03] px-2 sm:px-3 py-1 text-sm font-semibold text-white/90 transition-all duration-300 hover:border-emerald-400/40 hover:bg-emerald-400/10 hover:text-white flex-shrink-0"
                >
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-300" />
                  <span className="hidden sm:inline">TradeClarity</span>
                </button>
                {subscription && (
                  <Badge 
                    variant="outline" 
                    className={`${
                      subscription.tier === 'pro' 
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' 
                        : subscription.tier === 'trader'
                        ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                        : 'border-slate-500/50 bg-slate-500/10 text-slate-400'
                    } font-semibold uppercase tracking-wider text-[9px] px-1.5 py-0.5 flex items-center gap-1 hidden sm:flex`}
                  >
                    {subscription.tier === 'pro' && <Crown className="w-2.5 h-2.5" />}
                    {subscription.tier}
                  </Badge>
                )}
              </div>

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
                <button
                  onClick={() => router.push('/billing')}
                  className={`group inline-flex items-center justify-center gap-1 md:gap-2 rounded-full px-2 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs font-medium transition-all duration-300 flex-shrink-0 whitespace-nowrap ${
                    pathname === '/billing'
                      ? 'text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  style={{ minHeight: '32px', minWidth: '32px' }}
                >
                  <CreditCard className={`h-3 w-3 md:h-4 md:w-4 transition-colors flex-shrink-0 ${
                    pathname === '/billing'
                      ? 'text-emerald-300'
                      : 'text-slate-500 group-hover:text-emerald-300'
                  }`} />
                  <span className="hidden sm:inline">Billing</span>
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
        {/* Greeting Section with News Ticker */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-100 tracking-tight">
                {getGreeting()}{user?.user_metadata?.name ? `, ${user.user_metadata.name.split(' ')[0]}` : ''}
              </h1>
              {subscription && (
                <Badge 
                  variant="outline" 
                  className={`${
                    subscription.tier === 'pro' 
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' 
                      : subscription.tier === 'trader'
                      ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                      : 'border-slate-500/50 bg-slate-500/10 text-slate-400'
                  } font-semibold uppercase tracking-wider flex items-center gap-1.5`}
                >
                  {subscription.tier === 'pro' && <Crown className="w-3 h-3" />}
                  {subscription.tier}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              {user?.email}
              {tradesStats && tradesStats.totalTrades > 0 && (
                <>
                  <Separator className="text-slate-600" />
                  <span className="text-slate-400 font-medium">{tradesStats.totalTrades} trades analyzed</span>
                </>
              )}
            </p>
          </div>
          
          {/* News Ticker - Inline with greeting */}
          <div className="flex-shrink-0 w-full md:w-[calc(50%-0.75rem)] lg:w-[calc(50%-1.5rem)]">
            <NewsTicker />
          </div>
        </div>

          {/* Stats Overview & Smart Recommendations */}
          {loadingStats ? (
            <DashboardStatsSkeleton />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 px-1">
                {/* Trading Overview / Progress Bar Card / Connect Exchange Card */}
                {subscription && subscription.tier !== 'pro' ? (
                  connectedExchanges.length > 0 ? (
                    <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-white/[0.03] shadow-lg shadow-emerald-500/5 backdrop-blur p-5 md:p-6 transition-all duration-300 hover:scale-[1.02] hover:border-white/10 flex flex-col" style={{ maxHeight: '500px' }}>
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10" />
                      <div className="absolute -top-24 -right-20 w-72 h-72 bg-emerald-500/20 blur-3xl rounded-full opacity-50" />
                      <div className="relative flex-1 flex flex-col overflow-hidden">
                        <h3 className="text-xs font-semibold text-slate-300 mb-4 uppercase tracking-wider flex-shrink-0">Your Trading Overview</h3>
                        <div className="flex-1 overflow-y-auto min-h-0">
                        {tradesStats && tradesStats.totalTrades > 0 ? (
                          <div className="space-y-3 mb-4">
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
                        ) : (
                          <div className="space-y-3 mb-4">
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
                          </div>
                        )}
                        
                        {/* Progress Bar */}
                        <div className="pt-4 border-t border-white/5">
                          <PlanProgressBar 
                            currentTier={subscription.tier}
                            actualUsage={{
                              connections: connectedExchanges.length,
                              trades: tradesStats?.totalTrades || 0
                            }}
                            onClick={() => setShowUsageModal(true)}
                          />
                        </div>
                        
                        {/* Connected Exchanges Summary */}
                        {connectedExchanges.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-white/5">
                            <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                              <span className="text-xs text-slate-400">Exchanges Connected</span>
                              <span className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                                {connectedExchanges.length}
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
                              </span>
                            </div>
                          </div>
                        )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-emerald-500/5 shadow-lg shadow-emerald-500/10 backdrop-blur p-5 md:p-6 transition-all duration-300 hover:scale-[1.02] hover:border-emerald-500/40 hover:bg-emerald-500/10 group">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10" />
                      <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/20 blur-2xl rounded-full opacity-50 group-hover:opacity-75 transition-opacity duration-300" />
                      <div className="relative">
                        <div className="flex items-center gap-2 mb-3">
                          <Database className="w-4 h-4 text-emerald-400" />
                          <h3 className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Get Started</h3>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed mb-4">
                          Connect your exchange or upload CSV files to start analyzing your trading performance
                        </p>
                        <div className="space-y-2">
                          <button
                            onClick={handleOpenConnectModal}
                            className="w-full text-left text-xs text-slate-300 hover:text-emerald-300 font-medium transition-colors duration-200 flex items-center gap-2 p-2.5 rounded-lg hover:bg-white/5 border border-white/5 hover:border-emerald-500/30"
                          >
                            <LinkIcon className="w-4 h-4 text-emerald-400/70 flex-shrink-0" />
                            <span>Connect Exchange via API</span>
                            <ChevronRight className="w-3.5 h-3.5 ml-auto text-slate-500" />
                          </button>
                          <button
                            onClick={() => router.push('/data')}
                            className="w-full text-left text-xs text-slate-300 hover:text-emerald-300 font-medium transition-colors duration-200 flex items-center gap-2 p-2.5 rounded-lg hover:bg-white/5 border border-white/5 hover:border-emerald-500/30"
                          >
                            <Upload className="w-4 h-4 text-emerald-400/70 flex-shrink-0" />
                            <span>Upload CSV Files</span>
                            <ChevronRight className="w-3.5 h-3.5 ml-auto text-slate-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                ) : subscription && subscription.tier === 'pro' ? (
                  <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-cyan-500/10 shadow-lg shadow-emerald-500/20 backdrop-blur p-5 md:p-6 transition-all duration-300 hover:scale-[1.02] hover:border-emerald-500/50 group">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-transparent to-cyan-500/20 opacity-50" />
                    <div className="absolute -top-24 -right-20 w-72 h-72 bg-emerald-500/30 blur-3xl rounded-full opacity-60 group-hover:opacity-80 transition-opacity" />
                    <div className="absolute -bottom-24 -left-20 w-64 h-64 bg-cyan-500/20 blur-3xl rounded-full opacity-40" />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                          <Crown className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xs font-semibold text-emerald-300 mb-1 uppercase tracking-wider flex items-center gap-2">
                            PRO Plan
                            <Badge className="bg-emerald-500/20 border-emerald-500/40 text-emerald-300 text-[10px] px-1.5 py-0">
                              Active
                            </Badge>
                          </h3>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            You have unlimited access to all features
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2.5 mt-4">
                        <div className="flex items-center gap-2 text-xs text-slate-300">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>Unlimited exchange connections</span>
                          <Infinity className="w-3.5 h-3.5 text-emerald-400 ml-auto" />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-300">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>Unlimited trades analyzed</span>
                          <Infinity className="w-3.5 h-3.5 text-emerald-400 ml-auto" />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-300">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>Unlimited reports generated</span>
                          <Infinity className="w-3.5 h-3.5 text-emerald-400 ml-auto" />
                        </div>
                      </div>

                      {tradesStats && tradesStats.totalTrades > 0 && (
                        <div className="mt-4 pt-4 border-t border-emerald-500/20">
                          <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                            <span className="text-xs text-slate-400">Total Trades Analyzed</span>
                            <span className="text-sm font-bold text-emerald-400">{tradesStats.totalTrades.toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-4 pt-4 border-t border-emerald-500/20">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
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
                      </div>
                    </div>
                  </div>
                ) : null}

              {/* Market Insights - No card styling, matches page background */}
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                    {connectedExchanges.length === 0 ? 'How does this work?' : 'Market Insights'}
                  </h3>
                </div>
                
                {tradesStats && tradesStats.totalTrades > 0 && whatsNextActions ? (
                      <div className="space-y-4">
                        {/* High Impact Actions */}
                        {whatsNextActions.highImpact && whatsNextActions.highImpact.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-semibold text-emerald-400/80 uppercase tracking-wider">High Impact</p>
                            <div className="space-y-2">
                              {whatsNextActions.highImpact.map((action) => {
                                const IconComponent = getIconComponent(action.icon)
                                const isAmber = action.color === 'amber'
                                const isRed = action.color === 'red'
                                const isEmerald = action.color === 'emerald'
                                const isCyan = action.color === 'cyan'
                                const isPurple = action.color === 'purple'
                                const isCritical = action.urgency === 'critical'
                                
                                const borderClass = isAmber ? 'border-amber-500/20 hover:border-amber-500/40' :
                                                   isRed ? 'border-red-500/20 hover:border-red-500/40' :
                                                   isEmerald ? 'border-emerald-500/20 hover:border-emerald-500/40' :
                                                   isCyan ? 'border-cyan-500/20 hover:border-cyan-500/40' :
                                                   isPurple ? 'border-purple-500/20 hover:border-purple-500/40' :
                                                   'border-slate-500/20 hover:border-slate-500/40'
                                
                                const bgClass = isAmber ? 'bg-amber-500/5 hover:bg-amber-500/10' :
                                                isRed ? 'bg-red-500/5 hover:bg-red-500/10' :
                                                isEmerald ? 'bg-emerald-500/5 hover:bg-emerald-500/10' :
                                                isCyan ? 'bg-cyan-500/5 hover:bg-cyan-500/10' :
                                                isPurple ? 'bg-purple-500/5 hover:bg-purple-500/10' :
                                                'bg-slate-500/5 hover:bg-slate-500/10'
                                
                                const iconClass = isAmber ? 'text-amber-400' :
                                                 isRed ? 'text-red-400' :
                                                 isEmerald ? 'text-emerald-400' :
                                                 isCyan ? 'text-cyan-400' :
                                                 isPurple ? 'text-purple-400' :
                                                 'text-slate-400'
                                
                                const savingsClass = isCritical && isAmber ? 'text-amber-300' :
                                                    isAmber ? 'text-amber-400' :
                                                    isRed ? 'text-red-300' :
                                                    isEmerald ? 'text-emerald-300' :
                                                    isCyan ? 'text-cyan-300' :
                                                    isPurple ? 'text-purple-300' :
                                                    'text-slate-300'
                                
                                return (
                                  <button
                                    key={action.id}
                                    onClick={() => {
                                      if (action.actionType === 'navigation' && action.action?.route) {
                                        router.push(action.action.route)
                                      } else {
                                        onViewAnalytics()
                                      }
                                    }}
                                    className={`w-full text-left p-3 rounded-xl border transition-all duration-200 hover:scale-[1.02] ${borderClass} ${bgClass}`}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex items-start gap-2 flex-1 min-w-0">
                                        <IconComponent className={`w-4 h-4 ${iconClass} flex-shrink-0 mt-0.5`} />
                                        <div className="flex-1 min-w-0">
                                          <div className="text-xs font-semibold text-slate-200 mb-0.5">{action.title}</div>
                                          <div className="text-[10px] text-slate-400 leading-relaxed">{action.description}</div>
                                          {action.potentialSavings > 0 && (
                                            <div className={`text-[10px] font-medium mt-1 ${savingsClass}`}>
                                              Potential savings: ${action.potentialSavings.toFixed(0)}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <ChevronRight className={`w-3.5 h-3.5 ${iconClass} opacity-50 flex-shrink-0 mt-1`} />
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Quick Actions */}
                        {whatsNextActions.quickActions && whatsNextActions.quickActions.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-semibold text-slate-400/80 uppercase tracking-wider">Quick Wins</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {whatsNextActions.quickActions.map((action) => {
                                const IconComponent = getIconComponent(action.icon)
                                const isAmber = action.color === 'amber'
                                const isRed = action.color === 'red'
                                const isEmerald = action.color === 'emerald'
                                const isCyan = action.color === 'cyan'
                                const isPurple = action.color === 'purple'
                                
                                const borderClass = isAmber ? 'border-amber-500/20 hover:border-amber-500/40' :
                                                   isRed ? 'border-red-500/20 hover:border-red-500/40' :
                                                   isEmerald ? 'border-emerald-500/20 hover:border-emerald-500/40' :
                                                   isCyan ? 'border-cyan-500/20 hover:border-cyan-500/40' :
                                                   isPurple ? 'border-purple-500/20 hover:border-purple-500/40' :
                                                   'border-slate-500/20 hover:border-slate-500/40'
                                
                                const bgClass = isAmber ? 'bg-amber-500/5 hover:bg-amber-500/10' :
                                                isRed ? 'bg-red-500/5 hover:bg-red-500/10' :
                                                isEmerald ? 'bg-emerald-500/5 hover:bg-emerald-500/10' :
                                                isCyan ? 'bg-cyan-500/5 hover:bg-cyan-500/10' :
                                                isPurple ? 'bg-purple-500/5 hover:bg-purple-500/10' :
                                                'bg-slate-500/5 hover:bg-slate-500/10'
                                
                                const iconClass = isAmber ? 'text-amber-400' :
                                                 isRed ? 'text-red-400' :
                                                 isEmerald ? 'text-emerald-400' :
                                                 isCyan ? 'text-cyan-400' :
                                                 isPurple ? 'text-purple-400' :
                                                 'text-slate-400'
                                
                                return (
                                  <button
                                    key={action.id}
                                    onClick={() => {
                                      if (action.actionType === 'navigation' && action.action?.route) {
                                        router.push(action.action.route)
                                      } else {
                                        onViewAnalytics()
                                      }
                                    }}
                                    className={`text-left p-2.5 rounded-lg border transition-all duration-200 hover:scale-[1.02] ${borderClass} ${bgClass}`}
                                  >
                                    <div className="flex items-start gap-2">
                                      <IconComponent className={`w-3.5 h-3.5 ${iconClass} flex-shrink-0 mt-0.5`} />
                                      <div className="flex-1 min-w-0">
                                        <div className="text-[11px] font-semibold text-slate-200 mb-0.5">{action.title}</div>
                                        <div className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">{action.description}</div>
                                      </div>
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Enhanced Market Insights */}
                        <EnhancedMarketInsights 
                          analytics={cachedAnalyticsData.analytics}
                          allTrades={cachedAnalyticsData.allTrades}
                          tradesStats={tradesStats}
                        />

                      </div>
                    ) : tradesStats && tradesStats.totalTrades > 0 ? (
                      <div className="space-y-4">
                        {/* Enhanced Market Insights */}
                        <EnhancedMarketInsights 
                          analytics={cachedAnalyticsData.analytics}
                          allTrades={cachedAnalyticsData.allTrades}
                          tradesStats={tradesStats}
                        />
                      </div>
                    ) : connectedExchanges.length === 0 ? (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-300 leading-relaxed mb-2">
                          TradeClarity helps you analyze your trading performance, identify patterns, and make data-driven decisions. Get insights into your win rate, profit factors, best trading times, and more.
                        </p>
                        <button
                          onClick={onTryDemo}
                          className="group/btn w-full text-left text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-all duration-300 inline-flex items-center gap-2 p-2.5 rounded-lg hover:bg-white/5 border border-emerald-500/20 hover:border-emerald-500/40"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Try Demo</span>
                          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1 ml-auto" />
                        </button>
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
          )}

          {/* Trading Insights Section - Lazy loaded (only shown when analysis is performed) */}
          {/* Analysis is now lazy loaded - insights will be empty on dashboard load for better performance */}
          {false && !loadingStats && allInsights.length > 0 && tradesStats && tradesStats.totalTrades > 0 && (
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
                        ? 'border-amber-500/20 bg-amber-500/5'
                        : isOpportunity
                        ? 'border-orange-500/20 bg-orange-500/5'
                        : 'border-emerald-500/20 bg-emerald-500/5'
                      
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
                      
                      const activeBorderColor = isWeakness
                        ? 'border-amber-500/30'
                        : isOpportunity
                        ? 'border-orange-500/30'
                        : 'border-emerald-500/30'
                      
                      return (
                        <div
                          key={index}
                          data-insight-index={index}
                          className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all duration-300 flex-shrink-0 min-w-[280px] max-w-[320px] ${colorClasses} ${
                            isActive ? activeBorderColor : ''
                          } ${isActive ? 'scale-[1.05] z-10' : 'scale-100'}`}
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border transition-all duration-300 ${iconBgColor}`}>
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
                      <Separator className="text-slate-600" />
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
                                            <Separator className="text-slate-600" />
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

      {/* Usage Breakdown Modal */}
      <UsageBreakdownModal
        open={showUsageModal}
        onOpenChange={setShowUsageModal}
        subscription={subscription}
        actualUsage={{
          connections: connectedExchanges.length,
          trades: tradesStats?.totalTrades || 0
        }}
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

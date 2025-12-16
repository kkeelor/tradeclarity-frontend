// app/analyze/components/Dashboard.js
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { TrendingUp, Plus, Upload, Trash2, AlertCircle, Link as LinkIcon, FileText, Download, Play, LogOut, BarChart3, Sparkles, Database, CheckSquare, Square, Loader2, ChevronRight, Zap, Brain, Clock, DollarSign, PieChart, TrendingDown, Target, Lightbulb, LayoutDashboard, Tag, CreditCard, Crown, Infinity, MessageCircle } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { toast } from 'sonner'
import ThemeToggle from '@/app/components/ThemeToggle'
import { getMostCriticalInsight, getAllInsights, generatePerformanceAnalogies } from '../utils/performanceAnalogies'
import { generateValueFirstInsights } from '../utils/insights/valueFirstInsights'
import { prioritizeInsights, enhanceInsightForDisplay } from '../utils/insights/insightsPrioritizationEngine'
import { generateWhatsNextActions } from '../utils/insights/whatsNextActions'
import NewsTicker from './NewsTicker'
import VegaDashboardWidget from '../../dashboard/components/VegaDashboardWidget'
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { HelpCircle } from 'lucide-react'
import Sidebar from './Sidebar'
import Header from './Header'
import Footer from '../../components/Footer'
import UsageLimits from '../../components/UsageLimits'
import { TIER_LIMITS, canAddConnection, getTierDisplayName, getEffectiveTier } from '@/lib/featureGates'
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

    // AI Tokens progress - fill based on how close to current limit
    if (currentLimits.maxTokensPerMonth !== Infinity && actualUsage.tokens !== undefined) {
      const currentLimit = currentLimits.maxTokensPerMonth
      const used = actualUsage.tokens || 0
      // Progress is based on how close to hitting the current limit (0-100%)
      const progress = Math.min(100, (used / currentLimit) * 100)
      progressMetrics.push({ 
        type: 'tokens', 
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
            <span className="text-[10px] font-medium text-white/60 uppercase tracking-wider">
              {progress.label}
            </span>
            <span className="text-[10px] text-white/20">━━━━━━━━━━━━━━━━━━━━</span>
            <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider group-hover:text-emerald-300 transition-colors">
              {progress.nextLabel}
            </span>
          </div>
          <span className="text-[10px] text-white/60 group-hover:text-white/80 transition-colors">
            {Math.round(progress.percentage)}%
          </span>
        </div>
        <div className="w-full bg-white/5 border border-white/10 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-emerald-400 transition-all duration-500"
            style={{ width: `${Math.min(100, progress.percentage)}%` }}
          />
        </div>
      </div>
      
      {/* Upgrade Button - Shows when at 100%, positioned below progress bar, 1/4 width, aligned right */}
      {isAtLimit && nextTierName && (
        <div className="flex justify-end">
          <button
            onClick={handleUpgradeClick}
            className="w-1/4 py-2 px-3 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 text-white/90 hover:text-white text-xs font-medium transition-all duration-300 flex items-center justify-center gap-1.5"
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

  const currentTier = (getEffectiveTier(subscription) || 'free').toLowerCase()
  const nextTier = currentTier === 'free' ? 'trader' : currentTier === 'trader' ? 'pro' : null

  const currentLimits = TIER_LIMITS[currentTier] || TIER_LIMITS.free
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
    },
    {
      label: 'AI Tokens',
      used: actualUsage.tokens || 0,
      currentLimit: currentLimits.maxTokensPerMonth,
      nextLimit: nextLimits?.maxTokensPerMonth,
      icon: Brain,
      color: 'text-emerald-400'
    }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-white/90">
            Usage Breakdown
          </DialogTitle>
          <DialogDescription className="text-sm text-white/60">
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
              <div key={item.label} className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-4 h-4 text-white/60" />
                  <span className="text-sm font-medium text-white/80">{item.label}</span>
                </div>
                <div className="flex items-baseline justify-between mb-3">
                  <span className="text-2xl font-semibold text-white/90">
                    {item.label === 'AI Tokens' ? used.toLocaleString() : used}
                  </span>
                  <span className="text-sm text-white/60">
                    / {typeof currentLimitDisplay === 'number' && item.label === 'AI Tokens' 
                      ? currentLimitDisplay.toLocaleString() 
                      : currentLimitDisplay}
                    {nextLimitDisplay && nextLimitDisplay !== currentLimitDisplay && (
                      <span className="text-emerald-400 ml-1">
                        → {typeof nextLimitDisplay === 'number' && item.label === 'AI Tokens'
                          ? nextLimitDisplay.toLocaleString()
                          : nextLimitDisplay}
                      </span>
                    )}
                  </span>
                </div>
                {item.currentLimit !== Infinity && (
                  <div className="w-full bg-white/5 border border-white/10 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-300"
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                  </div>
                )}
                {item.currentLimit === Infinity && (
                  <div className="w-full bg-white/5 border border-white/10 rounded-full h-2">
                    <div className="h-full bg-emerald-400 w-full" />
                  </div>
                )}
              </div>
            )
          })}
          {nextTier && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-center gap-2">
                <p className="text-xs text-white/60 text-center">
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

export default function Dashboard({ onConnectExchange, onTryDemo, onConnectWithCSV, onConnectSnaptrade, onViewAnalytics }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [connectedExchanges, setConnectedExchanges] = useState([])
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [loadingExchanges, setLoadingExchanges] = useState(true)
  const [loadingFiles, setLoadingFiles] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)
  const [tradesStats, setTradesStats] = useState(null)
  const [criticalInsight, setCriticalInsight] = useState(null)
  const [allInsights, setAllInsights] = useState([])
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0)
  const [selectedSources, setSelectedSources] = useState([]) // Array of {type: 'exchange'|'csv', id: string}
  const [whatsNextActions, setWhatsNextActions] = useState(null)
  
  // Analytics cache state
  const [cachedAnalyticsData, setCachedAnalyticsData] = useState({ analytics: null, allTrades: null, psychology: null })
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)

  // Exchange deletion state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingExchange, setDeletingExchange] = useState(null)
  const [deleteStats, setDeleteStats] = useState(null)
  const [deleteLinkedCSVs, setDeleteLinkedCSVs] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [subscription, setSubscription] = useState(null)
  const [loadingSubscription, setLoadingSubscription] = useState(true)
  const [showUsageModal, setShowUsageModal] = useState(false)
  
  // Coach mode state - shared with Vega page via localStorage
  const [coachMode, setCoachMode] = useState(() => {
    // Load from localStorage on initial render (shared with Vega page)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vega_coach_mode')
      // Default to true if no saved preference exists
      return saved === null ? true : saved === 'true'
    }
    return true
  })
  
  // Persist coach mode preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vega_coach_mode', coachMode.toString())
    }
  }, [coachMode])
  const [tokenUsage, setTokenUsage] = useState({ used: 0, limit: 10000 })

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  // Fetch cached analytics from server
  const loadAnalytics = useCallback(async () => {
    if (!user || !tradesStats || tradesStats.totalTrades === 0) {
      // No trades - analytics not needed
      setCachedAnalyticsData({ analytics: null, allTrades: null, psychology: null })
      return
    }

    setLoadingAnalytics(true)
    try {
      // Fetch cached analytics from server
      const response = await fetch('/api/analytics/cache')
      const data = await response.json()

      if (data.success && data.analytics) {
        // Cache hit - use cached analytics
        setCachedAnalyticsData({
          analytics: data.analytics,
          allTrades: data.allTrades || [],
          psychology: data.psychology || null
        })
      } else {
        // Cache miss - trigger background computation
        // Don't await - fire and forget
        fetch('/api/analytics/compute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: user.id, 
            trigger: 'dashboard_load' 
          })
        }).catch(err => {
          console.error('Background analytics computation failed:', err)
          // Non-critical - will be computed on next load
        })

        // Set empty for now (will be available on next load)
        setCachedAnalyticsData({ analytics: null, allTrades: null, psychology: null })
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
      setCachedAnalyticsData({ analytics: null, allTrades: null, psychology: null })
    } finally {
      setLoadingAnalytics(false)
    }
  }, [user, tradesStats])

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
  }, [])

  // Load analytics when tradesStats is available
  useEffect(() => {
    if (tradesStats && user) {
      loadAnalytics()
    }
  }, [tradesStats, user, loadAnalytics])

  // Check for analytics readiness and show toast notification
  useEffect(() => {
    const checkAnalyticsReady = async () => {
      if (!user || !tradesStats || tradesStats.totalTrades === 0) {
        return
      }

      // Check if user just added trades (flag exists)
      const justAddedData = sessionStorage.getItem('justAddedTrades')
      const tradesAddedAt = sessionStorage.getItem('tradesAddedAt')

      if (justAddedData !== 'true' || !tradesAddedAt) {
        return // No flag - don't show notification
      }

      // Check if notification is stale (older than 5 minutes)
      const timeSinceAdded = Date.now() - parseInt(tradesAddedAt)
      const fiveMinutes = 5 * 60 * 1000

      if (timeSinceAdded > fiveMinutes) {
        // Too old - clear flag and don't show
        sessionStorage.removeItem('justAddedTrades')
        sessionStorage.removeItem('tradesAddedAt')
        return
      }

      // Check if analytics are cached and ready
      try {
        const response = await fetch('/api/analytics/cache')
        const data = await response.json()

        if (data.success && data.analytics) {
          // Analytics are ready - show toast notification
          toast.success('Analytics Ready', {
            description: 'Your trading data has been analyzed. Vega AI now has access to your anonymous trading data and is ready to provide insights.',
            duration: 8000,
            action: {
              label: 'Ask Vega',
              onClick: () => {
                // Focus AI Chat input
                const chatInput = document.querySelector('[data-ai-chat-input]')
                if (chatInput) {
                  chatInput.focus()
                  // Optional: Scroll to chat
                  chatInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
              }
            }
          })

          // Clear flag (only show once)
          sessionStorage.removeItem('justAddedTrades')
          sessionStorage.removeItem('tradesAddedAt')
        }
      } catch (error) {
        console.error('Error checking analytics readiness:', error)
        // Don't clear flag - will retry on next load
      }
    }

    // Check after analytics are loaded
    if (cachedAnalyticsData.analytics && tradesStats && tradesStats.totalTrades > 0) {
      checkAnalyticsReady()
    }
  }, [cachedAnalyticsData.analytics, tradesStats, user])

  // Check if we should show connect modal (from DataManagement page)
  useEffect(() => {
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
                
                // Set flag to show analytics ready toast when analytics are computed
                sessionStorage.setItem('justAddedTrades', 'true')
                sessionStorage.setItem('tradesAddedAt', Date.now().toString())
                
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
                
                // Set flag to show analytics ready toast when analytics are computed
                sessionStorage.setItem('justAddedTrades', 'true')
                sessionStorage.setItem('tradesAddedAt', Date.now().toString())
                
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
        const formatted = data.connections.map(conn => {
          // For Snaptrade, use brokerage name if available, otherwise use "Snaptrade"
          let displayName = conn.exchange.charAt(0).toUpperCase() + conn.exchange.slice(1)
          if (conn.exchange === 'snaptrade' && conn.primary_brokerage) {
            displayName = `Snaptrade - ${conn.primary_brokerage}`
          } else if (conn.exchange === 'snaptrade' && conn.brokerage_names && conn.brokerage_names.length > 0) {
            // Fallback to first brokerage if primary_brokerage not set
            displayName = `Snaptrade - ${conn.brokerage_names[0]}`
          }
          
          return {
            id: conn.id,
            name: displayName,
            exchange: conn.exchange,
            connectedAt: conn.created_at,
            lastSynced: conn.last_synced || conn.updated_at || conn.created_at,
            primaryBrokerage: conn.primary_brokerage,
            brokerageNames: conn.brokerage_names
          }
        })
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

  const fetchTokenUsage = async () => {
    if (!user || !subscription) return
    
    try {
      const response = await fetch('/api/ai/chat/tokens')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const tier = subscription.tier || 'free'
          const limit = TIER_LIMITS[tier]?.maxTokensPerMonth || TIER_LIMITS.free.maxTokensPerMonth
          setTokenUsage({
            used: data.totalTokens || 0,
            limit: limit
          })
        }
      }
    } catch (error) {
      console.error('Error fetching token usage:', error)
      // Set default based on tier
      const tier = subscription?.tier || 'free'
      const limit = TIER_LIMITS[tier]?.maxTokensPerMonth || TIER_LIMITS.free.maxTokensPerMonth
      setTokenUsage({ used: 0, limit })
    }
  }

  // Fetch token usage when subscription is loaded and update limit
  useEffect(() => {
    if (subscription) {
      const tier = subscription.tier || 'free'
      const limit = TIER_LIMITS[tier]?.maxTokensPerMonth || TIER_LIMITS.free.maxTokensPerMonth
      setTokenUsage(prev => ({ ...prev, limit }))
      fetchTokenUsage()
    } else {
      // Set default for free tier
      setTokenUsage({ used: 0, limit: TIER_LIMITS.free.maxTokensPerMonth })
    }
  }, [subscription])

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
        // Show success message
        const message = deleteLinkedCSVs
          ? `Exchange disconnected. ${data.totalTradesDeleted} trades and ${data.csvFilesDeleted} CSV files deleted.`
          : `Exchange disconnected. ${data.apiTradesDeleted} API trades deleted. ${data.csvFilesUnlinked} CSV files kept.`

        toast.success('Exchange Disconnected', {
          description: message,
          duration: 8000
        })

        // Refresh exchange list from server to ensure UI is up to date
        await fetchConnectedExchanges()

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
      const effectiveTier = (getEffectiveTier(subscription) || 'free').toLowerCase()
      const limit = TIER_LIMITS[effectiveTier]?.maxConnections || 1
      const toastConfig = getUpgradeToastConfig({
        type: 'connection',
        current: connectedExchanges.length,
        limit,
        tier: effectiveTier
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
    } else if (method === 'snaptrade') {
      // Go to Snaptrade OAuth flow
      if (onConnectSnaptrade) {
        onConnectSnaptrade()
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
    <div className="min-h-screen bg-black text-white flex">
      {/* Mobile-only Sidebar */}
      <div className="md:hidden">
        <Sidebar
          activePage="dashboard"
          onDashboardClick={() => {}}
          onUploadClick={() => router.push('/data')}
          onVegaClick={() => router.push('/vega')}
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
        <Header
          exchangeConfig={null}
          currencyMetadata={null}
          currency="USD"
          setCurrency={() => {}}
          onNavigateDashboard={() => router.push('/dashboard')}
          onNavigateUpload={() => router.push('/data')}
          onNavigateAll={() => onViewAnalytics()}
          onNavigateVega={() => router.push('/vega')}
          onSignOut={handleSignOut}
          subscription={subscription}
          showSubscriptionBadge={true}
          mobilePaddingLeft={true}
          hasDataSources={connectedExchanges.length > 0 || !loadingExchanges}
        />

        {/* Main Content */}
        <main className="relative mx-auto w-full max-w-[1400px] px-4 sm:px-6 pb-16 pt-8 space-y-8">
        {/* Greeting Section with News Ticker */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-semibold text-white/90 tracking-tight">
                {getGreeting()}{user?.user_metadata?.name ? `, ${user.user_metadata.name.split(' ')[0]}` : ''}
              </h1>
              {subscription && (
                <div className="flex items-center gap-1.5">
                  <Badge 
                    variant="outline" 
                    className={`${
                      subscription.tier === 'pro' || subscription.tier === 'trader'
                        ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400' 
                        : 'border-blue-400/30 bg-blue-400/10 text-blue-400'
                    } font-medium uppercase tracking-wider text-[10px] px-2 py-0.5 flex items-center gap-1.5`}
                  >
                    {subscription.tier === 'pro' && <Crown className="w-3 h-3 text-emerald-400" />}
                    {subscription.tier}
                  </Badge>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-3.5 h-3.5 text-white/40 hover:text-white/60 transition-colors " />
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <p className="font-medium mb-1">{subscription.tier === 'pro' ? 'PRO Plan' : subscription.tier === 'trader' ? 'Trader Plan' : 'Free Plan'}</p>
                        {subscription.tier === 'pro' ? (
                          <p className="text-xs leading-relaxed">
                            Unlimited exchange connections, unlimited trades analyzed, and 100,000 AI tokens/month. Full access to all features.
                          </p>
                        ) : subscription.tier === 'trader' ? (
                          <p className="text-xs leading-relaxed">
                            Up to 3 exchange connections, 10,000 trades/month, and 50,000 AI tokens/month. Perfect for active traders.
                          </p>
                        ) : (
                          <p className="text-xs leading-relaxed">
                            Up to 1 exchange connection, 500 trades/month, and 10,000 AI tokens/month. Great for getting started.
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
            <p className="text-xs text-white/50 mt-2 flex items-center gap-2">
              {user?.email}
              {tradesStats && tradesStats.totalTrades > 0 && (
                <>
                  <Separator className="text-white/10" />
                  <span className="text-white/60 font-medium">{tradesStats.totalTrades} trades analyzed</span>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {/* Trading Overview / Progress Bar Card / Connect Exchange Card */}
                {subscription && subscription.tier !== 'pro' ? (
                  connectedExchanges.length > 0 ? (
                    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black p-5 transition-all duration-300 hover:border-white/20 flex flex-col h-[350px] self-start">
                      <div className="relative flex flex-col overflow-hidden h-full">
                        <h3 className="text-xs font-medium text-white/70 mb-4 uppercase tracking-wider flex-shrink-0">Your Trading Overview</h3>
                        <div className="flex flex-col gap-3 overflow-y-auto flex-1">
                        {tradesStats && tradesStats.totalTrades > 0 ? (
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5">
                              <span className="text-xs text-white/60">Total Trades</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-white/90">{tradesStats.totalTrades.toLocaleString()}</span>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <HelpCircle className="w-3.5 h-3.5 text-white/40 hover:text-white/60 transition-colors " />
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs">
                                      <p className="font-medium mb-1">Total Trades</p>
                                      <p className="text-xs leading-relaxed">
                                        Total number of trades analyzed across all connected exchanges and uploaded CSV files. Includes both spot and futures trades.
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5">
                              <span className="text-xs text-white/60">Exchanges Connected</span>
                              <span className="text-sm font-semibold text-white/90 flex items-center gap-1">
                                {connectedExchanges.length}
                                {connectedExchanges.length > 0 && (
                                  <span className="text-white/40 font-normal ml-1 flex items-center">
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
                              <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5">
                                <span className="text-xs text-white/60">Data Range</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-white/70">
                                    {new Date(tradesStats.oldestTrade).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - Present
                                  </span>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <HelpCircle className="w-3.5 h-3.5 text-white/40 hover:text-white/60 transition-colors " />
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-xs">
                                        <p className="font-medium mb-1">Data Range</p>
                                        <p className="text-xs leading-relaxed">
                                          The time period covered by your trading data, from your oldest trade to the most recent. This determines the historical analysis period.
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5">
                              <span className="text-xs text-white/60">Exchanges Connected</span>
                              <span className="text-sm font-semibold text-white/90 flex items-center gap-1">
                                {connectedExchanges.length}
                                {connectedExchanges.length > 0 && (
                                  <span className="text-white/40 font-normal ml-1 flex items-center">
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
                        {subscription && subscription.tier !== 'pro' && (
                          <div className="pt-3 border-t border-white/10 flex-shrink-0 mt-auto flex items-center gap-2">
                            <div className="flex-1">
                              <PlanProgressBar 
                                currentTier={subscription.tier}
                                actualUsage={{
                                  connections: connectedExchanges.length,
                                  trades: tradesStats?.totalTrades || 0,
                                  tokens: tokenUsage.used || 0
                                }}
                                onClick={() => setShowUsageModal(true)}
                              />
                            </div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="w-3.5 h-3.5 text-white/40 hover:text-white/60 transition-colors  flex-shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-xs">
                                  <p className="font-medium mb-1">Plan Usage Progress</p>
                                  <p className="text-xs leading-relaxed mb-2">
                                    This shows how close you are to your current plan limits. The bar fills as you approach any limit (connections, trades, or tokens).
                                  </p>
                                  <p className="text-xs leading-relaxed">
                                    <strong>Reset:</strong> Limits reset monthly on your billing date. Click to view detailed usage.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black p-5 transition-all duration-300 hover:border-white/20 group h-[350px] flex flex-col self-start">
                      <div className="relative h-full flex flex-col">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                            <Database className="w-4 h-4 text-white/70" />
                          </div>
                          <h3 className="text-xs font-medium text-white/80 uppercase tracking-wider">Get Started</h3>
                        </div>
                        <p className="text-xs text-white/60 leading-relaxed mb-4">
                          Connect your exchange or upload CSV files to start analyzing your trading performance
                        </p>
                        
                        {/* Plan Limits */}
                        {(() => {
                          const userTier = subscription?.tier || 'free'
                          const tierLimits = TIER_LIMITS[userTier] || TIER_LIMITS.free
                          return (
                            <div className="space-y-2.5 mb-4">
                              <div className="flex items-center gap-2 text-xs text-white/70">
                                <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
                                <span>Exchange Connections</span>
                                {tierLimits.maxConnections === Infinity ? (
                                  <Infinity className="w-3.5 h-3.5 text-white/50 ml-auto" />
                                ) : (
                                  <span className="text-white/80 font-semibold ml-auto">
                                    {connectedExchanges.length} / {tierLimits.maxConnections}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-white/70">
                                <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
                                <span>Trades Analyzed</span>
                                {tierLimits.maxTradesPerMonth === Infinity ? (
                                  <Infinity className="w-3.5 h-3.5 text-white/50 ml-auto" />
                                ) : (
                                  <span className="text-white/80 font-semibold ml-auto">
                                    {tradesStats?.totalTrades || 0} / {tierLimits.maxTradesPerMonth}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-white/70">
                                <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
                                <span className="flex-1">AI Tokens</span>
                                <span className="text-white/80 font-semibold">
                                  {tokenUsage.used.toLocaleString()} / {tierLimits.maxTokensPerMonth === Infinity ? (
                                    <Infinity className="w-3.5 h-3.5 text-white/50 inline" />
                                  ) : tierLimits.maxTokensPerMonth.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          )
                        })()}
                        
                        {/* Progress Bar - Show for free and trader plans */}
                        {subscription && subscription.tier !== 'pro' && (
                          <div className="pt-3 border-t border-white/10 mb-4">
                            <PlanProgressBar 
                              currentTier={subscription.tier}
                              actualUsage={{
                                connections: connectedExchanges.length,
                                trades: tradesStats?.totalTrades || 0,
                                tokens: tokenUsage.used || 0
                              }}
                              onClick={() => setShowUsageModal(true)}
                            />
                          </div>
                        )}
                        
                        <div className="space-y-2 mt-auto">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={handleOpenConnectModal}
                                  className="w-full text-left text-xs text-white/80 hover:text-white font-medium transition-colors duration-200 flex items-center gap-2 p-3 rounded-lg hover:bg-white/5 border border-white/10 hover:border-white/20 group"
                                >
                                  <LinkIcon className="w-4 h-4 text-white/60 flex-shrink-0" />
                                  <span className="flex-1">Connect Exchange via API</span>
                                  <HelpCircle className="w-3.5 h-3.5 text-white/40 group-hover:text-white/60 transition-colors flex-shrink-0" />
                                  <ChevronRight className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <p className="font-medium mb-1">Connect Exchange via API</p>
                                <p className="text-xs leading-relaxed">
                                  Connect your exchange using API keys for real-time data and automatic updates. Your API keys are encrypted and read-only - we can't execute trades or access your funds.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => router.push('/data')}
                                  className="w-full text-left text-xs text-white/80 hover:text-white font-medium transition-colors duration-200 flex items-center gap-2 p-3 rounded-lg hover:bg-white/5 border border-white/10 hover:border-white/20 group"
                                >
                                  <Upload className="w-4 h-4 text-white/60 flex-shrink-0" />
                                  <span className="flex-1">Upload CSV Files</span>
                                  <HelpCircle className="w-3.5 h-3.5 text-white/40 group-hover:text-white/60 transition-colors flex-shrink-0" />
                                  <ChevronRight className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <p className="font-medium mb-1">Upload CSV Files</p>
                                <p className="text-xs leading-relaxed">
                                  Import your trade history manually by uploading CSV files exported from your exchange. Good for one-time analysis or when you prefer not to use API connections.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </div>
                  )
                ) : subscription && subscription.tier === 'pro' ? (
                  <div className="relative overflow-hidden rounded-xl bg-black p-5 transition-all duration-300 group h-[350px] flex flex-col self-start">
                    <div className="relative h-full flex flex-col">
                      <div className="flex items-center gap-3 mb-4 p-3 rounded-lg border border-white/20 bg-white/5">
                        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                          <Crown className="w-5 h-5 text-white/80" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xs font-medium text-white/80 mb-1 uppercase tracking-wider flex items-center gap-2">
                            PRO Plan
                            <Badge className="bg-white/5 border-white/10 text-white/70 text-[10px] px-1.5 py-0">
                              Active
                            </Badge>
                          </h3>
                          <p className="text-xs text-white/60 leading-relaxed">
                            You have unlimited access to all features
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2.5 mt-auto">
                        <div className="flex items-center gap-2 text-xs text-white/70">
                          <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
                          <span>Unlimited exchange connections</span>
                          <Infinity className="w-3.5 h-3.5 text-white/50 ml-auto" />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/70">
                          <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
                          <span>Unlimited trades analyzed</span>
                          <Infinity className="w-3.5 h-3.5 text-white/50 ml-auto" />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/70">
                          <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
                          <span className="flex-1">AI Tokens</span>
                          <span className="text-white/80 font-semibold">
                            {tokenUsage.used.toLocaleString()} / {tokenUsage.limit.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {tradesStats && tradesStats.totalTrades > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/5">
                          <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                            <span className="text-xs text-white/60">Total Trades Analyzed</span>
                            <span className="text-sm font-semibold text-white/90">{tradesStats.totalTrades.toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-4 pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                          <span className="text-xs text-white/60">Exchanges Connected</span>
                          <span className="text-sm font-semibold text-white/90 flex items-center gap-1">
                            {connectedExchanges.length}
                            {connectedExchanges.length > 0 && (
                              <span className="text-white/40 font-normal ml-1 flex items-center">
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

              {/* AI Chat - Replaces Market Insights */}
              <div className="flex flex-col h-[350px] self-start">
                <div className="flex-1 overflow-hidden min-h-0">
                  <VegaDashboardWidget 
                    onStartChat={() => router.push('/vega')}
                  />
                </div>
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onViewAnalytics}
                      className="group flex-shrink-0 px-4 py-2.5 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 hover:from-emerald-500/20 hover:to-emerald-600/20 border border-emerald-500/30 hover:border-emerald-500/50 rounded-xl text-xs font-semibold text-emerald-300 hover:text-emerald-200 transition-all duration-300 inline-flex items-center gap-2 hover:scale-[1.02] whitespace-nowrap"
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>Explore All</span>
                      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 text-white/40 hover:text-white/60 transition-colors " />
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs">
                          <p className="font-medium mb-1">Explore All Analytics</p>
                          <p className="text-xs leading-relaxed">
                            View comprehensive trading analytics including performance metrics, patterns, insights, and detailed breakdowns of your trading data.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setShowConnectModal(true)}
                        className="group relative overflow-hidden p-5 rounded-xl border border-white/10 bg-black hover:border-white/20 hover:bg-white/5 transition-all duration-300 text-left w-full"
                      >
                        <div className="relative">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-white/5 group-hover:bg-white/10 border border-white/10 rounded-lg flex items-center justify-center transition-all duration-300">
                              <LinkIcon className="w-5 h-5 text-white/70" />
                            </div>
                            <h3 className="text-sm font-medium text-white/90 flex-1">Connect Exchange</h3>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="w-3.5 h-3.5 text-white/40 hover:text-white/60 transition-colors " onClick={(e) => e.stopPropagation()} />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <p className="font-medium mb-1">Connect Exchange via API</p>
                                  <p className="text-xs leading-relaxed">
                                    Connect your exchange using API keys for real-time data and automatic updates. Your API keys are encrypted and read-only - we can't execute trades or access your funds.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <p className="text-xs text-white/60 leading-relaxed">
                            Link via API or CSV
                          </p>
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="font-medium mb-1">Connect Your Exchange</p>
                      <p className="text-xs leading-relaxed">
                        Connect via API keys for real-time data and automatic updates, or upload CSV files for one-time analysis. Your API keys are encrypted and read-only - we can't execute trades or access your funds.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => router.push('/data')}
                        className="group relative overflow-hidden p-5 rounded-xl border border-white/10 bg-black hover:border-white/20 hover:bg-white/5 transition-all duration-300 text-left w-full"
                      >
                        <div className="relative">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-white/5 group-hover:bg-white/10 border border-white/10 rounded-lg flex items-center justify-center transition-all duration-300">
                              <Upload className="w-5 h-5 text-white/70" />
                            </div>
                            <h3 className="text-sm font-medium text-white/90 flex-1">Upload CSV</h3>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="w-3.5 h-3.5 text-white/40 hover:text-white/60 transition-colors " onClick={(e) => e.stopPropagation()} />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <p className="font-medium mb-1">Upload CSV Files</p>
                                  <p className="text-xs leading-relaxed">
                                    Import your trade history manually by uploading CSV files exported from your exchange. Good for one-time analysis or when you prefer not to use API connections.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <p className="text-xs text-white/60 leading-relaxed">
                            Import trade history
                          </p>
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="font-medium mb-1">Upload CSV Files</p>
                      <p className="text-xs leading-relaxed">
                        Import your trade history manually by uploading CSV files exported from your exchange. Good for one-time analysis or when you prefer not to use API connections.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <button
                  onClick={onTryDemo}
                  className="group relative overflow-hidden p-5 rounded-xl border border-white/10 bg-black hover:border-white/20 hover:bg-white/5 transition-all duration-300 text-left"
                >
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-white/5 group-hover:bg-white/10 border border-white/10 rounded-lg flex items-center justify-center transition-all duration-300">
                        <Play className="w-5 h-5 text-white/70" />
                      </div>
                      <h3 className="text-sm font-medium text-white/90">Try Demo</h3>
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed">
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
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                      <Database className="w-4 h-4 text-white/70" />
                    </div>
                    <h2 className="text-sm font-medium text-white/90 flex items-center gap-2">
                      Data Sources ({connectedExchanges.length + unlinkedFiles.length})
                    </h2>
                  </div>
                  {(connectedExchanges.length > 0 || unlinkedFiles.length > 0) && (
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        onClick={selectAll}
                        className="text-white/70 hover:text-white transition-colors font-medium"
                      >
                        Select All
                      </button>
                      <Separator className="text-white/10" />
                      <button
                        onClick={deselectAll}
                        className="text-white/50 hover:text-white/70 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowConnectModal(true)}
                  className="group text-xs text-white/70 hover:text-white transition-colors flex items-center gap-1.5 font-medium hover:gap-2"
                >
                  <Plus className="w-3.5 h-3.5 transition-transform group-hover:rotate-90" />
                  Add
                </button>
              </div>

              {loadingExchanges || loadingFiles ? (
                <DataSourceSkeleton count={2} />
              ) : connectedExchanges.length === 0 && unlinkedFiles.length === 0 ? (
                <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black p-10 md:p-12 text-center">
                  <div className="relative">
                    <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Database className="w-8 h-8 text-white/50" />
                    </div>
                    <p className="text-sm font-medium text-white/80 mb-2">
                      No data sources yet
                    </p>
                    <p className="text-xs text-white/60 mb-6 max-w-md mx-auto">
                      Connect an exchange or upload CSV files to get started with powerful trading insights
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowConnectModal(true)}
                          className="group px-5 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 rounded-lg text-sm font-medium transition-all duration-300 inline-flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Connect Exchange
                        </button>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-4 h-4 text-white/40 hover:text-white/60 transition-colors " />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="font-medium mb-1">Connect Exchange via API</p>
                              <p className="text-xs leading-relaxed">
                                Connect your exchange using API keys for real-time data and automatic updates. Your API keys are encrypted and read-only - we can't execute trades or access your funds.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push('/data')}
                          className="group px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-sm font-medium transition-all duration-300 inline-flex items-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          Upload CSV
                        </button>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-4 h-4 text-white/40 hover:text-white/60 transition-colors " />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="font-medium mb-1">Upload CSV Files</p>
                              <p className="text-xs leading-relaxed">
                                Import your trade history manually by uploading CSV files exported from your exchange. Good for one-time analysis or when you prefer not to use API connections.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Connected Exchanges */}
                  {connectedExchanges.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium text-white/60 mb-3 px-1 uppercase tracking-wider">
                        {connectedExchanges.some(e => e.exchange === 'snaptrade') 
                          ? 'Connections' 
                          : 'API Connections'}
                      </h3>
                      <div className="space-y-2">
                        {connectedExchanges.map(exchange => {
                          const selected = isSourceSelected('exchange', exchange.id)
                          const linkedCount = getLinkedFilesCount(exchange.id)
                          return (
                            <div
                              key={exchange.id}
                              onClick={() => toggleSource('exchange', exchange.id)}
                              className={`group relative overflow-hidden rounded-xl border ${
                                selected
                                  ? 'border-white/20 bg-white/5'
                                  : 'border-white/10 bg-black'
                              } p-4 transition-all duration-300 cursor-pointer hover:border-white/20 hover:bg-white/5`}
                            >
                              <div className="relative">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                                      selected
                                        ? 'border-white/40 bg-white/20'
                                        : 'border-white/20 bg-transparent group-hover:border-white/30'
                                    }`}>
                                      {selected && <CheckSquare className="w-3 h-3 text-white/90" />}
                                    </div>
                                    <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center p-2">
                                      <ExchangeIcon exchange={exchange.exchange} size={20} className="w-full h-full" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1.5">
                                        <span className="text-sm font-medium text-white/90">{exchange.name}</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-xs">
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                                          <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                                          </span>
                                          <span className="text-emerald-400 font-medium">
                                            {exchange.exchange === 'snaptrade' 
                                              ? (exchange.primaryBrokerage || exchange.brokerageNames?.[0] 
                                                  ? exchange.primaryBrokerage || exchange.brokerageNames[0]
                                                  : 'Brokerage')
                                              : 'API'}
                                          </span>
                                        </div>
                                        {linkedCount > 0 && (
                                          <>
                                            <Separator className="text-white/10" />
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20">
                                              <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
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
                                      className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 rounded-lg text-xs font-medium text-white/80 transition-all duration-300"
                                    >
                                      View
                                    </button>
                                    <button
                                      onClick={() => handleDeleteClick(exchange)}
                                      className="p-2 text-white/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-300 border border-transparent hover:border-red-500/20"
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
                      <h3 className="text-xs font-medium text-white/60 mb-3 px-1 uppercase tracking-wider">Uploaded Files (Not Linked)</h3>
                      <div className="space-y-2">
                        {unlinkedFiles.map(file => {
                          const selected = isSourceSelected('csv', file.id)
                          return (
                            <div
                              key={file.id}
                              onClick={() => toggleSource('csv', file.id)}
                              className={`group relative overflow-hidden rounded-xl border ${
                                selected
                                  ? 'border-white/20 bg-white/5'
                                  : 'border-white/10 bg-black'
                              } p-4 transition-all duration-300 cursor-pointer hover:border-white/20 hover:bg-white/5`}
                            >
                              <div className="relative">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-300 ${
                                      selected
                                        ? 'border-white/40 bg-white/20'
                                        : 'border-white/20 bg-transparent group-hover:border-white/30'
                                    }`}>
                                      {selected && <CheckSquare className="w-3 h-3 text-white/90" />}
                                    </div>
                                    <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center">
                                      <FileText className="w-6 h-6 text-white/70" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                        <span className="text-sm font-medium text-white/90 truncate">
                                          {file.label || file.filename}
                                        </span>
                                        <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-white/60 text-[10px] font-medium rounded-md">
                                          {file.account_type}
                                        </span>
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded-md">
                                          <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                                          </span>
                                          <span className="text-cyan-400 text-[10px] font-medium">CSV</span>
                                        </div>
                                      </div>
                                      <p className="text-xs text-white/50">
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
                        className={`group flex-1 py-3.5 rounded-xl font-medium text-sm transition-all duration-300 inline-flex items-center justify-center gap-2 ${
                          selectedSources.length > 0
                            ? 'bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 text-white/90'
                            : 'bg-white/5 text-white/40 cursor-not-allowed border border-white/10'
                        }`}
                      >
                        <Sparkles className="w-4 h-4" />
                        Analyze Selected ({selectedSources.length})
                      </button>
                      <button
                        onClick={() => onViewAnalytics()}
                        className="group flex-1 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl font-medium text-sm text-white/80 hover:text-white/90 transition-all duration-300 inline-flex items-center justify-center gap-2"
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
          trades: tradesStats?.totalTrades || 0,
          tokens: tokenUsage.used || 0
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

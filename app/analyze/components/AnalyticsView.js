// app/analyze/components/AnalyticsView.js
'use client'

import { useState } from 'react'
import {
  DollarSign, TrendingUp, Target, Activity, Award, Brain,
  CheckCircle, AlertTriangle, Lightbulb, Clock, Calendar,
  Zap, Layers, TrendingDown, Eye, Flame, Trophy, Shield,
  BarChart3, PieChart, LineChart, ArrowUpRight, ArrowDownRight,
  AlertCircle, Sparkles, ChevronRight, ChevronLeft, ChevronDown,
  Scissors, Shuffle
} from 'lucide-react'
import Sidebar from './Sidebar'
import {
  AreaChart, Area, BarChart, Bar, LineChart as RechartsLineChart,
  Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart,
  Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar
} from 'recharts'
import Header from './Header'
import {
  Card,
  IconBadge,
  MetricDisplay,
  SectionHeader,
  SectionHeaderWithAction,
  FilterButton,
  TabButton,
  Modal,
  ModalSection,
  ModalDescription,
  ModalMetrics,
  ModalActionSteps,
  HeroSkeleton,
  ChartSkeleton,
  CardGridSkeleton,
  TableSkeleton,
  LimitedDataNotice,
  DataQualityBanner,
  EmptyState
} from '../../components'

// Icon mapper for string icon names to Lucide components
const ICON_MAP = {
  Target,
  CheckCircle,
  TrendingUp,
  Award,
  Scissors,
  AlertTriangle,
  AlertCircle,
  Calendar,
  Zap,
  Shuffle,
  Lightbulb,
  DollarSign,
  Brain,
  BarChart3,
  Clock,
  Activity,
  Flame,
  Eye,
  Trophy
}

const getIconComponent = (iconName) => {
  if (typeof iconName === 'string') {
    return ICON_MAP[iconName] || Lightbulb
  }
  return iconName || Lightbulb
}

// ============================================
// HERO SECTION - REDESIGNED
// ============================================

function HeroSection({ analytics, currSymbol, metadata }) {
  const isProfitable = analytics.totalPnL >= 0
  const psychology = analytics.psychology || {}
  const tradeCount = analytics.totalTrades || 0
  const symbolCount = Object.keys(analytics.symbols || {}).length

  return (
    <div className="space-y-6">
      {/* Limited Data Notice - Show if user has fewer than 20 trades */}
      <LimitedDataNotice tradeCount={tradeCount} minRecommended={20} />

      {/* Data Quality Banner - Show if user has good data (50+ trades) */}
      <DataQualityBanner tradeCount={tradeCount} symbolCount={symbolCount} />

      {/* Featured P&L Card - The Star */}
      <div className="relative group">
        <div className={`absolute inset-0 rounded-3xl blur-2xl group-hover:blur-3xl transition-all ${
          isProfitable
            ? 'bg-gradient-to-r from-emerald-500/10 to-emerald-500/5'
            : 'bg-gradient-to-r from-red-500/10 to-red-500/5'
        }`} />

        <div className="relative bg-slate-900 backdrop-blur-xl border border-slate-700/50 rounded-2xl md:rounded-3xl p-6 md:p-8 lg:p-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
            {/* Left: Main P&L */}
            <div className="text-center md:text-left w-full md:w-auto">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center ${
                  isProfitable ? 'bg-emerald-500/20' : 'bg-red-500/20'
                }`}>
                  <DollarSign className={`w-6 h-6 md:w-8 md:h-8 ${isProfitable ? 'text-emerald-400' : 'text-red-400'}`} />
                </div>
                <div className="text-left">
                  <div className="text-xs md:text-sm text-slate-400 uppercase tracking-wider font-medium">Total Profit & Loss</div>
                  <div className="text-[10px] md:text-xs text-slate-500">All time performance</div>
                </div>
              </div>

              <div className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-2 ${
                isProfitable ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {isProfitable ? '+' : ''}{currSymbol}{Math.abs(analytics.totalPnL).toFixed(2)}
              </div>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-4 text-xs md:text-sm text-slate-400">
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3 md:w-4 md:h-4" />
                  {analytics.totalTrades} trades
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 md:w-4 md:h-4" />
                  {analytics.roi?.toFixed(1) || '0.0'}% ROI
                </span>
              </div>
            </div>
            
            {/* Right: Quick Stats */}
            <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
              <QuickStat
                label="Win Rate"
                value={`${analytics.winRate.toFixed(1)}%`}
                subtitle={`${analytics.winningTrades}W / ${analytics.losingTrades}L`}
                icon={Target}
                good={analytics.winRate >= 55}
              />
              <QuickStat
                label="Profit Factor"
                value={analytics.profitFactor.toFixed(2)}
                subtitle={analytics.profitFactor >= 2 ? 'Excellent' : 'Good'}
                icon={TrendingUp}
                good={analytics.profitFactor >= 1.5}
              />
              <QuickStat
                label="Best Symbol"
                value={analytics.bestSymbol || 'N/A'}
                subtitle={analytics.symbols[analytics.bestSymbol]?.winRate.toFixed(0) + '% WR' || ''}
                icon={Award}
              />
              <QuickStat
                label="Discipline"
                value={psychology.disciplineScore || 50}
                subtitle="/100"
                icon={Brain}
                good={psychology.disciplineScore >= 70}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio Overview - Show if metadata is available */}
      {metadata && metadata.totalPortfolioValue > 0 && (
        <Card variant="glass" className="overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-700/50">
            {/* Total Portfolio Value */}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <IconBadge icon={Layers} color="purple" size="sm" />
                <span className="text-xs text-slate-400 uppercase tracking-wider">Portfolio Value</span>
              </div>
              <div className="text-3xl font-bold text-purple-400 mb-1">
                {currSymbol}{metadata.totalPortfolioValue.toFixed(2)}
              </div>
              <div className="text-xs text-slate-500">
                {metadata.accountType === 'MIXED' ? 'Spot + Futures' : metadata.accountType}
              </div>
            </div>

            {/* Spot Holdings */}
            {metadata.totalSpotValue > 0 && (
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <IconBadge icon={DollarSign} color="emerald" size="sm" />
                  <span className="text-xs text-slate-400 uppercase tracking-wider">Spot Holdings</span>
                </div>
                <div className="text-3xl font-bold text-emerald-400 mb-1">
                  {currSymbol}{metadata.totalSpotValue.toFixed(2)}
                </div>
                <div className="text-xs text-slate-500">
                  {metadata.spotHoldings?.length || 0} assets
                </div>
              </div>
            )}

            {/* Futures Balance */}
            {metadata.totalFuturesValue > 0 && (
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <IconBadge icon={Zap} color="cyan" size="sm" />
                  <span className="text-xs text-slate-400 uppercase tracking-wider">Futures Balance</span>
                </div>
                <div className="text-3xl font-bold text-cyan-400 mb-1">
                  {currSymbol}{metadata.totalFuturesValue.toFixed(2)}
                </div>
                <div className="text-xs text-slate-500">
                  {metadata.futuresPositions || 0} open positions
                </div>
              </div>
            )}

            {/* Trading Period */}
            {metadata.tradingPeriodDays > 0 && (
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <IconBadge icon={Calendar} color="yellow" size="sm" />
                  <span className="text-xs text-slate-400 uppercase tracking-wider">Trading Period</span>
                </div>
                <div className="text-3xl font-bold text-yellow-400 mb-1">
                  {metadata.tradingPeriodDays}
                </div>
                <div className="text-xs text-slate-500">days active</div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Account Type Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AccountTypeCard
          type="Spot"
          trades={analytics.spotTrades}
          pnl={analytics.spotPnL}
          winRate={analytics.spotWinRate}
          currSymbol={currSymbol}
          icon={DollarSign}
          iconColor="emerald"
        />
        <AccountTypeCard
          type="Futures"
          trades={analytics.futuresTrades}
          pnl={analytics.futuresPnL}
          winRate={analytics.futuresWinRate}
          currSymbol={currSymbol}
          icon={Zap}
          iconColor="cyan"
        />
      </div>
    </div>
  )
}

// QuickStat now uses the reusable MetricDisplay component
function QuickStat({ label, value, subtitle, icon, good }) {
  return (
    <MetricDisplay
      label={label}
      value={value}
      subtitle={subtitle}
      icon={icon}
      good={good}
    />
  )
}

function AccountTypeCard({ type, trades, pnl, winRate, currSymbol, icon: Icon, iconColor }) {
  if (trades === 0) return null

  const isProfitable = pnl >= 0

  return (
    <Card variant="glass" className="hover:border-slate-600/50 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <IconBadge icon={Icon} color={iconColor} size="md" />
          <div>
            <h3 className="font-bold text-lg">{type} Trading</h3>
            <p className="text-xs text-slate-400">{trades} trades</p>
          </div>
        </div>
        <div className={`text-2xl font-bold ${isProfitable ? 'text-emerald-400' : 'text-red-400'}`}>
          {isProfitable ? '+' : ''}{currSymbol}{pnl.toFixed(2)}
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm text-slate-400">
        <span>Win Rate: <span className="text-white font-semibold">{winRate.toFixed(1)}%</span></span>
      </div>
    </Card>
  )
}

// ============================================
// PSYCHOLOGY SCORE - WITH ICONS
// ============================================

function PsychologyScoreCompact({ score, analytics }) {
  const getScoreInfo = (score) => {
    if (score >= 80) return { color: 'emerald', icon: Trophy, label: 'Excellent', iconColor: 'text-emerald-400', bgColor: 'bg-emerald-500/20' }
    if (score >= 70) return { color: 'cyan', icon: CheckCircle, label: 'Good', iconColor: 'text-cyan-400', bgColor: 'bg-cyan-500/20' }
    if (score >= 60) return { color: 'yellow', icon: AlertCircle, label: 'Fair', iconColor: 'text-yellow-400', bgColor: 'bg-yellow-500/20' }
    if (score >= 50) return { color: 'orange', icon: TrendingUp, label: 'Needs Work', iconColor: 'text-orange-400', bgColor: 'bg-orange-500/20' }
    return { color: 'red', icon: AlertTriangle, label: 'Critical', iconColor: 'text-red-400', bgColor: 'bg-red-500/20' }
  }
  
  const scoreInfo = getScoreInfo(score)
  const percentage = (score / 100) * 100
  const ScoreIcon = scoreInfo.icon
  
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <IconBadge icon={Brain} color="purple" size="lg" />
          <div>
            <h3 className="text-xl font-bold">Psychology Score</h3>
            <p className="text-sm text-slate-400">Trading discipline rating</p>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-5xl font-bold ${
            scoreInfo.color === 'emerald' ? 'text-emerald-400' :
            scoreInfo.color === 'cyan' ? 'text-cyan-400' :
            scoreInfo.color === 'yellow' ? 'text-yellow-400' :
            scoreInfo.color === 'orange' ? 'text-orange-400' :
            'text-red-400'
          }`}>
            {score}
          </div>
          <div className="text-sm text-slate-400">/100</div>
        </div>
      </div>
      
      {/* Progress Bar - Now properly filled */}
      <div className="mb-4">
        <div className="h-3 bg-slate-800/50 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ease-out ${
              scoreInfo.color === 'emerald' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
              scoreInfo.color === 'cyan' ? 'bg-gradient-to-r from-cyan-500 to-cyan-400' :
              scoreInfo.color === 'yellow' ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
              scoreInfo.color === 'orange' ? 'bg-gradient-to-r from-orange-500 to-orange-400' :
              'bg-gradient-to-r from-red-500 to-red-400'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${scoreInfo.bgColor}`}>
            <ScoreIcon className={`w-4 h-4 ${scoreInfo.iconColor}`} />
          </div>
          <span className={`font-semibold ${scoreInfo.iconColor}`}>{scoreInfo.label}</span>
        </div>
        <div className="text-slate-400">
          {score >= 70 ? 'Keep it up!' : score >= 50 ? 'Room for improvement' : 'Focus on discipline'}
        </div>
      </div>
    </div>
  )
}

// ============================================
// HIDDEN PATTERNS - PROFESSIONAL ICONS
// ============================================

function PatternDetectionEnhanced({ patterns }) {
  const [expanded, setExpanded] = useState(true)
  
  // Sort by severity: high → medium → low
  const severityOrder = { high: 0, medium: 1, low: 2 }
  const sortedPatterns = [...patterns].sort((a, b) => 
    severityOrder[a.severity] - severityOrder[b.severity]
  )
  
  const criticalPatterns = sortedPatterns.filter(p => p.severity === 'high')
  const otherPatterns = sortedPatterns.filter(p => p.severity !== 'high')
  
  return (
    <div className="space-y-4">
      {/* Section Header */}
      <SectionHeaderWithAction
        icon={Eye}
        title="Hidden Patterns Detected"
        subtitle={`${patterns.length} insights from your data`}
        color="cyan"
        action={
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        }
      />
      
      {expanded && (
        <div className="space-y-4">
          {/* Critical Patterns - Full Width, Prominent */}
          {criticalPatterns.map((pattern, i) => {
            const IconComponent = pattern.icon
            return (
              <div key={`critical-${i}`} className="relative group animate-pulse-subtle">
                <div className="absolute inset-0 bg-red-500/10 rounded-xl blur-xl" />
                <div className="relative bg-gradient-to-r from-red-500/20 to-orange-500/20 border-2 border-red-500/50 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <IconBadge icon={IconComponent} color="red" size="lg" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-lg text-red-400 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5" />
                          {pattern.title}
                        </h4>
                        <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold uppercase">
                          Critical
                        </span>
                      </div>
                      <p className="text-slate-300 mb-3">{pattern.description}</p>
                      {pattern.stats && (
                        <div className="flex flex-wrap gap-4 text-sm">
                          {Object.entries(pattern.stats).map(([key, value]) => (
                            <div key={key} className="bg-slate-800/50 px-3 py-1 rounded-lg">
                              <span className="text-slate-400">{key}:</span>{' '}
                              <span className="text-white font-mono font-bold">{value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          
          {/* Other Patterns - Compact Grid */}
          {otherPatterns.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {otherPatterns.map((pattern, i) => {
                const IconComponent = pattern.icon
                return (
                  <div
                    key={`other-${i}`}
                    className={`bg-slate-800/30 border rounded-xl p-4 hover:border-slate-500/50 transition-all ${
                      pattern.severity === 'medium' ? 'border-yellow-500/30' : 'border-slate-700/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <IconBadge
                        icon={IconComponent}
                        color={pattern.severity === 'medium' ? 'yellow' : 'emerald'}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold truncate">{pattern.title}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ml-2 ${
                            pattern.severity === 'medium' 
                              ? 'bg-yellow-500/20 text-yellow-400' 
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {pattern.severity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2">{pattern.description}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// KEY INSIGHTS - WITH ICONS
// ============================================

function InsightCardsEnhanced({ insights, onSelectInsight }) {
  // Sort by impact: 3 → 2 → 1
  const sortedInsights = [...insights].sort((a, b) => (b.impact || 0) - (a.impact || 0))
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Sparkles className="w-6 h-6 text-yellow-400" />
        <h3 className="text-xl font-bold">Key Insights</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        {sortedInsights.map((insight, i) => {
          // High impact = larger cards
          const isHighImpact = insight.impact >= 3
          const colSpan = isHighImpact ? 'md:col-span-3' : 'md:col-span-2'
          
          return (
            <InsightCardVariable
              key={i}
              insight={insight}
              onClick={() => onSelectInsight(insight)}
              className={colSpan}
              featured={isHighImpact}
            />
          )
        })}
      </div>
    </div>
  )
}

function InsightCardVariable({ insight, onClick, className, featured }) {
  const typeStyles = {
    strength: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/60',
    weakness: 'from-red-500/10 to-red-500/5 border-red-500/30 hover:border-red-500/60',
    recommendation: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/30 hover:border-cyan-500/60',
    pattern: 'from-purple-500/10 to-purple-500/5 border-purple-500/30 hover:border-purple-500/60'
  }
  
  const iconStyles = {
    strength: 'text-emerald-400 bg-emerald-500/20',
    weakness: 'text-red-400 bg-red-500/20',
    recommendation: 'text-cyan-400 bg-cyan-500/20',
    pattern: 'text-purple-400 bg-purple-500/20'
  }

  const IconComponent = getIconComponent(insight.icon)
  
  const iconColor = insight.type === 'strength' ? 'emerald' :
    insight.type === 'weakness' ? 'red' :
    insight.type === 'recommendation' ? 'cyan' : 'purple'

  return (
    <div
      onClick={onClick}
      className={`bg-gradient-to-br ${typeStyles[insight.type]} border backdrop-blur-sm rounded-xl cursor-pointer transition-all hover:scale-105 hover:shadow-2xl group ${className} ${
        featured ? 'p-6' : 'p-4'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <IconBadge
          icon={IconComponent}
          color={iconColor}
          size={featured ? 'lg' : 'md'}
        />
        <div className="flex items-center gap-2">
          {/* Impact Dots */}
          {insight.impact && (
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i < insight.impact 
                      ? iconStyles[insight.type].split(' ')[0].replace('text-', 'bg-') + ' scale-100'
                      : 'bg-slate-700 scale-75'
                  }`}
                />
              ))}
            </div>
          )}
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
        </div>
      </div>
      
      <h4 className={`font-semibold text-white mb-2 ${featured ? 'text-lg' : 'text-base'}`}>
        {insight.title}
      </h4>
      <p className={`text-slate-300 leading-relaxed ${featured ? 'text-sm' : 'text-xs line-clamp-2'}`}>
        {insight.summary}
      </p>
      
      {featured && (
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
          <Lightbulb className="w-4 h-4 text-yellow-400" />
          <span>Click for actionable steps</span>
        </div>
      )}
    </div>
  )
}

// ============================================
// CHARTS - ENHANCED WITH FILTERS
// ============================================

function ChartsSection({ analytics, currSymbol }) {
  const [timeRange, setTimeRange] = useState('all')
  
  return (
    <div className="space-y-4">
      {/* Section Header with Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-emerald-400" />
          <h3 className="text-xl font-bold">Performance Charts</h3>
        </div>
        
        <div className="flex gap-2">
          {['7d', '30d', 'all'].map((range) => (
            <FilterButton
              key={range}
              active={timeRange === range}
              onClick={() => setTimeRange(range)}
            >
              {range === 'all' ? 'All Time' : `Last ${range.toUpperCase()}`}
            </FilterButton>
          ))}
        </div>
      </div>
      
      {/* Charts Grid - Bigger */}
      <div className="grid grid-cols-1 gap-6">
        <ChartCardBig title="Performance Over Time" icon={Calendar}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analytics.monthlyData}>
              <defs>
                <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="month" 
                stroke="#64748b" 
                style={{ fontSize: '13px' }}
                tickMargin={10}
              />
              <YAxis 
                stroke="#64748b" 
                style={{ fontSize: '13px' }}
                tickFormatter={(value) => `${currSymbol}${value}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155', 
                  borderRadius: '12px',
                  fontSize: '14px',
                  padding: '12px'
                }}
                formatter={(value) => [`${currSymbol}${value.toFixed(2)}`, 'P&L']}
              />
              <Area 
                type="monotone" 
                dataKey="pnl" 
                stroke="#10b981" 
                fillOpacity={1} 
                fill="url(#colorPnl)" 
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCardBig>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCardBig title="Day of Week Performance" icon={Calendar}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={analytics.dayPerformance}>
                <XAxis 
                  dataKey="day" 
                  stroke="#64748b" 
                  style={{ fontSize: '13px' }}
                  tickMargin={10}
                />
                <YAxis 
                  stroke="#64748b" 
                  style={{ fontSize: '13px' }}
                  tickFormatter={(value) => `${currSymbol}${value}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155', 
                    borderRadius: '12px',
                    fontSize: '14px',
                    padding: '12px'
                  }}
                  formatter={(value) => [`${currSymbol}${value.toFixed(2)}`, 'P&L']}
                />
                <Bar dataKey="pnl" radius={[8, 8, 0, 0]}>
                  {analytics.dayPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCardBig>
          
          <ChartCardBig title="Hour Performance" icon={Clock}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={analytics.hourPerformance?.slice(0, 12) || []}>
                <XAxis 
                  dataKey="hour" 
                  stroke="#64748b" 
                  style={{ fontSize: '13px' }}
                  tickMargin={10}
                  tickFormatter={(hour) => `${hour}:00`}
                />
                <YAxis 
                  stroke="#64748b" 
                  style={{ fontSize: '13px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155', 
                    borderRadius: '12px',
                    fontSize: '14px',
                    padding: '12px'
                  }}
                  formatter={(value) => [`${currSymbol}${value.toFixed(2)}`, 'P&L']}
                />
                <Bar dataKey="pnl" radius={[8, 8, 0, 0]} fill="#06b6d4" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCardBig>
        </div>
      </div>
    </div>
  )
}

function ChartCardBig({ title, icon: Icon, children }) {
  return (
    <Card variant="glass" className="rounded-2xl">
      <h3 className="font-semibold mb-6 flex items-center gap-2 text-lg">
        <Icon className="w-5 h-5 text-emerald-400" />
        {title}
      </h3>
      {children}
    </Card>
  )
}

// ============================================
// INSIGHT MODAL
// ============================================

function InsightModal({ insight, onClose }) {
  if (!insight) return null

  const iconColor = insight.type === 'strength' ? 'emerald' :
    insight.type === 'weakness' ? 'red' : 'cyan'

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={insight.title}
      icon={insight.icon}
      iconColor={iconColor}
    >
      <ModalSection>
        <div className="text-sm text-slate-400 mb-4">{insight.category || insight.type}</div>
        <ModalDescription>{insight.description}</ModalDescription>

        {insight.data && <ModalMetrics data={insight.data} />}

        {insight.actionSteps && (
          <ModalActionSteps steps={insight.actionSteps} icon={Lightbulb} />
        )}
      </ModalSection>
    </Modal>
  )
}

// ============================================
// SYMBOLS TABLE - COMPACT
// ============================================

function SymbolsTable({ symbols, filter, currSymbol }) {
  const filteredSymbols = Object.entries(symbols)
    .filter(([_, data]) => !filter || data.accountType === filter)
    .sort((a, b) => (b[1].realized || 0) - (a[1].realized || 0))
    .slice(0, 10) // Show top 10

  if (filteredSymbols.length === 0) {
    return (
      <Card variant="glass" className="p-8 text-center text-slate-400">
        <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No {filter?.toLowerCase()} symbols found</p>
      </Card>
    )
  }

  return (
    <Card variant="glass" className="overflow-hidden p-0">
      <div className="p-5 border-b border-slate-700/50">
        <h3 className="font-semibold flex items-center gap-2 text-lg">
          <Layers className="w-5 h-5 text-emerald-400" />
          Top Performing Symbols
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-slate-400 border-b border-slate-700/50">
              <th className="p-4 font-medium">Symbol</th>
              <th className="p-4 text-right font-medium">P&L</th>
              <th className="p-4 text-right font-medium">Trades</th>
              <th className="p-4 text-right font-medium">Win Rate</th>
              <th className="p-4 text-right font-medium">W/L</th>
            </tr>
          </thead>
          <tbody>
            {filteredSymbols.map(([symbol, data], idx) => (
              <tr key={symbol} className="border-b border-slate-800/30 hover:bg-slate-700/20 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </div>
                    <span className="font-mono font-semibold">{symbol}</span>
                  </div>
                </td>
                <td className={`p-4 text-right font-bold text-lg ${
                  (data.realized || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {(data.realized || 0) >= 0 ? '+' : ''}{currSymbol}{(data.realized || 0).toFixed(2)}
                </td>
                <td className="p-4 text-right text-slate-300 font-semibold">{data.trades}</td>
                <td className="p-4 text-right">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    data.winRate >= 60 ? 'bg-emerald-500/20 text-emerald-400' :
                    data.winRate >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {data.winRate.toFixed(0)}%
                  </span>
                </td>
                <td className="p-4 text-right text-slate-400 text-sm font-medium">
                  {data.wins}W / {data.losses}L
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ============================================
// TAB CONTENT COMPONENTS
// ============================================

function OverviewTab({ analytics, currSymbol }) {
  const [selectedInsight, setSelectedInsight] = useState(null)
  const psychology = analytics.psychology || {}
  
  const insights = generateEnhancedInsights(analytics, psychology)
  const patterns = detectHiddenPatterns(analytics, psychology)
  
  return (
    <div className="space-y-8">
      {/* Psychology Score */}
      <PsychologyScoreCompact score={psychology.disciplineScore || 50} analytics={analytics} />
      
      {/* Hidden Patterns */}
      <PatternDetectionEnhanced patterns={patterns} />
      
      {/* Key Insights */}
      <InsightCardsEnhanced insights={insights} onSelectInsight={setSelectedInsight} />
      
      {/* Charts */}
      <ChartsSection analytics={analytics} currSymbol={currSymbol} />
      
      {/* Symbol Performance */}
      <SymbolsTable symbols={analytics.symbols} currSymbol={currSymbol} />
      
      {/* Modal */}
      {selectedInsight && (
        <InsightModal insight={selectedInsight} onClose={() => setSelectedInsight(null)} />
      )}
    </div>
  )
}

function SpotTab({ analytics, currSymbol, metadata }) {
  const spotAnalysis = analytics.spotAnalysis || {}
  const hasSpotData = analytics.spotTrades > 0

  // Show empty state if no spot data
  if (!hasSpotData) {
    return (
      <EmptyState
        icon={DollarSign}
        title="No Spot Trading Data"
        description="You haven't made any spot trades yet. Spot trading involves buying and holding crypto assets directly. Start spot trading to see your portfolio breakdown and performance analytics here."
        variant="info"
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <QuickStat label="Spot P&L" value={`${currSymbol}${analytics.spotPnL?.toFixed(2) || '0.00'}`} icon={DollarSign} good={analytics.spotPnL >= 0} />
        <QuickStat label="ROI" value={`${analytics.spotRoi?.toFixed(1) || '0.0'}%`} icon={TrendingUp} good={analytics.spotRoi >= 0} />
        <QuickStat label="Win Rate" value={`${analytics.spotWinRate?.toFixed(1) || '0.0'}%`} subtitle={`${analytics.spotWins || 0}W / ${analytics.spotLosses || 0}L`} icon={Target} good={analytics.spotWinRate >= 55} />
        <QuickStat label="Invested" value={`${currSymbol}${analytics.spotInvested?.toFixed(0) || '0'}`} icon={Activity} />
      </div>

      {/* Current Spot Holdings */}
      {metadata?.spotHoldings && metadata.spotHoldings.length > 0 && (
        <Card variant="glass" className="overflow-hidden p-0">
          <div className="p-5 border-b border-slate-700/50">
            <h3 className="font-semibold flex items-center gap-2 text-lg">
              <Layers className="w-5 h-5 text-emerald-400" />
              Current Spot Holdings
            </h3>
            <p className="text-sm text-slate-400 mt-1">Your current asset balances valued at market price</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-slate-400 border-b border-slate-700/50">
                  <th className="p-4 font-medium">Asset</th>
                  <th className="p-4 text-right font-medium">Quantity</th>
                  <th className="p-4 text-right font-medium">Price</th>
                  <th className="p-4 text-right font-medium">USD Value</th>
                </tr>
              </thead>
              <tbody>
                {metadata.spotHoldings
                  .sort((a, b) => b.usdValue - a.usdValue)
                  .map((holding, idx) => (
                    <tr key={holding.asset} className="border-b border-slate-800/30 hover:bg-slate-700/20 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400">
                            {holding.asset.slice(0, 2)}
                          </div>
                          <span className="font-mono font-semibold">{holding.asset}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right font-mono text-slate-300">
                        {holding.quantity?.toFixed(4) || '0.0000'}
                      </td>
                      <td className="p-4 text-right font-mono text-slate-400">
                        {currSymbol}{holding.price?.toFixed(4) || '0.0000'}
                      </td>
                      <td className="p-4 text-right font-bold text-lg text-emerald-400">
                        {currSymbol}{holding.usdValue?.toFixed(2) || '0.00'}
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-800/50 font-bold">
                  <td className="p-4" colSpan="3">Total Portfolio Value</td>
                  <td className="p-4 text-right text-xl text-emerald-400">
                    {currSymbol}{metadata.totalSpotValue.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* Insights */}
      <Card variant="glass">
        <h3 className="font-semibold mb-4 flex items-center gap-2 text-lg">
          <Brain className="w-5 h-5 text-purple-400" />
          Spot Trading Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="text-sm font-semibold text-slate-400 mb-2">Position Management</div>
            <div className="text-sm text-slate-300 space-y-1">
              <p>• Avg winner held: {spotAnalysis.avgWin > 0 ? '~2-4 hours' : 'N/A'}</p>
              <p>• Avg loser held: {spotAnalysis.avgLoss > 0 ? '~4-8 hours' : 'N/A'}</p>
              <p>• Largest win: {currSymbol}{spotAnalysis.largestWin?.toFixed(2) || '0.00'}</p>
              <p>• Largest loss: {currSymbol}{spotAnalysis.largestLoss?.toFixed(2) || '0.00'}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="text-sm font-semibold text-slate-400 mb-2">Trading Stats</div>
            <div className="text-sm text-slate-300 space-y-1">
              <p>• Total trades: {analytics.spotTrades || 0}</p>
              <p>• Completed: {analytics.spotCompletedTrades || 0}</p>
              <p>• Max consecutive wins: {spotAnalysis.maxConsecutiveWins || 0}</p>
              <p>• Max consecutive losses: {spotAnalysis.maxConsecutiveLosses || 0}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Symbols */}
      <SymbolsTable symbols={analytics.symbols} filter="SPOT" currSymbol={currSymbol} />
    </div>
  )
}

function FuturesTab({ analytics, currSymbol }) {
  const futuresAnalysis = analytics.futuresAnalysis || {}
  const hasFuturesData = analytics.futuresTrades > 0

  // Show empty state if no futures data
  if (!hasFuturesData) {
    return (
      <EmptyState
        icon={Zap}
        title="No Futures Trading Data"
        description="You haven't made any futures trades yet. Futures trading involves leveraged positions and can offer higher returns (and risks). Start futures trading to see advanced metrics like funding fees, leverage analysis, and position management here."
        variant="info"
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <QuickStat label="Net P&L" value={`${currSymbol}${analytics.futuresPnL?.toFixed(2) || '0.00'}`} icon={DollarSign} good={analytics.futuresPnL >= 0} />
        <QuickStat label="Realized" value={`${currSymbol}${analytics.futuresRealizedPnL?.toFixed(2) || '0.00'}`} icon={CheckCircle} good={analytics.futuresRealizedPnL >= 0} />
        <QuickStat label="Unrealized" value={`${currSymbol}${analytics.futuresUnrealizedPnL?.toFixed(2) || '0.00'}`} icon={Clock} good={analytics.futuresUnrealizedPnL >= 0} />
        <QuickStat label="Win Rate" value={`${analytics.futuresWinRate?.toFixed(1) || '0.0'}%`} subtitle={`${analytics.futuresWins || 0}W / ${analytics.futuresLosses || 0}L`} icon={Target} good={analytics.futuresWinRate >= 55} />
      </div>

      {/* Funding & Fees */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="glass">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Funding Fees
          </h3>
          <div className={`text-4xl font-bold mb-2 ${(analytics.futuresFundingFees || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {(analytics.futuresFundingFees || 0) >= 0 ? '+' : ''}{currSymbol}{(analytics.futuresFundingFees || 0).toFixed(2)}
          </div>
          <div className="text-sm text-slate-400">
            {(analytics.futuresFundingFees || 0) >= 0 ? 'You earned funding fees' : 'You paid funding fees'}
          </div>
        </Card>

        <Card variant="glass">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-red-400" />
            Commission
          </h3>
          <div className="text-4xl font-bold text-red-400 mb-2">
            -{currSymbol}{(analytics.futuresCommission || 0).toFixed(2)}
          </div>
          <div className="text-sm text-slate-400">
            Trading fees paid
          </div>
        </Card>
      </div>

      {/* Open Positions */}
      {analytics.futuresOpenPositions && analytics.futuresOpenPositions.length > 0 && (
        <Card variant="glass">
          <h3 className="font-semibold mb-5 flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-cyan-400" />
            Open Positions ({analytics.futuresOpenPositions.length})
          </h3>
          <div className="space-y-3">
            {analytics.futuresOpenPositions.map((pos, idx) => (
              <div key={idx} className="bg-slate-700/30 border border-slate-600/50 rounded-xl p-5 hover:border-slate-500/50 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-mono font-bold text-lg">{pos.symbol}</div>
                    <div className="text-sm text-slate-400 mt-1">
                      {pos.side} • {pos.leverage}x leverage • Entry: {currSymbol}{pos.entryPrice?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${(pos.unrealizedProfit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {(pos.unrealizedProfit || 0) >= 0 ? '+' : ''}{currSymbol}{(pos.unrealizedProfit || 0).toFixed(2)}
                    </div>
                    <div className="text-sm text-slate-400 mt-1">
                      {(((pos.unrealizedProfit || 0) / (pos.margin || 1)) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-400 border-t border-slate-600/30 pt-3">
                  <span>Size: {Math.abs(pos.size || 0).toFixed(4)}</span>
                  <span>Mark: {currSymbol}{pos.markPrice?.toFixed(2) || '0.00'}</span>
                  <span>Margin: {currSymbol}{pos.margin?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Futures Insights */}
      <Card variant="glass">
        <h3 className="font-semibold mb-4 flex items-center gap-2 text-lg">
          <Brain className="w-5 h-5 text-purple-400" />
          Futures Trading Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="text-sm font-semibold text-slate-400 mb-2">Leverage Discipline</div>
            <div className="text-sm text-slate-300 flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <span>Consider limiting leverage to 3-5x for better consistency. High leverage trades often have lower win rates.</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="text-sm font-semibold text-slate-400 mb-2">Risk Management</div>
            <div className="text-sm text-slate-300 space-y-1">
              <p>• Max consecutive wins: {futuresAnalysis.maxConsecutiveWins || 0}</p>
              <p>• Max consecutive losses: {futuresAnalysis.maxConsecutiveLosses || 0}</p>
              <p>• Largest win: {currSymbol}{futuresAnalysis.largestWin?.toFixed(2) || '0.00'}</p>
              <p>• Largest loss: {currSymbol}{futuresAnalysis.largestLoss?.toFixed(2) || '0.00'}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Symbols */}
      <SymbolsTable symbols={analytics.symbols} filter="FUTURES" currSymbol={currSymbol} />
    </div>
  )
}

// ============================================
// BEHAVIORAL TAB - DEEP INSIGHTS
// ============================================

function BehavioralTab({ analytics, currSymbol }) {
  const behavioral = analytics.behavioral || {}

  if (!behavioral.healthScore) {
    return (
      <div className="text-center py-12 text-slate-400">
        <Brain className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p>No behavioral data available</p>
      </div>
    )
  }

  const healthScore = behavioral.healthScore || 0
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-400'
    if (score >= 60) return 'text-yellow-400'
    if (score >= 40) return 'text-orange-400'
    return 'text-red-400'
  }

  const getScoreBg = (score) => {
    if (score >= 80) return 'from-emerald-500/20 to-green-500/20'
    if (score >= 60) return 'from-yellow-500/20 to-orange-500/20'
    if (score >= 40) return 'from-orange-500/20 to-red-500/20'
    return 'from-red-500/20 to-rose-500/20'
  }

  return (
    <div className="space-y-6">
      {/* Behavioral Health Score - Hero Card */}
      <div className="relative group">
        <div className={`absolute inset-0 rounded-3xl blur-2xl group-hover:blur-3xl transition-all ${
          healthScore >= 80 ? 'bg-emerald-500/10' :
          healthScore >= 60 ? 'bg-yellow-500/10' :
          'bg-red-500/10'
        }`} />

        <div className="relative bg-slate-900 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Left: Health Score */}
            <div className="text-center md:text-left">
              <div className="flex items-center gap-3 mb-4">
                <IconBadge icon={Brain} color="purple" size="xl" />
                <div>
                  <div className="text-sm text-slate-400 uppercase tracking-wider font-medium">Behavioral Health Score</div>
                  <div className="text-xs text-slate-500">AI-powered trading psychology analysis</div>
                </div>
              </div>

              <div className={`text-7xl md:text-8xl font-bold mb-2 ${getScoreColor(healthScore)}`}>
                {healthScore}
                <span className="text-4xl">/100</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-400">
                {healthScore >= 80 && <><CheckCircle className="w-4 h-4 text-emerald-400" /> Excellent discipline</>}
                {healthScore >= 60 && healthScore < 80 && <><Target className="w-4 h-4 text-yellow-400" /> Room for growth</>}
                {healthScore >= 40 && healthScore < 60 && <><AlertTriangle className="w-4 h-4 text-orange-400" /> Needs attention</>}
                {healthScore < 40 && <><AlertCircle className="w-4 h-4 text-red-400" /> Critical issues detected</>}
              </div>
            </div>

            {/* Right: Key Metrics */}
            <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
              <QuickStat
                label="Panic Events"
                value={behavioral.panicPatterns?.count || 0}
                subtitle={behavioral.panicPatterns?.detected ? 'Detected' : 'None found'}
                icon={Flame}
                good={!behavioral.panicPatterns?.detected}
              />
              <QuickStat
                label="Fee Efficiency"
                value={`${behavioral.feeAnalysis?.efficiency ? Number(behavioral.feeAnalysis.efficiency).toFixed(0) : 0}%`}
                subtitle={`${currSymbol}${behavioral.feeAnalysis?.potentialSavings ? Math.abs(Number(behavioral.feeAnalysis.potentialSavings)).toFixed(2) : '0.00'} lost`}
                icon={DollarSign}
                good={(behavioral.feeAnalysis?.efficiency ? Number(behavioral.feeAnalysis.efficiency) : 0) >= 70}
              />
              <QuickStat
                label="Consistency"
                value={`${behavioral.consistencyScore ? Number(behavioral.consistencyScore).toFixed(0) : 0}%`}
                subtitle={behavioral.positionSizing?.label || 'N/A'}
                icon={Target}
                good={(behavioral.consistencyScore ? Number(behavioral.consistencyScore) : 0) >= 70}
              />
              <QuickStat
                label="Emotional State"
                value={behavioral.emotionalState?.detected ? 'Detected' : 'Stable'}
                subtitle={behavioral.emotionalState?.count ? `${behavioral.emotionalState.count} events` : 'None'}
                icon={Brain}
                good={!behavioral.emotionalState?.detected}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {behavioral.warnings && behavioral.warnings.length > 0 && (
        <div className="space-y-3">
          {behavioral.warnings.map((warning, idx) => (
            <div key={idx} className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border-2 border-red-500/50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-red-400 mb-1">{warning.title}</div>
                  <div className="text-sm text-slate-300">{warning.message}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Trading Style Analysis */}
      {behavioral.tradingStyle && (
        <Card variant="glass">
          <SectionHeader icon={Activity} title="Trading Style Analysis" subtitle="How you execute trades" color="blue" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="space-y-2">
              <div className="text-sm text-slate-400">Pattern</div>
              <div className="text-2xl font-bold text-cyan-400">{behavioral.tradingStyle.pattern || 'N/A'}</div>
              <div className="text-xs text-slate-500">
                {behavioral.tradingStyle.buyVsSellRatio ? Number(behavioral.tradingStyle.buyVsSellRatio).toFixed(2) : '0.00'} buy/sell ratio
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-slate-400">Execution</div>
              <div className="text-2xl font-bold text-purple-400">
                {behavioral.tradingStyle.makerPercent ? Number(behavioral.tradingStyle.makerPercent).toFixed(1) : '0.0'}% Maker
              </div>
              <div className="text-xs text-slate-500">
                {behavioral.tradingStyle.takerPercent ? Number(behavioral.tradingStyle.takerPercent).toFixed(1) : '0.0'}% Taker (higher fees)
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-slate-400">Discipline</div>
              <div className={`text-2xl font-bold ${(behavioral.tradingStyle.rapidFirePercent || 0) > 50 ? 'text-red-400' : 'text-emerald-400'}`}>
                {behavioral.tradingStyle.rapidFirePercent ? Number(behavioral.tradingStyle.rapidFirePercent).toFixed(1) : '0.0'}%
              </div>
              <div className="text-xs text-slate-500">Rapid-fire trades</div>
            </div>
          </div>
        </Card>
      )}

      {/* Panic Selling Events */}
      {behavioral.panicPatterns?.detected && behavioral.panicPatterns.events && (
        <Card variant="glass">
          <SectionHeader
            icon={Flame}
            title="Panic Selling Detected"
            subtitle={`${behavioral.panicPatterns.events.length} rapid-fire sell events`}
            color="red"
          />

          <div className="mt-6 space-y-3">
            {behavioral.panicPatterns.events.slice(0, 5).map((event, idx) => (
              <div key={idx} className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono font-bold text-red-400">{event.symbol}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {new Date(event.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-300">
                      <span className="text-red-400 font-bold">
                        {event.timeGap ? Number(event.timeGap).toFixed(1) : '0.0'} min
                      </span> apart
                    </div>
                    <div className="text-xs text-slate-400">
                      {currSymbol}{event.value ? Number(event.value).toFixed(2) : '0.00'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Fee Hemorrhage */}
      {behavioral.feeAnalysis && (
        <Card variant="glass">
          <SectionHeader
            icon={DollarSign}
            title="Fee Hemorrhage Analysis"
            subtitle="Money lost to trading fees"
            color="orange"
          />

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
              <div className="text-sm text-slate-400 mb-2">Total Fees Paid</div>
              <div className="text-4xl font-bold text-red-400">
                -{currSymbol}{behavioral.feeAnalysis.totalFees ? Number(behavioral.feeAnalysis.totalFees).toFixed(2) : '0.00'}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                {behavioral.feeAnalysis.makerFees ? Number(behavioral.feeAnalysis.makerFees).toFixed(2) : '0.00'} maker + {behavioral.feeAnalysis.takerFees ? Number(behavioral.feeAnalysis.takerFees).toFixed(2) : '0.00'} taker
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
              <div className="text-sm text-slate-400 mb-2">Could Have Saved</div>
              <div className="text-4xl font-bold text-yellow-400">
                {currSymbol}{behavioral.feeAnalysis.potentialSavings ? Math.abs(Number(behavioral.feeAnalysis.potentialSavings)).toFixed(2) : '0.00'}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                By using limit orders (maker) instead of market orders (taker)
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Actionable Insights */}
      {behavioral.insights && behavioral.insights.length > 0 && (
        <Card variant="glass">
          <SectionHeader
            icon={Lightbulb}
            title="Actionable Insights"
            subtitle="Steps to improve your trading"
            color="yellow"
          />

          <div className="mt-6 space-y-4">
            {behavioral.insights.map((insight, idx) => {
              const IconComponent = getIconComponent(insight.icon)
              const colorMap = {
                critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
                warning: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400' },
                info: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
                success: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' }
              }
              const colors = colorMap[insight.severity] || colorMap.info

              return (
                <div key={idx} className={`${colors.bg} border ${colors.border} rounded-xl p-5`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                      <IconComponent className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <div className="flex-1">
                      <div className={`font-bold ${colors.text} mb-1`}>{insight.title}</div>
                      <div className="text-sm text-slate-300 mb-3">{insight.message}</div>

                      {insight.actionSteps && insight.actionSteps.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Action Steps:</div>
                          {insight.actionSteps.map((step, sIdx) => (
                            <div key={sIdx} className="flex items-start gap-2 text-sm text-slate-300">
                              <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                              <span>{step}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Position Sizing Consistency */}
      {behavioral.positionSizing && (
        <Card variant="glass">
          <SectionHeader
            icon={Target}
            title="Position Sizing Consistency"
            subtitle="How consistent are your trade sizes?"
            color="purple"
          />

          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm text-slate-400">Consistency Rating</div>
                <div className="text-3xl font-bold text-purple-400 mt-1">{behavioral.positionSizing.label || 'N/A'}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-400">Score</div>
                <div className={`text-3xl font-bold mt-1 ${
                  (behavioral.positionSizing.score || 0) >= 0.8 ? 'text-emerald-400' :
                  (behavioral.positionSizing.score || 0) >= 0.5 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {behavioral.positionSizing.score ? (Number(behavioral.positionSizing.score) * 100).toFixed(0) : 0}%
                </div>
              </div>
            </div>

            <div className="bg-slate-700/30 rounded-lg p-4 text-sm text-slate-300">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400">Average Size:</span> {currSymbol}{behavioral.positionSizing.avgSize ? Number(behavioral.positionSizing.avgSize).toFixed(2) : '0.00'}
                </div>
                <div>
                  <span className="text-slate-400">Coefficient of Variation:</span> {behavioral.positionSizing.coefficientOfVariation ? Number(behavioral.positionSizing.coefficientOfVariation).toFixed(2) : '0.00'}
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-400 flex items-start gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <span>Lower variation = more consistent position sizing = better risk management</span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function AnalyticsView({
  analytics,
  currSymbol,
  exchangeConfig,
  currencyMetadata,
  currency,
  setCurrency,
  onDisconnect,
  onUploadClick,
  onViewAllExchanges,
  isDemoMode = false,
  isAuthenticated = true
}) {
  const [activeTab, setActiveTab] = useState('overview')

  const hasFutures = analytics.futuresTrades > 0
  const hasSpot = analytics.spotTrades > 0
  const hasBehavioral = analytics.behavioral && analytics.behavioral.healthScore

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3, show: true },
    { id: 'behavioral', label: 'Behavioral', icon: Brain, show: hasBehavioral },
    { id: 'spot', label: 'Spot', icon: DollarSign, show: hasSpot },
    { id: 'futures', label: 'Futures', icon: Zap, show: hasFutures }
  ].filter(tab => tab.show)

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
    } catch (error) {
      console.error('Sign out error:', error)
    }
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex">
      <Sidebar
        activePage="patterns"
        onDashboardClick={onDisconnect}
        onUploadClick={onUploadClick || (() => {})}
        onMyPatternsClick={onViewAllExchanges || (() => {})}
        onSignOutClick={handleSignOut}
        isMyPatternsDisabled={!onViewAllExchanges}
        isDemoMode={isDemoMode && !isAuthenticated}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen bg-slate-950">
        <Header
          exchangeConfig={exchangeConfig}
          currencyMetadata={currencyMetadata}
          currency={currency}
          setCurrency={setCurrency}
          onDisconnect={onDisconnect}
          isDemoMode={isDemoMode}
        />

        {/* Demo Mode Banner */}
        {isDemoMode && (
          <div className="mx-4 sm:mx-6 mt-6">
            <div className="max-w-[1400px] mx-auto">
              <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <Eye className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-purple-300">
                      Demo Mode - Viewing Sample Trading Data
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      This is example data to showcase TradeClarity's analytics. Sign up to analyze your own trades.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 max-w-[1400px] mx-auto px-4 sm:px-6 py-8 space-y-8 w-full">
        {/* Hero Section */}
        <HeroSection analytics={analytics} currSymbol={currSymbol} metadata={currencyMetadata} />

        {/* Tabs */}
        <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl md:rounded-2xl overflow-hidden">
          {/* Tab Headers */}
          <div className="flex overflow-x-auto border-b border-slate-700/50 scrollbar-hide">
            {tabs.map(tab => {
              const TabIcon = tab.icon
              return (
                <TabButton
                  key={tab.id}
                  active={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="text-xs md:text-base whitespace-nowrap"
                >
                  <div className="flex items-center gap-2">
                    <TabIcon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </div>
                </TabButton>
              )
            })}
          </div>

          {/* Tab Content */}
          <div className="p-4 md:p-6 lg:p-8">
            {activeTab === 'overview' && <OverviewTab analytics={analytics} currSymbol={currSymbol} />}
            {activeTab === 'behavioral' && <BehavioralTab analytics={analytics} currSymbol={currSymbol} />}
            {activeTab === 'spot' && <SpotTab analytics={analytics} currSymbol={currSymbol} metadata={currencyMetadata} />}
            {activeTab === 'futures' && <FuturesTab analytics={analytics} currSymbol={currSymbol} />}
          </div>
        </div>
        </main>
      </div>
    </div>
  )
}

// Helper functions for generating insights and patterns
function generateEnhancedInsights(analytics, psychology) {
  const insights = []
  
  if (analytics.winRate >= 60) {
    insights.push({
      type: 'strength',
      icon: Target,
      title: 'Excellent Win Rate',
      summary: `You win ${analytics.winRate.toFixed(1)}% of your trades - well above average!`,
      description: `Your ${analytics.winRate.toFixed(1)}% win rate is significantly better than most retail traders (typically 40-50%). This demonstrates strong entry timing and market understanding.`,
      impact: 3,
      data: {
        'Your Win Rate': `${analytics.winRate.toFixed(1)}%`,
        'Average Trader': '~45%',
        'Winning Trades': analytics.winningTrades,
        'Losing Trades': analytics.losingTrades
      },
      actionSteps: [
        'Document your entry criteria to replicate this success',
        'Consider increasing position sizes on high-probability setups',
        'Share your strategy with a trading journal'
      ]
    })
  }
  
  if (psychology.weaknesses && psychology.weaknesses.some(w => w.type === 'holding_losers')) {
    const weakness = psychology.weaknesses.find(w => w.type === 'holding_losers')
    insights.push({
      type: 'weakness',
      icon: Clock,
      title: 'Cut Losses Faster',
      summary: weakness.message,
      description: 'You tend to hold losing positions longer than winners, hoping they recover. This is a common psychological trap.',
      impact: 3,
      actionSteps: [
        'Set a maximum hold time for losing trades',
        'Use time-based stop losses alongside price stops',
        'Accept small losses quickly to preserve capital'
      ]
    })
  }
  
  if (analytics.bestSymbol) {
    const bestData = analytics.symbols[analytics.bestSymbol]
    insights.push({
      type: 'recommendation',
      icon: Award,
      title: 'Focus on Your Best Symbol',
      summary: `${analytics.bestSymbol} is your most profitable with ${bestData.winRate.toFixed(0)}% win rate`,
      description: `You've found edge in ${analytics.bestSymbol}. Focus 60-70% of trading here.`,
      impact: 2,
      actionSteps: [
        `Make ${analytics.bestSymbol} your primary focus`,
        'Study this symbol\'s unique price action',
        'Reduce exposure to underperforming symbols'
      ]
    })
  }
  
  if (analytics.profitFactor >= 1.8) {
    insights.push({
      type: 'strength',
      icon: TrendingUp,
      title: 'Strong Profit Factor',
      summary: `Your ${analytics.profitFactor.toFixed(2)}x profit factor shows winners are much bigger than losers`,
      description: 'A profit factor above 1.5 is considered good, and yours exceeds that.',
      impact: 3,
      actionSteps: [
        'Maintain this risk/reward ratio in all trades',
        'Consider letting winners run even longer'
      ]
    })
  }
  
  return insights.slice(0, 6)
}

function detectHiddenPatterns(analytics, psychology) {
  const patterns = []
  
  if (analytics.maxConsecutiveLosses >= 5) {
    patterns.push({
      icon: AlertTriangle,
      title: 'Streak Trading Risk',
      description: `You've experienced ${analytics.maxConsecutiveLosses} consecutive losses. After 3 losses, decision-making may be compromised.`,
      severity: 'high',
      stats: {
        'Max Losing Streak': analytics.maxConsecutiveLosses,
        'Safe Threshold': '3 losses'
      }
    })
  }
  
  const commissionPercent = (analytics.totalCommission / Math.abs(analytics.totalPnL)) * 100
  if (commissionPercent > 15) {
    patterns.push({
      icon: DollarSign,
      title: 'High Commission Drag',
      description: `Fees are eating ${commissionPercent.toFixed(1)}% of your profits.`,
      severity: 'medium',
      stats: {
        'As % of P&L': `${commissionPercent.toFixed(1)}%`,
        'Healthy Range': '<10%'
      }
    })
  }
  
  if (analytics.hourPerformance && analytics.hourPerformance.length > 0) {
    const bestHours = analytics.hourPerformance.slice(0, 3).map(h => `${h.hour}:00`)
    patterns.push({
      icon: Clock,
      title: 'Your Golden Trading Hours',
      description: `You perform best during ${bestHours.join(', ')}.`,
      severity: 'low',
      stats: {
        'Best Hours': bestHours.join(', ')
      }
    })
  }
  
  return patterns
}
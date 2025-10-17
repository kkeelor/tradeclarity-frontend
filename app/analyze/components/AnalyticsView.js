// app/analyze/components/AnalyticsView.js
'use client'

import { useState } from 'react'
import { 
  DollarSign, TrendingUp, Target, Activity, Award, Brain, 
  CheckCircle, AlertTriangle, Lightbulb, Clock, Calendar, 
  Zap, Layers, TrendingDown, Eye, Flame, Trophy, Shield,
  BarChart3, PieChart, LineChart, ArrowUpRight, ArrowDownRight,
  AlertCircle, Sparkles, ChevronRight, X, ChevronLeft, ChevronDown
} from 'lucide-react'
import { 
  AreaChart, Area, BarChart, Bar, LineChart as RechartsLineChart, 
  Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, 
  Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar
} from 'recharts'
import Header from './Header'

// ============================================
// HERO SECTION - REDESIGNED
// ============================================

function HeroSection({ analytics, currSymbol }) {
  const isProfitable = analytics.totalPnL >= 0
  const psychology = analytics.psychology || {}
  
  return (
    <div className="space-y-6">
      {/* Featured P&L Card - The Star */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-purple-500/20 rounded-3xl blur-2xl group-hover:blur-3xl transition-all" />
        
        <div className="relative bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Left: Main P&L */}
            <div className="text-center md:text-left">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  isProfitable ? 'bg-emerald-500/20' : 'bg-red-500/20'
                }`}>
                  <DollarSign className={`w-8 h-8 ${isProfitable ? 'text-emerald-400' : 'text-red-400'}`} />
                </div>
                <div>
                  <div className="text-sm text-slate-400 uppercase tracking-wider font-medium">Total Profit & Loss</div>
                  <div className="text-xs text-slate-500">All time performance</div>
                </div>
              </div>
              
              <div className={`text-6xl md:text-7xl font-bold mb-2 ${
                isProfitable ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {isProfitable ? '+' : ''}{currSymbol}{Math.abs(analytics.totalPnL).toFixed(2)}
              </div>
              
              <div className="flex items-center gap-4 text-sm text-slate-400">
                <span className="flex items-center gap-1">
                  <Activity className="w-4 h-4" />
                  {analytics.totalTrades} trades
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
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
      
      {/* Account Type Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AccountTypeCard
          type="Spot"
          trades={analytics.spotTrades}
          pnl={analytics.spotPnL}
          winRate={analytics.spotWinRate}
          currSymbol={currSymbol}
          icon="💰"
        />
        <AccountTypeCard
          type="Futures"
          trades={analytics.futuresTrades}
          pnl={analytics.futuresPnL}
          winRate={analytics.futuresWinRate}
          currSymbol={currSymbol}
          icon="⚡"
        />
      </div>
    </div>
  )
}

function QuickStat({ label, value, subtitle, icon: Icon, good }) {
  // Check if value is negative to color it red
  const isNegative = typeof value === 'string' && (value.includes('-') || (parseFloat(value.replace(/[^0-9.-]/g, '')) < 0))
  const isPositive = typeof value === 'string' && (value.includes('+') || (parseFloat(value.replace(/[^0-9.-]/g, '')) > 0))
  
  // Determine color based on value
  let valueColor = 'text-white'
  if (isPositive || good === true) {
    valueColor = 'text-emerald-400'
  } else if (isNegative || good === false) {
    valueColor = 'text-red-400'
  }
  
  return (
    <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-xl p-4 hover:border-slate-600/50 transition-all">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${good !== undefined && good ? 'text-emerald-400' : 'text-slate-400'}`} />
        <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-2xl font-bold mb-1 ${valueColor}`}>
        {value}
      </div>
      {subtitle && <div className="text-xs text-slate-500">{subtitle}</div>}
    </div>
  )
}

function AccountTypeCard({ type, trades, pnl, winRate, currSymbol, icon }) {
  if (trades === 0) return null
  
  const isProfitable = pnl >= 0
  
  return (
    <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 hover:border-slate-600/50 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{icon}</div>
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
    </div>
  )
}

// ============================================
// PSYCHOLOGY SCORE - SIMPLIFIED
// ============================================

function PsychologyScoreCompact({ score, analytics }) {
  const getScoreColor = (score) => {
    if (score >= 80) return { color: 'emerald', emoji: '🏆', label: 'Excellent' }
    if (score >= 70) return { color: 'cyan', emoji: '👍', label: 'Good' }
    if (score >= 60) return { color: 'yellow', emoji: '⚠️', label: 'Fair' }
    if (score >= 50) return { color: 'orange', emoji: '📈', label: 'Needs Work' }
    return { color: 'red', emoji: '🚨', label: 'Critical' }
  }
  
  const scoreInfo = getScoreColor(score)
  const percentage = (score / 100) * 100
  
  return (
    <div className="bg-gradient-to-br from-purple-900/30 to-slate-800/30 backdrop-blur-sm border border-purple-700/30 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Brain className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Psychology Score</h3>
            <p className="text-sm text-slate-400">Trading discipline rating</p>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-5xl font-bold text-${scoreInfo.color}-400`}>
            {score}
          </div>
          <div className="text-sm text-slate-400">/100</div>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="h-3 bg-slate-800/50 rounded-full overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r from-${scoreInfo.color}-500 to-${scoreInfo.color}-400 rounded-full transition-all duration-1000`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{scoreInfo.emoji}</span>
          <span className={`font-semibold text-${scoreInfo.color}-400`}>{scoreInfo.label}</span>
        </div>
        <div className="text-slate-400">
          {score >= 70 ? 'Keep it up!' : score >= 50 ? 'Room for improvement' : 'Focus on discipline'}
        </div>
      </div>
    </div>
  )
}

// ============================================
// HIDDEN PATTERNS - SEVERITY-BASED
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
            <Eye className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Hidden Patterns Detected</h3>
            <p className="text-sm text-slate-400">{patterns.length} insights from your data</p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-slate-400 hover:text-white transition-colors"
        >
          {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </div>
      
      {expanded && (
        <div className="space-y-4">
          {/* Critical Patterns - Full Width, Prominent */}
          {criticalPatterns.map((pattern, i) => (
            <div key={`critical-${i}`} className="relative group animate-pulse-subtle">
              <div className="absolute inset-0 bg-red-500/10 rounded-xl blur-xl" />
              <div className="relative bg-gradient-to-r from-red-500/20 to-orange-500/20 border-2 border-red-500/50 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="text-4xl flex-shrink-0">{pattern.icon}</div>
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
          ))}
          
          {/* Other Patterns - Compact Grid */}
          {otherPatterns.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {otherPatterns.map((pattern, i) => (
                <div 
                  key={`other-${i}`}
                  className={`bg-slate-800/30 border rounded-xl p-4 hover:border-slate-500/50 transition-all ${
                    pattern.severity === 'medium' ? 'border-yellow-500/30' : 'border-slate-700/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0">{pattern.icon}</div>
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
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// KEY INSIGHTS - VARIABLE SIZING
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
    strength: 'text-emerald-400',
    weakness: 'text-red-400',
    recommendation: 'text-cyan-400',
    pattern: 'text-purple-400'
  }
  
  return (
    <div 
      onClick={onClick}
      className={`bg-gradient-to-br ${typeStyles[insight.type]} border backdrop-blur-sm rounded-xl cursor-pointer transition-all hover:scale-105 hover:shadow-2xl group ${className} ${
        featured ? 'p-6' : 'p-4'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`${featured ? 'text-4xl' : 'text-3xl'} ${iconStyles[insight.type]}`}>
          {insight.icon}
        </div>
        <div className="flex items-center gap-2">
          {/* Impact Dots */}
          {insight.impact && (
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i < insight.impact 
                      ? iconStyles[insight.type].replace('text-', 'bg-') + ' scale-100'
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
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                timeRange === range
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:text-white'
              }`}
            >
              {range === 'all' ? 'All Time' : `Last ${range.toUpperCase()}`}
            </button>
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
    <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
      <h3 className="font-semibold mb-6 flex items-center gap-2 text-lg">
        <Icon className="w-5 h-5 text-emerald-400" />
        {title}
      </h3>
      {children}
    </div>
  )
}

// ============================================
// INSIGHT MODAL
// ============================================

function InsightModal({ insight, onClose }) {
  if (!insight) return null
  
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-8 shadow-2xl animate-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl ${
              insight.type === 'strength' ? 'bg-emerald-500/20 text-emerald-400' :
              insight.type === 'weakness' ? 'bg-red-500/20 text-red-400' :
              'bg-cyan-500/20 text-cyan-400'
            }`}>
              {insight.icon}
            </div>
            <div>
              <h3 className="text-2xl font-bold">{insight.title}</h3>
              <p className="text-sm text-slate-400 mt-1">{insight.category || insight.type}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-6">
          <p className="text-slate-300 leading-relaxed text-lg">{insight.description}</p>
          
          {insight.data && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
              <div className="text-sm font-semibold text-slate-400 mb-3">Key Metrics</div>
              <div className="space-y-2">
                {Object.entries(insight.data).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center py-2 border-b border-slate-700/30 last:border-0">
                    <span className="text-slate-300">{key}</span>
                    <span className="font-mono font-bold text-lg">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {insight.actionSteps && (
            <div>
              <div className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-400" />
                Action Steps
              </div>
              <ul className="space-y-3">
                {insight.actionSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 bg-slate-800/30 p-4 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm flex-shrink-0">
                      {i + 1}
                    </div>
                    <span className="text-slate-300 leading-relaxed">{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
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
      <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8 text-center text-slate-400">
        <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No {filter?.toLowerCase()} symbols found</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden">
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
    </div>
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

function SpotTab({ analytics, currSymbol }) {
  const spotAnalysis = analytics.spotAnalysis || {}

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <QuickStat label="Spot P&L" value={`${currSymbol}${analytics.spotPnL?.toFixed(2) || '0.00'}`} icon={DollarSign} good={analytics.spotPnL >= 0} />
        <QuickStat label="ROI" value={`${analytics.spotRoi?.toFixed(1) || '0.0'}%`} icon={TrendingUp} good={analytics.spotRoi >= 0} />
        <QuickStat label="Win Rate" value={`${analytics.spotWinRate?.toFixed(1) || '0.0'}%`} subtitle={`${analytics.spotWins || 0}W / ${analytics.spotLosses || 0}L`} icon={Target} good={analytics.spotWinRate >= 55} />
        <QuickStat label="Invested" value={`${currSymbol}${analytics.spotInvested?.toFixed(0) || '0'}`} icon={Activity} />
      </div>

      {/* Insights */}
      <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
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
      </div>

      {/* Symbols */}
      <SymbolsTable symbols={analytics.symbols} filter="SPOT" currSymbol={currSymbol} />
    </div>
  )
}

function FuturesTab({ analytics, currSymbol }) {
  const futuresAnalysis = analytics.futuresAnalysis || {}

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
        <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
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
        </div>

        <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
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
        </div>
      </div>

      {/* Open Positions */}
      {analytics.futuresOpenPositions && analytics.futuresOpenPositions.length > 0 && (
        <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
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
        </div>
      )}

      {/* Futures Insights */}
      <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2 text-lg">
          <Brain className="w-5 h-5 text-purple-400" />
          Futures Trading Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="text-sm font-semibold text-slate-400 mb-2">Leverage Discipline</div>
            <div className="text-sm text-slate-300">
              💡 Consider limiting leverage to 3-5x for better consistency. High leverage trades often have lower win rates.
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
      </div>

      {/* Symbols */}
      <SymbolsTable symbols={analytics.symbols} filter="FUTURES" currSymbol={currSymbol} />
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
  isDemoMode = false 
}) {
  const [activeTab, setActiveTab] = useState('overview')
  
  const hasFutures = analytics.futuresTrades > 0
  const hasSpot = analytics.spotTrades > 0

  const tabs = [
    { id: 'overview', label: '📊 Overview', show: true },
    { id: 'spot', label: '💰 Spot', show: hasSpot },
    { id: 'futures', label: '⚡ Futures', show: hasFutures }
  ].filter(tab => tab.show)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <Header 
        exchangeConfig={exchangeConfig}
        currencyMetadata={currencyMetadata}
        currency={currency}
        setCurrency={setCurrency}
        onDisconnect={onDisconnect}
        isDemoMode={isDemoMode}
      />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Hero Section */}
        <HeroSection analytics={analytics} currSymbol={currSymbol} />

        {/* Tabs */}
        <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-slate-700/50">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-6 py-4 text-base font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-slate-700/50 text-white border-b-2 border-emerald-500'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6 md:p-8">
            {activeTab === 'overview' && <OverviewTab analytics={analytics} currSymbol={currSymbol} />}
            {activeTab === 'spot' && <SpotTab analytics={analytics} currSymbol={currSymbol} />}
            {activeTab === 'futures' && <FuturesTab analytics={analytics} currSymbol={currSymbol} />}
          </div>
        </div>
      </main>
    </div>
  )
}

// Helper functions for generating insights and patterns
function generateEnhancedInsights(analytics, psychology) {
  const insights = []
  
  if (analytics.winRate >= 60) {
    insights.push({
      type: 'strength',
      icon: '🎯',
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
      icon: '⏰',
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
      icon: '💎',
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
      icon: '💰',
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
      icon: '🎲',
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
      icon: '💸',
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
      icon: '⏰',
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
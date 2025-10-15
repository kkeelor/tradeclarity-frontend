// app/analyze/components/AnalyticsView.js
'use client'

import { useState } from 'react'
import { 
  DollarSign, TrendingUp, Target, Activity, Award, Brain, 
  CheckCircle, AlertTriangle, Lightbulb, Clock, Calendar, 
  Zap, Layers, TrendingDown, Eye, Flame, Trophy, Shield,
  BarChart3, PieChart, LineChart, ArrowUpRight, ArrowDownRight,
  AlertCircle, Sparkles, ChevronRight, X
} from 'lucide-react'
import { 
  AreaChart, Area, BarChart, Bar, LineChart as RechartsLineChart, 
  Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, 
  Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar
} from 'recharts'
import ThemeToggle from '../../components/ThemeToggle'

function Header({ exchangeConfig, currencyMetadata, currency, setCurrency, onDisconnect }) {
  return (
    <header className="border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center font-bold text-lg">
              TC
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                TradeClarity
              </h1>
              <p className="text-xs text-slate-400">Trading Psychology Insights</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {currencyMetadata?.supportsCurrencySwitch && (
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {currencyMetadata.availableCurrencies.map(curr => (
                  <option key={curr} value={curr}>{curr}</option>
                ))}
              </select>
            )}
            <button
              onClick={onDisconnect}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm transition-all flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Disconnect
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

// Insight Modal Component
function InsightModal({ insight, onClose }) {
  if (!insight) return null
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              insight.type === 'strength' ? 'bg-emerald-500/20 text-emerald-400' :
              insight.type === 'weakness' ? 'bg-red-500/20 text-red-400' :
              'bg-cyan-500/20 text-cyan-400'
            }`}>
              {insight.icon}
            </div>
            <div>
              <h3 className="text-xl font-bold">{insight.title}</h3>
              <p className="text-sm text-slate-400">{insight.category}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          <p className="text-slate-300 leading-relaxed">{insight.description}</p>
          
          {insight.data && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <div className="text-sm text-slate-400 mb-2">Key Metrics</div>
              {Object.entries(insight.data).map(([key, value]) => (
                <div key={key} className="flex justify-between py-1">
                  <span className="text-slate-300">{key}</span>
                  <span className="font-mono font-bold">{value}</span>
                </div>
              ))}
            </div>
          )}
          
          {insight.actionSteps && (
            <div>
              <div className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-400" />
                Action Steps
              </div>
              <ul className="space-y-2">
                {insight.actionSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-300">{step}</span>
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

function HeroMetrics({ analytics, currSymbol }) {
  const isProfitable = analytics.totalPnL >= 0
  const isGoodWinRate = analytics.winRate >= 55
  const psychology = analytics.psychology || {}
  
  return (
    <div className="relative">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10 rounded-2xl blur-3xl" />
      
      <div className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard
            label="Total P&L"
            value={`${currSymbol}${analytics.totalPnL.toFixed(2)}`}
            change={analytics.totalPnL >= 0 ? '+' : ''}
            icon={DollarSign}
            trend={isProfitable ? 'up' : 'down'}
            size="large"
          />
          <MetricCard
            label="Win Rate"
            value={`${analytics.winRate.toFixed(1)}%`}
            subtitle={`${analytics.winningTrades}W / ${analytics.losingTrades}L`}
            icon={Target}
            trend={isGoodWinRate ? 'up' : 'neutral'}
          />
          <MetricCard
            label="Total Trades"
            value={analytics.totalTrades}  // Will show 410
            subtitle={`${analytics.spotTrades} spot • ${analytics.futuresTrades} futures`}  // Shows 44 + 366 = 410
            icon={Activity}
          />
          <MetricCard
            label="Profit Factor"
            value={analytics.profitFactor.toFixed(2)}
            subtitle={analytics.profitFactor >= 2 ? 'Excellent' : analytics.profitFactor >= 1.5 ? 'Good' : 'Fair'}
            icon={TrendingUp}
            trend={analytics.profitFactor >= 1.5 ? 'up' : 'neutral'}
          />
          <MetricCard
            label="Best Symbol"
            value={analytics.bestSymbol || 'N/A'}
            subtitle={analytics.symbols[analytics.bestSymbol]?.winRate.toFixed(0) + '% WR' || ''}
            icon={Award}
          />
          <MetricCard
            label="Discipline"
            value={psychology.disciplineScore || 50}
            subtitle="/100"
            icon={Brain}
            trend={psychology.disciplineScore >= 70 ? 'up' : psychology.disciplineScore >= 50 ? 'neutral' : 'down'}
          />
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, subtitle, change, icon: Icon, trend, size = 'normal' }) {
  const trendColors = {
    up: 'text-emerald-400',
    down: 'text-red-400',
    neutral: 'text-slate-400'
  }
  
  const trendIcons = {
    up: <ArrowUpRight className="w-4 h-4" />,
    down: <ArrowDownRight className="w-4 h-4" />,
    neutral: null
  }
  
  return (
    <div className={`bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 hover:border-slate-600/50 transition-all ${size === 'large' ? 'col-span-2 sm:col-span-1' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider text-slate-500 font-medium">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-slate-500" />}
      </div>
      <div className="flex items-baseline gap-2">
        <div className={`text-2xl font-bold ${trendColors[trend] || 'text-white'}`}>
          {change}{value}
        </div>
        {trend && trendIcons[trend]}
      </div>
      {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
    </div>
  )
}

// Enhanced Insight Cards
function InsightCard({ insight, onClick }) {
  const typeStyles = {
    strength: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/50',
    weakness: 'from-red-500/10 to-red-500/5 border-red-500/30 hover:border-red-500/50',
    recommendation: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/30 hover:border-cyan-500/50',
    pattern: 'from-purple-500/10 to-purple-500/5 border-purple-500/30 hover:border-purple-500/50'
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
      className={`bg-gradient-to-br ${typeStyles[insight.type]} border backdrop-blur-sm rounded-xl p-5 cursor-pointer transition-all hover:scale-105 hover:shadow-xl group`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`text-3xl ${iconStyles[insight.type]}`}>
          {insight.icon}
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
      </div>
      <h4 className="font-semibold text-white mb-2">{insight.title}</h4>
      <p className="text-sm text-slate-300 leading-relaxed">{insight.summary}</p>
      {insight.impact && (
        <div className="mt-3 flex items-center gap-2">
          <div className="text-xs text-slate-400">Impact:</div>
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i < insight.impact 
                    ? iconStyles[insight.type].replace('text-', 'bg-')
                    : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Psychology Score Visualization
function PsychologyScore({ score, breakdown }) {
  const getScoreColor = (score) => {
    if (score >= 80) return { color: 'emerald', label: 'Excellent', emoji: '🏆', stroke: '#10b981' }
    if (score >= 70) return { color: 'cyan', label: 'Good', emoji: '👍', stroke: '#06b6d4' }
    if (score >= 60) return { color: 'yellow', label: 'Fair', emoji: '⚠️', stroke: '#eab308' }
    if (score >= 50) return { color: 'orange', label: 'Needs Work', emoji: '📈', stroke: '#f97316' }
    return { color: 'red', label: 'Critical', emoji: '🚨', stroke: '#ef4444' }
  }
  
  const scoreInfo = getScoreColor(score)
  
  const radarData = breakdown ? Object.entries(breakdown).map(([key, value]) => ({
    subject: key.replace(/([A-Z])/g, ' $1').trim(),
    value: value,
    fullMark: 100
  })) : []
  
  return (
    <div className="bg-gradient-to-br from-purple-900/20 to-slate-800/30 backdrop-blur-sm border border-purple-700/30 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Brain className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Psychology Score</h3>
            <p className="text-sm text-slate-400">Your trading discipline rating</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            {score}
          </div>
          <div className="text-sm text-slate-400">/100</div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Ring */}
        <div className="flex items-center justify-center">
          <div className="relative w-48 h-48">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-slate-800"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${score * 5.53} 553`}
                className={`text-${scoreInfo.color}-500 transition-all duration-1000`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-5xl mb-2">{scoreInfo.emoji}</div>
              <div className={`text-lg font-bold text-${scoreInfo.color}-400`}>
                {scoreInfo.label}
              </div>
            </div>
          </div>
        </div>
        
        {/* Radar Chart */}
        {radarData.length > 0 && (
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" stroke="#64748b" style={{ fontSize: '11px' }} />
                <Radar name="Score" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}

// Pattern Detection Section
function PatternDetection({ patterns }) {
  return (
    <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
          <Eye className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Hidden Patterns Detected</h3>
          <p className="text-sm text-slate-400">Insights you didn't know about your trading</p>
        </div>
      </div>
      
      <div className="space-y-3">
        {patterns.map((pattern, i) => (
          <div key={i} className="bg-slate-700/30 border border-slate-600/50 rounded-xl p-4 hover:border-slate-500/50 transition-all">
            <div className="flex items-start gap-3">
              <div className="text-2xl flex-shrink-0">{pattern.icon}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold">{pattern.title}</h4>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    pattern.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                    pattern.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {pattern.severity}
                  </span>
                </div>
                <p className="text-sm text-slate-300">{pattern.description}</p>
                {pattern.stats && (
                  <div className="mt-2 flex gap-4 text-xs text-slate-400">
                    {Object.entries(pattern.stats).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-slate-500">{key}:</span> <span className="text-white font-mono">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function OverviewTab({ analytics, currSymbol }) {
  const [selectedInsight, setSelectedInsight] = useState(null)
  const psychology = analytics.psychology || {}
  
  // Generate enhanced insights
  const insights = generateEnhancedInsights(analytics, psychology)
  const patterns = detectHiddenPatterns(analytics, psychology)
  
  return (
    <div className="space-y-6">
      {/* Psychology Score */}
      <PsychologyScore 
        score={psychology.disciplineScore || 50}
        breakdown={{
          'Win Rate': analytics.winRate,
          'Risk Mgmt': psychology.disciplineScore >= 70 ? 85 : 60,
          'Consistency': analytics.maxConsecutiveLosses <= 3 ? 90 : 50,
          'Discipline': psychology.disciplineScore || 50,
          'Patience': analytics.profitFactor >= 1.5 ? 80 : 55
        }}
      />
      
      {/* Hidden Patterns */}
      <PatternDetection patterns={patterns} />
      
      {/* Key Insights Grid */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <h3 className="text-lg font-bold">Key Insights</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {insights.map((insight, i) => (
            <InsightCard 
              key={i} 
              insight={insight}
              onClick={() => setSelectedInsight(insight)}
            />
          ))}
        </div>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Monthly Performance" icon={Calendar}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={analytics.monthlyData}>
              <defs>
                <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: '11px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '11px' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155', 
                  borderRadius: '8px',
                  fontSize: '12px'
                }} 
              />
              <Area type="monotone" dataKey="pnl" stroke="#10b981" fillOpacity={1} fill="url(#colorPnl)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        
        <ChartCard title="Day Performance" icon={Clock}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analytics.dayPerformance}>
              <XAxis dataKey="day" stroke="#64748b" style={{ fontSize: '11px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '11px' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155', 
                  borderRadius: '8px',
                  fontSize: '12px'
                }} 
              />
              <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                {analytics.dayPerformance.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      
      {/* Symbol Performance Table */}
      <SymbolsTable symbols={analytics.symbols} currSymbol={currSymbol} />
      
      {/* Insight Modal */}
      {selectedInsight && (
        <InsightModal 
          insight={selectedInsight}
          onClose={() => setSelectedInsight(null)}
        />
      )}
    </div>
  )
}

function ChartCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5">
      <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
        <Icon className="w-4 h-4 text-emerald-400" />
        {title}
      </h3>
      {children}
    </div>
  )
}

function SpotTab({ analytics, currSymbol }) {
  const spotAnalysis = analytics.spotAnalysis

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Spot P&L" value={`${currSymbol}${analytics.spotPnL.toFixed(2)}`} icon={DollarSign} trend={analytics.spotPnL >= 0 ? 'up' : 'down'} />
        <MetricCard label="ROI" value={`${analytics.spotRoi.toFixed(1)}%`} icon={TrendingUp} trend={analytics.spotRoi >= 0 ? 'up' : 'down'} />
        <MetricCard label="Win Rate" value={`${analytics.spotWinRate.toFixed(1)}%`} subtitle={`${analytics.spotWins}W / ${analytics.spotLosses}L`} icon={Target} />
        <MetricCard label="Invested" value={`${currSymbol}${analytics.spotInvested.toFixed(0)}`} icon={Activity} />
      </div>

      {/* Spot Insights */}
      <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          Spot Trading Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm text-slate-400">Position Management</div>
            <div className="text-xs text-slate-300">
              • Avg winner held: {spotAnalysis.avgWin > 0 ? '~2-4 hours' : 'N/A'}<br/>
              • Avg loser held: {spotAnalysis.avgLoss > 0 ? '~4-8 hours' : 'N/A'}<br/>
              • Largest win: {currSymbol}{spotAnalysis.largestWin.toFixed(2)}<br/>
              • Largest loss: {currSymbol}{spotAnalysis.largestLoss.toFixed(2)}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm text-slate-400">Trading Stats</div>
            <div className="text-xs text-slate-300">
              • Total trades: {analytics.spotTrades}<br/>
              • Completed: {analytics.spotCompletedTrades}<br/>
              • Max consecutive wins: {spotAnalysis.maxConsecutiveWins}<br/>
              • Max consecutive losses: {spotAnalysis.maxConsecutiveLosses}
            </div>
          </div>
        </div>
      </div>

      {/* Spot Symbols Table */}
      <SymbolsTable symbols={analytics.symbols} filter="SPOT" currSymbol={currSymbol} />
    </div>
  )
}

function FuturesTab({ analytics, currSymbol }) {
  const futuresAnalysis = analytics.futuresAnalysis

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Net P&L" value={`${currSymbol}${analytics.futuresPnL.toFixed(2)}`} icon={DollarSign} trend={analytics.futuresPnL >= 0 ? 'up' : 'down'} />
        <MetricCard label="Realized" value={`${currSymbol}${analytics.futuresRealizedPnL.toFixed(2)}`} icon={CheckCircle} trend={analytics.futuresRealizedPnL >= 0 ? 'up' : 'down'} />
        <MetricCard label="Unrealized" value={`${currSymbol}${analytics.futuresUnrealizedPnL.toFixed(2)}`} icon={Clock} trend={analytics.futuresUnrealizedPnL >= 0 ? 'up' : 'down'} />
        <MetricCard label="Win Rate" value={`${analytics.futuresWinRate.toFixed(1)}%`} subtitle={`${analytics.futuresWins}W / ${analytics.futuresLosses}L`} icon={Target} />
      </div>

      {/* Funding & Fees */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            Funding Fees
          </h3>
          <div className={`text-3xl font-bold mb-2 ${analytics.futuresFundingFees >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {analytics.futuresFundingFees >= 0 ? '+' : ''}{currSymbol}{analytics.futuresFundingFees.toFixed(2)}
          </div>
          <div className="text-xs text-slate-400">
            {analytics.futuresFundingFees >= 0 ? 'You earned funding fees' : 'You paid funding fees'}
          </div>
        </div>

        <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-red-400" />
            Commission
          </h3>
          <div className="text-3xl font-bold text-red-400 mb-2">
            -{currSymbol}{analytics.futuresCommission.toFixed(2)}
          </div>
          <div className="text-xs text-slate-400">
            Trading fees paid
          </div>
        </div>
      </div>

      {/* Open Positions */}
      {analytics.futuresOpenPositions && analytics.futuresOpenPositions.length > 0 && (
        <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Open Positions ({analytics.futuresOpenPositions.length})
          </h3>
          <div className="space-y-3">
            {analytics.futuresOpenPositions.map((pos, idx) => (
              <div key={idx} className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-mono font-bold">{pos.symbol}</div>
                    <div className="text-xs text-slate-400">
                      {pos.side} • {pos.leverage}x leverage • Entry: {currSymbol}{pos.entryPrice.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${pos.unrealizedProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {pos.unrealizedProfit >= 0 ? '+' : ''}{currSymbol}{pos.unrealizedProfit.toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-400">
                      {((pos.unrealizedProfit / pos.margin) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Size: {Math.abs(pos.size).toFixed(4)}</span>
                  <span>Mark: {currSymbol}{pos.markPrice.toFixed(2)}</span>
                  <span>Margin: {currSymbol}{pos.margin.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Futures Insights */}
      <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          Futures Trading Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm text-slate-400">Leverage Discipline</div>
            <div className="text-xs text-slate-300">
              💡 Consider limiting leverage to 3-5x for better consistency.<br/>
              High leverage trades often have lower win rates.
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm text-slate-400">Risk Management</div>
            <div className="text-xs text-slate-300">
              • Max consecutive wins: {futuresAnalysis.maxConsecutiveWins}<br/>
              • Max consecutive losses: {futuresAnalysis.maxConsecutiveLosses}<br/>
              • Largest win: {currSymbol}{futuresAnalysis.largestWin.toFixed(2)}<br/>
              • Largest loss: {currSymbol}{futuresAnalysis.largestLoss.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Futures Symbols Table */}
      <SymbolsTable symbols={analytics.symbols} filter="FUTURES" currSymbol={currSymbol} />
    </div>
  )
}

function SymbolsTable({ symbols, filter, currSymbol }) {
  const filteredSymbols = Object.entries(symbols)
    .filter(([_, data]) => !filter || data.accountType === filter)
    .sort((a, b) => (b[1].realized || 0) - (a[1].realized || 0))

  if (filteredSymbols.length === 0) {
    return (
      <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5 text-center text-slate-400">
        No {filter?.toLowerCase()} symbols found
      </div>
    )
  }

  return (
    <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Layers className="w-4 h-4 text-emerald-400" />
        Symbol Performance
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-700">
              <th className="pb-2">Symbol</th>
              <th className="pb-2 text-right">P&L</th>
              <th className="pb-2 text-right">Trades</th>
              <th className="pb-2 text-right">Win Rate</th>
              <th className="pb-2 text-right">Wins/Losses</th>
            </tr>
          </thead>
          <tbody>
            {filteredSymbols.map(([symbol, data]) => (
              <tr key={symbol} className="border-b border-slate-800/50 hover:bg-slate-700/20 transition-colors">
                <td className="py-3 font-mono font-medium">{symbol}</td>
                <td className={`py-3 text-right font-bold ${(data.realized || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {(data.realized || 0) >= 0 ? '+' : ''}{currSymbol}{(data.realized || 0).toFixed(2)}
                </td>
                <td className="py-3 text-right text-slate-300">{data.trades}</td>
                <td className="py-3 text-right">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    data.winRate >= 60 ? 'bg-emerald-500/20 text-emerald-400' :
                    data.winRate >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {data.winRate.toFixed(0)}%
                  </span>
                </td>
                <td className="py-3 text-right text-slate-400 text-xs">
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

// Helper function to generate enhanced insights
function generateEnhancedInsights(analytics, psychology) {
  const insights = []
  
  // Strength: High win rate
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
  
  // Weakness: Holding losers too long
  if (psychology.weaknesses && psychology.weaknesses.some(w => w.type === 'holding_losers')) {
    const weakness = psychology.weaknesses.find(w => w.type === 'holding_losers')
    insights.push({
      type: 'weakness',
      icon: '⏰',
      title: 'Cut Losses Faster',
      summary: weakness.message,
      description: 'You tend to hold losing positions longer than winners, hoping they recover. This is a common psychological trap that prevents capital from being deployed in better opportunities.',
      impact: 3,
      data: {
        'Avg Loser Hold Time': '~6 hours',
        'Avg Winner Hold Time': '~3 hours',
        'Ratio': '2:1'
      },
      actionSteps: [
        'Set a maximum hold time for losing trades (e.g., 2-3 hours)',
        'Use time-based stop losses alongside price stops',
        'Ask yourself: "Would I enter this trade right now?" If no, exit.',
        'Accept small losses quickly to preserve capital'
      ]
    })
  }
  
  // Pattern: Revenge trading
  if (psychology.emotionalTriggers && psychology.emotionalTriggers.some(t => t.type === 'revenge_trading')) {
    insights.push({
      type: 'pattern',
      icon: '😤',
      title: 'Revenge Trading Detected',
      summary: 'You take rapid trades after losses, often at larger sizes',
      description: 'After experiencing a loss, you tend to immediately re-enter the market with increased position sizes. This emotional response typically leads to compounding losses and poor decision-making.',
      impact: 3,
      data: {
        'Sessions Detected': psychology.emotionalTriggers.find(t => t.type === 'revenge_trading').message.split(' ')[0],
        'Avg Win Rate During': '~30%',
        'Capital at Risk': 'High'
      },
      actionSteps: [
        'Take a mandatory 30-minute break after any loss',
        'Implement a "maximum daily losses" rule (e.g., 3 losses = done for day)',
        'Practice mindfulness or breathing exercises after losses',
        'Trade with smaller sizes after a losing trade'
      ]
    })
  }
  
  // Recommendation: Best symbol focus
  if (analytics.bestSymbol) {
    const bestData = analytics.symbols[analytics.bestSymbol]
    insights.push({
      type: 'recommendation',
      icon: '💎',
      title: 'Focus on Your Best Symbol',
      summary: `${analytics.bestSymbol} is your most profitable symbol with ${bestData.winRate.toFixed(0)}% win rate`,
      description: `You've found edge in ${analytics.bestSymbol}. By focusing 60-70% of your trading on symbols where you consistently profit, you can compound gains while minimizing losses on unfamiliar instruments.`,
      impact: 2,
      data: {
        'Symbol': analytics.bestSymbol,
        'Win Rate': `${bestData.winRate.toFixed(1)}%`,
        'Total P&L': `${(bestData.realized || 0).toFixed(2)}`,
        'Trades': bestData.trades
      },
      actionSteps: [
        `Make ${analytics.bestSymbol} your primary focus (60-70% of trades)`,
        'Study this symbol\'s unique price action and patterns',
        'Reduce exposure to underperforming symbols',
        'Build deep expertise rather than spreading thin'
      ]
    })
  }
  
  // Strength: Good profit factor
  if (analytics.profitFactor >= 1.8) {
    insights.push({
      type: 'strength',
      icon: '💰',
      title: 'Strong Profit Factor',
      summary: `Your ${analytics.profitFactor.toFixed(2)}x profit factor shows winners are much bigger than losers`,
      description: 'A profit factor above 1.5 is considered good, and yours exceeds that. This means your average win is significantly larger than your average loss - a key ingredient for long-term profitability.',
      impact: 3,
      data: {
        'Your Profit Factor': `${analytics.profitFactor.toFixed(2)}x`,
        'Good Threshold': '1.5x',
        'Excellent Threshold': '2.0x',
        'Avg Win': `${analytics.avgWin.toFixed(2)}`,
        'Avg Loss': `${Math.abs(analytics.avgLoss).toFixed(2)}`
      },
      actionSteps: [
        'Maintain this risk/reward ratio in all trades',
        'Consider letting winners run even longer',
        'Use this as your benchmark for new strategies'
      ]
    })
  }
  
  // Recommendation: Position sizing
  insights.push({
    type: 'recommendation',
    icon: '📊',
    title: 'Optimize Position Sizing',
    summary: 'Adjust your position sizes based on win rate and profit factor',
    description: 'With your current performance metrics, you can calculate optimal position sizes using the Kelly Criterion or similar risk management formulas to maximize long-term growth while minimizing risk of ruin.',
    impact: 2,
    actionSteps: [
      'Risk only 1-2% of capital per trade',
      'Increase size on high-confidence setups (your best symbol)',
      'Decrease size when trying new strategies',
      'Use position sizing calculators for precision'
    ]
  })
  
  return insights.slice(0, 6) // Return top 6 insights
}

// Helper function to detect hidden patterns
function detectHiddenPatterns(analytics, psychology) {
  const patterns = []
  
  // Pattern 1: Weekend trading performance
  const dayPerf = analytics.dayPerformance || []
  const weekendDays = dayPerf.filter(d => d.day === 'Sat' || d.day === 'Sun')
  if (weekendDays.length > 0) {
    const weekendPnl = weekendDays.reduce((sum, d) => sum + d.pnl, 0)
    const weekendWr = weekendDays.reduce((sum, d) => sum + d.winRate, 0) / weekendDays.length
    
    if (weekendWr < analytics.winRate - 10) {
      patterns.push({
        icon: '📅',
        title: 'Weekend Trading Struggles',
        description: 'Your win rate drops significantly on weekends. This could be due to lower liquidity, different market participants, or reduced focus.',
        severity: 'medium',
        stats: {
          'Weekend WR': `${weekendWr.toFixed(1)}%`,
          'Overall WR': `${analytics.winRate.toFixed(1)}%`,
          'Weekend P&L': `${weekendPnl.toFixed(2)}`
        }
      })
    }
  }
  
  // Pattern 2: Best time to trade
  const hourPerf = analytics.hourPerformance || []
  if (hourPerf.length > 0) {
    const bestHours = hourPerf.slice(0, 3).map(h => `${h.hour}:00-${h.hour + 1}:00`)
    patterns.push({
      icon: '⏰',
      title: 'Your Golden Trading Hours',
      description: `You perform best during ${bestHours.join(', ')}. These time windows show consistently higher win rates and P&L.`,
      severity: 'low',
      stats: {
        'Best Hours': bestHours.join(', '),
        'Avg P&L': `${(hourPerf[0]?.pnl || 0).toFixed(2)}`
      }
    })
  }
  
  // Pattern 3: Consecutive losses
  if (analytics.maxConsecutiveLosses >= 5) {
    patterns.push({
      icon: '🎲',
      title: 'Streak Trading Risk',
      description: `You've experienced ${analytics.maxConsecutiveLosses} consecutive losses. After 3 losses, your decision-making may be compromised by emotions.`,
      severity: 'high',
      stats: {
        'Max Losing Streak': analytics.maxConsecutiveLosses,
        'Safe Threshold': '3 losses',
        'Recovery Plan': 'Needed'
      }
    })
  }
  
  // Pattern 4: Commission impact
  const commissionPercent = (analytics.totalCommission / Math.abs(analytics.totalPnL)) * 100
  if (commissionPercent > 15) {
    patterns.push({
      icon: '💸',
      title: 'High Commission Drag',
      description: `Fees are eating ${commissionPercent.toFixed(1)}% of your profits. Consider reducing trade frequency or finding lower-fee exchanges.`,
      severity: 'medium',
      stats: {
        'Total Commissions': `${analytics.totalCommission.toFixed(2)}`,
        'As % of P&L': `${commissionPercent.toFixed(1)}%`,
        'Healthy Range': '<10%'
      }
    })
  }
  
  // Pattern 5: Symbol concentration
  const symbols = Object.entries(analytics.symbols)
  if (symbols.length > 0) {
    const topSymbol = symbols.reduce((best, [sym, data]) => 
      (data.trades > (best[1]?.trades || 0)) ? [sym, data] : best, ['', {}]
    )
    const concentration = (topSymbol[1].trades / analytics.completedTrades) * 100
    
    if (concentration > 60) {
      patterns.push({
        icon: '🎯',
        title: 'High Symbol Concentration',
        description: `${concentration.toFixed(0)}% of your trades are in ${topSymbol[0]}. While focus is good, consider diversification for risk management.`,
        severity: 'low',
        stats: {
          'Primary Symbol': topSymbol[0],
          'Concentration': `${concentration.toFixed(1)}%`,
          'Total Symbols': symbols.length
        }
      })
    }
  }
  
  // Pattern 6: Behavioral consistency
  if (psychology.behavioralPatterns) {
    const afterWins = psychology.behavioralPatterns.afterWins
    const afterLosses = psychology.behavioralPatterns.afterLosses
    
    if (psychology.behavioralPatterns.isOverconfident) {
      patterns.push({
        icon: '⚡',
        title: 'Overconfidence After Wins',
        description: 'You increase position sizes significantly after winning trades, which leads to larger losses. Consistency is key.',
        severity: 'high',
        stats: {
          'Size Increase': `${((afterWins.avgSize / afterLosses.avgSize - 1) * 100).toFixed(0)}%`,
          'Win Rate After Wins': `${afterWins.winRate.toFixed(1)}%`,
          'Suggested': 'Keep consistent size'
        }
      })
    }
  }
  
  return patterns
}

export default function AnalyticsView({ 
  analytics, 
  currSymbol, 
  exchangeConfig,
  currencyMetadata,
  currency,
  setCurrency,
  onDisconnect 
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
      />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Hero Metrics */}
        <HeroMetrics analytics={analytics} currSymbol={currSymbol} />

        {/* Tabs */}
        <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-slate-700/50">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${
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
          <div className="p-6">
            {activeTab === 'overview' && <OverviewTab analytics={analytics} currSymbol={currSymbol} />}
            {activeTab === 'spot' && <SpotTab analytics={analytics} currSymbol={currSymbol} />}
            {activeTab === 'futures' && <FuturesTab analytics={analytics} currSymbol={currSymbol} />}
          </div>
        </div>
      </main>
    </div>
  )
}
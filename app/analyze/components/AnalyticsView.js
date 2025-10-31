// app/analyze/components/AnalyticsView.js
'use client'

import { useState } from 'react'
import {
  DollarSign, TrendingUp, Target, Activity, Award, Brain,
  CheckCircle, AlertTriangle, Lightbulb, Clock, Calendar,
  Zap, Layers, TrendingDown, Eye, Flame, Trophy, Shield,
  BarChart3, PieChart, LineChart, ArrowUpRight, ArrowDownRight,
  AlertCircle, Sparkles, ChevronRight, ChevronLeft, ChevronDown,
  Scissors, Shuffle, Coffee, Tv, Pizza, Fuel, Utensils,
  Database, FileText, Briefcase, Filter, X
} from 'lucide-react'
import { generatePerformanceAnalogies } from '../utils/performanceAnalogies'
import { analyzeDrawdowns } from '../utils/drawdownAnalysis'
import { analyzeTimeBasedPerformance } from '../utils/timeBasedAnalysis'
import { analyzeSymbols } from '../utils/symbolAnalysis'
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

// Helper function to format numbers with commas
const formatNumber = (num, decimals = 2) => {
  if (num === null || num === undefined || isNaN(num)) return '0'
  return Number(num).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

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
      {/* Data Source Banner */}
      {(metadata?.exchanges?.length > 0 || metadata?.csvFiles?.length > 0) && (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Database className="w-4 h-4" />
              <span className="font-semibold">Data Sources:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {metadata.exchanges?.map((exchange, idx) => (
                <div key={idx} className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-xs font-medium text-emerald-400">
                  {exchange.toUpperCase()}
                </div>
              ))}
              {metadata.csvFiles?.map((file, idx) => (
                <div key={idx} className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-md text-xs font-medium text-cyan-400 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {file.filename || `CSV ${idx + 1}`}
                </div>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
              <Activity className="w-3 h-3" />
              <span className="font-semibold">{tradeCount.toLocaleString()}</span> trades analyzed
            </div>
          </div>
        </div>
      )}

      {/* Limited Data Notice - Show if user has fewer than 20 trades */}
      <LimitedDataNotice tradeCount={tradeCount} minRecommended={20} />

      {/* Data Quality Banner - Show if user has good data (50+ trades) */}
      <DataQualityBanner tradeCount={tradeCount} symbolCount={symbolCount} />

      {/* Featured P&L Card - Simplified */}
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left: Main P&L */}
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isProfitable ? 'bg-emerald-500/10' : 'bg-red-500/10'
              }`}>
                <DollarSign className={`w-5 h-5 ${isProfitable ? 'text-emerald-400' : 'text-red-400'}`} />
              </div>
              <div className="text-left">
                <div className="text-xs text-slate-400 uppercase tracking-wider font-medium">Total P&L</div>
              </div>
            </div>

            <div className={`text-4xl md:text-5xl font-bold mb-2 ${
              isProfitable ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {isProfitable ? '+' : ''}{currSymbol}{Math.abs(analytics.totalPnL).toFixed(2)}
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                {analytics.totalTrades} trades
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {analytics.roi?.toFixed(1) || '0.0'}% ROI
              </span>
            </div>
          </div>

          {/* Right: Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
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
          </div>
        </div>
      </div>

      {/* Account Type Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
// LIVE HOLDINGS SECTION
// ============================================

function LiveHoldings({ analytics, metadata, currSymbol }) {
  const hasSpotHoldings = metadata?.spotHoldings && metadata.spotHoldings.length > 0
  const hasFuturesPositions = analytics.futuresOpenPositions && analytics.futuresOpenPositions.length > 0

  if (!hasSpotHoldings && !hasFuturesPositions) {
    return null
  }

  return (
    <div className="bg-slate-800/20 border border-slate-700/30 rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-700/30">
        <h3 className="text-xs font-medium text-slate-300 flex items-center gap-2">
          <Layers className="w-3 h-3 text-slate-400" />
          Live Holdings
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 p-2">
        {/* Spot Holdings */}
        {hasSpotHoldings && (
          <div className="bg-slate-800/20 border border-slate-700/30 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700/30 bg-slate-800/30">
              <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-slate-400" />
                Spot Holdings
              </h3>
            </div>
            <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
              {metadata.spotHoldings
                .sort((a, b) => b.usdValue - a.usdValue)
                .slice(0, 5)
                .map((holding) => (
                  <div key={holding.asset} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-700/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center text-xs font-bold text-slate-300">
                        {holding.asset.slice(0, 2)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-200">{holding.asset}</div>
                        <div className="text-xs text-slate-500 font-mono">{holding.quantity?.toFixed(4)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-slate-200">
                        {currSymbol}{holding.usdValue?.toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-500">
                        @{currSymbol}{holding.price?.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            {metadata.spotHoldings.length > 5 && (
              <div className="px-4 py-2 border-t border-slate-700/30 text-xs text-slate-500 text-center">
                +{metadata.spotHoldings.length - 5} more assets
              </div>
            )}
            <div className="px-4 py-3 border-t border-slate-700/30 bg-slate-800/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Total Value</span>
                <span className="text-sm font-bold text-slate-200">
                  {currSymbol}{metadata.totalSpotValue?.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Futures Positions */}
        {hasFuturesPositions && (
          <div className="bg-slate-800/20 border border-slate-700/30 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700/30 bg-slate-800/30">
              <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Zap className="w-4 h-4 text-slate-400" />
                Open Futures Positions
              </h3>
            </div>
            <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
              {analytics.futuresOpenPositions.slice(0, 3).map((pos, idx) => (
                <div key={idx} className="py-2 px-3 rounded-lg border border-slate-700/20 bg-slate-800/20">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-sm font-medium text-slate-200">{pos.symbol}</div>
                      <div className="text-xs text-slate-500">{pos.side} • {pos.leverage}x</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-bold ${(pos.unrealizedProfit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {(pos.unrealizedProfit || 0) >= 0 ? '+' : ''}{currSymbol}{Math.abs(pos.unrealizedProfit || 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {(((pos.unrealizedProfit || 0) / (pos.margin || 1)) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>Entry: {currSymbol}{pos.entryPrice?.toFixed(2)}</span>
                    <span>Mark: {currSymbol}{pos.markPrice?.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
            {analytics.futuresOpenPositions.length > 3 && (
              <div className="px-4 py-2 border-t border-slate-700/30 text-xs text-slate-500 text-center">
                +{analytics.futuresOpenPositions.length - 3} more positions
              </div>
            )}
            <div className="px-4 py-3 border-t border-slate-700/30 bg-slate-800/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Unrealized P&L</span>
                <span className={`text-sm font-bold ${(analytics.futuresUnrealizedPnL || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {(analytics.futuresUnrealizedPnL || 0) >= 0 ? '+' : ''}{currSymbol}{Math.abs(analytics.futuresUnrealizedPnL || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// RADIAL PSYCHOLOGY SCORE - APPLE WATCH RINGS STYLE
// ============================================

function RadialPsychologyScore({ score, analytics }) {
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  const getScoreColor = (score) => {
    if (score >= 80) return { primary: '#10b981', secondary: '#34d399', glow: '#10b981' }
    if (score >= 70) return { primary: '#06b6d4', secondary: '#22d3ee', glow: '#06b6d4' }
    if (score >= 60) return { primary: '#f59e0b', secondary: '#fbbf24', glow: '#f59e0b' }
    if (score >= 50) return { primary: '#f97316', secondary: '#fb923c', glow: '#f97316' }
    return { primary: '#ef4444', secondary: '#f87171', glow: '#ef4444' }
  }

  const colors = getScoreColor(score)
  const winRate = analytics.winRate || 0
  const profitFactor = analytics.profitFactor || 0

  return (
    <div className="flex flex-col items-center">
      {/* Radial Progress Circle */}
      <div className="relative flex items-center justify-center mb-6">
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-full blur-xl opacity-30"
             style={{
               width: '200px',
               height: '200px',
               background: `radial-gradient(circle, ${colors.glow}40 0%, transparent 70%)`
             }} />

        {/* SVG Circle */}
        <svg className="transform -rotate-90" width="180" height="180">
          {/* Background circle */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="rgba(71, 85, 105, 0.15)"
            strokeWidth="14"
          />
          {/* Progress circle */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke={`url(#gradient-${score})`}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
            style={{ filter: `drop-shadow(0 0 6px ${colors.primary}80)` }}
          />
          {/* Gradient definition */}
          <defs>
            <linearGradient id={`gradient-${score}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.primary} />
              <stop offset="100%" stopColor={colors.secondary} />
            </linearGradient>
          </defs>
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-5xl font-bold text-white mb-1">{score}</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider">Discipline</div>
        </div>
      </div>

      {/* Mini stats below */}
      <div className="w-full grid grid-cols-2 gap-3">
        <div className="text-center p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
          <div className="text-xs text-slate-500 mb-1">Win Rate</div>
          <div className={`text-lg font-bold ${winRate >= 50 ? 'text-emerald-400' : 'text-slate-400'}`}>
            {winRate.toFixed(1)}%
          </div>
        </div>
        <div className="text-center p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
          <div className="text-xs text-slate-500 mb-1">Profit Factor</div>
          <div className={`text-lg font-bold ${profitFactor >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>
            {profitFactor.toFixed(2)}x
          </div>
        </div>
      </div>
    </div>
  )
}

// Alias for backward compatibility
const PsychologyScoreCompact = RadialPsychologyScore

// ============================================
// PERFORMANCE ANALOGIES - RELATABLE COMPARISONS
// ============================================

function PerformanceAnalogies({ analytics, currSymbol }) {
  const analogies = generatePerformanceAnalogies(analytics)

  if (!analogies || Object.keys(analogies).length === 0) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Hourly Rate */}
      {analogies.hourlyRate && (
        <div className="bg-slate-800/20 border border-slate-700/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-slate-700/50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-medium text-slate-400 mb-1">Hourly Earnings</h4>
              <p className="text-xl font-bold text-slate-200 mb-1">{analogies.hourlyRate.formatted}</p>
              <p className="text-xs text-slate-500">{analogies.hourlyRate.totalHours.toFixed(0)} active hours • {analogies.hourlyRate.comparison}</p>
            </div>
          </div>
        </div>
      )}

      {/* Money Comparison */}
      {analogies.moneyComparison && (
        <div className="bg-slate-800/20 border border-slate-700/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl flex-shrink-0">
              {analogies.moneyComparison.item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-medium text-slate-400 mb-1">Real-World Value</h4>
              <p className="text-sm font-semibold text-slate-200 mb-1">
                {analogies.moneyComparison.comparison}
              </p>
              <p className="text-xs text-slate-500">
                {currSymbol}{Math.abs(analytics.totalPnL).toFixed(2)} {analytics.totalPnL >= 0 ? 'profit' : 'loss'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sports Comparison */}
      {analogies.sportsComparison && (
        <div className="bg-slate-800/20 border border-slate-700/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl flex-shrink-0">
              {analogies.sportsComparison.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-medium text-slate-400 mb-1">Win Rate: {analytics.winRate?.toFixed(1)}%</h4>
              <p className="text-sm font-semibold text-slate-200 mb-1">
                {analogies.sportsComparison.comparison}
              </p>
              <p className="text-xs text-slate-500">
                {analogies.sportsComparison.detail}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Risk/Reward Comparison */}
      {analogies.riskRewardComparison && (
        <div className="bg-slate-800/20 border border-slate-700/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl flex-shrink-0">
              {analogies.riskRewardComparison.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-medium text-slate-400 mb-1">Profit Factor: {analytics.profitFactor?.toFixed(2)}x</h4>
              <p className="text-sm font-semibold text-slate-200 mb-1">
                {analogies.riskRewardComparison.comparison}
              </p>
              <p className="text-xs text-slate-500">
                {analogies.riskRewardComparison.detail}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// DRAWDOWN ANALYSIS COMPONENTS
// ============================================

function UnderwaterEquityCurve({ underwaterData }) {
  if (!underwaterData || underwaterData.length === 0) return null

  const chartData = underwaterData.map(point => ({
    date: new Date(point.timestamp).toLocaleDateString(),
    underwater: point.underwaterPercent.toFixed(2)
  }))

  return (
    <div className="bg-slate-800/20 border border-slate-700/30 rounded-xl p-6">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-red-400" />
          Underwater Equity Curve
        </h3>
        <p className="text-xs text-slate-500 mt-1">% below peak balance over time</p>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="underwaterGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            stroke="#64748b"
            style={{ fontSize: '10px' }}
            tick={{ fill: '#64748b' }}
            tickLine={false}
          />
          <YAxis
            stroke="#64748b"
            style={{ fontSize: '10px' }}
            tick={{ fill: '#64748b' }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            formatter={(value) => [`${value}%`, 'Drawdown']}
          />
          <Area
            type="monotone"
            dataKey="underwater"
            stroke="#ef4444"
            strokeWidth={2}
            fill="url(#underwaterGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function WorstDrawdownsTable({ drawdowns, currSymbol }) {
  if (!drawdowns || drawdowns.length === 0) return null

  return (
    <div className="bg-slate-800/20 border border-slate-700/30 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-700/30">
        <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Worst Drawdown Periods
        </h3>
        <p className="text-xs text-slate-500 mt-1">Your most challenging trading periods</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-800/30">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Rank</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Start Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Drawdown</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Duration</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Recovery</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {drawdowns.map((dd) => (
              <tr key={dd.rank} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3">
                  <span className="text-sm font-bold text-amber-400">#{dd.rank}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-slate-300">
                    {new Date(dd.startDate).toLocaleDateString()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-bold text-red-400">
                    {Math.abs(dd.drawdownPercent).toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-red-400">
                    -{currSymbol}{Math.abs(dd.drawdownAmount).toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-slate-400">
                    {dd.drawdownDays} days
                  </span>
                </td>
                <td className="px-4 py-3">
                  {dd.recovered ? (
                    <span className="text-sm text-emerald-400">
                      {dd.recoveryDays} days
                    </span>
                  ) : (
                    <span className="text-sm text-amber-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {dd.recovered ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs">
                      <CheckCircle className="w-3 h-3" />
                      Recovered
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs">
                      <Clock className="w-3 h-3" />
                      Active
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DrawdownPatterns({ patterns }) {
  if (!patterns || patterns.length === 0) return null

  return (
    <div className="space-y-3">
      {patterns.map((pattern, index) => (
        <div
          key={index}
          className={`border rounded-xl p-4 ${
            pattern.severity === 'high'
              ? 'bg-red-500/5 border-red-500/20'
              : pattern.severity === 'medium'
              ? 'bg-amber-500/5 border-amber-500/20'
              : 'bg-slate-800/20 border-slate-700/30'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              pattern.severity === 'high'
                ? 'bg-red-500/10 text-red-400'
                : pattern.severity === 'medium'
                ? 'bg-amber-500/10 text-amber-400'
                : 'bg-slate-700/50 text-slate-400'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <h4 className={`text-sm font-medium mb-1 ${
                pattern.severity === 'high'
                  ? 'text-red-400'
                  : pattern.severity === 'medium'
                  ? 'text-amber-400'
                  : 'text-slate-300'
              }`}>
                {pattern.title}
              </h4>
              <p className="text-xs text-slate-400 mb-2">{pattern.message}</p>
              <p className="text-xs text-slate-500 italic">{pattern.recommendation}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================
// TIME-BASED PERFORMANCE COMPONENTS
// ============================================

function HourlyPerformanceChart({ hourlyData }) {
  if (!hourlyData || hourlyData.length === 0) return null

  const chartData = hourlyData.filter(h => h.trades > 0)

  return (
    <div className="bg-slate-800/20 border border-slate-700/30 rounded-xl p-6">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          Performance by Hour
        </h3>
        <p className="text-xs text-slate-500 mt-1">Which hours are you most profitable?</p>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData}>
          <XAxis
            dataKey="label"
            stroke="#64748b"
            style={{ fontSize: '10px' }}
            tick={{ fill: '#64748b' }}
            tickLine={false}
          />
          <YAxis
            stroke="#64748b"
            style={{ fontSize: '10px' }}
            tick={{ fill: '#64748b' }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            formatter={(value) => [`$${value.toFixed(2)}`, 'Avg P&L']}
          />
          <Bar dataKey="avgPnL" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.avgPnL >= 0 ? '#10b981' : '#ef4444'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function DayOfWeekChart({ dailyData }) {
  if (!dailyData || dailyData.length === 0) return null

  const chartData = dailyData.filter(d => d.trades > 0)

  return (
    <div className="bg-slate-800/20 border border-slate-700/30 rounded-xl p-6">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-400" />
          Performance by Day of Week
        </h3>
        <p className="text-xs text-slate-500 mt-1">Your best and worst trading days</p>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData}>
          <XAxis
            dataKey="dayName"
            stroke="#64748b"
            style={{ fontSize: '11px' }}
            tick={{ fill: '#64748b' }}
            tickLine={false}
          />
          <YAxis
            stroke="#64748b"
            style={{ fontSize: '10px' }}
            tick={{ fill: '#64748b' }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            formatter={(value) => [`$${value.toFixed(2)}`, 'Total P&L']}
          />
          <Bar dataKey="totalPnL" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.totalPnL >= 0 ? '#10b981' : '#ef4444'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function MonthlyPerformanceChart({ monthlyData }) {
  if (!monthlyData || monthlyData.length === 0) return null

  return (
    <div className="bg-slate-800/20 border border-slate-700/30 rounded-xl p-6">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-400" />
          Monthly Performance
        </h3>
        <p className="text-xs text-slate-500 mt-1">Tracking your consistency over time</p>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={monthlyData}>
          <XAxis
            dataKey="monthName"
            stroke="#64748b"
            style={{ fontSize: '10px' }}
            tick={{ fill: '#64748b' }}
            tickLine={false}
          />
          <YAxis
            stroke="#64748b"
            style={{ fontSize: '10px' }}
            tick={{ fill: '#64748b' }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            formatter={(value) => [`$${value.toFixed(2)}`, 'Total P&L']}
          />
          <Bar dataKey="totalPnL" radius={[4, 4, 0, 0]}>
            {monthlyData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.totalPnL >= 0 ? '#10b981' : '#ef4444'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ============================================
// SYMBOL RECOMMENDATIONS COMPONENTS
// ============================================

function SymbolRecommendations({ recommendations, currSymbol }) {
  if (!recommendations || recommendations.length === 0) return null

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={Target}
        title="Symbol Recommendations"
        subtitle="Data-driven guidance on which pairs to trade"
        color="neutral"
      />

      <div className="space-y-3">
        {recommendations.map((rec, index) => (
          <div
            key={index}
            className={`border rounded-xl p-5 ${
              rec.type === 'focus'
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : rec.type === 'avoid'
                ? 'bg-red-500/5 border-red-500/20'
                : rec.type === 'inefficient'
                ? 'bg-amber-500/5 border-amber-500/20'
                : 'bg-slate-800/20 border-slate-700/30'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                rec.type === 'focus'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : rec.type === 'avoid'
                  ? 'bg-red-500/10 text-red-400'
                  : rec.type === 'inefficient'
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'bg-slate-700/50 text-slate-400'
              }`}>
                {rec.type === 'focus' && <Trophy className="w-5 h-5" />}
                {rec.type === 'avoid' && <AlertTriangle className="w-5 h-5" />}
                {rec.type === 'inefficient' && <Zap className="w-5 h-5" />}
                {rec.type === 'low_data' && <Activity className="w-5 h-5" />}
              </div>

              <div className="flex-1">
                <h4 className={`text-sm font-semibold mb-2 ${
                  rec.type === 'focus'
                    ? 'text-emerald-400'
                    : rec.type === 'avoid'
                    ? 'text-red-400'
                    : rec.type === 'inefficient'
                    ? 'text-amber-400'
                    : 'text-slate-300'
                }`}>
                  {rec.title}
                </h4>

                <p className="text-sm text-slate-400 mb-3">{rec.message}</p>

                {rec.details && rec.details.length > 0 && (
                  <div className="space-y-2">
                    {rec.details.map((detail, idx) => (
                      <div key={idx} className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-slate-200">{detail.symbol}</span>
                          {detail.totalPnL !== undefined && (
                            <span className={`text-sm font-bold ${detail.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {detail.totalPnL >= 0 ? '+' : ''}{currSymbol}{detail.totalPnL.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {detail.winRate !== undefined && (
                            <div className="text-slate-500">
                              Win Rate: <span className="text-slate-300 font-medium">{detail.winRate.toFixed(1)}%</span>
                            </div>
                          )}
                          {detail.profitFactor !== undefined && (
                            <div className="text-slate-500">
                              PF: <span className="text-slate-300 font-medium">{detail.profitFactor.toFixed(2)}x</span>
                            </div>
                          )}
                          {detail.expectancy !== undefined && (
                            <div className="text-slate-500">
                              Expectancy: <span className="text-slate-300 font-medium">{currSymbol}{detail.expectancy.toFixed(2)}</span>
                            </div>
                          )}
                          {detail.trades !== undefined && (
                            <div className="text-slate-500">
                              Trades: <span className="text-slate-300 font-medium">{detail.trades}</span>
                            </div>
                          )}
                        </div>
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

function SymbolRankingsTable({ rankings, currSymbol }) {
  if (!rankings || rankings.length === 0) return null

  const topSymbols = rankings.slice(0, 10) // Show top 10

  return (
    <div className="bg-slate-800/20 border border-slate-700/30 rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-700/30">
        <h3 className="text-xs font-medium text-slate-300 flex items-center gap-2">
          <Trophy className="w-3 h-3 text-amber-400" />
          Symbol Performance Rankings
        </h3>
        <p className="text-[10px] text-slate-500 mt-0.5">Multi-factor scoring: win rate, profit factor, total P&L</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-800/30">
            <tr>
              <th className="px-2 py-2 text-left text-[10px] font-medium text-slate-400">Rank</th>
              <th className="px-2 py-2 text-left text-[10px] font-medium text-slate-400">Symbol</th>
              <th className="px-2 py-2 text-left text-[10px] font-medium text-slate-400">Score</th>
              <th className="px-2 py-2 text-left text-[10px] font-medium text-slate-400">Win Rate</th>
              <th className="px-2 py-2 text-left text-[10px] font-medium text-slate-400">PF</th>
              <th className="px-2 py-2 text-left text-[10px] font-medium text-slate-400">Total P&L</th>
              <th className="px-2 py-2 text-left text-[10px] font-medium text-slate-400">Trades</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {topSymbols.map((symbol) => (
              <tr key={symbol.symbol} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-2 py-1.5">
                  <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                    symbol.rank === 1
                      ? 'bg-amber-500/20 text-amber-400'
                      : symbol.rank === 2
                      ? 'bg-slate-400/20 text-slate-300'
                      : symbol.rank === 3
                      ? 'bg-amber-700/20 text-amber-600'
                      : 'bg-slate-700/30 text-slate-400'
                  }`}>
                    {symbol.rank}
                  </div>
                </td>
                <td className="px-2 py-1.5">
                  <span className="text-xs font-bold text-slate-200">{symbol.symbol}</span>
                </td>
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-12 bg-slate-700/30 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                        style={{ width: `${symbol.score}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">{symbol.score.toFixed(0)}</span>
                  </div>
                </td>
                <td className="px-2 py-1.5">
                  <span className="text-xs text-slate-300">{symbol.winRate.toFixed(1)}%</span>
                </td>
                <td className="px-2 py-1.5">
                  <span className="text-xs text-slate-300">{symbol.profitFactor.toFixed(2)}</span>
                </td>
                <td className="px-2 py-1.5">
                  <span className={`text-xs font-medium ${symbol.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {symbol.totalPnL >= 0 ? '+' : ''}{currSymbol}{symbol.totalPnL.toFixed(2)}
                  </span>
                </td>
                <td className="px-2 py-1.5">
                  <span className="text-xs text-slate-400">{symbol.trades}</span>
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
        <div className="space-y-3">
          {/* All Patterns - Uniform Grid */}
          <div className="grid grid-cols-1 gap-3">
            {sortedPatterns.map((pattern, i) => {
              const IconComponent = pattern.icon
              return (
                <div
                  key={i}
                  className={`bg-slate-800/30 border rounded-lg p-4 ${
                    pattern.severity === 'high' ? 'border-red-500/30' :
                    pattern.severity === 'medium' ? 'border-yellow-500/20' :
                    'border-slate-700/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <IconBadge
                      icon={IconComponent}
                      color={pattern.severity === 'high' ? 'red' : pattern.severity === 'medium' ? 'yellow' : 'emerald'}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-sm">{pattern.title}</h4>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ml-2 ${
                          pattern.severity === 'high' ? 'bg-red-500/10 text-red-400' :
                          pattern.severity === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                          'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {pattern.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{pattern.description}</p>
                      {pattern.stats && (
                        <div className="flex flex-wrap gap-2 mt-2 text-xs">
                          {Object.entries(pattern.stats).map(([key, value]) => (
                            <div key={key} className="bg-slate-700/30 px-2 py-1 rounded">
                              <span className="text-slate-400">{key}:</span>{' '}
                              <span className="text-white font-mono">{value}</span>
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
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-300">Key Insights</h3>

      <div className="grid grid-cols-1 gap-3">
        {sortedInsights.map((insight, i) => (
          <InsightCardVariable
            key={i}
            insight={insight}
            onClick={() => onSelectInsight(insight)}
            featured={false}
          />
        ))}
      </div>
    </div>
  )
}

function InsightCardVariable({ insight, onClick }) {
  const typeStyles = {
    strength: 'border-emerald-500/20 bg-emerald-500/5',
    weakness: 'border-red-500/20 bg-red-500/5',
    recommendation: 'border-cyan-500/20 bg-cyan-500/5',
    pattern: 'border-purple-500/20 bg-purple-500/5'
  }

  const IconComponent = getIconComponent(insight.icon)

  const iconColor = insight.type === 'strength' ? 'emerald' :
    insight.type === 'weakness' ? 'red' :
    insight.type === 'recommendation' ? 'cyan' : 'purple'

  return (
    <div
      onClick={onClick}
      className={`${typeStyles[insight.type]} border rounded-lg cursor-pointer transition-colors hover:border-opacity-40 p-4`}
    >
      <div className="flex items-start justify-between mb-2">
        <IconBadge
          icon={IconComponent}
          color={iconColor}
          size="sm"
        />
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </div>

      <h4 className="font-semibold text-sm text-white mb-1">
        {insight.title}
      </h4>
      <p className="text-xs text-slate-400 line-clamp-2">
        {insight.summary}
      </p>
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

function OverviewTab({ analytics, currSymbol, metadata, setActiveTab }) {
  const [selectedInsight, setSelectedInsight] = useState(null)
  const [showCharts, setShowCharts] = useState(false)
  const [showSymbols, setShowSymbols] = useState(false)
  const psychology = analytics.psychology || {}

  const insights = generateEnhancedInsights(analytics, psychology)
  const patterns = detectHiddenPatterns(analytics, psychology)
  const analogies = generatePerformanceAnalogies(analytics)

  // NEW ANALYSES
  const drawdownAnalysis = analyzeDrawdowns(analytics.allTrades || [])
  const timeAnalysis = analyzeTimeBasedPerformance(analytics.allTrades || [])
  const symbolAnalysis = analyzeSymbols(analytics.allTrades || [])

  const isProfitable = analytics.totalPnL >= 0
  const hasFuturesData = (analytics.futuresPnL !== undefined && analytics.futuresPnL !== 0) || analytics.futuresOpenPositions?.length > 0

  // Calculate summary metrics
  const totalTrades = (analytics.spotTrades || 0) + (analytics.futuresTrades || 0)
  const exchanges = metadata?.exchanges || []
  const dateRange = analytics.allTrades && analytics.allTrades.length > 0
    ? {
        start: new Date(Math.min(...analytics.allTrades.map(t => new Date(t.timestamp).getTime()))),
        end: new Date(Math.max(...analytics.allTrades.map(t => new Date(t.timestamp).getTime())))
      }
    : null

  // Check if portfolio data is available (only present on live connections)
  const hasPortfolioData = metadata?.totalPortfolioValue !== undefined && metadata?.totalPortfolioValue !== null

  return (
    <div className="space-y-3">
      {/* Portfolio Overview Summary */}
      <div className="bg-gradient-to-br from-slate-800/40 to-slate-800/20 border border-slate-700/50 rounded-xl p-4">
        <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-400" />
          Portfolio Overview
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Total Portfolio Value - Only show if data available */}
          {hasPortfolioData ? (
            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
              <div className="text-xs text-slate-400 mb-1">Total Value</div>
              <div className="text-xl font-bold text-white">
                ${formatNumber(metadata?.totalPortfolioValue || 0, 2)} <span className="text-xs text-slate-400 font-normal">USD</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Spot: ${formatNumber(metadata?.totalSpotValue || 0, 0)} • Futures: ${formatNumber(metadata?.totalFuturesValue || 0, 0)}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
              <div className="text-xs text-slate-400 mb-1">Total Value</div>
              <div className="text-sm font-bold text-slate-400">
                Not Available
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Connect live to view portfolio
              </div>
            </div>
          )}

          {/* Total Trades */}
          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
            <div className="text-xs text-slate-400 mb-1">Trades Analyzed</div>
            <div className="text-xl font-bold text-white">{totalTrades.toLocaleString()}</div>
            <div className="text-[10px] text-slate-500 mt-1">
              {analytics.spotTrades || 0} Spot • {analytics.futuresTrades || 0} Futures
            </div>
          </div>

          {/* Exchanges */}
          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
            <div className="text-xs text-slate-400 mb-1">Exchanges</div>
            <div className="text-xl font-bold text-white">{exchanges.length}</div>
            <div className="text-[10px] text-slate-500 mt-1 capitalize">
              {exchanges.join(', ') || 'Unknown'}
            </div>
          </div>

          {/* Date Range */}
          {dateRange && (
            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
              <div className="text-xs text-slate-400 mb-1">Date Range</div>
              <div className="text-sm font-bold text-white">
                {dateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: dateRange.start.getFullYear() !== dateRange.end.getFullYear() ? 'numeric' : undefined })} to {dateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          )}

          {/* Account Type */}
          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
            <div className="text-xs text-slate-400 mb-1">Account Type</div>
            <div className="text-xl font-bold text-white capitalize">
              {metadata?.accountType || 'Mixed'}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {metadata?.hasSpot && 'Spot '}
              {metadata?.hasSpot && metadata?.hasFutures && '+ '}
              {metadata?.hasFutures && 'Futures'}
            </div>
          </div>
        </div>
      </div>

      {/* Compact P&L Metrics at Top */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className={`rounded-md border ${isProfitable ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'} p-2`}>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Total P&L</div>
          <div className={`text-lg font-bold ${isProfitable ? 'text-emerald-400' : 'text-red-400'}`}>
            {isProfitable ? '+' : ''}${formatNumber(Math.abs(analytics.totalPnL), 2)} <span className="text-[10px] text-slate-400 font-normal">USD</span>
          </div>
          <div className="text-[10px] text-slate-500">{analytics.totalTrades} trades</div>
        </div>

        <div className="bg-slate-800/20 border border-slate-700/30 rounded-md p-2">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Realized P&L</div>
          <div className="text-lg font-bold text-white">
            ${formatNumber((analytics.spotPnL || 0) + (analytics.futuresRealizedPnL || 0), 2)} <span className="text-[10px] text-slate-400 font-normal">USD</span>
          </div>
          <div className="text-[10px] text-slate-500">Closed positions</div>
        </div>

        {hasFuturesData && (
          <div className="bg-slate-800/20 border border-slate-700/30 rounded-md p-2">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Unrealized P&L</div>
            <div className={`text-lg font-bold ${(analytics.futuresUnrealizedPnL || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {currSymbol}{(analytics.futuresUnrealizedPnL || 0).toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">USD</span>
            </div>
            <div className="text-[10px] text-slate-500">{analytics.futuresOpenPositions?.length || 0} open</div>
          </div>
        )}

        <div className="bg-slate-800/20 border border-slate-700/30 rounded-md p-2">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Win Rate</div>
          <div className="text-lg font-bold text-white">
            {analytics.winRate.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-500">{analytics.winningTrades}W / {analytics.losingTrades}L</div>
        </div>
      </div>

      {/* Quick Tab Teasers - Drive users to specific tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {/* Spot Teaser */}
        {analytics.spotTrades > 0 && (
          <button
            onClick={() => setActiveTab('spot')}
            className="group bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 rounded-lg p-3 text-left transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400">Spot Trading</span>
              </div>
              <ChevronRight className="w-3 h-3 text-emerald-400/50 group-hover:text-emerald-400 transition-colors" />
            </div>
            <div className="text-lg font-bold text-white mb-1">${formatNumber(analytics.spotPnL, 2)} <span className="text-[10px] text-slate-400 font-normal">USD</span></div>
            <div className="text-[10px] text-slate-400">{analytics.spotTrades} trades • {analytics.spotWinRate.toFixed(1)}% win rate</div>
            <div className="text-[10px] text-emerald-400 mt-2 group-hover:underline">See detailed breakdown →</div>
          </button>
        )}

        {/* Futures Teaser */}
        {analytics.futuresTrades > 0 && (
          <button
            onClick={() => setActiveTab('futures')}
            className="group bg-cyan-500/5 hover:bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-500/40 rounded-lg p-3 text-left transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold text-cyan-400">Futures Trading</span>
              </div>
              <ChevronRight className="w-3 h-3 text-cyan-400/50 group-hover:text-cyan-400 transition-colors" />
            </div>
            <div className="text-lg font-bold text-white mb-1">${formatNumber(analytics.futuresPnL, 2)} <span className="text-[10px] text-slate-400 font-normal">USD</span></div>
            <div className="text-[10px] text-slate-400">{analytics.futuresOpenPositions?.length || 0} open • {analytics.futuresWinRate.toFixed(1)}% win rate</div>
            <div className="text-[10px] text-cyan-400 mt-2 group-hover:underline">Analyze leverage impact →</div>
          </button>
        )}

        {/* Behavioral Teaser */}
        {analytics.behavioral && analytics.behavioral.healthScore && (
          <button
            onClick={() => setActiveTab('behavioral')}
            className="group bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/20 hover:border-purple-500/40 rounded-lg p-3 text-left transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-semibold text-purple-400">Psychology</span>
              </div>
              <ChevronRight className="w-3 h-3 text-purple-400/50 group-hover:text-purple-400 transition-colors" />
            </div>
            <div className="text-lg font-bold text-white mb-1">{analytics.behavioral.healthScore}/100</div>
            <div className="text-[10px] text-slate-400">{analytics.behavioral.patterns?.filter(p => p.severity === 'high').length || 0} critical patterns detected</div>
            <div className="text-[10px] text-purple-400 mt-2 group-hover:underline">Fix your weaknesses →</div>
          </button>
        )}
      </div>

      {/* Top 3 Critical Insights Only - Compact */}
      {patterns.length > 0 && (
        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 text-orange-400" />
            Critical Patterns
          </h3>
          <div className="space-y-1">
            {patterns.slice(0, 3).map((pattern, idx) => (
              <div key={idx} className="bg-slate-800/20 border border-slate-700/30 rounded-md p-2 hover:border-slate-600/50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-xs font-medium text-slate-200">{pattern.title}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{pattern.description}</div>
                  </div>
                  <div className={`text-[10px] px-1.5 py-0.5 rounded ${
                    pattern.severity === 'high' ? 'bg-red-500/10 text-red-400' :
                    pattern.severity === 'medium' ? 'bg-orange-500/10 text-orange-400' :
                    'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    {pattern.severity}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Symbol Rankings Table */}
      {symbolAnalysis && symbolAnalysis.rankings && symbolAnalysis.rankings.length > 0 && (
        <SymbolRankingsTable rankings={symbolAnalysis.rankings} currSymbol={currSymbol} />
      )}

      {/* Premium Teaser - Time Analysis */}
      <div className="bg-gradient-to-br from-purple-500/5 to-cyan-500/5 border border-purple-500/20 rounded-lg p-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-purple-500/10 px-2 py-0.5 rounded-bl-lg">
          <span className="text-[10px] font-bold text-purple-400">PRO</span>
        </div>
        <div className="flex items-start gap-3">
          <Clock className="w-4 h-4 text-purple-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-semibold text-slate-200 mb-1">Time-Based Performance Analysis</h4>
            <p className="text-[10px] text-slate-400 mb-2">Discover your most profitable hours, days, and months. See when you make the best decisions.</p>
            <div className="flex items-center gap-2 text-[10px] text-purple-400">
              <Sparkles className="w-3 h-3" />
              <span>Unlock with Pro to see hourly, daily & monthly breakdowns</span>
            </div>
          </div>
        </div>
      </div>

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
  const currency = currSymbol || '$'

  if (!hasSpotData) {
    return (
      <EmptyState
        icon={Briefcase}
        title="No Spot Trading Data"
        description="Start spot trading to see portfolio breakdown and performance analytics."
        variant="info"
      />
    )
  }

  return (
    <div className="space-y-3">
      {/* Compact Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="bg-slate-800/20 border border-slate-700/30 rounded-md p-2">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Spot P&L</div>
          <div className={`text-lg font-bold ${analytics.spotPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ${formatNumber(analytics.spotPnL || 0, 2)} <span className="text-[10px] text-slate-400 font-normal">USD</span>
          </div>
          <div className="text-[10px] text-slate-500">{analytics.spotRoi?.toFixed(1) || '0.0'}% ROI</div>
        </div>
        <div className="bg-slate-800/20 border border-slate-700/30 rounded-md p-2">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Win Rate</div>
          <div className="text-lg font-bold text-white">{analytics.spotWinRate?.toFixed(1) || '0.0'}%</div>
          <div className="text-[10px] text-slate-500">{analytics.spotWins || 0}W / {analytics.spotLosses || 0}L</div>
        </div>
        <div className="bg-slate-800/20 border border-slate-700/30 rounded-md p-2">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Invested</div>
          <div className="text-lg font-bold text-white">${formatNumber(analytics.spotInvested || 0, 0)} <span className="text-[10px] text-slate-400 font-normal">USD</span></div>
          <div className="text-[10px] text-slate-500">{analytics.spotTrades || 0} trades</div>
        </div>
        <div className="bg-slate-800/20 border border-slate-700/30 rounded-md p-2">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Best Win</div>
          <div className="text-lg font-bold text-emerald-400">${formatNumber(spotAnalysis.largestWin || 0, 2)} <span className="text-[10px] text-slate-400 font-normal">USD</span></div>
          <div className="text-[10px] text-slate-500">Max gain</div>
        </div>
      </div>

      {/* Current Holdings - Compact */}
      {metadata?.spotHoldings && metadata.spotHoldings.length > 0 && (
        <div className="bg-slate-800/20 border border-slate-700/30 rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-700/30 bg-slate-800/30">
            <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <Layers className="w-3 h-3 text-emerald-400" />
              Current Holdings
              <span className="text-[10px] text-slate-500 font-normal ml-1">(All Exchanges)</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-800/30">
                <tr className="text-left text-[10px] text-slate-400">
                  <th className="px-2 py-2">Asset</th>
                  <th className="px-2 py-2">Exchange</th>
                  <th className="px-2 py-2 text-right">Qty</th>
                  <th className="px-2 py-2 text-right">Price</th>
                  <th className="px-2 py-2 text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {metadata.spotHoldings.sort((a, b) => b.usdValue - a.usdValue).map((holding, idx) => {
                  // Get exchange name from holding or metadata
                  const exchangeName = holding.exchange || metadata.exchanges?.[0] || 'Unknown'
                  const exchangeIcon = exchangeName.toLowerCase() === 'binance' ? '🟡' : exchangeName.toLowerCase() === 'coindcx' ? '🇮🇳' : '🔷'

                  return (
                    <tr key={`${holding.asset}-${idx}`} className="border-b border-slate-800/30 hover:bg-slate-700/10">
                      <td className="px-2 py-1.5 font-mono font-semibold">{holding.asset}</td>
                      <td className="px-2 py-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                          <span>{exchangeIcon}</span>
                          <span className="capitalize">{exchangeName}</span>
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-slate-300">{holding.quantity?.toFixed(4)}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-slate-400">{currency}{holding.price?.toFixed(2)} <span className="text-[9px] text-slate-500">USD</span></td>
                      <td className="px-2 py-1.5 text-right font-bold text-emerald-400">{currency}{holding.usdValue?.toFixed(2)} <span className="text-[9px] text-slate-400 font-normal">USD</span></td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-slate-800/50">
                <tr className="font-bold">
                  <td className="px-2 py-2" colSpan="4">Total</td>
                  <td className="px-2 py-2 text-right text-emerald-400">{currency}{metadata?.totalSpotValue?.toFixed(2)} <span className="text-[9px] text-slate-400 font-normal">USD</span></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Premium Teaser - Portfolio Rebalancing */}
      <div className="bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 border border-emerald-500/20 rounded-lg p-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-emerald-500/10 px-2 py-0.5 rounded-bl-lg">
          <span className="text-[10px] font-bold text-emerald-400">PRO</span>
        </div>
        <div className="flex items-start gap-3">
          <PieChart className="w-4 h-4 text-emerald-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-semibold text-slate-200 mb-1">Portfolio Rebalancing Suggestions</h4>
            <p className="text-[10px] text-slate-400 mb-2">Get AI-powered recommendations on when to rebalance your portfolio based on market conditions and your risk profile.</p>
            <div className="flex items-center gap-2 text-[10px] text-emerald-400">
              <Sparkles className="w-3 h-3" />
              <span>Unlock smart rebalancing alerts with Pro</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FuturesTab({ analytics, currSymbol }) {
  const futuresAnalysis = analytics.futuresAnalysis || {}
  const hasFuturesData = analytics.futuresTrades > 0
  const currency = currSymbol || '$'

  if (!hasFuturesData) {
    return <EmptyState icon={Zap} title="No Futures Trading Data" variant="info" />
  }

  return (
    <div className="space-y-3">
      {/* Compact Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="bg-slate-800/20 border border-slate-700/30 rounded-md p-2">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Net P&L</div>
          <div className={`text-lg font-bold ${analytics.futuresPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ${formatNumber(analytics.futuresPnL || 0, 2)} <span className="text-[10px] text-slate-400 font-normal">USD</span>
          </div>
          <div className="text-[10px] text-slate-500">
            {analytics.futuresTrades || 0} trades
          </div>
        </div>

        <div className="bg-slate-800/20 border border-slate-700/30 rounded-md p-2">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Realized</div>
          <div className={`text-lg font-bold ${analytics.futuresRealizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ${formatNumber(analytics.futuresRealizedPnL || 0, 2)} <span className="text-[10px] text-slate-400 font-normal">USD</span>
          </div>
          <div className="text-[10px] text-slate-500">Closed positions</div>
        </div>

        <div className="bg-slate-800/20 border border-slate-700/30 rounded-md p-2">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Unrealized</div>
          <div className={`text-lg font-bold ${analytics.futuresUnrealizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ${formatNumber(analytics.futuresUnrealizedPnL || 0, 2)} <span className="text-[10px] text-slate-400 font-normal">USD</span>
          </div>
          <div className="text-[10px] text-slate-500">
            {analytics.futuresOpenPositions?.length || 0} open
          </div>
        </div>

        <div className="bg-slate-800/20 border border-slate-700/30 rounded-md p-2">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Win Rate</div>
          <div className={`text-lg font-bold ${analytics.futuresWinRate >= 55 ? 'text-emerald-400' : 'text-slate-300'}`}>
            {analytics.futuresWinRate?.toFixed(1) || '0.0'}%
          </div>
          <div className="text-[10px] text-slate-500">
            {analytics.futuresWins || 0}W / {analytics.futuresLosses || 0}L
          </div>
        </div>
      </div>

      {/* Funding & Commission - Compact Row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-800/20 border border-slate-700/30 rounded-md p-2">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap className="w-3 h-3 text-yellow-400" />
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Funding Fees</span>
          </div>
          <div className={`text-lg font-bold ${(analytics.futuresFundingFees || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {(analytics.futuresFundingFees || 0) >= 0 ? '+' : ''}${formatNumber(Math.abs(analytics.futuresFundingFees || 0), 2)} <span className="text-[10px] text-slate-400 font-normal">USD</span>
          </div>
          <div className="text-[10px] text-slate-500">
            {(analytics.futuresFundingFees || 0) >= 0 ? 'Earned' : 'Paid'}
          </div>
        </div>

        <div className="bg-slate-800/20 border border-slate-700/30 rounded-md p-2">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-3 h-3 text-red-400" />
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Commission</span>
          </div>
          <div className="text-lg font-bold text-red-400">
            -${formatNumber(analytics.futuresCommission || 0, 2)} <span className="text-[10px] text-slate-400 font-normal">USD</span>
          </div>
          <div className="text-[10px] text-slate-500">Trading fees</div>
        </div>
      </div>

      {/* Open Positions - Compact Table */}
      {analytics.futuresOpenPositions && analytics.futuresOpenPositions.length > 0 && (
        <div className="bg-slate-800/20 border border-slate-700/30 rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-700/30 bg-slate-800/30">
            <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <Activity className="w-3 h-3 text-cyan-400" />
              Open Positions ({analytics.futuresOpenPositions.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-700/30">
            {analytics.futuresOpenPositions.map((pos, idx) => (
              <div key={idx} className="p-2 hover:bg-slate-800/30 transition-colors">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <div className="font-mono font-bold text-xs">{pos.symbol}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {pos.side} • {pos.leverage}x • Entry: {currency}{pos.entryPrice?.toFixed(2) || '0.00'} <span className="text-[9px] text-slate-500">USD</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${(pos.unrealizedProfit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {(pos.unrealizedProfit || 0) >= 0 ? '+' : ''}{currency}{(pos.unrealizedProfit || 0).toFixed(2)} <span className="text-[9px] text-slate-400 font-normal">USD</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {(((pos.unrealizedProfit || 0) / (pos.margin || 1)) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-700/20">
                  <span>Size: {Math.abs(pos.size || 0).toFixed(4)}</span>
                  <span>Mark: {currency}{pos.markPrice?.toFixed(2) || '0.00'} <span className="text-[9px] text-slate-500">USD</span></span>
                  <span>Margin: {currency}{pos.margin?.toFixed(2) || '0.00'} <span className="text-[9px] text-slate-500">USD</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Metrics - Compact */}
      <div className="bg-slate-800/20 border border-slate-700/30 rounded-md p-2">
        <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">Risk Metrics</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
          <div className="flex justify-between">
            <span className="text-slate-400">Max Win Streak:</span>
            <span className="text-emerald-400 font-medium">{futuresAnalysis.maxConsecutiveWins || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Max Loss Streak:</span>
            <span className="text-red-400 font-medium">{futuresAnalysis.maxConsecutiveLosses || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Largest Win:</span>
            <span className="text-emerald-400 font-medium">{currency}{futuresAnalysis.largestWin?.toFixed(2) || '0.00'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Largest Loss:</span>
            <span className="text-red-400 font-medium">{currency}{futuresAnalysis.largestLoss?.toFixed(2) || '0.00'}</span>
          </div>
        </div>
      </div>

      {/* Premium Teaser - Leverage Analysis */}
      <div className="bg-gradient-to-br from-cyan-500/5 to-purple-500/5 border border-cyan-500/20 rounded-lg p-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-cyan-500/10 px-2 py-0.5 rounded-bl-lg">
          <span className="text-[10px] font-bold text-cyan-400">PRO</span>
        </div>
        <div className="flex items-start gap-3">
          <TrendingUp className="w-4 h-4 text-cyan-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-semibold text-slate-200 mb-1">Leverage & Risk Analysis</h4>
            <p className="text-[10px] text-slate-400 mb-2">
              Discover optimal leverage levels, position sizing recommendations, and liquidation risk warnings.
            </p>
            <div className="flex items-center gap-2 text-[10px] text-cyan-400">
              <Sparkles className="w-3 h-3" />
              <span>Unlock advanced risk management with Pro</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// BEHAVIORAL TAB - DEEP INSIGHTS
// ============================================

function BehavioralTab({ analytics, currSymbol }) {
  const behavioral = analytics.behavioral || {}
  const currency = currSymbol || '$'

  if (!behavioral.healthScore) {
    return <EmptyState icon={Brain} title="No Behavioral Data" variant="info" />
  }

  const healthScore = behavioral.healthScore || 0
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-400'
    if (score >= 60) return 'text-yellow-400'
    if (score >= 40) return 'text-orange-400'
    return 'text-red-400'
  }

  return (
    <div className="space-y-3">
      {/* Compact Behavioral Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="bg-slate-800/20 border border-slate-700/30 rounded-md p-2">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Behavioral Score</div>
          <div className={`text-lg font-bold ${getScoreColor(healthScore)}`}>
            {healthScore}<span className="text-xs text-slate-500">/100</span>
          </div>
          <div className="text-[10px] text-slate-500">
            {healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : healthScore >= 40 ? 'Fair' : 'Needs work'}
          </div>
        </div>

        <div className="bg-slate-800/20 border border-slate-700/30 rounded-md p-2">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Panic Events</div>
          <div className={`text-lg font-bold ${behavioral.panicPatterns?.detected ? 'text-red-400' : 'text-emerald-400'}`}>
            {behavioral.panicPatterns?.count || 0}
          </div>
          <div className="text-[10px] text-slate-500">Rapid-fire sells</div>
        </div>

        <div className="bg-slate-800/20 border border-slate-700/30 rounded-md p-2">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Fee Efficiency</div>
          <div className={`text-lg font-bold ${(behavioral.feeAnalysis?.efficiency || 0) >= 70 ? 'text-emerald-400' : 'text-yellow-400'}`}>
            {behavioral.feeAnalysis?.efficiency ? Number(behavioral.feeAnalysis.efficiency).toFixed(0) : 0}%
          </div>
          <div className="text-[10px] text-slate-500">Maker/taker ratio</div>
        </div>

        <div className="bg-slate-800/20 border border-slate-700/30 rounded-md p-2">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Consistency</div>
          <div className={`text-lg font-bold ${(behavioral.consistencyScore || 0) >= 70 ? 'text-emerald-400' : 'text-yellow-400'}`}>
            {behavioral.consistencyScore ? Number(behavioral.consistencyScore).toFixed(0) : 0}%
          </div>
          <div className="text-[10px] text-slate-500">Position sizing</div>
        </div>
      </div>

      {/* Top Critical Warnings Only */}
      {behavioral.warnings && behavioral.warnings.length > 0 && (
        <div className="space-y-1.5">
          {behavioral.warnings.slice(0, 2).map((warning, idx) => (
            <div key={idx} className="bg-red-500/5 border border-red-500/20 rounded-md p-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs font-semibold text-red-400">{warning.title}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{warning.message}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fee Analysis - Compact */}
      {behavioral.feeAnalysis && (
        <div className="bg-slate-800/20 border border-slate-700/30 rounded-md p-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <DollarSign className="w-3 h-3 text-orange-400" />
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Fee Analysis</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <div className="text-slate-400 mb-0.5">Total Fees Paid</div>
              <div className="text-sm font-bold text-red-400">
                -{currency}{behavioral.feeAnalysis.totalFees ? Number(behavioral.feeAnalysis.totalFees).toFixed(2) : '0.00'}
              </div>
            </div>
            <div>
              <div className="text-slate-400 mb-0.5">Could Have Saved</div>
              <div className="text-sm font-bold text-yellow-400">
                {currency}{behavioral.feeAnalysis.potentialSavings ? Math.abs(Number(behavioral.feeAnalysis.potentialSavings)).toFixed(2) : '0.00'}
              </div>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 mt-1.5 flex items-start gap-1">
            <Lightbulb className="w-2.5 h-2.5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <span>Use limit orders (maker) instead of market orders (taker) to save on fees</span>
          </div>
        </div>
      )}

      {/* Top Actionable Insights - Compact */}
      {behavioral.insights && behavioral.insights.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
            <Lightbulb className="w-3 h-3 text-yellow-400" />
            Top Insights
          </div>
          {behavioral.insights.slice(0, 2).map((insight, idx) => {
            const colorMap = {
              critical: { text: 'text-red-400' },
              warning: { text: 'text-yellow-400' },
              info: { text: 'text-blue-400' },
              success: { text: 'text-emerald-400' }
            }
            const colors = colorMap[insight.severity] || colorMap.info

            return (
              <div key={idx} className="bg-slate-800/20 border border-slate-700/30 rounded-md p-2">
                <div className={`text-xs font-semibold ${colors.text}`}>{insight.title}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{insight.message}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Premium Teaser - Deep Behavioral Analysis */}
      <div className="bg-gradient-to-br from-purple-500/5 to-pink-500/5 border border-purple-500/20 rounded-lg p-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-purple-500/10 px-2 py-0.5 rounded-bl-lg">
          <span className="text-[10px] font-bold text-purple-400">PRO</span>
        </div>
        <div className="flex items-start gap-3">
          <Brain className="w-4 h-4 text-purple-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-semibold text-slate-200 mb-1">Deep Behavioral Analysis</h4>
            <p className="text-[10px] text-slate-400 mb-2">
              Unlock detailed panic pattern detection, position sizing consistency analysis, and personalized action steps.
            </p>
            <div className="flex items-center gap-2 text-[10px] text-purple-400">
              <Sparkles className="w-3 h-3" />
              <span>Get AI-powered psychology insights with Pro</span>
            </div>
          </div>
        </div>
      </div>
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
  onFilterExchanges, // Callback to re-fetch data with filtered exchanges
  isDemoMode = false,
  isAuthenticated = true
}) {
  const [activeTab, setActiveTab] = useState('overview')
  const [showFilters, setShowFilters] = useState(false)

  // Filter state - Only data source filtering
  const [selectedExchanges, setSelectedExchanges] = useState([])
  const [appliedExchanges, setAppliedExchanges] = useState([]) // Track what's currently applied

  const hasFutures = analytics.futuresTrades > 0
  const hasSpot = analytics.spotTrades > 0
  const hasBehavioral = analytics.behavioral && analytics.behavioral.healthScore

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3, show: true },
    { id: 'behavioral', label: 'Behavioral', icon: Brain, show: hasBehavioral },
    { id: 'spot', label: 'Spot', icon: Briefcase, show: hasSpot },
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
          isLoggedIn={isAuthenticated}
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

        <main className="flex-1 max-w-[1400px] mx-auto px-3 sm:px-4 py-3 space-y-3 w-full">
        {/* Tabs - Moved to Top */}
        <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-lg overflow-hidden">
          {/* Tab Headers */}
          <div className="flex items-center border-b border-slate-700/50">
            <div className="flex-1 flex overflow-x-auto scrollbar-hide">
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

            {/* Filter Button */}
            <div className="flex-shrink-0 px-3 border-l border-slate-700/50">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg transition-all ${
                  showFilters
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'hover:bg-slate-700/50 text-slate-400 hover:text-slate-300'
                }`}
                title="Filter data"
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && currencyMetadata?.exchanges && currencyMetadata.exchanges.length > 1 && (
            <div className="border-b border-slate-700/50 bg-slate-800/50 px-4 py-3">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Exchange Buttons */}
                {currencyMetadata.exchanges.map(exchange => (
                  <button
                    key={exchange}
                    onClick={() => {
                      if (selectedExchanges.includes(exchange)) {
                        setSelectedExchanges(selectedExchanges.filter(ex => ex !== exchange))
                      } else {
                        setSelectedExchanges([...selectedExchanges, exchange])
                      }
                    }}
                    className={`relative flex items-center gap-1.5 border rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-all ${
                      selectedExchanges.includes(exchange)
                        ? 'bg-purple-500/20 border-purple-500 text-white'
                        : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-purple-500/50'
                    }`}
                  >
                    {selectedExchanges.includes(exchange) && (
                      <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
                    )}
                    {exchange}
                  </button>
                ))}

                {/* Apply Button */}
                <button
                  onClick={() => {
                    setAppliedExchanges(selectedExchanges)
                    console.log('🔍 Applying exchange filter:', selectedExchanges)
                    if (onFilterExchanges && selectedExchanges.length > 0) {
                      onFilterExchanges(selectedExchanges)
                    }
                  }}
                  disabled={selectedExchanges.length === 0}
                  className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
                    selectedExchanges.length > 0
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  Apply
                </button>

                {/* Clear Filter */}
                {selectedExchanges.length > 0 && (
                  <button
                    onClick={() => {
                      setSelectedExchanges([])
                      setAppliedExchanges([])
                    }}
                    className="text-xs text-slate-400 hover:text-purple-400 transition-colors flex items-center gap-1 ml-auto"
                  >
                    <X className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Tab Content */}
          <div className="p-3 md:p-4">
            {activeTab === 'overview' && <OverviewTab analytics={analytics} currSymbol={currSymbol} metadata={currencyMetadata} setActiveTab={setActiveTab} />}
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
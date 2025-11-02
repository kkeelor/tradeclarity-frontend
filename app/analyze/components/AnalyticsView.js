// app/analyze/components/AnalyticsView.js
'use client'

import { useState, useMemo } from 'react'
import {
  DollarSign, TrendingUp, Target, Activity, Award, Brain,
  CheckCircle, AlertTriangle, Lightbulb, Clock, Calendar,
  Zap, Layers, TrendingDown, Eye, Flame, Trophy, Shield,
  BarChart3, PieChart, LineChart, ArrowUpRight, ArrowDownRight,
  AlertCircle, Sparkles, ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  Scissors, Shuffle, Coffee, Tv, Pizza, Fuel, Utensils,
  Database, FileText, Briefcase, Filter, X
} from 'lucide-react'
import { generatePerformanceAnalogies } from '../utils/performanceAnalogies'
import { analyzeDrawdowns } from '../utils/drawdownAnalysis'
import { analyzeTimeBasedPerformance } from '../utils/timeBasedAnalysis'
import { analyzeSymbols } from '../utils/symbolAnalysis'
import { convertAnalyticsForDisplay } from '../utils/currencyFormatter'
import { generateValueFirstInsights } from '../utils/insights/valueFirstInsights'
import AhaMomentsSection from './AhaMomentsSection'
import { ExchangeIcon } from '@/components/ui'
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
  const tradeCount = analytics.totalTrades || 0
  const symbolCount = Object.keys(analytics.symbols || {}).length

  const hasLimitedData = tradeCount > 0 && tradeCount < 20
  const hasGreatData = tradeCount >= 50
  const dataSources = [
    ...(metadata?.exchanges || []).map(source => ({
      label: source.toUpperCase(),
      tone: 'emerald'
    })),
    ...(metadata?.csvFiles || []).map(file => ({
      label: file.filename || 'CSV',
      tone: 'cyan',
      icon: FileText
    }))
  ]

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-white/[0.04] shadow-2xl shadow-emerald-500/5">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10" />
      <div className="absolute -top-24 -right-20 w-72 h-72 bg-emerald-500/20 blur-3xl rounded-full" />
      <div className="absolute -bottom-32 -left-12 w-60 h-60 bg-cyan-500/10 blur-3xl rounded-full" />

      <div className="relative p-6 sm:p-8 lg:p-10 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="space-y-6 max-w-xl">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-300/80">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              Your Performance Pulse
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                  isProfitable ? 'bg-emerald-500/20 text-emerald-200' : 'bg-rose-500/20 text-rose-200'
                }`}>
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-300/80">Total P&L</p>
                  <p className={`text-4xl font-semibold tracking-tight ${
                    isProfitable ? 'text-emerald-200' : 'text-rose-200'
                  }`}>
                    {isProfitable ? '+' : '-'}{currSymbol}{Math.abs(analytics.totalPnL).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300/70">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1">
                  <Activity className="w-3 h-3" />
                  {tradeCount.toLocaleString()} trades
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1">
                  <TrendingUp className="w-3 h-3" />
                  {analytics.roi?.toFixed(1) || '0.0'}% ROI
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1">
                  <Calendar className="w-3 h-3" />
                  {symbolCount} symbols
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {dataSources.map((source, idx) => {
                const ToneIcon = source.icon
                return (
                  <span
                    key={`${source.label}-${idx}`}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-sm ${
                      source.tone === 'emerald'
                        ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100'
                        : 'border-cyan-400/40 bg-cyan-400/10 text-cyan-100'
                    }`}
                  >
                    {ToneIcon ? <ToneIcon className="w-3.5 h-3.5" /> : null}
                    {source.label}
                  </span>
                )
              })}

              {hasLimitedData && (
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-100">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {tradeCount}/20 trades analyzed
                </span>
              )}

              {hasGreatData && (
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-100">
                  <CheckCircle className="w-3.5 h-3.5" />
                  High-quality dataset
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 min-w-[220px]">
            <QuickStat
              label="Win Rate"
              value={`${(analytics.winRate ?? 0).toFixed(1)}%`}
              subtitle={`${analytics.winningTrades || 0}W / ${analytics.losingTrades || 0}L`}
              icon={Target}
              good={(analytics.winRate ?? 0) >= 55}
            />
            <QuickStat
              label="Profit Factor"
              value={(analytics.profitFactor ?? 0).toFixed(2)}
              subtitle={(analytics.profitFactor ?? 0) >= 2 ? 'Excellent' : 'Healthy'}
              icon={TrendingUp}
              good={(analytics.profitFactor ?? 0) >= 1.5}
            />
            <QuickStat
              label="Avg Win"
              value={`${currSymbol}${Math.abs(analytics.avgWin || 0).toFixed(2)}`}
              subtitle="Per winning trade"
              icon={ArrowUpRight}
              good={analytics.avgWin >= Math.abs(analytics.avgLoss || 0)}
            />
            <QuickStat
              label="Avg Loss"
              value={`${currSymbol}${Math.abs(analytics.avgLoss || 0).toFixed(2)}`}
              subtitle="Per losing trade"
              icon={ArrowDownRight}
              good={false}
            />
          </div>
        </div>

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
    <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur">
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300/80">
        <Layers className="h-3 w-3 text-emerald-200" />
        Live Holdings Snapshot
      </div>

      <div className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-2">
        {/* Spot Holdings */}
        {hasSpotHoldings && (
          <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-2 border-b border-white/5 bg-white/[0.02] px-4 py-3 text-sm font-semibold text-slate-200">
              <DollarSign className="h-4 w-4 text-emerald-200" />
              Spot Holdings
            </div>
            <div className="max-h-64 space-y-2 overflow-y-auto p-4">
              {metadata.spotHoldings
                .sort((a, b) => b.usdValue - a.usdValue)
                .slice(0, 5)
                .map((holding) => (
                  <div key={holding.asset} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 transition duration-300 hover:border-emerald-400/30 hover:bg-emerald-400/5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-slate-100">
                        {holding.asset.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white/90">{holding.asset}</p>
                        <p className="font-mono text-[11px] text-slate-400">{holding.quantity?.toFixed(4)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-200">
                        {currSymbol}{holding.usdValue?.toFixed(2)}
                      </p>
                      <p className="text-[11px] text-slate-400">@{currSymbol}{holding.price?.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
            </div>
            {metadata.spotHoldings.length > 5 && (
              <div className="border-t border-white/5 px-4 py-2 text-center text-xs text-slate-400/80">
                +{metadata.spotHoldings.length - 5} more assets
              </div>
            )}
            <div className="border-t border-white/5 bg-white/[0.02] px-4 py-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Total spot value</span>
                <span className="text-sm font-semibold text-emerald-200">
                  {currSymbol}{metadata.totalSpotValue?.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Futures Positions */}
        {hasFuturesPositions && (
          <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-2 border-b border-white/5 bg-white/[0.02] px-4 py-3 text-sm font-semibold text-slate-200">
              <Zap className="h-4 w-4 text-cyan-200" />
              Open Futures Positions
            </div>
            <div className="max-h-64 space-y-2 overflow-y-auto p-4">
              {analytics.futuresOpenPositions.slice(0, 3).map((pos, idx) => (
                <div key={idx} className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-3">
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white/90">{pos.symbol}</p>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{pos.side} ? {pos.leverage}x</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${(pos.unrealizedProfit || 0) >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
                        {(pos.unrealizedProfit || 0) >= 0 ? '+' : ''}{currSymbol}{Math.abs(pos.unrealizedProfit || 0).toFixed(2)}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {pos.margin && pos.margin > 0 
                          ? (((pos.unrealizedProfit || 0) / pos.margin) * 100).toFixed(1) + '%'
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
                    <span>Entry {currSymbol}{pos.entryPrice?.toFixed(2)}</span>
                    <span>Mark {currSymbol}{pos.markPrice?.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
            {analytics.futuresOpenPositions.length > 3 && (
              <div className="border-t border-white/5 px-4 py-2 text-center text-xs text-slate-400/80">
                +{analytics.futuresOpenPositions.length - 3} more positions
              </div>
            )}
            <div className="border-t border-white/5 bg-white/[0.02] px-4 py-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Unrealized P&L</span>
                <span className={`text-sm font-semibold ${(analytics.futuresUnrealizedPnL || 0) >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
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
              <p className="text-xs text-slate-500">{analogies.hourlyRate.totalHours.toFixed(0)} active hours ? {analogies.hourlyRate.comparison}</p>
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
            formatter={(value) => [`${currSymbol || '$'}${value.toFixed(2)}`, 'Avg P&L']}
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
            formatter={(value) => [`${currSymbol || '$'}${value.toFixed(2)}`, 'Total P&L']}
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

function MonthlyPerformanceChart({ monthlyData, currSymbol }) {
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
            formatter={(value) => [`${currSymbol || '$'}${value.toFixed(2)}`, 'Total P&L']}
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
  
  // Sort by severity: high ? medium ? low
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
  // Sort by impact: 3 ? 2 ? 1
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

function OverviewTab({ analytics, currSymbol, currency, metadata, setActiveTab }) {
  const [selectedInsight, setSelectedInsight] = useState(null)
  const [showCharts, setShowCharts] = useState(false)
  const [showSymbols, setShowSymbols] = useState(false)
  const psychology = analytics.psychology || {}

  // Generate value-first insights with money calculations
  let valueFirstInsights = null
  try {
    valueFirstInsights = generateValueFirstInsights(analytics, psychology, analytics.allTrades || [])
  } catch (error) {
    console.error('Error generating value-first insights:', error)
    valueFirstInsights = { critical: [], opportunities: [], behavioral: [], all: [] }
  }
  
  // Keep legacy insights for backward compatibility
  const insights = generateEnhancedInsights(analytics, psychology)
  const patterns = detectHiddenPatterns(analytics, psychology)
  const analogies = generatePerformanceAnalogies(analytics)

  // NEW ANALYSES
  const drawdownAnalysis = analyzeDrawdowns(analytics.allTrades || [])
  const timeAnalysis = analyzeTimeBasedPerformance(analytics.allTrades || [])
  const symbolAnalysis = analyzeSymbols(analytics.allTrades || [])

  const isProfitable = analytics.totalPnL >= 0
  const hasFuturesData = (analytics.futuresTrades > 0) || (analytics.futuresPnL !== undefined && analytics.futuresPnL !== null) || (analytics.futuresOpenPositions?.length > 0)

  // Calculate summary metrics
  const totalTrades = (analytics.spotTrades || 0) + (analytics.futuresTrades || 0)
  const exchanges = metadata?.exchanges || []
  const dateRange = analytics.allTrades && analytics.allTrades.length > 0
    ? (() => {
        // Filter out invalid timestamps before calculating
        const validTimestamps = analytics.allTrades
          .map(t => {
            const timestamp = t.timestamp || t.time
            if (!timestamp) return null
            const time = new Date(timestamp).getTime()
            return isNaN(time) ? null : time
          })
          .filter(t => t !== null)
        
        if (validTimestamps.length === 0) return null
        
        return {
          start: new Date(Math.min(...validTimestamps)),
          end: new Date(Math.max(...validTimestamps))
        }
      })()
    : null

  // Check if portfolio data is available (only present on live connections)
  const hasPortfolioData = metadata?.totalPortfolioValue !== undefined && metadata?.totalPortfolioValue !== null

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Portfolio Overview Summary - Modernized */}
      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] shadow-lg shadow-emerald-500/5 backdrop-blur">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5" />
        <div className="relative p-5 md:p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-lg md:text-xl font-bold text-white">Portfolio Overview</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
            {/* Total Portfolio Value - Only show if data available */}
            {hasPortfolioData ? (
              <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:border-emerald-400/30 hover:bg-emerald-500/5 transition-all duration-300">
                <div className="text-xs text-slate-400 mb-2 font-medium">Total Value</div>
                <div className="text-xl md:text-2xl font-bold text-white mb-1">
                  {currSymbol}{formatNumber(metadata?.totalPortfolioValue || 0, 2)} <span className="text-xs text-slate-400 font-normal">{currency || 'USD'}</span>
                </div>
              <div className="text-xs text-slate-500">
                Spot: {currSymbol}{formatNumber(metadata?.totalSpotValue || 0, 2)} + Futures: {currSymbol}{formatNumber(metadata?.totalFuturesValue || 0, 2)}
              </div>
              </div>
            ) : (
              <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:border-slate-600/30 transition-all duration-300">
                <div className="text-xs text-slate-400 mb-2 font-medium">Total Value</div>
                <div className="text-sm font-bold text-slate-400 mb-1">
                  Not Available
                </div>
                <div className="text-xs text-slate-500">
                  Connect live to view portfolio
                </div>
              </div>
            )}

            {/* Total Trades */}
            <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:border-emerald-400/30 hover:bg-emerald-500/5 transition-all duration-300">
              <div className="text-xs text-slate-400 mb-2 font-medium">Trades Analyzed</div>
              <div className="text-xl md:text-2xl font-bold text-white mb-1">{totalTrades.toLocaleString()}</div>
              <div className="text-xs text-slate-500">
                {analytics.spotTrades || 0} Spot + {analytics.futuresTrades || 0} Futures
              </div>
            </div>

            {/* Exchanges */}
            <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:border-emerald-400/30 hover:bg-emerald-500/5 transition-all duration-300">
              <div className="text-xs text-slate-400 mb-2 font-medium">Exchanges</div>
              <div className="text-xl md:text-2xl font-bold text-white mb-1">{exchanges.length}</div>
              <div className="text-xs text-slate-500 capitalize truncate">
                {exchanges.join(', ') || 'Unknown'}
              </div>
            </div>

            {/* Date Range */}
            {dateRange && (
              <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:border-emerald-400/30 hover:bg-emerald-500/5 transition-all duration-300">
                <div className="text-xs text-slate-400 mb-2 font-medium">Date Range</div>
                <div className="text-sm font-bold text-white">
                  {dateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: dateRange.start.getFullYear() !== dateRange.end.getFullYear() ? 'numeric' : undefined })} to {dateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            )}

            {/* Account Type */}
            <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:border-emerald-400/30 hover:bg-emerald-500/5 transition-all duration-300">
              <div className="text-xs text-slate-400 mb-2 font-medium">Account Type</div>
              <div className="text-xl md:text-2xl font-bold text-white mb-1 capitalize">
                {metadata?.accountType || 'Mixed'}
              </div>
              <div className="text-xs text-slate-500">
                {metadata?.hasSpot && 'Spot '}
                {metadata?.hasSpot && metadata?.hasFutures && '+ '}
                {metadata?.hasFutures && 'Futures'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Aha Moments - Value-First Insights Hero Section */}
      {valueFirstInsights && valueFirstInsights.critical.length > 0 && (
        <AhaMomentsSection 
          insights={valueFirstInsights} 
          currency={currency}
          currSymbol={currSymbol}
        />
      )}

      {/* Enhanced P&L Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className={`group relative overflow-hidden rounded-xl border p-4 transition-all duration-300 hover:scale-[1.02] ${
          isProfitable 
            ? 'border-emerald-400/30 bg-emerald-500/10 hover:border-emerald-400/50 hover:bg-emerald-500/15' 
            : 'border-red-400/30 bg-red-500/10 hover:border-red-400/50 hover:bg-red-500/15'
        }`}>
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-medium">Total P&L</div>
            <div className={`text-xl md:text-2xl font-bold mb-1 ${isProfitable ? 'text-emerald-400' : 'text-red-400'}`}>
              {isProfitable ? '+' : ''}{currSymbol}{formatNumber(Math.abs(analytics.totalPnL), 2)} <span className="text-xs text-slate-400 font-normal">{currency || 'USD'}</span>
            </div>
            <div className="text-xs text-slate-500">{analytics.totalTrades} trades</div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:border-emerald-400/30 hover:bg-emerald-500/5 transition-all duration-300 hover:scale-[1.02]">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-medium">Realized P&L</div>
          <div className="text-xl md:text-2xl font-bold text-white mb-1">
            {currSymbol}{formatNumber((analytics.spotPnL || 0) + (analytics.futuresRealizedPnL || 0), 2)} <span className="text-xs text-slate-400 font-normal">{currency || 'USD'}</span>
          </div>
          <div className="text-xs text-slate-500">Closed positions</div>
        </div>

        {hasFuturesData && (
          <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:border-cyan-400/30 hover:bg-cyan-500/5 transition-all duration-300 hover:scale-[1.02]">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-medium">Unrealized P&L</div>
            <div className={`text-xl md:text-2xl font-bold mb-1 ${(analytics.futuresUnrealizedPnL || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {currSymbol}{formatNumber(analytics.futuresUnrealizedPnL || 0, 2)} <span className="text-xs text-slate-400 font-normal">{currency || 'USD'}</span>
            </div>
            <div className="text-xs text-slate-500">{analytics.futuresOpenPositions?.length || 0} open</div>
          </div>
        )}

        <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:border-emerald-400/30 hover:bg-emerald-500/5 transition-all duration-300 hover:scale-[1.02]">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-medium">Win Rate</div>
          <div className="text-xl md:text-2xl font-bold text-white mb-1">
            {(analytics.winRate ?? 0).toFixed(1)}%
          </div>
          <div className="text-xs text-slate-500">{analytics.winningTrades || 0}W / {analytics.losingTrades || 0}L</div>
        </div>
      </div>

      {/* Enhanced Quick Tab Teasers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {/* Spot Teaser */}
        {analytics.spotTrades > 0 && (
          <button
            onClick={() => setActiveTab('spot')}
            className="group relative overflow-hidden rounded-xl border border-emerald-400/20 bg-emerald-500/5 hover:border-emerald-400/40 hover:bg-emerald-500/10 p-4 md:p-5 text-left transition-all duration-300 hover:scale-[1.02]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 border border-emerald-400/30">
                    <Briefcase className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-sm font-semibold text-emerald-400">Spot Trading</span>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-400/50 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all duration-300" />
              </div>
              <div className="text-xl md:text-2xl font-bold text-white mb-2">{currSymbol}{formatNumber(analytics.spotPnL || 0, 2)} <span className="text-xs text-slate-400 font-normal">{currency || 'USD'}</span></div>
              <div className="text-xs text-slate-400 mb-2">{analytics.spotTrades || 0} trades ? {(analytics.spotWinRate ?? 0).toFixed(1)}% win rate</div>
              <div className="text-xs text-emerald-400 font-medium group-hover:underline">See detailed breakdown ?</div>
            </div>
          </button>
        )}

        {/* Futures Teaser */}
        {analytics.futuresTrades > 0 && (
          <button
            onClick={() => setActiveTab('futures')}
            className="group relative overflow-hidden rounded-xl border border-cyan-400/20 bg-cyan-500/5 hover:border-cyan-400/40 hover:bg-cyan-500/10 p-4 md:p-5 text-left transition-all duration-300 hover:scale-[1.02]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 border border-cyan-400/30">
                    <Zap className="w-4 h-4 text-cyan-400" />
                  </div>
                  <span className="text-sm font-semibold text-cyan-400">Futures Trading</span>
                </div>
                <ChevronRight className="w-4 h-4 text-cyan-400/50 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all duration-300" />
              </div>
              <div className="text-xl md:text-2xl font-bold text-white mb-2">{currSymbol}{formatNumber(analytics.futuresPnL || 0, 2)} <span className="text-xs text-slate-400 font-normal">{currency || 'USD'}</span></div>
              <div className="text-xs text-slate-400 mb-2">{analytics.futuresOpenPositions?.length || 0} open ? {(analytics.futuresWinRate ?? 0).toFixed(1)}% win rate</div>
              <div className="text-xs text-cyan-400 font-medium group-hover:underline">Analyze leverage impact ?</div>
            </div>
          </button>
        )}

        {/* Behavioral Teaser */}
        {analytics.behavioral && analytics.behavioral.healthScore && (
          <button
            onClick={() => setActiveTab('behavioral')}
            className="group relative overflow-hidden rounded-xl border border-purple-400/20 bg-purple-500/5 hover:border-purple-400/40 hover:bg-purple-500/10 p-4 md:p-5 text-left transition-all duration-300 hover:scale-[1.02]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 border border-purple-400/30">
                    <Brain className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="text-sm font-semibold text-purple-400">Psychology</span>
                </div>
                <ChevronRight className="w-4 h-4 text-purple-400/50 group-hover:text-purple-400 group-hover:translate-x-1 transition-all duration-300" />
              </div>
              <div className="text-xl md:text-2xl font-bold text-white mb-2">{analytics.behavioral.healthScore}/100</div>
              <div className="text-xs text-slate-400 mb-2">{analytics.behavioral.patterns?.filter(p => p.severity === 'high').length || 0} critical patterns detected</div>
              <div className="text-xs text-purple-400 font-medium group-hover:underline">Fix your weaknesses ?</div>
            </div>
          </button>
        )}
      </div>

      {/* Enhanced Critical Patterns */}
      {patterns.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-400/20">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
            </div>
            <h3 className="text-sm md:text-base font-semibold text-slate-300">Critical Patterns</h3>
          </div>
          <div className="space-y-2">
            {patterns.slice(0, 3).map((pattern, idx) => (
              <div key={idx} className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] hover:border-orange-400/30 hover:bg-orange-500/5 p-4 transition-all duration-300">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-200 mb-1">{pattern.title}</div>
                    <div className="text-xs text-slate-400">{pattern.description}</div>
                  </div>
                  <div className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                    pattern.severity === 'high' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                    pattern.severity === 'medium' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                    'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                  }`}>
                    {pattern.severity}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
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

function SpotTab({ analytics, currSymbol, currency, metadata }) {
  const [showAllHoldings, setShowAllHoldings] = useState(false)
  const spotAnalysis = analytics.spotAnalysis || {}
  const hasSpotData = analytics.spotTrades > 0
  const displayCurrency = currency || 'USD'

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
    <div className="space-y-4 md:space-y-6">
      {/* Enhanced Spot Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className={`group relative overflow-hidden rounded-xl border p-4 transition-all duration-300 hover:scale-[1.02] ${
          analytics.spotPnL >= 0 
            ? 'border-emerald-400/30 bg-emerald-500/10 hover:border-emerald-400/50 hover:bg-emerald-500/15' 
            : 'border-red-400/30 bg-red-500/10 hover:border-red-400/50 hover:bg-red-500/15'
        }`}>
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-medium">Spot P&L</div>
          <div className={`text-xl md:text-2xl font-bold mb-1 ${analytics.spotPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {currSymbol}{formatNumber(analytics.spotPnL || 0, 2)} <span className="text-xs text-slate-400 font-normal">{currency || 'USD'}</span>
          </div>
          <div className="text-xs text-slate-500">{analytics.spotRoi?.toFixed(1) || '0.0'}% ROI</div>
        </div>
        <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:border-emerald-400/30 hover:bg-emerald-500/5 transition-all duration-300 hover:scale-[1.02]">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-medium">Win Rate</div>
          <div className="text-xl md:text-2xl font-bold text-white mb-1">{analytics.spotWinRate?.toFixed(1) || '0.0'}%</div>
          <div className="text-xs text-slate-500">{analytics.spotWins || 0}W / {analytics.spotLosses || 0}L</div>
        </div>
        <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:border-emerald-400/30 hover:bg-emerald-500/5 transition-all duration-300 hover:scale-[1.02]">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-medium">Invested</div>
          <div className="text-xl md:text-2xl font-bold text-white mb-1">{currSymbol}{formatNumber(analytics.spotInvested || 0, 0)} <span className="text-xs text-slate-400 font-normal">{displayCurrency}</span></div>
          <div className="text-xs text-slate-500">{analytics.spotTrades || 0} trades</div>
        </div>
        <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:border-emerald-400/30 hover:bg-emerald-500/5 transition-all duration-300 hover:scale-[1.02]">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-medium">Best Win</div>
          <div className="text-xl md:text-2xl font-bold text-emerald-400 mb-1">{currSymbol}{formatNumber(spotAnalysis.largestWin || 0, 2)} <span className="text-xs text-slate-400 font-normal">{displayCurrency}</span></div>
          <div className="text-xs text-slate-500">Max gain</div>
        </div>
      </div>

      {/* Current Holdings - Compact */}
      {metadata?.spotHoldings && metadata.spotHoldings.length > 0 && (() => {
        const sortedHoldings = metadata.spotHoldings.sort((a, b) => b.usdValue - a.usdValue)
        const displayedHoldings = showAllHoldings ? sortedHoldings : sortedHoldings.slice(0, 5)
        const hasMore = sortedHoldings.length > 5

        return (
          <div className="bg-slate-800/20 border border-slate-700/30 rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-700/30 bg-slate-800/30 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                <Layers className="w-3 h-3 text-emerald-400" />
                Current Holdings
                <span className="text-[10px] text-slate-500 font-normal ml-1">
                  ({showAllHoldings ? sortedHoldings.length : `Top ${Math.min(5, sortedHoldings.length)} of ${sortedHoldings.length}`})
                </span>
              </h3>
              {hasMore && (
                <button
                  onClick={() => setShowAllHoldings(!showAllHoldings)}
                  className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
                >
                  {showAllHoldings ? (
                    <>
                      <ChevronUp className="w-3 h-3" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3" />
                      Show All
                    </>
                  )}
                </button>
              )}
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
                  {displayedHoldings.map((holding, idx) => {
                    // Get exchange name from holding or metadata
                    const exchangeName = holding.exchange || metadata.exchanges?.[0] || 'Unknown'

                    return (
                      <tr key={`${holding.asset}-${idx}`} className="border-b border-slate-800/30 hover:bg-slate-700/10">
                        <td className="px-2 py-1.5 font-mono font-semibold">{holding.asset}</td>
                        <td className="px-2 py-1.5">
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                            <ExchangeIcon exchange={exchangeName} size={10} className="w-4 h-4 p-0.5" />
                            <span className="capitalize">{exchangeName}</span>
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono text-slate-300">{formatNumber(holding.quantity || 0, 4)}</td>
                        <td className="px-2 py-1.5 text-right font-mono text-slate-400">{currSymbol}{formatNumber(holding.price || 0, 2)} <span className="text-[9px] text-slate-500">{displayCurrency}</span></td>
                        <td className="px-2 py-1.5 text-right font-bold text-emerald-400">{currSymbol}{formatNumber(holding.usdValue || 0, 2)} <span className="text-[9px] text-slate-400 font-normal">{displayCurrency}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-slate-800/50">
                  <tr className="font-bold">
                    <td className="px-2 py-2" colSpan="4">Total</td>
                    <td className="px-2 py-2 text-right text-emerald-400">{currSymbol}{formatNumber(metadata?.totalSpotValue || 0, 2)} <span className="text-[9px] text-slate-400 font-normal">{displayCurrency}</span></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )
      })()}

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

function FuturesTab({ analytics, currSymbol, currency, metadata }) {
  const futuresAnalysis = analytics.futuresAnalysis || {}
  const hasFuturesData = analytics.futuresTrades > 0
  const displayCurrency = currency || 'USD'
  const [showAllTrades, setShowAllTrades] = useState(false)

  if (!hasFuturesData) {
    return <EmptyState icon={Zap} title="No Futures Trading Data" variant="info" />
  }

  // Build trade history from income records (REALIZED_PNL entries)
  const tradeHistory = (() => {
    // Try multiple sources for income records
    // 1. Check metadata first (if raw data was preserved)
    // 2. Check analytics.allTrades for futures trades (normalized format)
    
    let incomeRecords = []
    
    // First, try metadata.futuresIncome (raw data from fetch)
    if (Array.isArray(metadata?.futuresIncome) && metadata.futuresIncome.length > 0) {
      console.log('?? Using metadata.futuresIncome:', metadata.futuresIncome.length, 'records')
      incomeRecords = metadata.futuresIncome
    } else if (Array.isArray(analytics?.futuresIncome) && analytics.futuresIncome.length > 0) {
      console.log('?? Using analytics.futuresIncome:', analytics.futuresIncome.length, 'records')
      incomeRecords = analytics.futuresIncome
    } else if (Array.isArray(analytics.allTrades)) {
      // Extract futures trades from normalized allTrades array
      // Futures trades in allTrades have: type: 'futures', incomeType: 'REALIZED_PNL', realizedPnl, symbol, timestamp
      const futuresTrades = analytics.allTrades.filter(trade => trade.type === 'futures' && trade.incomeType === 'REALIZED_PNL')
      
      console.log('?? Futures trades found in allTrades:', futuresTrades.length, 'out of', analytics.allTrades.length, 'total trades')
      if (futuresTrades.length > 0) {
        const pnlValues = futuresTrades.map(t => t.realizedPnl || t.pnl || 0)
        const nonZeroCount = pnlValues.filter(p => Math.abs(p) > 0.0001).length
        const zeroCount = pnlValues.filter(p => Math.abs(p) <= 0.0001).length
        console.log(`?? PnL in allTrades: ${nonZeroCount} non-zero, ${zeroCount} zero`)
        console.log('?? Sample futures trade:', {
          symbol: futuresTrades[0].symbol,
          realizedPnl: futuresTrades[0].realizedPnl,
          pnl: futuresTrades[0].pnl,
          incomeType: futuresTrades[0].incomeType,
          timestamp: futuresTrades[0].timestamp
        })
        if (nonZeroCount > 0) {
          const nonZeroTrades = futuresTrades.filter(t => Math.abs(t.realizedPnl || t.pnl || 0) > 0.0001)
          console.log('?? Sample NON-ZERO trade:', {
            symbol: nonZeroTrades[0].symbol,
            realizedPnl: nonZeroTrades[0].realizedPnl,
            pnl: nonZeroTrades[0].pnl
          })
        } else {
          console.warn('?? ALL trades have zero realizedPnl! Checking first 3:', futuresTrades.slice(0, 3).map(t => ({ symbol: t.symbol, realizedPnl: t.realizedPnl, pnl: t.pnl, allKeys: Object.keys(t) })))
        }
      }
      
      incomeRecords = futuresTrades.map(trade => ({
        symbol: trade.symbol,
        income: trade.realizedPnl || trade.pnl || 0, // realizedPnl is already a number from normalization
        incomeType: 'REALIZED_PNL',
        time: trade.timestamp || trade.time, // timestamp is ISO string in normalized format
        timestamp: trade.timestamp || trade.time, // Keep both for compatibility
        tradeId: trade.tradeId || trade.id,
        tranId: trade.tranId || trade.id,
        id: trade.id
      }))
    }
    
    console.log('?? Total income records to process:', incomeRecords.length)
    
    // Filter for REALIZED_PNL entries only
    const realizedTrades = incomeRecords
      .filter(inc => inc && inc.incomeType === 'REALIZED_PNL')
      .map(inc => {
        // Handle both string and number income values
        let pnl = 0
        if (typeof inc.income === 'string') {
          pnl = parseFloat(inc.income || 0)
        } else if (typeof inc.income === 'number') {
          pnl = inc.income
        } else {
          pnl = parseFloat(inc.income || 0)
        }
        
        return {
          symbol: inc.symbol || 'UNKNOWN',
          pnl: pnl,
          time: inc.time || inc.timestamp || Date.now(),
          tradeId: inc.tradeId || inc.tranId || inc.id || null
        }
      })
      .sort((a, b) => a.pnl - b.pnl) // Sort by worst PnL first
    
    console.log('? Final realized trades:', realizedTrades.length)
    if (realizedTrades.length > 0) {
      const pnlValues = realizedTrades.map(t => t.pnl)
      const nonZeroCount = pnlValues.filter(p => Math.abs(p) > 0.0001).length
      const zeroCount = pnlValues.filter(p => Math.abs(p) <= 0.0001).length
      console.log(`?? Final PnL distribution: ${nonZeroCount} non-zero, ${zeroCount} zero`)
      console.log('?? Sample realized trade:', {
        symbol: realizedTrades[0].symbol,
        pnl: realizedTrades[0].pnl,
        time: realizedTrades[0].time
      })
      if (nonZeroCount > 0) {
        const nonZeroTrades = realizedTrades.filter(t => Math.abs(t.pnl) > 0.0001)
        console.log('?? Sample NON-ZERO final trade:', {
          symbol: nonZeroTrades[0].symbol,
          pnl: nonZeroTrades[0].pnl
        })
      } else {
        console.warn('?? WARNING: ALL final trades have zero PnL!')
        console.log('?? First 5 trades:', realizedTrades.slice(0, 5).map(t => ({ symbol: t.symbol, pnl: t.pnl })))
      }
    }
    
    return realizedTrades
  })()

  const displayedTrades = showAllTrades ? tradeHistory : tradeHistory.slice(0, 6)
  const hasMoreTrades = tradeHistory.length > 6

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Enhanced Futures Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className={`group relative overflow-hidden rounded-xl border p-4 transition-all duration-300 hover:scale-[1.02] ${
          analytics.futuresPnL >= 0 
            ? 'border-emerald-400/30 bg-emerald-500/10 hover:border-emerald-400/50 hover:bg-emerald-500/15' 
            : 'border-red-400/30 bg-red-500/10 hover:border-red-400/50 hover:bg-red-500/15'
        }`}>
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-medium">Net P&L</div>
          <div className={`text-xl md:text-2xl font-bold mb-1 ${analytics.futuresPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {currSymbol}{formatNumber(analytics.futuresPnL || 0, 2)} <span className="text-xs text-slate-400 font-normal">{displayCurrency}</span>
          </div>
          <div className="text-xs text-slate-500">
            {analytics.futuresTrades || 0} trades
          </div>
        </div>

        <div className={`group relative overflow-hidden rounded-xl border p-4 transition-all duration-300 hover:scale-[1.02] ${
          analytics.futuresRealizedPnL >= 0 
            ? 'border-emerald-400/30 bg-emerald-500/10 hover:border-emerald-400/50 hover:bg-emerald-500/15' 
            : 'border-red-400/30 bg-red-500/10 hover:border-red-400/50 hover:bg-red-500/15'
        }`}>
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-medium">Realized</div>
          <div className={`text-xl md:text-2xl font-bold mb-1 ${analytics.futuresRealizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {currSymbol}{formatNumber(analytics.futuresRealizedPnL || 0, 2)} <span className="text-xs text-slate-400 font-normal">{displayCurrency}</span>
          </div>
          <div className="text-xs text-slate-500">Closed positions</div>
        </div>

        <div className={`group relative overflow-hidden rounded-xl border p-4 transition-all duration-300 hover:scale-[1.02] ${
          analytics.futuresUnrealizedPnL >= 0 
            ? 'border-emerald-400/30 bg-emerald-500/10 hover:border-emerald-400/50 hover:bg-emerald-500/15' 
            : 'border-red-400/30 bg-red-500/10 hover:border-red-400/50 hover:bg-red-500/15'
        }`}>
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-medium">Unrealized</div>
          <div className={`text-xl md:text-2xl font-bold mb-1 ${analytics.futuresUnrealizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {currSymbol}{formatNumber(analytics.futuresUnrealizedPnL || 0, 2)} <span className="text-xs text-slate-400 font-normal">{displayCurrency}</span>
          </div>
          <div className="text-xs text-slate-500">
            {analytics.futuresOpenPositions?.length || 0} open
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:border-emerald-400/30 hover:bg-emerald-500/5 transition-all duration-300 hover:scale-[1.02]">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-medium">Win Rate</div>
          <div className={`text-xl md:text-2xl font-bold mb-1 ${analytics.futuresWinRate >= 55 ? 'text-emerald-400' : 'text-slate-300'}`}>
            {analytics.futuresWinRate?.toFixed(1) || '0.0'}%
          </div>
          <div className="text-xs text-slate-500">
            {analytics.futuresWins || 0}W / {analytics.futuresLosses || 0}L
          </div>
        </div>
      </div>

      {/* Enhanced Funding & Commission */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:border-yellow-400/30 hover:bg-yellow-500/5 transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-yellow-500/10 border border-yellow-400/20">
              <Zap className="w-3 h-3 text-yellow-400" />
            </div>
            <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">Funding Fees</span>
          </div>
          <div className={`text-xl md:text-2xl font-bold mb-1 ${(analytics.futuresFundingFees || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {(analytics.futuresFundingFees || 0) >= 0 ? '+' : ''}{currSymbol}{formatNumber(Math.abs(analytics.futuresFundingFees || 0), 2)} <span className="text-xs text-slate-400 font-normal">{displayCurrency}</span>
          </div>
          <div className="text-xs text-slate-500">
            {(analytics.futuresFundingFees || 0) >= 0 ? 'Earned' : 'Paid'}
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:border-red-400/30 hover:bg-red-500/5 transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-500/10 border border-red-400/20">
              <DollarSign className="w-3 h-3 text-red-400" />
            </div>
            <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">Commission</span>
          </div>
          <div className="text-xl md:text-2xl font-bold text-red-400 mb-1">
            -{currSymbol}{formatNumber(analytics.futuresCommission || 0, 2)} <span className="text-xs text-slate-400 font-normal">{displayCurrency}</span>
          </div>
          <div className="text-xs text-slate-500">Trading fees</div>
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
                      {pos.side} ? {pos.leverage}x ? Entry: {currSymbol}{pos.entryPrice?.toFixed(2) || '0.00'} <span className="text-[9px] text-slate-500">{displayCurrency}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${(pos.unrealizedProfit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {(pos.unrealizedProfit || 0) >= 0 ? '+' : ''}{currSymbol}{(pos.unrealizedProfit || 0).toFixed(2)} <span className="text-[9px] text-slate-400 font-normal">{displayCurrency}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {pos.margin && pos.margin > 0
                        ? (((pos.unrealizedProfit || 0) / pos.margin) * 100).toFixed(1) + '%'
                        : 'N/A'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-700/20">
                  <span>Size: {Math.abs(pos.size || 0).toFixed(4)}</span>
                  <span>Mark: {currSymbol}{pos.markPrice?.toFixed(2) || '0.00'} <span className="text-[9px] text-slate-500">{displayCurrency}</span></span>
                  <span>Margin: {currSymbol}{pos.margin?.toFixed(2) || '0.00'} <span className="text-[9px] text-slate-500">{displayCurrency}</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past Trades History - Expandable */}
      {tradeHistory.length > 0 && (
        <div className="bg-slate-800/20 border border-slate-700/30 rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-700/30 bg-slate-800/30 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <Clock className="w-3 h-3 text-cyan-400" />
              Past Trades
              <span className="text-[10px] text-slate-500 font-normal ml-1">
                ({showAllTrades ? tradeHistory.length : `Top ${Math.min(6, tradeHistory.length)} of ${tradeHistory.length}`})
              </span>
            </h3>
            {hasMoreTrades && (
              <button
                onClick={() => setShowAllTrades(!showAllTrades)}
                className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
              >
                {showAllTrades ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    Show All
                  </>
                )}
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-800/30">
                <tr className="text-left text-[10px] text-slate-400">
                  <th className="px-2 py-2">Symbol</th>
                  <th className="px-2 py-2 text-right">P&L</th>
                  <th className="px-2 py-2 text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {displayedTrades.map((trade, idx) => {
                  const tradeDate = new Date(trade.time)
                  const dateStr = isNaN(tradeDate.getTime())
                    ? 'N/A'
                    : tradeDate.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: tradeDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                      })
                  
                  // Adaptive decimal places for small values - but filter out very small values
                  const absPnl = Math.abs(trade.pnl)
                  let decimals = 2
                  // Only show meaningful precision for values >= 0.01
                  if (absPnl > 0 && absPnl < 0.01) {
                    // Very small values - show 4 decimals max
                    decimals = 4
                  } else if (absPnl > 0 && absPnl < 0.1) {
                    decimals = 3
                  } else if (absPnl > 0 && absPnl < 1) {
                    decimals = 2
                  }
                  
                  // Format PnL
                  const formattedPnl = formatNumber(trade.pnl, decimals)
                  
                  return (
                    <tr key={trade.tradeId || idx} className="border-b border-slate-800/30 hover:bg-slate-700/10">
                      <td className="px-2 py-1.5 font-mono font-semibold">{trade.symbol}</td>
                      <td className={`px-2 py-1.5 text-right font-bold ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {trade.pnl >= 0 ? '+' : ''}{currSymbol}{formattedPnl} <span className="text-[9px] text-slate-400 font-normal">{displayCurrency}</span>
                      </td>
                      <td className="px-2 py-1.5 text-right text-slate-400">{dateStr}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
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
            <span className="text-emerald-400 font-medium">{currSymbol}{futuresAnalysis.largestWin?.toFixed(2) || '0.00'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Largest Loss:</span>
            <span className="text-red-400 font-medium">{currSymbol}{futuresAnalysis.largestLoss?.toFixed(2) || '0.00'}</span>
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

function BehavioralTab({ analytics, currSymbol, currency }) {
  const behavioral = analytics.behavioral || {}
  const displayCurrency = currency || 'USD'

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
    <div className="space-y-4 md:space-y-6">
      {/* Enhanced Behavioral Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:border-emerald-400/30 hover:bg-emerald-500/5 transition-all duration-300 hover:scale-[1.02]">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-medium">Behavioral Score</div>
          <div className={`text-xl md:text-2xl font-bold mb-1 ${getScoreColor(healthScore)}`}>
            {healthScore}<span className="text-xs text-slate-500 ml-1">/100</span>
          </div>
          <div className="text-xs text-slate-500">
            {healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : healthScore >= 40 ? 'Fair' : 'Needs work'}
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:border-red-400/30 hover:bg-red-500/5 transition-all duration-300 hover:scale-[1.02]">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-medium">Panic Events</div>
          <div className={`text-xl md:text-2xl font-bold mb-1 ${behavioral.panicPatterns?.detected ? 'text-red-400' : 'text-emerald-400'}`}>
            {behavioral.panicPatterns?.count || 0}
          </div>
          <div className="text-xs text-slate-500">Rapid-fire sells</div>
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:border-emerald-400/30 hover:bg-emerald-500/5 transition-all duration-300 hover:scale-[1.02]">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-medium">Fee Efficiency</div>
          <div className={`text-xl md:text-2xl font-bold mb-1 ${(behavioral.feeAnalysis?.efficiency || 0) >= 70 ? 'text-emerald-400' : 'text-yellow-400'}`}>
            {behavioral.feeAnalysis?.efficiency ? Number(behavioral.feeAnalysis.efficiency).toFixed(0) : 0}%
          </div>
          <div className="text-xs text-slate-500">Maker/taker ratio</div>
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:border-emerald-400/30 hover:bg-emerald-500/5 transition-all duration-300 hover:scale-[1.02]">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-medium">Consistency</div>
          <div className={`text-xl md:text-2xl font-bold mb-1 ${(behavioral.consistencyScore || 0) >= 70 ? 'text-emerald-400' : 'text-yellow-400'}`}>
            {behavioral.consistencyScore ? Number(behavioral.consistencyScore).toFixed(0) : 0}%
          </div>
          <div className="text-xs text-slate-500">Position sizing</div>
        </div>
      </div>

      {/* Enhanced Critical Warnings */}
      {behavioral.warnings && behavioral.warnings.length > 0 && (
        <div className="space-y-3">
          {behavioral.warnings.slice(0, 2).map((warning, idx) => (
            <div key={idx} className="group relative overflow-hidden rounded-xl border border-red-400/30 bg-red-500/10 hover:border-red-400/50 hover:bg-red-500/15 p-4 transition-all duration-300">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-red-500/20 border border-red-400/30">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-red-400 mb-1">{warning.title}</div>
                  <div className="text-xs text-slate-300">{warning.message}</div>
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

  // Convert analytics for display currency (USD -> INR conversion if needed)
  const convertedAnalytics = useMemo(() => {
    return convertAnalyticsForDisplay(analytics, currency)
  }, [analytics, currency])

  // Use converted analytics throughout the component
  const displayAnalytics = convertedAnalytics || analytics

  const hasFutures = displayAnalytics.futuresTrades > 0
  const hasSpot = displayAnalytics.spotTrades > 0
  const hasBehavioral = displayAnalytics.behavioral && displayAnalytics.behavioral.healthScore

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
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(46,204,149,0.08),_transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(59,130,246,0.06),_transparent_55%)]" />

      <Header
        exchangeConfig={exchangeConfig}
        currencyMetadata={currencyMetadata}
        currency={currency}
        setCurrency={setCurrency}
        onDisconnect={onDisconnect}
        onNavigateDashboard={onDisconnect}
        onNavigateUpload={onUploadClick}
        onNavigateAll={onViewAllExchanges}
        onSignOut={handleSignOut}
        isDemoMode={isDemoMode}
      />

      {isDemoMode && (
        <div className="mx-auto mt-6 w-full max-w-[1400px] px-4">
          <div className="relative overflow-hidden rounded-2xl border border-purple-400/20 bg-purple-500/10 px-5 py-4 backdrop-blur">
            <div className="absolute -top-10 right-0 h-24 w-24 rounded-full bg-purple-400/20 blur-3xl" />
            <div className="relative flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10">
                <Eye className="h-5 w-5 text-purple-200" />
              </div>
              <div className="space-y-1 text-sm">
                <p className="font-medium text-purple-100">Demo mode ? sample Binance data</p>
                <p className="text-slate-300/80">
                  Explore how TradeClarity surfaces patterns, then connect your exchange to uncover your own.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="relative mx-auto w-full max-w-[1400px] px-4 pb-16 pt-10 space-y-10">
        {/* Tabs - Moved to Top */}
        <div className="overflow-hidden rounded-3xl border border-white/5 bg-white/[0.03] shadow-lg shadow-emerald-500/5 backdrop-blur">
          {/* Tab Headers */}
          <div className="flex items-center border-b border-white/5">
            <div className="flex flex-1 overflow-x-auto scrollbar-hide">
              {tabs.map(tab => {
                const TabIcon = tab.icon
                return (
                  <TabButton
                    key={tab.id}
                    active={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="whitespace-nowrap text-xs md:text-base"
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
            <div className="flex-shrink-0 border-l border-white/5 px-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg transition-all ${
                  showFilters
                    ? 'bg-purple-500/20 text-purple-200'
                    : 'text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
                title="Filter data"
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && currencyMetadata?.exchanges && currencyMetadata.exchanges.length > 1 && (
            <div className="border-b border-white/5 bg-white/[0.03] px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
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
                    className={`relative flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium capitalize transition-all ${
                      selectedExchanges.includes(exchange)
                        ? 'border-purple-400/50 bg-purple-500/20 text-white'
                        : 'border-white/10 bg-white/5 text-slate-200 hover:border-purple-400/40 hover:text-white'
                    }`}
                  >
                    {selectedExchanges.includes(exchange) && (
                      <CheckCircle className="w-3.5 h-3.5 text-purple-200" />
                    )}
                    {exchange}
                  </button>
                ))}

                {/* Apply Button */}
                <button
                  onClick={() => {
                    setAppliedExchanges(selectedExchanges)
                    console.log('?? Applying exchange filter:', selectedExchanges)
                    if (onFilterExchanges && selectedExchanges.length > 0) {
                      onFilterExchanges(selectedExchanges)
                    }
                  }}
                  disabled={selectedExchanges.length === 0}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
                    selectedExchanges.length > 0
                      ? 'bg-gradient-to-r from-purple-500 to-purple-400 text-white shadow-lg shadow-purple-500/30 hover:from-purple-400 hover:to-purple-300'
                      : 'cursor-not-allowed bg-white/5 text-slate-500'
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
                    className="ml-auto inline-flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-purple-200"
                  >
                    <X className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-400/80">Refine which sources feed this view</p>
            </div>
          )}

          {/* Tab Content with Smooth Transitions */}
          <div className="p-3 md:p-4">
            <div className="transition-all duration-300 ease-in-out">
              {activeTab === 'overview' && (
                <div className="animate-in fade-in duration-300">
                  <OverviewTab analytics={analytics} currSymbol={currSymbol} currency={currency} metadata={currencyMetadata} setActiveTab={setActiveTab} />
                </div>
              )}
              {activeTab === 'behavioral' && (
                <div className="animate-in fade-in duration-300">
                  <BehavioralTab analytics={analytics} currSymbol={currSymbol} />
                </div>
              )}
              {activeTab === 'spot' && (
                <div className="animate-in fade-in duration-300">
                  <SpotTab analytics={analytics} currSymbol={currSymbol} metadata={currencyMetadata} />
                </div>
              )}
              {activeTab === 'futures' && (
                <div className="animate-in fade-in duration-300">
                  <FuturesTab analytics={analytics} currSymbol={currSymbol} currency={currency} metadata={currencyMetadata} />
                </div>
              )}
            </div>
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
  
  // Only calculate commission percentage if totalPnL is not zero
  const totalCommission = Number(analytics.totalCommission || 0)
  const totalPnL = Number(analytics.totalPnL || 0)
  const absTotalPnL = Math.abs(totalPnL)
  
  if (absTotalPnL > 0 && totalCommission > 0) {
    const commissionPercent = (totalCommission / absTotalPnL) * 100
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
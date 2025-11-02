// app/analyze/components/AnalyticsView.js
'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  DollarSign, TrendingUp, Target, Activity, Award, Brain,
  CheckCircle, AlertTriangle, Lightbulb, Clock, Calendar,
  Zap, Layers, TrendingDown, Eye, Flame, Trophy, Shield,
  BarChart3, PieChart, LineChart, ArrowUpRight, ArrowDownRight,
  AlertCircle, Sparkles, ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  Scissors, Shuffle, Coffee, Tv, Pizza, Fuel, Utensils,
  Database, FileText, Briefcase, Filter, X, Wallet, TrendingUp as TrendingUpIcon, Percent
} from 'lucide-react'
import { generatePerformanceAnalogies } from '../utils/performanceAnalogies'
import { analyzeDrawdowns } from '../utils/drawdownAnalysis'
import { analyzeTimeBasedPerformance } from '../utils/timeBasedAnalysis'
import { analyzeSymbols } from '../utils/symbolAnalysis'
import { convertAnalyticsForDisplay } from '../utils/currencyFormatter'
import { getCurrencyRates } from '../utils/currencyConverter'
import { generateValueFirstInsights } from '../utils/insights/valueFirstInsights'
import { prioritizeInsights, enhanceInsightForDisplay } from '../utils/insights/insightsPrioritizationEngine'
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

// Elegant separator component for text segments
const SeparatorText = ({ segments, className = '', separator = '•' }) => {
  const validSegments = segments.filter(Boolean)
  if (validSegments.length === 0) return null
  
  return (
    <span className={className}>
      {validSegments.map((segment, idx) => (
        <span key={idx}>
          {idx > 0 && <span className="mx-1">{separator}</span>}
          {segment}
        </span>
      ))}
    </span>
  )
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

function HeroSection({ analytics, currSymbol, currency, metadata }) {
  const isProfitable = analytics.totalPnL >= 0
  const tradeCount = analytics.totalTrades || 0
  const symbolCount = Object.keys(analytics.symbols || {}).length
  const displayCurrency = currency || 'USD'

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
                    {isProfitable ? '+' : '-'}{currSymbol}{Math.abs(analytics.totalPnL).toFixed(2)} <span className="text-xs text-slate-400 font-normal">{displayCurrency}</span>
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
              subtitle={`Per winning trade`}
              icon={ArrowUpRight}
              good={analytics.avgWin >= Math.abs(analytics.avgLoss || 0)}
              currency={currency}
            />
            <QuickStat
              label="Avg Loss"
              value={`${currSymbol}${Math.abs(analytics.avgLoss || 0).toFixed(2)}`}
              subtitle={`Per losing trade`}
              icon={ArrowDownRight}
              good={false}
              currency={currency}
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
            currency={currency}
            icon={DollarSign}
            iconColor="emerald"
          />
          <AccountTypeCard
            type="Futures"
            trades={analytics.futuresTrades}
            pnl={analytics.futuresPnL}
            winRate={analytics.futuresWinRate}
            currSymbol={currSymbol}
            currency={currency}
            icon={Zap}
            iconColor="cyan"
          />
        </div>
      </div>
    </div>
  )
}

// QuickStat now uses the reusable MetricDisplay component
function QuickStat({ label, value, subtitle, icon, good, currency }) {
  return (
    <Card variant="glass" className="hover:border-slate-600/50 transition-all">
      {(icon || label) && (
        <div className="flex items-center gap-2 mb-2">
          {icon && <IconBadge icon={icon} color={good === true ? 'emerald' : good === false ? 'red' : 'slate'} size="sm" />}
          {label && (
            <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
          )}
        </div>
      )}
      <div className={`text-2xl font-bold mb-1 ${good === true ? 'text-emerald-400' : good === false ? 'text-red-400' : 'text-white'}`}>
        {value} {currency && <span className="text-xs text-slate-400 font-normal">{currency}</span>}
      </div>
      {subtitle && <div className="text-xs text-slate-500">{subtitle}</div>}
    </Card>
  )
}

function AccountTypeCard({ type, trades, pnl, winRate, currSymbol, currency, icon: Icon, iconColor }) {
  if (trades === 0) return null

  const isProfitable = pnl >= 0
  const displayCurrency = currency || 'USD'

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
          {isProfitable ? '+' : ''}{currSymbol}{pnl.toFixed(2)} <span className="text-xs text-slate-400 font-normal">{displayCurrency}</span>
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

function OverviewTab({ analytics, currSymbol, currency = 'USD', metadata, setActiveTab }) {
  const [selectedInsight, setSelectedInsight] = useState(null)
  const [showCharts, setShowCharts] = useState(false)
  const [showSymbols, setShowSymbols] = useState(false)
  const [showAllInsights, setShowAllInsights] = useState(false)
  const psychology = analytics.psychology || {}

  // Generate value-first insights with money calculations
  let valueFirstInsights = null
  try {
    valueFirstInsights = generateValueFirstInsights(analytics, psychology, analytics.allTrades || [])
  } catch (error) {
    console.error('Error generating value-first insights:', error)
    valueFirstInsights = { critical: [], opportunities: [], behavioral: [], all: [], allScored: [] }
  }
  
  // Keep legacy insights for backward compatibility
  const insights = generateEnhancedInsights(analytics, psychology)
  const patterns = detectHiddenPatterns(analytics, psychology)
  const analogies = generatePerformanceAnalogies(analytics)

  // NEW ANALYSES
  const drawdownAnalysis = analyzeDrawdowns(analytics.allTrades || [])
  const timeAnalysis = analyzeTimeBasedPerformance(analytics.allTrades || [])
  const symbolAnalysis = analyzeSymbols(analytics.allTrades || [])

  // Collect ALL insights from various sources
  const allAvailableInsights = []
  
  // 1. Value-first insights (already prioritized)
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

  // 2. Enhanced insights
  if (insights && insights.length > 0) {
    allAvailableInsights.push(...insights.map(insight => ({
      ...insight,
      source: 'enhanced',
      potentialSavings: insight.potentialSavings || 0,
      impact: insight.impact || 2
    })))
  }

  // 3. Drawdown insights - Generate insights from ALL drawdowns, not just worst
  if (drawdownAnalysis?.worstDrawdowns && drawdownAnalysis.worstDrawdowns.length > 0) {
    // Generate insights for top 5 worst drawdowns
    drawdownAnalysis.worstDrawdowns.slice(0, 5).forEach((worst, idx) => {
      if (worst.drawdownPercent < -5) {
        allAvailableInsights.push({
          type: 'weakness',
          category: 'risk_management',
          title: idx === 0 
            ? `Worst Drawdown: ${Math.abs(worst.drawdownPercent).toFixed(1)}%`
            : `Drawdown #${idx + 1}: ${Math.abs(worst.drawdownPercent).toFixed(1)}%`,
          message: `Lost ${currSymbol}${Math.abs(worst.drawdownAmount).toFixed(0)} over ${worst.durationDays} days`,
          summary: worst.recovered 
            ? `Recovered in ${worst.recoveryDays} days` 
            : 'Still in drawdown',
          potentialSavings: Math.abs(worst.drawdownAmount) * 0.2, // Potential to avoid 20%
          impact: worst.drawdownPercent < -20 ? 4 : worst.drawdownPercent < -10 ? 3 : 2,
          source: 'drawdown',
          actionDifficulty: worst.drawdownPercent < -20 ? 'medium' : 'easy',
          dataPoints: worst.durationDays,
          affectedTrades: worst.durationDays,
          action: {
            title: 'Reduce Position Size After Losses',
            steps: [
              'Cut position size by 50% after 3 consecutive losses',
              'Wait for recovery before resuming normal size',
              'Use smaller size during drawdown periods'
            ],
            expectedImpact: `Could reduce future drawdowns by ${Math.abs(worst.drawdownPercent * 0.3).toFixed(0)}%`
          }
        })
      }
    })

    // Drawdown patterns
    if (drawdownAnalysis.patterns && drawdownAnalysis.patterns.length > 0) {
      drawdownAnalysis.patterns.forEach(pattern => {
        allAvailableInsights.push({
          type: 'weakness',
          category: 'risk_management',
          title: pattern.title,
          message: pattern.message,
          summary: pattern.recommendation,
          impact: pattern.severity === 'high' ? 3 : pattern.severity === 'medium' ? 2 : 1,
          source: 'drawdown-pattern',
          actionDifficulty: pattern.severity === 'high' ? 'medium' : 'easy',
          action: {
            title: 'Improve Risk Management',
            steps: pattern.recommendation ? [pattern.recommendation] : []
          }
        })
      })
    }

    // Drawdown stats insights
    if (drawdownAnalysis.stats) {
      const stats = drawdownAnalysis.stats
      if (stats.averageRecoveryTime > 0 && stats.averageRecoveryTime > stats.averageDrawdown * 2) {
        allAvailableInsights.push({
          type: 'weakness',
          category: 'risk_management',
          title: 'Slow Recovery Pattern',
          message: `Your average recovery time (${stats.averageRecoveryTime.toFixed(0)} days) is ${(stats.averageRecoveryTime / stats.averageDrawdown).toFixed(1)}x longer than your average drawdown period`,
          summary: 'Focus on preventing deep drawdowns rather than recovering from them',
          potentialSavings: analytics.totalPnL < 0 ? Math.abs(analytics.totalPnL) * 0.1 : 0,
          impact: 3,
          source: 'drawdown-stats',
          actionDifficulty: 'medium',
          action: {
            title: 'Prevent Deep Drawdowns',
            steps: [
              'Set maximum daily loss limit',
              'Reduce position size after losses',
              'Take breaks after drawdowns'
            ]
          }
        })
      }
    }
  }

  // 4. Time-based insights - Generate MORE insights from time analysis
  if (timeAnalysis?.insights && timeAnalysis.insights.length > 0) {
    timeAnalysis.insights.forEach(insight => {
      allAvailableInsights.push({
        ...insight,
        source: 'timing',
        potentialSavings: insight.value ? Math.abs(insight.value) * 0.3 : 0,
        impact: insight.severity === 'high' ? 3 : 2,
        actionDifficulty: 'medium',
        dataPoints: insight.trades || 0
      })
    })
  }

  // Additional time-based insights from bestWorstTimes
  if (timeAnalysis?.bestWorstTimes) {
    const { bestHour, worstHour, bestDay, worstDay } = timeAnalysis.bestWorstTimes
    
    if (bestHour && bestHour.trades >= 5) {
      const potentialSavings = bestHour.totalPnL > 0 ? bestHour.totalPnL * 0.3 : 0
      allAvailableInsights.push({
        type: 'opportunity',
        category: 'timing',
        title: `Best Hour: ${bestHour.label}`,
        message: `${bestHour.winRate.toFixed(0)}% win rate, ${currSymbol}${bestHour.avgPnL.toFixed(2)} avg per trade`,
        summary: `Trade more during ${bestHour.label} for better results`,
        potentialSavings: potentialSavings,
        impact: bestHour.winRate > 60 ? 3 : 2,
        source: 'timing-analysis',
        actionDifficulty: 'easy',
        dataPoints: bestHour.trades,
        action: {
          title: 'Optimize Trading Schedule',
          steps: [
            `Set trading alerts for ${bestHour.label}`,
            'Focus trading activity during these hours',
            'Avoid trading during worst performing hours'
          ]
        }
      })
    }

    if (worstHour && worstHour.trades >= 5 && worstHour.totalPnL < 0) {
      const potentialSavings = Math.abs(worstHour.totalPnL) * 0.5
      allAvailableInsights.push({
        type: 'weakness',
        category: 'timing',
        title: `Avoid ${worstHour.label}`,
        message: `Only ${worstHour.winRate.toFixed(0)}% win rate, losing ${currSymbol}${Math.abs(worstHour.avgPnL).toFixed(2)} per trade`,
        summary: `Consider avoiding trading during ${worstHour.label}`,
        potentialSavings: potentialSavings,
        impact: worstHour.winRate < 40 ? 3 : 2,
        source: 'timing-analysis',
        actionDifficulty: 'easy',
        dataPoints: worstHour.trades,
        action: {
          title: 'Avoid Worst Hours',
          steps: [
            `Stop trading during ${worstHour.label}`,
            'Focus on your best performing hours',
            'Review why this hour performs poorly'
          ]
        }
      })
    }

    if (bestDay && bestDay.trades >= 5) {
      const potentialSavings = bestDay.totalPnL > 0 ? bestDay.totalPnL * 0.3 : 0
      allAvailableInsights.push({
        type: 'opportunity',
        category: 'timing',
        title: `Best Day: ${bestDay.dayName}`,
        message: `${bestDay.winRate.toFixed(0)}% win rate on ${bestDay.dayName}s`,
        summary: `Your strongest trading day of the week`,
        potentialSavings: potentialSavings,
        impact: bestDay.winRate > 60 ? 2 : 1,
        source: 'timing-analysis',
        actionDifficulty: 'medium',
        dataPoints: bestDay.trades,
        action: {
          title: 'Leverage Best Day',
          steps: [
            `Plan more trades on ${bestDay.dayName}s`,
            'Review what makes this day successful',
            'Apply similar strategies to other days'
          ]
        }
      })
    }
  }

  // 5. Symbol insights - Generate insights for ALL symbols, not just top
  // Only include if symbol has sufficient sample size and meaningful performance edge
  if (symbolAnalysis?.recommendations && symbolAnalysis.recommendations.length > 0) {
    symbolAnalysis.recommendations.forEach(rec => {
      if (rec.type === 'focus' && rec.symbols.length > 0) {
        const bestSymbol = rec.details?.[0]
        
        // Stricter validation: require at least 15 trades and meaningful performance
        // Don't suggest focusing on symbols with low sample size or marginal performance
        if (!bestSymbol || bestSymbol.trades < 15 || bestSymbol.winRate < 50) {
          return // Skip this recommendation
        }
        
        allAvailableInsights.push({
          type: 'opportunity',
          category: 'opportunity',
          title: `Focus on ${rec.symbols[0]}`,
          message: rec.message,
          summary: bestSymbol ? `${rec.symbols[0]} has ${bestSymbol.winRate?.toFixed(0)}% win rate and ${currSymbol}${bestSymbol.totalPnL?.toFixed(0)} total P&L` : rec.message,
          potentialSavings: bestSymbol?.totalPnL ? bestSymbol.totalPnL * 0.3 : 0,
          impact: 3,
          source: 'symbol',
          actionDifficulty: 'medium',
          dataPoints: bestSymbol?.trades || 0,
          bestSymbol: rec.symbols[0],
          action: {
            title: 'Increase Focus',
            steps: [
              `Allocate 60-70% of capital to ${rec.symbols[0]}`,
              'Study what makes this symbol work',
              'Reduce exposure to underperforming symbols'
            ],
            expectedImpact: `Could increase returns by 30-40%`
          }
        })
      } else if (rec.type === 'avoid' && rec.symbols.length > 0) {
        allAvailableInsights.push({
          type: 'weakness',
          category: 'opportunity',
          title: `Avoid ${rec.symbols.join(', ')}`,
          message: rec.message,
          summary: `These symbols consistently lose money`,
          potentialSavings: rec.details?.reduce((sum, s) => sum + Math.abs(s.totalPnL || 0), 0) || 0,
          impact: rec.severity === 'high' ? 3 : 2,
          source: 'symbol',
          actionDifficulty: 'easy',
          dataPoints: rec.details?.reduce((sum, s) => sum + (s.trades || 0), 0) || 0,
          action: {
            title: 'Stop Trading These Symbols',
            steps: [
              `Remove ${rec.symbols.join(', ')} from your watchlist`,
              'Focus on profitable symbols only',
              'Re-enter only after analyzing why they failed'
            ]
          }
        })
      }
    })
  }

  // Additional symbol insights from rankings
  if (symbolAnalysis?.rankings && symbolAnalysis.rankings.length > 0) {
    // Top 3 performing symbols
    symbolAnalysis.rankings.slice(0, 3).forEach((symbol, idx) => {
      if (symbol.trades >= 5 && symbol.totalPnL > 0) {
        allAvailableInsights.push({
          type: 'strength',
          category: 'opportunity',
          title: `#${idx + 1} Symbol: ${symbol.symbol}`,
          message: `${symbol.winRate.toFixed(0)}% win rate, ${currSymbol}${symbol.totalPnL.toFixed(0)} total P&L`,
          summary: `${symbol.trades} trades with ${symbol.profitFactor.toFixed(2)}x profit factor`,
          potentialSavings: 0, // Strength, not a savings opportunity
          impact: idx === 0 ? 2 : 1,
          source: 'symbol-ranking',
          actionDifficulty: 'hard',
          dataPoints: symbol.trades,
          action: {
            title: 'Leverage Success',
            steps: [
              `Study ${symbol.symbol} trading patterns`,
              'Replicate successful strategies',
              'Consider increasing position size'
            ]
          }
        })
      }
    })
  }

  // 6. Pattern insights - Enhanced with more details
  if (patterns && patterns.length > 0) {
    patterns.forEach(pattern => {
      allAvailableInsights.push({
        type: 'weakness',
        category: 'behavioral',
        title: pattern.title,
        message: pattern.description,
        summary: pattern.description,
        impact: pattern.severity === 'high' ? 3 : pattern.severity === 'medium' ? 2 : 1,
        source: 'pattern',
        actionDifficulty: pattern.severity === 'high' ? 'medium' : 'easy',
        dataPoints: pattern.affectedTrades || 0,
        action: {
          title: 'Address Pattern',
          steps: ['Review your trading journal', 'Identify trigger conditions', 'Implement counter-strategy']
        }
      })
    })
  }

  // 7. Performance insights (from analogies) - Generate MORE insights
  if (analogies && Object.keys(analogies).length > 0) {
    if (analogies.hourlyRate && analogies.hourlyRate.rate) {
      const hourlyRate = analogies.hourlyRate.rate
      if (hourlyRate > 0) {
        allAvailableInsights.push({
          type: 'strength',
          category: 'performance',
          title: 'Strong Hourly Rate',
          message: `You're making ${currSymbol}${Math.abs(hourlyRate).toFixed(2)}/hour trading`,
          summary: `Based on ${analogies.hourlyRate.totalHours} hours of trading`,
          potentialSavings: 0,
          impact: hourlyRate > 50 ? 2 : 1,
          source: 'analogy',
          actionDifficulty: 'hard',
          dataPoints: analytics.totalTrades || 0,
          action: {
            title: 'Scale Up',
            steps: [
              'Consider increasing position sizes',
              'Document your successful strategy',
              'Maintain current approach'
            ]
          }
        })
      } else if (hourlyRate < -10) {
        allAvailableInsights.push({
          type: 'weakness',
          category: 'performance',
          title: 'Negative Hourly Rate',
          message: `You're losing ${currSymbol}${Math.abs(hourlyRate).toFixed(2)}/hour while trading`,
          summary: `Review your strategy - this suggests fundamental issues`,
          potentialSavings: Math.abs(hourlyRate * analogies.hourlyRate.totalHours) * 0.5,
          impact: hourlyRate < -20 ? 4 : 3,
          source: 'analogy',
          actionDifficulty: 'hard',
          dataPoints: analytics.totalTrades || 0,
          action: {
            title: 'Fundamental Review',
            steps: [
              'Take a break from trading',
              'Review your strategy and risk management',
              'Consider paper trading to refine approach'
            ]
          }
        })
      }
    }

    if (analogies.profitFactor && analytics.profitFactor < 1) {
      allAvailableInsights.push({
        type: 'weakness',
        category: 'performance',
        title: 'Profit Factor Below 1.0',
        message: `Your profit factor of ${analytics.profitFactor.toFixed(2)}x means you're losing more than you win`,
        summary: 'Critical: This strategy is not profitable long-term',
        potentialSavings: analytics.totalPnL < 0 ? Math.abs(analytics.totalPnL) * 0.5 : 0,
        impact: 4,
        source: 'analogy',
        actionDifficulty: 'hard',
        dataPoints: analytics.totalTrades || 0,
        action: {
          title: 'Stop and Reassess',
          steps: [
            'Stop trading this strategy immediately',
            'Review why losses exceed wins',
            'Rebuild strategy with proper risk/reward'
          ]
        }
      })
    }

    if (analogies.moneyComparison) {
      const comparison = analogies.moneyComparison
      if (comparison.type === 'strength') {
        allAvailableInsights.push({
          type: 'strength',
          category: 'performance',
          title: comparison.title,
          message: comparison.message,
          summary: comparison.message,
          potentialSavings: 0,
          impact: 1,
          source: 'analogy',
          actionDifficulty: 'hard',
          dataPoints: analytics.totalTrades || 0
        })
      }
    }
  }

  // 8. Psychology insights from behavioral analysis
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
          source: 'psychology',
          actionDifficulty: 'medium',
          dataPoints: weakness.affectedTrades || 0,
          action: {
            title: 'Address Behavior',
            steps: weakness.actionable ? [
              'Identify trigger conditions',
              'Implement counter-strategy',
              'Track progress in trading journal'
            ] : ['Review trading patterns', 'Consider professional coaching']
          }
        })
      }
    })
  }

  if (psychology?.strengths && psychology.strengths.length > 0) {
    psychology.strengths.slice(0, 3).forEach(strength => {
      allAvailableInsights.push({
        type: 'strength',
        category: 'behavioral',
        title: strength.title || 'Behavioral Strength',
        message: strength.message,
        summary: strength.message,
        impact: 1,
        source: 'psychology',
        actionDifficulty: 'hard',
        dataPoints: strength.affectedTrades || 0,
        action: {
          title: 'Maintain Strength',
          steps: [
            'Document what makes this work',
            'Apply to other areas',
            'Share strategy with others'
          ]
        }
      })
    })
  }

  // Now properly score ALL insights using the prioritization engine
  const prioritizedInsights = prioritizeInsights(allAvailableInsights, analytics)
  
  // Enhance all insights for display
  let sortedInsights = prioritizedInsights.allScored.map(insight => 
    enhanceInsightForDisplay(insight, analytics)
  )
  
  // Separate insights into improvements (left) and strengths (right) for balance sheet view
  const weaknesses = sortedInsights.filter(i => i.type === 'weakness')
  const opportunities = sortedInsights.filter(i => i.type === 'opportunity' || i.type === 'recommendation')
  const strengths = sortedInsights.filter(i => i.type === 'strength')
  
  // Collect all improvements (weaknesses + opportunities)
  const improvements = [...weaknesses, ...opportunities]
  
  // Deduplicate strengths by title to avoid showing the same insight multiple times
  const uniqueStrengths = strengths.reduce((acc, strength) => {
    // Check if we already have a strength with the same title
    const existingIndex = acc.findIndex(s => s.title === strength.title)
    if (existingIndex === -1) {
      // New unique strength
      acc.push(strength)
    } else {
      // Keep the one with higher score or impact
      if ((strength.score || 0) > (acc[existingIndex].score || 0) || 
          (strength.impact || 0) > (acc[existingIndex].impact || 0)) {
        acc[existingIndex] = strength
      }
    }
    return acc
  }, [])
  
  // Collect meaningful strengths - only show genuine strengths, don't force it
  const meaningfulStrengths = uniqueStrengths.filter(s => 
    s.potentialSavings > 0 || 
    (s.action && s.action.steps && s.action.steps.length > 0) ||
    s.score >= 65 || // Only high-scoring strengths
    s.impact >= 3 // Only high impact strengths
  ) // No artificial limit - show what's actually there
  
  // Keep sortedInsights for backward compatibility (used in hero insight)
  sortedInsights = [...improvements, ...meaningfulStrengths]

  // Get tier status
  const tradeCount = analytics.allTrades?.length || analytics.totalTrades || 0
  const getUnlockTiers = () => [
    { name: 'Getting Started', minTrades: 0, maxTrades: 10 },
    { name: 'Pattern Detection', minTrades: 10, maxTrades: 30 },
    { name: 'Behavioral Insights', minTrades: 30, maxTrades: 100 },
    { name: 'Advanced Analytics', minTrades: 100 }
  ]
  const unlockTiers = getUnlockTiers()
  const currentTier = unlockTiers.find(tier => 
    tradeCount >= tier.minTrades && (!tier.maxTrades || tradeCount < tier.maxTrades)
  ) || unlockTiers[unlockTiers.length - 1]
  const nextTier = unlockTiers.find(tier => tradeCount < tier.minTrades)

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
      {/* TOP SECTION: Balanced Portfolio Overview + PnL Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Portfolio Overview - Left Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.04] backdrop-blur">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5" />
            <div className="relative p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-semibold text-slate-200">Portfolio Overview</h3>
              </div>
              
              {/* Main P&L Display */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                <div className={`rounded-xl border p-4 ${
                  isProfitable 
                    ? 'border-emerald-400/30 bg-emerald-500/10' 
                    : 'border-red-400/30 bg-red-500/10'
                }`}>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Total P&L</span>
                  </div>
                  <div className={`text-xl md:text-2xl font-bold ${isProfitable ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isProfitable ? '+' : ''}{currSymbol}{formatNumber(Math.abs(analytics.totalPnL), 2)} <span className="text-xs text-slate-400 font-normal">{currency || 'USD'}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{analytics.totalTrades} trades</div>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                    <Target className="w-3.5 h-3.5" />
                    <span>Win Rate</span>
                  </div>
                  <div className="text-xl md:text-2xl font-bold text-white">{(analytics.winRate ?? 0).toFixed(1)}%</div>
                  <div className="text-xs text-slate-500 mt-1">{analytics.winningTrades || 0}W / {analytics.losingTrades || 0}L</div>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Total Trades</span>
                  </div>
                  <div className="text-xl md:text-2xl font-bold text-white">{totalTrades.toLocaleString()}</div>
                  <div className="text-xs text-slate-500 mt-1">{analytics.spotTrades || 0}S + {analytics.futuresTrades || 0}F</div>
                </div>
              </div>

              {/* Secondary P&L Details */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>Realized P&L</span>
                  </div>
                  <div className="text-sm font-semibold text-white">
                    {currSymbol}{formatNumber((analytics.spotPnL || 0) + (analytics.futuresRealizedPnL || 0), 2)} <span className="text-xs text-slate-400 font-normal">{currency || 'USD'}</span>
                  </div>
                </div>

                {(hasFuturesData || analytics.spotUnrealizedPnL) && (
                  <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                      <TrendingUpIcon className="w-3 h-3" />
                      <span>Unrealized P&L</span>
                    </div>
                    <div className={`text-sm font-semibold ${(analytics.totalUnrealizedPnL || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {(analytics.totalUnrealizedPnL || 0) >= 0 ? '+' : ''}{currSymbol}{formatNumber(analytics.totalUnrealizedPnL || 0, 2)} <span className="text-xs text-slate-400 font-normal">{currency || 'USD'}</span>
                    </div>
                    {(analytics.spotUnrealizedPnL || analytics.futuresUnrealizedPnL) && (
                      <div className="text-[9px] text-slate-500 mt-0.5">
                        {analytics.spotUnrealizedPnL ? `Spot: ${currSymbol}${formatNumber(analytics.spotUnrealizedPnL, 2)}` : ''}
                        {analytics.spotUnrealizedPnL && analytics.futuresUnrealizedPnL ? ' ? ' : ''}
                        {analytics.futuresUnrealizedPnL ? `Futures: ${currSymbol}${formatNumber(analytics.futuresUnrealizedPnL, 2)}` : ''}
                      </div>
                    )}
                  </div>
                )}

                {hasPortfolioData ? (
                  <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
                    <div className="flex items-center gap-1.5 text-[10px] text-blue-400 mb-1">
                      <Wallet className="w-3 h-3" />
                      <span>Total Portfolio Value</span>
                    </div>
                    <div className="text-sm font-semibold text-blue-300">
                      {currSymbol}{formatNumber(metadata?.totalPortfolioValue || 0, 2)} <span className="text-xs text-slate-400 font-normal">{currency || 'USD'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                      <Wallet className="w-3 h-3" />
                      <span>Portfolio Value</span>
                    </div>
                    <div className="text-xs text-slate-500">Not available</div>
                  </div>
                )}
              </div>

              {/* Quick Stats Row */}
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/5">
                <div className="text-center">
                  <div className="text-xs text-slate-400 mb-1">Exchanges</div>
                  <div className="text-sm font-semibold text-white">{exchanges.length}</div>
                </div>
                {dateRange && (
                  <div className="text-center">
                    <div className="text-xs text-slate-400 mb-1">Date Range</div>
                    <div className="text-xs font-medium text-white">
                      {dateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {dateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-xs text-slate-400 mb-1">Type</div>
                  <div className="text-xs font-medium text-white capitalize">
                    {metadata?.hasSpot && 'Spot'}
                    {metadata?.hasSpot && metadata?.hasFutures && ' + '}
                    {metadata?.hasFutures && 'Futures'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Improvement Opportunity - Right Column */}
        {sortedInsights.length > 0 && sortedInsights[0] && (() => {
          const primaryInsight = sortedInsights.find(i => i.type === 'weakness' || i.type === 'opportunity') || sortedInsights[0]
          const isPrimaryWeakness = primaryInsight.type === 'weakness'
          
          return (
            <div className={`relative overflow-hidden rounded-2xl border backdrop-blur transition-all duration-300 ${
              isPrimaryWeakness
                ? 'border-amber-500/30 bg-amber-500/10 shadow-lg shadow-amber-500/5'
                : 'border-orange-500/30 bg-orange-500/10 shadow-lg shadow-orange-500/5'
            }`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${
                isPrimaryWeakness
                  ? 'from-amber-500/10 via-transparent to-orange-500/5'
                  : 'from-orange-500/10 via-transparent to-amber-500/5'
              }`} />
              <div className="relative p-4 md:p-5">
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                    isPrimaryWeakness
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                  }`}>
                      {isPrimaryWeakness ? <AlertCircle className="w-6 h-6" /> : <Target className="w-6 h-6" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`text-xs font-semibold uppercase tracking-wider ${
                          isPrimaryWeakness ? 'text-amber-300' : 'text-orange-300'
                        }`}>
                          Top Improvement
                        </span>
                        {primaryInsight.potentialSavings > 0 && (
                          <span className={`text-sm font-bold ${
                            isPrimaryWeakness ? 'text-amber-400' : 'text-orange-400'
                          }`}>
                            {currSymbol}{primaryInsight.potentialSavings.toFixed(0)} potential
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">{primaryInsight.title}</h3>
                      <p className="text-xs text-slate-300 mb-3 leading-relaxed line-clamp-3">
                        {primaryInsight.message || primaryInsight.summary}
                      </p>
                      {primaryInsight.action && (
                        <button
                          onClick={() => setSelectedInsight(primaryInsight)}
                          className="text-xs text-slate-400 hover:text-orange-400 transition-colors flex items-center gap-1"
                        >
                          View details <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
      </div>

      {/* TRADING BALANCE SHEET: Improvements vs Strengths */}
      {(improvements.length > 0 || meaningfulStrengths.length > 0) ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-200">Trading Balance Sheet</h3>
            </div>
            {currentTier && (
              <div className="text-xs text-slate-400">
                Tier: <span className="text-orange-400 font-medium">{currentTier.name}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* LEFT COLUMN: Areas for Improvement */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Target className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">
                    Areas for Improvement
                  </h4>
                  <p className="text-xs text-slate-500">{improvements.length} items</p>
                </div>
              </div>
              
              {improvements.length > 0 ? (
                <div className="space-y-2">
                  {(showAllInsights ? improvements : improvements.slice(0, 6)).map((insight, idx) => {
                    const isWeakness = insight.type === 'weakness'
                    const colorClasses = isWeakness 
                      ? 'border-amber-500/20 bg-amber-500/5 hover:border-amber-500/30 hover:bg-amber-500/10'
                      : 'border-orange-500/20 bg-orange-500/5 hover:border-orange-500/30 hover:bg-orange-500/10'
                    
                    return (
                      <div 
                        key={idx} 
                        className={`group relative overflow-hidden rounded-lg border ${colorClasses} p-3 transition-all duration-200 cursor-pointer`}
                        onClick={() => setSelectedInsight(insight)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-1.5 h-full rounded-full ${
                            isWeakness ? 'bg-amber-400' : 'bg-orange-400'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h5 className={`text-sm font-semibold ${
                                isWeakness ? 'text-amber-300' : 'text-orange-300'
                              }`}>
                                {insight.title}
                              </h5>
                              {insight.potentialSavings > 0 && (
                                <span className={`text-xs font-bold whitespace-nowrap ${
                                  isWeakness ? 'text-amber-400' : 'text-orange-400'
                                }`}>
                                  {currSymbol}{insight.potentialSavings.toFixed(0)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                              {insight.message || insight.summary}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  
                  {improvements.length > 6 && !showAllInsights && (
                    <button
                      onClick={() => setShowAllInsights(true)}
                      className="w-full py-2 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-xs font-medium text-slate-400 hover:text-slate-300 transition-all"
                    >
                      View {improvements.length - 6} more improvements
                    </button>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-white/5 bg-white/[0.02] p-6 text-center">
                  <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No major improvements needed!</p>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: What You're Doing Well */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">
                    What You're Doing Well
                  </h4>
                  <p className="text-xs text-slate-500">{meaningfulStrengths.length} items</p>
                </div>
              </div>
              
              {meaningfulStrengths.length > 0 ? (
                <div className="space-y-2">
                  {meaningfulStrengths.map((insight, idx) => {
                    return (
                      <div 
                        key={idx} 
                        className="group relative overflow-hidden rounded-lg border border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/30 hover:bg-emerald-500/10 p-3 transition-all duration-200 cursor-pointer"
                        onClick={() => setSelectedInsight(insight)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-1.5 h-full rounded-full bg-emerald-400" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h5 className="text-sm font-semibold text-emerald-300">
                                {insight.title}
                              </h5>
                              {insight.potentialSavings > 0 && (
                                <span className="text-xs font-bold text-emerald-400 whitespace-nowrap">
                                  {currSymbol}{insight.potentialSavings.toFixed(0)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                              {insight.message || insight.summary}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-white/5 bg-white/[0.02] p-6 text-center">
                  <Lightbulb className="w-6 h-6 text-slate-500 mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-slate-500">More data needed to identify strengths</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // No insights available - Show encouragement and tier unlock
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10 backdrop-blur p-6">
            <div className="flex items-start gap-4">
              <Sparkles className="w-8 h-8 text-purple-400 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-purple-300 mb-2">
                  {tradeCount < 10 ? 'Start Trading to Unlock Insights' : 'Connect More Data for Insights'}
                </h3>
                <p className="text-sm text-slate-300 mb-4">
                  {tradeCount < 10 
                    ? 'Trade at least 10 times to see your first insights. Every trade reveals new patterns.'
                    : 'Connect more exchanges or upload CSV files to unlock deeper insights about your trading patterns.'
                  }
                </p>
                {nextTier && (
                  <ProgressiveUnlockCard 
                    unlockTier={nextTier}
                    currentTrades={tradeCount}
                    totalTrades={tradeCount}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Value-Focused Tab Navigation - Discover More Insights */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-400">Explore Deeper Insights</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Spot Tab - Value Teaser */}
          {analytics.spotTrades > 0 && (() => {
            const spotInsight = symbolAnalysis?.recommendations?.find(r => r.type === 'focus')
            const spotValue = analytics.spotPnL || 0
            const spotWinRate = analytics.spotWinRate ?? 0
            
            return (
              <button
                onClick={() => setActiveTab('spot')}
                className="group relative overflow-hidden rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40 hover:bg-emerald-500/10 p-4 text-left transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Briefcase className="w-5 h-5 text-emerald-400" />
                      <span className="text-sm font-semibold text-emerald-400">Spot Trading</span>
                    </div>
                    <div className="text-xs text-slate-300 mb-1">
                      {spotValue >= 0 ? `+${currSymbol}${formatNumber(spotValue, 2)} profit` : `${currSymbol}${formatNumber(Math.abs(spotValue), 2)} loss`}
                    </div>
                    {spotInsight ? (
                      <SeparatorText
                        segments={[
                          `${spotInsight.symbols[0]} showing ${spotInsight.details?.[0]?.winRate?.toFixed(0)}% win rate`
                        ]}
                        className="text-[10px] text-emerald-400 font-medium"
                      />
                    ) : (
                      <SeparatorText
                        segments={[
                          `${analytics.spotTrades} trades`,
                          `${spotWinRate.toFixed(1)}% win rate`,
                          'See holdings & breakdown'
                        ]}
                        className="text-[10px] text-slate-400"
                      />
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-400/50 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0 mt-1" />
                </div>
              </button>
            )
          })()}

          {/* Futures Tab - Value Teaser */}
          {analytics.futuresTrades > 0 && (() => {
            const futuresValue = analytics.futuresPnL || 0
            const futuresWinRate = analytics.futuresWinRate ?? 0
            const openPositions = analytics.futuresOpenPositions?.length || 0
            const unrealizedPnL = analytics.futuresUnrealizedPnL || 0
            
            return (
              <button
                onClick={() => setActiveTab('futures')}
                className="group relative overflow-hidden rounded-xl border border-cyan-500/20 bg-cyan-500/5 hover:border-cyan-500/40 hover:bg-cyan-500/10 p-4 text-left transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-5 h-5 text-cyan-400" />
                      <span className="text-sm font-semibold text-cyan-400">Futures Trading</span>
                    </div>
                    <div className="text-xs text-slate-300 mb-1">
                      {futuresValue >= 0 ? `+${currSymbol}${formatNumber(futuresValue, 2)} realized` : `${currSymbol}${formatNumber(Math.abs(futuresValue), 2)} loss`}
                      {openPositions > 0 && (
                        <span className={`ml-1 ${unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          <span className="mx-1">•</span>
                          {unrealizedPnL >= 0 ? '+' : ''}{currSymbol}{formatNumber(Math.abs(unrealizedPnL), 2)} unrealized
                        </span>
                      )}
                    </div>
                    <SeparatorText
                      segments={[
                        `${analytics.futuresTrades} trades`,
                        `${futuresWinRate.toFixed(1)}% win rate`,
                        'Analyze leverage impact'
                      ]}
                      className="text-[10px] text-slate-400"
                    />
                  </div>
                  <ChevronRight className="w-4 h-4 text-cyan-400/50 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0 mt-1" />
                </div>
              </button>
            )
          })()}

          {/* Behavioral Tab - Value Teaser */}
          {analytics.behavioral && analytics.behavioral.healthScore && (() => {
            const healthScore = analytics.behavioral.healthScore
            const criticalPatterns = analytics.behavioral.patterns?.filter(p => p.severity === 'high').length || 0
            const weaknesses = psychology.weaknesses?.length || 0
            
            return (
              <button
                onClick={() => setActiveTab('behavioral')}
                className="group relative overflow-hidden rounded-xl border border-purple-500/20 bg-purple-500/5 hover:border-purple-500/40 hover:bg-purple-500/10 p-4 text-left transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-5 h-5 text-purple-400" />
                      <span className="text-sm font-semibold text-purple-400">Trading Psychology</span>
                    </div>
                    <div className="text-xs text-slate-300 mb-1">
                      Health Score: <span className={healthScore >= 70 ? 'text-emerald-400' : healthScore >= 50 ? 'text-yellow-400' : 'text-red-400'}>{healthScore}/100</span>
                    </div>
                    <SeparatorText
                      segments={[
                        criticalPatterns > 0 && `${criticalPatterns} critical pattern${criticalPatterns > 1 ? 's' : ''}`,
                        weaknesses > 0 && `${weaknesses} weakness${weaknesses > 1 ? 'es' : ''} detected`,
                        'Fix your blind spots'
                      ]}
                      className="text-[10px] text-slate-400"
                    />
                  </div>
                  <ChevronRight className="w-4 h-4 text-purple-400/50 group-hover:text-purple-400 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0 mt-1" />
                </div>
              </button>
            )
          })()}
        </div>
      </div>

      {/* Additional Critical Patterns - Only show if we already showed value-first insights */}
      {valueFirstInsights && valueFirstInsights.critical.length > 0 && patterns.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-400/20">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
            </div>
            <h3 className="text-sm md:text-base font-semibold text-slate-300">Additional Patterns</h3>
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
                    pattern.severity === 'high' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
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
  isAuthenticated = true,
  initialTab = 'overview' // New prop to set initial tab from URL
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(initialTab)
  const [showFilters, setShowFilters] = useState(false)

  // Update activeTab when initialTab prop changes (e.g., from URL parameter)
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab)
    }
  }, [initialTab])

  // Filter state - Only data source filtering
  const [selectedExchanges, setSelectedExchanges] = useState([])
  const [appliedExchanges, setAppliedExchanges] = useState([]) // Track what's currently applied

  // Ensure currency rates are cached when currency changes
  useEffect(() => {
    if (currency && currency !== 'USD') {
      getCurrencyRates().catch(err => {
        console.warn('?? Could not fetch currency rates:', err.message)
      })
    }
  }, [currency])

  // Convert analytics for display currency (USD -> other currency conversion)
  const convertedAnalytics = useMemo(() => {
    if (!analytics) return null
    
    console.log('?? Converting analytics for currency:', currency)
    const converted = convertAnalyticsForDisplay(analytics, currency)
    
    // Debug: Log a sample conversion to verify it's working
    if (converted && analytics.totalPnL !== undefined) {
      console.log('?? Sample conversion:', {
        original: analytics.totalPnL,
        converted: converted.totalPnL,
        currency
      })
    }
    
    return converted
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
    router.push('/')
  }

  // Navigation handlers that use router
  const handleNavigateDashboard = () => {
    if (onDisconnect) {
      onDisconnect()
    } else {
      router.push('/dashboard')
    }
  }

  const handleNavigateUpload = () => {
    if (onUploadClick) {
      onUploadClick()
    } else {
      router.push('/dashboard')
    }
  }

  const handleNavigateAll = () => {
    if (onViewAllExchanges) {
      onViewAllExchanges()
    } else {
      router.push('/analyze')
    }
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
        onDisconnect={handleNavigateDashboard}
        onNavigateDashboard={handleNavigateDashboard}
        onNavigateUpload={handleNavigateUpload}
        onNavigateAll={handleNavigateAll}
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
                  <OverviewTab analytics={displayAnalytics} currSymbol={currSymbol} currency={currency} metadata={currencyMetadata} setActiveTab={setActiveTab} />
                </div>
              )}
              {activeTab === 'behavioral' && (
                <div className="animate-in fade-in duration-300">
                  <BehavioralTab analytics={displayAnalytics} currSymbol={currSymbol} currency={currency} />
                </div>
              )}
              {activeTab === 'spot' && (
                <div className="animate-in fade-in duration-300">
                  <SpotTab analytics={displayAnalytics} currSymbol={currSymbol} currency={currency} metadata={currencyMetadata} />
                </div>
              )}
              {activeTab === 'futures' && (
                <div className="animate-in fade-in duration-300">
                  <FuturesTab analytics={displayAnalytics} currSymbol={currSymbol} currency={currency} metadata={currencyMetadata} />
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
  
  // Helper function to check if symbol is a stablecoin pair
  const isStablecoinPair = (symbol) => {
    if (!symbol || typeof symbol !== 'string') return false
    const symbolUpper = symbol.toUpperCase()
    const stablecoinPairs = [
      'USDCUSDT', 'USDTUSDC', 'BUSDUSDT', 'USDTBUSD', 'USDTUSDT', 'USDCUSDC', 'BUSDBUSD',
      'DAIUSDT', 'USDTDAI', 'TUSDUSDT', 'USDTTUSD', 'USDPUSDT', 'USDTUSDP',
      'FDUSDUSDT', 'USDTFDUSD', 'USDCBUSD', 'BUSDUSDC', 'DAIUSDC', 'USDCDAI',
      'PAXUSDT', 'USDTPAX', 'GUSDUSDT', 'USDTGUSD'
    ]
    return stablecoinPairs.includes(symbolUpper)
  }
  
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
  
  if (analytics.bestSymbol && !isStablecoinPair(analytics.bestSymbol)) {
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
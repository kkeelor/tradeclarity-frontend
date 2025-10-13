// app/analyze/components/StatsCards.js

import { DollarSign, Target, Activity, Sparkles, ArrowUpRight, ArrowDownRight, Calendar, Clock, Award, AlertTriangle } from 'lucide-react'

export function MetricCard({ title, value, subtitle, icon: Icon, valueColor = 'text-white' }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-slate-400 text-sm">{title}</span>
        <Icon className="w-4 h-4 text-emerald-400" />
      </div>
      <div className="space-y-1">
        <div className={`text-3xl font-bold ${valueColor}`}>{value}</div>
        {subtitle && <div className="text-xs text-slate-400">{subtitle}</div>}
      </div>
    </div>
  )
}

export function TopMetrics({ analytics, currSymbol }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <MetricCard
        title="Total P&L"
        value={`${analytics.totalPnL >= 0 ? '+' : ''}${currSymbol}${analytics.totalPnL.toFixed(2)}`}
        subtitle={`${analytics.roi >= 0 ? '+' : ''}${analytics.roi.toFixed(1)}% ROI`}
        icon={DollarSign}
        valueColor={analytics.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}
      />
      <MetricCard
        title="Win Rate"
        value={`${analytics.winRate.toFixed(1)}%`}
        subtitle={`${analytics.winningTrades}W / ${analytics.losingTrades}L`}
        icon={Target}
      />
      <MetricCard
        title="Profit Factor"
        value={analytics.profitFactor.toFixed(2)}
        subtitle={analytics.profitFactor > 2 ? 'Excellent' : analytics.profitFactor > 1.5 ? 'Good' : 'Profitable'}
        icon={Activity}
      />
      <MetricCard
        title="Best Pair"
        value={analytics.bestSymbol?.replace('USDT', '').replace('INR', '')}
        subtitle={`+${currSymbol}${analytics.symbols[analytics.bestSymbol]?.realized.toFixed(2)}`}
        icon={Sparkles}
      />
    </div>
  )
}

export function SecondaryMetrics({ analytics, currSymbol }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-slate-300 font-medium">Average Win</span>
          <ArrowUpRight className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-2xl font-bold text-emerald-400">+{currSymbol}{analytics.avgWin.toFixed(2)}</div>
        <div className="text-xs text-slate-400">Per winning trade</div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-slate-300 font-medium">Average Loss</span>
          <ArrowDownRight className="w-4 h-4 text-red-400" />
        </div>
        <div className="text-2xl font-bold text-red-400">-{currSymbol}{analytics.avgLoss.toFixed(2)}</div>
        <div className="text-xs text-slate-400">Per losing trade</div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-slate-300 font-medium">Total Fees</span>
          <DollarSign className="w-4 h-4 text-amber-400" />
        </div>
        <div className="text-2xl font-bold text-amber-400">{currSymbol}{analytics.totalCommission.toFixed(2)}</div>
        <div className="text-xs text-slate-400">{((analytics.totalCommission / analytics.totalInvested) * 100).toFixed(2)}% of capital</div>
      </div>
    </div>
  )
}

export function InsightCards({ analytics, currSymbol }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-400/30 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-emerald-400/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-lg">Best Trading Day</h3>
            <p className="text-slate-300">
              {analytics.dayPerformance[0]?.day} is your most profitable with 
              <span className="text-emerald-400 font-semibold"> +{currSymbol}{analytics.dayPerformance[0]?.pnl.toFixed(2)}</span> total P&L.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-400/30 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-purple-400/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-lg">Peak Performance Hours</h3>
            <p className="text-slate-300">
              Best at <span className="text-purple-400 font-semibold">{analytics.hourPerformance[0]?.hour}:00</span>, 
              <span className="text-purple-400 font-semibold"> {analytics.hourPerformance[1]?.hour}:00</span>, and 
              <span className="text-purple-400 font-semibold"> {analytics.hourPerformance[2]?.hour}:00</span>.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-400/30 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-amber-400/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Award className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-lg">Best Streak</h3>
            <p className="text-slate-300">
              Longest winning streak: <span className="text-emerald-400 font-semibold">{analytics.maxConsecutiveWins} wins</span>!
            </p>
          </div>
        </div>
      </div>

      {analytics.maxConsecutiveLosses > 3 && (
        <div className="bg-gradient-to-br from-red-500/10 to-pink-500/10 border border-red-400/30 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-red-400/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="font-semibold text-lg">Risk Alert</h3>
              <p className="text-slate-300">
                Max losing streak: <span className="text-red-400 font-semibold">{analytics.maxConsecutiveLosses} losses</span>. Consider risk management.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function QuickStats({ analytics, currSymbol }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-2">
        <div className="text-sm text-slate-400">Largest Win</div>
        <div className="text-xl font-bold text-emerald-400">+{currSymbol}{analytics.largestWin.toFixed(2)}</div>
      </div>
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-2">
        <div className="text-sm text-slate-400">Largest Loss</div>
        <div className="text-xl font-bold text-red-400">{currSymbol}{analytics.largestLoss.toFixed(2)}</div>
      </div>
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-2">
        <div className="text-sm text-slate-400">Total Capital</div>
        <div className="text-xl font-bold text-cyan-400">{currSymbol}{analytics.totalInvested.toFixed(2)}</div>
      </div>
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-2">
        <div className="text-sm text-slate-400">Win Streak</div>
        <div className="text-xl font-bold text-amber-400">{analytics.maxConsecutiveWins}</div>
      </div>
    </div>
  )
}
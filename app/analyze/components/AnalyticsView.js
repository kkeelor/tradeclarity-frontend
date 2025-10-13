// app/analyze/components/AnalyticsView.js

import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Target, Zap, Clock, Calendar, Award, DollarSign, Activity, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react'

function Header({ exchangeConfig, currencyMetadata, currency, setCurrency, onDisconnect }) {
  return (
    <header className="border-b border-slate-800/50 backdrop-blur-xl bg-slate-900/30 sticky top-0 z-20">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm">TradeClarity</span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            {exchangeConfig?.icon} {exchangeConfig?.displayName}
          </span>
          {currencyMetadata?.supportsCurrencySwitch && (
            <>
              <div className="h-4 w-px bg-slate-700" />
              <span className="text-xs text-cyan-400">{currency}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {currencyMetadata?.supportsCurrencySwitch && currencyMetadata.availableCurrencies.length > 1 && (
            <div className="flex items-center gap-1 bg-slate-800/50 border border-slate-700 rounded-lg p-0.5">
              {currencyMetadata.availableCurrencies.map((curr) => (
                <button
                  key={curr}
                  onClick={() => setCurrency(curr)}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                    currency === curr
                      ? 'bg-emerald-500 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>
          )}
          <button 
            onClick={onDisconnect} 
            className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800/50"
          >
            Disconnect
          </button>
        </div>
      </div>
    </header>
  )
}

function MetricCard({ label, value, change, icon: Icon, trend, compact }) {
  return (
    <div className={`bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-lg ${compact ? 'p-3' : 'p-4'} hover:bg-slate-800/50 transition-all`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-1">{label}</div>
          <div className={`font-bold text-white truncate ${compact ? 'text-lg' : 'text-2xl'}`}>{value}</div>
          {change && (
            <div className={`text-xs mt-1 flex items-center gap-1 ${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-slate-400'}`}>
              {trend === 'up' && <ArrowUpRight className="w-3 h-3" />}
              {trend === 'down' && <ArrowDownRight className="w-3 h-3" />}
              {change}
            </div>
          )}
        </div>
        {Icon && (
          <div className={`${compact ? 'w-7 h-7' : 'w-8 h-8'} rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center flex-shrink-0`}>
            <Icon className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-emerald-400`} />
          </div>
        )}
      </div>
    </div>
  )
}

function SpotVsFuturesCard({ analytics, currSymbol }) {
  // Only show if there are both spot and futures trades
  const hasBoth = analytics.spotTrades > 0 && analytics.futuresTrades > 0
  
  if (!hasBoth) return null
  
  const spotPercent = analytics.totalPnL !== 0 ? (analytics.spotPnL / analytics.totalPnL) * 100 : 50
  const futuresPercent = analytics.totalPnL !== 0 ? (analytics.futuresPnL / analytics.totalPnL) * 100 : 50
  
  return (
    <div className="bg-gradient-to-br from-slate-800/50 to-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 hover:border-slate-600/50 transition-all">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="w-4 h-4 text-purple-400" />
        <h3 className="font-semibold text-sm">Spot vs Futures</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Spot P&L</div>
          <div className={`text-xl font-bold ${analytics.spotPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {analytics.spotPnL >= 0 ? '+' : ''}{currSymbol}{Math.abs(analytics.spotPnL).toFixed(0)}
          </div>
          <div className="text-xs text-slate-400">{analytics.spotCompletedTrades} trades • {analytics.spotWinRate.toFixed(0)}% WR</div>
        </div>
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Futures P&L</div>
          <div className={`text-xl font-bold ${analytics.futuresPnL >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
            {analytics.futuresPnL >= 0 ? '+' : ''}{currSymbol}{Math.abs(analytics.futuresPnL).toFixed(0)}
          </div>
          <div className="text-xs text-slate-400">{analytics.futuresCompletedTrades} trades • {analytics.futuresWinRate.toFixed(0)}% WR</div>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Contribution</span>
          <span className="text-slate-400">{Math.abs(spotPercent).toFixed(0)}% / {Math.abs(futuresPercent).toFixed(0)}%</span>
        </div>
        <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden flex">
          <div className="bg-emerald-500 h-full transition-all" style={{ width: `${Math.abs(spotPercent)}%` }} />
          <div className="bg-cyan-500 h-full transition-all" style={{ width: `${Math.abs(futuresPercent)}%` }} />
        </div>
      </div>
    </div>
  )
}

function SymbolRow({ symbol, data, currSymbol }) {
  const displaySymbol = symbol.replace('USDT', '').replace('INR', '').replace('BUSD', '')
  const isSpot = data.accountType === 'SPOT'
  
  return (
    <div className="flex items-center justify-between p-3 bg-slate-800/20 hover:bg-slate-800/40 rounded-lg transition-all group">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-semibold truncate">{displaySymbol}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded ${isSpot ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
              {data.accountType}
            </span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded ${
              data.winRate >= 60 ? 'bg-emerald-400/20 text-emerald-400' : 
              data.winRate >= 50 ? 'bg-amber-400/20 text-amber-400' : 
              'bg-red-400/20 text-red-400'
            }`}>
              {data.winRate.toFixed(0)}% WR
            </span>
          </div>
          <div className="text-[10px] text-slate-500">
            {data.trades} trades • {data.wins}W/{data.losses}L
            {data.position > 0 && (
              <span className="text-cyan-400"> • Holding: {data.position.toFixed(4)}</span>
            )}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className={`text-sm font-bold ${data.realized >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {data.realized >= 0 ? '+' : ''}{currSymbol}{data.realized.toFixed(2)}
        </div>
      </div>
    </div>
  )
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
  const hasFutures = analytics.futuresTrades > 0
  const hasSpot = analytics.spotTrades > 0
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <Header 
        exchangeConfig={exchangeConfig}
        currencyMetadata={currencyMetadata}
        currency={currency}
        setCurrency={setCurrency}
        onDisconnect={onDisconnect}
      />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Hero Stats */}
        <div className="space-y-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Performance Overview</h1>
            <p className="text-xs text-slate-400 mt-1">
              {analytics.totalTrades} total trades • {analytics.completedTrades} completed • {Object.keys(analytics.symbols).length} pairs
              {hasFutures && hasSpot && ` • ${analytics.spotTrades} spot • ${analytics.futuresTrades} futures`}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <MetricCard 
              label="Total P&L" 
              value={`${analytics.totalPnL >= 0 ? '+' : ''}${currSymbol}${analytics.totalPnL.toFixed(2)}`}
              change={`${analytics.roi >= 0 ? '+' : ''}${analytics.roi.toFixed(1)}% ROI`}
              icon={DollarSign}
              trend={analytics.totalPnL >= 0 ? 'up' : 'down'}
            />
            <MetricCard 
              label="Win Rate" 
              value={`${analytics.winRate.toFixed(1)}%`}
              change={`${analytics.winningTrades}W/${analytics.losingTrades}L`}
              icon={Target}
            />
            <MetricCard 
              label="Profit Factor" 
              value={analytics.profitFactor.toFixed(2)}
              change={analytics.profitFactor > 2 ? 'Excellent' : analytics.profitFactor > 1.5 ? 'Good' : analytics.profitFactor > 1 ? 'Profitable' : 'Needs Work'}
              icon={Activity}
            />
            <MetricCard 
              label="Best Pair" 
              value={analytics.bestSymbol?.replace('USDT', '').replace('INR', '').replace('BUSD', '') || 'N/A'}
              change={analytics.bestSymbol ? `+${currSymbol}${analytics.symbols[analytics.bestSymbol]?.realized.toFixed(2)}` : 'No data'}
              icon={Award}
              trend="up"
            />
            <MetricCard 
              label="Avg Win" 
              value={`${currSymbol}${analytics.avgWin.toFixed(2)}`}
              icon={TrendingUp}
              compact
            />
            <MetricCard 
              label="Avg Loss" 
              value={`${currSymbol}${analytics.avgLoss.toFixed(2)}`}
              icon={TrendingDown}
              compact
            />
          </div>
        </div>

        {/* Spot vs Futures + Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <SpotVsFuturesCard analytics={analytics} currSymbol={currSymbol} />
          
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-4 h-4 text-amber-400" />
              <h3 className="font-semibold text-sm">Streaks</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Best Streak</div>
                <div className="text-2xl font-bold text-emerald-400">{analytics.maxConsecutiveWins}</div>
                <div className="text-xs text-slate-400">consecutive wins</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Max Drawdown</div>
                <div className="text-2xl font-bold text-red-400">{analytics.maxConsecutiveLosses}</div>
                <div className="text-xs text-slate-400">consecutive losses</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-purple-400" />
              <h3 className="font-semibold text-sm">Extremes</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Largest Win</div>
                <div className="text-2xl font-bold text-emerald-400">+{currSymbol}{analytics.largestWin.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Largest Loss</div>
                <div className="text-2xl font-bold text-red-400">{currSymbol}{analytics.largestLoss.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              Monthly Performance
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.monthlyData}>
                  <defs>
                    <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '10px' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }} 
                  />
                  <Area type="monotone" dataKey="pnl" stroke="#10b981" fillOpacity={1} fill="url(#colorPnl)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Day Performance
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.dayPerformance}>
                  <XAxis dataKey="day" stroke="#64748b" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '10px' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }} 
                  />
                  <Bar dataKey="pnl" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Performance by Symbol */}
        <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-3">Performance by Symbol</h3>
          <div className="space-y-2">
            {Object.entries(analytics.symbols)
              .sort((a, b) => b[1].realized - a[1].realized)
              .map(([symbol, data]) => (
                <SymbolRow key={symbol} symbol={symbol} data={data} currSymbol={currSymbol} />
              ))}
          </div>
        </div>

        {/* Best Trading Hours */}
        {analytics.hourPerformance && analytics.hourPerformance.length > 0 && (
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-400/30 rounded-xl p-4">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              Peak Performance Hours
            </h3>
            <p className="text-xs text-slate-300">
              Your most profitable hours are{' '}
              <span className="text-purple-400 font-semibold">{analytics.hourPerformance[0]?.hour}:00</span>
              {analytics.hourPerformance[1] && (
                <>, <span className="text-purple-400 font-semibold">{analytics.hourPerformance[1]?.hour}:00</span></>
              )}
              {analytics.hourPerformance[2] && (
                <>, and <span className="text-purple-400 font-semibold">{analytics.hourPerformance[2]?.hour}:00</span></>
              )}
              .
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
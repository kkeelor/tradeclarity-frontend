// app/analyze/components/MarketContext/PerformanceComparison.jsx
// Task 3.3: Performance Comparison Charts
// PHASE 7 TASK 7.4: Updated to use MetricCard with progress bars

'use client'

import { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts'
import { TrendingUp, TrendingDown, Target, Filter, BarChart3 } from 'lucide-react'
import { MetricCard } from './MetricCard'

export default function PerformanceComparison({
  analytics,
  userPerformance,
  comparisons,
  benchmarks,
  dateRange
}) {
  const [marketConditionFilter, setMarketConditionFilter] = useState('all') // 'all', 'bullish', 'bearish', 'high-vol', 'low-vol'

  // Prepare performance timeline data
  const performanceTimeline = useMemo(() => {
    if (!analytics?.allTrades || !benchmarks) return []

    // Group trades by date
    const tradesByDate = {}
    analytics.allTrades.forEach(trade => {
      const tradeDate = new Date(trade.timestamp || trade.time)
      const dateKey = tradeDate.toISOString().split('T')[0]
      
      if (!tradesByDate[dateKey]) {
        tradesByDate[dateKey] = {
          date: dateKey,
          timestamp: tradeDate.getTime(),
          userPnL: 0,
          tradeCount: 0
        }
      }
      
      tradesByDate[dateKey].userPnL += trade.realizedPnl || trade.income || 0
      tradesByDate[dateKey].tradeCount++
    })

    // Calculate cumulative P&L
    let cumulativePnL = 0
    const timeline = Object.values(tradesByDate)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(point => {
        cumulativePnL += point.userPnL
        return {
          ...point,
          cumulativePnL,
          userReturn: cumulativePnL // Simplified - would need initial investment
        }
      })

    // Add benchmark data (simplified - would need historical benchmark prices)
    return timeline.map(point => ({
      ...point,
      marketReturn: point.userReturn * 0.9 + (Math.random() - 0.5) * 0.2 * point.userReturn // Placeholder
    }))
  }, [analytics, benchmarks])

  // Prepare drawdown comparison
  const drawdownComparison = useMemo(() => {
    if (!analytics?.allTrades) return []

    // Calculate user equity curve
    let runningBalance = 0
    const equityCurve = analytics.allTrades
      .map(trade => ({
        timestamp: new Date(trade.timestamp || trade.time).getTime(),
        balance: runningBalance += (trade.realizedPnl || trade.income || 0)
      }))
      .sort((a, b) => a.timestamp - b.timestamp)

    // Calculate drawdowns
    let peak = equityCurve[0]?.balance || 0
    const drawdowns = equityCurve.map(point => {
      if (point.balance > peak) peak = point.balance
      return {
        timestamp: point.timestamp,
        date: new Date(point.timestamp).toISOString().split('T')[0],
        userDrawdown: peak > 0 ? ((point.balance - peak) / peak) * 100 : 0,
        marketDrawdown: ((point.balance - peak) / peak) * 100 * 0.8 // Placeholder
      }
    })

    return drawdowns
  }, [analytics])

  // Prepare scatter plot data (win/loss vs market conditions)
  const scatterData = useMemo(() => {
    if (!analytics?.allTrades) return []

    return analytics.allTrades
      .filter(trade => {
        const tradeDate = new Date(trade.timestamp || trade.time)
        const startDate = new Date(dateRange.start)
        const endDate = new Date(dateRange.end)
        return tradeDate >= startDate && tradeDate <= endDate
      })
      .map(trade => {
        const pnl = trade.realizedPnl || trade.income || 0
        // Simulate market return (would come from actual data)
        const marketReturn = (Math.random() - 0.5) * 20
        
        return {
          marketReturn,
          userReturn: pnl,
          isWin: pnl > 0,
          symbol: trade.symbol
        }
      })
  }, [analytics, dateRange])

  // Calculate performance breakdown by condition
  const performanceByCondition = useMemo(() => {
    if (!analytics?.allTrades) return null

    const conditions = {
      bullish: { trades: [], totalPnL: 0, wins: 0 },
      bearish: { trades: [], totalPnL: 0, wins: 0 },
      'high-vol': { trades: [], totalPnL: 0, wins: 0 },
      'low-vol': { trades: [], totalPnL: 0, wins: 0 }
    }

    // Simplified classification (would use actual market data)
    analytics.allTrades.forEach(trade => {
      const pnl = trade.realizedPnl || trade.income || 0
      // Randomly assign condition for demo (would use actual market data)
      const condition = ['bullish', 'bearish', 'high-vol', 'low-vol'][
        Math.floor(Math.random() * 4)
      ]
      
      conditions[condition].trades.push(trade)
      conditions[condition].totalPnL += pnl
      if (pnl > 0) conditions[condition].wins++
    })

    return Object.entries(conditions).map(([condition, data]) => ({
      condition,
      count: data.trades.length,
      avgPnL: data.trades.length > 0 ? data.totalPnL / data.trades.length : 0,
      winRate: data.trades.length > 0 ? (data.wins / data.trades.length) * 100 : 0,
      totalPnL: data.totalPnL
    }))
  }, [analytics])

  // Custom tooltips
  const PerformanceTooltip = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null

    return (
      <div className="bg-black/95 border border-slate-700 rounded-lg p-3 shadow-xl">
        <div className="text-xs text-slate-400 mb-2">{payload[0]?.payload?.date}</div>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm mb-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-slate-300">{entry.name}:</span>
            <span className={`font-semibold ${
              parseFloat(entry.value || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {parseFloat(entry.value || 0) >= 0 ? '+' : ''}
              {parseFloat(entry.value || 0).toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    )
  }

  const ScatterTooltip = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null

    const data = payload[0]?.payload
    return (
      <div className="bg-black/95 border border-slate-700 rounded-lg p-3 shadow-xl">
        <div className="text-sm font-semibold text-white mb-2">{data?.symbol}</div>
        <div className="text-xs text-slate-400">
          Market Return: {data?.marketReturn >= 0 ? '+' : ''}{data?.marketReturn.toFixed(2)}%
        </div>
        <div className={`text-xs font-semibold ${
          data?.userReturn >= 0 ? 'text-emerald-400' : 'text-red-400'
        }`}>
          Your Return: {data?.userReturn >= 0 ? '+' : ''}{data?.userReturn.toFixed(2)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Performance Metrics Summary */}
      {userPerformance && comparisons.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            title="Your Performance"
            value={userPerformance.returnPercent}
            valueFormat="percent"
            progress={Math.max(0, Math.min(100, ((userPerformance.returnPercent + 50) / 100) * 100))}
            color={userPerformance.returnPercent >= 0 ? 'emerald' : 'red'}
            icon={Target}
            tooltip="Your total return on investment percentage for the selected period"
          />

          <MetricCard
            title="Market Performance"
            value={comparisons[0]?.marketReturn || 0}
            valueFormat="percent"
            progress={Math.max(0, Math.min(100, (((comparisons[0]?.marketReturn || 0) + 50) / 100) * 100))}
            color={(comparisons[0]?.marketReturn || 0) >= 0 ? 'emerald' : 'red'}
            icon={BarChart3}
            tooltip="Market benchmark return percentage for comparison"
          />

          <MetricCard
            title="Outperformance"
            value={(userPerformance.returnPercent - (comparisons[0]?.marketReturn || 0))}
            valueFormat="percent"
            progress={comparisons[0]?.outperformed ? 75 : 25}
            color={comparisons[0]?.outperformed ? 'emerald' : 'red'}
            badgeLabel={comparisons[0]?.outperformed ? 'Outperforming' : 'Underperforming'}
            badgeVariant={comparisons[0]?.outperformed ? 'profit' : 'loss'}
            icon={comparisons[0]?.outperformed ? TrendingUp : TrendingDown}
            tooltip="Difference between your performance and market performance. Positive values mean you outperformed the market."
          />

          <MetricCard
            title="Win Rate"
            value={userPerformance.winRate || 0}
            valueFormat="percent"
            progress={userPerformance.winRate || 0}
            color={(userPerformance.winRate || 0) >= 60 ? 'emerald' : (userPerformance.winRate || 0) >= 40 ? 'yellow' : 'red'}
            badgeLabel={(userPerformance.winRate || 0) >= 60 ? 'Excellent' : (userPerformance.winRate || 0) >= 40 ? 'Good' : 'Needs Improvement'}
            badgeVariant={(userPerformance.winRate || 0) >= 60 ? 'profit' : (userPerformance.winRate || 0) >= 40 ? 'warning' : 'loss'}
            icon={Target}
            tooltip="Percentage of winning trades. Higher win rates indicate more consistent trading performance."
          />
        </div>
      )}

      {/* User P&L vs Market Performance Chart */}
      {performanceTimeline.length > 0 && (
        <div className="bg-black/40 rounded-xl p-5 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Performance Comparison</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceTimeline} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  }}
                />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={12}
                  label={{ value: 'Return (%)', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
                />
                <Tooltip content={<PerformanceTooltip />} />
                <Legend />
                <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="userReturn"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={false}
                  name="Your Performance"
                />
                <Line
                  type="monotone"
                  dataKey="marketReturn"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Market Performance"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Drawdown Comparison */}
      {drawdownComparison.length > 0 && (
        <div className="bg-black/40 rounded-xl p-5 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Drawdown Comparison</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={drawdownComparison} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="userDrawdownGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="marketDrawdownGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  }}
                />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={12}
                  label={{ value: 'Drawdown (%)', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
                />
                <Tooltip content={<PerformanceTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="userDrawdown"
                  stroke="#EF4444"
                  strokeWidth={2}
                  fill="url(#userDrawdownGradient)"
                  name="Your Drawdown"
                />
                <Area
                  type="monotone"
                  dataKey="marketDrawdown"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#marketDrawdownGradient)"
                  name="Market Drawdown"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Win/Loss Correlation Scatter Plot */}
      {scatterData.length > 0 && (
        <div className="bg-black/40 rounded-xl p-5 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Win/Loss vs Market Conditions</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart data={scatterData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  type="number"
                  dataKey="marketReturn"
                  stroke="#9CA3AF"
                  fontSize={12}
                  label={{ value: 'Market Return (%)', position: 'insideBottom', offset: -5, style: { fill: '#9CA3AF' } }}
                />
                <YAxis
                  type="number"
                  dataKey="userReturn"
                  stroke="#9CA3AF"
                  fontSize={12}
                  label={{ value: 'Your Return', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
                />
                <Tooltip content={<ScatterTooltip />} />
                <Scatter
                  name="Trades"
                  data={scatterData}
                  fill="#8884d8"
                >
                  {scatterData.map((entry, index) => (
                    <Scatter
                      key={index}
                      fill={entry.isWin ? '#10B981' : '#EF4444'}
                    />
                  ))}
                </Scatter>
                <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="3 3" />
                <ReferenceLine x={0} stroke="#6B7280" strokeDasharray="3 3" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Performance by Market Condition */}
      {performanceByCondition && (
        <div className="bg-black/40 rounded-xl p-5 border border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Performance by Market Condition</h3>
            <select
              value={marketConditionFilter}
              onChange={(e) => setMarketConditionFilter(e.target.value)}
              className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded-lg text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Conditions</option>
              <option value="bullish">Bullish</option>
              <option value="bearish">Bearish</option>
              <option value="high-vol">High Volatility</option>
              <option value="low-vol">Low Volatility</option>
            </select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {performanceByCondition
              .filter(p => marketConditionFilter === 'all' || p.condition === marketConditionFilter)
              .map((perf, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${
                    perf.condition === 'bullish'
                      ? 'bg-emerald-500/10 border-emerald-500/20'
                      : perf.condition === 'bearish'
                      ? 'bg-red-500/10 border-red-500/20'
                      : perf.condition === 'high-vol'
                      ? 'bg-yellow-500/10 border-yellow-500/20'
                      : 'bg-blue-500/10 border-blue-500/20'
                  }`}
                >
                  <div className="text-xs text-slate-400 mb-2 capitalize">{perf.condition.replace('-', ' ')}</div>
                  <div className="text-lg font-bold text-white mb-1">{perf.count} trades</div>
                  <div className={`text-sm font-semibold mb-1 ${
                    perf.avgPnL >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    Avg: {perf.avgPnL >= 0 ? '+' : ''}{perf.avgPnL.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-500">Win Rate: {perf.winRate.toFixed(1)}%</div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

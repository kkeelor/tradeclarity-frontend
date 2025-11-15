// app/analyze/components/MarketContext/TradesChart.jsx
// Beautiful chart showing user trades plotted by date/time

'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceDot
} from 'recharts'
import { TrendingUp, TrendingDown } from 'lucide-react'

export default function TradesChart({ 
  analytics
}) {
  // Get all trades and prepare them for plotting
  const trades = useMemo(() => {
    if (!analytics?.allTrades || !Array.isArray(analytics.allTrades)) return []

    return analytics.allTrades
      .map(trade => {
        const timestamp = new Date(trade.timestamp || trade.time)
        if (isNaN(timestamp.getTime())) return null

        return {
          timestamp: timestamp.getTime(),
          date: timestamp.toISOString().split('T')[0],
          time: timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          price: parseFloat(trade.price || trade.executedPrice || 0),
          isBuy: trade.isBuyer !== undefined ? trade.isBuyer : (trade.side === 'buy' || trade.type === 'buy'),
          symbol: trade.symbol || 'UNKNOWN',
          quantity: parseFloat(trade.qty || trade.quantity || 0),
          pnl: parseFloat(trade.realizedPnl || trade.income || 0),
          value: parseFloat(trade.quoteQty || (trade.price && trade.qty ? trade.price * trade.qty : 0) || 0)
        }
      })
      .filter(trade => trade !== null)
      .sort((a, b) => a.timestamp - b.timestamp)
  }, [analytics])

  // Get time period from trades
  const timePeriod = useMemo(() => {
    if (trades.length === 0) return null

    const oldestTrade = trades[0]
    const latestTrade = trades[trades.length - 1]

    return {
      start: new Date(oldestTrade.timestamp),
      end: new Date(latestTrade.timestamp)
    }
  }, [trades])

  // Group trades by date for better visualization
  const tradesByDate = useMemo(() => {
    const grouped = {}
    trades.forEach(trade => {
      const dateKey = trade.date
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(trade)
    })
    return grouped
  }, [trades])

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null

    const trade = payload[0]?.payload
    if (!trade) return null

    return (
      <div className="bg-black/95 border border-slate-700 rounded-lg p-3 shadow-xl min-w-[200px]">
        <div className="text-xs text-slate-400 mb-2">
          {new Date(trade.timestamp).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-3 h-3 rounded-full ${trade.isBuy ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <span className={trade.isBuy ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
              {trade.isBuy ? 'BUY' : 'SELL'}
            </span>
          </div>
          <div className="text-sm text-white">
            <span className="text-slate-400">Symbol: </span>
            <span className="font-semibold">{trade.symbol}</span>
          </div>
          {trade.price > 0 && (
            <div className="text-sm text-white">
              <span className="text-slate-400">Price: </span>
              <span className="font-semibold">${trade.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}
          {trade.quantity > 0 && (
            <div className="text-sm text-white">
              <span className="text-slate-400">Quantity: </span>
              <span className="font-semibold">{trade.quantity.toLocaleString('en-US', { maximumFractionDigits: 4 })}</span>
            </div>
          )}
          {trade.value > 0 && (
            <div className="text-sm text-white">
              <span className="text-slate-400">Value: </span>
              <span className="font-semibold">${trade.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}
          {trade.pnl !== 0 && (
            <div className={`text-sm font-semibold ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              P&L: {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (trades.length === 0) {
    return (
      <div className="bg-black/40 rounded-xl p-8 border border-slate-700/50">
        <div className="text-center text-slate-400">
          <p>No trades found to display</p>
        </div>
      </div>
    )
  }

  // Create line chart data showing cumulative trading volume over time
  const lineChartData = useMemo(() => {
    if (trades.length === 0) return []

    // Determine bucket size based on time range
    const timeRange = timePeriod ? (timePeriod.end.getTime() - timePeriod.start.getTime()) : 0
    const daysRange = timeRange / (1000 * 60 * 60 * 24)
    
    // Use hourly buckets if range < 30 days, daily if < 365 days, weekly otherwise
    let bucketSizeMs
    if (daysRange < 30) {
      bucketSizeMs = 60 * 60 * 1000 // 1 hour
    } else if (daysRange < 365) {
      bucketSizeMs = 24 * 60 * 60 * 1000 // 1 day
    } else {
      bucketSizeMs = 7 * 24 * 60 * 60 * 1000 // 1 week
    }

    // Group trades into buckets and sum trading volume
    const volumeMap = {}
    trades.forEach(trade => {
      const bucketTime = Math.floor(trade.timestamp / bucketSizeMs) * bucketSizeMs
      if (!volumeMap[bucketTime]) {
        volumeMap[bucketTime] = 0
      }
      // Add trade value (USD amount)
      volumeMap[bucketTime] += trade.value || 0
    })

    // Convert to array and sort by time
    const volumeData = Object.keys(volumeMap)
      .map(bucketTime => ({
        timestamp: parseInt(bucketTime),
        volume: volumeMap[bucketTime]
      }))
      .sort((a, b) => a.timestamp - b.timestamp)

    // Calculate cumulative volume
    let cumulativeVolume = 0
    return volumeData.map(point => {
      cumulativeVolume += point.volume
      return {
        ...point,
        cumulativeVolume
      }
    })
  }, [trades, timePeriod])

  return (
    <div className="bg-black/40 rounded-xl p-6 border border-slate-700/50">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-1">Your Trading Activity</h3>
        <p className="text-sm text-slate-400">
          All your trades plotted by date and time
        </p>
      </div>

      <div className="h-[400px] mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={lineChartData}
            margin={{ top: 20, right: 30, left: 60, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
            <XAxis
              type="number"
              dataKey="timestamp"
              stroke="#9CA3AF"
              fontSize={12}
              domain={timePeriod ? [timePeriod.start.getTime(), timePeriod.end.getTime()] : ['dataMin', 'dataMax']}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              }}
              label={{ value: 'Time', position: 'insideBottom', offset: -5, style: { fill: '#9CA3AF' } }}
            />
            <YAxis
              type="number"
              stroke="#9CA3AF"
              fontSize={12}
              domain={[0, 'dataMax + dataMax * 0.1']}
              tickFormatter={(value) => {
                if (value === 0) return '$0'
                if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
                if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
                return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
              }}
              label={{ value: 'Trading Volume (USD)', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null
                const data = payload[0]?.payload
                return (
                  <div className="bg-black/95 border border-slate-700 rounded-lg p-3 shadow-xl">
                    <div className="text-xs text-slate-400 mb-2">
                      {new Date(data?.timestamp).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </div>
                    <div className="text-sm font-semibold text-white">
                      Volume: ${data?.cumulativeVolume?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                )
              }}
            />
            <Legend />
            
            {/* Line showing cumulative trading volume */}
            <Line
              type="monotone"
              dataKey="cumulativeVolume"
              stroke="#10B981"
              strokeWidth={2}
              dot={false}
              name="Cumulative Trading Volume"
              activeDot={{ r: 6 }}
            />

            {/* Buy Trades Overlay - positioned at cumulative volume */}
            {trades.filter(t => t.isBuy).slice(0, 500).map((trade, index) => {
              // Find the closest data point in lineChartData for this trade's timestamp
              let closestPoint = lineChartData[0]
              let minDiff = Infinity
              
              lineChartData.forEach(point => {
                const diff = Math.abs(point.timestamp - trade.timestamp)
                if (diff < minDiff) {
                  minDiff = diff
                  closestPoint = point
                }
              })
              
              const yValue = closestPoint?.cumulativeVolume || 0
              
              return (
                <ReferenceDot
                  key={`buy-${trade.timestamp}-${index}`}
                  x={trade.timestamp}
                  y={yValue}
                  r={4}
                  fill="#10B981"
                  stroke="#fff"
                  strokeWidth={1}
                />
              )
            })}

            {/* Sell Trades Overlay - positioned at cumulative volume */}
            {trades.filter(t => !t.isBuy).slice(0, 500).map((trade, index) => {
              // Find the closest data point in lineChartData for this trade's timestamp
              let closestPoint = lineChartData[0]
              let minDiff = Infinity
              
              lineChartData.forEach(point => {
                const diff = Math.abs(point.timestamp - trade.timestamp)
                if (diff < minDiff) {
                  minDiff = diff
                  closestPoint = point
                }
              })
              
              const yValue = closestPoint?.cumulativeVolume || 0
              
              return (
                <ReferenceDot
                  key={`sell-${trade.timestamp}-${index}`}
                  x={trade.timestamp}
                  y={yValue}
                  r={4}
                  fill="#EF4444"
                  stroke="#fff"
                  strokeWidth={1}
                />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Time Period Display */}
      {timePeriod && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <span>Buy trades ({trades.filter(t => t.isBuy).length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <span>Sell trades ({trades.filter(t => !t.isBuy).length})</span>
            </div>
            <div className="text-slate-500">
              Total: {trades.length} trades
            </div>
          </div>
          <div className="text-sm text-slate-400">
            {timePeriod.start.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })} - {timePeriod.end.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// app/analyze/components/MarketContext/PriceMovement.jsx
// Task 2.2: Price Movement Section

'use client'

import { useState, useMemo } from 'react'
import { normalizePriceData, extractHistoricalPriceTimeline, getLatestPrice } from '../../utils/marketContextDataParser'
import { EmptyState } from './ErrorFallback'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  ReferenceLine,
  Legend
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Clock } from 'lucide-react'

const TIMEFRAMES = [
  { id: '1h', label: '1 Hour', hours: 1 },
  { id: '1d', label: '1 Day', hours: 24 },
  { id: '7d', label: '7 Days', hours: 24 * 7 },
  { id: '30d', label: '30 Days', hours: 24 * 30 },
  { id: '90d', label: '90 Days', hours: 24 * 90 }
]

export default function PriceMovement({
  comprehensiveContext,
  analytics,
  dateRange,
  detectedAssets,
  realTimePrices,
  selectedAsset = null
}) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d')

  // PHASE 3 TASK 3.1: Use selected asset instead of just first instrument
  const primaryInstrument = selectedAsset || detectedAssets?.instruments?.[0]
  
  // Prepare price data for selected timeframe - PHASE 2 TASK 2.1: Use real historical data
  const priceData = useMemo(() => {
    if (!comprehensiveContext?.price || !primaryInstrument) return []
    
    const now = new Date()
    const timeframe = TIMEFRAMES.find(tf => tf.id === selectedTimeframe)
    const startTime = new Date(now.getTime() - (timeframe?.hours || 168) * 60 * 60 * 1000)
    const endTime = now
    
    // PHASE 2 TASK 2.1: Extract historical price timeline for the selected timeframe
    const historicalPrices = extractHistoricalPriceTimeline(
      comprehensiveContext.price,
      primaryInstrument,
      startTime.toISOString(),
      endTime.toISOString()
    )
    
    // If we have historical data, use it
    if (historicalPrices.length > 0) {
      return historicalPrices.map(point => ({
        timestamp: point.timestamp,
        date: point.date || new Date(point.timestamp).toISOString().split('T')[0],
        time: new Date(point.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        price: point.value,
        volume: 0 // Volume will be handled separately in Task 2.2
      })).sort((a, b) => a.timestamp - b.timestamp)
    }
    
    // Fallback: If no historical data, use normalized data (single point or array)
    const normalizedPrices = normalizePriceData(comprehensiveContext.price, primaryInstrument)
    if (normalizedPrices.length > 0) {
      // If we only have a single point, create a simple timeline with current price
      const latestPrice = getLatestPrice(comprehensiveContext.price, primaryInstrument)
      const currentPrice = latestPrice?.value || normalizedPrices[0]?.value || 0
      const realTimePrice = realTimePrices[primaryInstrument]?.price || currentPrice
      
      // If we have multiple points, use them
      if (normalizedPrices.length > 1) {
        return normalizedPrices.map(point => ({
          timestamp: point.timestamp,
          date: point.date || new Date(point.timestamp).toISOString().split('T')[0],
          time: new Date(point.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          price: point.value,
          volume: 0
        })).sort((a, b) => a.timestamp - b.timestamp)
      }
      
      // Single point: Use current price with real-time update
      return [{
        timestamp: now.getTime(),
        date: now.toISOString().split('T')[0],
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        price: realTimePrice,
        volume: 0
      }]
    }
    
    // No data available
    return []
  }, [comprehensiveContext, primaryInstrument, selectedTimeframe, realTimePrices])

  // PHASE 4 TASK 4.2: Show empty state if no price data
  if (priceData.length === 0) {
    return (
      <div className="bg-black/40 rounded-xl p-5 border border-slate-700/50">
        <EmptyState
          icon={TrendingUp}
          title="No Price Data Available"
          message={`No price data available for ${primaryInstrument || 'selected asset'} in the ${TIMEFRAMES.find(tf => tf.id === selectedTimeframe)?.label || 'selected'} timeframe. Try selecting a different timeframe or refreshing the data.`}
        />
      </div>
    )
  }

  // Calculate comparison metrics
  const comparisonMetrics = useMemo(() => {
    if (priceData.length === 0) return null
    
    const prices = priceData.map(d => d.price).filter(p => p > 0)
    if (prices.length === 0) return null
    
    const currentPrice = prices[prices.length - 1]
    const startPrice = prices[0]
    const maxPrice = Math.max(...prices)
    const minPrice = Math.min(...prices)
    
    const change = currentPrice - startPrice
    const changePercent = startPrice > 0 ? (change / startPrice) * 100 : 0
    const drawdown = maxPrice > 0 ? ((currentPrice - maxPrice) / maxPrice) * 100 : 0
    const recovery = minPrice > 0 ? ((currentPrice - minPrice) / minPrice) * 100 : 0
    
    // Calculate moving averages
    const ma7 = prices.slice(-7).reduce((sum, p) => sum + p, 0) / Math.min(7, prices.length)
    const ma30 = prices.slice(-30).reduce((sum, p) => sum + p, 0) / Math.min(30, prices.length)
    
    return {
      currentPrice,
      startPrice,
      change,
      changePercent,
      maxPrice,
      minPrice,
      drawdown,
      recovery,
      ma7,
      ma30,
      vs7dAvg: ma7 > 0 ? ((currentPrice - ma7) / ma7) * 100 : 0,
      vs30dAvg: ma30 > 0 ? ((currentPrice - ma30) / ma30) * 100 : 0
    }
  }, [priceData])

  // Get user trades in timeframe
  const userTrades = useMemo(() => {
    if (!analytics?.allTrades) return []
    
    const timeframe = TIMEFRAMES.find(tf => tf.id === selectedTimeframe)
    const now = new Date()
    const startTime = new Date(now.getTime() - (timeframe?.hours || 168) * 60 * 60 * 1000)
    
    return analytics.allTrades
      .filter(trade => {
        const tradeDate = new Date(trade.timestamp || trade.time)
        return tradeDate >= startTime && tradeDate <= now
      })
      .map(trade => ({
        timestamp: new Date(trade.timestamp || trade.time).getTime(),
        price: trade.price,
        isBuyer: trade.isBuyer !== undefined ? trade.isBuyer : (trade.side === 'buy'),
        symbol: trade.symbol,
        qty: trade.qty || trade.quantity
      }))
  }, [analytics, selectedTimeframe])

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null

    return (
      <div className="bg-black/95 border border-slate-700 rounded-lg p-3 shadow-xl">
        <div className="text-xs text-slate-400 mb-2">
          {payload[0]?.payload?.date} {payload[0]?.payload?.time}
        </div>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm mb-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-slate-300">{entry.name}:</span>
            <span className="text-white font-semibold">
              {entry.name === 'Price' || entry.name === 'MA7' || entry.name === 'MA30' 
                ? `$${parseFloat(entry.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }

  if (!primaryInstrument) {
    return (
      <div className="bg-black/40 rounded-xl p-5 border border-slate-700/50">
        <div className="text-slate-400 text-center py-8">No price data available</div>
      </div>
    )
  }

  return (
    <div className="bg-black/40 rounded-xl p-5 border border-slate-700/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Price Movement</h3>
          <p className="text-xs text-slate-400">{primaryInstrument}</p>
        </div>
        
        {/* Timeframe Selector */}
        <div className="flex items-center gap-2">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf.id}
              onClick={() => setSelectedTimeframe(tf.id)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                selectedTimeframe === tf.id
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800/50 border-slate-600 text-slate-400 hover:border-slate-500'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Metrics */}
      {comparisonMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="p-3 bg-slate-800/50 rounded-lg">
            <div className="text-xs text-slate-400 mb-1">Current Price</div>
            <div className="text-lg font-bold text-white">
              ${comparisonMetrics.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="p-3 bg-slate-800/50 rounded-lg">
            <div className="text-xs text-slate-400 mb-1">Period Change</div>
            <div className={`text-lg font-bold flex items-center gap-1 ${
              comparisonMetrics.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {comparisonMetrics.changePercent >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {comparisonMetrics.changePercent >= 0 ? '+' : ''}
              {comparisonMetrics.changePercent.toFixed(2)}%
            </div>
          </div>
          <div className="p-3 bg-slate-800/50 rounded-lg">
            <div className="text-xs text-slate-400 mb-1">vs 7d Avg</div>
            <div className={`text-lg font-bold ${
              comparisonMetrics.vs7dAvg >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {comparisonMetrics.vs7dAvg >= 0 ? '+' : ''}
              {comparisonMetrics.vs7dAvg.toFixed(2)}%
            </div>
          </div>
          <div className="p-3 bg-slate-800/50 rounded-lg">
            <div className="text-xs text-slate-400 mb-1">Drawdown</div>
            <div className={`text-lg font-bold ${
              comparisonMetrics.drawdown >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {comparisonMetrics.drawdown.toFixed(2)}%
            </div>
          </div>
        </div>
      )}

      {/* Price Chart */}
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={priceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
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
              label={{ value: 'Price ($)', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Price Area */}
            <Area
              type="monotone"
              dataKey="price"
              stroke="#3B82F6"
              strokeWidth={2}
              fill="url(#priceGradient)"
              name="Price"
            />
            
            {/* Moving Averages */}
            {comparisonMetrics && (
              <>
                <Line
                  type="monotone"
                  dataKey={() => comparisonMetrics.ma7}
                  stroke="#10B981"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  name="MA7"
                />
                <Line
                  type="monotone"
                  dataKey={() => comparisonMetrics.ma30}
                  stroke="#F59E0B"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  name="MA30"
                />
              </>
            )}
            
            {/* Reference Lines */}
            {comparisonMetrics && (
              <>
                <ReferenceLine
                  y={comparisonMetrics.startPrice}
                  stroke="#9CA3AF"
                  strokeDasharray="3 3"
                  label={{ value: 'Start', position: 'right', style: { fill: '#9CA3AF', fontSize: '10px' } }}
                />
                <ReferenceLine
                  y={comparisonMetrics.maxPrice}
                  stroke="#10B981"
                  strokeDasharray="3 3"
                  label={{ value: 'High', position: 'right', style: { fill: '#10B981', fontSize: '10px' } }}
                />
                <ReferenceLine
                  y={comparisonMetrics.minPrice}
                  stroke="#EF4444"
                  strokeDasharray="3 3"
                  label={{ value: 'Low', position: 'right', style: { fill: '#EF4444', fontSize: '10px' } }}
                />
              </>
            )}
            
            {/* Trade Markers */}
            {userTrades.map((trade, index) => {
              const dataPoint = priceData.find(d => 
                Math.abs(d.timestamp - trade.timestamp) < 24 * 60 * 60 * 1000
              )
              if (!dataPoint) return null
              
              return (
                <ReferenceDot
                  key={index}
                  x={dataPoint.date}
                  y={dataPoint.price}
                  r={6}
                  fill={trade.isBuyer ? '#10B981' : '#EF4444'}
                  stroke="#fff"
                  strokeWidth={1}
                />
              )
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Trade Markers Legend */}
      {userTrades.length > 0 && (
        <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
            <span>Your Buy Trades ({userTrades.filter(t => t.isBuyer).length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <span>Your Sell Trades ({userTrades.filter(t => !t.isBuyer).length})</span>
          </div>
        </div>
      )}
    </div>
  )
}

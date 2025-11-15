// app/analyze/components/MarketContext/TimelineChart.jsx
// Task 2.1: Combined Timeline Chart

'use client'

import { useMemo, memo } from 'react'
import { useMobile } from './useMobile'
import { normalizePriceData, extractHistoricalPriceTimeline } from '../../utils/marketContextDataParser'
import { normalizeSentimentTimeline, createUnifiedTimeline } from '../../utils/marketDataNormalizer'
import { EmptyState } from './ErrorFallback'
import { BarChart3 } from 'lucide-react'
import {
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceDot,
  ReferenceLine
} from 'recharts'
import { TrendingUp, TrendingDown } from 'lucide-react'

function TimelineChart({
  comprehensiveContext,
  analytics,
  dateRange,
  detectedAssets,
  selectedAsset = null
}) {
  const { isMobile } = useMobile()
  
  // Prepare chart data by merging all data sources
  const chartData = useMemo(() => {
    if (!comprehensiveContext) return []

    const dataMap = new Map()
    // PHASE 3 TASK 3.1: Use selected asset instead of just first instrument
    const primaryInstrument = selectedAsset || detectedAssets?.instruments?.[0]

    // Add price data - PHASE 2 TASK 2.1: Use parser utilities to handle both single point and arrays
    if (comprehensiveContext.price && primaryInstrument) {
      // Use parser utility to normalize price data (handles both single point and array)
      const normalizedPriceData = normalizePriceData(comprehensiveContext.price, primaryInstrument)
      
      // Extract historical timeline for the date range
      const historicalPrices = extractHistoricalPriceTimeline(
        comprehensiveContext.price,
        primaryInstrument,
        dateRange.start,
        dateRange.end
      )
      
      // Use historical data if available, otherwise fall back to normalized data
      const priceTimeline = historicalPrices.length > 0 ? historicalPrices : normalizedPriceData
      
      // Add all price points to the data map
      priceTimeline.forEach(pricePoint => {
        const timestamp = pricePoint.timestamp
        if (!dataMap.has(timestamp)) {
          dataMap.set(timestamp, { timestamp, date: new Date(timestamp) })
        }
        const point = dataMap.get(timestamp)
        point.price = pricePoint.value
      })
    }

    // PHASE 5 TASK 5.1: Use normalized sentiment timeline
    if (comprehensiveContext.newsSentiment) {
      const normalizedSentiment = normalizeSentimentTimeline(
        comprehensiveContext.newsSentiment,
        dateRange.start,
        dateRange.end
      )
      
      normalizedSentiment.forEach(sentimentPoint => {
        const timestamp = sentimentPoint.timestamp
        if (!dataMap.has(timestamp)) {
          dataMap.set(timestamp, { timestamp, date: new Date(timestamp) })
        }
        const point = dataMap.get(timestamp)
        point.sentiment = sentimentPoint.sentiment
        point.sentimentArticleCount = sentimentPoint.articleCount
      })
    }

    // Add VIX data - PHASE 5 TASK 5.1: Handle economic indicators timeline
    if (comprehensiveContext.economic?.indicators?.VIXCLS) {
      const vix = comprehensiveContext.economic.indicators.VIXCLS
      
      // Check if VIX has timeline data
      if (vix.timeline && Array.isArray(vix.timeline)) {
        vix.timeline.forEach(vixPoint => {
          const timestamp = new Date(vixPoint.date || vixPoint.timestamp || Date.now()).getTime()
          if (!dataMap.has(timestamp)) {
            dataMap.set(timestamp, { timestamp, date: new Date(timestamp) })
          }
          const point = dataMap.get(timestamp)
          point.vix = parseFloat(vixPoint.value || 0)
        })
      } else {
        // Single VIX value
        const timestamp = new Date(vix.date || Date.now()).getTime()
        if (!dataMap.has(timestamp)) {
          dataMap.set(timestamp, { timestamp, date: new Date(timestamp) })
        }
        const point = dataMap.get(timestamp)
        point.vix = parseFloat(vix.value || 0)
      }
    }

    // Process data points
    const processedData = Array.from(dataMap.values()).map(point => ({
      ...point,
      date: point.date.toISOString().split('T')[0],
      time: point.date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }))

    // Sort by timestamp
    const sorted = processedData.sort((a, b) => a.timestamp - b.timestamp)
    
    // Optimize data points for mobile performance
    if (isMobile && sorted.length > 30) {
      const step = Math.ceil(sorted.length / 30)
      return sorted.filter((_, index) => index % step === 0)
    }
    
    return sorted
  }, [comprehensiveContext, detectedAssets, isMobile, selectedAsset, dateRange])

  // PHASE 4 TASK 4.2: Show empty state if no chart data
  if (chartData.length === 0) {
    return (
      <div className="bg-black/40 rounded-xl p-5 border border-slate-700/50">
        <EmptyState
          icon={BarChart3}
          title="No Chart Data Available"
          message={`No market data available for ${selectedAsset || detectedAssets?.instruments?.[0] || 'selected asset'} in the selected date range. Try adjusting the time period or refreshing the data.`}
        />
      </div>
    )
  }

  // Get user trades for markers
  const tradeMarkers = useMemo(() => {
    if (!analytics?.allTrades) return []
    
    return analytics.allTrades
      .filter(trade => {
        const tradeDate = new Date(trade.timestamp || trade.time)
        const startDate = new Date(dateRange.start)
        const endDate = new Date(dateRange.end)
        return tradeDate >= startDate && tradeDate <= endDate
      })
      .map(trade => ({
        timestamp: new Date(trade.timestamp || trade.time).getTime(),
        price: trade.price,
        isBuyer: trade.isBuyer !== undefined ? trade.isBuyer : (trade.side === 'buy'),
        symbol: trade.symbol,
        qty: trade.qty || trade.quantity
      }))
      .slice(0, 50) // Limit to 50 markers for performance
  }, [analytics, dateRange])

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
              {entry.name === 'Price' ? `$${parseFloat(entry.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` :
               entry.name === 'Sentiment' ? entry.value.toFixed(2) :
               entry.name === 'VIX' ? entry.value.toFixed(1) :
               entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center bg-black/40 rounded-xl border border-slate-700/50">
        <div className="text-slate-400">No chart data available for the selected period</div>
      </div>
    )
  }

  return (
    <div className="bg-black/40 rounded-xl p-5 border border-slate-700/50">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-2">Market Timeline</h3>
        <p className="text-xs text-slate-400">
          Price, sentiment, and volatility over time with your trades marked
        </p>
      </div>
      
      <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
            yAxisId="left"
            stroke="#9CA3AF"
            fontSize={12}
            label={{ value: 'Price ($)', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#9CA3AF"
            fontSize={12}
            label={{ value: 'Sentiment / VIX', angle: 90, position: 'insideRight', style: { fill: '#9CA3AF' } }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          {/* Price Line */}
          {chartData.some(d => d.price != null) && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="price"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              name="Price"
            />
          )}
          
          {/* Sentiment Line */}
          {chartData.some(d => d.sentiment != null) && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="sentiment"
              stroke="#A855F7"
              strokeWidth={2}
              dot={false}
              name="Sentiment"
            />
          )}
          
          {/* VIX Line */}
          {chartData.some(d => d.vix != null) && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="vix"
              stroke="#F97316"
              strokeWidth={2}
              dot={false}
              name="VIX"
            />
          )}
          
          {/* Trade Markers */}
          {tradeMarkers.map((trade, index) => {
            const dataPoint = chartData.find(d => 
              Math.abs(new Date(d.timestamp).getTime() - trade.timestamp) < 24 * 60 * 60 * 1000
            )
            if (!dataPoint) return null
            
            return (
              <ReferenceDot
                key={index}
                x={dataPoint.date}
                y={dataPoint.price || 0}
                r={6}
                fill={trade.isBuyer ? '#10B981' : '#EF4444'}
                stroke="#fff"
                strokeWidth={1}
              />
            )
          })}
        </ComposedChart>
      </ResponsiveContainer>
      
      {/* Legend for Trade Markers */}
      <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-400" />
          <span>Buy Trades</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <span>Sell Trades</span>
        </div>
      </div>
    </div>
  )
}

export default memo(TimelineChart)

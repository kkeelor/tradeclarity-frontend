// app/analyze/components/MarketContext/VolumeAnalysis.jsx
// Task 2.5: Volume Analysis Section

'use client'

import { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts'
import { TrendingUp, TrendingDown, Activity, BarChart3, Zap } from 'lucide-react'

export default function VolumeAnalysis({
  comprehensiveContext,
  analytics,
  dateRange,
  detectedAssets,
  selectedAsset = null
}) {
  const [selectedMetric, setSelectedMetric] = useState('daily') // 'daily', 'hourly', 'comparison'

  // Process volume data - PHASE 2 TASK 2.2: Check for real volume data, handle gracefully if missing
  const volumeData = useMemo(() => {
    if (!comprehensiveContext) return null

    // PHASE 3 TASK 3.1: Use selected asset instead of just first instrument
    const primaryInstrument = selectedAsset || detectedAssets?.instruments?.[0]
    if (!primaryInstrument) return null

    // PHASE 2 TASK 2.2: Check if volume data exists in API response
    const volumeContext = comprehensiveContext.volume
    const hasVolumeData = volumeContext && volumeContext.data && volumeContext.data[primaryInstrument]
    
    const now = new Date()
    const startDate = new Date(dateRange.start)
    const endDate = new Date(dateRange.end)
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    
    let timeline = []
    
    if (hasVolumeData) {
      // PHASE 2 TASK 2.2: Use real volume data from API
      const instrumentVolumeData = volumeContext.data[primaryInstrument]
      const volumeArray = Array.isArray(instrumentVolumeData) ? instrumentVolumeData : [instrumentVolumeData]
      
      timeline = volumeArray
        .filter(point => {
          const pointDate = new Date(point.timestamp || point.date || point.time)
          return pointDate >= startDate && pointDate <= endDate
        })
        .map(point => ({
          date: point.date || new Date(point.timestamp || point.time).toISOString().split('T')[0],
          timestamp: new Date(point.timestamp || point.time || point.date).getTime(),
          volume: parseFloat(point.volume || point.value || 0),
          topTierVolume: parseFloat(point.topTierVolume || point.topTier || point.volume * 0.7 || 0),
          directVolume: parseFloat(point.directVolume || point.direct || point.volume * 0.3 || 0),
          price: parseFloat(point.price || 0)
        }))
        .sort((a, b) => a.timestamp - b.timestamp)
    } else {
      // PHASE 2 TASK 2.2: Fallback - Show message that volume data is unavailable
      // Don't generate fake data - return null to show appropriate message in UI
      console.warn('⚠️ Volume data not available in API response for', primaryInstrument)
      return null
    }

    if (timeline.length === 0) {
      return null
    }

    // Calculate volume metrics
    const volumes = timeline.map(d => d.volume).filter(v => v > 0)
    if (volumes.length === 0) {
      return null
    }
    
    const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length
    const maxVolume = Math.max(...volumes)
    const minVolume = Math.min(...volumes)
    const currentVolume = volumes[volumes.length - 1] || avgVolume

    // Calculate averages for comparison
    const last7Days = volumes.slice(-7)
    const last30Days = volumes.slice(-30)
    const avg7d = last7Days.length > 0 ? last7Days.reduce((sum, v) => sum + v, 0) / last7Days.length : avgVolume
    const avg30d = last30Days.length > 0 ? last30Days.reduce((sum, v) => sum + v, 0) / last30Days.length : avgVolume

    // Detect volume spikes
    const spikes = timeline
      .map((point) => ({
        ...point,
        isSpike: point.volume > avgVolume * 1.5,
        spikeRatio: point.volume / avgVolume
      }))
      .filter(p => p.isSpike)

    return {
      timeline,
      metrics: {
        current: currentVolume,
        average: avgVolume,
        max: maxVolume,
        min: minVolume,
        avg7d,
        avg30d,
        vs7dAvg: avg7d > 0 ? ((currentVolume - avg7d) / avg7d) * 100 : 0,
        vs30dAvg: avg30d > 0 ? ((currentVolume - avg30d) / avg30d) * 100 : 0,
        vsPeriodAvg: avgVolume > 0 ? ((currentVolume - avgVolume) / avgVolume) * 100 : 0
      },
      spikes,
      breakdown: {
        topTier: timeline.reduce((sum, d) => sum + d.topTierVolume, 0) / timeline.length,
        direct: timeline.reduce((sum, d) => sum + d.directVolume, 0) / timeline.length
      },
      hasRealData: hasVolumeData
    }
  }, [comprehensiveContext, dateRange, detectedAssets])

  // Get user trades during volume spikes
  const tradesDuringSpikes = useMemo(() => {
    if (!analytics?.allTrades || !volumeData?.spikes) return []

    return volumeData.spikes.flatMap(spike => {
      const spikeDate = new Date(spike.timestamp)
      const spikeStart = new Date(spikeDate.getTime() - 6 * 60 * 60 * 1000) // 6 hours before
      const spikeEnd = new Date(spikeDate.getTime() + 6 * 60 * 60 * 1000) // 6 hours after

      return analytics.allTrades
        .filter(trade => {
          const tradeDate = new Date(trade.timestamp || trade.time)
          return tradeDate >= spikeStart && tradeDate <= spikeEnd
        })
        .map(trade => ({
          ...trade,
          spikeDate: spike.date,
          spikeVolume: spike.volume
        }))
    })
  }, [analytics, volumeData])

  // Custom tooltip
  const VolumeTooltip = ({ active, payload }) => {
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
            <span className="text-white font-semibold">
              {entry.name.includes('Volume')
                ? `${(parseFloat(entry.value || 0) / 1000000).toFixed(2)}M`
                : entry.name === 'Price'
                ? `$${parseFloat(entry.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }

  if (!volumeData) {
    return (
      <div className="bg-black/40 rounded-xl p-5 border border-slate-700/50">
        <div className="text-center py-8">
          <div className="text-slate-400 mb-2">Volume data not available</div>
          <div className="text-xs text-slate-500">
            Volume data is not included in the API response. This may require a separate endpoint or data source.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Volume Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-black/40 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-slate-400">Current Volume</span>
          </div>
          <div className="text-xl font-bold text-white">
            {(volumeData.metrics.current / 1000000).toFixed(2)}M
          </div>
        </div>

        <div className="bg-black/40 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-400">vs 7d Avg</span>
          </div>
          <div className={`text-xl font-bold flex items-center gap-1 ${
            volumeData.metrics.vs7dAvg >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {volumeData.metrics.vs7dAvg >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            {volumeData.metrics.vs7dAvg >= 0 ? '+' : ''}
            {volumeData.metrics.vs7dAvg.toFixed(1)}%
          </div>
        </div>

        <div className="bg-black/40 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-slate-400">vs 30d Avg</span>
          </div>
          <div className={`text-xl font-bold flex items-center gap-1 ${
            volumeData.metrics.vs30dAvg >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {volumeData.metrics.vs30dAvg >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            {volumeData.metrics.vs30dAvg >= 0 ? '+' : ''}
            {volumeData.metrics.vs30dAvg.toFixed(1)}%
          </div>
        </div>

        <div className="bg-black/40 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-400">Volume Spikes</span>
          </div>
          <div className="text-xl font-bold text-white">
            {volumeData.spikes.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Detected</div>
        </div>
      </div>

      {/* Volume Timeline Chart */}
      <div className="bg-black/40 rounded-xl p-5 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Volume Timeline</h3>
            <p className="text-xs text-slate-400">Trading volume over selected period</p>
          </div>
          <div className="flex items-center gap-2">
            {['daily', 'comparison'].map(metric => (
              <button
                key={metric}
                onClick={() => setSelectedMetric(metric)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  selectedMetric === metric
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-800/50 border-slate-600 text-slate-400 hover:border-slate-500'
                }`}
              >
                {metric === 'daily' ? 'Daily Volume' : 'With Price'}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            {selectedMetric === 'comparison' ? (
              <ComposedChart data={volumeData.timeline} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                  label={{ value: 'Volume', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#9CA3AF"
                  fontSize={12}
                  label={{ value: 'Price ($)', angle: 90, position: 'insideRight', style: { fill: '#9CA3AF' } }}
                />
                <Tooltip content={<VolumeTooltip />} />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="volume"
                  fill="#3B82F6"
                  name="Volume"
                  radius={[4, 4, 0, 0]}
                >
                  {volumeData.timeline.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.volume > volumeData.metrics.average * 1.5 ? '#EF4444' : '#3B82F6'}
                    />
                  ))}
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="price"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={false}
                  name="Price"
                />
              </ComposedChart>
            ) : (
              <BarChart data={volumeData.timeline} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                  label={{ value: 'Volume', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
                />
                <Tooltip content={<VolumeTooltip />} />
                <Legend />
                <Bar dataKey="volume" fill="#3B82F6" name="Volume" radius={[4, 4, 0, 0]}>
                  {volumeData.timeline.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.volume > volumeData.metrics.average * 1.5 ? '#EF4444' : '#3B82F6'}
                    />
                  ))}
                </Bar>
                <Bar dataKey="topTierVolume" fill="#10B981" name="Top Tier" radius={[4, 4, 0, 0]} />
                <Bar dataKey="directVolume" fill="#F59E0B" name="Direct" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Volume Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-black/40 rounded-xl p-5 border border-slate-700/50">
          <h4 className="text-md font-semibold text-white mb-4">Volume Breakdown</h4>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Top Tier Volume</span>
                <span className="text-sm font-semibold text-emerald-400">
                  {((volumeData.breakdown.topTier / (volumeData.breakdown.topTier + volumeData.breakdown.direct)) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all"
                  style={{
                    width: `${(volumeData.breakdown.topTier / (volumeData.breakdown.topTier + volumeData.breakdown.direct)) * 100}%`
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Direct Volume</span>
                <span className="text-sm font-semibold text-amber-400">
                  {((volumeData.breakdown.direct / (volumeData.breakdown.topTier + volumeData.breakdown.direct)) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all"
                  style={{
                    width: `${(volumeData.breakdown.direct / (volumeData.breakdown.topTier + volumeData.breakdown.direct)) * 100}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Volume Spikes & User Trades */}
        {volumeData.spikes.length > 0 && (
          <div className="bg-black/40 rounded-xl p-5 border border-slate-700/50">
            <h4 className="text-md font-semibold text-white mb-4">Volume Spikes</h4>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {volumeData.spikes.slice(0, 5).map((spike, idx) => {
                const tradesInSpike = tradesDuringSpikes.filter(t => t.spikeDate === spike.date)
                return (
                  <div key={idx} className="p-3 bg-slate-800/50 rounded-lg border border-red-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-400">{spike.date}</span>
                      <span className="text-xs font-semibold text-red-400">
                        {spike.spikeRatio.toFixed(1)}x average
                      </span>
                    </div>
                    <div className="text-sm text-white mb-1">
                      Volume: {(spike.volume / 1000000).toFixed(2)}M
                    </div>
                    {tradesInSpike.length > 0 && (
                      <div className="text-xs text-slate-400 mt-2">
                        {tradesInSpike.length} trade{tradesInSpike.length !== 1 ? 's' : ''} during spike
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

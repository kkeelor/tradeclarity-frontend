// app/analyze/components/MarketContext/VolumeAnalysisPreview.jsx
// PHASE 7 TASK 7.2: Compact Volume Analysis Chart Preview

'use client'

import { useMemo, memo } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts'
import { ChartDialog } from './ChartDialog'
import VolumeAnalysis from './VolumeAnalysis'

function VolumeAnalysisPreview({
  comprehensiveContext,
  analytics,
  dateRange,
  detectedAssets,
  selectedAsset = null
}) {
  // Create compact preview data
  const previewData = useMemo(() => {
    if (!comprehensiveContext?.volume?.data) return []

    const primaryInstrument = selectedAsset || detectedAssets?.instruments?.[0]
    if (!primaryInstrument) return []

    const volumeContext = comprehensiveContext.volume
    const instrumentVolumeData = volumeContext.data[primaryInstrument]
    if (!instrumentVolumeData) return []

    const volumeArray = Array.isArray(instrumentVolumeData) ? instrumentVolumeData : [instrumentVolumeData]
    const startDate = new Date(dateRange.start)
    const endDate = new Date(dateRange.end)

    const timeline = volumeArray
      .filter(point => {
        const pointDate = new Date(point.timestamp || point.date || point.time)
        return pointDate >= startDate && pointDate <= endDate
      })
      .map(point => ({
        date: point.date || new Date(point.timestamp || point.time).toISOString().split('T')[0],
        volume: parseFloat(point.volume || point.value || 0)
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))

    // Sample every Nth point for preview (reduce to ~10 points)
    const step = Math.max(1, Math.floor(timeline.length / 10))
    return timeline.filter((_, index) => index % step === 0)
  }, [comprehensiveContext, dateRange, detectedAssets, selectedAsset])

  const previewChart = previewData.length > 0 ? (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={previewData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <Bar dataKey="volume" fill="#10B981" radius={[4, 4, 0, 0]} />
        <XAxis dataKey="date" hide />
        <YAxis hide />
      </BarChart>
    </ResponsiveContainer>
  ) : (
    <div className="flex items-center justify-center h-full text-xs text-slate-500">
      No volume data
    </div>
  )

  const fullChart = (
    <VolumeAnalysis
      comprehensiveContext={comprehensiveContext}
      analytics={analytics}
      dateRange={dateRange}
      detectedAssets={detectedAssets}
      selectedAsset={selectedAsset}
    />
  )

  return (
    <ChartDialog
      title="Volume Analysis"
      description="Trading volume patterns, metrics, and volume spikes analysis"
      previewComponent={previewChart}
      fullChartComponent={fullChart}
      previewHeight={120}
    />
  )
}

export default memo(VolumeAnalysisPreview)

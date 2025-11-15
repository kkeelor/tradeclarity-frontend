// app/analyze/components/MarketContext/PriceMovementPreview.jsx
// PHASE 7 TASK 7.2: Compact Price Movement Chart Preview

'use client'

import { useMemo, memo } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis } from 'recharts'
import { normalizePriceData, extractHistoricalPriceTimeline } from '../../utils/marketContextDataParser'
import { ChartDialog } from './ChartDialog'
import PriceMovement from './PriceMovement'

function PriceMovementPreview({
  comprehensiveContext,
  analytics,
  dateRange,
  detectedAssets,
  realTimePrices,
  selectedAsset = null
}) {
  // Create compact preview data
  const previewData = useMemo(() => {
    if (!comprehensiveContext?.price || !selectedAsset && !detectedAssets?.instruments?.[0]) return []

    const primaryInstrument = selectedAsset || detectedAssets.instruments[0]
    
    const historicalPrices = extractHistoricalPriceTimeline(
      comprehensiveContext.price,
      primaryInstrument,
      dateRange.start,
      dateRange.end
    )
    
    const priceTimeline = historicalPrices.length > 0 ? historicalPrices : normalizePriceData(comprehensiveContext.price, primaryInstrument)
    
    // Sample every Nth point for preview (reduce to ~15 points)
    const step = Math.max(1, Math.floor(priceTimeline.length / 15))
    return priceTimeline
      .filter((_, index) => index % step === 0)
      .map(point => ({
        timestamp: point.timestamp,
        date: point.date || new Date(point.timestamp).toISOString().split('T')[0],
        price: point.value
      }))
      .sort((a, b) => a.timestamp - b.timestamp)
  }, [comprehensiveContext, detectedAssets, selectedAsset, dateRange])

  const previewChart = previewData.length > 0 ? (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={previewData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <Area
          type="monotone"
          dataKey="price"
          stroke="#3B82F6"
          fill="#3B82F6"
          fillOpacity={0.2}
          strokeWidth={2}
        />
        <XAxis dataKey="date" hide />
        <YAxis hide />
      </AreaChart>
    </ResponsiveContainer>
  ) : (
    <div className="flex items-center justify-center h-full text-xs text-slate-500">
      No data
    </div>
  )

  const fullChart = (
    <PriceMovement
      comprehensiveContext={comprehensiveContext}
      analytics={analytics}
      dateRange={dateRange}
      detectedAssets={detectedAssets}
      realTimePrices={realTimePrices}
      selectedAsset={selectedAsset}
    />
  )

  return (
    <ChartDialog
      title="Price Movement Analysis"
      description="Detailed price analysis with multi-timeframe views and moving averages"
      previewComponent={previewChart}
      fullChartComponent={fullChart}
      previewHeight={150}
    />
  )
}

export default memo(PriceMovementPreview)

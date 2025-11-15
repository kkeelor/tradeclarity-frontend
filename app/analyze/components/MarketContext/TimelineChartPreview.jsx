// app/analyze/components/MarketContext/TimelineChartPreview.jsx
// PHASE 7 TASK 7.2: Compact Timeline Chart Preview

'use client'

import { useMemo, memo } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis } from 'recharts'
import { normalizePriceData, extractHistoricalPriceTimeline } from '../../utils/marketContextDataParser'
import { ChartDialog } from './ChartDialog'
import TimelineChart from './TimelineChart'

function TimelineChartPreview({
  comprehensiveContext,
  analytics,
  dateRange,
  detectedAssets,
  selectedAsset = null
}) {
  // Create compact preview data (simplified, fewer data points)
  const previewData = useMemo(() => {
    if (!comprehensiveContext) return []

    const dataMap = new Map()
    const primaryInstrument = selectedAsset || detectedAssets?.instruments?.[0]
    
    // Add price data - simplified for preview
    if (comprehensiveContext.price && primaryInstrument) {
      const historicalPrices = extractHistoricalPriceTimeline(
        comprehensiveContext.price,
        primaryInstrument,
        dateRange.start,
        dateRange.end
      )
      
      const priceTimeline = historicalPrices.length > 0 ? historicalPrices : normalizePriceData(comprehensiveContext.price, primaryInstrument)
      
      // Sample every Nth point for preview (reduce to ~20 points)
      const step = Math.max(1, Math.floor(priceTimeline.length / 20))
      priceTimeline.forEach((point, index) => {
        if (index % step === 0) {
          const timestamp = point.timestamp
          if (!dataMap.has(timestamp)) {
            dataMap.set(timestamp, { timestamp, date: new Date(timestamp).toISOString().split('T')[0] })
          }
          dataMap.get(timestamp).price = point.value
        }
      })
    }

    return Array.from(dataMap.values())
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(point => ({
        ...point,
        date: point.date
      }))
  }, [comprehensiveContext, detectedAssets, selectedAsset, dateRange])

  const previewChart = (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={previewData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <Line
          type="monotone"
          dataKey="price"
          stroke="#3B82F6"
          strokeWidth={2}
          dot={false}
        />
        <XAxis dataKey="date" hide />
        <YAxis hide />
      </LineChart>
    </ResponsiveContainer>
  )

  const fullChart = (
    <TimelineChart
      comprehensiveContext={comprehensiveContext}
      analytics={analytics}
      dateRange={dateRange}
      detectedAssets={detectedAssets}
      selectedAsset={selectedAsset}
    />
  )

  return (
    <ChartDialog
      title="Market Timeline"
      description="Price, sentiment, and volatility over time with your trades marked"
      previewComponent={previewChart}
      fullChartComponent={fullChart}
      previewHeight={150}
    />
  )
}

export default memo(TimelineChartPreview)

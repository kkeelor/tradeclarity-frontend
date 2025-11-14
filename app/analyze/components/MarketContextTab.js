// app/analyze/components/MarketContextTab.js
// Market Context tab showing FRED, GDELT, and Alpha Vantage data

'use client'

import { useState, useEffect } from 'react'
import { Activity, DollarSign, BarChart3, TrendingUp, TrendingDown, Globe, Newspaper, Loader2, AlertCircle, Calendar, Sparkles, Target, Zap, TrendingUp as TrendingUpIcon } from 'lucide-react'
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, ComposedChart, ReferenceLine, ReferenceDot, Cell } from 'recharts'
import { 
  calculateBenchmarkPerformance, 
  extractTradingTimeline, 
  calculateUserPerformance, 
  comparePerformance,
  findMarketCorrelations 
} from '../utils/performanceComparisons'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

export default function MarketContextTab({ analytics }) {
  const [fredData, setFredData] = useState(null)
  const [gdeltData, setGdeltData] = useState(null)
  const [newsData, setNewsData] = useState(null)
  const [loading, setLoading] = useState({ fred: true, gdelt: true, news: true, benchmarks: false })
  const [error, setError] = useState({ fred: null, gdelt: null, news: null, benchmarks: null })
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [showDatePicker, setShowDatePicker] = useState(false)
  
  // Performance comparison state
  const [benchmarks, setBenchmarks] = useState(null)
  const [userPerformance, setUserPerformance] = useState(null)
  const [comparisons, setComparisons] = useState([])
  const [tradingTimeline, setTradingTimeline] = useState(null)
  const [correlations, setCorrelations] = useState([])

  // Get user's trade date range if available
  useEffect(() => {
    if (analytics?.metadata?.oldestTrade && analytics?.metadata?.newestTrade) {
      const oldest = new Date(analytics.metadata.oldestTrade).toISOString().split('T')[0]
      const newest = new Date(analytics.metadata.newestTrade).toISOString().split('T')[0]
      setDateRange({ start: oldest, end: newest })
    }
  }, [analytics])

  // Fetch FRED data
  useEffect(() => {
    fetchFREDData()
  }, [dateRange])

  // Fetch GDELT data
  useEffect(() => {
    fetchGDELTData()
  }, [dateRange])

  // Fetch news data
  useEffect(() => {
    fetchNewsData()
  }, [])

  // Extract trading timeline and calculate performance
  useEffect(() => {
    if (analytics && dateRange.start && dateRange.end) {
      const timeline = extractTradingTimeline(analytics)
      setTradingTimeline(timeline)
      
      // Estimate initial investment (use total invested or default)
      const initialInvestment = analytics.totalInvested || 10000
      const performance = calculateUserPerformance(analytics, initialInvestment)
      setUserPerformance(performance)
    }
  }, [analytics, dateRange])

  // Fetch benchmark performance
  useEffect(() => {
    if (dateRange.start && dateRange.end && analytics?.metadata?.oldestTrade) {
      fetchBenchmarks()
    }
  }, [dateRange, analytics])

  // Calculate comparisons when both user and benchmark data are available
  useEffect(() => {
    if (userPerformance && benchmarks) {
      const comps = comparePerformance(userPerformance, benchmarks)
      setComparisons(comps)
    }
  }, [userPerformance, benchmarks])

  // Find correlations when market data and trades are available
  useEffect(() => {
    if (tradingTimeline && fredData) {
      const marketData = { fredData, gdeltData, newsData }
      const corrs = findMarketCorrelations(tradingTimeline.trades, marketData)
      setCorrelations(corrs)
    }
  }, [tradingTimeline, fredData, gdeltData, newsData])

  const fetchBenchmarks = async () => {
    try {
      setLoading(prev => ({ ...prev, benchmarks: true }))
      const initialInvestment = analytics?.totalInvested || 10000
      const benchmarkData = await calculateBenchmarkPerformance(
        dateRange.start,
        dateRange.end,
        initialInvestment
      )
      if (benchmarkData) {
        setBenchmarks(benchmarkData)
      }
    } catch (err) {
      setError(prev => ({ ...prev, benchmarks: err.message }))
    } finally {
      setLoading(prev => ({ ...prev, benchmarks: false }))
    }
  }

  // Helper to normalize date string (handles various formats: ISO, YYYYMMDDHHMMSS, etc.)
  const normalizeDateString = (dateStr) => {
    if (!dateStr) return null
    try {
      // Handle GDELT format: "20241114T000000Z" or "20241114"
      if (typeof dateStr === 'string' && dateStr.length >= 8) {
        // Extract YYYYMMDD part
        const datePart = dateStr.substring(0, 8)
        if (/^\d{8}$/.test(datePart)) {
          const year = datePart.substring(0, 4)
          const month = datePart.substring(4, 6)
          const day = datePart.substring(6, 8)
          return `${year}-${month}-${day}`
        }
      }
      // Handle ISO format or standard date strings
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]
      }
    } catch (e) {
      // Invalid date format
    }
    return null
  }

  // Helper function to add trade markers to chart data
  const addTradeMarkers = (chartData, trades) => {
    if (!trades || trades.length === 0) return chartData
    
    return chartData.map(dataPoint => {
      const dataPointDate = normalizeDateString(dataPoint.date)
      if (!dataPointDate) return dataPoint
      
      const dayTrades = trades.filter(trade => {
        const tradeDate = normalizeDateString(trade.timestamp)
        return tradeDate === dataPointDate
      })
      
      if (dayTrades.length > 0) {
        const buys = dayTrades.filter(t => t.type === 'buy' || t.type === 'win').length
        const sells = dayTrades.filter(t => t.type === 'sell' || t.type === 'loss').length
        const totalPnL = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
        const buyTrades = dayTrades.filter(t => t.type === 'buy' || t.type === 'win')
        const sellTrades = dayTrades.filter(t => t.type === 'sell' || t.type === 'loss')
        
        return {
          ...dataPoint,
          trades: dayTrades.length,
          buys,
          sells,
          tradePnL: totalPnL,
          hasTrades: true,
          buyTrades: buyTrades.map(t => ({
            symbol: t.symbol,
            type: t.type,
            pnl: t.pnl,
            price: t.price,
            quantity: t.quantity,
            value: t.value,
            timestamp: t.timestamp
          })),
          sellTrades: sellTrades.map(t => ({
            symbol: t.symbol,
            type: t.type,
            pnl: t.pnl,
            price: t.price,
            quantity: t.quantity,
            value: t.value,
            timestamp: t.timestamp
          }))
        }
      }
      
      return dataPoint
    })
  }

  // Custom tooltip component for trade details
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null
    
    const data = payload[0].payload
    const marketValue = payload.find(p => p.dataKey === 'value')?.value
    
    return (
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl min-w-[200px]">
        {marketValue !== undefined && (
          <div className="text-sm font-semibold text-white mb-2">
            {payload[0].name}: {typeof marketValue === 'number' ? marketValue.toFixed(2) : marketValue}
          </div>
        )}
        {data.hasTrades && (
          <div className="space-y-2 border-t border-slate-600 pt-2 mt-2">
            <div className="text-xs font-semibold text-slate-300">
              Your Trades ({data.trades})
            </div>
            {data.buys > 0 && (
              <div className="text-xs">
                <span className="text-emerald-400 font-medium">Buy: {data.buys}</span>
                {data.buyTrades && data.buyTrades.length > 0 && (
                  <div className="ml-2 mt-1 space-y-1">
                    {data.buyTrades.slice(0, 3).map((trade, idx) => (
                      <div key={idx} className="text-slate-400">
                        • {trade.symbol} {trade.quantity ? `(${trade.quantity})` : ''} 
                        {trade.price ? ` @ $${trade.price.toFixed(2)}` : ''}
                        {trade.pnl ? ` P&L: $${trade.pnl.toFixed(2)}` : ''}
                      </div>
                    ))}
                    {data.buyTrades.length > 3 && (
                      <div className="text-slate-500">+{data.buyTrades.length - 3} more</div>
                    )}
                  </div>
                )}
              </div>
            )}
            {data.sells > 0 && (
              <div className="text-xs">
                <span className="text-red-400 font-medium">Sell: {data.sells}</span>
                {data.sellTrades && data.sellTrades.length > 0 && (
                  <div className="ml-2 mt-1 space-y-1">
                    {data.sellTrades.slice(0, 3).map((trade, idx) => (
                      <div key={idx} className="text-slate-400">
                        • {trade.symbol} {trade.quantity ? `(${trade.quantity})` : ''}
                        {trade.price ? ` @ $${trade.price.toFixed(2)}` : ''}
                        {trade.pnl ? ` P&L: $${trade.pnl.toFixed(2)}` : ''}
                      </div>
                    ))}
                    {data.sellTrades.length > 3 && (
                      <div className="text-slate-500">+{data.sellTrades.length - 3} more</div>
                    )}
                  </div>
                )}
              </div>
            )}
            {data.tradePnL !== 0 && (
              <div className={`text-xs font-medium ${data.tradePnL > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                Day P&L: {data.tradePnL > 0 ? '+' : ''}${data.tradePnL.toFixed(2)}
              </div>
            )}
          </div>
        )}
        <div className="text-xs text-slate-500 mt-2">{data.date}</div>
      </div>
    )
  }

  // Helper to get trade marker props
  const getTradeMarkerProps = (trade) => {
    const isBuy = trade.type === 'buy' || trade.type === 'win' || (trade.pnl && trade.pnl > 0)
    const color = isBuy ? '#10b981' : '#ef4444'
    const label = isBuy ? 'B' : 'S'
    
    const tooltipText = `${trade.symbol} - ${isBuy ? 'Buy' : 'Sell'}${
      trade.price ? ` @ $${trade.price.toFixed(2)}` : ''
    }${trade.quantity ? ` (${trade.quantity})` : ''}${
      trade.pnl ? ` | P&L: $${trade.pnl.toFixed(2)}` : ''
    }${trade.timestamp ? ` | ${new Date(trade.timestamp).toLocaleString()}` : ''}`
    
    return { color, label, tooltipText, isBuy }
  }


  // Helper to match trade dates with chart data dates (handles date format differences)
  const findMatchingDataPoint = (chartData, tradeTimestamp) => {
    const tradeDateStr = normalizeDateString(tradeTimestamp)
    if (!tradeDateStr) return null
    
    // Try exact match first
    let match = chartData.find(obs => {
      const obsDateStr = normalizeDateString(obs.date)
      return obsDateStr === tradeDateStr
    })
    
    // If no exact match, try finding closest date within 1 day
    if (!match) {
      const tradeDate = new Date(tradeDateStr)
      if (isNaN(tradeDate.getTime())) return null
      
      const oneDayMs = 24 * 60 * 60 * 1000
      match = chartData.find(obs => {
        const obsDateStr = normalizeDateString(obs.date)
        if (!obsDateStr) return false
        const obsDate = new Date(obsDateStr)
        if (isNaN(obsDate.getTime())) return false
        const diff = Math.abs(obsDate.getTime() - tradeDate.getTime())
        return diff < oneDayMs
      })
    }
    
    return match
  }

  const fetchFREDData = async () => {
    try {
      setLoading(prev => ({ ...prev, fred: true }))
      const response = await fetch(`${BACKEND_URL}/api/context/fred/indicators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: dateRange.start,
          endDate: dateRange.end,
          seriesIds: ['VIXCLS', 'DFF', 'DGS10', 'DGS2', 'SP500']
        })
      })
      const data = await response.json()
      if (data.success) {
        setFredData(data.indicators)
      } else {
        setError(prev => ({ ...prev, fred: data.error }))
      }
    } catch (err) {
      setError(prev => ({ ...prev, fred: err.message }))
    } finally {
      setLoading(prev => ({ ...prev, fred: false }))
    }
  }

  const fetchGDELTData = async () => {
    try {
      setLoading(prev => ({ ...prev, gdelt: true }))
      // Use crypto-related queries
      const queries = ['bitcoin', '(cryptocurrency OR "crypto market")']
      
      // Use startDate/endDate instead of timespan to support 3+ years of historical data
      // Dates are sent in ISO format (YYYY-MM-DD), backend will convert to GDELT format if needed
      const [toneResponse, volumeResponse] = await Promise.all([
        fetch(`${BACKEND_URL}/api/context/gdelt/tone?query=${encodeURIComponent(queries[0])}&startDate=${dateRange.start}&endDate=${dateRange.end}`),
        fetch(`${BACKEND_URL}/api/context/gdelt/volume?query=${encodeURIComponent(queries[0])}&startDate=${dateRange.start}&endDate=${dateRange.end}`)
      ])

      const toneData = await toneResponse.json()
      const volumeData = await volumeResponse.json()

      if (toneData.success && volumeData.success) {
        setGdeltData({
          tone: toneData.timeline,
          volume: volumeData.timeline
        })
      } else {
        setError(prev => ({ ...prev, gdelt: toneData.error || volumeData.error }))
      }
    } catch (err) {
      setError(prev => ({ ...prev, gdelt: err.message }))
    } finally {
      setLoading(prev => ({ ...prev, gdelt: false }))
    }
  }

  const fetchNewsData = async () => {
    try {
      setLoading(prev => ({ ...prev, news: true }))
      const response = await fetch(`${BACKEND_URL}/api/context/news/crypto?tickers=BTC,ETH&limit=20`)
      const data = await response.json()
      if (data.success) {
        setNewsData(data.articles)
      } else {
        setError(prev => ({ ...prev, news: data.error }))
      }
    } catch (err) {
      setError(prev => ({ ...prev, news: err.message }))
    } finally {
      setLoading(prev => ({ ...prev, news: false }))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-semibold text-white">Market Context</h2>
          </div>
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-300 hover:text-white border border-slate-600 rounded-lg hover:border-slate-500 transition-colors"
          >
            <Calendar className="w-4 h-4" />
            <span>{new Date(dateRange.start).toLocaleDateString()} - {new Date(dateRange.end).toLocaleDateString()}</span>
          </button>
        </div>
        {showDatePicker && (
          <div className="flex items-center gap-3 p-3 bg-black/40 rounded-lg border border-slate-700/50">
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1 block">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                max={dateRange.end}
                min="1979-01-01"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1 block">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                min={dateRange.start}
                max={new Date().toISOString().split('T')[0]}
              />
              <div className="text-xs text-slate-500 mt-1">
                Historical data available: GDELT (1979+), FRED (varies by indicator, typically 1950s+)
              </div>
            </div>
            <button
              onClick={() => {
                if (analytics?.metadata?.oldestTrade && analytics?.metadata?.newestTrade) {
                  const oldest = new Date(analytics.metadata.oldestTrade).toISOString().split('T')[0]
                  const newest = new Date(analytics.metadata.newestTrade).toISOString().split('T')[0]
                  setDateRange({ start: oldest, end: newest })
                }
              }}
              className="px-3 py-2 text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 rounded-lg hover:border-emerald-500/50 transition-colors"
            >
              Reset to Trade Range
            </button>
          </div>
        )}
        <p className="text-sm text-slate-400">
          Economic indicators, news sentiment, and market events that may have influenced your trading performance
        </p>
      </div>

      {/* Performance Comparison Section */}
      {userPerformance && comparisons.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-blue-300">Performance vs Benchmarks</h3>
          </div>
          
          <div className="mb-4 p-4 bg-black/40 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Your Performance</span>
              <span className={`text-lg font-bold ${userPerformance.returnPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {userPerformance.returnPercent >= 0 ? '+' : ''}{userPerformance.returnPercent.toFixed(2)}%
              </span>
            </div>
            <div className="text-xs text-slate-500">
              {userPerformance.totalTrades} trades • Final Value: ${userPerformance.finalValue.toFixed(2)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {comparisons.map((comp, idx) => (
              <div key={idx} className="bg-black/40 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400">{comp.assetName}</span>
                  {comp.outperformed ? (
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  )}
                </div>
                <div className="text-lg font-bold text-white mb-1">
                  {comp.benchmarkReturn >= 0 ? '+' : ''}{comp.benchmarkReturn.toFixed(2)}%
                </div>
                <div className={`text-xs ${comp.outperformed ? 'text-emerald-400' : 'text-red-400'}`}>
                  {comp.difference >= 0 ? '+' : ''}{comp.difference.toFixed(2)}% vs you
                </div>
                <div className="text-[10px] text-slate-500 mt-1">{comp.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Correlation Insights */}
      {correlations.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-amber-300">Market Correlations</h3>
          </div>
          
          <div className="space-y-2">
            {correlations.slice(0, 5).map((insight, idx) => (
              <div key={idx} className="bg-black/40 rounded-lg p-3 border border-slate-700/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-white mb-1">{insight.title}</h4>
                    <p className="text-xs text-slate-400">{insight.message}</p>
                  </div>
                  <span className="text-xs text-slate-500 ml-2">{insight.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FRED Economic Indicators */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg font-semibold text-emerald-300">Economic Indicators</h3>
        </div>

        {loading.fred ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            <span className="text-sm text-slate-400 ml-2">Loading economic data...</span>
          </div>
        ) : error.fred ? (
          <div className="flex items-center gap-2 text-red-400 py-4">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Failed to load: {error.fred}</span>
          </div>
        ) : fredData ? (
          <div className="space-y-4">
            {/* Key Indicators Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {['VIXCLS', 'DFF', 'DGS10', 'DGS2', 'SP500'].map(seriesId => {
                const series = fredData[seriesId]
                if (!series || !series.observations || series.observations.length === 0) return null

                const latest = series.observations[0]
                const oldest = series.observations[series.observations.length - 1]
                const change = series.changePercent ? parseFloat(series.changePercent) : null

                return (
                  <div key={seriesId} className="bg-black/40 rounded-xl p-4 border border-slate-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-400">{series.name}</span>
                      {change !== null && (
                        <div className={`flex items-center gap-1 ${change > 0 ? 'text-emerald-400' : change < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                          {change > 0 ? <TrendingUp className="w-3 h-3" /> : change < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                          <span className="text-xs font-medium">{change > 0 ? '+' : ''}{change}%</span>
                        </div>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {latest.value.toFixed(seriesId === 'VIXCLS' ? 1 : seriesId === 'SP500' ? 0 : 2)}
                      {seriesId === 'DFF' || seriesId === 'DGS10' || seriesId === 'DGS2' ? '%' : ''}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{latest.date}</div>
                  </div>
                )
              })}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* VIX Chart */}
              {fredData.VIXCLS?.observations && (
                <div className="bg-black/40 rounded-xl p-4 border border-slate-700/50">
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">
                    VIX Volatility Index
                    {tradingTimeline?.trades && tradingTimeline.trades.length > 0 && (
                      <span className="text-xs text-slate-500 ml-2">• Your trades overlaid</span>
                    )}
                  </h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={addTradeMarkers(fredData.VIXCLS.observations.slice().reverse(), tradingTimeline?.trades || [])}>
                      <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                      <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip />} />
                      {tradingTimeline?.trades && (() => {
                        const chartData = addTradeMarkers(fredData.VIXCLS.observations.slice().reverse(), tradingTimeline.trades)
                        return tradingTimeline.trades.map((trade, idx) => {
                          const dataPoint = findMatchingDataPoint(chartData, trade.timestamp)
                          if (dataPoint) {
                            const markerProps = getTradeMarkerProps(trade)
                            return (
                              <ReferenceDot
                                key={`vix-${idx}-${trade.timestamp}`}
                                x={dataPoint.date}
                                y={dataPoint.value}
                                r={8}
                                fill={markerProps.color}
                                stroke="#fff"
                                strokeWidth={2}
                                shape={(props) => {
                                  const { cx, cy } = props
                                  return (
                                    <g>
                                      <circle cx={cx} cy={cy} r={8} fill={markerProps.color} stroke="#fff" strokeWidth={2} />
                                      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="10" fontWeight="bold">
                                        {markerProps.label}
                                      </text>
                                      <title>{markerProps.tooltipText}</title>
                                    </g>
                                  )
                                }}
                              />
                            )
                          }
                          return null
                        })
                      })()}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Fed Rate Chart */}
              {fredData.DFF?.observations && (
                <div className="bg-black/40 rounded-xl p-4 border border-slate-700/50">
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">Federal Funds Rate</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={fredData.DFF.observations.slice().reverse()}>
                      <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
                      <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Treasury Yields Chart */}
              {fredData.DGS10?.observations && fredData.DGS2?.observations && (
                <div className="bg-black/40 rounded-xl p-4 border border-slate-700/50">
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">Treasury Yields (10Y vs 2Y)</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart data={fredData.DGS10.observations.slice().reverse().map((item, idx) => ({
                      ...item,
                      dgs2: fredData.DGS2.observations[fredData.DGS2.observations.length - 1 - idx]?.value
                    })).filter(d => d.dgs2 !== undefined)}>
                      <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} name="10Y" />
                      <Line type="monotone" dataKey="dgs2" stroke="#ec4899" strokeWidth={2} name="2Y" />
                      <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* S&P 500 Chart */}
              {fredData.SP500?.observations && (
                <div className="bg-black/40 rounded-xl p-4 border border-slate-700/50">
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">
                    S&P 500 Index
                    {tradingTimeline?.trades && tradingTimeline.trades.length > 0 && (
                      <span className="text-xs text-slate-500 ml-2">• Your trades overlaid</span>
                    )}
                  </h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={addTradeMarkers(fredData.SP500.observations.slice().reverse(), tradingTimeline?.trades || [])}>
                      <Area type="monotone" dataKey="value" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                      <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip />} />
                      {tradingTimeline?.trades && (() => {
                        const chartData = addTradeMarkers(fredData.SP500.observations.slice().reverse(), tradingTimeline.trades)
                        return tradingTimeline.trades.map((trade, idx) => {
                          const dataPoint = findMatchingDataPoint(chartData, trade.timestamp)
                          if (dataPoint) {
                            const markerProps = getTradeMarkerProps(trade)
                            return (
                              <ReferenceDot
                                key={`sp500-${idx}-${trade.timestamp}`}
                                x={dataPoint.date}
                                y={dataPoint.value}
                                r={8}
                                fill={markerProps.color}
                                stroke="#fff"
                                strokeWidth={2}
                                shape={(props) => {
                                  const { cx, cy } = props
                                  return (
                                    <g>
                                      <circle cx={cx} cy={cy} r={8} fill={markerProps.color} stroke="#fff" strokeWidth={2} />
                                      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="10" fontWeight="bold">
                                        {markerProps.label}
                                      </text>
                                      <title>{markerProps.tooltipText}</title>
                                    </g>
                                  )
                                }}
                              />
                            )
                          }
                          return null
                        })
                      })()}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* GDELT News Sentiment */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-semibold text-cyan-300">News Sentiment Timeline</h3>
        </div>

        {loading.gdelt ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
            <span className="text-sm text-slate-400 ml-2">Loading sentiment data...</span>
          </div>
        ) : error.gdelt ? (
          <div className="flex items-center gap-2 text-red-400 py-4">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Failed to load: {error.gdelt}</span>
          </div>
        ) : gdeltData?.tone ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-black/40 rounded-xl p-4 border border-slate-700/50">
                <h4 className="text-sm font-semibold text-slate-300 mb-3">
                  Bitcoin News Tone (-10 to +10)
                  {tradingTimeline?.trades && tradingTimeline.trades.length > 0 && (
                    <span className="text-xs text-slate-500 ml-2">• Your trades overlaid</span>
                  )}
                </h4>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={addTradeMarkers(gdeltData.tone.slice(0, 100), tradingTimeline?.trades || [])}>
                    <Line type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2} />
                    <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                      {tradingTimeline?.trades && (() => {
                        const chartData = addTradeMarkers(gdeltData.tone.slice(0, 100), tradingTimeline.trades)
                        return tradingTimeline.trades.map((trade, idx) => {
                          const dataPoint = findMatchingDataPoint(chartData, trade.timestamp)
                          if (dataPoint) {
                            const markerProps = getTradeMarkerProps(trade)
                            return (
                              <ReferenceDot
                                key={`gdelt-tone-${idx}-${trade.timestamp}`}
                                x={dataPoint.date}
                                y={dataPoint.value}
                                r={8}
                                fill={markerProps.color}
                                stroke="#fff"
                                strokeWidth={2}
                                shape={(props) => {
                                  const { cx, cy } = props
                                  return (
                                    <g>
                                      <circle cx={cx} cy={cy} r={8} fill={markerProps.color} stroke="#fff" strokeWidth={2} />
                                      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="10" fontWeight="bold">
                                        {markerProps.label}
                                      </text>
                                      <title>{markerProps.tooltipText}</title>
                                    </g>
                                  )
                                }}
                              />
                            )
                          }
                          return null
                        })
                      })()}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              {gdeltData.volume && (
                <div className="bg-black/40 rounded-xl p-4 border border-slate-700/50">
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">
                    Bitcoin News Volume
                    {tradingTimeline?.trades && tradingTimeline.trades.length > 0 && (
                      <span className="text-xs text-slate-500 ml-2">• Your trades overlaid</span>
                    )}
                  </h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={addTradeMarkers(gdeltData.volume.slice(0, 100), tradingTimeline?.trades || [])}>
                      <Bar dataKey="value" fill="#06b6d4" fillOpacity={0.6} />
                      <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip />} />
                      {tradingTimeline?.trades && (() => {
                        const chartData = addTradeMarkers(gdeltData.volume.slice(0, 100), tradingTimeline.trades)
                        return tradingTimeline.trades.map((trade, idx) => {
                          const dataPoint = findMatchingDataPoint(chartData, trade.timestamp)
                          if (dataPoint) {
                            const markerProps = getTradeMarkerProps(trade)
                            return (
                              <ReferenceDot
                                key={`gdelt-volume-${idx}-${trade.timestamp}`}
                                x={dataPoint.date}
                                y={dataPoint.value}
                                r={8}
                                fill={markerProps.color}
                                stroke="#fff"
                                strokeWidth={2}
                                shape={(props) => {
                                  const { cx, cy } = props
                                  return (
                                    <g>
                                      <circle cx={cx} cy={cy} r={8} fill={markerProps.color} stroke="#fff" strokeWidth={2} />
                                      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="10" fontWeight="bold">
                                        {markerProps.label}
                                      </text>
                                      <title>{markerProps.tooltipText}</title>
                                    </g>
                                  )
                                }}
                              />
                            )
                          }
                          return null
                        })
                      })()}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Alpha Vantage Crypto News */}
      <div className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Newspaper className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-purple-300">Crypto News Sentiment</h3>
        </div>

        {loading.news ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
            <span className="text-sm text-slate-400 ml-2">Loading news...</span>
          </div>
        ) : error.news ? (
          <div className="flex items-center gap-2 text-red-400 py-4">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Failed to load: {error.news}</span>
            {error.news.includes('rate limit') && (
              <span className="text-xs text-slate-500 ml-2">(Alpha Vantage: 25 calls/day limit)</span>
            )}
          </div>
        ) : newsData && newsData.length > 0 ? (
          <div className="space-y-3">
            {newsData.slice(0, 5).map((article, idx) => (
              <div key={idx} className="bg-black/40 rounded-lg p-3 border border-slate-700/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white mb-1 line-clamp-2">{article.title}</h4>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>{article.source}</span>
                      <span className="flex items-center gap-1">
                        <span className={`px-2 py-0.5 rounded ${
                          article.sentiment.label === 'Bullish' ? 'bg-emerald-500/20 text-emerald-300' :
                          article.sentiment.label === 'Somewhat-Bullish' ? 'bg-emerald-500/10 text-emerald-400' :
                          article.sentiment.label === 'Bearish' ? 'bg-red-500/20 text-red-300' :
                          article.sentiment.label === 'Somewhat-Bearish' ? 'bg-red-500/10 text-red-400' :
                          'bg-slate-500/20 text-slate-400'
                        }`}>
                          {article.sentiment.label}
                        </span>
                        <span className="text-slate-500">({article.sentiment.score > 0 ? '+' : ''}{article.sentiment.score.toFixed(2)})</span>
                      </span>
                    </div>
                  </div>
                  {article.url && (
                    <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">
                      <Newspaper className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

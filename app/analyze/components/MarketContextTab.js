// app/analyze/components/MarketContextTab.js
// Market Context tab showing FRED, GDELT, and Alpha Vantage data

'use client'

import { useState, useEffect } from 'react'
import { Activity, DollarSign, BarChart3, TrendingUp, TrendingDown, Globe, Newspaper, Loader2, AlertCircle, Calendar, Sparkles } from 'lucide-react'
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

export default function MarketContextTab({ analytics }) {
  const [fredData, setFredData] = useState(null)
  const [gdeltData, setGdeltData] = useState(null)
  const [newsData, setNewsData] = useState(null)
  const [loading, setLoading] = useState({ fred: true, gdelt: true, news: true })
  const [error, setError] = useState({ fred: null, gdelt: null, news: null })
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

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
      
      const [toneResponse, volumeResponse] = await Promise.all([
        fetch(`${BACKEND_URL}/api/context/gdelt/tone?query=${encodeURIComponent(queries[0])}&timespan=30days`),
        fetch(`${BACKEND_URL}/api/context/gdelt/volume?query=${encodeURIComponent(queries[0])}&timespan=30days`)
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
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-emerald-400" />
          <h2 className="text-xl font-semibold text-white">Market Context</h2>
        </div>
        <p className="text-sm text-slate-400">
          Economic indicators, news sentiment, and market events that may have influenced your trading performance
        </p>
      </div>

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['VIXCLS', 'DFF', 'DGS10'].map(seriesId => {
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
                    <div className="text-2xl font-bold text-white">{latest.value.toFixed(seriesId === 'VIXCLS' ? 1 : 2)}{seriesId === 'DFF' || seriesId === 'DGS10' ? '%' : ''}</div>
                    <div className="text-xs text-slate-500 mt-1">{latest.date}</div>
                  </div>
                )
              })}
            </div>

            {/* VIX Chart */}
            {fredData.VIXCLS?.observations && (
              <div className="bg-black/40 rounded-xl p-4 border border-slate-700/50">
                <h4 className="text-sm font-semibold text-slate-300 mb-3">VIX Volatility Index</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={fredData.VIXCLS.observations.slice().reverse()}>
                    <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                    <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
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
            <div className="bg-black/40 rounded-xl p-4 border border-slate-700/50">
              <h4 className="text-sm font-semibold text-slate-300 mb-3">Bitcoin News Tone (-10 to +10)</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={gdeltData.tone.slice(0, 100)}>
                  <Line type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2} />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                </LineChart>
              </ResponsiveContainer>
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

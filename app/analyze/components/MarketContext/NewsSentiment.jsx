// app/analyze/components/MarketContext/NewsSentiment.jsx
// Task 2.3: News Sentiment Section

'use client'

import { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { Newspaper, TrendingUp, TrendingDown, ExternalLink, Filter } from 'lucide-react'

export default function NewsSentiment({
  comprehensiveContext,
  dateRange
}) {
  const [sentimentFilter, setSentimentFilter] = useState('all') // 'all', 'bullish', 'bearish', 'neutral'
  const [selectedTicker, setSelectedTicker] = useState(null)

  // Process news sentiment data
  const sentimentData = useMemo(() => {
    if (!comprehensiveContext?.newsSentiment?.articles) return null

    const articles = comprehensiveContext.newsSentiment.articles
    
    // Calculate overall sentiment
    const avgSentiment = articles.reduce((sum, a) => 
      sum + (parseFloat(a.overall_sentiment_score) || 0), 0) / articles.length
    
    // Group by date for timeline
    const timelineMap = new Map()
    articles.forEach(article => {
      const date = new Date(article.time_published || article.date || Date.now())
      const dateKey = date.toISOString().split('T')[0]
      
      if (!timelineMap.has(dateKey)) {
        timelineMap.set(dateKey, {
          date: dateKey,
          timestamp: date.getTime(),
          sentiments: [],
          count: 0
        })
      }
      
      const point = timelineMap.get(dateKey)
      point.sentiments.push(parseFloat(article.overall_sentiment_score || 0))
      point.count++
    })
    
    // Calculate average sentiment per day
    const timeline = Array.from(timelineMap.values()).map(point => ({
      ...point,
      sentiment: point.sentiments.reduce((sum, s) => sum + s, 0) / point.sentiments.length
    })).sort((a, b) => a.timestamp - b.timestamp)

    // Extract ticker-specific sentiment
    const tickerSentiment = {}
    articles.forEach(article => {
      // Extract tickers from article (assuming ticker_sentiment field exists)
      const tickers = article.ticker_sentiment || []
      tickers.forEach(ticker => {
        if (!tickerSentiment[ticker.ticker]) {
          tickerSentiment[ticker.ticker] = {
            ticker: ticker.ticker,
            articles: [],
            avgSentiment: 0,
            count: 0
          }
        }
        tickerSentiment[ticker.ticker].articles.push(article)
        tickerSentiment[ticker.ticker].count++
      })
    })

    // Calculate average sentiment per ticker
    Object.values(tickerSentiment).forEach(tickerData => {
      const sentiments = tickerData.articles.map(a => parseFloat(a.overall_sentiment_score || 0))
      tickerData.avgSentiment = sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length
    })

    // Filter articles by sentiment
    const filteredArticles = articles.filter(article => {
      const sentiment = parseFloat(article.overall_sentiment_score || 0)
      if (sentimentFilter === 'bullish') return sentiment > 0.1
      if (sentimentFilter === 'bearish') return sentiment < -0.1
      if (sentimentFilter === 'neutral') return sentiment >= -0.1 && sentiment <= 0.1
      return true
    })

    return {
      overall: avgSentiment,
      label: avgSentiment > 0.1 ? 'Bullish' : avgSentiment < -0.1 ? 'Bearish' : 'Neutral',
      color: avgSentiment > 0.1 ? 'emerald' : avgSentiment < -0.1 ? 'red' : 'yellow',
      articleCount: articles.length,
      timeline,
      tickerSentiment: Object.values(tickerSentiment),
      filteredArticles: filteredArticles.slice(0, 20) // Limit to 20 articles
    }
  }, [comprehensiveContext, sentimentFilter])

  // Custom tooltip for timeline
  const TimelineTooltip = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null

    return (
      <div className="bg-black/95 border border-slate-700 rounded-lg p-3 shadow-xl">
        <div className="text-xs text-slate-400 mb-2">{payload[0]?.payload?.date}</div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-purple-400" />
          <span className="text-slate-300">Sentiment:</span>
          <span className={`font-semibold ${
            parseFloat(payload[0]?.value || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {parseFloat(payload[0]?.value || 0).toFixed(2)}
          </span>
        </div>
        <div className="text-xs text-slate-400 mt-1">
          {payload[0]?.payload?.count} articles
        </div>
      </div>
    )
  }

  if (!sentimentData) {
    return (
      <div className="bg-black/40 rounded-xl p-5 border border-slate-700/50">
        <div className="text-slate-400 text-center py-8">No news sentiment data available</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overall Sentiment Gauge */}
      <div className="bg-black/40 rounded-xl p-5 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">News Sentiment</h3>
            <p className="text-xs text-slate-400">{sentimentData.articleCount} articles analyzed</p>
          </div>
          <div className={`text-3xl font-bold ${
            sentimentData.color === 'emerald' ? 'text-emerald-400' :
            sentimentData.color === 'red' ? 'text-red-400' :
            'text-yellow-400'
          }`}>
            {sentimentData.overall >= 0 ? '+' : ''}{sentimentData.overall.toFixed(2)}
          </div>
        </div>

        {/* Sentiment Gauge */}
        <div className="relative h-4 bg-slate-700 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full transition-all ${
              sentimentData.color === 'emerald' ? 'bg-emerald-400' :
              sentimentData.color === 'red' ? 'bg-red-400' :
              'bg-yellow-400'
            }`}
            style={{
              width: `${Math.abs(sentimentData.overall) * 100}%`,
              marginLeft: sentimentData.overall < 0 ? 'auto' : '0'
            }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Bearish (-1.0)</span>
          <span className={`font-semibold ${
            sentimentData.color === 'emerald' ? 'text-emerald-400' :
            sentimentData.color === 'red' ? 'text-red-400' :
            'text-yellow-400'
          }`}>
            {sentimentData.label}
          </span>
          <span>Bullish (+1.0)</span>
        </div>
      </div>

      {/* Sentiment Timeline Chart */}
      {sentimentData.timeline.length > 0 && (
        <div className="bg-black/40 rounded-xl p-5 border border-slate-700/50">
          <h4 className="text-md font-semibold text-white mb-4">Sentiment Timeline</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={sentimentData.timeline} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                domain={[-1, 1]}
                label={{ value: 'Sentiment', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
              />
              <Tooltip content={<TimelineTooltip />} />
              <Line
                type="monotone"
                dataKey="sentiment"
                stroke="#A855F7"
                strokeWidth={2}
                dot={false}
                name="Sentiment"
              />
              <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="3 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Ticker-Specific Sentiment */}
      {sentimentData.tickerSentiment.length > 0 && (
        <div className="bg-black/40 rounded-xl p-5 border border-slate-700/50">
          <h4 className="text-md font-semibold text-white mb-4">Ticker-Specific Sentiment</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {sentimentData.tickerSentiment.slice(0, 8).map((ticker, idx) => {
              const isSelected = selectedTicker === ticker.ticker
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedTicker(isSelected ? null : ticker.ticker)}
                  className={`p-3 rounded-lg border transition-colors text-left ${
                    isSelected
                      ? 'bg-emerald-500/20 border-emerald-500/50'
                      : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  <div className="text-xs text-slate-400 mb-1">{ticker.ticker}</div>
                  <div className={`text-lg font-bold ${
                    ticker.avgSentiment >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {ticker.avgSentiment >= 0 ? '+' : ''}{ticker.avgSentiment.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{ticker.count} articles</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Top Articles */}
      <div className="bg-black/40 rounded-xl p-5 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-semibold text-white">Top Articles</h4>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={sentimentFilter}
              onChange={(e) => setSentimentFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-600 rounded-lg text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Sentiment</option>
              <option value="bullish">Bullish</option>
              <option value="bearish">Bearish</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
        </div>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {sentimentData.filteredArticles.map((article, idx) => {
            const sentiment = parseFloat(article.overall_sentiment_score || 0)
            const sentimentLabel = sentiment > 0.1 ? 'Bullish' : sentiment < -0.1 ? 'Bearish' : 'Neutral'
            
            return (
              <div
                key={idx}
                className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-semibold text-white line-clamp-2 mb-2">
                      {article.title}
                    </h5>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Newspaper className="w-3 h-3" />
                        <span>{article.source}</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        {new Date(article.time_published || article.date).toLocaleDateString()}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        sentimentLabel === 'Bullish' ? 'bg-emerald-500/20 text-emerald-300' :
                        sentimentLabel === 'Bearish' ? 'bg-red-500/20 text-red-300' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {sentimentLabel} ({sentiment >= 0 ? '+' : ''}{sentiment.toFixed(2)})
                      </span>
                    </div>
                  </div>
                  {article.url && (
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 text-purple-400 hover:text-purple-300 transition-colors"
                      title="Read article"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

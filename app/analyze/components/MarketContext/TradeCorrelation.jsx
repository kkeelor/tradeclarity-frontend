// app/analyze/components/MarketContext/TradeCorrelation.jsx
// Task 3.2: Trade Correlation Analysis

'use client'

import { useState, useMemo } from 'react'
import { convertSymbolToInstrument, matchSymbolToInstrument } from '../../utils/symbolConverter'
import { EmptyState } from './ErrorFallback'
import {
  Filter, TrendingUp, TrendingDown, Calendar, DollarSign,
  BarChart3, Activity, Newspaper, ExternalLink, ChevronDown, ChevronUp
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  ReferenceLine
} from 'recharts'

export default function TradeCorrelation({
  comprehensiveContext,
  analytics,
  dateRange,
  detectedAssets,
  selectedAsset = null
}) {
  const [filters, setFilters] = useState({
    symbol: 'all',
    dateRange: 'all',
    winLoss: 'all', // 'all', 'win', 'loss'
    marketCondition: 'all' // 'all', 'bullish', 'bearish', 'high-vol', 'low-vol'
  })
  const [selectedTrade, setSelectedTrade] = useState(null)
  const [expandedTrade, setExpandedTrade] = useState(null)

  // Process trades with market context - PHASE 3 TASK 3.2 & PHASE 6 TASK 6.1: Filter by selected asset
  const tradesWithContext = useMemo(() => {
    if (!analytics?.allTrades || !comprehensiveContext) return []

    const primaryInstrument = selectedAsset || detectedAssets?.instruments?.[0]
    
    return analytics.allTrades
      .filter(trade => {
        const tradeDate = new Date(trade.timestamp || trade.time)
        const startDate = new Date(dateRange.start)
        const endDate = new Date(dateRange.end)
        const inDateRange = tradeDate >= startDate && tradeDate <= endDate
        
        // PHASE 3 TASK 3.2 & PHASE 6 TASK 6.1: Filter by selected asset using symbol converter
        if (primaryInstrument && trade.symbol) {
          const matchesAsset = matchSymbolToInstrument(trade.symbol, primaryInstrument)
          return inDateRange && matchesAsset
        }
        
        return inDateRange
      })
      .map(trade => {
        const tradeDate = new Date(trade.timestamp || trade.time)
        const tradeTime = tradeDate.getTime()
        
        // Get market conditions at trade time
        const vix = comprehensiveContext?.economic?.indicators?.VIXCLS
        const vixValue = vix ? parseFloat(vix.value || 0) : null
        
        // Get sentiment around trade time (within 24 hours)
        const articles = comprehensiveContext?.newsSentiment?.articles || []
        const relevantArticles = articles.filter(article => {
          const articleDate = new Date(article.time_published || article.date)
          const timeDiff = Math.abs(articleDate.getTime() - tradeTime)
          return timeDiff < 24 * 60 * 60 * 1000 // Within 24 hours
        })
        
        const avgSentiment = relevantArticles.length > 0
          ? relevantArticles.reduce((sum, a) => sum + (parseFloat(a.overall_sentiment_score) || 0), 0) / relevantArticles.length
          : null

        // Get price at trade time
        const priceData = comprehensiveContext?.price?.data
        // PHASE 3 TASK 3.1: Use selected asset instead of just first instrument
        const primaryInstrument = selectedAsset || detectedAssets?.instruments?.[0]
        const marketPrice = priceData?.[primaryInstrument] 
          ? parseFloat(priceData[primaryInstrument].value || 0)
          : trade.price

        // Calculate performance after trade (simplified - would need historical data)
        const pnl = trade.realizedPnl || trade.income || 0
        const isWin = pnl > 0
        const isLoss = pnl < 0

        // Classify market conditions
        let marketCondition = 'neutral'
        if (avgSentiment !== null) {
          if (avgSentiment > 0.2) marketCondition = 'bullish'
          else if (avgSentiment < -0.2) marketCondition = 'bearish'
        }
        if (vixValue !== null) {
          if (vixValue > 25) marketCondition = 'high-vol'
          else if (vixValue < 15) marketCondition = 'low-vol'
        }

        return {
          ...trade,
          tradeDate,
          tradeTime,
          marketPrice,
          vixValue,
          avgSentiment,
          marketCondition,
          pnl,
          isWin,
          isLoss,
          relevantArticles: relevantArticles.slice(0, 3) // Top 3 articles
        }
      })
      .sort((a, b) => b.tradeTime - a.tradeTime) // Most recent first
  }, [analytics, comprehensiveContext, dateRange, detectedAssets])

  // Apply filters
  const filteredTrades = useMemo(() => {
    return tradesWithContext.filter(trade => {
      if (filters.symbol !== 'all' && trade.symbol !== filters.symbol) return false
      if (filters.winLoss === 'win' && !trade.isWin) return false
      if (filters.winLoss === 'loss' && !trade.isLoss) return false
      if (filters.marketCondition !== 'all' && trade.marketCondition !== filters.marketCondition) return false
      return true
    })
  }, [tradesWithContext, filters])

  // Calculate correlation statistics
  const correlationStats = useMemo(() => {
    if (tradesWithContext.length === 0) return null

    const bullishTrades = tradesWithContext.filter(t => t.marketCondition === 'bullish')
    const bearishTrades = tradesWithContext.filter(t => t.marketCondition === 'bearish')
    const highVolTrades = tradesWithContext.filter(t => t.marketCondition === 'high-vol')
    const lowVolTrades = tradesWithContext.filter(t => t.marketCondition === 'low-vol')

    const calculateAvgPnL = (trades) => {
      if (trades.length === 0) return 0
      return trades.reduce((sum, t) => sum + t.pnl, 0) / trades.length
    }

    const calculateWinRate = (trades) => {
      if (trades.length === 0) return 0
      return (trades.filter(t => t.isWin).length / trades.length) * 100
    }

    return {
      bullish: {
        count: bullishTrades.length,
        avgPnL: calculateAvgPnL(bullishTrades),
        winRate: calculateWinRate(bullishTrades)
      },
      bearish: {
        count: bearishTrades.length,
        avgPnL: calculateAvgPnL(bearishTrades),
        winRate: calculateWinRate(bearishTrades)
      },
      highVol: {
        count: highVolTrades.length,
        avgPnL: calculateAvgPnL(highVolTrades),
        winRate: calculateWinRate(highVolTrades)
      },
      lowVol: {
        count: lowVolTrades.length,
        avgPnL: calculateAvgPnL(lowVolTrades),
        winRate: calculateWinRate(lowVolTrades)
      },
      overall: {
        count: tradesWithContext.length,
        avgPnL: calculateAvgPnL(tradesWithContext),
        winRate: calculateWinRate(tradesWithContext)
      }
    }
  }, [tradesWithContext])

  // Get unique symbols
  const symbols = useMemo(() => {
    const uniqueSymbols = [...new Set(tradesWithContext.map(t => t.symbol))]
    return uniqueSymbols.sort()
  }, [tradesWithContext])

  // Format market condition badge
  const getMarketConditionBadge = (condition) => {
    const configs = {
      bullish: { color: 'emerald', label: 'Bullish', icon: TrendingUp },
      bearish: { color: 'red', label: 'Bearish', icon: TrendingDown },
      'high-vol': { color: 'yellow', label: 'High Vol', icon: Activity },
      'low-vol': { color: 'blue', label: 'Low Vol', icon: BarChart3 },
      neutral: { color: 'slate', label: 'Neutral', icon: BarChart3 }
    }
    const config = configs[condition] || configs.neutral
    const Icon = config.icon
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
        config.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-300' :
        config.color === 'red' ? 'bg-red-500/20 text-red-300' :
        config.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-300' :
        config.color === 'blue' ? 'bg-blue-500/20 text-blue-300' :
        'bg-slate-500/20 text-slate-400'
      }`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    )
  }

  // PHASE 4 TASK 4.2: Show empty state if no trades
  if (tradesWithContext.length === 0) {
    return (
      <div className="bg-black/40 rounded-xl p-5 border border-slate-700/50">
        <EmptyState
          icon={BarChart3}
          title="No Trades Found"
          message={`No trades found for ${selectedAsset || detectedAssets?.instruments?.[0] || 'selected asset'} in the selected date range. Try adjusting the filters or selecting a different asset.`}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-black/40 rounded-xl p-5 border border-slate-700/50">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-slate-400" />
          <h3 className="text-lg font-semibold text-white">Trade Correlation Analysis</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Symbol Filter */}
          <div>
            <label className="text-xs text-slate-400 mb-2 block">Symbol</label>
            <select
              value={filters.symbol}
              onChange={(e) => setFilters(prev => ({ ...prev, symbol: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-600 rounded-lg text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Symbols</option>
              {symbols.map(symbol => (
                <option key={symbol} value={symbol}>{symbol}</option>
              ))}
            </select>
          </div>

          {/* Win/Loss Filter */}
          <div>
            <label className="text-xs text-slate-400 mb-2 block">Win/Loss</label>
            <select
              value={filters.winLoss}
              onChange={(e) => setFilters(prev => ({ ...prev, winLoss: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-600 rounded-lg text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Trades</option>
              <option value="win">Wins Only</option>
              <option value="loss">Losses Only</option>
            </select>
          </div>

          {/* Market Condition Filter */}
          <div>
            <label className="text-xs text-slate-400 mb-2 block">Market Condition</label>
            <select
              value={filters.marketCondition}
              onChange={(e) => setFilters(prev => ({ ...prev, marketCondition: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-600 rounded-lg text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Conditions</option>
              <option value="bullish">Bullish</option>
              <option value="bearish">Bearish</option>
              <option value="high-vol">High Volatility</option>
              <option value="low-vol">Low Volatility</option>
            </select>
          </div>

          {/* Results Count */}
          <div className="flex items-end">
            <div className="w-full px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <div className="text-xs text-slate-400">Showing</div>
              <div className="text-lg font-bold text-white">{filteredTrades.length}</div>
              <div className="text-xs text-slate-500">of {tradesWithContext.length} trades</div>
            </div>
          </div>
        </div>
      </div>

      {/* Correlation Statistics */}
      {correlationStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-black/40 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs text-slate-400 mb-1">Overall</div>
            <div className="text-lg font-bold text-white">{correlationStats.overall.count}</div>
            <div className={`text-sm ${correlationStats.overall.avgPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {correlationStats.overall.avgPnL >= 0 ? '+' : ''}
              {correlationStats.overall.avgPnL.toFixed(2)}
            </div>
            <div className="text-xs text-slate-500">{correlationStats.overall.winRate.toFixed(1)}% win rate</div>
          </div>

          <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
            <div className="text-xs text-emerald-400 mb-1">Bullish Markets</div>
            <div className="text-lg font-bold text-white">{correlationStats.bullish.count}</div>
            <div className={`text-sm ${correlationStats.bullish.avgPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {correlationStats.bullish.avgPnL >= 0 ? '+' : ''}
              {correlationStats.bullish.avgPnL.toFixed(2)}
            </div>
            <div className="text-xs text-slate-500">{correlationStats.bullish.winRate.toFixed(1)}% win rate</div>
          </div>

          <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
            <div className="text-xs text-red-400 mb-1">Bearish Markets</div>
            <div className="text-lg font-bold text-white">{correlationStats.bearish.count}</div>
            <div className={`text-sm ${correlationStats.bearish.avgPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {correlationStats.bearish.avgPnL >= 0 ? '+' : ''}
              {correlationStats.bearish.avgPnL.toFixed(2)}
            </div>
            <div className="text-xs text-slate-500">{correlationStats.bearish.winRate.toFixed(1)}% win rate</div>
          </div>

          <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/20">
            <div className="text-xs text-yellow-400 mb-1">High Volatility</div>
            <div className="text-lg font-bold text-white">{correlationStats.highVol.count}</div>
            <div className={`text-sm ${correlationStats.highVol.avgPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {correlationStats.highVol.avgPnL >= 0 ? '+' : ''}
              {correlationStats.highVol.avgPnL.toFixed(2)}
            </div>
            <div className="text-xs text-slate-500">{correlationStats.highVol.winRate.toFixed(1)}% win rate</div>
          </div>

          <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
            <div className="text-xs text-blue-400 mb-1">Low Volatility</div>
            <div className="text-lg font-bold text-white">{correlationStats.lowVol.count}</div>
            <div className={`text-sm ${correlationStats.lowVol.avgPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {correlationStats.lowVol.avgPnL >= 0 ? '+' : ''}
              {correlationStats.lowVol.avgPnL.toFixed(2)}
            </div>
            <div className="text-xs text-slate-500">{correlationStats.lowVol.winRate.toFixed(1)}% win rate</div>
          </div>
        </div>
      )}

      {/* Trade List */}
      <div className="bg-black/40 rounded-xl p-5 border border-slate-700/50">
        <h4 className="text-md font-semibold text-white mb-4">Trades with Market Context</h4>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredTrades.slice(0, 50).map((trade, idx) => {
            const isExpanded = expandedTrade === idx
            return (
              <div
                key={idx}
                className={`p-4 rounded-lg border transition-colors ${
                  trade.isWin
                    ? 'bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40'
                    : 'bg-red-500/10 border-red-500/20 hover:border-red-500/40'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-semibold text-white">{trade.symbol}</span>
                      {getMarketConditionBadge(trade.marketCondition)}
                      <span className="text-xs text-slate-400">
                        {trade.tradeDate.toLocaleDateString()} {trade.tradeDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-slate-400">P&L</div>
                        <div className={`font-semibold ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">Market Price</div>
                        <div className="font-semibold text-white">${trade.marketPrice.toFixed(2)}</div>
                      </div>
                      {trade.vixValue !== null && (
                        <div>
                          <div className="text-xs text-slate-400">VIX</div>
                          <div className="font-semibold text-white">{trade.vixValue.toFixed(1)}</div>
                        </div>
                      )}
                      {trade.avgSentiment !== null && (
                        <div>
                          <div className="text-xs text-slate-400">Sentiment</div>
                          <div className={`font-semibold ${
                            trade.avgSentiment >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {trade.avgSentiment >= 0 ? '+' : ''}{trade.avgSentiment.toFixed(2)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs font-semibold text-slate-300 mb-2">Trade Details</div>
                            <div className="space-y-1 text-xs text-slate-400">
                              <div>Side: <span className="text-white">{trade.isBuyer ? 'Buy' : 'Sell'}</span></div>
                              <div>Quantity: <span className="text-white">{trade.qty || trade.quantity || 'N/A'}</span></div>
                              <div>Price: <span className="text-white">${trade.price.toFixed(2)}</span></div>
                            </div>
                          </div>
                          {trade.relevantArticles.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-slate-300 mb-2">Relevant News</div>
                              <div className="space-y-2">
                                {trade.relevantArticles.map((article, aidx) => (
                                  <div key={aidx} className="text-xs">
                                    <a
                                      href={article.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                    >
                                      {article.title?.slice(0, 50)}...
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => setExpandedTrade(isExpanded ? null : idx)}
                    className="ml-4 text-slate-400 hover:text-slate-300"
                  >
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Trade Detail Modal */}
      {selectedTrade && (
        <Dialog open={!!selectedTrade} onOpenChange={() => setSelectedTrade(null)}>
          <DialogContent className="bg-slate-900 border-slate-700 max-w-4xl">
            <DialogHeader>
              <DialogTitle className="text-white">Trade Details</DialogTitle>
              <DialogDescription className="text-slate-400">
                Market context at trade time
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {/* Trade info and market context would go here */}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

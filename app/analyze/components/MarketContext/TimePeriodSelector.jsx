// app/analyze/components/MarketContext/TimePeriodSelector.jsx
// Task 1.2: Time Period Selector Component

'use client'

import { useState, useEffect, useMemo } from 'react'
import { Calendar, TrendingDown, TrendingUp, Clock, Zap } from 'lucide-react'
import { analyzeDrawdowns } from '../../utils/drawdownAnalysis'

export default function TimePeriodSelector({
  analytics,
  dateRange,
  onDateRangeChange,
  selectedPeriod,
  onPeriodChange
}) {
  const [showDatePicker, setShowDatePicker] = useState(false)
  
  // Detect drawdown periods from analytics
  const drawdownPeriods = useMemo(() => {
    if (!analytics?.allTrades || analytics.allTrades.length === 0) return []
    
    try {
      const trades = analytics.allTrades.map(trade => ({
        timestamp: trade.timestamp || trade.time,
        realizedPnl: trade.realizedPnl || trade.income || (trade.price * trade.qty * (trade.isBuyer ? -1 : 1))
      }))
      
      const drawdownAnalysis = analyzeDrawdowns(trades)
      return drawdownAnalysis.worstDrawdowns || []
    } catch (error) {
      console.error('Error detecting drawdowns:', error)
      return []
    }
  }, [analytics])

  // Detect significant trade dates (large wins/losses)
  const significantTradeDates = useMemo(() => {
    if (!analytics?.allTrades || analytics.allTrades.length === 0) return []
    
    const trades = analytics.allTrades.map(trade => ({
      timestamp: trade.timestamp || trade.time,
      pnl: trade.realizedPnl || trade.income || 0,
      value: Math.abs(trade.price * (trade.qty || 0))
    }))
    
    // Calculate average trade value
    const avgValue = trades.reduce((sum, t) => sum + t.value, 0) / trades.length
    
    // Find trades that are 2x average value or have significant P&L
    const significant = trades
      .filter(trade => {
        const absPnl = Math.abs(trade.pnl)
        return trade.value > avgValue * 2 || absPnl > avgValue * 0.1
      })
      .map(trade => ({
        date: new Date(trade.timestamp),
        pnl: trade.pnl,
        isWin: trade.pnl > 0
      }))
      .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
      .slice(0, 10) // Top 10 significant trades
    
    return significant
  }, [analytics])

  // Quick period options
  const quickPeriods = [
    { id: '7d', label: 'Last 7 Days', days: 7 },
    { id: '30d', label: 'Last 30 Days', days: 30 },
    { id: '90d', label: 'Last 90 Days', days: 90 },
    { id: '1y', label: 'Last Year', days: 365 },
    { id: 'all', label: 'All Time', days: null }
  ]

  const handleQuickSelect = (periodId) => {
    onPeriodChange(periodId)
    
    if (periodId === 'all' && analytics?.metadata?.oldestTrade) {
      const start = new Date(analytics.metadata.oldestTrade)
      const end = new Date(analytics.metadata.newestTrade || Date.now())
      onDateRangeChange({
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      })
      return
    }
    
    if (periodId === 'trade-range' && analytics?.metadata?.oldestTrade) {
      const start = new Date(analytics.metadata.oldestTrade)
      const end = new Date(analytics.metadata.newestTrade || Date.now())
      onDateRangeChange({
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      })
      return
    }
    
    const period = quickPeriods.find(p => p.id === periodId)
    if (period && period.days) {
      const end = new Date()
      const start = new Date(end.getTime() - period.days * 24 * 60 * 60 * 1000)
      onDateRangeChange({
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      })
    }
  }

  // Calculate performance metrics for current period
  const periodMetrics = useMemo(() => {
    if (!analytics || !dateRange.start || !dateRange.end) return null
    
    const startDate = new Date(dateRange.start)
    const endDate = new Date(dateRange.end)
    
    const tradesInPeriod = (analytics.allTrades || []).filter(trade => {
      const tradeDate = new Date(trade.timestamp || trade.time)
      return tradeDate >= startDate && tradeDate <= endDate
    })
    
    if (tradesInPeriod.length === 0) return null
    
    const totalPnL = tradesInPeriod.reduce((sum, t) => sum + (t.realizedPnl || t.income || 0), 0)
    const wins = tradesInPeriod.filter(t => (t.realizedPnl || t.income || 0) > 0).length
    const losses = tradesInPeriod.filter(t => (t.realizedPnl || t.income || 0) < 0).length
    const winRate = tradesInPeriod.length > 0 ? (wins / tradesInPeriod.length) * 100 : 0
    
    return {
      totalPnL,
      winRate,
      winLossRatio: losses > 0 ? wins / losses : wins,
      tradeCount: tradesInPeriod.length
    }
  }, [analytics, dateRange])

  return (
    <div className="space-y-4">
      {/* Quick Select Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {quickPeriods.map(period => (
          <button
            key={period.id}
            onClick={() => handleQuickSelect(period.id)}
            className={`px-4 py-2 text-sm rounded-lg border transition-colors flex items-center gap-2 ${
              selectedPeriod === period.id
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-800/50 border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{period.label}</span>
          </button>
        ))}
        
        {/* Trade Range Option */}
        {analytics?.metadata?.oldestTrade && (
          <button
            onClick={() => handleQuickSelect('trade-range')}
            className={`px-4 py-2 text-sm rounded-lg border transition-colors flex items-center gap-2 ${
              selectedPeriod === 'trade-range'
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-800/50 border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Trade Range</span>
          </button>
        )}
        
        {/* Drawdown Periods */}
        {drawdownPeriods.length > 0 && (
          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-700">
            <span className="text-xs text-slate-500">Drawdowns:</span>
            {drawdownPeriods.slice(0, 3).map((dd, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onPeriodChange('drawdown')
                  onDateRangeChange({
                    start: new Date(dd.startDate).toISOString().split('T')[0],
                    end: new Date(dd.endDate).toISOString().split('T')[0]
                  })
                }}
                className="px-3 py-1.5 text-xs rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-colors flex items-center gap-1"
                title={`${dd.drawdownPercent.toFixed(1)}% drawdown`}
              >
                <TrendingDown className="w-3 h-3" />
                <span>DD {idx + 1}</span>
              </button>
            ))}
          </div>
        )}
        
        {/* Custom Date Range Button */}
        <button
          onClick={() => setShowDatePicker(!showDatePicker)}
          className={`px-4 py-2 text-sm rounded-lg border transition-colors flex items-center gap-2 ${
            selectedPeriod === 'custom'
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
              : 'bg-slate-800/50 border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>
            {new Date(dateRange.start).toLocaleDateString()} - {new Date(dateRange.end).toLocaleDateString()}
          </span>
        </button>
      </div>

      {/* Custom Date Picker */}
      {showDatePicker && (
        <div className="p-4 bg-black/40 rounded-lg border border-slate-700/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => {
                  onDateRangeChange(prev => ({ ...prev, start: e.target.value }))
                  onPeriodChange('custom')
                }}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                max={dateRange.end}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-2 block">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => {
                  onDateRangeChange(prev => ({ ...prev, end: e.target.value }))
                  onPeriodChange('custom')
                }}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                min={dateRange.start}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
        </div>
      )}

      {/* Period Performance Metrics */}
      {periodMetrics && (
        <div className="flex flex-wrap items-center gap-4 p-3 bg-black/40 rounded-lg border border-slate-700/50">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Period Performance:</span>
            <span className={`text-sm font-semibold ${periodMetrics.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {periodMetrics.totalPnL >= 0 ? '+' : ''}
              {periodMetrics.totalPnL.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Win Rate:</span>
            <span className="text-sm font-semibold text-slate-300">
              {periodMetrics.winRate.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Trades:</span>
            <span className="text-sm font-semibold text-slate-300">
              {periodMetrics.tradeCount}
            </span>
          </div>
        </div>
      )}

      {/* Significant Trade Dates */}
      {significantTradeDates.length > 0 && (
        <div className="p-3 bg-black/40 rounded-lg border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-slate-300">Significant Trade Dates</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {significantTradeDates.slice(0, 5).map((trade, idx) => (
              <button
                key={idx}
                onClick={() => {
                  const tradeDate = trade.date.toISOString().split('T')[0]
                  onDateRangeChange({
                    start: tradeDate,
                    end: tradeDate
                  })
                  onPeriodChange('custom')
                }}
                className={`px-2 py-1 text-xs rounded border transition-colors flex items-center gap-1 ${
                  trade.isWin
                    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/20 border-red-500/30 text-red-300'
                }`}
                title={`${trade.isWin ? 'Win' : 'Loss'}: ${trade.pnl.toFixed(2)}`}
              >
                {trade.isWin ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span>{trade.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

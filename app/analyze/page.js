'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Lock, Loader2, AlertCircle, DollarSign, Target, Clock, Sparkles, Eye, EyeOff, HelpCircle, Calendar, Award, AlertTriangle, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL

export default function TradeClarity() {
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')
  const [analytics, setAnalytics] = useState(null)

  // TEMP: only for a quick console test — do not commit real keys
  const fetchCoinDCX = async (endpoint, params = {}) => {
    if (!BACKEND_URL) throw new Error('BACKEND_URL is not set')
    console.log('Backend URL:', BACKEND_URL)

    const COINDCX_API_KEY = 'YOUR_COINDCX_API_KEY'    // TEMP — remove before commit
    const COINDCX_API_SECRET = 'YOUR_COINDCX_SECRET'  // TEMP — remove before commit

    const res = await fetch(`${BACKEND_URL}/api/coindcx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: COINDCX_API_KEY,
        apiSecret: COINDCX_API_SECRET,
        endpoint,
        params
      })
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`)
    return data.data
  }

  const fetchBinance = async (endpoint, params = {}) => {
    if (!BACKEND_URL) throw new Error('BACKEND_URL is not set')
    console.log('Backend URL:', BACKEND_URL)

    const res = await fetch(`${BACKEND_URL}/api/binance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, apiSecret, endpoint, params })
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`)
    return data.data
  }

  // TEMP: Test CoinDCX API on mount
useEffect(() => {
  const testCoinDCX = async () => {
    try {
      const COINDCX_API_KEY = 'd314df7c8b51489735dcd82c143c6b0e5429b9c0cd1ac915'     // Replace with real key
      const COINDCX_API_SECRET = '43a821596286b13b1e18c4200b470747a1d099e11d18ee5e32f8056aa324c8e7' // Replace with real secret

      const res = await fetch(`${BACKEND_URL}/api/coindcx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: COINDCX_API_KEY,
          apiSecret: COINDCX_API_SECRET,
          endpoint: '/exchange/v1/orders/trade_history',
          params: { limit: 5 }
        })
      })

      const data = await res.json()
      if (data.success) {
        console.log('✅ CoinDCX Trades:', data.data)
      } else {
        console.error('❌ CoinDCX Error:', data.error)
      }
    } catch (err) {
      console.error('❌ CoinDCX Request Failed:', err.message)
    }
  }

  testCoinDCX()
}, [])

  const analyzeData = (allTrades) => {
    const tradesBySymbol = {}
    const tradesByDay = {}
    const tradesByHour = Array(24).fill(0).map((_, i) => ({ hour: `${i}:00`, trades: 0, pnl: 0 }))
    const tradeSizes = { small: 0, medium: 0, large: 0 }
    
    allTrades.forEach(trade => {
      if (!tradesBySymbol[trade.symbol]) tradesBySymbol[trade.symbol] = []
      tradesBySymbol[trade.symbol].push(trade)
      
      const date = new Date(trade.time)
      const day = date.toLocaleDateString('en-US', { weekday: 'short' })
      if (!tradesByDay[day]) tradesByDay[day] = { wins: 0, losses: 0, pnl: 0, count: 0 }
      
      const hour = date.getHours()
      tradesByHour[hour].trades++
      
      const value = parseFloat(trade.qty) * parseFloat(trade.price)
      if (value < 100) tradeSizes.small++
      else if (value < 1000) tradeSizes.medium++
      else tradeSizes.large++
    })

    let totalPnL = 0
    let totalInvested = 0
    let winningTrades = 0
    let losingTrades = 0
    let totalCommission = 0
    let avgWin = 0
    let avgLoss = 0
    let largestWin = 0
    let largestLoss = 0
    let maxConsecutiveWins = 0
    let maxConsecutiveLosses = 0
    const symbolAnalytics = {}
    const monthlyPnL = {}

    Object.entries(tradesBySymbol).forEach(([symbol, trades]) => {
      trades.sort((a, b) => a.time - b.time)
      let position = 0, totalCost = 0, realized = 0, buys = 0, sells = 0
      let symbolWins = 0, symbolLosses = 0
      let consecutiveWins = 0, consecutiveLosses = 0

      trades.forEach(trade => {
        const qty = parseFloat(trade.qty)
        const price = parseFloat(trade.price)
        const value = qty * price
        const commission = parseFloat(trade.commission || 0)
        totalCommission += commission

        const date = new Date(trade.time)
        const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        if (!monthlyPnL[monthKey]) monthlyPnL[monthKey] = 0

        if (trade.isBuyer) {
          position += qty
          totalCost += value
          totalInvested += value
          buys++
        } else {
          const avgCost = position > 0 ? totalCost / position : 0
          const pnl = (price - avgCost) * qty - commission
          realized += pnl
          monthlyPnL[monthKey] += pnl
          
          if (pnl > 0) {
            symbolWins++
            winningTrades++
            avgWin += pnl
            largestWin = Math.max(largestWin, pnl)
            consecutiveWins++
            consecutiveLosses = 0
            maxConsecutiveWins = Math.max(maxConsecutiveWins, consecutiveWins)
          } else {
            symbolLosses++
            losingTrades++
            avgLoss += Math.abs(pnl)
            largestLoss = Math.min(largestLoss, pnl)
            consecutiveLosses++
            consecutiveWins = 0
            maxConsecutiveLosses = Math.max(maxConsecutiveLosses, consecutiveLosses)
          }
          
          const day = date.toLocaleDateString('en-US', { weekday: 'short' })
          if (pnl > 0) tradesByDay[day].wins++
          else tradesByDay[day].losses++
          tradesByDay[day].pnl += pnl
          tradesByDay[day].count++
          
          const hour = date.getHours()
          tradesByHour[hour].pnl += pnl
          
          position -= qty
          totalCost -= avgCost * qty
          sells++
        }
      })

      symbolAnalytics[symbol] = { 
        realized, 
        position, 
        avgCost: position > 0 ? totalCost / position : 0, 
        trades: trades.length, 
        buys, 
        sells,
        wins: symbolWins,
        losses: symbolLosses,
        winRate: symbolWins + symbolLosses > 0 ? (symbolWins / (symbolWins + symbolLosses)) * 100 : 0
      }
      totalPnL += realized
    })

    avgWin = winningTrades > 0 ? avgWin / winningTrades : 0
    avgLoss = losingTrades > 0 ? avgLoss / losingTrades : 0
    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0

    const symbols = Object.keys(symbolAnalytics)
    const bestSymbol = symbols.reduce((best, symbol) => 
      symbolAnalytics[symbol].realized > (symbolAnalytics[best]?.realized || -Infinity) ? symbol : best, symbols[0])

    const dayPerformance = Object.entries(tradesByDay).map(([day, data]) => ({
      day,
      pnl: data.pnl,
      winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
      count: data.count
    })).sort((a, b) => b.pnl - a.pnl)

    const hourPerformance = tradesByHour
      .map((h, i) => ({ ...h, hour: i }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 3)

    const monthlyData = Object.entries(monthlyPnL)
      .map(([month, pnl]) => ({ month, pnl }))
      .slice(-12)

    return { 
      totalPnL, 
      totalInvested, 
      roi: totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0, 
      totalTrades: allTrades.length,
      winningTrades,
      losingTrades,
      winRate: winningTrades + losingTrades > 0 ? (winningTrades / (winningTrades + losingTrades)) * 100 : 0,
      symbols: symbolAnalytics, 
      bestSymbol,
      totalCommission,
      avgWin,
      avgLoss,
      profitFactor,
      largestWin,
      largestLoss,
      maxConsecutiveWins,
      maxConsecutiveLosses,
      dayPerformance,
      hourPerformance,
      monthlyData,
      tradeSizes
    }
  }

  const handleConnect = async () => {
    if (!apiKey || !apiSecret) {
      setError('Please enter both API key and secret')
      return
    }

    setStatus('connecting')
    setError('')
    setProgress('Connecting to Binance...')

    try {
      const account = await fetchBinance('/api/v3/account')
      
      const symbolsToQuery = account.balances
        .filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
        .map(b => `${b.asset}USDT`)
        .filter(s => s !== 'USDTUSDT' && s !== 'USDCUSDT' && s !== 'BUSDUSDT')
        .slice(0, 10)

      if (symbolsToQuery.length === 0) throw new Error('No trading pairs found')

      setProgress(`Found ${symbolsToQuery.length} symbols to analyze...`)

      const allTrades = []
      for (let i = 0; i < symbolsToQuery.length; i++) {
        const symbol = symbolsToQuery[i]
        setProgress(`Fetching ${symbol} trades (${i + 1}/${symbolsToQuery.length})...`)
        
        try {
          const trades = await fetchBinance('/api/v3/myTrades', { symbol, limit: 1000 })
          if (trades && trades.length > 0) allTrades.push(...trades)
          await new Promise(resolve => setTimeout(resolve, 300))
        } catch (err) {
          console.log(`No trades for ${symbol}`)
        }
      }

      if (allTrades.length === 0) throw new Error('No trades found')

      setProgress(`Analyzing ${allTrades.length} trades...`)
      const analysis = analyzeData(allTrades)
      
      setAnalytics(analysis)
      setStatus('connected')
      setProgress('')
    } catch (err) {
      setError(err.message)
      setStatus('error')
      setProgress('')
    }
  }

  if (status === 'connected' && analytics) {
    const tradeSizeData = [
      { name: 'Small', value: analytics.tradeSizes.small },
      { name: 'Medium', value: analytics.tradeSizes.medium },
      { name: 'Large', value: analytics.tradeSizes.large }
    ]
    const COLORS = ['#3b82f6', '#8b5cf6', '#10b981']

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <header className="border-b border-slate-800 backdrop-blur-sm bg-slate-900/50 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
              <span className="text-lg font-bold">TradeClarity</span>
            </div>
            <button onClick={() => { setStatus('idle'); setAnalytics(null); setApiKey(''); setApiSecret('') }} className="text-sm text-slate-400 hover:text-white transition-colors">
              Disconnect
            </button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">Your Trading Performance</h1>
            <p className="text-slate-400">Complete analysis of {analytics.totalTrades} trades across {Object.keys(analytics.symbols).length} pairs</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Total P&L</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <div className={`text-3xl font-bold ${analytics.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {analytics.totalPnL >= 0 ? '+' : ''}${analytics.totalPnL.toFixed(2)}
                </div>
                <div className={`text-xs ${analytics.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {analytics.roi >= 0 ? '+' : ''}{analytics.roi.toFixed(1)}% ROI
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Win Rate</span>
                <Target className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold">{analytics.winRate.toFixed(1)}%</div>
                <div className="text-xs text-slate-400">{analytics.winningTrades}W / {analytics.losingTrades}L</div>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Profit Factor</span>
                <Activity className="w-4 h-4 text-purple-400" />
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold">{analytics.profitFactor.toFixed(2)}</div>
                <div className="text-xs text-slate-400">
                  {analytics.profitFactor > 2 ? 'Excellent' : analytics.profitFactor > 1.5 ? 'Good' : 'Profitable'}
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Best Pair</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold">{analytics.bestSymbol?.replace('USDT', '')}</div>
                <div className="text-xs text-emerald-400">
                  +${analytics.symbols[analytics.bestSymbol]?.realized.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-medium">Average Win</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400">+${analytics.avgWin.toFixed(2)}</div>
              <div className="text-xs text-slate-400">Per winning trade</div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-medium">Average Loss</span>
                <ArrowDownRight className="w-4 h-4 text-red-400" />
              </div>
              <div className="text-2xl font-bold text-red-400">-${analytics.avgLoss.toFixed(2)}</div>
              <div className="text-xs text-slate-400">Per losing trade</div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-medium">Total Fees</span>
                <DollarSign className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-amber-400">${analytics.totalCommission.toFixed(2)}</div>
              <div className="text-xs text-slate-400">{((analytics.totalCommission / analytics.totalInvested) * 100).toFixed(2)}% of capital</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-400/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-emerald-400/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-lg">Best Trading Day</h3>
                  <p className="text-slate-300">
                    {analytics.dayPerformance[0]?.day} is your most profitable with 
                    <span className="text-emerald-400 font-semibold"> +${analytics.dayPerformance[0]?.pnl.toFixed(2)}</span> total P&L.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-400/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-purple-400/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-lg">Peak Performance Hours</h3>
                  <p className="text-slate-300">
                    Best at <span className="text-purple-400 font-semibold">{analytics.hourPerformance[0]?.hour}:00</span>, 
                    <span className="text-purple-400 font-semibold"> {analytics.hourPerformance[1]?.hour}:00</span>, and 
                    <span className="text-purple-400 font-semibold"> {analytics.hourPerformance[2]?.hour}:00</span>.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-400/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-amber-400/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Award className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-lg">Best Streak</h3>
                  <p className="text-slate-300">
                    Longest winning streak: <span className="text-emerald-400 font-semibold">{analytics.maxConsecutiveWins} wins</span>!
                  </p>
                </div>
              </div>
            </div>

            {analytics.maxConsecutiveLosses > 3 && (
              <div className="bg-gradient-to-br from-red-500/10 to-pink-500/10 border border-red-400/30 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-red-400/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold text-lg">Risk Alert</h3>
                    <p className="text-slate-300">
                      Max losing streak: <span className="text-red-400 font-semibold">{analytics.maxConsecutiveLosses} losses</span>. Consider risk management.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-lg">Monthly Performance</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.monthlyData}>
                  <defs>
                    <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="pnl" stroke="#10b981" fillOpacity={1} fill="url(#colorPnl)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-lg">Performance by Day</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.dayPerformance}>
                  <XAxis dataKey="day" stroke="#64748b" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                  <Bar dataKey="pnl" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-lg">Trade Size Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={tradeSizeData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={80} dataKey="value">
                    {tradeSizeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-lg">Performance by Symbol</h3>
            <div className="space-y-3">
              {Object.entries(analytics.symbols).sort((a, b) => b[1].realized - a[1].realized).map(([symbol, data]) => (
                <div key={symbol} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <div className="font-semibold text-lg">{symbol.replace('USDT', '')}</div>
                      <span className={`text-xs px-2 py-1 rounded-full ${data.winRate >= 60 ? 'bg-emerald-400/20 text-emerald-400' : data.winRate >= 50 ? 'bg-amber-400/20 text-amber-400' : 'bg-red-400/20 text-red-400'}`}>
                        {data.winRate.toFixed(0)}% WR
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {data.trades} trades • {data.wins}W / {data.losses}L
                      {data.position > 0 && <span className="text-cyan-400"> • Holding: {data.position.toFixed(4)}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-semibold ${data.realized >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {data.realized >= 0 ? '+' : ''}${data.realized.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-2">
              <div className="text-sm text-slate-400">Largest Win</div>
              <div className="text-xl font-bold text-emerald-400">+${analytics.largestWin.toFixed(2)}</div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-2">
              <div className="text-sm text-slate-400">Largest Loss</div>
              <div className="text-xl font-bold text-red-400">${analytics.largestLoss.toFixed(2)}</div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-2">
              <div className="text-sm text-slate-400">Total Capital</div>
              <div className="text-xl font-bold text-cyan-400">${analytics.totalInvested.toFixed(2)}</div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-2">
              <div className="text-sm text-slate-400">Win Streak</div>
              <div className="text-xl font-bold text-amber-400">{analytics.maxConsecutiveWins}</div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 mb-4">
            <TrendingUp className="w-10 h-10 text-emerald-400" />
            <h1 className="text-3xl font-bold">TradeClarity</h1>
          </div>
          <p className="text-slate-400">Discover your hidden trading patterns</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="block text-sm font-medium text-slate-300">Binance API Key</label>
              <div className="group relative">
                <HelpCircle className="w-4 h-4 text-slate-500 cursor-help" />
                <div className="absolute left-0 bottom-6 hidden group-hover:block bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs w-64 z-10">
                  <p className="text-slate-300 mb-2">Create API keys at binance.com</p>
                  <p className="text-emerald-400">✓ Enable Read Only</p>
                  <p className="text-red-400">✗ NO trading permissions</p>
                </div>
              </div>
            </div>
            <input type="text" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Enter your Binance API key" className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-emerald-400 transition-colors text-white placeholder-slate-500" disabled={status === 'connecting'} />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">API Secret</label>
            <div className="relative">
              <input type={showSecret ? "text" : "password"} value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} placeholder="Enter your API secret" className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-emerald-400 transition-colors text-white placeholder-slate-500 pr-12" disabled={status === 'connecting'} />
              <button onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">
                {showSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {progress && (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin flex-shrink-0" />
              <p className="text-emerald-400 text-sm">{progress}</p>
            </div>
          )}

          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-slate-300 font-medium">Your data is secure</p>
                <p className="text-slate-400">Keys are encrypted and never stored. We only read your trade history.</p>
              </div>
            </div>
          </div>

          <button onClick={handleConnect} disabled={status === 'connecting' || !apiKey || !apiSecret} className="w-full px-6 py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-all text-lg">
            {status === 'connecting' ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing...
              </span>
            ) : (
              'Analyze My Trades'
            )}
          </button>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              How to Create Binance API Keys
            </h3>
            <ol className="space-y-3 text-sm text-slate-300">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-400/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <div>
                  <span className="font-medium">Log into Binance</span>
                  <p className="text-slate-400 text-xs mt-1">Go to binance.com and sign in to your account</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-400/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <div>
                  <span className="font-medium">Navigate to API Management</span>
                  <p className="text-slate-400 text-xs mt-1">Click your profile → API Management</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-400/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <div>
                  <span className="font-medium">Create New API Key</span>
                  <p className="text-slate-400 text-xs mt-1">Choose "System Generated" and give it a label like "TradeClarity"</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-400/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                <div>
                  <span className="font-medium">Enable Read-Only Permission</span>
                  <p className="text-slate-400 text-xs mt-1">
                    <span className="text-emerald-400">✓</span> Check "Enable Reading" only
                    <br />
                    <span className="text-red-400">✗</span> Leave "Enable Spot & Margin Trading" OFF
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-400/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">5</span>
                <div>
                  <span className="font-medium">Copy Your Keys</span>
                  <p className="text-slate-400 text-xs mt-1">Copy the API Key and Secret Key and paste them above</p>
                </div>
              </li>
            </ol>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400">
                <span className="font-semibold">Important:</span> Never enable trading permissions. We only need read access to view your trade history.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
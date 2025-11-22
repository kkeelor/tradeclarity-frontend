// app/admin/mcp-stats/page.js
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { Button } from '@/components/ui/button'

export default function MCPStatsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [userRole, setUserRole] = useState(null)
  const [roleLoading, setRoleLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [keyUsage, setKeyUsage] = useState([])
  const [toolDistribution, setToolDistribution] = useState([])
  const [topSymbols, setTopSymbols] = useState([])
  const [errors, setErrors] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  // Check user role using API route
  useEffect(() => {
    if (!user) {
      if (!authLoading) {
        router.push('/admin')
      }
      return
    }

    const checkRole = async () => {
      try {
        console.log('[MCP Stats] Checking role for user:', user.id)
        const response = await fetch('/api/admin/check-role')
        
        if (!response.ok) {
          console.error('[MCP Stats] Role check failed:', response.status)
          router.push('/admin')
          return
        }

        const { role, isAdmin } = await response.json()
        console.log('[MCP Stats] Role check result:', { role, isAdmin })
        
        setUserRole(role)

        if (!isAdmin) {
          router.push('/admin')
        }
      } catch (error) {
        console.error('[MCP Stats] Exception checking role:', error)
        router.push('/admin')
      } finally {
        setRoleLoading(false)
      }
    }

    checkRole()
  }, [user, authLoading, router])

  const fetchData = async () => {
    try {
      console.log('[MCP Stats] Fetching data...')
      setLoading(true)

      const [summaryRes, keyUsageRes, toolDistRes, symbolsRes, errorsRes] = await Promise.all([
        fetch('/api/admin/mcp-stats?endpoint=summary'),
        fetch('/api/admin/mcp-stats?endpoint=key-usage'),
        fetch('/api/admin/mcp-stats?endpoint=tool-distribution&days=7'),
        fetch('/api/admin/mcp-stats?endpoint=top-symbols&days=7&limit=30'),
        fetch('/api/admin/mcp-stats?endpoint=errors&limit=50')
      ])

      // Check for errors
      const responses = [
        { name: 'summary', res: summaryRes },
        { name: 'keyUsage', res: keyUsageRes },
        { name: 'toolDist', res: toolDistRes },
        { name: 'symbols', res: symbolsRes },
        { name: 'errors', res: errorsRes }
      ]

      for (const { name, res } of responses) {
        if (!res.ok) {
          const errorText = await res.text()
          console.error(`[MCP Stats] Error fetching ${name}:`, res.status, errorText)
        }
      }

      const summaryData = await summaryRes.json().catch(() => ({}))
      const keyUsageData = await keyUsageRes.json().catch(() => [])
      const toolDistData = await toolDistRes.json().catch(() => [])
      const symbolsData = await symbolsRes.json().catch(() => [])
      const errorsData = await errorsRes.json().catch(() => [])

      console.log('[MCP Stats] Data fetched:', {
        summary: !!summaryData,
        keyUsage: keyUsageData.length,
        toolDist: toolDistData.length,
        symbols: symbolsData.length,
        errors: errorsData.length
      })

      setSummary(summaryData)
      setKeyUsage(keyUsageData)
      setToolDistribution(toolDistData)
      setTopSymbols(symbolsData)
      setErrors(errorsData)
      setLastRefresh(new Date())
    } catch (error) {
      console.error('[MCP Stats] Error fetching MCP stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user && userRole === 'admin' && !roleLoading) {
      fetchData()
      const interval = setInterval(fetchData, 30000)
      return () => clearInterval(interval)
    }
  }, [user, userRole, roleLoading])

  // Show loading while checking auth or role
  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-300">Loading...</span>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated or not admin (redirect is happening)
  if (!user || userRole !== 'admin') {
    return null
  }

  if (loading && !summary) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-300">Loading statistics...</span>
        </div>
      </div>
    )
  }

  const totalCapacity = keyUsage.length * 25
  const totalUsed = keyUsage.reduce((sum, key) => sum + (key.requests_today || 0), 0)

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white/90">MCP Statistics</h1>
            <p className="text-xs text-white/50 mt-1">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
          <Button 
            onClick={fetchData} 
            disabled={loading}
            className="rounded-lg border border-white/10 bg-black px-3 py-1.5 text-xs font-medium text-white transition hover:border-white/20 hover:bg-white/5"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* Summary Stats - Compact Row */}
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-lg border border-white/10 bg-black p-3">
            <div className="text-xs text-white/50 mb-1">Requests Today</div>
            <div className="text-lg font-semibold text-emerald-400">
              {summary?.requestsToday || 0}<span className="text-xs text-white/50 font-normal"> / {totalCapacity}</span>
            </div>
            <div className="text-[10px] text-white/40 mt-1">
              {totalCapacity > 0 ? `${((totalUsed / totalCapacity) * 100).toFixed(1)}% used` : 'No keys'}
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black p-3">
            <div className="text-xs text-white/50 mb-1">Cache Hit Rate</div>
            <div className="text-lg font-semibold text-cyan-400">
              {summary?.cacheHitRate?.toFixed(1) || 0}%
            </div>
            <div className="text-[10px] text-white/40 mt-1">
              {summary?.cacheHitRate > 70 ? 'Excellent' : summary?.cacheHitRate > 50 ? 'Good' : 'Low'}
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black p-3">
            <div className="text-xs text-white/50 mb-1">Errors Today</div>
            <div className={`text-lg font-semibold ${(summary?.errorsToday || 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {summary?.errorsToday || 0}
            </div>
            <div className="text-[10px] text-white/40 mt-1">
              {summary?.errorsToday === 0 ? 'No errors' : 'Check log'}
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black p-3">
            <div className="text-xs text-white/50 mb-1">Active Keys</div>
            <div className="text-lg font-semibold text-white">
              {keyUsage.filter(k => (k.requests_today || 0) < 25).length}<span className="text-xs text-white/50 font-normal"> / {keyUsage.length}</span>
            </div>
            <div className="text-[10px] text-white/40 mt-1">
              {keyUsage.length > 0 ? `${keyUsage.filter(k => (k.requests_today || 0) >= 25).length} exhausted` : 'None'}
            </div>
          </div>
        </div>

        {/* Main Data Grid - Compact Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Key Usage - Left Column */}
          <div className="lg:col-span-1 rounded-lg border border-white/10 bg-black p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white/90">API Key Usage</h2>
              <span className="text-xs text-white/40">25/day limit</span>
            </div>
            <div className="space-y-2">
              {keyUsage.length === 0 ? (
                <div className="text-xs text-white/40 text-center py-4">No key data</div>
              ) : (
                keyUsage.map((key) => {
                  const usage = key.requests_today || 0
                  const limit = 25
                  const percentage = (usage / limit) * 100
                  const isExhausted = usage >= limit

                  return (
                    <div key={key.api_key_index} className="flex items-center gap-2 text-xs">
                      <span className="text-white/60 w-12">Key {key.api_key_index + 1}</span>
                      <div className="flex-1 bg-slate-800/50 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            isExhausted ? 'bg-red-400' : percentage > 80 ? 'bg-yellow-400' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                      <span className={`w-12 text-right ${isExhausted ? 'text-red-400' : 'text-white/80'}`}>
                        {usage}/{limit}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Tool Usage & Top Symbols - Middle Column */}
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-lg border border-white/10 bg-black p-4">
              <h2 className="text-sm font-semibold text-white/90 mb-3">Tool Usage (7d)</h2>
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {toolDistribution.length === 0 ? (
                  <div className="text-xs text-white/40 text-center py-4">No data</div>
                ) : (
                  toolDistribution.slice(0, 15).map((tool) => (
                    <div key={tool.tool_name} className="flex items-center justify-between text-xs py-1">
                      <span className="font-mono text-cyan-400 truncate flex-1">{tool.tool_name}</span>
                      <span className="text-white/80 ml-2">{tool.count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-black p-4">
              <h2 className="text-sm font-semibold text-white/90 mb-3">Top Symbols (7d)</h2>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {topSymbols.length === 0 ? (
                  <div className="text-xs text-white/40 text-center py-4">No data</div>
                ) : (
                  topSymbols.map((symbol) => (
                    <div key={symbol.symbol} className="flex items-center justify-between text-xs py-1">
                      <span className="font-semibold text-emerald-400">{symbol.symbol}</span>
                      <span className="text-white/80">{symbol.count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Recent Errors - Right Column */}
          <div className="lg:col-span-1 rounded-lg border border-white/10 bg-black p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white/90">Recent Errors</h2>
              <span className="text-xs text-white/40">{errors.length} total</span>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {errors.length === 0 ? (
                <div className="text-xs text-white/40 text-center py-4">No errors</div>
              ) : (
                errors.slice(0, 20).map((error) => (
                  <div key={error.id} className="border-b border-white/5 pb-2 last:border-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-mono text-[10px] text-cyan-400">{error.tool_name}</span>
                      <span className="text-[10px] text-red-400">{error.error_type}</span>
                    </div>
                    <div className="text-[10px] text-white/50 mb-1">
                      {new Date(error.timestamp).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-white/60 line-clamp-2">
                      {error.error_message}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

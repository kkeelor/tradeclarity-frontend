// app/admin/mcp-stats/page.js
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

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
  const [cachePerformance, setCachePerformance] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [timeRange, setTimeRange] = useState(7)
  const [errorSearch, setErrorSearch] = useState('')
  const [errorFilter, setErrorFilter] = useState('all')
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })

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

  const fetchData = useCallback(async () => {
    try {
      console.log('[MCP Stats] Fetching data...')
      setLoading(true)

      const [summaryRes, keyUsageRes, toolDistRes, symbolsRes, errorsRes, cacheRes] = await Promise.all([
        fetch('/api/admin/mcp-stats?endpoint=summary'),
        fetch('/api/admin/mcp-stats?endpoint=key-usage'),
        fetch(`/api/admin/mcp-stats?endpoint=tool-distribution&days=${timeRange}`),
        fetch(`/api/admin/mcp-stats?endpoint=top-symbols&days=${timeRange}&limit=100`),
        fetch('/api/admin/mcp-stats?endpoint=errors&limit=100'),
        fetch(`/api/admin/mcp-stats?endpoint=cache-performance&days=${timeRange}`)
      ])

      // Check for errors
      const responses = [
        { name: 'summary', res: summaryRes },
        { name: 'keyUsage', res: keyUsageRes },
        { name: 'toolDist', res: toolDistRes },
        { name: 'symbols', res: symbolsRes },
        { name: 'errors', res: errorsRes },
        { name: 'cache', res: cacheRes }
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
      const cacheData = await cacheRes.json().catch(() => [])

      console.log('[MCP Stats] Data fetched:', {
        summary: !!summaryData,
        keyUsage: keyUsageData.length,
        toolDist: toolDistData.length,
        symbols: symbolsData.length,
        errors: errorsData.length,
        cache: cacheData.length
      })

      setSummary(summaryData)
      setKeyUsage(keyUsageData)
      setToolDistribution(toolDistData)
      setTopSymbols(symbolsData)
      setErrors(errorsData)
      setCachePerformance(cacheData)
      setLastRefresh(new Date())
    } catch (error) {
      console.error('[MCP Stats] Error fetching MCP stats:', error)
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    if (user && userRole === 'admin' && !roleLoading) {
      fetchData()
      const interval = setInterval(fetchData, 30000)
      return () => clearInterval(interval)
    }
  }, [user, userRole, roleLoading, fetchData])

  // Computed values - must be before conditional returns
  const totalCapacity = keyUsage.length * 25
  const totalUsed = keyUsage.reduce((sum, key) => sum + (key.requests_today || 0), 0)
  const activeKeys = keyUsage.filter(k => (k.requests_today || 0) < 25).length
  const exhaustedKeys = keyUsage.filter(k => (k.requests_today || 0) >= 25).length

  // Filtered and sorted errors - must be before conditional returns
  const filteredErrors = useMemo(() => {
    let filtered = [...errors]

    // Apply search filter
    if (errorSearch) {
      const searchLower = errorSearch.toLowerCase()
      filtered = filtered.filter(error => 
        error.tool_name?.toLowerCase().includes(searchLower) ||
        error.error_type?.toLowerCase().includes(searchLower) ||
        error.error_message?.toLowerCase().includes(searchLower)
      )
    }

    // Apply type filter
    if (errorFilter !== 'all') {
      filtered = filtered.filter(error => error.error_type === errorFilter)
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key]
        const bVal = b[sortConfig.key]
        
        if (sortConfig.key === 'timestamp') {
          return sortConfig.direction === 'asc' 
            ? new Date(aVal) - new Date(bVal)
            : new Date(bVal) - new Date(aVal)
        }
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal
        }
        
        const aStr = String(aVal || '').toLowerCase()
        const bStr = String(bVal || '').toLowerCase()
        return sortConfig.direction === 'asc' 
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr)
      })
    }

    return filtered
  }, [errors, errorSearch, errorFilter, sortConfig])

  // Get unique error types for filter - must be before conditional returns
  const errorTypes = useMemo(() => {
    const types = new Set(errors.map(e => e.error_type).filter(Boolean))
    return Array.from(types).sort()
  }, [errors])

  // Handle column sorting
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  // Sort icon helper
  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return null
    return sortConfig.direction === 'asc' ? '↑' : '↓'
  }

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

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white/90">MCP Statistics Dashboard</h1>
            <p className="text-sm text-white/50 mt-1">
              Last updated: {lastRefresh.toLocaleTimeString()} • Auto-refresh every 30s
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={String(timeRange)} onValueChange={(val) => setTimeRange(Number(val))}>
              <SelectTrigger className="w-[140px] bg-black border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-black border-white/10">
                <SelectItem value="1">Last 24 hours</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={fetchData} 
              disabled={loading}
              className="rounded-lg border border-white/10 bg-black px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/5"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Summary Stats - Enhanced Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-black border-white/10">
            <CardHeader className="pb-2">
              <CardDescription className="text-white/50">Requests Today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400">
                {summary?.requestsToday || 0}
                <span className="text-sm text-white/50 font-normal ml-1">/ {totalCapacity}</span>
              </div>
              <div className="text-xs text-white/40 mt-2">
                {totalCapacity > 0 ? `${((totalUsed / totalCapacity) * 100).toFixed(1)}% capacity used` : 'No keys configured'}
              </div>
              <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-400 transition-all"
                  style={{ width: `${totalCapacity > 0 ? Math.min((totalUsed / totalCapacity) * 100, 100) : 0}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black border-white/10">
            <CardHeader className="pb-2">
              <CardDescription className="text-white/50">Cache Hit Rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-400">
                {summary?.cacheHitRate?.toFixed(1) || 0}%
              </div>
              <div className="text-xs text-white/40 mt-2">
                {summary?.cacheHitRate > 70 ? 'Excellent' : summary?.cacheHitRate > 50 ? 'Good' : summary?.cacheHitRate > 30 ? 'Fair' : 'Low'}
              </div>
              <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${
                    summary?.cacheHitRate > 70 ? 'bg-cyan-400' : 
                    summary?.cacheHitRate > 50 ? 'bg-blue-400' : 
                    summary?.cacheHitRate > 30 ? 'bg-yellow-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${summary?.cacheHitRate || 0}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black border-white/10">
            <CardHeader className="pb-2">
              <CardDescription className="text-white/50">Errors Today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(summary?.errorsToday || 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {summary?.errorsToday || 0}
              </div>
              <div className="text-xs text-white/40 mt-2">
                {summary?.errorsToday === 0 ? 'No errors detected' : `${summary?.errorsToday} error${summary?.errorsToday === 1 ? '' : 's'} today`}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black border-white/10">
            <CardHeader className="pb-2">
              <CardDescription className="text-white/50">Active Keys</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {activeKeys}
                <span className="text-sm text-white/50 font-normal ml-1">/ {keyUsage.length}</span>
              </div>
              <div className="text-xs text-white/40 mt-2">
                {exhaustedKeys > 0 ? `${exhaustedKeys} exhausted` : 'All keys available'}
              </div>
              <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white/20 transition-all"
                  style={{ width: `${keyUsage.length > 0 ? (activeKeys / keyUsage.length) * 100 : 0}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-black border border-white/10">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white/10">Overview</TabsTrigger>
            <TabsTrigger value="keys" className="data-[state=active]:bg-white/10">API Keys</TabsTrigger>
            <TabsTrigger value="tools" className="data-[state=active]:bg-white/10">Tool Usage</TabsTrigger>
            <TabsTrigger value="symbols" className="data-[state=active]:bg-white/10">Symbols</TabsTrigger>
            <TabsTrigger value="errors" className="data-[state=active]:bg-white/10">Errors</TabsTrigger>
            <TabsTrigger value="cache" className="data-[state=active]:bg-white/10">Cache Performance</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="bg-black border-white/10">
                <CardHeader>
                  <CardTitle className="text-lg">API Key Usage</CardTitle>
                  <CardDescription>Current day usage across all keys</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {keyUsage.length === 0 ? (
                      <div className="text-sm text-white/40 text-center py-8">No key data available</div>
                    ) : (
                      keyUsage.map((key) => {
                        const usage = key.requests_today || 0
                        const limit = 25
                        const percentage = (usage / limit) * 100
                        const isExhausted = usage >= limit

                        return (
                          <div key={key.api_key_index} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-white/80 font-medium">Key {key.api_key_index + 1}</span>
                              <span className={`font-mono ${isExhausted ? 'text-red-400' : 'text-white/60'}`}>
                                {usage}/{limit}
                              </span>
                            </div>
                            <div className="flex-1 bg-slate-800/50 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  isExhausted ? 'bg-red-400' : percentage > 80 ? 'bg-yellow-400' : 'bg-emerald-400'
                                }`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              />
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black border-white/10">
                <CardHeader>
                  <CardTitle className="text-lg">Top Tools ({timeRange}d)</CardTitle>
                  <CardDescription>Most frequently used MCP tools</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {toolDistribution.length === 0 ? (
                      <div className="text-sm text-white/40 text-center py-8">No tool usage data</div>
                    ) : (
                      toolDistribution.slice(0, 20).map((tool, idx) => (
                        <div key={tool.tool_name} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                          <div className="flex items-center gap-3">
                            <span className="text-white/30 text-xs w-6">{idx + 1}</span>
                            <span className="font-mono text-sm text-cyan-400">{tool.tool_name}</span>
                          </div>
                          <Badge variant="outline" className="bg-emerald-400/10 text-emerald-400 border-emerald-400/20">
                            {tool.count}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="keys">
            <Card className="bg-black border-white/10">
              <CardHeader>
                <CardTitle className="text-lg">API Key Management</CardTitle>
                <CardDescription>Detailed usage and status for each API key</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead className="text-white/70">Key</TableHead>
                      <TableHead className="text-white/70">Usage</TableHead>
                      <TableHead className="text-white/70">Status</TableHead>
                      <TableHead className="text-white/70">Progress</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keyUsage.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-white/40 py-8">
                          No key data available
                        </TableCell>
                      </TableRow>
                    ) : (
                      keyUsage.map((key) => {
                        const usage = key.requests_today || 0
                        const limit = 25
                        const percentage = (usage / limit) * 100
                        const isExhausted = usage >= limit
                        const isWarning = percentage > 80 && !isExhausted

                        return (
                          <TableRow key={key.api_key_index} className="border-white/5">
                            <TableCell className="font-medium text-white/90">
                              Key {key.api_key_index + 1}
                            </TableCell>
                            <TableCell className="font-mono text-white/80">
                              {usage} / {limit}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                className={
                                  isExhausted 
                                    ? 'bg-red-400/10 text-red-400 border-red-400/20' 
                                    : isWarning
                                    ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20'
                                    : 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
                                }
                              >
                                {isExhausted ? 'Exhausted' : isWarning ? 'Warning' : 'Active'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-800/50 rounded-full h-2 max-w-[200px]">
                                  <div
                                    className={`h-2 rounded-full transition-all ${
                                      isExhausted ? 'bg-red-400' : percentage > 80 ? 'bg-yellow-400' : 'bg-emerald-400'
                                    }`}
                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs text-white/50 w-12 text-right">
                                  {percentage.toFixed(0)}%
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools">
            <Card className="bg-black border-white/10">
              <CardHeader>
                <CardTitle className="text-lg">Tool Usage Distribution</CardTitle>
                <CardDescription>Usage statistics for all MCP tools over the last {timeRange} days</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead className="text-white/70">Rank</TableHead>
                      <TableHead className="text-white/70">Tool Name</TableHead>
                      <TableHead className="text-white/70 text-right">Usage Count</TableHead>
                      <TableHead className="text-white/70 text-right">Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {toolDistribution.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-white/40 py-8">
                          No tool usage data available
                        </TableCell>
                      </TableRow>
                    ) : (
                      (() => {
                        const total = toolDistribution.reduce((sum, t) => sum + t.count, 0)
                        return toolDistribution.map((tool, idx) => {
                          const percentage = total > 0 ? (tool.count / total * 100) : 0
                          return (
                            <TableRow key={tool.tool_name} className="border-white/5">
                              <TableCell className="text-white/50">#{idx + 1}</TableCell>
                              <TableCell>
                                <span className="font-mono text-cyan-400">{tool.tool_name}</span>
                              </TableCell>
                              <TableCell className="text-right font-medium text-white/90">
                                {tool.count.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-24 bg-slate-800/50 rounded-full h-2">
                                    <div
                                      className="h-2 bg-cyan-400 rounded-full"
                                      style={{ width: `${Math.min(percentage, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-sm text-white/60 w-12 text-right">
                                    {percentage.toFixed(1)}%
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      })()
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Symbols Tab */}
          <TabsContent value="symbols">
            <Card className="bg-black border-white/10">
              <CardHeader>
                <CardTitle className="text-lg">Top Queried Symbols</CardTitle>
                <CardDescription>Most frequently queried trading symbols over the last {timeRange} days</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead className="text-white/70">Rank</TableHead>
                      <TableHead className="text-white/70">Symbol</TableHead>
                      <TableHead className="text-white/70 text-right">Query Count</TableHead>
                      <TableHead className="text-white/70 text-right">Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topSymbols.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-white/40 py-8">
                          No symbol data available
                        </TableCell>
                      </TableRow>
                    ) : (
                      (() => {
                        const total = topSymbols.reduce((sum, s) => sum + s.count, 0)
                        return topSymbols.map((symbol, idx) => {
                          const percentage = total > 0 ? (symbol.count / total * 100) : 0
                          return (
                            <TableRow key={symbol.symbol} className="border-white/5">
                              <TableCell className="text-white/50">#{idx + 1}</TableCell>
                              <TableCell>
                                <span className="font-semibold text-emerald-400">{symbol.symbol}</span>
                              </TableCell>
                              <TableCell className="text-right font-medium text-white/90">
                                {symbol.count.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-24 bg-slate-800/50 rounded-full h-2">
                                    <div
                                      className="h-2 bg-emerald-400 rounded-full"
                                      style={{ width: `${Math.min(percentage, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-sm text-white/60 w-12 text-right">
                                    {percentage.toFixed(1)}%
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      })()
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Errors Tab */}
          <TabsContent value="errors">
            <Card className="bg-black border-white/10">
              <CardHeader>
                <CardTitle className="text-lg">Error Log</CardTitle>
                <CardDescription>Recent errors and failures in MCP operations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    placeholder="Search errors..."
                    value={errorSearch}
                    onChange={(e) => setErrorSearch(e.target.value)}
                    className="flex-1 bg-black border-white/10 text-white placeholder:text-white/30"
                  />
                  <Select value={errorFilter} onValueChange={setErrorFilter}>
                    <SelectTrigger className="w-full sm:w-[180px] bg-black border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-white/10">
                      <SelectItem value="all">All Types</SelectItem>
                      {errorTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Error Table */}
                <div className="border border-white/10 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead 
                          className="text-white/70 cursor-pointer hover:text-white/90"
                          onClick={() => handleSort('timestamp')}
                        >
                          Timestamp <SortIcon columnKey="timestamp" />
                        </TableHead>
                        <TableHead 
                          className="text-white/70 cursor-pointer hover:text-white/90"
                          onClick={() => handleSort('tool_name')}
                        >
                          Tool <SortIcon columnKey="tool_name" />
                        </TableHead>
                        <TableHead 
                          className="text-white/70 cursor-pointer hover:text-white/90"
                          onClick={() => handleSort('error_type')}
                        >
                          Type <SortIcon columnKey="error_type" />
                        </TableHead>
                        <TableHead className="text-white/70">Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredErrors.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-white/40 py-8">
                            {errors.length === 0 ? 'No errors recorded' : 'No errors match your filters'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredErrors.map((error) => (
                          <TableRow key={error.id} className="border-white/5">
                            <TableCell className="text-xs text-white/60 font-mono">
                              {new Date(error.timestamp).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-sm text-cyan-400">{error.tool_name || 'N/A'}</span>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-red-400/10 text-red-400 border-red-400/20">
                                {error.error_type || 'Unknown'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-md">
                                <p className="text-sm text-white/70 line-clamp-2">{error.error_message || 'No message'}</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {filteredErrors.length > 0 && (
                  <div className="text-xs text-white/40">
                    Showing {filteredErrors.length} of {errors.length} errors
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cache Performance Tab */}
          <TabsContent value="cache">
            <Card className="bg-black border-white/10">
              <CardHeader>
                <CardTitle className="text-lg">Cache Performance</CardTitle>
                <CardDescription>Cache hit rate trends over the last {timeRange} days</CardDescription>
              </CardHeader>
              <CardContent>
                {cachePerformance.length === 0 ? (
                  <div className="text-center text-white/40 py-12">
                    No cache performance data available
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/10">
                          <TableHead className="text-white/70">Date</TableHead>
                          <TableHead className="text-white/70 text-right">Cache Hits</TableHead>
                          <TableHead className="text-white/70 text-right">Cache Misses</TableHead>
                          <TableHead className="text-white/70 text-right">Total Requests</TableHead>
                          <TableHead className="text-white/70 text-right">Hit Rate</TableHead>
                          <TableHead className="text-white/70">Performance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cachePerformance.map((day) => {
                          const hitRate = parseFloat(day.hitRate || 0)
                          const total = day.hits + day.misses
                          return (
                            <TableRow key={day.date} className="border-white/5">
                              <TableCell className="font-medium text-white/90">
                                {new Date(day.date).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-right text-emerald-400 font-medium">
                                {day.hits.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right text-red-400 font-medium">
                                {day.misses.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right text-white/80 font-medium">
                                {total.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-24 bg-slate-800/50 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full ${
                                        hitRate > 70 ? 'bg-cyan-400' : 
                                        hitRate > 50 ? 'bg-blue-400' : 
                                        hitRate > 30 ? 'bg-yellow-400' : 'bg-red-400'
                                      }`}
                                      style={{ width: `${Math.min(hitRate, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium text-white/90 w-16 text-right">
                                    {hitRate.toFixed(1)}%
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  className={
                                    hitRate > 70 
                                      ? 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20' 
                                      : hitRate > 50
                                      ? 'bg-blue-400/10 text-blue-400 border-blue-400/20'
                                      : hitRate > 30
                                      ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20'
                                      : 'bg-red-400/10 text-red-400 border-red-400/20'
                                  }
                                >
                                  {hitRate > 70 ? 'Excellent' : hitRate > 50 ? 'Good' : hitRate > 30 ? 'Fair' : 'Poor'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

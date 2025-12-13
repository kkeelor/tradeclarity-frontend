// app/api/admin/mcp-stats/route.js
/**
 * MCP Stats API Endpoint
 * 
 * Provides analytics data for MCP monitoring dashboard
 * Protected route - requires authentication
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import {
  getSummaryStats,
  getRequestsPerKeyToday,
  getToolUsageDistribution,
  getMostQueriedSymbols,
  getRecentErrors,
  getCachePerformanceOverTime
} from '@/lib/ai/mcpAnalytics'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    // Check authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has admin role
    const { data: userData, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (roleError || !userData) {
      console.error('[MCP Stats API] Error fetching user role:', roleError)
      return NextResponse.json(
        { error: 'Failed to verify permissions' },
        { status: 500 }
      )
    }

    if (userData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint') || 'summary'

    switch (endpoint) {
      case 'summary':
        const summary = await getSummaryStats()
        return NextResponse.json(summary)

      case 'key-usage':
        const keyUsage = await getRequestsPerKeyToday()
        return NextResponse.json(keyUsage)

      case 'tool-distribution':
        const days = parseInt(searchParams.get('days')) || 7
        const toolDistribution = await getToolUsageDistribution(days)
        return NextResponse.json(toolDistribution)

      case 'top-symbols':
        const symbolDays = parseInt(searchParams.get('days')) || 7
        const limit = parseInt(searchParams.get('limit')) || 10
        const topSymbols = await getMostQueriedSymbols(symbolDays, limit)
        return NextResponse.json(topSymbols)

      case 'errors':
        const errorLimit = parseInt(searchParams.get('limit')) || 20
        const errors = await getRecentErrors(errorLimit)
        return NextResponse.json(errors)

      case 'cache-performance':
        const cacheDays = parseInt(searchParams.get('days')) || 7
        const cachePerformance = await getCachePerformanceOverTime(cacheDays)
        return NextResponse.json(cachePerformance)

      default:
        return NextResponse.json(
          { error: 'Invalid endpoint' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[MCP Stats API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

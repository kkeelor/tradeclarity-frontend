// app/api/analytics/cache/route.js
// Retrieves cached analytics from user_analytics_cache table
// Related: ANALYTICS_DATA_FLOW_STRATEGY.md, CLAUDE_AI_OPTIMIZATION_STRATEGY.md

import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 1. Check cache
    const { data: cached, error: cacheError } = await supabase
      .from('user_analytics_cache')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (cacheError && cacheError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching cache:', cacheError)
      return NextResponse.json(
        { success: false, error: 'CACHE_ERROR', message: cacheError.message },
        { status: 500 }
      )
    }

    // 2. If cache valid and not expired, verify trades still exist
    if (cached && new Date(cached.expires_at) > new Date()) {
      // Safety check: Verify trades still exist (cache might be stale if trades were deleted)
      const { count: tradesCount } = await supabase
        .from('trades')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      
      // If no trades exist but cache says there are trades, invalidate cache
      if (tradesCount === 0 && cached.total_trades > 0) {
        console.warn(`⚠️  Cache inconsistency detected: cache has ${cached.total_trades} trades but database has 0. Invalidating cache.`)
        await supabase
          .from('user_analytics_cache')
          .delete()
          .eq('user_id', user.id)
          .catch(() => {}) // Ignore errors
        
        return NextResponse.json({
          success: false,
          cached: false,
          analytics: null,
          aiContext: null,
          allTrades: null,
          psychology: null,
          message: 'Analytics not cached. No trades found.'
        })
      }
      
      // Cache is valid and trades exist - return it
      const response = NextResponse.json({
        success: true,
        analytics: cached.analytics_data,
        aiContext: cached.ai_context,
        allTrades: cached.analytics_data?.allTrades || [],
        psychology: cached.analytics_data?.psychology || null,
        cached: true,
        computedAt: cached.computed_at,
        expiresAt: cached.expires_at
      })
      
      // Add HTTP caching headers - cache for 1 minute, allow stale-while-revalidate
      response.headers.set('Cache-Control', 'private, s-maxage=60, stale-while-revalidate=120')
      
      return response
    }

    // 3. Cache miss or expired - return null (trigger computation)
    return NextResponse.json({
      success: false,
      cached: false,
      analytics: null,
      aiContext: null,
      allTrades: null,
      psychology: null,
      message: 'Analytics not cached. Computation triggered.'
    })
  } catch (error) {
    console.error('Error fetching analytics cache:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: error.message },
      { status: 500 }
    )
  }
}

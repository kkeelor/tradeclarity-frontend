// app/api/analytics/refresh/route.js
// Manually refresh analytics cache by forcing recomputation
// Useful for testing and immediate cache updates

import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request) {
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

    // Delete existing cache to force recomputation
    const { error: deleteError } = await supabase
      .from('user_analytics_cache')
      .delete()
      .eq('user_id', user.id)

    if (deleteError && deleteError.code !== 'PGRST116') { // PGRST116 = not found (ok)
      console.error('Error deleting cache:', deleteError)
      return NextResponse.json(
        { success: false, error: 'FAILED_TO_DELETE_CACHE', message: deleteError.message },
        { status: 500 }
      )
    }

    // Trigger recomputation by calling the compute endpoint
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const host = request.headers.get('host') || 'localhost:3000'
    const baseUrl = `${protocol}://${host}`

    try {
      const computeResponse = await fetch(`${baseUrl}/api/analytics/compute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Forward authorization header if present
          ...(request.headers.get('authorization') && {
            'authorization': request.headers.get('authorization')
          })
        },
        body: JSON.stringify({
          trigger: 'manual_refresh',
          userId: user.id
        })
      })

      const computeData = await computeResponse.json()

      if (!computeData.success) {
        return NextResponse.json({
          success: false,
          error: 'COMPUTE_FAILED',
          message: computeData.message || 'Failed to recompute analytics',
          details: computeData
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Cache refreshed successfully',
        computed: computeData.computed,
        cached: computeData.cached,
        totalTrades: computeData.totalTrades,
        computedAt: computeData.computedAt
      })
    } catch (fetchError) {
      console.error('Error triggering recomputation:', fetchError)
      return NextResponse.json({
        success: false,
        error: 'FETCH_ERROR',
        message: fetchError.message
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Error refreshing cache:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: error.message },
      { status: 500 }
    )
  }
}

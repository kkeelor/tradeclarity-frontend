// app/api/exchange/list/route.js
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log('❌ [List Exchanges] Auth error or no user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 [List Exchanges] Fetching connections for user:', user.id)

    // Fetch user's exchange connections
    const { data: connections, error: fetchError } = await supabase
      .from('exchange_connections')
      .select('id, exchange, is_active, created_at, updated_at, last_synced')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('❌ [List Exchanges] Error fetching connections:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch exchange connections' },
        { status: 500 }
      )
    }

    console.log(`✅ [List Exchanges] Found ${connections?.length || 0} connections`)
    console.log('📋 [List Exchanges] Connections:', JSON.stringify(connections, null, 2))

    return NextResponse.json({
      success: true,
      connections: connections || []
    })
  } catch (error) {
    console.error('List exchanges error:', error)
    return NextResponse.json(
      { error: 'Failed to list exchanges' },
      { status: 500 }
    )
  }
}

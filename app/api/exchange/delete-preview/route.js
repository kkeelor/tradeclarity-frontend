// app/api/exchange/delete-preview/route.js
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

/**
 * Preview the impact of deleting an exchange connection
 * Returns counts of what will be affected
 */
export async function POST(request) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { connectionId } = await request.json()

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Missing required field: connectionId' },
        { status: 400 }
      )
    }

    console.log(`📊 Previewing deletion impact for exchange connection ${connectionId}...`)

    // Count API-imported trades (trades with this exchange_connection_id)
    const { count: apiTradesCount, error: apiTradesError } = await supabase
      .from('trades')
      .select('*', { count: 'exact', head: true })
      .eq('exchange_connection_id', connectionId)
      .eq('user_id', user.id)

    if (apiTradesError) {
      console.error('Error counting API trades:', apiTradesError)
      return NextResponse.json(
        { error: 'Failed to count API trades' },
        { status: 500 }
      )
    }

    // Find CSV files linked to this exchange
    const { data: linkedCSVs, error: csvError } = await supabase
      .from('csv_uploads')
      .select('id, trades_count')
      .eq('exchange_connection_id', connectionId)
      .eq('user_id', user.id)

    if (csvError) {
      console.error('Error fetching linked CSVs:', csvError)
      return NextResponse.json(
        { error: 'Failed to fetch linked CSV files' },
        { status: 500 }
      )
    }

    const csvFilesCount = linkedCSVs?.length || 0
    const csvTradesCount = linkedCSVs?.reduce((sum, csv) => sum + (csv.trades_count || 0), 0) || 0

    console.log(`📊 Deletion impact:`)
    console.log(`   - API trades: ${apiTradesCount}`)
    console.log(`   - Linked CSV files: ${csvFilesCount}`)
    console.log(`   - CSV trades: ${csvTradesCount}`)

    return NextResponse.json({
      success: true,
      apiTrades: apiTradesCount || 0,
      csvFiles: csvFilesCount,
      csvTrades: csvTradesCount,
      linkedCSVIds: linkedCSVs?.map(csv => csv.id) || []
    })
  } catch (error) {
    console.error('Delete preview error:', error)
    return NextResponse.json(
      { error: 'Failed to preview deletion impact', details: error.message },
      { status: 500 }
    )
  }
}

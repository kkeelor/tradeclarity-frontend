// app/api/exchange/delete/route.js
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

/**
 * Delete an exchange connection and handle associated data
 *
 * Flow:
 * 1. Delete all API-imported trades (where exchange_connection_id = connectionId)
 * 2. Handle linked CSV files:
 *    - If deleteLinkedCSVs = true: Delete CSV files (cascade deletes their trades)
 *    - If deleteLinkedCSVs = false: Unlink CSVs (set exchange_connection_id = null)
 * 3. Delete the exchange connection
 */
export async function POST(request) {
  try {
    const supabase = createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { connectionId, deleteLinkedCSVs = false } = await request.json()

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      )
    }

    console.log(`🗑️  Deleting exchange connection ${connectionId}...`)
    console.log(`   - Delete linked CSVs: ${deleteLinkedCSVs}`)

    // Step 1: Delete all API-imported trades for this connection
    const { data: deletedApiTrades, error: apiTradesError } = await supabase
      .from('trades')
      .delete()
      .eq('exchange_connection_id', connectionId)
      .eq('user_id', user.id)
      .select('id')

    if (apiTradesError) {
      console.error('Error deleting API trades:', apiTradesError)
      return NextResponse.json(
        { error: 'Failed to delete API-imported trades' },
        { status: 500 }
      )
    }

    const apiTradesDeleted = deletedApiTrades?.length || 0
    console.log(`✅ Deleted ${apiTradesDeleted} API-imported trades`)

    // Step 2: Handle linked CSV files
    let csvFilesDeleted = 0
    let csvFilesUnlinked = 0
    let csvTradesDeleted = 0

    if (deleteLinkedCSVs) {
      // Delete all linked CSV files (cascade will delete their trades)
      const { data: deletedCSVs, error: csvDeleteError } = await supabase
        .from('csv_uploads')
        .delete()
        .eq('exchange_connection_id', connectionId)
        .eq('user_id', user.id)
        .select('id, trades_count')

      if (csvDeleteError) {
        console.error('Error deleting linked CSVs:', csvDeleteError)
        return NextResponse.json(
          { error: 'Failed to delete linked CSV files' },
          { status: 500 }
        )
      }

      csvFilesDeleted = deletedCSVs?.length || 0
      csvTradesDeleted = deletedCSVs?.reduce((sum, csv) => sum + (csv.trades_count || 0), 0) || 0
      console.log(`✅ Deleted ${csvFilesDeleted} CSV files and ${csvTradesDeleted} CSV trades`)
    } else {
      // Just unlink CSV files, don't delete them
      const { data: unlinkedCSVs, error: csvUnlinkError } = await supabase
        .from('csv_uploads')
        .update({ exchange_connection_id: null })
        .eq('exchange_connection_id', connectionId)
        .eq('user_id', user.id)
        .select('id')

      if (csvUnlinkError) {
        console.error('Error unlinking CSVs:', csvUnlinkError)
        return NextResponse.json(
          { error: 'Failed to unlink CSV files' },
          { status: 500 }
        )
      }

      csvFilesUnlinked = unlinkedCSVs?.length || 0
      console.log(`✅ Unlinked ${csvFilesUnlinked} CSV files (kept trades)`)
    }

    // Step 3: Delete the exchange connection itself
    const { error: deleteError } = await supabase
      .from('exchange_connections')
      .delete()
      .eq('id', connectionId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting exchange connection:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete exchange connection' },
        { status: 500 }
      )
    }

    console.log(`✅ Exchange connection deleted successfully`)

    const totalTradesDeleted = apiTradesDeleted + csvTradesDeleted

    return NextResponse.json({
      success: true,
      message: 'Exchange connection deleted successfully',
      apiTradesDeleted,
      csvFilesDeleted,
      csvFilesUnlinked,
      csvTradesDeleted,
      totalTradesDeleted
    })
  } catch (error) {
    console.error('Delete exchange error:', error)
    return NextResponse.json(
      { error: 'Failed to delete exchange', details: error.message },
      { status: 500 }
    )
  }
}

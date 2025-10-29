// app/api/csv/delete/route.js
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const supabase = createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fileId } = await request.json()

    if (!fileId) {
      return NextResponse.json(
        { error: 'Missing required field: fileId' },
        { status: 400 }
      )
    }

    console.log(`🗑️ Deleting CSV file ${fileId} and associated trades...`)

    // Get CSV file info first to know the expected trades count
    const { data: csvFile, error: csvFetchError } = await supabase
      .from('csv_uploads')
      .select('trades_count, uploaded_at')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single()

    if (csvFetchError || !csvFile) {
      console.error('Error fetching CSV file:', csvFetchError)
      return NextResponse.json(
        { error: 'CSV file not found' },
        { status: 404 }
      )
    }

    console.log(`📊 CSV file has ${csvFile.trades_count || 0} trades recorded`)

    // First, delete all trades associated with this CSV
    const { data: deletedTrades, error: tradesDeleteError } = await supabase
      .from('trades')
      .delete()
      .eq('csv_upload_id', fileId)
      .eq('user_id', user.id)  // Security: only delete own trades
      .select('id')

    if (tradesDeleteError) {
      console.error('Error deleting associated trades:', tradesDeleteError)
      return NextResponse.json(
        { error: 'Failed to delete associated trades' },
        { status: 500 }
      )
    }

    const tradesDeleted = deletedTrades?.length || 0
    console.log(`✅ Deleted ${tradesDeleted} associated trades`)

    // Warning if counts don't match (indicates data integrity issue)
    if (tradesDeleted !== csvFile.trades_count) {
      console.warn(`⚠️  Trade count mismatch! Expected ${csvFile.trades_count}, deleted ${tradesDeleted}`)
      console.warn(`⚠️  This may indicate trades from this CSV don't have csv_upload_id properly set`)
    }

    // Then delete the CSV upload record
    const { error: deleteError } = await supabase
      .from('csv_uploads')
      .delete()
      .eq('id', fileId)
      .eq('user_id', user.id) // Security: only delete own files

    if (deleteError) {
      console.error('Error deleting CSV file:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete file' },
        { status: 500 }
      )
    }

    console.log(`✅ CSV file deleted successfully`)

    return NextResponse.json({
      success: true,
      message: 'File and associated trades deleted successfully',
      tradesDeleted: tradesDeleted,
      expectedTradesCount: csvFile.trades_count,
      hasDataIntegrityIssue: tradesDeleted !== csvFile.trades_count
    })
  } catch (error) {
    console.error('Delete CSV file error:', error)
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    )
  }
}

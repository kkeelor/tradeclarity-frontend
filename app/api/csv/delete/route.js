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

    console.log(`✅ Deleted ${deletedTrades?.length || 0} associated trades`)

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
      tradesDeleted: deletedTrades?.length || 0
    })
  } catch (error) {
    console.error('Delete CSV file error:', error)
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    )
  }
}

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

    // Delete the CSV upload record
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

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    })
  } catch (error) {
    console.error('Delete CSV file error:', error)
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    )
  }
}

// app/api/csv/link-exchange/route.js
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fileId, exchangeConnectionId } = await request.json()

    if (!fileId) {
      return NextResponse.json(
        { error: 'Missing required field: fileId' },
        { status: 400 }
      )
    }

    // Update the CSV upload record
    const { error: updateError } = await supabase
      .from('csv_uploads')
      .update({ exchange_connection_id: exchangeConnectionId })
      .eq('id', fileId)
      .eq('user_id', user.id) // Security: only update own files

    if (updateError) {
      console.error('Error linking exchange:', updateError)
      return NextResponse.json(
        { error: 'Failed to link exchange' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Exchange linked successfully'
    })
  } catch (error) {
    console.error('Link exchange error:', error)
    return NextResponse.json(
      { error: 'Failed to link exchange' },
      { status: 500 }
    )
  }
}

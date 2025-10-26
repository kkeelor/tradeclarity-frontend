// app/api/exchange/delete/route.js
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

    const { connectionId } = await request.json()

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      )
    }

    // Delete the connection (soft delete by setting is_active to false)
    const { error: deleteError } = await supabase
      .from('exchange_connections')
      .update({ is_active: false })
      .eq('id', connectionId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting connection:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete exchange connection' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Exchange connection deleted successfully'
    })
  } catch (error) {
    console.error('Delete exchange error:', error)
    return NextResponse.json(
      { error: 'Failed to delete exchange' },
      { status: 500 }
    )
  }
}

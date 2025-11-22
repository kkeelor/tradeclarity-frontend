// app/api/admin/check-role/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check user role from database (server-side can bypass RLS if needed)
    const { data: userData, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (roleError) {
      console.error('[Admin Check Role API] Error fetching user role:', roleError)
      return NextResponse.json(
        { error: 'Failed to verify permissions', details: roleError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      role: userData?.role || 'user',
      isAdmin: userData?.role === 'admin'
    })
  } catch (error) {
    console.error('[Admin Check Role API] Exception:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// app/api/snaptrade/check-registration/route.js
// Check if user is already registered with Snaptrade (without creating user)
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('❌ [Snaptrade Check] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user already registered with Snaptrade
    const { data: existing, error: fetchError } = await supabase
      .from('snaptrade_users')
      .select('id, snaptrade_user_id, user_id')
      .eq('user_id', user.id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected for unregistered users
      console.error('❌ [Snaptrade Check] Error checking registration:', fetchError)
      return NextResponse.json(
        { error: 'Failed to check registration status' },
        { status: 500 }
      )
    }

    const isRegistered = !!existing

    console.log('🔍 [Snaptrade Check] User registration status:', {
      userId: user.id,
      isRegistered,
      snaptradeUserId: existing?.snaptrade_user_id,
    })

    return NextResponse.json({
      isRegistered,
      snaptradeUserId: existing?.snaptrade_user_id || null,
    })
  } catch (error) {
    console.error('❌ [Snaptrade Check] Error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to check registration status',
      },
      { status: 500 }
    )
  }
}

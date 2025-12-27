// app/api/snaptrade/check-registration/route.js
// Proxy to backend API for SnapTrade registration check
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const supabase = await createClient()

    // Get current user and auth token
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('❌ [Snaptrade Check] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get session token for backend authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      return NextResponse.json({ error: 'No session token available' }, { status: 401 })
    }

    // Proxy request to backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/snaptrade/check-registration`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    })

    const backendData = await backendResponse.json()

    // Transform backend response to match frontend format
    return NextResponse.json({
      isRegistered: backendData.registered || false,
      snaptradeUserId: backendData.snaptradeUserId || null,
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

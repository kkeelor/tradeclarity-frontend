// app/api/snaptrade/register/route.js
// Proxy to backend API for SnapTrade user registration
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

export async function POST(request) {
  try {
    const supabase = await createClient()

    // Get current user and auth token
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('❌ [Snaptrade Register] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get session token for backend authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      return NextResponse.json({ error: 'No session token available' }, { status: 401 })
    }

    // Proxy request to backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/snaptrade/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    })

    const data = await backendResponse.json()

    return NextResponse.json(data, { status: backendResponse.status })
  } catch (error) {
    console.error('❌ [Snaptrade Register] Error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to register with Snaptrade',
      },
      { status: 500 }
    )
  }
}

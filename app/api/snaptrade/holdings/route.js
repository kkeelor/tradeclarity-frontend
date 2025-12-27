// app/api/snaptrade/holdings/route.js
// Proxy to backend API for SnapTrade holdings
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    console.log('📊 [Snaptrade Holdings] API called')
    const supabase = await createClient()

    // Get current user and auth token
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('❌ [Snaptrade Holdings] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get session token for backend authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      return NextResponse.json({ error: 'No session token available' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    // Build backend URL
    let backendUrl = `${BACKEND_URL}/api/snaptrade/holdings`
    if (accountId) {
      backendUrl += `/${accountId}`
    }

    // Proxy request to backend
    let backendResponse
    let backendData

    try {
      backendResponse = await fetch(backendUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      backendData = await backendResponse.json().catch(() => {
        return { error: `Backend returned status ${backendResponse.status}` }
      })

      if (!backendResponse.ok) {
        console.error('❌ [Snaptrade Holdings] Backend error:', {
          status: backendResponse.status,
          statusText: backendResponse.statusText,
          data: backendData,
        })
        return NextResponse.json(backendData, { status: backendResponse.status })
      }
    } catch (fetchError) {
      console.error('❌ [Snaptrade Holdings] Fetch error:', fetchError)
      return NextResponse.json(
        {
          error: 'Failed to connect to backend server',
          details: fetchError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(backendData)
  } catch (error) {
    console.error('❌ [Snaptrade Holdings] Error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch Snaptrade holdings',
      },
      { status: 500 }
    )
  }
}

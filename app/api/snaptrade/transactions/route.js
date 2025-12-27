// app/api/snaptrade/transactions/route.js
// Proxy to backend API for SnapTrade transactions (with frontend filtering for hidden brokerages)
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    console.log('📊 [Snaptrade Transactions] API called')
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('❌ [Snaptrade Transactions] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const accounts = searchParams.get('accounts')
    const type = searchParams.get('type')

    // Get hidden brokerages from database (frontend-specific feature)
    const { data: snaptradeUser } = await supabase
      .from('snaptrade_users')
      .select('hidden_brokerages')
      .eq('user_id', user.id)
      .single()

    // Get session token for backend authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      return NextResponse.json({ error: 'No session token available' }, { status: 401 })
    }

    // Build query params for backend
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    if (accounts) params.append('accounts', accounts)
    if (type) params.append('type', type)

    const queryString = params.toString()
    const backendUrl = `${BACKEND_URL}/api/snaptrade/activities${queryString ? `?${queryString}` : ''}`

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
        // If JSON parsing fails, return error text
        return { error: `Backend returned status ${backendResponse.status}` }
      })

      if (!backendResponse.ok) {
        console.error('❌ [Snaptrade Transactions] Backend error:', {
          status: backendResponse.status,
          statusText: backendResponse.statusText,
          data: backendData,
        })
        return NextResponse.json(backendData, { status: backendResponse.status })
      }
    } catch (fetchError) {
      console.error('❌ [Snaptrade Transactions] Fetch error:', fetchError)
      return NextResponse.json(
        {
          error: 'Failed to connect to backend server',
          details: fetchError.message,
        },
        { status: 500 }
      )
    }

    // Parse hidden brokerages (frontend-specific feature)
    let hiddenBrokerages = []
    if (snaptradeUser?.hidden_brokerages) {
      try {
        hiddenBrokerages = Array.isArray(snaptradeUser.hidden_brokerages)
          ? snaptradeUser.hidden_brokerages
          : JSON.parse(snaptradeUser.hidden_brokerages)
      } catch (e) {
        console.warn('⚠️ [Snaptrade Transactions] Failed to parse hidden_brokerages:', e)
        hiddenBrokerages = []
      }
    }

    const allActivities = backendData.activities || []

    // Filter out activities from hidden brokerages
    const activities = (allActivities || []).filter(activity => {
      const institutionName = activity.account?.institution_name || activity.institution_name
      const isHidden = institutionName && hiddenBrokerages.includes(institutionName)
      return !isHidden
    })

    // Group activities by account for debugging
    const activitiesByAccount = {}
    activities.forEach(a => {
      const accountId = a.account?.id || 'unknown'
      if (!activitiesByAccount[accountId]) {
        activitiesByAccount[accountId] = {
          accountName: a.account?.name || 'Unknown',
          count: 0,
          activities: []
        }
      }
      activitiesByAccount[accountId].count++
      if (activitiesByAccount[accountId].activities.length < 2) {
        activitiesByAccount[accountId].activities.push({
          id: a.id,
          type: a.type,
          symbol: a.symbol?.symbol,
          date: a.trade_date,
        })
      }
    })

    console.log(`✅ [Snaptrade Transactions] Fetched ${activities.length} activities:`, {
      count: activities.length,
      byAccount: activitiesByAccount,
      firstFew: activities.slice(0, 3).map(a => ({
        id: a.id,
        type: a.type,
        symbol: a.symbol?.symbol,
        date: a.trade_date,
        accountId: a.account?.id,
        accountName: a.account?.name,
      })),
    })

    return NextResponse.json({
      success: true,
      activities: activities || [],
      count: activities.length,
    })
  } catch (error) {
    console.error('❌ [Snaptrade Transactions] Error:', {
      error: error.message,
      stack: error.stack,
      response: error.response?.data,
    })
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch Snaptrade transactions',
      },
      { status: 500 }
    )
  }
}

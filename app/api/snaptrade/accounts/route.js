// app/api/snaptrade/accounts/route.js
// Proxy to backend API for SnapTrade accounts (with frontend filtering for hidden brokerages)
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    console.log('📊 [Snaptrade Accounts] API called')
    const supabase = await createClient()

    // Get current user and auth token
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('❌ [Snaptrade Accounts] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get session token for backend authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      return NextResponse.json({ error: 'No session token available' }, { status: 401 })
    }

    // Get hidden brokerages from database (frontend-specific feature)
    const { data: snaptradeUser } = await supabase
      .from('snaptrade_users')
      .select('hidden_brokerages')
      .eq('user_id', user.id)
      .single()

    // Parse hidden brokerages
    let hiddenBrokerages = []
    if (snaptradeUser?.hidden_brokerages) {
      try {
        hiddenBrokerages = Array.isArray(snaptradeUser.hidden_brokerages)
          ? snaptradeUser.hidden_brokerages
          : JSON.parse(snaptradeUser.hidden_brokerages)
      } catch (e) {
        console.warn('⚠️ [Snaptrade Accounts] Failed to parse hidden_brokerages:', e)
        hiddenBrokerages = []
      }
    }

    // Proxy request to backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/snaptrade/accounts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    })

    const backendData = await backendResponse.json()

    if (!backendResponse.ok) {
      return NextResponse.json(backendData, { status: backendResponse.status })
    }

    // Filter out accounts from hidden brokerages (frontend-specific feature)
    const allAccounts = backendData.accounts || []
    const visibleAccounts = allAccounts.filter(account => {
      const institutionName = account.institution_name
      const isHidden = institutionName && hiddenBrokerages.includes(institutionName)
      return !isHidden
    })

    console.log(`✅ [Snaptrade Accounts] Found ${allAccounts.length} total accounts, ${visibleAccounts.length} visible (${hiddenBrokerages.length} brokerages hidden)`)

    return NextResponse.json({
      success: true,
      accounts: visibleAccounts,
      hiddenBrokerages, // Include so UI knows which are hidden
    })
  } catch (error) {
    console.error('❌ [Snaptrade Accounts] Error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch Snaptrade accounts',
      },
      { status: 500 }
    )
  }
}

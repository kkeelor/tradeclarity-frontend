// app/api/snaptrade/fetch-and-store/route.js
// Fetch transactions from Snaptrade and store them in TradeClarity format
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getActivities } from '@/lib/snaptrade-client'
import { decrypt } from '@/lib/encryption'
import { transformActivitiesToTrades } from '@/lib/snaptrade-transform'

export async function POST(request) {
  try {
    const supabase = createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('❌ [Snaptrade Fetch] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { startDate, endDate, accounts, accountId } = await request.json()

    // Get Snaptrade user data
    const { data: snaptradeUser, error: fetchError } = await supabase
      .from('snaptrade_users')
      .select('snaptrade_user_id, user_secret_encrypted')
      .eq('user_id', user.id)
      .single()

    if (fetchError || !snaptradeUser) {
      return NextResponse.json(
        {
          error: 'User not registered with Snaptrade. Please register first.',
        },
        { status: 404 }
      )
    }

    // Decrypt userSecret
    const userSecret = decrypt(snaptradeUser.user_secret_encrypted)

    // Fetch activities from Snaptrade
    const activities = await getActivities(
      snaptradeUser.snaptrade_user_id,
      userSecret,
      {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        accounts: accounts || accountId || undefined,
      }
    )

    // Transform activities to TradeClarity trades format
    const trades = transformActivitiesToTrades(activities)

    console.log(
      `✅ [Snaptrade Fetch] Fetched ${activities.length} activities, transformed to ${trades.length} trades`
    )

    // Store trades via the standard store endpoint
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const host = request.headers.get('host') || 'localhost:3000'
    const baseUrl = `${protocol}://${host}`

    const storeResponse = await fetch(`${baseUrl}/api/trades/store`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward authorization if present
        ...(request.headers.get('authorization') && {
          authorization: request.headers.get('authorization'),
        }),
      },
      body: JSON.stringify({
        spotTrades: trades,
        futuresIncome: [], // Snaptrade doesn't provide futures income in activities
        userId: user.id,
        exchange: 'snaptrade',
        connectionId: accountId || null,
        metadata: {
          primaryCurrency: 'USD',
          accountType: 'SPOT',
          source: 'snaptrade',
        },
      }),
    })

    const storeResult = await storeResponse.json()

    if (!storeResponse.ok) {
      return NextResponse.json(
        {
          error: storeResult.error || 'Failed to store trades',
          details: storeResult,
        },
        { status: storeResponse.status }
      )
    }

    return NextResponse.json({
      success: true,
      activitiesFetched: activities.length,
      tradesTransformed: trades.length,
      tradesStored: storeResult.tradesCount || 0,
      storeResult,
    })
  } catch (error) {
    console.error('❌ [Snaptrade Fetch] Error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch and store Snaptrade transactions',
      },
      { status: 500 }
    )
  }
}

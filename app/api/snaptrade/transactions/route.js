// app/api/snaptrade/transactions/route.js
// Fetch transaction history (activities) from Snaptrade
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getActivities } from '@/lib/snaptrade-client'
import { decrypt } from '@/lib/encryption'

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

    console.log('📊 [Snaptrade Transactions] User authenticated:', {
      userId: user.id,
      email: user.email,
    })

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const accounts = searchParams.get('accounts')
    const type = searchParams.get('type')

    console.log('📊 [Snaptrade Transactions] Query params:', {
      startDate,
      endDate,
      accounts,
      type,
    })

    // Get Snaptrade user data
    const { data: snaptradeUser, error: fetchError } = await supabase
      .from('snaptrade_users')
      .select('snaptrade_user_id, user_secret_encrypted')
      .eq('user_id', user.id)
      .single()

    if (fetchError || !snaptradeUser) {
      console.error('❌ [Snaptrade Transactions] User not found:', {
        error: fetchError,
        userId: user.id,
      })
      return NextResponse.json(
        {
          error: 'User not registered with Snaptrade. Please register first.',
        },
        { status: 404 }
      )
    }

    console.log('📊 [Snaptrade Transactions] Snaptrade user found:', {
      snaptradeUserId: snaptradeUser.snaptrade_user_id,
      hasSecret: !!snaptradeUser.user_secret_encrypted,
    })

    // Decrypt userSecret
    const userSecret = decrypt(snaptradeUser.user_secret_encrypted)
    console.log('📊 [Snaptrade Transactions] User secret decrypted, fetching activities from Snaptrade API...')

    // Fetch activities from Snaptrade
    const activities = await getActivities(
      snaptradeUser.snaptrade_user_id,
      userSecret,
      {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        accounts: accounts || undefined,
        type: type || undefined,
      }
    )

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

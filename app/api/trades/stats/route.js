// app/api/trades/stats/route.js
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Lightweight endpoint that only returns trade statistics/metadata
 * without fetching all trade data. Much faster for dashboard loading.
 */
export async function GET(request) {
  try {
    const supabase = createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use count queries instead of fetching all trades - much faster!
    const { count: totalTrades, error: countError } = await supabase
      .from('trades')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (countError) {
      console.error('Error counting trades:', countError)
      return NextResponse.json(
        { error: 'Failed to fetch trade stats' },
        { status: 500 }
      )
    }

    // Get trade type counts
    const { count: spotCount } = await supabase
      .from('trades')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('account_type', 'SPOT')

    const { count: futuresCount } = await supabase
      .from('trades')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('account_type', 'FUTURES')

    // Get date range (only fetch first and last trade times, not all trades)
    const { data: oldestTrade } = await supabase
      .from('trades')
      .select('trade_time')
      .eq('user_id', user.id)
      .order('trade_time', { ascending: true })
      .limit(1)
      .single()

    const { data: newestTrade } = await supabase
      .from('trades')
      .select('trade_time')
      .eq('user_id', user.id)
      .order('trade_time', { ascending: false })
      .limit(1)
      .single()

    // Get unique exchanges (using distinct query)
    const { data: exchangeData } = await supabase
      .from('trades')
      .select('exchange')
      .eq('user_id', user.id)

    const uniqueExchanges = [...new Set(exchangeData?.map(t => t.exchange) || [])]

    // Detect primary currency based on exchange
    let primaryCurrency = 'USD'
    if (uniqueExchanges.length === 1 && uniqueExchanges[0] === 'coindcx') {
      primaryCurrency = 'INR'
    } else if (uniqueExchanges.includes('coindcx')) {
      primaryCurrency = 'INR'
    }

    // Try to get portfolio snapshot (lightweight - just latest)
    let portfolioSnapshot = null
    try {
      const { data: snapshots } = await supabase
        .from('portfolio_snapshots')
        .select('total_portfolio_value, total_spot_value, total_futures_value, snapshot_time, primary_currency')
        .eq('user_id', user.id)
        .order('snapshot_time', { ascending: false })
        .limit(1)

      if (snapshots && snapshots.length > 0) {
        portfolioSnapshot = snapshots[0]
      }
    } catch (snapshotErr) {
      // Ignore snapshot errors - not critical for stats
    }

    const metadata = {
      primaryCurrency: primaryCurrency,
      availableCurrencies: ['USD', 'INR', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CNY', 'SGD', 'CHF'],
      supportsCurrencySwitch: true,
      exchanges: uniqueExchanges,
      totalTrades: totalTrades || 0,
      spotTrades: spotCount || 0,
      futuresIncome: futuresCount || 0,
      oldestTrade: oldestTrade?.trade_time || null,
      newestTrade: newestTrade?.trade_time || null,
      accountType: (spotCount || 0) > 0 && (futuresCount || 0) > 0 ? 'MIXED' : (spotCount || 0) > 0 ? 'SPOT' : 'FUTURES',
      hasSpot: (spotCount || 0) > 0,
      hasFutures: (futuresCount || 0) > 0,
      // Include portfolio snapshot data if available
      ...(portfolioSnapshot && {
        totalPortfolioValue: parseFloat(portfolioSnapshot.total_portfolio_value || 0),
        totalSpotValue: parseFloat(portfolioSnapshot.total_spot_value || 0),
        totalFuturesValue: parseFloat(portfolioSnapshot.total_futures_value || 0),
        snapshotTime: portfolioSnapshot.snapshot_time
      })
    }

    console.log(`?? Stats endpoint: ${totalTrades} total trades (${spotCount} spot, ${futuresCount} futures)`)

    return NextResponse.json({
      success: true,
      metadata
    })
  } catch (error) {
    console.error('Fetch stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trade stats' },
      { status: 500 }
    )
  }
}

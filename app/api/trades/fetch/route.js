// app/api/trades/fetch/route.js
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const supabase = createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get optional query parameters for filtering
    const { searchParams } = new URL(request.url)
    const connectionId = searchParams.get('connectionId')
    const exchange = searchParams.get('exchange')

    // Build query with optional filters
    let query = supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)

    // Apply filters if provided (for single exchange analytics)
    if (connectionId) {
      query = query.eq('exchange_connection_id', connectionId)
    } else if (exchange) {
      query = query.eq('exchange', exchange.toLowerCase())
    }
    // If neither provided, fetch ALL trades (for combined analytics)

    const { data: trades, error: fetchError } = await query.order('trade_time', { ascending: true })

    if (fetchError) {
      console.error('Error fetching trades:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch trades' },
        { status: 500 }
      )
    }

    // Group trades by account type
    const spotTrades = []
    const futuresIncome = []

    trades.forEach(trade => {
      if (trade.account_type === 'SPOT') {
        spotTrades.push({
          symbol: trade.symbol,
          qty: String(trade.quantity),
          price: String(trade.price),
          quoteQty: String(trade.quote_quantity),
          commission: String(trade.commission),
          commissionAsset: trade.commission_asset,
          isBuyer: trade.side === 'BUY',
          isMaker: trade.type === 'LIMIT',
          time: new Date(trade.trade_time).getTime(),
          orderId: trade.order_id,
          id: trade.trade_id,
          accountType: 'SPOT'
        })
      } else if (trade.account_type === 'FUTURES') {
        futuresIncome.push({
          symbol: trade.symbol,
          income: String(trade.quote_quantity),
          asset: trade.commission_asset,
          incomeType: trade.type,
          time: new Date(trade.trade_time).getTime(),
          tranId: trade.trade_id,
          id: trade.trade_id
        })
      }
    })

    // Calculate metadata from stored trades
    const uniqueExchanges = [...new Set(trades.map(t => t.exchange))]
    const totalTrades = trades.length
    const oldestTrade = trades.length > 0 ? trades[0].trade_time : null
    const newestTrade = trades.length > 0 ? trades[trades.length - 1].trade_time : null

    // Detect primary currency based on exchange
    // CoinDCX trades are stored in INR, need conversion
    // Binance trades are stored in USD/USDT, no conversion needed
    let primaryCurrency = 'USD'
    if (uniqueExchanges.length === 1 && uniqueExchanges[0] === 'coindcx') {
      primaryCurrency = 'INR'
    } else if (uniqueExchanges.includes('coindcx')) {
      // Mixed exchanges - need to handle per-trade conversion
      // For now, mark as INR and let frontend handle it
      primaryCurrency = 'INR'
    }

    console.log(`📊 Fetched ${totalTrades} trades (${spotTrades.length} spot, ${futuresIncome.length} futures) ${connectionId ? `for connection ${connectionId}` : exchange ? `for ${exchange}` : 'from all exchanges'}`)
    console.log(`💱 Detected primary currency: ${primaryCurrency} based on exchanges: ${uniqueExchanges.join(', ')}`)

    return NextResponse.json({
      success: true,
      spotTrades,
      futuresIncome,
      futuresPositions: [],
      metadata: {
        primaryCurrency: primaryCurrency,
        availableCurrencies: ['USD', 'INR'],
        supportsCurrencySwitch: false,
        // Additional metadata
        exchanges: uniqueExchanges,
        totalTrades: totalTrades,
        spotTrades: spotTrades.length,
        futuresIncome: futuresIncome.length,
        oldestTrade: oldestTrade,
        newestTrade: newestTrade,
        accountType: spotTrades.length > 0 && futuresIncome.length > 0 ? 'MIXED' : spotTrades.length > 0 ? 'SPOT' : 'FUTURES',
        hasSpot: spotTrades.length > 0,
        hasFutures: futuresIncome.length > 0
      }
    })
  } catch (error) {
    console.error('Fetch trades error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trades' },
      { status: 500 }
    )
  }
}

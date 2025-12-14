// app/api/exchange/list/route.js
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log('❌ [List Exchanges] Auth error or no user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 [List Exchanges] Fetching connections for user:', user.id)

    // Fetch user's exchange connections
    const { data: connections, error: fetchError } = await supabase
      .from('exchange_connections')
      .select('id, exchange, is_active, created_at, updated_at, last_synced')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('❌ [List Exchanges] Error fetching connections:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch exchange connections' },
        { status: 500 }
      )
    }

    // For Snaptrade connections, fetch brokerage info from accounts
    let connectionsWithBrokerage = connections || []
    
    // Check if we have any Snaptrade connections
    const snaptradeConnections = connections?.filter(conn => conn.exchange === 'snaptrade')
    if (snaptradeConnections && snaptradeConnections.length > 0) {
      try {
        // Fetch Snaptrade accounts to get brokerage names (only need to do this once)
        const { data: snaptradeUser } = await supabase
          .from('snaptrade_users')
          .select('snaptrade_user_id, user_secret_encrypted')
          .eq('user_id', user.id)
          .single()

        if (snaptradeUser) {
          const { getAccounts } = await import('@/lib/snaptrade-client')
          const { decrypt } = await import('@/lib/encryption')
          const userSecret = decrypt(snaptradeUser.user_secret_encrypted)
          const accounts = await getAccounts(snaptradeUser.snaptrade_user_id, userSecret)
          
          if (accounts && accounts.length > 0) {
            // Extract unique brokerage names
            const brokerages = [...new Set(accounts.map(acc => acc.institution_name).filter(Boolean))]
            
            // Update Snaptrade connections with brokerage info
            connectionsWithBrokerage = connections.map(conn => {
              if (conn.exchange === 'snaptrade') {
                return {
                  ...conn,
                  brokerage_names: brokerages.length > 0 ? brokerages : null,
                  primary_brokerage: brokerages[0] || null
                }
              }
              return conn
            })
          }
        }
      } catch (error) {
        console.warn('[List Exchanges] Failed to fetch brokerage info for Snaptrade:', error.message)
        // Continue with connections without brokerage info
      }
    }

    // Check if user has SnapTrade account but no exchange_connection entry yet
    // This handles backward compatibility for existing SnapTrade users
    const hasSnaptradeConnection = connectionsWithBrokerage.some(conn => conn.exchange === 'snaptrade')
    
    if (!hasSnaptradeConnection) {
      const { data: snaptradeUser } = await supabase
        .from('snaptrade_users')
        .select('id, created_at')
        .eq('user_id', user.id)
        .single()

      if (snaptradeUser) {
        // User has SnapTrade but no exchange_connection entry
        // Add a placeholder connection entry (will be synced properly on next connection)
        console.log('⚠️ [List Exchanges] Found SnapTrade user without exchange_connection, adding placeholder')
        connectionsWithBrokerage.push({
          id: `snaptrade-${snaptradeUser.id}`, // Temporary ID
          exchange: 'snaptrade',
          is_active: true,
          created_at: snaptradeUser.created_at || new Date().toISOString(),
          updated_at: snaptradeUser.created_at || new Date().toISOString(),
          last_synced: null,
          brokerage_names: null,
          primary_brokerage: null
        })
      }
    }

    console.log(`✅ [List Exchanges] Found ${connectionsWithBrokerage?.length || 0} connections`)

    return NextResponse.json({
      success: true,
      connections: connectionsWithBrokerage || []
    })
  } catch (error) {
    console.error('List exchanges error:', error)
    return NextResponse.json(
      { error: 'Failed to list exchanges' },
      { status: 500 }
    )
  }
}

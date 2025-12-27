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
    // Note: metadata column doesn't exist in the database schema, so we exclude it
    const { data: connections, error: fetchError } = await supabase
      .from('exchange_connections')
      .select('id, exchange, is_active, created_at, updated_at, last_synced, user_id, api_key_encrypted, api_secret_encrypted')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('❌ [List Exchanges] Error fetching connections:', {
        error: fetchError,
        message: fetchError.message,
        code: fetchError.code,
        details: fetchError.details,
        hint: fetchError.hint,
        fullError: JSON.stringify(fetchError, null, 2),
      })
      return NextResponse.json(
        { 
          error: 'Failed to fetch exchange connections', 
          details: fetchError.message,
          code: fetchError.code,
          hint: fetchError.hint
        },
        { status: 500 }
      )
    }

    console.log(`📊 [List Exchanges] Raw query result:`, {
      connectionsCount: connections?.length || 0,
      connections: connections?.map(c => ({ id: c.id, exchange: c.exchange, user_id: c.user_id })) || [],
      userId: user.id,
    })

    // Process connections - for SnapTrade, each brokerage is a separate connection
    // IMPORTANT: Always ensure we return all non-SnapTrade connections even if SnapTrade check fails
    let processedConnections = Array.isArray(connections) ? [...connections] : []
    
    // For SnapTrade connections, we'll need to fetch brokerage info separately
    // Since metadata column doesn't exist, we'll get brokerage names from SnapTrade API if needed
    // For now, just return connections as-is (brokerage info will be added via sync-connections)
    processedConnections = processedConnections.map(conn => {
      if (conn && conn.exchange === 'snaptrade') {
        // Since metadata doesn't exist, we can't extract brokerage name here
        // Brokerage-specific connections will be created by sync-connections endpoint
        // For now, return connection as-is
        return {
          ...conn,
          brokerage_name: null,
          primary_brokerage: null,
          brokerage_names: null,
        }
      }
      return conn
    })

    // Check if user has SnapTrade accounts but no exchange_connection entries yet
    // This handles backward compatibility - sync connections if needed
    // Wrap in try-catch to ensure it doesn't block returning other connections
    try {
      const hasSnaptradeConnections = processedConnections.some(conn => conn && conn.exchange === 'snaptrade')
      
      if (!hasSnaptradeConnections) {
        const { data: snaptradeUser } = await supabase
          .from('snaptrade_users')
          .select('snaptrade_user_id, user_secret_encrypted, hidden_brokerages, id, created_at')
          .eq('user_id', user.id)
          .maybeSingle()

        if (snaptradeUser) {
          // Check if user actually has any connected brokerages before showing placeholder
          try {
            const { getAccounts } = await import('@/lib/snaptrade-client')
            const { decrypt } = await import('@/lib/encryption')
            const userSecret = decrypt(snaptradeUser.user_secret_encrypted)
            const accounts = await getAccounts(snaptradeUser.snaptrade_user_id, userSecret)
            
            // Parse hidden brokerages
            let hiddenBrokerages = []
            if (snaptradeUser.hidden_brokerages) {
              try {
                hiddenBrokerages = Array.isArray(snaptradeUser.hidden_brokerages)
                  ? snaptradeUser.hidden_brokerages
                  : JSON.parse(snaptradeUser.hidden_brokerages)
              } catch (e) {
                hiddenBrokerages = []
              }
            }
            
            // Filter visible brokerages
            const visibleBrokerages = [...new Set(accounts.map(acc => acc.institution_name).filter(Boolean))]
              .filter(b => !hiddenBrokerages.includes(b))
            
            // Only add placeholders if there are visible accounts
            if (visibleBrokerages.length > 0) {
              console.log('⚠️ [List Exchanges] Found SnapTrade user without exchange_connections but has accounts, adding placeholders')
              // Create placeholder for each visible brokerage
              visibleBrokerages.forEach(brokerage => {
                processedConnections.push({
                  id: `snaptrade-${snaptradeUser.id}-${brokerage}`, // Temporary ID
                  exchange: 'snaptrade',
                  is_active: true,
                  created_at: snaptradeUser.created_at || new Date().toISOString(),
                  updated_at: snaptradeUser.created_at || new Date().toISOString(),
                  last_synced: null,
                  metadata: { brokerage_name: brokerage },
                  brokerage_name: brokerage,
                  primary_brokerage: brokerage,
                  brokerage_names: [brokerage],
                })
              })
            } else {
              console.log('ℹ️ [List Exchanges] SnapTrade user exists but has no visible connected accounts')
            }
          } catch (error) {
            console.warn('⚠️ [List Exchanges] Failed to check SnapTrade accounts for placeholder:', error.message)
            // Don't add placeholder if we can't verify accounts exist
            // Continue to return other connections
          }
        }
      }
    } catch (error) {
      console.error('❌ [List Exchanges] Error in SnapTrade placeholder check:', error)
      // Continue to return other connections even if SnapTrade check fails
    }

    // Ensure we always return an array, even if empty
    const finalConnections = Array.isArray(processedConnections) ? processedConnections : []
    
    console.log(`✅ [List Exchanges] Found ${finalConnections.length} connections`, {
      snaptradeConnections: finalConnections.filter(c => c && c.exchange === 'snaptrade').length,
      otherConnections: finalConnections.filter(c => c && c.exchange !== 'snaptrade').length,
      exchanges: [...new Set(finalConnections.map(c => c?.exchange).filter(Boolean))],
    })

    return NextResponse.json({
      success: true,
      connections: finalConnections
    })
  } catch (error) {
    console.error('❌ [List Exchanges] Unhandled error:', error)
    console.error('❌ [List Exchanges] Error stack:', error.stack)
    console.error('❌ [List Exchanges] Error details:', {
      message: error.message,
      name: error.name,
      cause: error.cause,
    })
    return NextResponse.json(
      { 
        error: 'Failed to list exchanges',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

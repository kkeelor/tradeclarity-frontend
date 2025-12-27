// app/api/snaptrade/sync-connections/route.js
// Sync SnapTrade accounts to exchange_connections table
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getAccounts } from '@/lib/snaptrade-client'
import { decrypt } from '@/lib/encryption'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('❌ [Snaptrade Sync] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 [Snaptrade Sync] Starting sync for user:', user.id)

    // Get Snaptrade user data
    const { data: snaptradeUser, error: fetchError } = await supabase
      .from('snaptrade_users')
      .select('snaptrade_user_id, user_secret_encrypted')
      .eq('user_id', user.id)
      .single()

    if (fetchError || !snaptradeUser) {
      console.log('⚠️ [Snaptrade Sync] User not registered with Snaptrade')
      return NextResponse.json(
        {
          success: true,
          message: 'User not registered with Snaptrade',
          connectionsCreated: 0,
        },
        { status: 200 }
      )
    }

    // Decrypt userSecret
    const userSecret = decrypt(snaptradeUser.user_secret_encrypted)

    // Fetch accounts from Snaptrade
    const accounts = await getAccounts(
      snaptradeUser.snaptrade_user_id,
      userSecret
    )

    if (!accounts || accounts.length === 0) {
      console.log('⚠️ [Snaptrade Sync] No accounts found')
      return NextResponse.json({
        success: true,
        message: 'No SnapTrade accounts found',
        connectionsCreated: 0,
      })
    }

    console.log(`🔄 [Snaptrade Sync] Found ${accounts.length} SnapTrade accounts`)

    // Extract unique brokerage/institution names from accounts
    const brokerages = [...new Set(accounts.map(acc => acc.institution_name).filter(Boolean))]
    console.log(`📊 [Snaptrade Sync] Brokerages found:`, brokerages)

    // Get hidden brokerages to exclude them
    let hiddenBrokerages = []
    const { data: snaptradeUserWithHidden } = await supabase
      .from('snaptrade_users')
      .select('hidden_brokerages')
      .eq('user_id', user.id)
      .maybeSingle()
    
    if (snaptradeUserWithHidden?.hidden_brokerages) {
      try {
        hiddenBrokerages = Array.isArray(snaptradeUserWithHidden.hidden_brokerages)
          ? snaptradeUserWithHidden.hidden_brokerages
          : JSON.parse(snaptradeUserWithHidden.hidden_brokerages)
      } catch (e) {
        console.warn('⚠️ [Snaptrade Sync] Failed to parse hidden_brokerages:', e)
      }
    }

    // Filter out hidden brokerages - only sync visible ones
    const visibleBrokerages = brokerages.filter(b => !hiddenBrokerages.includes(b))
    console.log(`📊 [Snaptrade Sync] Visible brokerages to sync:`, visibleBrokerages)

    // Get existing SnapTrade connections for this user
    const { data: existingConnections } = await supabase
      .from('exchange_connections')
      .select('id, exchange, metadata')
      .eq('user_id', user.id)
      .eq('exchange', 'snaptrade')
      .eq('is_active', true)

    // Extract brokerage names from existing connections (stored in metadata or exchange name)
    const existingBrokerages = new Set()
    if (existingConnections) {
      existingConnections.forEach(conn => {
        // Check if brokerage is stored in metadata
        if (conn.metadata && typeof conn.metadata === 'object' && conn.metadata.brokerage_name) {
          existingBrokerages.add(conn.metadata.brokerage_name)
        } else if (conn.exchange && conn.exchange.startsWith('snaptrade-')) {
          // Legacy format: exchange='snaptrade-{brokerage}'
          const brokerage = conn.exchange.replace('snaptrade-', '')
          if (brokerage) existingBrokerages.add(brokerage)
        }
      })
    }

    let connectionsCreated = 0
    let connectionsUpdated = 0
    let connectionsDeleted = 0

    // Create/update connection for each visible brokerage
    for (const brokerage of visibleBrokerages) {
      // Find existing connection for this brokerage
      let existingConnection = null
      if (existingConnections) {
        existingConnection = existingConnections.find(conn => {
          if (conn.metadata && typeof conn.metadata === 'object' && conn.metadata.brokerage_name === brokerage) {
            return true
          }
          if (conn.exchange === `snaptrade-${brokerage.toLowerCase()}`) {
            return true
          }
          return false
        })
      }

      if (existingConnection) {
        // Update existing connection
        const updateData = {
          is_active: true,
          updated_at: new Date().toISOString(),
          last_synced: new Date().toISOString(),
          metadata: { brokerage_name: brokerage },
        }
        
        const { error: updateError } = await supabase
          .from('exchange_connections')
          .update(updateData)
          .eq('id', existingConnection.id)

        if (!updateError) {
          connectionsUpdated++
          console.log(`✅ [Snaptrade Sync] Updated connection for brokerage: ${brokerage}`)
        } else {
          console.error(`❌ [Snaptrade Sync] Error updating connection for ${brokerage}:`, updateError)
        }
      } else {
        // Create new connection for this brokerage
        const insertData = {
          user_id: user.id,
          exchange: 'snaptrade',
          is_active: true,
          metadata: { brokerage_name: brokerage },
          // api_key_encrypted and api_secret_encrypted are null for SnapTrade
        }
        
        const { data: newConnection, error: insertError } = await supabase
          .from('exchange_connections')
          .insert(insertData)
          .select()
          .single()

        if (!insertError) {
          connectionsCreated++
          console.log(`✅ [Snaptrade Sync] Created connection for brokerage: ${brokerage}`)
        } else {
          console.error(`❌ [Snaptrade Sync] Error creating connection for ${brokerage}:`, insertError)
        }
      }
    }

    // Deactivate connections for brokerages that no longer exist or are hidden
    if (existingConnections && existingConnections.length > 0) {
      for (const existingConn of existingConnections) {
        let brokerageName = null
        if (existingConn.metadata && typeof existingConn.metadata === 'object' && existingConn.metadata.brokerage_name) {
          brokerageName = existingConn.metadata.brokerage_name
        } else if (existingConn.exchange && existingConn.exchange.startsWith('snaptrade-')) {
          brokerageName = existingConn.exchange.replace('snaptrade-', '')
        }

        // If brokerage is hidden or no longer exists, deactivate the connection
        if (brokerageName && (hiddenBrokerages.includes(brokerageName) || !visibleBrokerages.includes(brokerageName))) {
          const { error: deactivateError } = await supabase
            .from('exchange_connections')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', existingConn.id)

          if (!deactivateError) {
            connectionsDeleted++
            console.log(`✅ [Snaptrade Sync] Deactivated connection for brokerage: ${brokerageName}`)
          }
        }
      }
    }

    const totalProcessed = connectionsCreated + connectionsUpdated

    console.log(`✅ [Snaptrade Sync] Sync complete: ${connectionsCreated} created, ${connectionsUpdated} updated, ${connectionsDeleted} deactivated`)

    return NextResponse.json({
      success: true,
      connectionsCreated,
      connectionsUpdated,
      accountsFound: accounts.length,
      message: `Synced ${totalProcessed} SnapTrade connection(s)`,
    })
  } catch (error) {
    console.error('❌ [Snaptrade Sync] Error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to sync SnapTrade connections',
      },
      { status: 500 }
    )
  }
}

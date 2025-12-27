// app/api/snaptrade/sync-connections/route.js
// Sync SnapTrade accounts to exchange_connections table
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

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

    // Get session token for backend authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      return NextResponse.json({ error: 'No session token available' }, { status: 401 })
    }

    // Check if user is registered with SnapTrade
    const { data: snaptradeUser } = await supabase
      .from('snaptrade_users')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!snaptradeUser) {
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

    // Fetch accounts from backend API
    let accounts = []
    try {
      const accountsResponse = await fetch(`${BACKEND_URL}/api/snaptrade/accounts`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json()
        accounts = accountsData.accounts || []
        console.log(`✅ [Snaptrade Sync] Fetched ${accounts.length} accounts from backend`)
      } else {
        const errorData = await accountsResponse.json().catch(() => ({}))
        console.error('❌ [Snaptrade Sync] Failed to fetch accounts from backend:', {
          status: accountsResponse.status,
          error: errorData,
        })
        return NextResponse.json(
          {
            error: 'Failed to fetch SnapTrade accounts',
            details: errorData.error || 'Unknown error',
          },
          { status: 500 }
        )
      }
    } catch (fetchError) {
      console.error('❌ [Snaptrade Sync] Error fetching accounts:', fetchError)
      return NextResponse.json(
        {
          error: 'Failed to fetch SnapTrade accounts',
          details: fetchError.message,
        },
        { status: 500 }
      )
    }

    if (!accounts || accounts.length === 0) {
      console.log('⚠️ [Snaptrade Sync] No accounts found')
      return NextResponse.json({
        success: true,
        message: 'No SnapTrade accounts found',
        connectionsCreated: 0,
      })
    }

    console.log(`🔄 [Snaptrade Sync] Found ${accounts.length} SnapTrade accounts`)
    console.log(`📊 [Snaptrade Sync] Account details:`, accounts.map(acc => ({
      id: acc.id,
      name: acc.name,
      institution_name: acc.institution_name,
      institution: acc.institution,
      number: acc.number,
      allKeys: Object.keys(acc),
    })))

    // Extract unique brokerage/institution names from accounts
    // Try multiple field names in case API structure varies
    const brokerages = [...new Set(
      accounts
        .map(acc => acc.institution_name || acc.institution || acc.brokerage_name)
        .filter(Boolean)
    )]
    console.log(`📊 [Snaptrade Sync] Brokerages found:`, brokerages)
    console.log(`📊 [Snaptrade Sync] Brokerages count:`, brokerages.length)

    if (brokerages.length === 0) {
      console.warn(`⚠️ [Snaptrade Sync] No brokerage names found in accounts! Account structure:`, 
        accounts.length > 0 ? Object.keys(accounts[0]) : 'no accounts')
      return NextResponse.json({
        success: false,
        error: 'No brokerage names found in accounts',
        accountsFound: accounts.length,
        accountSample: accounts.length > 0 ? accounts[0] : null,
        connectionsCreated: 0,
      }, { status: 400 })
    }

    // Get hidden brokerages to exclude them (if column exists)
    let hiddenBrokerages = []
    try {
      const { data: snaptradeUserWithHidden, error: hiddenError } = await supabase
        .from('snaptrade_users')
        .select('hidden_brokerages')
        .eq('user_id', user.id)
        .maybeSingle()
      
      // If column doesn't exist, hiddenError will have code '42703' (undefined column)
      if (!hiddenError && snaptradeUserWithHidden?.hidden_brokerages) {
        try {
          hiddenBrokerages = Array.isArray(snaptradeUserWithHidden.hidden_brokerages)
            ? snaptradeUserWithHidden.hidden_brokerages
            : JSON.parse(snaptradeUserWithHidden.hidden_brokerages)
        } catch (e) {
          console.warn('⚠️ [Snaptrade Sync] Failed to parse hidden_brokerages:', e)
        }
      } else if (hiddenError && hiddenError.code !== 'PGRST116' && hiddenError.code !== '42703') {
        // PGRST116 is "not found" which is fine
        // 42703 is "undefined column" which is fine if column doesn't exist
        console.warn('⚠️ [Snaptrade Sync] Error fetching hidden_brokerages:', hiddenError.code)
      }
    } catch (e) {
      console.warn('⚠️ [Snaptrade Sync] Error checking hidden_brokerages:', e.message)
    }

    // Filter out hidden brokerages - only sync visible ones
    const visibleBrokerages = brokerages.filter(b => !hiddenBrokerages.includes(b))
    console.log(`📊 [Snaptrade Sync] Visible brokerages to sync:`, visibleBrokerages)
    console.log(`📊 [Snaptrade Sync] Visible brokerages count:`, visibleBrokerages.length)
    console.log(`📊 [Snaptrade Sync] Hidden brokerages:`, hiddenBrokerages)
    
    if (visibleBrokerages.length === 0) {
      console.warn(`⚠️ [Snaptrade Sync] No visible brokerages to sync! All brokerages may be hidden or accounts have no institution_name`)
      return NextResponse.json({
        success: true,
        message: 'No visible brokerages to sync',
        connectionsCreated: 0,
        accountsFound: accounts.length,
        brokeragesFound: brokerages.length,
        visibleBrokerages: visibleBrokerages.length,
        hiddenBrokerages: hiddenBrokerages.length,
      })
    }

    // Get existing SnapTrade connections for this user
    // SnapTrade connections use exchange='snaptrade-{brokerage}' format
    const { data: allConnections, error: connectionsError } = await supabase
      .from('exchange_connections')
      .select('id, exchange, metadata')
      .eq('user_id', user.id)
      .eq('is_active', true)
    
    if (connectionsError) {
      console.error('❌ [Snaptrade Sync] Error fetching existing connections:', connectionsError)
      return NextResponse.json({
        error: 'Failed to fetch existing connections',
        details: connectionsError.message,
      }, { status: 500 })
    }
    
    // Filter to only SnapTrade connections (exchange starts with 'snaptrade')
    const existingConnections = (allConnections || []).filter(conn => 
      conn.exchange && conn.exchange.startsWith('snaptrade')
    )

    console.log(`📊 [Snaptrade Sync] Found ${existingConnections.length} existing SnapTrade connections`)

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
          if (brokerage) {
            // Convert slug back to brokerage name (capitalize words)
            const brokerageName = brokerage
              .split('-')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')
            existingBrokerages.add(brokerageName)
          }
        }
      })
    }

    console.log(`📊 [Snaptrade Sync] Existing brokerages:`, Array.from(existingBrokerages))

    let connectionsCreated = 0
    let connectionsUpdated = 0
    let connectionsDeleted = 0

    // Create/update connection for each visible brokerage
    for (const brokerage of visibleBrokerages) {
      console.log(`🔄 [Snaptrade Sync] Processing brokerage: ${brokerage}`)
      
      // Find existing connection for this brokerage
      let existingConnection = null
      if (existingConnections && existingConnections.length > 0) {
        existingConnection = existingConnections.find(conn => {
          // Match by metadata brokerage_name
          if (conn.metadata && typeof conn.metadata === 'object' && conn.metadata.brokerage_name === brokerage) {
            return true
          }
          // Match by exchange format: snaptrade-{brokerage-slug}
          const brokerageSlug = brokerage.toLowerCase().replace(/[^a-z0-9]/g, '-')
          if (conn.exchange === `snaptrade-${brokerageSlug}`) {
            return true
          }
          return false
        })
      }

      if (existingConnection) {
        console.log(`🔄 [Snaptrade Sync] Found existing connection for ${brokerage}, updating...`)
        // Update existing connection
        // Ensure exchange format is correct (snaptrade-{brokerage-slug})
        const brokerageSlug = brokerage.toLowerCase().replace(/[^a-z0-9]/g, '-')
        const updateData = {
          exchange: `snaptrade-${brokerageSlug}`, // Update exchange format if needed
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
          console.error(`❌ [Snaptrade Sync] Error updating connection for ${brokerage}:`, {
            error: updateError,
            code: updateError?.code,
            message: updateError?.message,
            details: updateError?.details,
            hint: updateError?.hint,
          })
        }
      } else {
        console.log(`🔄 [Snaptrade Sync] No existing connection found for ${brokerage}, creating new one...`)
        // Create new connection for this brokerage
        // Use exchange='snaptrade-{brokerage}' format to satisfy unique constraint (user_id, exchange)
        const brokerageSlug = brokerage.toLowerCase().replace(/[^a-z0-9]/g, '-')
        const insertData = {
          user_id: user.id,
          exchange: `snaptrade-${brokerageSlug}`,
          is_active: true,
          metadata: { brokerage_name: brokerage },
          api_key_encrypted: '', // Required by schema (NOT NULL), but empty for SnapTrade
          api_secret_encrypted: '', // Required by schema (NOT NULL), but empty for SnapTrade
        }
        
        console.log(`🔄 [Snaptrade Sync] Inserting connection data:`, {
          user_id: insertData.user_id,
          exchange: insertData.exchange,
          brokerage_name: insertData.metadata.brokerage_name,
          hasApiKey: !!insertData.api_key_encrypted,
          hasApiSecret: !!insertData.api_secret_encrypted,
        })
        
        const { data: newConnection, error: insertError } = await supabase
          .from('exchange_connections')
          .insert(insertData)
          .select()
          .single()

        if (!insertError && newConnection) {
          connectionsCreated++
          console.log(`✅ [Snaptrade Sync] Created connection for brokerage: ${brokerage}`, {
            connectionId: newConnection.id,
            exchange: newConnection.exchange,
            metadata: newConnection.metadata,
          })
        } else {
          console.error(`❌ [Snaptrade Sync] Error creating connection for ${brokerage}:`, {
            error: insertError,
            errorMessage: insertError?.message,
            errorCode: insertError?.code,
            errorDetails: insertError?.details,
            errorHint: insertError?.hint,
            constraint: insertError?.code === '23505' ? 'Unique constraint violation' : null,
            fullError: JSON.stringify(insertError, null, 2),
            insertData: JSON.stringify(insertData, null, 2),
          })
          
          // Continue with other brokerages - don't stop the loop
          // The error will be included in the final response
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
          // Extract from exchange format
          const slug = existingConn.exchange.replace('snaptrade-', '')
          brokerageName = slug
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
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
          } else {
            console.error(`❌ [Snaptrade Sync] Error deactivating connection for ${brokerageName}:`, deactivateError)
          }
        }
      }
    }

    const totalProcessed = connectionsCreated + connectionsUpdated

    console.log(`✅ [Snaptrade Sync] Sync complete: ${connectionsCreated} created, ${connectionsUpdated} updated, ${connectionsDeleted} deactivated`)
    console.log(`📊 [Snaptrade Sync] Summary:`, {
      accountsFound: accounts.length,
      brokeragesFound: brokerages.length,
      visibleBrokerages: visibleBrokerages.length,
      connectionsCreated,
      connectionsUpdated,
      connectionsDeleted,
    })

    // If no connections were created/updated but we have visible brokerages, there might be an issue
    if (visibleBrokerages.length > 0 && totalProcessed === 0) {
      console.warn(`⚠️ [Snaptrade Sync] WARNING: ${visibleBrokerages.length} visible brokerages but 0 connections created/updated!`)
      console.warn(`⚠️ [Snaptrade Sync] This might indicate insert failures. Check error logs above.`)
    }

    return NextResponse.json({
      success: totalProcessed > 0 || visibleBrokerages.length === 0,
      connectionsCreated,
      connectionsUpdated,
      connectionsDeleted,
      accountsFound: accounts.length,
      brokeragesFound: brokerages.length,
      visibleBrokerages: visibleBrokerages.length,
      message: totalProcessed > 0 
        ? `Synced ${totalProcessed} SnapTrade connection(s)`
        : visibleBrokerages.length > 0
          ? `Warning: ${visibleBrokerages.length} brokerages found but no connections created/updated. Check server logs for errors.`
          : 'No visible brokerages to sync',
    })
  } catch (error) {
    console.error('❌ [Snaptrade Sync] Error:', error)
    console.error('❌ [Snaptrade Sync] Error stack:', error.stack)
    return NextResponse.json(
      {
        error: error.message || 'Failed to sync SnapTrade connections',
        details: error.stack,
      },
      { status: 500 }
    )
  }
}

// app/api/exchange/delete/route.js
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Delete an exchange connection and handle associated data
 *
 * Flow:
 * 1. Delete all API-imported trades (where exchange_connection_id = connectionId)
 * 2. Delete portfolio snapshots for this connection
 * 3. Handle linked CSV files:
 *    - If deleteLinkedCSVs = true: Delete CSV files (cascade deletes their trades)
 *    - If deleteLinkedCSVs = false: Unlink CSVs (set exchange_connection_id = null)
 * 4. Delete the exchange connection
 *
 * Special handling for Snaptrade:
 * - When deleting a Snaptrade connection (exchange === 'snaptrade'), we delete the
 *   exchange_connection record but PRESERVE the snaptrade_users record.
 * - The same Snaptrade user ID is used for all brokerages, so it must not be deleted.
 */
export async function POST(request) {
  try {
    const supabase = await createClient()
    
    if (!supabase) {
      console.error('❌ Failed to create Supabase client')
      return NextResponse.json(
        { error: 'Failed to initialize database connection' },
        { status: 500 }
      )
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { connectionId, deleteLinkedCSVs = false } = await request.json()

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      )
    }

    console.log(`🗑️  Deleting exchange connection ${connectionId}...`)
    console.log(`   - Delete linked CSVs: ${deleteLinkedCSVs}`)

    // Handle Snaptrade placeholder IDs (format: "snaptrade-{uuid}-{brokerage}" or "snaptrade-{uuid}")
    // These are temporary IDs created by the list endpoint when no exchange_connection exists
    let actualConnectionId = connectionId
    let brokerageName = null
    
    if (connectionId.startsWith('snaptrade-')) {
      console.log('⚠️ Detected Snaptrade placeholder ID, extracting brokerage info')
      
      // Parse placeholder ID format: "snaptrade-{uuid}-{brokerage}" or "snaptrade-{uuid}"
      const parts = connectionId.split('-')
      if (parts.length >= 3) {
        // Format: "snaptrade-{uuid}-{brokerage}"
        brokerageName = parts.slice(2).join('-') // Handle brokerage names with hyphens
      }
      
      // Look up the actual connection by user_id, exchange='snaptrade', and brokerage_name
      let query = supabase
        .from('exchange_connections')
        .select('id, exchange, user_id, metadata')
        .eq('user_id', user.id)
        .eq('exchange', 'snaptrade')
        .eq('is_active', true)
      
      if (brokerageName) {
        // Try to find connection with matching brokerage name
        const { data: brokerageConnections } = await query
        const matchingConn = brokerageConnections?.find(conn => 
          conn.metadata?.brokerage_name === brokerageName
        )
        
        if (matchingConn) {
          actualConnectionId = matchingConn.id
          brokerageName = matchingConn.metadata?.brokerage_name || brokerageName
          console.log(`✅ Found actual connection ID for brokerage ${brokerageName}: ${actualConnectionId}`)
        } else {
          // No matching connection - this is a placeholder
          console.log(`ℹ️ No actual Snaptrade connection found for brokerage ${brokerageName} (placeholder only)`)
          
          // Hide this brokerage to prevent placeholder from reappearing
          if (brokerageName) {
            try {
              const { data: snaptradeUser } = await supabase
                .from('snaptrade_users')
                .select('hidden_brokerages')
                .eq('user_id', user.id)
                .maybeSingle()
              
              if (snaptradeUser) {
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
                
                if (!hiddenBrokerages.includes(brokerageName)) {
                  hiddenBrokerages.push(brokerageName)
                  await supabase
                    .from('snaptrade_users')
                    .update({ hidden_brokerages: hiddenBrokerages })
                    .eq('user_id', user.id)
                  console.log(`✅ Hidden brokerage ${brokerageName} to prevent placeholder reappearance`)
                }
              }
            } catch (error) {
              console.warn('⚠️ Failed to hide brokerage:', error.message)
            }
          }
          
          // Clean up orphaned trades for this brokerage
          const { data: orphanedTrades } = await supabase
            .from('trades')
            .delete()
            .eq('user_id', user.id)
            .eq('exchange', 'snaptrade')
            .select('id')
          
          const orphanedTradesDeleted = orphanedTrades?.length || 0
          if (orphanedTradesDeleted > 0) {
            console.log(`✅ Cleaned up ${orphanedTradesDeleted} orphaned SnapTrade trades`)
          }
          
          return NextResponse.json({
            success: true,
            message: 'Placeholder connection removed',
            apiTradesDeleted: orphanedTradesDeleted,
            csvFilesDeleted: 0,
            csvFilesUnlinked: 0,
            csvTradesDeleted: 0,
            totalTradesDeleted: orphanedTradesDeleted
          })
        }
      } else {
        // Legacy format without brokerage - look for any SnapTrade connection
        const { data: anyConnections } = await query.limit(1)
        if (anyConnections && anyConnections.length > 0) {
          actualConnectionId = anyConnections[0].id
          brokerageName = anyConnections[0].metadata?.brokerage_name || null
          console.log(`✅ Found actual connection ID: ${actualConnectionId}`)
        } else {
          // No connection found - placeholder only
          console.log('ℹ️ No actual Snaptrade connection found (placeholder only)')
          return NextResponse.json({
            success: true,
            message: 'Placeholder connection removed',
            apiTradesDeleted: 0,
            csvFilesDeleted: 0,
            csvFilesUnlinked: 0,
            csvTradesDeleted: 0,
            totalTradesDeleted: 0
          })
        }
      }
    }

    // First, fetch the connection to check if it's a Snaptrade connection and get brokerage info
    const { data: connections, error: fetchConnectionError } = await supabase
      .from('exchange_connections')
      .select('id, exchange, user_id, metadata')
      .eq('id', actualConnectionId)
      .eq('user_id', user.id)
      .limit(1)

    if (fetchConnectionError) {
      console.error('Error fetching connection:', fetchConnectionError)
      return NextResponse.json(
        { error: 'Failed to fetch exchange connection', details: fetchConnectionError.message },
        { status: 500 }
      )
    }

    const connection = connections && connections.length > 0 ? connections[0] : null

    if (!connection) {
      console.error('Connection not found:', connectionId)
      return NextResponse.json(
        { error: 'Exchange connection not found' },
        { status: 404 }
      )
    }

    const isSnaptradeConnection = connection.exchange === 'snaptrade'
    const connectionBrokerageName = connection.metadata?.brokerage_name || brokerageName
    
    if (isSnaptradeConnection) {
      console.log('📌 [Snaptrade Delete] Detected Snaptrade connection:', {
        connectionId: actualConnectionId,
        brokerageName: connectionBrokerageName,
        willPreserveSnaptradeUsers: true,
      })
    }

    // Step 1: Delete all API-imported trades for this connection
    // For SnapTrade, we need to filter trades by brokerage if possible
    let apiTradesDeleted = 0
    
    if (isSnaptradeConnection && connectionBrokerageName) {
      // For SnapTrade, delete trades that belong to this specific brokerage
      // We'll need to check trades that have exchange='snaptrade' and match the brokerage
      // Since trades don't store brokerage directly, we delete by connection_id
      // But we should also check if there are trades without connection_id that match this brokerage
      
      // First, delete trades linked to this connection
      const { data: deletedByConnection, error: connectionTradesError } = await supabase
        .from('trades')
        .delete()
        .eq('exchange_connection_id', actualConnectionId)
        .eq('user_id', user.id)
        .select('id')
      
      if (connectionTradesError) {
        console.error('Error deleting trades by connection:', connectionTradesError)
        return NextResponse.json(
          { error: 'Failed to delete API-imported trades' },
          { status: 500 }
        )
      }
      
      apiTradesDeleted = deletedByConnection?.length || 0
      console.log(`✅ Deleted ${apiTradesDeleted} API-imported trades for brokerage "${connectionBrokerageName}"`)
    } else {
      // For non-SnapTrade or legacy SnapTrade connections, delete by connection_id
      const { data: deletedApiTrades, error: apiTradesError } = await supabase
        .from('trades')
        .delete()
        .eq('exchange_connection_id', actualConnectionId)
        .eq('user_id', user.id)
        .select('id')

      if (apiTradesError) {
        console.error('Error deleting API trades:', apiTradesError)
        return NextResponse.json(
          { error: 'Failed to delete API-imported trades' },
          { status: 500 }
        )
      }

      apiTradesDeleted = deletedApiTrades?.length || 0
      console.log(`✅ Deleted ${apiTradesDeleted} API-imported trades`)
    }

    // Step 2: Delete portfolio snapshots for this connection
    const { data: deletedSnapshots, error: snapshotsError } = await supabase
      .from('portfolio_snapshots')
      .delete()
      .eq('connection_id', actualConnectionId)
      .eq('user_id', user.id)
      .select('id')

    if (snapshotsError) {
      console.error('Error deleting portfolio snapshots:', snapshotsError)
      // Don't fail the entire request, just log the error
      console.warn('⚠️  Continuing despite portfolio snapshot deletion error')
    } else {
      const snapshotsDeleted = deletedSnapshots?.length || 0
      console.log(`✅ Deleted ${snapshotsDeleted} portfolio snapshots`)
    }

    // Step 3: Handle linked CSV files
    let csvFilesDeleted = 0
    let csvFilesUnlinked = 0
    let csvTradesDeleted = 0

    if (deleteLinkedCSVs) {
      // Delete all linked CSV files (cascade will delete their trades)
      const { data: deletedCSVs, error: csvDeleteError } = await supabase
        .from('csv_uploads')
        .delete()
        .eq('exchange_connection_id', actualConnectionId)
        .eq('user_id', user.id)
        .select('id, trades_count')

      if (csvDeleteError) {
        console.error('Error deleting linked CSVs:', csvDeleteError)
        return NextResponse.json(
          { error: 'Failed to delete linked CSV files' },
          { status: 500 }
        )
      }

      csvFilesDeleted = deletedCSVs?.length || 0
      csvTradesDeleted = deletedCSVs?.reduce((sum, csv) => sum + (csv.trades_count || 0), 0) || 0
      console.log(`✅ Deleted ${csvFilesDeleted} CSV files and ${csvTradesDeleted} CSV trades`)
    } else {
      // Just unlink CSV files, don't delete them
      const { data: unlinkedCSVs, error: csvUnlinkError } = await supabase
        .from('csv_uploads')
        .update({ exchange_connection_id: null })
        .eq('exchange_connection_id', actualConnectionId)
        .eq('user_id', user.id)
        .select('id')

      if (csvUnlinkError) {
        console.error('Error unlinking CSVs:', csvUnlinkError)
        return NextResponse.json(
          { error: 'Failed to unlink CSV files' },
          { status: 500 }
        )
      }

      csvFilesUnlinked = unlinkedCSVs?.length || 0
      console.log(`✅ Unlinked ${csvFilesUnlinked} CSV files (kept trades)`)
    }

    // Step 4: Delete the exchange connection itself
    const { error: deleteError } = await supabase
      .from('exchange_connections')
      .delete()
      .eq('id', actualConnectionId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting exchange connection:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete exchange connection' },
        { status: 500 }
      )
    }

    console.log(`✅ Exchange connection deleted successfully`)
    
    // IMPORTANT: For Snaptrade connections, we do NOT delete the snaptrade_users record
    // The same Snaptrade user ID is used for all brokerages, so it must be preserved
    // However, we should hide the specific brokerage so it doesn't reappear as a placeholder
    if (isSnaptradeConnection && connectionBrokerageName) {
      console.log('✅ [Snaptrade Delete] Exchange connection deleted - snaptrade_users record preserved')
      
      // Hide this specific brokerage to prevent placeholder from reappearing
      try {
        const { data: snaptradeUser } = await supabase
          .from('snaptrade_users')
          .select('hidden_brokerages')
          .eq('user_id', user.id)
          .maybeSingle()
        
        if (snaptradeUser) {
          // Get current hidden brokerages
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
          
          // Add this brokerage to hidden list (if not already hidden)
          if (!hiddenBrokerages.includes(connectionBrokerageName)) {
            hiddenBrokerages.push(connectionBrokerageName)
            
            // Update hidden_brokerages
            const { error: hideError } = await supabase
              .from('snaptrade_users')
              .update({ hidden_brokerages: hiddenBrokerages })
              .eq('user_id', user.id)
            
            if (hideError) {
              console.warn('⚠️ [Snaptrade Delete] Failed to hide brokerage:', hideError)
            } else {
              console.log(`✅ [Snaptrade Delete] Hidden brokerage "${connectionBrokerageName}" to prevent placeholder reappearance`)
            }
          } else {
            console.log(`ℹ️ [Snaptrade Delete] Brokerage "${connectionBrokerageName}" already hidden`)
          }
        }
      } catch (error) {
        console.warn('⚠️ [Snaptrade Delete] Error hiding brokerage after deletion:', error.message)
        // Don't fail the delete operation if hiding fails
      }
    }

    const totalTradesDeleted = apiTradesDeleted + csvTradesDeleted

    // Step 5: Invalidate analytics cache if trades were deleted
    if (totalTradesDeleted > 0) {
      const { error: cacheError } = await supabase
        .from('user_analytics_cache')
        .delete()
        .eq('user_id', user.id)
      
      if (cacheError && cacheError.code !== 'PGRST116') { // PGRST116 = not found (ok)
        console.warn('⚠️  Failed to invalidate analytics cache:', cacheError)
        // Don't fail the request - cache will be invalidated on next analytics computation
      } else {
        console.log(`✅ Analytics cache invalidated (${totalTradesDeleted} trades deleted)`)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Exchange connection deleted successfully',
      apiTradesDeleted,
      csvFilesDeleted,
      csvFilesUnlinked,
      csvTradesDeleted,
      totalTradesDeleted
    })
  } catch (error) {
    console.error('Delete exchange error:', error)
    return NextResponse.json(
      { error: 'Failed to delete exchange', details: error.message },
      { status: 500 }
    )
  }
}

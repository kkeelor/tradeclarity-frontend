// app/api/exchange/delete-preview/route.js
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Preview the impact of deleting an exchange connection
 * Returns counts of what will be affected
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
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body with error handling
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('Error parsing request body:', parseError)
      return NextResponse.json(
        { error: 'Invalid request body', details: parseError.message },
        { status: 400 }
      )
    }

    const { connectionId } = body || {}

    if (!connectionId) {
      console.error('Missing connectionId in request body:', body)
      return NextResponse.json(
        { error: 'Missing required field: connectionId' },
        { status: 400 }
      )
    }

    // Validate connectionId is a valid UUID or string
    if (typeof connectionId !== 'string' || connectionId.trim() === '') {
      console.error('Invalid connectionId format:', connectionId, typeof connectionId)
      return NextResponse.json(
        { error: 'Invalid connectionId format' },
        { status: 400 }
      )
    }

    console.log(`📊 Previewing deletion impact for exchange connection ${connectionId}...`)

    // Handle Snaptrade placeholder IDs (format: "snaptrade-{uuid}-{brokerage}" or "snaptrade-{uuid}")
    // These are temporary IDs created by the list endpoint when no exchange_connection exists
    let actualConnectionId = connectionId
    let isPlaceholderId = false
    let brokerageName = null
    
    if (connectionId.startsWith('snaptrade-')) {
      console.log('⚠️ Detected Snaptrade placeholder ID, extracting brokerage info')
      isPlaceholderId = true
      
      // Parse placeholder ID format: "snaptrade-{uuid}-{brokerage}" or "snaptrade-{uuid}"
      const parts = connectionId.split('-')
      if (parts.length >= 3) {
        // Format: "snaptrade-{uuid}-{brokerage}"
        brokerageName = parts.slice(2).join('-') // Handle brokerage names with hyphens
      }
      
      // Look up the actual connection by user_id, exchange starting with 'snaptrade', and brokerage_name
      // SnapTrade connections use exchange='snaptrade-{brokerage}' format
      const { data: allConnections, error: lookupError } = await supabase
        .from('exchange_connections')
        .select('id, exchange, user_id, metadata')
        .eq('user_id', user.id)
        .eq('is_active', true)
      
      // Filter to only SnapTrade connections
      const actualConnections = (allConnections || []).filter(conn => 
        conn.exchange && conn.exchange.startsWith('snaptrade')
      )
      
      if (lookupError) {
        console.error('❌ Error looking up Snaptrade connection:', lookupError)
        return NextResponse.json(
          { error: 'Failed to find Snaptrade connection', details: lookupError.message },
          { status: 500 }
        )
      }
      
      if (brokerageName && actualConnections) {
        // Find connection matching this brokerage
        const matchingConn = actualConnections.find(conn => {
          // Match by metadata brokerage_name
          if (conn.metadata?.brokerage_name === brokerageName) {
            return true
          }
          // Match by exchange format: snaptrade-{brokerage-slug}
          const brokerageSlug = brokerageName.toLowerCase().replace(/[^a-z0-9]/g, '-')
          if (conn.exchange === `snaptrade-${brokerageSlug}`) {
            return true
          }
          return false
        })
        
        if (matchingConn) {
          actualConnectionId = matchingConn.id
          console.log(`✅ Found actual connection ID for brokerage "${brokerageName}": ${actualConnectionId}`)
        } else {
          // No matching connection - placeholder only
          console.log(`ℹ️ No actual Snaptrade connection found for brokerage "${brokerageName}" (placeholder only)`)
          return NextResponse.json({
            success: true,
            apiTrades: 0,
            csvFiles: 0,
            csvTrades: 0,
            apiTradesCount: 0,
            linkedCSVsCount: 0,
            csvTradesCount: 0,
            linkedCSVIds: [],
            isPlaceholder: true
          })
        }
      } else if (actualConnections && actualConnections.length > 0) {
        // Legacy format without brokerage - use first connection
        actualConnectionId = actualConnections[0].id
        brokerageName = actualConnections[0].metadata?.brokerage_name || null
        console.log(`✅ Found actual connection ID: ${actualConnectionId}`)
      } else {
        // No connection found - placeholder only
        console.log('ℹ️ No actual Snaptrade connection found (placeholder only)')
        return NextResponse.json({
          success: true,
          apiTrades: 0,
          csvFiles: 0,
          csvTrades: 0,
          apiTradesCount: 0,
          linkedCSVsCount: 0,
          csvTradesCount: 0,
          linkedCSVIds: [],
          isPlaceholder: true
        })
      }
    }

    // First, verify the connection exists and belongs to the user
    console.log(`🔍 Fetching connection ${actualConnectionId} for user ${user.id}`)
    const { data: connections, error: fetchConnectionError } = await supabase
      .from('exchange_connections')
      .select('id, exchange, user_id, metadata')
      .eq('id', actualConnectionId)
      .eq('user_id', user.id)
      .limit(1)

    if (fetchConnectionError) {
      console.error('❌ Error fetching connection:', {
        error: fetchConnectionError,
        message: fetchConnectionError.message,
        code: fetchConnectionError.code,
        details: fetchConnectionError.details,
        hint: fetchConnectionError.hint
      })
      return NextResponse.json(
        { 
          error: 'Failed to fetch exchange connection', 
          details: fetchConnectionError.message,
          code: fetchConnectionError.code
        },
        { status: 500 }
      )
    }

    const connection = connections && connections.length > 0 ? connections[0] : null

    if (!connection) {
      console.error('⚠️ Connection not found:', { connectionId, userId: user.id })
      return NextResponse.json(
        { error: 'Exchange connection not found' },
        { status: 404 }
      )
    }

    const connectionBrokerageName = connection.metadata?.brokerage_name || brokerageName
    console.log(`✅ Connection found:`, { 
      id: connection.id, 
      exchange: connection.exchange,
      brokerageName: connectionBrokerageName
    })

    // Count API-imported trades (trades with this exchange_connection_id)
    console.log(`📊 Counting trades for connection ${actualConnectionId}`)
    const { count: apiTradesCount, error: apiTradesError } = await supabase
      .from('trades')
      .select('*', { count: 'exact', head: true })
      .eq('exchange_connection_id', actualConnectionId)
      .eq('user_id', user.id)

    if (apiTradesError) {
      console.error('❌ Error counting API trades:', {
        error: apiTradesError,
        message: apiTradesError.message,
        code: apiTradesError.code,
        details: apiTradesError.details
      })
      return NextResponse.json(
        { error: 'Failed to count API trades', details: apiTradesError.message },
        { status: 500 }
      )
    }

    console.log(`📊 Found ${apiTradesCount || 0} API trades`)

    // Find CSV files linked to this exchange
    console.log(`📊 Fetching CSV files for connection ${actualConnectionId}`)
    const { data: linkedCSVs, error: csvError } = await supabase
      .from('csv_uploads')
      .select('id, trades_count')
      .eq('exchange_connection_id', actualConnectionId)
      .eq('user_id', user.id)

    if (csvError) {
      console.error('❌ Error fetching linked CSVs:', {
        error: csvError,
        message: csvError.message,
        code: csvError.code,
        details: csvError.details
      })
      return NextResponse.json(
        { error: 'Failed to fetch linked CSV files', details: csvError.message },
        { status: 500 }
      )
    }

    console.log(`📊 Found ${linkedCSVs?.length || 0} linked CSV files`)

    const csvFilesCount = linkedCSVs?.length || 0
    const csvTradesCount = linkedCSVs?.reduce((sum, csv) => sum + (csv.trades_count || 0), 0) || 0

    console.log(`📊 Deletion impact:`)
    console.log(`   - API trades: ${apiTradesCount || 0}`)
    console.log(`   - Linked CSV files: ${csvFilesCount}`)
    console.log(`   - CSV trades: ${csvTradesCount}`)

    // Return fields that match what both DataManagement.js and Dashboard.js expect
    return NextResponse.json({
      success: true,
      // Fields expected by Dashboard.js
      apiTrades: apiTradesCount || 0,
      csvFiles: csvFilesCount,
      csvTrades: csvTradesCount,
      // Fields expected by DataManagement.js
      apiTradesCount: apiTradesCount || 0,
      linkedCSVsCount: csvFilesCount,
      csvTradesCount: csvTradesCount,
      linkedCSVIds: linkedCSVs?.map(csv => csv.id) || []
    })
  } catch (error) {
    console.error('❌ Delete preview error (catch block):', {
      error,
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      toString: String(error)
    })
    return NextResponse.json(
      { 
        error: 'Failed to preview deletion impact', 
        details: error?.message || String(error) || 'Unknown error'
      },
      { status: 500 }
    )
  }
}

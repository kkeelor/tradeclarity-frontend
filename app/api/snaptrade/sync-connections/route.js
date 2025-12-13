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

    // Check if connection already exists
    const { data: existing } = await supabase
      .from('exchange_connections')
      .select('id')
      .eq('user_id', user.id)
      .eq('exchange', 'snaptrade')
      .single()

    let connectionsCreated = 0
    let connectionsUpdated = 0

    if (existing) {
      // Update existing connection
      const { error: updateError } = await supabase
        .from('exchange_connections')
        .update({
          is_active: true,
          updated_at: new Date().toISOString(),
          last_synced: new Date().toISOString(),
        })
        .eq('id', existing.id)

      if (!updateError) {
        connectionsUpdated++
        console.log('✅ [Snaptrade Sync] Updated connection:', existing.id)
      } else {
        console.error('❌ [Snaptrade Sync] Error updating connection:', updateError)
      }
    } else {
      // Create new connection
      // For SnapTrade, we don't have API keys, so we'll leave them null
      // The connection will be identified by exchange='snaptrade'
      // One connection represents all SnapTrade accounts for this user
      const { data: newConnection, error: insertError } = await supabase
        .from('exchange_connections')
        .insert({
          user_id: user.id,
          exchange: 'snaptrade',
          is_active: true,
          // api_key_encrypted and api_secret_encrypted are null for SnapTrade
          // We'll identify SnapTrade connections by exchange='snaptrade'
        })
        .select()
        .single()

      if (!insertError) {
        connectionsCreated++
        console.log('✅ [Snaptrade Sync] Created connection:', newConnection.id)
      } else {
        console.error('❌ [Snaptrade Sync] Error creating connection:', insertError)
      }
    }

    const totalProcessed = connectionsCreated + connectionsUpdated

    console.log(`✅ [Snaptrade Sync] Sync complete: ${connectionsCreated} created, ${connectionsUpdated} updated`)

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

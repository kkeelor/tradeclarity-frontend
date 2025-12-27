// app/api/snaptrade/hide-brokerage/route.js
// Hide/show individual SnapTrade brokerages (UI only - doesn't delete from SnapTrade or DB)
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('❌ [Snaptrade Hide Brokerage] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brokerageName, hide = true } = await request.json()

    if (!brokerageName || typeof brokerageName !== 'string') {
      return NextResponse.json(
        { error: 'Brokerage name is required' },
        { status: 400 }
      )
    }

    console.log(`🔄 [Snaptrade Hide Brokerage] ${hide ? 'Hiding' : 'Showing'} brokerage:`, {
      userId: user.id,
      brokerageName,
    })

    // Get current hidden brokerages from snaptrade_users metadata or create a new field
    // For now, we'll use a JSONB field in snaptrade_users table
    // If that doesn't exist, we'll create a separate table
    
    // First, check if snaptrade_users record exists
    const { data: snaptradeUser, error: fetchError } = await supabase
      .from('snaptrade_users')
      .select('id, hidden_brokerages')
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('❌ [Snaptrade Hide Brokerage] Error fetching user:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch SnapTrade user data' },
        { status: 500 }
      )
    }

    // Get current hidden brokerages (default to empty array)
    let hiddenBrokerages = []
    if (snaptradeUser?.hidden_brokerages) {
      try {
        hiddenBrokerages = Array.isArray(snaptradeUser.hidden_brokerages) 
          ? snaptradeUser.hidden_brokerages 
          : JSON.parse(snaptradeUser.hidden_brokerages)
      } catch (e) {
        console.warn('⚠️ [Snaptrade Hide Brokerage] Failed to parse hidden_brokerages, resetting:', e)
        hiddenBrokerages = []
      }
    }

    // Update the list
    if (hide) {
      // Add to hidden list if not already there
      if (!hiddenBrokerages.includes(brokerageName)) {
        hiddenBrokerages.push(brokerageName)
      }
    } else {
      // Remove from hidden list
      hiddenBrokerages = hiddenBrokerages.filter(b => b !== brokerageName)
    }

    // Update the database
    if (snaptradeUser) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('snaptrade_users')
        .update({ hidden_brokerages: hiddenBrokerages })
        .eq('id', snaptradeUser.id)

      if (updateError) {
        console.error('❌ [Snaptrade Hide Brokerage] Error updating hidden brokerages:', updateError)
        return NextResponse.json(
          { error: 'Failed to update hidden brokerages' },
          { status: 500 }
        )
      }
    } else {
      // User doesn't have a snaptrade_users record yet - this shouldn't happen
      // but handle gracefully
      console.warn('⚠️ [Snaptrade Hide Brokerage] No snaptrade_users record found for user')
      return NextResponse.json(
        { error: 'SnapTrade user not found. Please connect a brokerage first.' },
        { status: 404 }
      )
    }

    console.log(`✅ [Snaptrade Hide Brokerage] Brokerage ${hide ? 'hidden' : 'shown'}:`, {
      brokerageName,
      totalHidden: hiddenBrokerages.length,
    })

    return NextResponse.json({
      success: true,
      hiddenBrokerages,
      message: `Brokerage ${hide ? 'hidden' : 'shown'} successfully`,
    })
  } catch (error) {
    console.error('❌ [Snaptrade Hide Brokerage] Error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to update brokerage visibility',
      },
      { status: 500 }
    )
  }
}

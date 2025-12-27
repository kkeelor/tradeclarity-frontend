// app/api/snaptrade/accounts/route.js
// Get all connected Snaptrade brokerage accounts
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getAccounts } from '@/lib/snaptrade-client'
import { decrypt } from '@/lib/encryption'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    console.log('📊 [Snaptrade Accounts] API called')
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('❌ [Snaptrade Accounts] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('📊 [Snaptrade Accounts] User authenticated:', {
      userId: user.id,
      email: user.email,
    })

    // Get Snaptrade user data (including hidden brokerages)
    const { data: snaptradeUser, error: fetchError } = await supabase
      .from('snaptrade_users')
      .select('snaptrade_user_id, user_secret_encrypted, hidden_brokerages')
      .eq('user_id', user.id)
      .single()

    if (fetchError || !snaptradeUser) {
      console.error('❌ [Snaptrade Accounts] User not found:', {
        error: fetchError,
        userId: user.id,
      })
      return NextResponse.json(
        {
          error: 'User not registered with Snaptrade. Please register first.',
        },
        { status: 404 }
      )
    }

    // Parse hidden brokerages
    let hiddenBrokerages = []
    if (snaptradeUser.hidden_brokerages) {
      try {
        hiddenBrokerages = Array.isArray(snaptradeUser.hidden_brokerages)
          ? snaptradeUser.hidden_brokerages
          : JSON.parse(snaptradeUser.hidden_brokerages)
      } catch (e) {
        console.warn('⚠️ [Snaptrade Accounts] Failed to parse hidden_brokerages:', e)
        hiddenBrokerages = []
      }
    }

    console.log('📊 [Snaptrade Accounts] Snaptrade user found:', {
      snaptradeUserId: snaptradeUser.snaptrade_user_id,
      hasSecret: !!snaptradeUser.user_secret_encrypted,
    })

    // Decrypt userSecret
    const userSecret = decrypt(snaptradeUser.user_secret_encrypted)
    console.log('📊 [Snaptrade Accounts] User secret decrypted, fetching accounts from Snaptrade API...')

    // Fetch accounts from Snaptrade
    const allAccounts = await getAccounts(
      snaptradeUser.snaptrade_user_id,
      userSecret
    )

    // Filter out accounts from hidden brokerages
    const visibleAccounts = (allAccounts || []).filter(account => {
      const institutionName = account.institution_name
      const isHidden = institutionName && hiddenBrokerages.includes(institutionName)
      return !isHidden
    })

    console.log(`✅ [Snaptrade Accounts] Found ${allAccounts.length} total accounts, ${visibleAccounts.length} visible (${hiddenBrokerages.length} brokerages hidden):`, {
      totalAccounts: allAccounts.length,
      visibleAccounts: visibleAccounts.length,
      hiddenBrokerages: hiddenBrokerages,
      accounts: visibleAccounts.map(a => ({
        id: a.id,
        name: a.name,
        institution: a.institution_name,
        number: a.number,
      })),
    })

    return NextResponse.json({
      success: true,
      accounts: visibleAccounts,
      hiddenBrokerages, // Include so UI knows which are hidden
    })
  } catch (error) {
    console.error('❌ [Snaptrade Accounts] Error:', {
      error: error.message,
      stack: error.stack,
      response: error.response?.data,
    })
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch Snaptrade accounts',
      },
      { status: 500 }
    )
  }
}

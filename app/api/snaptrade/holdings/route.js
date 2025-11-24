// app/api/snaptrade/holdings/route.js
// Fetch holdings (positions and balances) from Snaptrade
// Uses getUserHoldings per account (preferred method per Snaptrade docs)
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getAccounts, getAccountHoldings } from '@/lib/snaptrade-client'
import { decrypt } from '@/lib/encryption'

export async function GET(request) {
  try {
    console.log('📊 [Snaptrade Holdings] API called')
    const supabase = createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('❌ [Snaptrade Holdings] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('📊 [Snaptrade Holdings] User authenticated:', {
      userId: user.id,
      email: user.email,
    })

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId') // Optional: fetch for specific account
    console.log('📊 [Snaptrade Holdings] Query params:', {
      accountId,
    })

    // Get Snaptrade user data
    const { data: snaptradeUser, error: fetchError } = await supabase
      .from('snaptrade_users')
      .select('snaptrade_user_id, user_secret_encrypted')
      .eq('user_id', user.id)
      .single()

    if (fetchError || !snaptradeUser) {
      console.error('❌ [Snaptrade Holdings] User not found:', {
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

    console.log('📊 [Snaptrade Holdings] Snaptrade user found:', {
      snaptradeUserId: snaptradeUser.snaptrade_user_id,
      hasSecret: !!snaptradeUser.user_secret_encrypted,
    })

    // Decrypt userSecret
    const userSecret = decrypt(snaptradeUser.user_secret_encrypted)
    console.log('📊 [Snaptrade Holdings] User secret decrypted')

    // If accountId provided, fetch holdings for that specific account
    if (accountId) {
      console.log('📊 [Snaptrade Holdings] Fetching holdings for specific account:', accountId)
      const holdings = await getAccountHoldings(
        accountId,
        snaptradeUser.snaptrade_user_id,
        userSecret
      )

      console.log('✅ [Snaptrade Holdings] Fetched account holdings:', {
        hasAccount: !!holdings?.account,
        positionsCount: holdings?.positions?.length || 0,
        cashCount: holdings?.cash?.length || 0,
        totalValue: holdings?.total_value,
      })

      return NextResponse.json({
        success: true,
        holdings: holdings,
      })
    }

    // Otherwise, fetch all accounts first, then get holdings for each
    console.log('📊 [Snaptrade Holdings] Fetching all accounts first...')
    const accounts = await getAccounts(
      snaptradeUser.snaptrade_user_id,
      userSecret
    )

    console.log('📊 [Snaptrade Holdings] Found accounts:', {
      accountCount: accounts.length,
      accountIds: accounts.map(a => a.id),
    })

    // Fetch holdings for each account using getUserHoldings (preferred method)
    console.log('📊 [Snaptrade Holdings] Fetching holdings for each account...')
    const allHoldings = await Promise.all(
      accounts.map(async (account) => {
        try {
          console.log(`📊 [Snaptrade Holdings] Fetching holdings for account ${account.id}...`)
          const holdings = await getAccountHoldings(
            account.id,
            snaptradeUser.snaptrade_user_id,
            userSecret
          )
          return holdings
        } catch (error) {
          console.error(`❌ [Snaptrade Holdings] Error fetching holdings for account ${account.id}:`, error.message)
          // Return null for failed accounts, we'll filter them out
          return null
        }
      })
    )

    // Filter out null values (failed fetches)
    const successfulHoldings = allHoldings.filter(h => h !== null)

    console.log('✅ [Snaptrade Holdings] Fetched all holdings:', {
      totalAccounts: accounts.length,
      successfulHoldings: successfulHoldings.length,
      holdings: successfulHoldings.map(h => ({
        accountId: h?.account?.id,
        accountName: h?.account?.name,
        positionsCount: h?.positions?.length || 0,
        cashCount: h?.cash?.length || 0,
        totalValue: h?.total_value,
      })),
    })

    return NextResponse.json({
      success: true,
      holdings: successfulHoldings, // Array of AccountHoldingsAccount objects
    })
  } catch (error) {
    console.error('❌ [Snaptrade Holdings] Error:', {
      error: error.message,
      stack: error.stack,
      response: error.response?.data,
    })
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch Snaptrade holdings',
      },
      { status: 500 }
    )
  }
}

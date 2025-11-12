// app/api/subscriptions/payment-history/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 401 }
      )
    }

    // Fetch payment history from invoices table
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      // Check if table doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.error('Invoices table does not exist. Please run the migration: create_invoices_table.sql')
        return NextResponse.json({ 
          invoices: [],
          error: 'Invoices table not found. Please run database migration.',
          migrationNeeded: true
        })
      }
      console.error('Error fetching invoices:', error)
      throw error
    }

    console.log(`Found ${invoices?.length || 0} invoices for user ${userId}`)

    return NextResponse.json({ 
      invoices: invoices || []
    })
  } catch (error) {
    console.error('Error fetching payment history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment history', details: error.message },
      { status: 500 }
    )
  }
}

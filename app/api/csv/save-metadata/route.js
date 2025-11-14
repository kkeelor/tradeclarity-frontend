// app/api/csv/save-metadata/route.js
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const supabase = createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { filename, label, accountType, exchangeConnectionId, exchange, size, tradesCount } = await request.json()

    if (!filename || !accountType) {
      return NextResponse.json(
        { error: 'Missing required fields: filename, accountType' },
        { status: 400 }
      )
    }

    // Normalize exchange name to lowercase
    const normalizedExchange = exchange ? exchange.toLowerCase().trim() : null

    // Insert CSV upload metadata
    const insertData = {
      user_id: user.id,
      filename: filename,
      label: label,
      account_type: accountType,
      exchange_connection_id: exchangeConnectionId || null,
      size: size,
      trades_count: tradesCount || 0
    }

    // Add exchange field if provided (for "Other" exchanges)
    // Only set exchange if exchangeConnectionId is not set (to avoid conflicts)
    if (normalizedExchange && !exchangeConnectionId) {
      insertData.exchange = normalizedExchange
    } else if (normalizedExchange && exchangeConnectionId) {
      // If both are set, prefer exchangeConnectionId but also set exchange for reference
      insertData.exchange = normalizedExchange
    }

    console.log('💾 Attempting to insert CSV metadata:', JSON.stringify(insertData, null, 2))

    const { data, error: insertError } = await supabase
      .from('csv_uploads')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      console.error('❌ Error saving CSV metadata:', JSON.stringify(insertError, null, 2))
      console.error('❌ Error details:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
        fullError: insertError
      })
      
      // Return more detailed error information
      const errorDetails = insertError.details || insertError.message || insertError.hint || 'Unknown database error'
      const errorCode = insertError.code || 'UNKNOWN'
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to save CSV metadata',
          details: errorDetails,
          code: errorCode,
          hint: insertError.hint || null
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      file: data
    })
  } catch (error) {
    console.error('❌ Save CSV metadata error:', error)
    console.error('❌ Error stack:', error.stack)
    return NextResponse.json(
      { 
        error: 'Failed to save CSV metadata',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PATCH endpoint to update trades_count after storing trades
export async function PATCH(request) {
  try {
    const supabase = createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { csvUploadId, tradesCount } = await request.json()

    if (!csvUploadId || tradesCount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: csvUploadId, tradesCount' },
        { status: 400 }
      )
    }

    // Update the trades_count for this CSV upload
    const { data, error: updateError } = await supabase
      .from('csv_uploads')
      .update({ trades_count: tradesCount })
      .eq('id', csvUploadId)
      .eq('user_id', user.id) // Security: only update own files
      .select()
      .single()

    if (updateError) {
      console.error('Error updating CSV trade count:', updateError)
      return NextResponse.json(
        { error: 'Failed to update CSV trade count' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      file: data
    })
  } catch (error) {
    console.error('Update CSV trade count error:', error)
    return NextResponse.json(
      { error: 'Failed to update CSV trade count' },
      { status: 500 }
    )
  }
}

// app/api/ai/chat/tokens/route.js
// Endpoint to get total token usage for the current month

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get start of current month
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get all conversations for this month and sum up tokens
    const { data: conversations, error } = await supabase
      .from('ai_conversations')
      .select('total_input_tokens, total_output_tokens, created_at')
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString())

    if (error) {
      console.error('Error fetching token usage:', error)
      return NextResponse.json(
        { error: 'Failed to fetch token usage' },
        { status: 500 }
      )
    }

    // Calculate total tokens used this month
    const totalTokens = (conversations || []).reduce((sum, conv) => {
      const inputTokens = conv.total_input_tokens || 0
      const outputTokens = conv.total_output_tokens || 0
      return sum + inputTokens + outputTokens
    }, 0)

    return NextResponse.json({
      success: true,
      totalTokens: totalTokens
    })

  } catch (error) {
    console.error('Get token usage error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

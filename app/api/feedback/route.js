// app/api/feedback/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    const body = await request.json()
    const { feedback } = body

    // Validate feedback
    if (!feedback || typeof feedback !== 'string') {
      return NextResponse.json(
        { error: 'Feedback is required' },
        { status: 400 }
      )
    }

    if (feedback.length > 150) {
      return NextResponse.json(
        { error: 'Feedback must be 150 characters or less' },
        { status: 400 }
      )
    }

    // Insert feedback into database
    const { error: insertError } = await supabase
      .from('feedback')
      .insert({
        feedback: feedback.trim(),
        user_id: user?.id || null,
        created_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('Feedback insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to save feedback' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Feedback API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

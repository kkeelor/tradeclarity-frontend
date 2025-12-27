// app/api/ai/conversations/shared/[shareId]/route.js
// Public endpoint to fetch shared conversations (no auth required)

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request, { params }) {
  try {
    const { shareId } = params

    if (!shareId) {
      return NextResponse.json(
        { error: 'Share ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get conversation by share_id (public access, no auth required)
    const { data: conversation, error: convError } = await supabase
      .from('ai_conversations')
      .select('id, title, created_at, updated_at, message_count, summary, user_id')
      .eq('share_id', shareId)
      .eq('is_shared', true)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Shared conversation not found or has been revoked' },
        { status: 404 }
      )
    }

    // Fetch user information separately
    let userInfo = null
    if (conversation.user_id) {
      const { data: user } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', conversation.user_id)
        .single()
      
      if (user) {
        userInfo = user
      }
    }

    // Get all messages for this conversation
    const { data: messages, error: messagesError } = await supabase
      .from('ai_messages')
      .select('id, role, content, created_at, sequence')
      .eq('conversation_id', conversation.id)
      .order('sequence', { ascending: true })

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
      // Return conversation even if messages fail to load
      return NextResponse.json({
        success: true,
        conversation: {
          ...conversation,
          messages: []
        }
      })
    }

    return NextResponse.json({
      success: true,
      conversation: {
        ...conversation,
        messages: messages || [],
        user: userInfo
      }
    })

  } catch (error) {
    console.error('Get shared conversation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

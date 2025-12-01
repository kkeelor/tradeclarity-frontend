// app/api/ai/chat/share/route.js
// Endpoint to generate or revoke share links for conversations

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { randomUUID } from 'crypto'

export async function POST(request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { conversationId, action = 'create' } = body

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      )
    }

    // Verify conversation belongs to user
    const { data: conversation, error: convError } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    if (action === 'create' || action === 'generate') {
      // Generate share_id if doesn't exist
      let shareId = conversation.share_id
      
      if (!shareId) {
        shareId = randomUUID()
        const { error: updateError } = await supabase
          .from('ai_conversations')
          .update({
            share_id: shareId,
            is_shared: true
          })
          .eq('id', conversationId)

        if (updateError) {
          console.error('Error creating share link:', updateError)
          return NextResponse.json(
            { error: 'Failed to create share link' },
            { status: 500 }
          )
        }
      } else {
        // Share ID exists, just enable sharing
        const { error: updateError } = await supabase
          .from('ai_conversations')
          .update({
            is_shared: true
          })
          .eq('id', conversationId)

        if (updateError) {
          console.error('Error enabling share:', updateError)
          return NextResponse.json(
            { error: 'Failed to enable sharing' },
            { status: 500 }
          )
        }
      }

      const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/share/${shareId}`

      return NextResponse.json({
        success: true,
        shareId,
        shareUrl,
        message: 'Share link created successfully'
      })
    } else if (action === 'revoke' || action === 'delete') {
      // Revoke sharing (keep share_id for potential re-sharing)
      const { error: updateError } = await supabase
        .from('ai_conversations')
        .update({
          is_shared: false
        })
        .eq('id', conversationId)

      if (updateError) {
        console.error('Error revoking share:', updateError)
        return NextResponse.json(
          { error: 'Failed to revoke share link' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Share link revoked successfully'
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "create" or "revoke"' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Share conversation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to check share status
export async function GET(request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      )
    }

    // Get conversation share status
    const { data: conversation, error } = await supabase
      .from('ai_conversations')
      .select('share_id, is_shared')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (error || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const shareUrl = conversation.share_id 
      ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/share/${conversation.share_id}`
      : null

    return NextResponse.json({
      success: true,
      shareId: conversation.share_id,
      shareUrl,
      isShared: conversation.is_shared || false
    })

  } catch (error) {
    console.error('Get share status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

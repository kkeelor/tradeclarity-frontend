// app/api/ai/chat/summarize/route.js
// Endpoint to summarize and save a conversation when it ends

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { generateCompletion, AI_MODELS, isAIConfigured } from '@/lib/ai/client'

export async function POST(request) {
  try {
    if (!isAIConfigured()) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 503 }
      )
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { conversationId, messages, contextData } = body

    if (!conversationId || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Conversation ID and messages are required' },
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

    // Build conversation text for summarization
    const conversationText = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n\n')

    // Build summary prompt with structured format
    const summaryPrompt = `You are summarizing a trading performance analysis conversation. Create a concise summary that preserves:

KEY ELEMENTS TO PRESERVE:
1. User's main questions and concerns
2. Specific insights provided about their trading performance
3. Metrics and numbers referenced (win rate, profit factor, P&L, etc.)
4. Actionable recommendations given
5. Patterns or behaviors identified
6. Next steps or action items discussed

SUMMARY GUIDELINES:
- Keep under 300 words
- Focus on actionable insights and patterns
- Maintain a positive, constructive tone
- Highlight both strengths and growth opportunities
- Preserve specific numbers and metrics mentioned
- Use clear, structured format

CONVERSATION TO SUMMARIZE:
${conversationText}

Provide a well-structured summary that captures the essence of the conversation while preserving all important details:`

    // Generate summary using Haiku (cheaper)
    let summary
    try {
      summary = await generateCompletion({
        prompt: summaryPrompt,
        model: AI_MODELS.HAIKU.id,
        maxTokens: 400,
        temperature: 0.3
      })
    } catch (error) {
      console.error('Error generating summary:', error)
      // If summarization fails, create a basic summary from message count
      summary = `Conversation with ${messages.length} messages. Key topics discussed: trading performance analysis.`
    }

    // Update conversation with summary
    const { error: updateError } = await supabase
      .from('ai_conversations')
      .update({
        summary: summary,
        message_count: messages.length,
        last_summarized_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)

    if (updateError) {
      console.error('Error saving summary:', updateError)
      return NextResponse.json(
        { error: 'Failed to save summary' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      summary: summary
    })

  } catch (error) {
    console.error('Summarization error:', error)
    
    // Handle specific Anthropic API errors
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { error: 'Authentication error' },
        { status: 401 }
      )
    } else if (error.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Summary will be saved on next attempt.' },
        { status: 429 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to summarize conversation. It will be saved on next attempt.' },
      { status: 500 }
    )
  }
}

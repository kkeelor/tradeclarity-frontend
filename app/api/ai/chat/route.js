// app/api/ai/chat/route.js
// AI Chat API endpoint with streaming support, conversation management, and summarization

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { generateCompletion, AI_MODELS, isAIConfigured } from '@/lib/ai/client'
import Anthropic from '@anthropic-ai/sdk'

function getAnthropicClient() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })
}

// Summarization thresholds
const SUMMARIZE_THRESHOLD_MESSAGES = 8 // Summarize after 8 message pairs (16 total messages)
const SUMMARIZE_THRESHOLD_MINUTES = 5 // Summarize if inactive for 5 minutes after assistant response

export async function POST(request) {
  try {
    if (!isAIConfigured()) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 503 }
      )
    }

    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      message, 
      conversationId, 
      includeContext = true, 
      contextData: userContextData,
      sessionMessages = [], // In-memory messages from current session
      previousSummaries = [] // Summaries from previous conversations
    } = body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Get user's subscription tier
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('tier')
      .eq('user_id', user.id)
      .single()

    const tier = subscription?.tier || 'free'
    const model = tier === 'pro' ? AI_MODELS.SONNET.id : AI_MODELS.HAIKU.id

    // Get or create conversation
    let conversation
    if (conversationId) {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .single()

      if (error || !data) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        )
      }
      conversation = data
    } else {
      // Create new conversation
      const { data, error } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          title: message.substring(0, 50) // Use first 50 chars as title
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating conversation:', error)
        return NextResponse.json(
          { error: 'Failed to create conversation' },
          { status: 500 }
        )
      }
      conversation = data
    }

    // Get conversation summary (we only store summaries, not individual messages)
    const { data: convData } = await supabase
      .from('ai_conversations')
      .select('summary, message_count')
      .eq('id', conversation.id)
      .single()

    const currentSummary = convData?.summary || null
    const previousMessageCount = convData?.message_count || 0

    // Build context from user's data (passed from frontend)
    const contextData = userContextData || {}
    
    // Build system prompt with user context and previous conversation summaries
    const systemPrompt = buildSystemPrompt(contextData, currentSummary, previousSummaries, tier)
    
    // Build messages array for Claude
    const claudeMessages = []
    
    // Add system context as first user message (only if no conversation history)
    if (sessionMessages.length === 0 && !currentSummary) {
      claudeMessages.push({
        role: 'user',
        content: systemPrompt
      })
    } else {
      // If there's history, add system context more subtly
      claudeMessages.push({
        role: 'user',
        content: `[Context: ${systemPrompt.split('\n')[0]} - ${systemPrompt.includes('Total Trades:') ? 'User has trading data available' : 'New user'}]`
      })
    }

    // Add current conversation summary if exists (for continuing conversations)
    if (currentSummary && sessionMessages.length === 0) {
      claudeMessages.push({
        role: 'user',
        content: `Continuing previous conversation. Summary: ${currentSummary}`
      })
    }

    // Add current session messages (in-memory only)
    sessionMessages.forEach(msg => {
      claudeMessages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      })
    })

    // Add current user message
    claudeMessages.push({
      role: 'user',
      content: message
    })

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = ''
        let inputTokens = 0
        let outputTokens = 0

        try {
          const client = getAnthropicClient()
          const messagesForClaude = claudeMessages.map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content
          }))

          // Calculate input tokens
          inputTokens = estimateTokens(messagesForClaude.map(m => m.content).join('\n'))

          const streamResponse = await client.messages.create({
            model,
            max_tokens: tier === 'pro' ? 2000 : 1000,
            temperature: 0.7,
            stream: true,
            messages: messagesForClaude
          })

          for await (const event of streamResponse) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const chunk = event.delta.text
              fullResponse += chunk
              outputTokens += estimateTokens(chunk)
              
              // Send chunk to client
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ chunk, type: 'token' })}\n\n`)
              )
            } else if (event.type === 'message_stop') {
              // Message complete
              if (event.message?.usage) {
                inputTokens = event.message.usage.input_tokens
                outputTokens = event.message.usage.output_tokens
              }
            }
          }

          // Update conversation token counts (we don't save individual messages)
          const { error: updateError } = await supabase
            .from('ai_conversations')
            .update({
              total_input_tokens: conversation.total_input_tokens + inputTokens,
              total_output_tokens: conversation.total_output_tokens + outputTokens,
              message_count: previousMessageCount + 2, // User message + assistant response
              updated_at: new Date().toISOString()
            })
            .eq('id', conversation.id)

          if (updateError) {
            console.error('Error updating conversation:', updateError)
          }

          // Send final stats
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ 
                type: 'done', 
                conversationId: conversation.id,
                tokens: {
                  input: inputTokens,
                  output: outputTokens
                }
              })}\n\n`
            )
          )

          controller.close()
        } catch (error) {
          console.error('Streaming error:', error)
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`
            )
          )
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Build system prompt with user context and previous conversation summaries
 */
function buildSystemPrompt(contextData, currentSummary, previousSummaries, tier) {
  let contextInfo = ''
  
  if (contextData.tradesStats) {
    const stats = contextData.tradesStats
    contextInfo += `\nUser's Trading Statistics:
- Total Trades: ${stats.totalTrades || 0}
- Spot Trades: ${stats.spotTrades || 0}
- Futures Trades: ${stats.futuresIncome || 0}
${stats.oldestTrade ? `- Trading Since: ${new Date(stats.oldestTrade).toLocaleDateString()}` : ''}`
  }

  if (contextData.analytics) {
    const analytics = contextData.analytics
    contextInfo += `\n\nPerformance Metrics:
- Total P&L: $${(analytics.totalPnL || 0).toFixed(2)}
- Win Rate: ${((analytics.winRate || 0) * 100).toFixed(1)}%
- Profit Factor: ${(analytics.profitFactor || 0).toFixed(2)}x
- Average Win: $${(analytics.avgWin || 0).toFixed(2)}
- Average Loss: $${(analytics.avgLoss || 0).toFixed(2)}
${analytics.totalCommission ? `- Total Fees: $${analytics.totalCommission.toFixed(2)}` : ''}`
  }

  if (contextData.allTrades && contextData.allTrades.length > 0) {
    const symbols = {}
    contextData.allTrades.forEach(trade => {
      if (trade.symbol) {
        symbols[trade.symbol] = (symbols[trade.symbol] || 0) + 1
      }
    })
    const topSymbols = Object.entries(symbols)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([symbol]) => symbol)
    
    if (topSymbols.length > 0) {
      contextInfo += `\n\nMost Traded Symbols: ${topSymbols.join(', ')}`
    }
  }

  let previousContext = ''
  if (currentSummary) {
    previousContext += `\n\nCurrent conversation summary: ${currentSummary}`
  }
  
  if (previousSummaries && previousSummaries.length > 0) {
    previousContext += `\n\nPrevious conversations (for context):\n${previousSummaries.map((s, i) => `${i + 1}. ${s.summary || s}`).join('\n\n')}`
  }

  return `You are Vega, a personalized trading performance analyst assistant.

Your role:
- Provide data-driven insights about trading performance
- Reference specific metrics and numbers from the user's data when available
- Give actionable recommendations based on their actual performance
- Be concise but thorough
- Ask clarifying questions when needed
- Use the user's actual trading statistics to provide personalized insights

${contextInfo}${previousContext}

Subscription Tier: ${tier}${tier === 'pro' ? ' (Full access)' : tier === 'trader' ? ' (Standard access)' : ' (Free tier)'}

Provide helpful, personalized trading insights based on the user's data and questions. Always reference specific numbers from their statistics when relevant.`
}

/**
 * Get all previous conversation summaries for context
 * Called when user starts a new chat to load historical context
 */
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

    // Get all user's conversation summaries (most recent first)
    const { data: conversations, error } = await supabase
      .from('ai_conversations')
      .select('id, title, summary, created_at, updated_at, message_count')
      .eq('user_id', user.id)
      .not('summary', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(10) // Last 10 conversations

    if (error) {
      console.error('Error fetching conversations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch conversations' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      conversations: conversations || []
    })

  } catch (error) {
    console.error('Get conversations error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
function estimateTokens(text) {
  if (!text) return 0
  return Math.ceil(text.length / 4)
}

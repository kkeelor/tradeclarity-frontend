// app/api/ai/chat/route.js
// AI Chat API endpoint with streaming support, conversation management, and summarization

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { generateCompletion, AI_MODELS, isAIConfigured } from '@/lib/ai/client'
import Anthropic from '@anthropic-ai/sdk'
import { buildVegaSystemPrompt, buildCachedSystemBlocks, determineExperienceLevel } from '@/lib/ai/prompts/vega-system-prompt'

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

    // Fetch cached analytics for AI context (optimized path)
    let aiContext = null
    let analytics = null
    let tradesStats = null
    
    try {
      // Check cache directly from database
      const { data: cached } = await supabase
        .from('user_analytics_cache')
        .select('ai_context, analytics_data, expires_at')
        .eq('user_id', user.id)
        .single()
      
      // Only use cache if it exists and is not expired
      if (cached && cached.ai_context && new Date(cached.expires_at) > new Date()) {
        aiContext = cached.ai_context
        analytics = cached.analytics_data
      }
    } catch (error) {
      // Cache miss or error - will fall back to contextData
      console.warn('[Chat API] Cache miss or error, falling back to contextData:', error.message)
    }
    
    // Fallback to contextData if cache miss (backward compatibility)
    if (!aiContext && userContextData) {
      const { formatStructuredContext } = await import('@/lib/ai/prompts/vega-system-prompt')
      aiContext = formatStructuredContext(userContextData)
      analytics = userContextData.analytics
      tradesStats = userContextData.tradesStats
    }
    
    // Determine experience level
    const experienceLevel = determineExperienceLevel(tradesStats || (aiContext?.summary ? { totalTrades: aiContext.summary.totalTrades } : null), analytics)
    
    // Build cached system blocks with prompt caching
    const systemBlocks = buildCachedSystemBlocks(aiContext, currentSummary, previousSummaries, tier, experienceLevel)
    
    // Build messages array for Claude (ONLY conversation messages, NO system prompt)
    const claudeMessages = []

    // Add current session messages (in-memory only)
    if (Array.isArray(sessionMessages)) {
      sessionMessages.forEach(msg => {
        if (msg && msg.role && msg.content && typeof msg.content === 'string' && msg.content.trim().length > 0) {
          claudeMessages.push({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content.trim()
          })
        }
      })
    }

    // Add current user message
    if (message && typeof message === 'string' && message.trim().length > 0) {
      claudeMessages.push({
        role: 'user',
        content: message.trim()
      })
    }
    
    // Validate we have at least one message
    if (claudeMessages.length === 0) {
      console.error('No valid messages constructed for Claude')
      return NextResponse.json(
        { error: 'Failed to construct messages. Please try again.' },
        { status: 500 }
      )
    }

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = ''
        let inputTokens = 0
        let outputTokens = 0

        try {
          const client = getAnthropicClient()
          
          // Validate and sanitize messages for Claude
          const messagesForClaude = claudeMessages
            .filter(msg => msg && msg.content && typeof msg.content === 'string' && msg.content.trim().length > 0)
            .map(msg => {
              const role = msg.role === 'assistant' ? 'assistant' : 'user'
              const content = String(msg.content).trim()
              
              if (!content) {
                throw new Error(`Invalid message content: ${JSON.stringify(msg)}`)
              }
              
              return {
                role,
                content
              }
            })

          // Validate messages array
          if (!messagesForClaude || messagesForClaude.length === 0) {
            throw new Error('No valid messages to send to AI')
          }

          // Calculate input tokens
          const contentText = messagesForClaude.map(m => m.content).join('\n')
          inputTokens = estimateTokens(contentText)
          
          // Validate token limits (Claude has context window limits)
          const maxContextTokens = model === AI_MODELS.SONNET.id ? 200000 : 200000 // Both models support 200k context
          if (inputTokens > maxContextTokens * 0.9) { // Use 90% as safety margin
            throw new Error('Message too long. Please shorten your message or start a new conversation.')
          }
          
          // Log request details for debugging (without sensitive data)
          console.log('[Chat API] Request:', {
            model,
            messageCount: messagesForClaude.length,
            conversationId: conversation.id,
            tier,
            inputTokens,
            firstMessagePreview: messagesForClaude[0]?.content?.substring(0, 100)
          })
          
          // Log message structure (first and last only)
          if (messagesForClaude.length > 0) {
            console.log('[Chat API] First message:', {
              role: messagesForClaude[0].role,
              contentLength: messagesForClaude[0].content.length
            })
            if (messagesForClaude.length > 1) {
              console.log('[Chat API] Last message:', {
                role: messagesForClaude[messagesForClaude.length - 1].role,
                contentLength: messagesForClaude[messagesForClaude.length - 1].content.length
              })
            }
          }
          
          let streamResponse
          try {
            streamResponse = await client.messages.create({
              model,
              max_tokens: tier === 'pro' ? 2000 : 1000,
              temperature: 0.7,
              stream: true,
              // CRITICAL: Use system parameter with cache control (NOT in messages!)
              system: systemBlocks,
              // Only conversation messages (no system prompt here)
              messages: messagesForClaude
            })
          } catch (apiError) {
            console.error('[Chat API] Anthropic API call failed:', {
              error: apiError.message,
              status: apiError.status,
              statusCode: apiError.statusCode,
              name: apiError.name,
              stack: apiError.stack?.split('\n').slice(0, 5).join('\n')
            })
            throw apiError
          }

          for await (const event of streamResponse) {
            // Log event type for debugging (first few events only)
            if (outputTokens === 0 && event.type) {
              console.log('[Chat API] First stream event:', event.type)
            }
            
            if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
              const chunk = event.delta.text
              if (chunk) {
                fullResponse += chunk
                outputTokens += estimateTokens(chunk)
                
                // Send chunk to client
                controller.enqueue(
                  new TextEncoder().encode(`data: ${JSON.stringify({ chunk, type: 'token' })}\n\n`)
                )
              }
            } else if (event.type === 'message_stop') {
              // Message complete - get accurate token counts including cache metrics
              if (event.message?.usage) {
                inputTokens = event.message.usage.input_tokens
                outputTokens = event.message.usage.output_tokens
                
                // Log cache metrics for monitoring
                if (event.message.usage.cache_creation_input_tokens || event.message.usage.cache_read_input_tokens) {
                  console.log('[Chat API] Cache metrics:', {
                    cacheCreationTokens: event.message.usage.cache_creation_input_tokens,
                    cacheReadTokens: event.message.usage.cache_read_input_tokens,
                    totalInputTokens: inputTokens,
                    cacheHitRate: event.message.usage.cache_read_input_tokens 
                      ? ((event.message.usage.cache_read_input_tokens / inputTokens) * 100).toFixed(1) + '%'
                      : '0%'
                  })
                }
              }
              console.log('[Chat API] Stream complete:', { inputTokens, outputTokens, responseLength: fullResponse.length })
              break // Exit loop when message is complete
            } else if (event.type === 'error') {
              console.error('[Chat API] Stream error event:', event.error)
              throw new Error(event.error?.message || 'Stream error occurred')
            } else if (event.type === 'message_start' || event.type === 'content_block_start' || event.type === 'content_block_stop') {
              // These are normal events, just continue
              continue
            } else {
              // Log unexpected event types for debugging
              console.warn('[Chat API] Unexpected event type:', event.type)
            }
          }

          // Update conversation token counts (we don't save individual messages)
          const currentInputTokens = (conversation.total_input_tokens || 0) + inputTokens
          const currentOutputTokens = (conversation.total_output_tokens || 0) + outputTokens
          
          const { error: updateError } = await supabase
            .from('ai_conversations')
            .update({
              total_input_tokens: currentInputTokens,
              total_output_tokens: currentOutputTokens,
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
          console.error('[Chat API] Streaming error:', error)
          console.error('[Chat API] Error details:', {
            message: error.message,
            status: error.status,
            statusCode: error.statusCode,
            name: error.name,
            type: error.type,
            stack: error.stack?.split('\n').slice(0, 10).join('\n')
          })
          
          // Handle specific Anthropic API errors
          let errorMessage = 'Sorry, I encountered an error. Please try again.'
          let errorType = 'unknown'
          
          if (error.status === 401 || error.status === 403 || error.statusCode === 401 || error.statusCode === 403) {
            errorMessage = 'Authentication error. Please contact support.'
            errorType = 'auth'
            console.error('[Chat API] Anthropic API authentication failed')
          } else if (error.status === 429 || error.statusCode === 429) {
            errorMessage = 'Rate limit exceeded. Please wait a moment and try again.'
            errorType = 'rate_limit'
          } else if (error.status === 400 || error.statusCode === 400) {
            errorMessage = error.message || 'Invalid request. Please check your message and try again.'
            errorType = 'bad_request'
          } else if (error.status === 500 || error.status === 502 || error.status === 503 || 
                     error.statusCode === 500 || error.statusCode === 502 || error.statusCode === 503) {
            errorMessage = 'Service temporarily unavailable. Please try again in a moment.'
            errorType = 'server_error'
          } else if (error.message) {
            // Use error message if it's user-friendly, otherwise use generic
            if (error.message.includes('too long') || error.message.includes('token') || 
                error.message.includes('API key') || error.message.includes('authentication') ||
                error.message.includes('No valid messages')) {
              errorMessage = error.message
            }
          }
          
          // Log the actual error message for debugging
          if (error.message && !errorMessage.includes(error.message)) {
            console.error('[Chat API] Original error message:', error.message)
          }
          
          // Ensure error is sent to client
          try {
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({ type: 'error', error: errorMessage, errorType, originalMessage: error.message })}\n\n`
              )
            )
          } catch (enqueueError) {
            console.error('[Chat API] Failed to enqueue error:', enqueueError)
          }
          
          try {
            controller.close()
          } catch (closeError) {
            console.error('[Chat API] Failed to close controller:', closeError)
          }
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
    console.error('[Chat API] Chat API error:', error)
    console.error('[Chat API] Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 10).join('\n')
    })
    
    // Handle specific error types
    if (error.message?.includes('JSON')) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error. Please try again.' },
      { status: 500 }
    )
  }
}

/**
 * Build system prompt with user context and previous conversation summaries
 * Uses the structured Vega prompt system
 * NOTE: Legacy function - kept for backward compatibility
 * New implementation uses buildCachedSystemBlocks() with system parameter
 */
function buildSystemPrompt(contextData, currentSummary, previousSummaries, tier) {
  // Determine user experience level dynamically
  const experienceLevel = determineExperienceLevel(contextData.tradesStats, contextData.analytics)
  
  // Build the comprehensive system prompt using the new structured system
  return buildVegaSystemPrompt(contextData, currentSummary, previousSummaries, tier, experienceLevel)
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

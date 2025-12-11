// app/api/ai/chat/route.js
// AI Chat API endpoint with streaming support, conversation management, and summarization

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { generateCompletion, AI_MODELS, isAIConfigured } from '@/lib/ai/client'
import Anthropic from '@anthropic-ai/sdk'
import { buildVegaSystemPrompt, buildCachedSystemBlocks, determineExperienceLevel } from '@/lib/ai/prompts/vega-system-prompt'
import { TIER_LIMITS, canUseTokens, getEffectiveTier } from '@/lib/featureGates'
import { getSelectedMCPTools, callMCPTool, isMCPAvailable } from '@/lib/ai/mcpClient'

// Helper for conditional logging (only in development)
const isDev = process.env.NODE_ENV === 'development'
const debugLog = (...args) => {
  if (isDev) console.log(...args)
}
const debugWarn = (...args) => {
  if (isDev) console.warn(...args)
}

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

    const body = await request.json()
    const { 
      message, 
      conversationId, 
      includeContext = true, 
      contextData: userContextData,
      sessionMessages = [], // In-memory messages from current session
      previousSummaries = [], // Summaries from previous conversations
      isDemoMode = false, // Demo mode flag for unauthenticated users
      demoTokensUsed = 0, // Current token usage for demo users (from sessionStorage)
      coachMode = false, // Coach mode toggle
      coachModeConfig = null // Coach mode configuration { conversationDepth, currentTopic }
    } = body

    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // Allow unauthenticated access only in demo mode
    if (!isDemoMode && (authError || !user)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Demo mode: Check token limit (3000 tokens)
    if (isDemoMode) {
      const DEMO_TOKEN_LIMIT = 3000
      
      // Allow 100% of tokens to be used - only block if limit is already reached
      if (demoTokensUsed >= DEMO_TOKEN_LIMIT) {
        return NextResponse.json(
          { 
            error: 'TOKEN_LIMIT_REACHED',
            message: `You've reached the demo token limit (${demoTokensUsed.toLocaleString()}/${DEMO_TOKEN_LIMIT.toLocaleString()} tokens). Sign in to get higher limits.`,
            current: demoTokensUsed,
            limit: DEMO_TOKEN_LIMIT,
            tier: 'demo',
            upgradeTier: 'free'
          },
          { status: 403 }
        )
      }
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // For authenticated users, get subscription and check token limits
    let subscription = null
    let tier = 'free'
    let tokensUsed = 0
    let conversation = null
    
    if (!isDemoMode && user) {
      // Get user's subscription tier
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('tier, status, cancel_at_period_end, current_period_end')
        .eq('user_id', user.id)
        .single()
      
      subscription = subData
      tier = subscription?.tier || 'free'

      // Check token limit before processing
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      
      // Get current month's token usage
      const { data: conversations } = await supabase
        .from('ai_conversations')
        .select('total_input_tokens, total_output_tokens')
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString())
      
      tokensUsed = (conversations || []).reduce((sum, conv) => {
        const inputTokens = conv.total_input_tokens || 0
        const outputTokens = conv.total_output_tokens || 0
        return sum + inputTokens + outputTokens
      }, 0)

      // Check if user can use tokens (estimate ~1000 tokens per request as a conservative check)
      const estimatedTokensNeeded = 1000
      if (!canUseTokens(subscription, tokensUsed, estimatedTokensNeeded)) {
        const effectiveTier = getEffectiveTier(subscription)
        const limit = TIER_LIMITS[effectiveTier]?.maxTokensPerMonth || TIER_LIMITS.free.maxTokensPerMonth
        const nextTier = effectiveTier === 'free' ? 'trader' : effectiveTier === 'trader' ? 'pro' : null
        
        return NextResponse.json(
          { 
            error: 'TOKEN_LIMIT_REACHED',
            message: `You've reached your AI token limit (${tokensUsed.toLocaleString()}/${limit.toLocaleString()} tokens this month). ${nextTier ? `Upgrade to ${nextTier} for higher limits.` : ''}`,
            current: tokensUsed,
            limit: limit,
            tier: effectiveTier,
            upgradeTier: nextTier
          },
          { status: 403 }
        )
      }

      // Get or create conversation (only for authenticated users)
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
    }

    const model = tier === 'pro' ? AI_MODELS.SONNET.id : AI_MODELS.HAIKU.id

    // Get conversation summary (we only store summaries, not individual messages)
    // Skip for demo mode - demo users don't have conversations in database
    let currentSummary = null
    let previousMessageCount = 0
    
    if (!isDemoMode && conversation) {
      const { data: convData } = await supabase
        .from('ai_conversations')
        .select('summary, message_count')
        .eq('id', conversation.id)
        .single()

      currentSummary = convData?.summary || null
      previousMessageCount = convData?.message_count || 0
    }

    // Fetch cached analytics for AI context (optimized path)
    // For demo mode, use contextData passed from client
    let aiContext = null
    let analytics = null
    let tradesStats = null
    
    if (isDemoMode) {
      // Demo mode: Use context data passed from client
      if (userContextData) {
        analytics = userContextData.analytics || null
        tradesStats = userContextData.tradesStats || null
      }
    } else {
      // Authenticated mode: Fetch from cache
      try {
        // Check cache directly from database
        const { data: cached } = await supabase
          .from('user_analytics_cache')
          .select('ai_context, analytics_data, expires_at, total_trades')
          .eq('user_id', user.id)
          .single()
      
      // Only use cache if it exists, is not expired, and trades still exist
      if (cached && cached.ai_context && new Date(cached.expires_at) > new Date()) {
        // Safety check: Verify trades still exist (cache might be stale if trades were deleted)
        const { count: tradesCount } = await supabase
          .from('trades')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
        
        // If no trades exist but cache says there are trades, don't use cache
        if (tradesCount === 0 && cached.total_trades > 0) {
          console.warn('[Chat API] Cache inconsistency: cache has trades but database has none. Ignoring cache.')
          // Invalidate cache
          await supabase
            .from('user_analytics_cache')
            .delete()
            .eq('user_id', user.id)
            .catch(() => {}) // Ignore errors
        } else {
          // Cache is valid and trades exist (or both are 0) - use it
          aiContext = cached.ai_context
          analytics = cached.analytics_data
        }
      }
    } catch (error) {
      // Cache miss or error - will fall back to contextData
      console.warn('[Chat API] Cache miss or error, falling back to contextData:', error.message)
    }
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
    
      // Fetch MCP tools if available (for AI chat tool integration)
    let mcpTools = []
    const mcpStartTime = Date.now()
    if (isMCPAvailable()) {
      debugLog('[Chat API] 🔍 MCP is available, loading tools...')
      try {
        mcpTools = await getSelectedMCPTools()
        const mcpLoadTime = Date.now() - mcpStartTime
        if (mcpTools.length > 0) {
          debugLog(`[Chat API] ✅ Loaded ${mcpTools.length} MCP tools in ${mcpLoadTime}ms`)
          debugLog(`[Chat API] MCP tools:`, mcpTools.map(t => t.name).join(', '))
        } else {
          debugWarn(`[Chat API] ⚠️ MCP available but no tools loaded (${mcpLoadTime}ms)`)
        }
      } catch (error) {
        const mcpLoadTime = Date.now() - mcpStartTime
        console.error(`[Chat API] ❌ Failed to load MCP tools after ${mcpLoadTime}ms:`, error.message)
        // Continue without tools - graceful degradation
      }
    }
    
    // Build cached system blocks with prompt caching
    // Include MCP tools guidance if tools are available
    const hasMCPTools = mcpTools.length > 0
    
    // Build coach mode config if enabled
    const finalCoachModeConfig = coachMode ? {
      enabled: true,
      conversationDepth: coachModeConfig?.conversationDepth || 0,
      currentTopic: coachModeConfig?.currentTopic || null
    } : null
    
    const systemBlocks = buildCachedSystemBlocks(aiContext, currentSummary, previousSummaries, tier, experienceLevel, hasMCPTools, finalCoachModeConfig)
    
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
        let streamClosed = false

        // Helper function to safely enqueue data
        const safeEnqueue = (data) => {
          if (streamClosed) {
            return false
          }
          try {
            // Try to enqueue - desiredSize check isn't reliable (can be null when queue full)
            controller.enqueue(data)
            return true
          } catch (error) {
            // Check if it's a "closed" error
            if (error.name === 'TypeError' && 
                (error.message.includes('closed') || error.message.includes('Invalid state'))) {
              streamClosed = true
              return false
            }
            // Other errors - log but don't mark as closed
            console.error('[Chat API] Error enqueueing data:', error.message)
            return false
          }
        }

        // Helper function to safely close stream
        const safeClose = () => {
          try {
            if (!streamClosed) {
              controller.close()
              streamClosed = true
            }
          } catch (error) {
            console.error('[Chat API] Error closing stream:', error.message)
            streamClosed = true
          }
        }

        // Helper function to send logs to browser console
        const sendBrowserLog = (level, message, data = null) => {
          const logData = {
            type: 'log',
            level, // 'info', 'warn', 'error', 'debug'
            message,
            data: data ? (typeof data === 'object' ? JSON.stringify(data).substring(0, 500) : String(data).substring(0, 500)) : null,
            timestamp: new Date().toISOString()
          }
          safeEnqueue(
            new TextEncoder().encode(`data: ${JSON.stringify(logData)}\n\n`)
          )
          // Also log to server console
          if (level === 'error') {
            console.error(`[Chat API] [BROWSER] ${message}`, data)
          } else if (level === 'warn') {
            console.warn(`[Chat API] [BROWSER] ${message}`, data)
          } else {
            console.log(`[Chat API] [BROWSER] ${message}`, data)
          }
        }
        
        // Helper function to send chart data to frontend
        const sendChartData = (toolName, symbol, rawData) => {
          // Only process time series tools
          const timeSeriesTools = ['TIME_SERIES_INTRADAY', 'TIME_SERIES_DAILY', 'TIME_SERIES_WEEKLY', 'DIGITAL_CURRENCY_DAILY']
          if (!timeSeriesTools.includes(toolName)) {
            debugLog(`[Chart] Skipping non-time-series tool: ${toolName}`)
            return
          }
          
            debugLog(`[Chart] Processing ${toolName} for symbol: ${symbol}`)
          
          try {
            // Parse the raw data if it's a string
            let parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData
            
            debugLog(`[Chart] Parsed data keys:`, Object.keys(parsed || {}))
            
            // Extract time series data from various formats
            let timeSeriesKey = Object.keys(parsed).find(k => 
              k.includes('Time Series') || 
              k.includes('Technical Analysis') ||
              k.includes('Time Series (Digital')
            )
            
            if (!timeSeriesKey || !parsed[timeSeriesKey]) {
              debugWarn('[Chart] No time series data found in response')
              sendBrowserLog('warn', `No chart data in ${toolName} response`, { 
                keys: Object.keys(parsed || {}).slice(0, 5)
              })
              return
            }
            
            debugLog(`[Chart] Found time series key: ${timeSeriesKey}`)
            
            const timeSeries = parsed[timeSeriesKey]
            const entries = Object.entries(timeSeries)
            
            debugLog(`[Chart] Time series has ${entries.length} entries`)
            
            // Convert to chart format - take last 50 points
            const chartData = entries
              .slice(0, 50)
              .map(([timestamp, values]) => ({
                time: timestamp,
                open: parseFloat(values['1. open'] || values['open'] || 0),
                high: parseFloat(values['2. high'] || values['high'] || 0),
                low: parseFloat(values['3. low'] || values['low'] || 0),
                close: parseFloat(values['4. close'] || values['close'] || 0),
                volume: parseFloat(values['5. volume'] || values['volume'] || 0),
              }))
              .reverse() // Oldest first for chart
            
            if (chartData.length > 0) {
              const chartPayload = {
                type: 'chart_data',
                toolName,
                symbol: symbol || parsed['Meta Data']?.['2. Symbol'] || 'Unknown',
                chartType: 'candlestick',
                data: chartData,
                timestamp: new Date().toISOString()
              }
              
              debugLog(`[Chart] ✅ Sending chart data for ${chartPayload.symbol}: ${chartData.length} points`)
              sendBrowserLog('info', `Chart data ready: ${chartPayload.symbol}`, { points: chartData.length })
              
              safeEnqueue(
                new TextEncoder().encode(`data: ${JSON.stringify(chartPayload)}\n\n`)
              )
            } else {
              debugWarn('[Chart] No valid chart data points extracted')
              sendBrowserLog('warn', 'No valid chart data points', {})
            }
          } catch (error) {
            debugWarn('[Chart] Failed to parse chart data:', error.message)
            sendBrowserLog('error', 'Chart parse error', { error: error.message })
          }
        }

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
          
          // Log request details for debugging (only in dev)
          debugLog('[Chat API] Request:', {
            model,
            messageCount: messagesForClaude.length,
            conversationId: isDemoMode ? conversationId : (conversation?.id || null),
            tier,
            inputTokens
          })
          
          let streamResponse
          try {
            // Prepare API call parameters
            const apiParams = {
              model,
              max_tokens: tier === 'pro' ? 2000 : 1000,
              temperature: 0.7,
              stream: true,
              // CRITICAL: Use system parameter with cache control (NOT in messages!)
              system: systemBlocks,
              // Only conversation messages (no system prompt here)
              messages: messagesForClaude
            }

            // Add tools if MCP is available and tools were loaded
            if (mcpTools.length > 0) {
              apiParams.tools = mcpTools
              debugLog(`[Chat API] Added ${mcpTools.length} tools to API call`)
            }

            streamResponse = await client.messages.create(apiParams)
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

          // Track tool use requests
          const pendingToolUses = new Map() // tool_use_id -> { name, input, inputJson, id }
          let currentToolUseId = null

          for await (const event of streamResponse) {
            // Log event type for debugging (only in dev, first event only)
            if (isDev && outputTokens === 0 && event.type) {
              debugLog('[Chat API] First stream event:', event.type)
            }
            
            // Handle tool_use events (when Claude wants to call a tool)
            // Collect tool_use blocks during streaming - execute after stream completes
            if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
              const toolUse = event.content_block
              currentToolUseId = toolUse.id
              // Initialize with name and id, input will be accumulated from deltas
              pendingToolUses.set(toolUse.id, {
                name: toolUse.name,
                input: toolUse.input || {},
                inputJson: '', // Accumulate JSON string from deltas
                id: toolUse.id
              })
              debugLog(`[Chat API] 🔧 Tool use requested: ${toolUse.name}`, { 
                id: toolUse.id, 
                initialInput: toolUse.input
              })
              sendBrowserLog('info', `Tool requested: ${toolUse.name}`, { 
                toolId: toolUse.id,
                input: toolUse.input 
              })
            } else if (event.type === 'content_block_delta') {
              // Handle different types of deltas
              if (event.delta?.type === 'input_json_delta') {
                // Tool input comes in JSON delta chunks - accumulate them
                const delta = event.delta.partial_json || ''
                if (currentToolUseId && pendingToolUses.has(currentToolUseId)) {
                  const toolUse = pendingToolUses.get(currentToolUseId)
                  toolUse.inputJson += delta
                  // Try to parse accumulated JSON to update input object
                  try {
                    toolUse.input = JSON.parse(toolUse.inputJson)
                  } catch (e) {
                    // JSON not complete yet, keep accumulating
                  }
                }
                // Don't log as unexpected, continue to next event
              } else if (event.delta?.type === 'text_delta') {
                const chunk = event.delta.text
                if (chunk) {
                  fullResponse += chunk
                  outputTokens += estimateTokens(chunk)
                  
                  // Send chunk to client
                  safeEnqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify({ chunk, type: 'token' })}\n\n`)
                  )
                }
              }
              // Continue to next event (don't fall through to "unexpected" handler)
              continue
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
              debugLog('[Chat API] Stream complete:', { 
                inputTokens, 
                outputTokens, 
                responseLength: fullResponse.length,
                pendingToolUses: pendingToolUses.size
              })
              
              break // Exit loop when message is complete
            } else if (event.type === 'error') {
              console.error('[Chat API] Stream error event:', event.error)
              throw new Error(event.error?.message || 'Stream error occurred')
            } else if (event.type === 'content_block_stop') {
              // Tool use block complete - finalize input parsing if this was a tool_use block
              if (currentToolUseId && pendingToolUses.has(currentToolUseId)) {
                const toolUse = pendingToolUses.get(currentToolUseId)
                if (toolUse.inputJson) {
                  try {
                    toolUse.input = JSON.parse(toolUse.inputJson)
                    debugLog(`[Chat API] ✅ Tool ${toolUse.name} input finalized`)
                    sendBrowserLog('info', `Tool input finalized: ${toolUse.name}`, { input: toolUse.input })
                  } catch (e) {
                    debugWarn(`[Chat API] ⚠️ Failed to parse tool input JSON for ${toolUse.name}:`, e.message)
                    sendBrowserLog('warn', `Failed to parse tool input: ${toolUse.name}`, { error: e.message })
                  }
                }
                currentToolUseId = null
              }
              // Continue processing (normal event)
              continue
            } else if (event.type === 'content_block_start' && event.content_block?.type === 'text') {
              // Text content block start - normal, continue
              continue
            } else if (event.type === 'message_start') {
              // Normal event, continue
              continue
            } else {
              // Log unexpected event types for debugging (only in dev)
              const knownEventTypes = ['ping', 'message_delta'] // message_delta is normal, contains usage stats
              if (isDev && !knownEventTypes.includes(event.type)) {
                debugWarn('[Chat API] Unexpected event type:', event.type)
              }
            }
          }

          // After initial stream, check if tools were requested
          // If tools were requested but not yet executed, handle them
          if (pendingToolUses.size > 0 && mcpTools.length > 0) {
            debugLog(`[Chat API] 🔧 Processing ${pendingToolUses.size} pending tool uses`)
            sendBrowserLog('info', `Executing ${pendingToolUses.size} tool(s)`, { 
              toolCount: pendingToolUses.size,
              toolNames: Array.from(pendingToolUses.values()).map(t => t.name).join(', ')
            })
            
            // Execute all pending tools
            for (const [toolUseId, toolUse] of pendingToolUses.entries()) {
              const toolExecutionStart = Date.now()
              try {
                debugLog(`[Chat API] 🚀 Executing MCP tool: ${toolUse.name}`)
                sendBrowserLog('info', `Executing tool: ${toolUse.name}`, { 
                  toolId: toolUseId,
                  input: toolUse.input 
                })
                
                // Execute MCP tool (with retries)
                const toolResult = await callMCPTool(toolUse.name, toolUse.input, 2)
                const toolExecutionTime = Date.now() - toolExecutionStart
                
                debugLog(`[Chat API] ✅ Tool executed successfully: ${toolUse.name} (${toolExecutionTime}ms)`)
                sendBrowserLog('info', `Tool executed: ${toolUse.name}`, { 
                  duration: toolExecutionTime,
                  resultSize: typeof toolResult === 'string' ? toolResult.length : 0
                })
                
                // Send chart data to frontend if this is a time series tool
                sendChartData(toolUse.name, toolUse.input?.symbol, toolResult)
                
                // Add tool_result to messages for follow-up API call
                claudeMessages.push({
                  role: 'assistant',
                  content: [{
                    type: 'tool_use',
                    id: toolUse.id,
                    name: toolUse.name,
                    input: toolUse.input
                  }]
                })
                
                // Tool result is already a string from callMCPTool
                claudeMessages.push({
                  role: 'user',
                  content: [{
                    type: 'tool_result',
                    tool_use_id: toolUse.id,
                    content: toolResult
                  }]
                })
              } catch (toolError) {
                const toolExecutionTime = Date.now() - toolExecutionStart
                const isRateLimit = toolError.message?.toLowerCase().includes('rate limit') || 
                                   toolError.message?.toLowerCase().includes('429') ||
                                   toolError.message?.toLowerCase().includes('too many requests')
                
                if (isRateLimit) {
                  console.error(`[Chat API] ⚠️ RATE LIMIT: Tool execution failed (${toolUse.name}):`, {
                    error: toolError.message,
                    duration: toolExecutionTime,
                    toolId: toolUseId
                  })
                  sendBrowserLog('error', `Rate limit exceeded for tool: ${toolUse.name}`, {
                    error: toolError.message,
                    duration: toolExecutionTime
                  })
                } else {
                  console.error(`[Chat API] ❌ Tool execution failed (${toolUse.name}):`, {
                    error: toolError.message,
                    duration: toolExecutionTime,
                    toolId: toolUseId,
                    stack: toolError.stack?.split('\n').slice(0, 3).join('\n')
                  })
                  sendBrowserLog('error', `Tool execution failed: ${toolUse.name}`, {
                    error: toolError.message,
                    duration: toolExecutionTime
                  })
                }
                
                // Determine if we should try a fallback tool
                let fallbackTool = null
                let fallbackInput = null
                
                // Fallback logic: If REALTIME_BULK_QUOTES fails, try GLOBAL_QUOTE
                if (toolUse.name === 'REALTIME_BULK_QUOTES' && toolUse.input?.symbols) {
                  const symbols = Array.isArray(toolUse.input.symbols) ? toolUse.input.symbols : [toolUse.input.symbols]
                  if (symbols.length === 1) {
                    fallbackTool = 'GLOBAL_QUOTE'
                    fallbackInput = { symbol: symbols[0], entitlement: 'realtime' }
                    console.log(`[Chat API] 🔄 Attempting fallback: ${fallbackTool} for ${symbols[0]}`)
                    sendBrowserLog('info', `Trying fallback tool: ${fallbackTool}`, { originalTool: toolUse.name })
                  }
                }
                
                // Try fallback if available
                if (fallbackTool) {
                  try {
                    const fallbackStart = Date.now()
                    const fallbackResult = await callMCPTool(fallbackTool, fallbackInput, 2) // Use retries for fallback too
                    const fallbackTime = Date.now() - fallbackStart
                    console.log(`[Chat API] ✅ Fallback tool ${fallbackTool} succeeded (${fallbackTime}ms)`)
                    sendBrowserLog('info', `Fallback tool succeeded: ${fallbackTool}`, { duration: fallbackTime })
                    
                    // Use fallback result instead of error
                    claudeMessages.push({
                      role: 'assistant',
                      content: [{
                        type: 'tool_use',
                        id: toolUse.id,
                        name: toolUse.name,
                        input: toolUse.input
                      }]
                    })
                    
                    claudeMessages.push({
                      role: 'user',
                      content: [{
                        type: 'tool_result',
                        tool_use_id: toolUse.id,
                        content: `Note: ${toolUse.name} failed, using ${fallbackTool} instead.\n${fallbackResult}`
                      }]
                    })
                    continue // Skip error handling, use fallback result
                  } catch (fallbackError) {
                    const isFallbackRateLimit = fallbackError.message?.toLowerCase().includes('rate limit') || 
                                               fallbackError.message?.toLowerCase().includes('429')
                    console.error(`[Chat API] ❌ Fallback tool ${fallbackTool} also failed:`, {
                      error: fallbackError.message,
                      isRateLimit: isFallbackRateLimit
                    })
                    sendBrowserLog('error', `Fallback tool failed: ${fallbackTool}`, {
                      error: fallbackError.message,
                      isRateLimit: isFallbackRateLimit
                    })
                    // Continue to error handling below
                  }
                }
                
                // Add error result (or if fallback also failed)
                claudeMessages.push({
                  role: 'assistant',
                  content: [{
                    type: 'tool_use',
                    id: toolUse.id,
                    name: toolUse.name,
                    input: toolUse.input
                  }]
                })
                
                // Provide helpful error message
                const isServerError = toolError.message.includes('500') || toolError.message.includes('502') || toolError.message.includes('503')
                const errorMessage = isServerError
                  ? `The market data service is temporarily unavailable (server error). This is likely a temporary issue with Alpha Vantage. Please try again in a moment, or I can provide analysis based on available data.`
                  : `Tool execution failed: ${toolError.message}. Please continue without this data.`
                
                claudeMessages.push({
                  role: 'user',
                  content: [{
                    type: 'tool_result',
                    tool_use_id: toolUse.id,
                    is_error: true,
                    content: errorMessage
                  }]
                })
              }
            }
            
            // Make follow-up API call with tool results
            // Support recursive tool calls (max 3 rounds to prevent infinite loops)
            let followUpRound = 0
            const maxFollowUpRounds = 3
            let currentMessages = claudeMessages
            
            while (currentMessages.length > messagesForClaude.length && followUpRound < maxFollowUpRounds) {
              followUpRound++
              const followUpStart = Date.now()
              debugLog(`[Chat API] 🔄 Making follow-up API call #${followUpRound}`)
              sendBrowserLog('info', `Making follow-up API call #${followUpRound}`, {
                round: followUpRound,
                toolResultsCount: currentMessages.length - messagesForClaude.length
              })
              
              const followUpResponse = await client.messages.create({
                model,
                max_tokens: tier === 'pro' ? 2000 : 1000,
                temperature: 0.7,
                stream: true,
                system: systemBlocks,
                tools: mcpTools,
                messages: currentMessages
              })
              
              // Stream follow-up response
              let followUpChunkCount = 0
              let followUpEventCount = 0
              const followUpPendingToolUses = new Map()
              let followUpCurrentToolUseId = null
              let followUpFullResponse = ''
              
              debugLog(`[Chat API] Starting to stream follow-up response (round ${followUpRound})...`)
              
              for await (const followUpEvent of followUpResponse) {
                followUpEventCount++
                
                // Check if Claude is requesting more tools in follow-up (handle recursive tool calls)
                if (followUpEvent.type === 'content_block_start' && followUpEvent.content_block?.type === 'tool_use') {
                  const toolUse = followUpEvent.content_block
                  followUpCurrentToolUseId = toolUse.id
                  followUpPendingToolUses.set(toolUse.id, {
                    name: toolUse.name,
                    input: toolUse.input || {},
                    inputJson: '',
                    id: toolUse.id
                  })
                  debugLog(`[Chat API] 🔧 Follow-up round ${followUpRound} requested tool: ${toolUse.name}`)
                  sendBrowserLog('info', `Tool requested in follow-up: ${toolUse.name}`, { round: followUpRound })
                } else if (followUpEvent.type === 'content_block_delta' && followUpEvent.delta?.type === 'input_json_delta') {
                  // Accumulate tool input JSON
                  const delta = followUpEvent.delta.partial_json || ''
                  if (followUpCurrentToolUseId && followUpPendingToolUses.has(followUpCurrentToolUseId)) {
                    const toolUse = followUpPendingToolUses.get(followUpCurrentToolUseId)
                    toolUse.inputJson += delta
                    try {
                      toolUse.input = JSON.parse(toolUse.inputJson)
                    } catch (e) {
                      // JSON not complete yet
                    }
                  }
                  continue
                } else if (followUpEvent.type === 'content_block_delta' && followUpEvent.delta?.type === 'text_delta') {
                  const chunk = followUpEvent.delta.text
                  if (chunk) {
                    followUpChunkCount++
                    followUpFullResponse += chunk
                    fullResponse += chunk
                    outputTokens += estimateTokens(chunk)
                    
                    if (followUpChunkCount <= 3) {
                      console.log(`[Chat API] Follow-up chunk ${followUpChunkCount}:`, chunk.substring(0, 50))
                    }
                    
                    const enqueued = safeEnqueue(
                      new TextEncoder().encode(`data: ${JSON.stringify({ chunk, type: 'token' })}\n\n`)
                    )
                    if (!enqueued && followUpChunkCount === 1) {
                      console.error('[Chat API] ⚠️ Failed to enqueue first follow-up chunk - stream may be closed')
                    }
                  }
                } else if (followUpEvent.type === 'content_block_start') {
                  // Normal event, continue
                } else if (followUpEvent.type === 'content_block_stop') {
                  // Normal event, continue
                } else if (followUpEvent.type === 'message_start') {
                  // Normal event, continue
                } else if (followUpEvent.type === 'message_delta') {
                  // Normal event, contains usage stats
                } else if (followUpEvent.type === 'message_stop') {
                  // Update token counts from final message
                  if (followUpEvent.message?.usage) {
                    inputTokens = followUpEvent.message.usage.input_tokens
                    outputTokens = followUpEvent.message.usage.output_tokens
                  }
                    const followUpTime = Date.now() - followUpStart
                    debugLog(`[Chat API] ✅ Follow-up API call complete (${followUpTime}ms)`)
                    sendBrowserLog('info', 'Follow-up API call complete', { 
                      duration: followUpTime,
                      chunksReceived: followUpChunkCount,
                      responseLength: fullResponse.length
                    })
                    break
                } else if (followUpEvent.type === 'error') {
                  console.error('[Chat API] ❌ Follow-up stream error:', followUpEvent.error)
                  sendBrowserLog('error', 'Follow-up stream error', { error: followUpEvent.error?.message })
                  break
                }
              }
              
              debugLog(`[Chat API] Follow-up stream finished (round ${followUpRound})`)
              
              // If tools were requested in follow-up, execute them and make another follow-up call
              if (followUpPendingToolUses.size > 0) {
                debugLog(`[Chat API] 🔧 Executing ${followUpPendingToolUses.size} tool(s) from follow-up round ${followUpRound}`)
                sendBrowserLog('info', `Executing ${followUpPendingToolUses.size} tool(s) from follow-up`, {
                  round: followUpRound,
                  toolCount: followUpPendingToolUses.size
                })
                
                // Add assistant message with tool_use
                currentMessages.push({
                  role: 'assistant',
                  content: Array.from(followUpPendingToolUses.values()).map(toolUse => ({
                    type: 'tool_use',
                    id: toolUse.id,
                    name: toolUse.name,
                    input: toolUse.input
                  }))
                })
                
                // Execute all tools
                for (const [toolUseId, toolUse] of followUpPendingToolUses.entries()) {
                  try {
                    debugLog(`[Chat API] 🚀 Executing follow-up tool: ${toolUse.name}`)
                    const toolResult = await callMCPTool(toolUse.name, toolUse.input, 2)
                    
                    // Add tool result
                    currentMessages.push({
                      role: 'user',
                      content: [{
                        type: 'tool_result',
                        tool_use_id: toolUse.id,
                        content: toolResult
                      }]
                    })
                    
                    debugLog(`[Chat API] ✅ Follow-up tool ${toolUse.name} executed successfully`)
                  } catch (toolError) {
                    console.error(`[Chat API] ❌ Follow-up tool ${toolUse.name} failed:`, toolError.message)
                    currentMessages.push({
                      role: 'user',
                      content: [{
                        type: 'tool_result',
                        tool_use_id: toolUse.id,
                        is_error: true,
                        content: `Tool execution failed: ${toolError.message}`
                      }]
                    })
                  }
                }
                
                // Clear pending tools and continue loop for another follow-up call
                followUpPendingToolUses.clear()
                continue // Make another follow-up call
              }
              
              // No more tools requested - we're done with this follow-up round
              if (followUpChunkCount === 0) {
                debugWarn('[Chat API] ⚠️ No chunks received in follow-up response!', {
                  round: followUpRound,
                  totalEvents: followUpEventCount
                })
                sendBrowserLog('warn', 'No response chunks received', {
                  round: followUpRound,
                  totalEvents: followUpEventCount
                })
                
                // Send a fallback message if we have tool results but no response
                if (followUpFullResponse.length === 0 && followUpRound === 1) {
                  const fallbackMessage = "I've retrieved the market data, but encountered an issue generating the response. Please try asking again."
                  safeEnqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify({ chunk: fallbackMessage, type: 'token' })}\n\n`)
                  )
                  fullResponse = fallbackMessage
                  debugLog('[Chat API] Sent fallback message to user')
                }
              } else {
                // We got a response with text - we're done
                const followUpTime = Date.now() - followUpStart
                debugLog(`[Chat API] ✅ Follow-up round ${followUpRound} complete (${followUpTime}ms)`)
                sendBrowserLog('info', `Follow-up round ${followUpRound} complete`, {
                  duration: followUpTime,
                  chunksReceived: followUpChunkCount,
                  responseLength: followUpFullResponse.length
                })
                break // Exit the while loop - we have a response
              }
            }
            
            if (followUpRound >= maxFollowUpRounds) {
              debugWarn(`[Chat API] ⚠️ Reached max follow-up rounds (${maxFollowUpRounds})`)
              sendBrowserLog('warn', `Reached max follow-up rounds (${maxFollowUpRounds})`, {})
            }
          }

          // Update conversation token counts and store individual messages
          // Skip for demo mode - demo users don't have conversations in database
          if (!isDemoMode && conversation) {
            const currentInputTokens = (conversation.total_input_tokens || 0) + inputTokens
            const currentOutputTokens = (conversation.total_output_tokens || 0) + outputTokens
            const newMessageCount = previousMessageCount + 2 // User message + assistant response
            
            // Update conversation token counts
            const { error: updateError } = await supabase
              .from('ai_conversations')
              .update({
                total_input_tokens: currentInputTokens,
                total_output_tokens: currentOutputTokens,
                message_count: newMessageCount,
                updated_at: new Date().toISOString()
              })
              .eq('id', conversation.id)

            if (updateError) {
              console.error('Error updating conversation:', updateError)
            }

            // Store individual messages for shareable conversations
            // Get current max sequence number for this conversation
            const { data: lastMessage } = await supabase
              .from('ai_messages')
              .select('sequence')
              .eq('conversation_id', conversation.id)
              .order('sequence', { ascending: false })
              .limit(1)
              .single()

            const nextSequence = (lastMessage?.sequence || -1) + 1

            // Store user message
            const { error: userMsgError } = await supabase
              .from('ai_messages')
              .insert({
                conversation_id: conversation.id,
                role: 'user',
                content: message,
                sequence: nextSequence
              })

            if (userMsgError) {
              console.error('Error storing user message:', userMsgError)
            }

            // Store assistant response (if there's actual content)
            if (fullResponse && fullResponse.trim().length > 0) {
              const { error: assistantMsgError } = await supabase
                .from('ai_messages')
                .insert({
                  conversation_id: conversation.id,
                  role: 'assistant',
                  content: fullResponse,
                  sequence: nextSequence + 1
                })

              if (assistantMsgError) {
                console.error('Error storing assistant message:', assistantMsgError)
              }
            }
          }

          // Send final stats
          safeEnqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ 
                type: 'done', 
                conversationId: isDemoMode ? conversationId : (conversation?.id || null),
                tokens: {
                  input: inputTokens,
                  output: outputTokens
                }
              })}\n\n`
            )
          );

          safeClose();
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
          
          // Ensure error is sent to client (safely)
          const errorSent = safeEnqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ type: 'error', error: errorMessage, errorType, originalMessage: error.message })}\n\n`
            )
          );
          
          if (!errorSent) {
            console.warn('[Chat API] Could not send error message - stream already closed')
          }
          
          safeClose();
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

    // Get all user's conversations (most recent first)
    // Include conversations without summaries (recent chats that haven't been summarized yet)
    const { data: conversations, error } = await supabase
      .from('ai_conversations')
      .select('id, title, summary, created_at, updated_at, message_count')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(50) // Get more conversations for sidebar

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

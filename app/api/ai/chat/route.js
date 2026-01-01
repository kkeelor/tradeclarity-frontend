// app/api/ai/chat/route.js
// AI Chat API endpoint with streaming support, conversation management, and summarization

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { generateCompletion, AI_MODELS, isAIConfigured, getModel } from '@/lib/ai/client'
import { getContextWindow } from '@/lib/ai/models/registry'
import Anthropic from '@anthropic-ai/sdk'
import { buildVegaSystemPrompt, buildCachedSystemBlocks, determineExperienceLevel } from '@/lib/ai/prompts/vega-system-prompt'
import { compileSystemPrompt } from '@/lib/ai/prompts/compiler'
import { TIER_LIMITS, canUseTokens, getEffectiveTier } from '@/lib/featureGates'
import { getSelectedMCPTools, callMCPTool, isMCPAvailable } from '@/lib/ai/mcpClient'
import { PROVIDERS, createStream, extractTextFromEvent, extractUsage, isProviderConfigured, normalizeMessages } from '@/lib/ai/providers'

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
      coachModeConfig = null, // Coach mode configuration { conversationDepth, currentTopic }
      provider = null, // Provider: 'anthropic' or 'deepseek' (defaults to anthropic for backward compatibility)
      model = null // Model ID (defaults based on tier/provider)
    } = body

    const supabase = await createClient()
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

    // Determine provider and model
    // Default to Anthropic for backward compatibility
    let selectedProvider = provider || PROVIDERS.ANTHROPIC
    
    // Validate provider
    if (selectedProvider !== PROVIDERS.ANTHROPIC && selectedProvider !== PROVIDERS.DEEPSEEK) {
      selectedProvider = PROVIDERS.ANTHROPIC
    }
    
    // Check if provider is configured
    if (!isProviderConfigured(selectedProvider)) {
      return NextResponse.json(
        { error: `${selectedProvider} API is not configured` },
        { status: 503 }
      )
    }
    
    // Determine model based on provider and tier
    let selectedModel = model
    if (!selectedModel) {
      if (selectedProvider === PROVIDERS.ANTHROPIC) {
        selectedModel = tier === 'pro' ? AI_MODELS.SONNET.id : AI_MODELS.HAIKU.id
      } else if (selectedProvider === PROVIDERS.DEEPSEEK) {
        // Default to deepseek-chat, can upgrade to reasoner for pro users
        selectedModel = tier === 'pro' ? AI_MODELS.DEEPSEEK_REASONER.id : AI_MODELS.DEEPSEEK_CHAT.id
      }
    }
    
    // Log provider/model selection (only in dev)
    debugLog('[Chat API] Provider/Model selection:', {
      provider: selectedProvider,
      model: selectedModel,
      tier
    })
    
    // Validate model belongs to selected provider
    const modelConfig = Object.values(AI_MODELS).find(m => m.id === selectedModel)
    if (!modelConfig) {
      return NextResponse.json(
        { error: `Invalid model: ${selectedModel}` },
        { status: 400 }
      )
    }
    if (modelConfig.provider !== selectedProvider) {
      return NextResponse.json(
        { error: `Model ${selectedModel} does not belong to provider ${selectedProvider}` },
        { status: 400 }
      )
    }

    // Get conversation summary and message history
    // Skip for demo mode - demo users don't have conversations in database
    let currentSummary = null
    let previousMessageCount = 0
    let conversationMessages = [] // Actual message history for DeepSeek
    
    if (!isDemoMode && conversation) {
      const { data: convData } = await supabase
        .from('ai_conversations')
        .select('summary, message_count')
        .eq('id', conversation.id)
        .single()

      currentSummary = convData?.summary || null
      previousMessageCount = convData?.message_count || 0
      
      // For DeepSeek, load actual message history (not just summaries)
      // This provides better context than summaries alone
      // DeepSeek has 64K context window, so we can include recent messages
      if (selectedProvider === PROVIDERS.DEEPSEEK && conversationId) {
        try {
          const { data: messages } = await supabase
            .from('ai_messages')
            .select('role, content, sequence')
            .eq('conversation_id', conversationId)
            .order('sequence', { ascending: true })
            .limit(50) // Limit to recent 50 messages (roughly 25 exchanges)
          
          if (messages && messages.length > 0) {
            conversationMessages = messages.map(msg => ({
              role: msg.role === 'assistant' ? 'assistant' : 'user',
              content: msg.content
            }))
            
            debugLog('[Chat API] Loaded conversation history for DeepSeek:', {
              messageCount: conversationMessages.length,
              conversationId
            })
          }
        } catch (error) {
          console.warn('[Chat API] Failed to load conversation messages:', error.message)
          // Fall back to summaries if message loading fails
        }
      }
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
    
    // Build system prompt using provider-aware compiler
    // This returns cached blocks for Anthropic, plain string for DeepSeek
    const systemBlocks = compileSystemPrompt({
      modelId: selectedModel,
      aiContext,
      currentSummary,
      previousSummaries,
      tier,
      experienceLevel,
      hasMCPTools,
      coachModeConfig: finalCoachModeConfig
    })
    
    // Log system prompt type for debugging (only in dev)
    debugLog('[Chat API] System prompt compiled:', {
      provider: selectedProvider,
      model: selectedModel,
      isArray: Array.isArray(systemBlocks),
      length: Array.isArray(systemBlocks) ? systemBlocks.length : (systemBlocks?.length || 0),
      hasAiContext: !!aiContext,
      systemPromptPreview: typeof systemBlocks === 'string' 
        ? systemBlocks.substring(0, 200) + '...' 
        : 'Array format'
    })
    
    // Build messages array (ONLY conversation messages, NO system prompt)
    const claudeMessages = []

    // For DeepSeek: Include conversation history from database (if available)
    // This provides better context than summaries alone
    // DeepSeek's automatic prefix caching will optimize repeated system prompts
    // Note: DeepSeek is stateless, so we need to pass full conversation history
    if (selectedProvider === PROVIDERS.DEEPSEEK && conversationMessages.length > 0) {
      // Add historical messages from database
      // We'll merge with sessionMessages below, so we include all historical messages
      // Session messages will be added after, taking precedence for any overlaps
      claudeMessages.push(...conversationMessages)
      
      debugLog('[Chat API] Added historical messages for DeepSeek:', {
        count: conversationMessages.length,
        preview: conversationMessages.slice(0, 2).map(m => ({ role: m.role, contentLength: m.content?.length }))
      })
    }

    // Add current session messages (in-memory only)
    // These take precedence over historical messages to avoid duplication
    // If sessionMessages exist, they represent the current state and should replace overlapping history
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
        
        // Helper function to parse CSV data to chart format
        // Handles formats like: "2025-12-24,187.9400,188.9100,186.5900,188.6100,1234567"
        // Or: "date,open,high,low,close,volume\n2025-12-24,187.94,188.91,186.59,188.61,1234567"
        const parseCSVToChartData = (csvString) => {
          const lines = csvString.split(/\r?\n/).filter(line => line.trim())
          if (lines.length === 0) return []
          
          // Detect header row (might be present)
          const firstLine = lines[0].toLowerCase()
          const hasHeader = firstLine.includes('timestamp') || 
                           firstLine.includes('date') ||
                           firstLine.includes('open') ||
                           firstLine.includes('time')
          
          const dataLines = hasHeader ? lines.slice(1) : lines
          
          return dataLines.map((line, index) => {
            const parts = line.split(',').map(p => p.trim())
            if (parts.length < 4) {
              debugWarn(`[Chart] CSV line ${index + 1} has insufficient columns: ${line}`)
              return null
            }
            
            // Try to parse date (first column)
            let timestamp
            try {
              const dateStr = parts[0]
              // Handle formats: "2025-12-24" or "2025-12-24 16:00:00" or "2025-12-24T16:00:00"
              const date = new Date(dateStr)
              if (isNaN(date.getTime())) {
                debugWarn(`[Chart] Invalid date in CSV line ${index + 1}: ${dateStr}`)
                return null
              }
              timestamp = Math.floor(date.getTime() / 1000)
            } catch (e) {
              debugWarn(`[Chart] Date parse error in CSV line ${index + 1}: ${e.message}`)
              return null
            }
            
            // Parse OHLCV
            // Format: date,open,high,low,close[,volume]
            const open = parseFloat(parts[1] || 0)
            const high = parseFloat(parts[2] || 0)
            const low = parseFloat(parts[3] || 0)
            const close = parseFloat(parts[4] || 0)
            const volume = parts.length > 5 ? parseFloat(parts[5] || 0) : 0
            
            if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) {
              debugWarn(`[Chart] Invalid numeric values in CSV line ${index + 1}: ${line}`)
              return null
            }
            
            return {
              time: timestamp,
              open,
              high,
              low,
              close,
              volume: isNaN(volume) ? 0 : volume
            }
          }).filter(Boolean)
        }
        
        // Helper function to send chart data to frontend
        const sendChartData = (toolName, symbol, rawData, toolInput = {}) => {
          // Only process time series tools
          const timeSeriesTools = ['TIME_SERIES_INTRADAY', 'TIME_SERIES_DAILY', 'TIME_SERIES_WEEKLY', 'DIGITAL_CURRENCY_DAILY']
          if (!timeSeriesTools.includes(toolName)) {
            debugLog(`[Chart] Skipping non-time-series tool: ${toolName}`)
            return
          }
          
          debugLog(`[Chart] Processing ${toolName} for symbol: ${symbol}`)
          debugLog(`[Chart] Tool input:`, toolInput)
          debugLog(`[Chart] Raw data type: ${typeof rawData}, length: ${typeof rawData === 'string' ? rawData.length : 'N/A'}`)
          
          // Extract requested time window from tool input
          // Look for patterns like "last 10 days", "10 days", "days: 10", etc.
          let requestedDays = null
          const inputStr = JSON.stringify(toolInput).toLowerCase()
          const daysMatch = inputStr.match(/(?:last\s+)?(\d+)\s*(?:trading\s*)?days?/i) || 
                           inputStr.match(/days?[:\s]*(\d+)/i) ||
                           inputStr.match(/(\d+)[:\s]*days?/i)
          if (daysMatch) {
            requestedDays = parseInt(daysMatch[1], 10)
            debugLog(`[Chart] Detected requested time window: ${requestedDays} days`)
          }
          
          try {
            // Parse the raw data if it's a string
            // callMCPTool returns a string (JSON, Python dict converted to JSON, or CSV)
            let parsed
            if (typeof rawData === 'string') {
              // Check if it's CSV format
              const trimmedData = rawData.trim()
              // CSV detection: contains commas, and either:
              // 1. Starts with date/timestamp header
              // 2. Starts with date pattern (YYYY-MM-DD)
              // 3. Has multiple lines with date patterns
              const hasCommas = trimmedData.includes(',')
              const startsWithDate = /^\d{4}-\d{2}-\d{2}/.test(trimmedData)
              const hasDatePattern = /\d{4}-\d{2}-\d{2}/.test(trimmedData)
              const hasHeader = trimmedData.toLowerCase().includes('timestamp') || 
                               trimmedData.toLowerCase().includes('date,') ||
                               trimmedData.toLowerCase().startsWith('date,')
              const isCSV = hasCommas && (startsWithDate || hasHeader || (hasDatePattern && trimmedData.split('\n').length > 1))
              
              debugLog(`[Chart] Data format detection:`, {
                hasCommas,
                startsWithDate,
                hasDatePattern,
                hasHeader,
                isCSV,
                firstLine: trimmedData.split('\n')[0].substring(0, 100)
              })
              
              if (isCSV) {
                debugLog(`[Chart] Detected CSV format, parsing...`)
                parsed = parseCSVToChartData(trimmedData)
                if (!parsed || parsed.length === 0) {
                  throw new Error('CSV parsing resulted in empty data')
                }
                // Convert CSV array to object format for consistency
                const timeSeries = {}
                parsed.forEach(point => {
                  // Use timestamp as key (format: YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)
                  const dateKey = new Date(point.time * 1000).toISOString().split('T')[0]
                  timeSeries[dateKey] = {
                    '1. open': point.open.toString(),
                    '2. high': point.high.toString(),
                    '3. low': point.low.toString(),
                    '4. close': point.close.toString(),
                    '5. volume': (point.volume || 0).toString()
                  }
                })
                parsed = { 'Time Series (Daily)': timeSeries }
                debugLog(`[Chart] Converted CSV to time series format with ${Object.keys(timeSeries).length} entries`)
              } else {
                // Try JSON parsing
                try {
                  parsed = JSON.parse(rawData)
                } catch (parseError) {
                  debugWarn(`[Chart] JSON parse failed:`, parseError.message)
                  throw new Error(`Failed to parse chart data as JSON: ${parseError.message}. Data preview: ${rawData.substring(0, 200)}`)
                }
              }
            } else if (typeof rawData === 'object' && rawData !== null) {
              // Already parsed (shouldn't happen from callMCPTool, but handle it)
              parsed = rawData
            } else {
              throw new Error(`Unexpected data type: ${typeof rawData}. Expected string or object.`)
            }
            
            if (!parsed || typeof parsed !== 'object') {
              throw new Error(`Parsed data is not an object. Type: ${typeof parsed}`)
            }
            
            debugLog(`[Chart] Parsed data keys:`, Object.keys(parsed || {}))
            
            // Extract time series data from various formats
            // Alpha Vantage formats: "Time Series (Daily)", "Time Series (1min)", "Time Series (Digital Currency Daily)"
            let timeSeriesKey = Object.keys(parsed).find(k => 
              k.includes('Time Series') || 
              k.includes('Technical Analysis') ||
              k.includes('Time Series (Digital') ||
              k.includes('Digital Currency')
            )
            
            if (!timeSeriesKey || !parsed[timeSeriesKey]) {
              debugWarn('[Chart] No time series data found in response', {
                availableKeys: Object.keys(parsed || {}),
                toolName,
                symbol
              })
              sendBrowserLog('warn', `No chart data in ${toolName} response`, { 
                keys: Object.keys(parsed || {}).slice(0, 10),
                toolName,
                symbol
              })
              return
            }
            
            // Check if time series is actually an object with data
            if (typeof parsed[timeSeriesKey] !== 'object' || Array.isArray(parsed[timeSeriesKey])) {
              debugWarn('[Chart] Time series key found but format is unexpected', {
                timeSeriesKey,
                type: typeof parsed[timeSeriesKey],
                isArray: Array.isArray(parsed[timeSeriesKey]),
                sample: parsed[timeSeriesKey]
              })
              sendBrowserLog('warn', `Time series format unexpected for ${toolName}`, {
                timeSeriesKey,
                type: typeof parsed[timeSeriesKey]
              })
              return
            }
            
            debugLog(`[Chart] Found time series key: ${timeSeriesKey}`)
            
            const timeSeries = parsed[timeSeriesKey]
            const entries = Object.entries(timeSeries)
            
            debugLog(`[Chart] Time series has ${entries.length} entries`)
            
            // Calculate date range filter if requestedDays is specified
            let startDate = null
            if (requestedDays && requestedDays > 0) {
              const endDate = new Date()
              startDate = new Date(endDate)
              // Subtract requested days (accounting for weekends/holidays - use calendar days)
              startDate.setDate(startDate.getDate() - requestedDays)
              debugLog(`[Chart] Filtering to date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]} (${requestedDays} days)`)
            }
            
            // Convert to chart format - filter by date range if specified
            // Convert timestamp strings to Unix timestamps (seconds since epoch)
            const chartData = entries
              .map(([timestamp, values]) => {
                // Parse timestamp - Alpha Vantage uses formats like "2024-12-30" or "2024-12-30 16:00:00"
                let timeValue
                let dateObj
                if (typeof timestamp === 'string') {
                  dateObj = new Date(timestamp)
                  timeValue = Math.floor(dateObj.getTime() / 1000) // Convert to Unix timestamp (seconds)
                } else if (typeof timestamp === 'number') {
                  // Already a timestamp, but ensure it's in seconds (not milliseconds)
                  timeValue = timestamp < 10000000000 ? timestamp : Math.floor(timestamp / 1000)
                  dateObj = new Date(timeValue * 1000)
                } else {
                  // Fallback: use current time
                  timeValue = Math.floor(Date.now() / 1000)
                  dateObj = new Date()
                }
                
                // Filter by date range if requestedDays is specified
                if (startDate && dateObj < startDate) {
                  return null // Skip this entry
                }
                
                return {
                  time: timeValue,
                  open: parseFloat(values['1. open'] || values['open'] || 0),
                  high: parseFloat(values['2. high'] || values['high'] || 0),
                  low: parseFloat(values['3. low'] || values['low'] || 0),
                  close: parseFloat(values['4. close'] || values['close'] || 0),
                  volume: parseFloat(values['5. volume'] || values['volume'] || 0),
                }
              })
              .filter(point => point !== null) // Remove filtered entries
              .slice(0, requestedDays || 50) // Take first N points (newest first from Alpha Vantage)
              .reverse() // Reverse to oldest first for chart display
            
            if (chartData.length > 0) {
              // Filter out invalid data points (NaN or zero values)
              const validChartData = chartData.filter(point => 
                !isNaN(point.time) && 
                point.time > 0 &&
                !isNaN(point.close) && 
                point.close > 0
              )
              
              if (validChartData.length === 0) {
                debugWarn('[Chart] No valid chart data points after filtering')
                sendBrowserLog('warn', 'No valid chart data points after filtering', {
                  originalCount: chartData.length,
                  samplePoint: chartData[0]
                })
                return
              }
              
              const chartPayload = {
                type: 'chart_data',
                toolName,
                symbol: symbol || parsed['Meta Data']?.['2. Symbol'] || parsed['Meta Data']?.['1. Information']?.split(' ')[0] || 'Unknown',
                chartType: 'candlestick',
                data: validChartData,
                timestamp: new Date().toISOString(),
                // Include time range info for chart display
                timeRange: requestedDays ? {
                  days: requestedDays,
                  startTime: validChartData.length > 0 ? validChartData[0].time : null,
                  endTime: validChartData.length > 0 ? validChartData[validChartData.length - 1].time : null
                } : null
              }
              
              debugLog(`[Chart] ✅ Sending chart data for ${chartPayload.symbol}: ${validChartData.length} points`)
              sendBrowserLog('info', `Chart data ready: ${chartPayload.symbol}`, { 
                points: validChartData.length,
                firstPoint: validChartData[0],
                lastPoint: validChartData[validChartData.length - 1]
              })
              
              safeEnqueue(
                new TextEncoder().encode(`data: ${JSON.stringify(chartPayload)}\n\n`)
              )
            } else {
              debugWarn('[Chart] No valid chart data points extracted')
              sendBrowserLog('warn', 'No valid chart data points', {
                entriesLength: entries.length,
                sampleEntry: entries[0]
              })
            }
          } catch (error) {
            const errorMessage = error?.message || error?.toString() || 'Unknown error'
            const errorStack = error?.stack ? error.stack.split('\n').slice(0, 3).join('\n') : null
            debugWarn('[Chart] Failed to parse chart data:', {
              error: errorMessage,
              stack: errorStack,
              toolName,
              symbol,
              dataType: typeof rawData,
              dataPreview: typeof rawData === 'string' ? rawData.substring(0, 200) : 'Not a string'
            })
            sendBrowserLog('error', 'Chart parse error', { 
              error: errorMessage,
              toolName,
              symbol,
              dataType: typeof rawData
            })
          }
        }

        try {
          // Validate and sanitize messages
          const messagesForAI = claudeMessages
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
          if (!messagesForAI || messagesForAI.length === 0) {
            throw new Error('No valid messages to send to AI')
          }

          // Normalize messages for provider (handle system prompt differences)
          const normalized = normalizeMessages(messagesForAI, systemBlocks, selectedProvider)
          
          // Calculate input tokens
          // Handle both string and array (cached blocks) for system prompt
          let systemText = ''
          if (normalized.system) {
            if (Array.isArray(normalized.system)) {
              // Cached blocks format - extract text from each block
              systemText = normalized.system
                .filter(b => b.type === 'text' && b.text)
                .map(b => b.text)
                .join('\n')
            } else {
              systemText = normalized.system
            }
          }
          const contentText = normalized.messages.map(m => {
            // Handle both string content and array content blocks
            if (typeof m.content === 'string') return m.content
            if (Array.isArray(m.content)) {
              return m.content.map(c => c.text || c.content || '').join('')
            }
            return ''
          }).join('\n') + systemText
          inputTokens = estimateTokens(contentText)
          
          // Validate token limits - use context window, not output tokens
          // DeepSeek: 64K context, Claude: 200K context
          const contextWindow = getContextWindow(selectedModel)
          const maxInputTokens = contextWindow * 0.8 // Leave 20% for output
          if (inputTokens > maxInputTokens) {
            console.warn(`[Chat API] Input tokens (${inputTokens}) exceed limit (${maxInputTokens}) for ${selectedModel}`)
            throw new Error('Message too long. Please shorten your message or start a new conversation.')
          }
          
          // Log request details for debugging (only in dev)
          debugLog('[Chat API] Request:', {
            provider: selectedProvider,
            model: selectedModel,
            messageCount: normalized.messages.length,
            conversationId: isDemoMode ? conversationId : (conversation?.id || null),
            tier,
            inputTokens
          })
          
          // Both Anthropic and DeepSeek support tools
          // DeepSeek uses OpenAI-compatible format, which is normalized by provider abstraction
          const toolsToUse = (mcpTools.length > 0) ? mcpTools : null
          if (toolsToUse) {
            debugLog(`[Chat API] Added ${toolsToUse.length} tools to API call (provider: ${selectedProvider})`)
          }
          
          // Create stream using provider abstraction
          const streamGenerator = createStream({
            provider: selectedProvider,
            model: selectedModel,
            messages: normalized.messages,
            system: normalized.system,
            maxTokens: tier === 'pro' ? 2000 : 1000,
            temperature: 0.7,
            tools: toolsToUse
          })
          
          // Convert async generator to stream-like interface
          let streamResponse = {
            [Symbol.asyncIterator]: () => streamGenerator
          }

          // Track tool use requests (only for Anthropic)
          const pendingToolUses = new Map() // tool_use_id -> { name, input, inputJson, id }
          let currentToolUseId = null
          let finalUsage = null

          let eventCount = 0
          let textChunkCount = 0
          for await (const event of streamResponse) {
            eventCount++
            
            // Extract text content from event (provider-agnostic)
            const textChunk = extractTextFromEvent(event, selectedProvider)
            if (textChunk) {
              textChunkCount++
              fullResponse += textChunk
              outputTokens += estimateTokens(textChunk)
              
              // Send chunk to client
              const chunkData = JSON.stringify({ chunk: textChunk, type: 'token' })
              const enqueued = safeEnqueue(
                new TextEncoder().encode(`data: ${chunkData}\n\n`)
              )
              
              if (!enqueued && textChunkCount === 1) {
                console.warn('[Chat API] ⚠️ Failed to enqueue first chunk - stream may be closed')
              }
            }
            
            // Handle tool_use events (normalized to Anthropic format for both providers)
            // DeepSeek tool calls are normalized by provider abstraction to match Anthropic format
            if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
              const toolUse = event.content_block
              currentToolUseId = toolUse.id
              pendingToolUses.set(toolUse.id, {
                name: toolUse.name,
                input: toolUse.input || {},
                inputJson: '',
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
            } else if (event.type === 'content_block_delta' && event.delta?.type === 'input_json_delta') {
              const delta = event.delta.partial_json || ''
              if (currentToolUseId && pendingToolUses.has(currentToolUseId)) {
                const toolUse = pendingToolUses.get(currentToolUseId)
                toolUse.inputJson += delta
                try {
                  toolUse.input = JSON.parse(toolUse.inputJson)
                } catch (e) {
                  // JSON not complete yet
                }
              }
            } else if (event.type === 'content_block_stop' && currentToolUseId && pendingToolUses.has(currentToolUseId)) {
              const toolUse = pendingToolUses.get(currentToolUseId)
              // Finalize tool input - parse accumulated JSON
              // Works for both Anthropic (streamed JSON) and DeepSeek (normalized to same format)
              if (toolUse.inputJson) {
                try {
                  toolUse.input = JSON.parse(toolUse.inputJson)
                  debugLog(`[Chat API] ✅ Tool ${toolUse.name} input finalized (provider: ${selectedProvider})`, { 
                    input: toolUse.input,
                    inputJsonLength: toolUse.inputJson.length 
                  })
                  sendBrowserLog('info', `Tool input finalized: ${toolUse.name}`, { input: toolUse.input })
                } catch (e) {
                  debugWarn(`[Chat API] ⚠️ Failed to parse tool input JSON for ${toolUse.name}:`, e.message)
                  debugWarn(`[Chat API] Input JSON preview:`, toolUse.inputJson.substring(0, 200))
                  sendBrowserLog('warn', `Failed to parse tool input: ${toolUse.name}`, { error: e.message })
                  // Fallback: try to use initial input if available
                  if (!toolUse.input || Object.keys(toolUse.input).length === 0) {
                    toolUse.input = toolUse.input || {}
                  }
                }
              } else if (toolUse.input && Object.keys(toolUse.input).length > 0) {
                // Input already set from initial tool_use event (shouldn't happen, but handle it)
                debugLog(`[Chat API] ✅ Tool ${toolUse.name} input already set (provider: ${selectedProvider})`)
              } else {
                debugWarn(`[Chat API] ⚠️ Tool ${toolUse.name} has no input JSON or initial input`)
                toolUse.input = toolUse.input || {}
              }
              currentToolUseId = null
            } else if (event.type === 'message_stop') {
              // Get accurate token counts (works for both Anthropic and DeepSeek)
              // DeepSeek events are normalized to Anthropic format by provider abstraction
              if (event.message?.usage) {
                finalUsage = event.message.usage
                inputTokens = event.message.usage.input_tokens
                outputTokens = event.message.usage.output_tokens
                
                // Log cache metrics for Anthropic (DeepSeek doesn't have cache metrics)
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
              break
            } else if (event.type === 'error') {
              console.error('[Chat API] Stream error event:', event.error)
              const errorMsg = event.error?.message || 'Stream error occurred'
              sendBrowserLog('error', 'Stream error', { error: errorMsg })
              throw new Error(errorMsg)
            }
          }
          
          debugLog('[Chat API] Stream complete:', { 
            provider: selectedProvider,
            model: selectedModel,
            inputTokens, 
            outputTokens, 
            responseLength: fullResponse.length,
            pendingToolUses: pendingToolUses.size
          })

          // After initial stream, check if tools were requested
          // Execute tools for both Anthropic and DeepSeek
          // DeepSeek tool calls are normalized to Anthropic format by provider abstraction
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
                sendChartData(toolUse.name, toolUse.input?.symbol, toolResult, toolUse.input || {})
                
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
            const initialMessageCount = messagesForAI.length // Track initial message count
            
            while (currentMessages.length > initialMessageCount && followUpRound < maxFollowUpRounds) {
              followUpRound++
              const followUpStart = Date.now()
              debugLog(`[Chat API] 🔄 Making follow-up API call #${followUpRound}`)
              sendBrowserLog('info', `Making follow-up API call #${followUpRound}`, {
                round: followUpRound,
                toolResultsCount: currentMessages.length - initialMessageCount
              })
              
              // Normalize messages for follow-up call
              const followUpNormalized = normalizeMessages(currentMessages, systemBlocks, selectedProvider)
              
              // Use provider abstraction for follow-up calls
              const followUpStreamGenerator = createStream({
                provider: selectedProvider,
                model: selectedModel,
                messages: followUpNormalized.messages,
                system: followUpNormalized.system,
                maxTokens: tier === 'pro' ? 2000 : 1000,
                temperature: 0.7,
                tools: toolsToUse // Use same tools as initial call
              })
              
              // Convert async generator to stream-like interface
              const followUpResponse = {
                [Symbol.asyncIterator]: () => followUpStreamGenerator
              }
              
              // Stream follow-up response
              let followUpChunkCount = 0
              let followUpEventCount = 0
              const followUpPendingToolUses = new Map()
              let followUpCurrentToolUseId = null
              let followUpFullResponse = ''
              
              debugLog(`[Chat API] Starting to stream follow-up response (round ${followUpRound})...`)
              
              for await (const followUpEvent of followUpResponse) {
                followUpEventCount++
                
                // Extract text content from follow-up event
                const followUpTextChunk = extractTextFromEvent(followUpEvent, selectedProvider)
                if (followUpTextChunk) {
                  followUpChunkCount++
                  followUpFullResponse += followUpTextChunk
                  fullResponse += followUpTextChunk
                  outputTokens += estimateTokens(followUpTextChunk)
                  
                  if (followUpChunkCount <= 3) {
                    console.log(`[Chat API] Follow-up chunk ${followUpChunkCount}:`, followUpTextChunk.substring(0, 50))
                  }
                  
                  const enqueued = safeEnqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify({ chunk: followUpTextChunk, type: 'token' })}\n\n`)
                  )
                  if (!enqueued && followUpChunkCount === 1) {
                    console.error('[Chat API] ⚠️ Failed to enqueue first follow-up chunk - stream may be closed')
                  }
                }
                
                // Handle tool calls in follow-up (normalized to Anthropic format for both providers)
                // DeepSeek tool calls are normalized by provider abstraction to match Anthropic format
                if (followUpEvent.type === 'content_block_start' && followUpEvent.content_block?.type === 'tool_use') {
                  const toolUse = followUpEvent.content_block
                  followUpCurrentToolUseId = toolUse.id
                  followUpPendingToolUses.set(toolUse.id, {
                    name: toolUse.name,
                    input: toolUse.input || {},
                    inputJson: '',
                    id: toolUse.id
                  })
                  debugLog(`[Chat API] 🔧 Follow-up round ${followUpRound} requested tool: ${toolUse.name} (provider: ${selectedProvider})`)
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
                } else if (followUpEvent.type === 'content_block_stop' && followUpCurrentToolUseId && followUpPendingToolUses.has(followUpCurrentToolUseId)) {
                  const toolUse = followUpPendingToolUses.get(followUpCurrentToolUseId)
                  if (toolUse.inputJson) {
                    try {
                      toolUse.input = JSON.parse(toolUse.inputJson)
                      debugLog(`[Chat API] ✅ Follow-up tool ${toolUse.name} input finalized (provider: ${selectedProvider})`)
                    } catch (e) {
                      debugWarn(`[Chat API] ⚠️ Failed to parse follow-up tool input JSON for ${toolUse.name}:`, e.message)
                    }
                  }
                  followUpCurrentToolUseId = null
                } else if (followUpEvent.type === 'message_stop') {
                  // Update token counts from final message (works for both Anthropic and DeepSeek)
                  if (followUpEvent.message?.usage) {
                    inputTokens = followUpEvent.message.usage.input_tokens
                    outputTokens = followUpEvent.message.usage.output_tokens
                  }
                  const followUpTime = Date.now() - followUpStart
                  debugLog(`[Chat API] ✅ Follow-up API call complete (${followUpTime}ms, provider: ${selectedProvider})`)
                  sendBrowserLog('info', 'Follow-up API call complete', { 
                    duration: followUpTime,
                    chunksReceived: followUpChunkCount,
                    responseLength: followUpFullResponse.length
                  })
                  break
                } else if (followUpEvent.type === 'error') {
                  const errorDetails = followUpEvent.error || {}
                  const errorMessage = errorDetails.message || errorDetails.toString() || 'Unknown stream error'
                  console.error('[Chat API] ❌ Follow-up stream error:', {
                    error: errorDetails,
                    message: errorMessage,
                    provider: selectedProvider,
                    round: followUpRound
                  })
                  sendBrowserLog('error', 'Follow-up stream error', { 
                    error: errorMessage,
                    provider: selectedProvider,
                    round: followUpRound,
                    errorDetails: Object.keys(errorDetails).length > 0 ? errorDetails : undefined
                  })
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
                    
                    // Send chart data to frontend if this is a time series tool
                    sendChartData(toolUse.name, toolUse.input?.symbol, toolResult, toolUse.input || {})
                    
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
          const finalConversationId = isDemoMode ? conversationId : (conversation?.id || null)
          safeEnqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ 
                type: 'done', 
                conversationId: finalConversationId,
                tokens: {
                  input: inputTokens,
                  output: outputTokens
                },
                provider: selectedProvider,
                model: selectedModel
              })}\n\n`
            )
          );

          safeClose();
        } catch (error) {
          console.error('[Chat API] Streaming error:', error)
          console.error('[Chat API] Error details:', {
            provider: selectedProvider,
            model: selectedModel,
            message: error.message,
            status: error.status,
            statusCode: error.statusCode,
            name: error.name,
            type: error.type,
            errorData: error.errorData,
            stack: error.stack?.split('\n').slice(0, 10).join('\n')
          })
          
          // Handle provider-specific API errors
          let errorMessage = 'Sorry, I encountered an error. Please try again.'
          let errorType = 'unknown'
          
          // DeepSeek-specific errors
          if (selectedProvider === PROVIDERS.DEEPSEEK) {
            if (error.status === 401 || error.statusCode === 401) {
              errorMessage = 'DeepSeek API authentication failed. Please check API key configuration.'
              errorType = 'auth'
              console.error('[Chat API] DeepSeek API authentication failed')
            } else if (error.status === 402 || error.statusCode === 402) {
              errorMessage = 'DeepSeek API quota exceeded or insufficient balance.'
              errorType = 'quota'
            } else if (error.status === 429 || error.statusCode === 429) {
              errorMessage = 'DeepSeek API rate limit exceeded. Please wait a moment and try again.'
              errorType = 'rate_limit'
            } else if (error.message && error.message.includes('DeepSeek')) {
              errorMessage = error.message
            }
          }
          
          // Anthropic-specific errors
          if (selectedProvider === PROVIDERS.ANTHROPIC) {
            if (error.status === 401 || error.status === 403 || error.statusCode === 401 || error.statusCode === 403) {
              errorMessage = 'Authentication error. Please contact support.'
              errorType = 'auth'
              console.error('[Chat API] Anthropic API authentication failed')
            } else if (error.status === 429 || error.statusCode === 429) {
              errorMessage = 'Rate limit exceeded. Please wait a moment and try again.'
              errorType = 'rate_limit'
            }
          }
          
          // Common errors for both providers
          if (error.status === 400 || error.statusCode === 400) {
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
    const supabase = await createClient()
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

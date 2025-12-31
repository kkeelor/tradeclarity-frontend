// app/analyze/components/AIChat.js
// AI Chat component with animated sample questions and token tracking

'use client'

import { useState, useEffect, useRef, useCallback, useMemo, useImperativeHandle, forwardRef } from 'react'
import { Send, Loader2, Bot, User, Sparkles, X, RotateCcw, Square, Minimize2, Maximize2, Database, Link as LinkIcon, Upload, TrendingUp, DollarSign, PieChart, Target, AlertCircle, MessageCircle, Share2, Check, ChevronDown, Menu } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { getDynamicSampleQuestions, getCoachModeStarters, getGreeting } from '@/lib/ai/prompts/sampleQuestions'
import { ChatOptions, parseOptionsFromResponse, detectTopicFromMessage, isFollowUpOnTopic } from '@/components/ui/ChatOptions'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'

// Dynamic import for chart renderer (canvas-based, no SSR)
const VegaChartRenderer = dynamic(
  () => import('@/components/charts/VegaChartRenderer').then(mod => ({ default: mod.default })),
  { ssr: false }
)
import { parseChartRequest, removeChartBlock } from '@/components/charts/VegaChartRenderer'
import { MarkdownMessage } from '@/components/ui/MarkdownMessage'
import { MessageActions } from '@/components/ui/MessageActions'
import { trackFeatureUsage } from '@/lib/analytics'
import { AI_MODELS } from '@/lib/ai/client'

const AIChat = forwardRef(({ analytics, allTrades, tradesStats, metadata, onConnectExchange, onUploadCSV, isVegaPage = false, isFullPage = false, isDemoMode = false, coachMode = false, conversationId: initialConversationId = null, onOpenMobileSidebar }, ref) => {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [sessionMessages, setSessionMessages] = useState([]) // In-memory messages for current session
  
  // Coach mode state - conversation depth and topic tracking
  const [conversationDepth, setConversationDepth] = useState(0)
  const [currentTopic, setCurrentTopic] = useState(null)
  const [lastAssistantOptions, setLastAssistantOptions] = useState([]) // Options from last response
  
  // Reset coach mode state when mode is toggled
  useEffect(() => {
    setConversationDepth(0)
    setCurrentTopic(null)
    setLastAssistantOptions([])
  }, [coachMode])
  const [previousSummaries, setPreviousSummaries] = useState([]) // Previous conversation summaries
  const [input, setInput] = useState('')
  
  // Refs must be defined before useImperativeHandle
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const inputRef = useRef(null)
  const summarizeTimeoutRef = useRef(null)
  const animationTimeoutRef = useRef(null)
  const typeIntervalRef = useRef(null)
  const deleteIntervalRef = useRef(null)
  const abortControllerRef = useRef(null)
  const shouldAutoScrollRef = useRef(true)
  const lastMessageCountRef = useRef(0)
  const scrollTimeoutRef = useRef(null)
  const previousQuestionsRef = useRef([])
  const animationStartDelayRef = useRef(null)
  
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState(initialConversationId)
  
  // Load conversation messages when conversationId changes
  const loadConversation = useCallback(async (convId) => {
    if (!convId || !user) return
    
    try {
      setIsLoading(true)
      const response = await fetch(`/api/ai/chat/${convId}`)
      
      if (!response.ok) {
        throw new Error('Failed to load conversation')
      }
      
      const data = await response.json()
      
      if (data.success && data.conversation) {
        const loadedMessages = data.conversation.messages || []
        
        // Convert database messages to chat format and parse options
        const formattedMessages = loadedMessages.map(msg => {
          const baseMessage = {
            role: msg.role,
            content: msg.content,
            id: msg.id
          }
          
          // Parse options from assistant messages (for coach mode)
          if (msg.role === 'assistant' && msg.content) {
            const parsed = parseOptionsFromResponse(msg.content, false)
            // Use parsed message (with options stripped) as content
            baseMessage.content = parsed.message
            // Store options array if they exist
            if (parsed.options && parsed.options.length > 0) {
              baseMessage.options = parsed.options
            }
          }
          
          return baseMessage
        })
        
        setMessages(formattedMessages)
        setSessionMessages(formattedMessages)
        setConversationId(convId)
        
        // Scroll to bottom after loading
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      }
    } catch (error) {
      console.error('Error loading conversation:', error)
      toast.error('Failed to load conversation')
    } finally {
      setIsLoading(false)
    }
  }, [user])
  
  // Track previous prop value to detect actual prop changes
  const prevInitialConversationIdRef = useRef(initialConversationId)
  
  // Update conversationId when prop changes (not when internal state changes)
  useEffect(() => {
    const prevProp = prevInitialConversationIdRef.current
    const currentProp = initialConversationId
    
    // Only act if the prop actually changed (not if state changed)
    if (prevProp !== currentProp) {
      prevInitialConversationIdRef.current = currentProp
      
      if (currentProp !== null) {
        // Prop was set to a conversation ID - load it
        setConversationId(currentProp)
        loadConversation(currentProp)
      } else if (prevProp !== null && currentProp === null) {
        // Prop was explicitly cleared (changed from non-null to null) - clear chat
        setConversationId(null)
        setMessages([])
        setSessionMessages([])
      }
      // If prop is null and stays null, don't clear (might have conversationId from server)
    }
  }, [initialConversationId, loadConversation])
  
  const [currentSampleIndex, setCurrentSampleIndex] = useState(0)
  const [displayedSample, setDisplayedSample] = useState('')
  const [isTypingSample, setIsTypingSample] = useState(false)
  const [isDeletingSample, setIsDeletingSample] = useState(false)
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [tokenUsage, setTokenUsage] = useState({ input: 0, output: 0 })
  const [demoTokensUsed, setDemoTokensUsed] = useState(0)
  const [shareUrl, setShareUrl] = useState(null)
  const [isSharing, setIsSharing] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [activeTools, setActiveTools] = useState([]) // Track active tool executions
  const [toolStatus, setToolStatus] = useState(null) // Current tool status message
  
  // Model selection state
  const [selectedProvider, setSelectedProvider] = useState('anthropic') // 'anthropic' or 'deepseek'
  const [selectedModel, setSelectedModel] = useState(null) // null = auto-select based on tier
  const [showModelSelector, setShowModelSelector] = useState(false)
  const modelSelectorRef = useRef(null)
  
  // Log provider/model state changes (dev only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[AIChat] Provider/Model changed:', { provider: selectedProvider, model: selectedModel })
    }
  }, [selectedProvider, selectedModel])
  
  // Close model selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target)) {
        setShowModelSelector(false)
      }
    }
    
    if (showModelSelector) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showModelSelector])
  
  // Demo mode token tracking (stored in sessionStorage)
  const getDemoTokensUsed = useCallback(() => {
    if (!isDemoMode || typeof window === 'undefined') return 0
    const stored = sessionStorage.getItem('vega_demo_tokens_used')
    return stored ? parseInt(stored, 10) : 0
  }, [isDemoMode])
  
  const updateDemoTokensUsed = useCallback((inputTokens, outputTokens) => {
    if (!isDemoMode || typeof window === 'undefined') return
    const current = getDemoTokensUsed()
    const newTotal = current + inputTokens + outputTokens
    sessionStorage.setItem('vega_demo_tokens_used', newTotal.toString())
    setDemoTokensUsed(newTotal)
  }, [isDemoMode, getDemoTokensUsed])
  
  // Load demo tokens on mount
  useEffect(() => {
    if (isDemoMode) {
      const tokens = getDemoTokensUsed()
      setDemoTokensUsed(tokens)
    }
  }, [isDemoMode, getDemoTokensUsed])
  const [isClearing, setIsClearing] = useState(false)
  
  // Analytics state - fetch if not provided via props
  const [computedAnalytics, setComputedAnalytics] = useState(analytics)
  const [computedAllTrades, setComputedAllTrades] = useState(allTrades)
  const [analyticsReady, setAnalyticsReady] = useState(!!analytics)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  
  // Track if user has sent messages without data (for onboarding mode)
  const hasNoData = !tradesStats || tradesStats.totalTrades === 0
  const [hasSentMessagesWithoutData, setHasSentMessagesWithoutData] = useState(false)
  const [isDataReady, setIsDataReady] = useState(false) // Track when data is stable

  // Fetch analytics if not provided via props
  useEffect(() => {
    // If analytics not provided and we have trades, fetch from cache
    if (!analytics && tradesStats && tradesStats.totalTrades > 0 && user) {
      setLoadingAnalytics(true)
      fetch('/api/analytics/cache')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.analytics) {
            setComputedAnalytics(data.analytics)
            setComputedAllTrades(data.allTrades || [])
            setAnalyticsReady(true)
          } else {
            // No cache - analytics not ready yet
            setAnalyticsReady(false)
          }
        })
        .catch(err => {
          console.error('Error fetching analytics:', err)
          setAnalyticsReady(false)
        })
        .finally(() => {
          setLoadingAnalytics(false)
        })
    } else if (analytics) {
      // Analytics provided via props
      setComputedAnalytics(analytics)
      setComputedAllTrades(allTrades)
      setAnalyticsReady(true)
    } else if (!tradesStats || tradesStats.totalTrades === 0) {
      // No trades - analytics not needed
      setAnalyticsReady(true)
      setComputedAnalytics(null)
      setComputedAllTrades(null)
    }
  }, [analytics, allTrades, tradesStats, user])

  // Determine when data is ready (not loading and stable)
  useEffect(() => {
    // Data is ready when:
    // 1. Not loading analytics
    // 2. Either tradesStats is null (no data case) OR tradesStats exists (data loaded)
    // 3. Analytics ready state has been determined (not undefined)
    const hasTradesData = tradesStats !== null && tradesStats.totalTrades > 0
    const noDataCase = tradesStats === null || (tradesStats && tradesStats.totalTrades === 0)
    
    // Data is stable when we're not loading and we know the state (either has data or no data)
    // Also need analyticsReady to be true (or tradesStats to be explicitly null/empty for no-data case)
    const dataStable = !loadingAnalytics && analyticsReady && (hasTradesData || noDataCase)
    
    if (dataStable && !isDataReady) {
      // Add a small delay to ensure questions are stable before starting animation
      const delayTimeout = setTimeout(() => {
        setIsDataReady(true)
      }, 400) // 400ms delay to let questions stabilize after data loads
      
      return () => clearTimeout(delayTimeout)
    } else if (!dataStable && isDataReady) {
      setIsDataReady(false)
    }
  }, [loadingAnalytics, analyticsReady, tradesStats, isDataReady])

  // Use computed analytics if available, otherwise use props
  const effectiveAnalytics = computedAnalytics || analytics
  const effectiveAllTrades = computedAllTrades || allTrades
  
  // Calculate dynamic sample questions based on user context
  // Now includes conversation history for smarter, non-repetitive prompts
  const sampleQuestions = useMemo(() => {
    // Always return questions, even if analytics are still loading
    // This ensures smooth UX - questions will update when analytics load
    return getDynamicSampleQuestions(tradesStats, effectiveAnalytics, previousSummaries, { coachMode })
  }, [tradesStats, effectiveAnalytics, previousSummaries, coachMode])
  
  // Coach mode starter prompts - shorter, more conversational
  // Includes conversation history for context-aware starters
  const coachModeStarters = useMemo(() => {
    return getCoachModeStarters(tradesStats, effectiveAnalytics, previousSummaries)
  }, [tradesStats, effectiveAnalytics, previousSummaries])
  
  // Dynamic greeting based on time of day and user context
  const greeting = useMemo(() => {
    return getGreeting(tradesStats, effectiveAnalytics, previousSummaries)
  }, [tradesStats, effectiveAnalytics, previousSummaries])

  // Calculate portfolio data for Vega welcome (only when on Vega page)
  const portfolioData = useMemo(() => {
    if (!isVegaPage || !metadata?.spotHoldings || !Array.isArray(metadata.spotHoldings)) {
      return null
    }
    const totalValue = metadata.spotHoldings.reduce((sum, holding) => {
      const usdValue = parseFloat(holding.usdValue || 0)
      return sum + usdValue
    }, 0)
    const sortedHoldings = [...metadata.spotHoldings]
      .sort((a, b) => parseFloat(b.usdValue || 0) - parseFloat(a.usdValue || 0))
      .slice(0, 5)
    return { totalValue, topHoldings: sortedHoldings }
  }, [isVegaPage, metadata])

  // Generate insights for Vega welcome
  const insights = useMemo(() => {
    if (!isVegaPage || !effectiveAnalytics || !tradesStats) return []
    
    // If user has no trades, show potential insights instead of zero values
    if (tradesStats.totalTrades === 0) {
      return [
        { type: 'info', text: 'Discover hidden profit leaks', icon: Target },
        { type: 'info', text: 'Analyze trading psychology', icon: Brain },
        { type: 'info', text: 'Identify optimal entry times', icon: TrendingUp }
      ]
    }
    
    const insightsList = []
    if (effectiveAnalytics.winRate !== undefined) {
      // winRate is already a percentage (0-100), no need to multiply
      const winRate = effectiveAnalytics.winRate
      if (winRate >= 60) {
        insightsList.push({ type: 'strength', text: `Strong ${winRate.toFixed(1)}% win rate`, icon: TrendingUp })
      } else if (winRate < 40 && winRate > 0) {
        insightsList.push({ type: 'weakness', text: `Win rate of ${winRate.toFixed(1)}% needs improvement`, icon: AlertCircle })
      }
    }
    if (effectiveAnalytics.profitFactor !== undefined) {
      const pf = effectiveAnalytics.profitFactor
      if (pf >= 2) {
        insightsList.push({ type: 'strength', text: `Excellent ${pf.toFixed(2)}x profit factor`, icon: TrendingUp })
      } else if (pf < 1 && pf > 0) {
        insightsList.push({ type: 'weakness', text: `Profit factor of ${pf.toFixed(2)}x indicates losses`, icon: AlertCircle })
      }
    }
    if (tradesStats.totalTrades > 0) {
      insightsList.push({ type: 'info', text: `${tradesStats.totalTrades.toLocaleString()} trades analyzed`, icon: Target })
    }
    return insightsList.slice(0, 3)
  }, [isVegaPage, effectiveAnalytics, tradesStats])
  
  // Reset sample index when questions change (e.g., experience level changes or data loads)
  // This ensures smooth transitions when user's context changes
  useEffect(() => {
    // If questions array changed (not just length, but actual content), reset index
    const previousLength = previousQuestionsRef.current.length
    const questionsChanged = previousLength !== sampleQuestions.length ||
      previousQuestionsRef.current.join('|') !== sampleQuestions.join('|')
    
    if (questionsChanged) {
      setCurrentSampleIndex(0)
      const wasEmpty = previousLength === 0
      const lengthChanged = previousLength !== sampleQuestions.length
      previousQuestionsRef.current = [...sampleQuestions] // Store a copy
      
      // If questions changed significantly (initial load or major change), reset data ready flag
      if (wasEmpty || lengthChanged) {
        setIsDataReady(false)
        // Re-enable after questions stabilize
        const delayTimeout = setTimeout(() => {
          setIsDataReady(true)
        }, 500) // Longer delay to ensure questions are stable
        return () => clearTimeout(delayTimeout)
      }
    } else if (currentSampleIndex >= sampleQuestions.length) {
      // Safety check: if index is out of bounds, reset to 0
      setCurrentSampleIndex(0)
    }
  }, [sampleQuestions, currentSampleIndex])
  
  // Reset onboarding flag when user adds data
  useEffect(() => {
    if (!hasNoData && hasSentMessagesWithoutData) {
      setHasSentMessagesWithoutData(false)
    }
  }, [hasNoData, hasSentMessagesWithoutData])

  // Animate sample questions inside the input box
  useEffect(() => {
    // Stop animation if:
    // - User has messages
    // - User is typing
    // - Input is focused
    // - No questions available
    // - Data is not ready yet (prevents glitchy animation on load)
    if (messages.length > 0 || input.length > 0 || isInputFocused || sampleQuestions.length === 0 || !isDataReady) {
      setDisplayedSample('')
      if (typeIntervalRef.current) clearInterval(typeIntervalRef.current)
      if (deleteIntervalRef.current) clearInterval(deleteIntervalRef.current)
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current)
      if (animationStartDelayRef.current) clearTimeout(animationStartDelayRef.current)
      return
    }

    const currentQuestion = sampleQuestions[currentSampleIndex]
    if (!currentQuestion) return
    
    // Add a small delay before starting animation to ensure smooth start
    // This prevents glitchy animation when data loads
    animationStartDelayRef.current = setTimeout(() => {
      const charIndexRef = { current: 0 }
      setIsTypingSample(true)
      setIsDeletingSample(false)
      setDisplayedSample('')

      // Clear any existing intervals
      if (typeIntervalRef.current) clearInterval(typeIntervalRef.current)
      if (deleteIntervalRef.current) clearInterval(deleteIntervalRef.current)
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current)

      // Typing animation
      typeIntervalRef.current = setInterval(() => {
        if (charIndexRef.current < currentQuestion.length) {
          charIndexRef.current++
          setDisplayedSample(currentQuestion.substring(0, charIndexRef.current))
        } else {
          clearInterval(typeIntervalRef.current)
          setIsTypingSample(false)
          
          // Wait 3 seconds before deleting (increased for better readability)
          animationTimeoutRef.current = setTimeout(() => {
            setIsDeletingSample(true)
            deleteIntervalRef.current = setInterval(() => {
              if (charIndexRef.current > 0) {
                charIndexRef.current--
                setDisplayedSample(currentQuestion.substring(0, charIndexRef.current))
              } else {
                clearInterval(deleteIntervalRef.current)
                setIsDeletingSample(false)
                // Move to next question (cycles through all questions)
                setCurrentSampleIndex((prev) => (prev + 1) % sampleQuestions.length)
              }
            }, 30) // Delete speed
          }, 3000) // Wait 3 seconds before deleting
        }
      }, 50) // Typing speed
    }, 200) // Small delay before starting animation

    return () => {
      if (typeIntervalRef.current) clearInterval(typeIntervalRef.current)
      if (deleteIntervalRef.current) clearInterval(deleteIntervalRef.current)
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current)
      if (animationStartDelayRef.current) clearTimeout(animationStartDelayRef.current)
    }
  }, [currentSampleIndex, messages.length, input.length, isInputFocused, sampleQuestions, isDataReady])

  // Summarize conversation function (memoized to avoid stale closures)
  const summarizeConversation = useCallback(async () => {
    if (!conversationId || sessionMessages.length === 0) return

    try {
      const response = await fetch('/api/ai/chat/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversationId,
          messages: sessionMessages,
          contextData: {
            tradesStats,
            analytics: effectiveAnalytics,
            allTrades: effectiveAllTrades
          }
        })
      })
      
      // Get the summary from the response and add it to previousSummaries
      // This ensures the AI maintains context after summarization
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.summary) {
          // Add new summary to the beginning of previousSummaries (most recent first)
          setPreviousSummaries(prev => [data.summary, ...prev].slice(0, 10)) // Keep last 10
          console.log('[AIChat] Conversation summarized and added to context')
        }
      }
      
      // Clear session messages after summarizing (summary is saved to DB)
      setSessionMessages([])
    } catch (error) {
      console.error('Error summarizing conversation:', error)
    }
  }, [conversationId, sessionMessages, tradesStats, effectiveAnalytics, effectiveAllTrades])

  // Load previous conversation summaries on mount
  useEffect(() => {
    if (!user) return
    
    fetch('/api/ai/chat')
      .then(async res => {
        if (!res.ok) {
          // If 404 or other error, just continue without previous conversations
          return null
        }
        try {
          return await res.json()
        } catch (e) {
          // If response is not JSON, return null
          return null
        }
      })
      .then(data => {
        if (data?.success && data.conversations && Array.isArray(data.conversations)) {
          const summaries = data.conversations
            .filter(c => c.summary)
            .map(c => c.summary)
          setPreviousSummaries(summaries)
        }
      })
      .catch(err => {
        // Silently handle errors - it's okay if there are no previous conversations
        if (err.name !== 'AbortError') {
          // Only log if it's not a network error (which is expected for new users)
          if (!err.message?.includes('fetch')) {
            console.warn('Could not load previous conversations (this is normal for new users):', err.message)
          }
        }
      })
  }, [user])

  // Auto-summarize conversation when inactive after assistant response
  useEffect(() => {
    if (messages.length === 0 || !conversationId) return
    
    const lastMessage = messages[messages.length - 1]
    // If last message is from assistant, start timer to summarize
    if (lastMessage.role === 'assistant' && !lastMessage.isLoading) {
      // Clear existing timeout
      if (summarizeTimeoutRef.current) {
        clearTimeout(summarizeTimeoutRef.current)
      }
      
      // Set new timeout (5 minutes of inactivity)
      summarizeTimeoutRef.current = setTimeout(() => {
        summarizeConversation()
      }, 5 * 60 * 1000) // 5 minutes
    }

    return () => {
      if (summarizeTimeoutRef.current) {
        clearTimeout(summarizeTimeoutRef.current)
      }
    }
  }, [messages, conversationId, summarizeConversation])

  // Auto-summarize when conversation reaches threshold (8 message pairs = 16 messages)
  useEffect(() => {
    if (sessionMessages.length >= 16 && conversationId) {
      summarizeConversation()
    }
  }, [sessionMessages.length, conversationId, summarizeConversation])

  // Summarize conversation before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (conversationId && sessionMessages.length > 0) {
        // Use sendBeacon for reliable delivery
        const data = JSON.stringify({
          conversationId,
          messages: sessionMessages,
          contextData: {
            tradesStats,
            analytics: effectiveAnalytics,
            allTrades: effectiveAllTrades
          }
        })
        navigator.sendBeacon('/api/ai/chat/summarize', data)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [conversationId, sessionMessages, tradesStats, effectiveAnalytics, effectiveAllTrades])

  // Smart scroll management - only scroll the container, not the page
  const scrollToBottom = useCallback((smooth = false, immediate = false) => {
    const container = messagesContainerRef.current
    if (!container) return
    
    // In maximized view, always auto-scroll (ignore shouldAutoScroll)
    const shouldScroll = isMaximized ? true : shouldAutoScrollRef.current
    if (!shouldScroll) return
    
    // Clear any pending scroll
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    
    const performScroll = () => {
      const container = messagesContainerRef.current
      if (!container) return
      
      // Check again if we should scroll
      const shouldScrollNow = isMaximized ? true : shouldAutoScrollRef.current
      if (!shouldScrollNow) return
      
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        if (!container) return
        
        // Scroll container to bottom (most reliable method)
        const scrollHeight = container.scrollHeight
        const clientHeight = container.clientHeight
        
        if (smooth) {
          // Use smooth scroll with better easing
          container.scrollTo({
            top: scrollHeight - clientHeight,
            behavior: 'smooth'
          })
        } else {
          // Instant scroll - directly set scrollTop for streaming updates
          container.scrollTop = scrollHeight - clientHeight
        }
      })
    }
    
    if (immediate) {
      // Use double RAF to ensure DOM has fully rendered
      requestAnimationFrame(() => {
        requestAnimationFrame(performScroll)
      })
    } else {
      // Throttle scroll updates during streaming (every 50ms for very smooth experience)
      scrollTimeoutRef.current = setTimeout(performScroll, 50)
    }
  }, [isMaximized])

  // Check if user is near bottom of scroll container
  const isNearBottom = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return true
    
    const threshold = 100 // pixels from bottom
    const { scrollTop, scrollHeight, clientHeight } = container
    return scrollHeight - scrollTop - clientHeight < threshold
  }, [])

  // Handle scroll events to detect manual scrolling and prevent page scroll
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      shouldAutoScrollRef.current = isNearBottom()
    }
    
    const handleWheel = (e) => {
      // Only prevent if we're at the boundaries and scrolling would affect page
      const { scrollTop, scrollHeight, clientHeight } = container
      const isAtTop = scrollTop === 0
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1
      
      if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
        // At boundary, let it bubble (but overscrollBehavior should contain it)
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    container.addEventListener('wheel', handleWheel, { passive: true })
    return () => {
      container.removeEventListener('scroll', handleScroll)
      container.removeEventListener('wheel', handleWheel)
    }
  }, [isNearBottom])

  // Scroll to bottom when new messages are added or content updates
  useEffect(() => {
    const currentMessageCount = messages.length
    const lastMessageCount = lastMessageCountRef.current
    const lastMessage = messages[messages.length - 1]
    const isStreaming = lastMessage?.isLoading || false
    
    // In maximized view, always auto-scroll during streaming
    if (isMaximized && isStreaming) {
      // During streaming in maximized view, scroll instantly but throttled
      scrollToBottom(false, false)
      return
    }
    
    // Only scroll if message count changed (new message added)
    if (currentMessageCount !== lastMessageCount) {
      // Use smooth scroll when new message is added
      scrollToBottom(true, true)
      lastMessageCountRef.current = currentMessageCount
    } else {
      // Content update during streaming - only scroll if user is already at bottom
      // In maximized view, always scroll during streaming
      if (isMaximized && isStreaming) {
        scrollToBottom(false, false)
      } else if (shouldAutoScrollRef.current) {
        scrollToBottom(false, false)
      }
    }
    
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [messages, scrollToBottom, isMaximized])

  // Helper function to format tool names for display
  const formatToolName = useCallback((toolName) => {
    if (!toolName) return 'data'
    // Convert tool names like TIME_SERIES_INTRADAY to "Market Data"
    const toolNameMap = {
      'TIME_SERIES_INTRADAY': 'Market Data',
      'TIME_SERIES_DAILY': 'Daily Data',
      'TIME_SERIES_WEEKLY': 'Weekly Data',
      'TIME_SERIES_MONTHLY': 'Monthly Data',
      'GLOBAL_QUOTE': 'Quote',
      'SYMBOL_SEARCH': 'Symbol Search',
      'OVERVIEW': 'Company Overview'
    }
    return toolNameMap[toolName] || toolName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }, [])

  // Helper function to send a message (extracted from handleSend for reuse)
  const sendMessage = useCallback(async (messageText) => {
    if (!messageText || !messageText.trim() || isLoading) return false

    // Check demo token limit before sending
    if (isDemoMode) {
      const DEMO_TOKEN_LIMIT = 3000
      const currentTokens = getDemoTokensUsed()
      
      if (currentTokens >= DEMO_TOKEN_LIMIT) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('demoTokenLimitReached'))
        }
        const errorMessage = {
          id: Date.now(),
          role: 'assistant',
          content: `You've reached the demo token limit. Sign up to continue analyzing your trades with higher limits!`,
          timestamp: new Date(),
          error: true
        }
        setMessages(prev => [...prev, errorMessage])
        return false
      }
    }

    const userMessage = messageText.trim()
    setIsLoading(true)
    
    // Clear last options when user sends new message
    setLastAssistantOptions([])

    // Create abort controller for this request
    abortControllerRef.current = new AbortController()

    // Ensure we auto-scroll when user sends a message
    shouldAutoScrollRef.current = true
    
    // Blur input to prevent focus-related page scrolling
    if (inputRef.current) {
      inputRef.current.blur()
    }
    
    // Coach mode: Track topic and depth
    let newDepth = conversationDepth
    let newTopic = currentTopic
    
    if (coachMode) {
      const detectedTopic = detectTopicFromMessage(userMessage)
      
      // Check if this is a follow-up on the same topic
      if (currentTopic && isFollowUpOnTopic(userMessage, currentTopic, sessionMessages[sessionMessages.length - 1]?.content)) {
        // Same topic - increase depth
        newDepth = Math.min(conversationDepth + 1, 3) // Max depth 3
        // Keep current topic
      } else {
        // New topic - reset depth
        newDepth = 0
        newTopic = detectedTopic
      }
      
      setConversationDepth(newDepth)
      setCurrentTopic(newTopic)
    }
    
    // Track conversation started (first message)
    const isFirstMessage = messages.length === 0
    if (isFirstMessage) {
      trackFeatureUsage.aiConversationStarted()
    }
    
    // Add user message to UI immediately
    const newUserMessage = {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newUserMessage])
    setSessionMessages(prev => [...prev, { role: 'user', content: userMessage }])
    
    // Track message sent
    trackFeatureUsage.aiChatMessageSent(conversationId || 'new', isDemoMode)
    
    // Track if user has sent messages without data
    if (hasNoData && !hasSentMessagesWithoutData) {
      setHasSentMessagesWithoutData(true)
    }

    // Add placeholder for assistant response
    const assistantMessageId = Date.now() + 1
    setMessages(prev => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true
    }])

    try {
      const requestPayload = {
        message: userMessage,
        conversationId: conversationId,
        includeContext: true,
        contextData: {
          tradesStats: tradesStats,
          analytics: effectiveAnalytics,
          allTrades: effectiveAllTrades
        },
        sessionMessages: sessionMessages,
        previousSummaries: previousSummaries,
        isDemoMode: isDemoMode,
        demoTokensUsed: isDemoMode ? getDemoTokensUsed() : 0,
        coachMode: coachMode,
        coachModeConfig: coachMode ? {
          conversationDepth: newDepth,
          currentTopic: newTopic
        } : null,
        provider: selectedProvider,
        model: selectedModel // null = auto-select based on tier
      }
      
      // Log request (dev only)
      if (process.env.NODE_ENV === 'development') {
        console.log('[AIChat] Sending request:', { provider: selectedProvider, model: selectedModel })
      }
      
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify(requestPayload)
      })

      if (!response.ok) {
        let errorData = {}
        try {
          const text = await response.text()
          if (text) {
            errorData = JSON.parse(text)
          }
        } catch (e) {
          console.warn('[AIChat] Failed to parse error response:', e)
        }
        const errorMsg = errorData.error || errorData.message || `Request failed with status ${response.status}`
        const error = new Error(errorMsg)
        error.errorData = errorData
        error.status = response.status
        throw error
      }

      if (!response.body) {
        throw new Error('No response body received from server')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''
      let currentTokens = { input: 0, output: 0 }
      let streamComplete = false

      try {
        while (true) {
          // Check if request was aborted
          if (abortControllerRef.current?.signal.aborted) {
            reader.cancel()
            break
          }

          const { done, value } = await reader.read()
          if (done) {
            streamComplete = true
            break
          }

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.trim() === '') continue
            
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6))
                
                if (data.type === 'token' && data.chunk) {
                  assistantContent += data.chunk
                  
                  // Coach mode: Parse options during streaming to show clean content
                  let displayContent = assistantContent
                  let streamingOptions = []
                  
                  if (coachMode && assistantContent) {
                    try {
                      const parsed = parseOptionsFromResponse(assistantContent)
                      displayContent = parsed.message || assistantContent
                      streamingOptions = parsed.options || []
                    } catch (parseError) {
                      // If parsing fails, just use original content
                      console.warn('[AIChat] Failed to parse options:', parseError)
                      displayContent = assistantContent
                      streamingOptions = []
                    }
                  }
                  
                  // Update assistant message and clear loading state once we have content
                  setMessages(prev => prev.map(msg => {
                    if (msg.id === assistantMessageId) {
                      const updatedMsg = { ...msg, content: displayContent, isLoading: false }
                      // Only add options if coach mode is enabled and we have options
                      if (coachMode && streamingOptions.length > 0) {
                        updatedMsg.options = streamingOptions
                      } else if (coachMode) {
                        // Clear options if coach mode is on but no options yet
                        updatedMsg.options = []
                      }
                      return updatedMsg
                    }
                    return msg
                  }))
                } else if (data.type === 'log') {
                  // Handle browser-visible logs from server
                  const logLevel = data.level || 'info'
                  const logMessage = `[MCP] ${data.message}`
                  let logData = null
                  
                  if (data.data) {
                    try {
                      // Try to parse if it's a string, otherwise use as-is
                      logData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data
                    } catch (e) {
                      // If parsing fails, use as string
                      logData = data.data
                    }
                  }
                  
                  // Update UI based on tool execution logs
                  // Check for "Executing tool: TOOL_NAME" pattern
                  const executingToolMatch = logMessage.match(/Executing tool:\s*(\w+)/i)
                  if (executingToolMatch) {
                    const toolName = executingToolMatch[1]
                    setActiveTools(prev => {
                      const updated = [...prev.filter(t => t !== toolName), toolName]
                      return updated
                    })
                    setToolStatus(`Querying ${formatToolName(toolName)}...`)
                  } 
                  // Check for "Tool executed: TOOL_NAME" pattern
                  else if (logMessage.match(/Tool executed:\s*(\w+)/i)) {
                    const executedToolMatch = logMessage.match(/Tool executed:\s*(\w+)/i)
                    const toolName = executedToolMatch?.[1]
                    if (toolName) {
                      setActiveTools(prev => {
                        const updated = prev.filter(t => t !== toolName)
                        // Clear status if no more active tools
                        if (updated.length === 0) {
                          setToolStatus(null)
                        }
                        return updated
                      })
                    }
                  } 
                  // Check for "Executing N tool(s)" pattern (multiple tools)
                  else if (logMessage.includes('Executing') && logData?.toolCount) {
                    setToolStatus(`Executing ${logData.toolCount} tool${logData.toolCount > 1 ? 's' : ''}...`)
                  }
                  
                  if (logLevel === 'error') {
                    console.error(logMessage, logData)
                  } else if (logLevel === 'warn') {
                    console.warn(logMessage, logData)
                  } else if (logLevel === 'debug') {
                    console.debug(logMessage, logData)
                  } else {
                    console.log(logMessage, logData)
                  }
                } else if (data.type === 'chart_data') {
                  // Received chart data from MCP tool - store it for rendering
                  // Validate data format
                  if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
                    return
                  }
                  
                  // Update the current assistant message with chart data
                  setMessages(prev => {
                    const updated = prev.map(msg => {
                      if (msg.id === assistantMessageId) {
                        return {
                          ...msg,
                          chartData: {
                            symbol: data.symbol,
                            chartType: data.chartType || 'candlestick',
                            data: data.data || [],
                            toolName: data.toolName,
                            timeRange: data.timeRange || null // Include time range info
                          }
                        }
                      }
                      return msg
                    })
                    return updated
                  })
                } else if (data.type === 'done') {
                  streamComplete = true
                  setIsLoading(false) // Ensure loading is cleared
                  setActiveTools([]) // Clear any active tools
                  setToolStatus(null) // Clear tool status
                  
                  // Track model usage
                  if (data.tokens && data.provider && data.model) {
                    trackFeatureUsage.aiModelUsed(
                      data.provider,
                      data.model,
                      data.tokens.input || 0,
                      data.tokens.output || 0,
                      data.conversationId || 'new'
                    )
                  }
                  
                  if (data.conversationId) {
                    setConversationId(data.conversationId)
                  }
                  
                  // Coach mode: Parse options from response
                  let finalContent = assistantContent
                  let parsedOptions = []
                  
                  if (coachMode && assistantContent) {
                    try {
                      const parsed = parseOptionsFromResponse(assistantContent)
                      finalContent = parsed.message || assistantContent
                      parsedOptions = parsed.options || []
                      
                      // Store options for rendering
                      if (parsedOptions.length > 0) {
                        setLastAssistantOptions(parsedOptions)
                      }
                    } catch (parseError) {
                      // If parsing fails, just use original content
                      console.warn('[AIChat] Failed to parse options on completion:', parseError)
                      finalContent = assistantContent
                      parsedOptions = []
                    }
                  }
                  
                  // Add assistant response to session messages (with options stripped)
                  if (finalContent.trim()) {
                    setSessionMessages(prev => {
                      const updated = [...prev, { role: 'assistant', content: finalContent }]
                      // Track first AI message (if this is the first assistant response - 1 user + 1 assistant)
                      if (prev.length === 1 && updated.length === 2) {
                        trackFeatureUsage.firstAiMessage()
                      }
                      return updated
                    })
                  }
                  
                  if (data.tokens) {
                    currentTokens = data.tokens
                    setTokenUsage(prev => ({
                      input: prev.input + data.tokens.input,
                      output: prev.output + data.tokens.output
                    }))
                    // Update demo token tracking
                    if (isDemoMode) {
                      updateDemoTokensUsed(data.tokens.input, data.tokens.output)
                      // Trigger custom event to update display in VegaContent
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('demoTokensUpdated'))
                      }
                    }
                  }
                  
                  // Final update to ensure loading state is cleared
                  // Store options in message for rendering
                  setMessages(prev => prev.map(msg => {
                    if (msg.id === assistantMessageId) {
                      const updatedMsg = { ...msg, isLoading: false, content: finalContent }
                      // Only add options if coach mode is enabled
                      if (coachMode) {
                        updatedMsg.options = parsedOptions || []
                      }
                      return updatedMsg
                    }
                    return msg
                  }))
                  break // Exit loop when done
                } else if (data.type === 'error') {
                  streamComplete = true // Mark as complete to prevent further processing
                  const errorMsg = data.error || data.errorMessage || 'An error occurred while processing your message'
                  const errorType = data.errorType || 'unknown'
                  console.error('[AIChat] Stream error received:', { errorMsg, errorType, data })
                  throw new Error(errorMsg)
                }
              } catch (e) {
                // Skip invalid JSON, but log for debugging
                if (e instanceof SyntaxError) {
                  console.warn('Failed to parse SSE data:', line)
                  continue
                } else {
                  throw e
                }
              }
            }
          }
        }
      } catch (readError) {
        // Handle read errors (including abort)
        if (readError.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
          // User stopped the request
          setIsLoading(false)
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId
              ? { ...msg, isLoading: false, content: assistantContent || 'Response stopped.' }
              : msg
          ))
          abortControllerRef.current = null
          return false
        }
        // Log read error details for debugging
        console.error('[AIChat] Read error:', {
          name: readError.name,
          message: readError.message,
          stack: readError.stack?.split('\n').slice(0, 3).join('\n')
        })
        throw readError
      } finally {
        // Ensure loading state is always cleared
        setIsLoading(false)
        setActiveTools([]) // Clear active tools
        setToolStatus(null) // Clear tool status
        
        if (!streamComplete && !abortControllerRef.current?.signal.aborted) {
          // Stream ended unexpectedly - ensure message is updated
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId && msg.isLoading
              ? { ...msg, isLoading: false, content: assistantContent || 'Response incomplete. Please try again.' }
              : msg
          ))
        } else if (streamComplete && assistantContent) {
          // Ensure final content is set even if done event was missed
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId && msg.isLoading
              ? { ...msg, isLoading: false, content: assistantContent }
              : msg
          ))
        }
        abortControllerRef.current = null
        
        // Restore focus to input box for seamless UX
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus()
          }
        }, 100)
      }

      return true
    } catch (error) {
      console.error('[AIChat] Chat error:', error)
      console.error('[AIChat] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n'),
        responseStatus: error.response?.status,
        responseText: error.response?.statusText
      })
      
      // Don't show error if user aborted
      if (error.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
        setIsLoading(false)
        setActiveTools([]) // Clear active tools
        setToolStatus(null) // Clear tool status
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId && msg.isLoading
            ? { ...msg, isLoading: false, content: assistantContent || 'Response stopped.' }
            : msg
        ))
        abortControllerRef.current = null
        // Restore focus to input box
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus()
          }
        }, 100)
        return false
      }
      
      // Show user-friendly error message
      let errorMessage = error.message || 'Sorry, I encountered an error. Please try again.'
      
      // Provide more helpful error messages
      if (error.errorData?.error === 'TOKEN_LIMIT_REACHED') {
        // Token limit reached - trigger modal for demo users
        if (isDemoMode && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('demoTokenLimitReached'))
        }
        // Token limit reached - show specific message
        errorMessage = error.errorData.message || `You've reached your token limit. ${isDemoMode ? 'Sign up to continue analyzing your trades!' : 'Please upgrade your plan for higher limits.'}`
      } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        errorMessage = 'Network error. Please check your connection and try again.'
      } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        errorMessage = 'Authentication error. Please refresh the page and try again.'
      } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded. Please wait a moment and try again.'
      } else if (errorMessage.includes('No response body')) {
        errorMessage = 'Server did not respond. Please try again.'
      } else if (errorMessage.includes('Request failed')) {
        errorMessage = 'Request failed. Please try again.'
      }
      
      setIsLoading(false)
      setActiveTools([]) // Clear active tools
      setToolStatus(null) // Clear tool status
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId
          ? { ...msg, content: errorMessage, isLoading: false, error: true }
          : msg
      ))
      abortControllerRef.current = null
      
      // Restore focus to input box for seamless UX
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 100)
      
      return false
    }
  }, [isLoading, isDemoMode, getDemoTokensUsed, coachMode, conversationDepth, currentTopic, sessionMessages, conversationId, tradesStats, effectiveAnalytics, effectiveAllTrades, previousSummaries, hasNoData, hasSentMessagesWithoutData, updateDemoTokensUsed, formatToolName, selectedProvider, selectedModel])

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsLoading(false)
    setActiveTools([]) // Clear active tools
    setToolStatus(null) // Clear tool status
    // Update any loading messages to show they were stopped
    setMessages(prev => prev.map(msg => 
      msg.isLoading 
        ? { ...msg, isLoading: false, content: msg.content || 'Response stopped by user.' }
        : msg
    ))
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    const messageToSend = input.trim()
    setInput('') // Clear input immediately
    await sendMessage(messageToSend)
  }

  // Open maximized dialog when Vega starts responding (isLoading becomes true)
  useEffect(() => {
    if (isLoading && !isFullPage) {
      setIsMaximized(true)
    }
  }, [isLoading, isFullPage])

  const handleInputFocus = () => {
    setIsInputFocused(true)
  }

  const handleInputClick = () => {
    setIsInputFocused(true)
  }

  const handleInputBlur = () => {
    setIsInputFocused(false)
  }

  const handleInputChange = (e) => {
    setInput(e.target.value)
    // Stop animation when user types
    if (e.target.value.length > 0) {
      setIsInputFocused(true)
    }
  }

  const handleCloseMaximized = useCallback((open) => {
    // Don't allow closing while loading
    if (!open && isLoading) {
      return
    }
    
    // Allow closing if not loading
    if (!open) {
      setIsMaximized(false)
      // Blur input if it's focused
      if (inputRef.current) {
        inputRef.current.blur()
      }
    } else if (open) {
      // Opening the dialog
      setIsMaximized(true)
    }
  }, [isLoading])

  const handleShare = async () => {
    if (isDemoMode || isSharing) {
      console.log('[Share] Blocked:', { isDemoMode, isSharing })
      return
    }
    
    if (!conversationId) {
      console.warn('[Share] No conversationId available yet')
      alert('Please wait for the conversation to be saved before sharing.')
      return
    }
    
    console.log('[Share] Creating share link for conversation:', conversationId)
    setIsSharing(true)
    try {
      const response = await fetch('/api/ai/chat/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          action: 'create'
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to create share link')
      }

      const data = await response.json()
      console.log('[Share] Share link created:', data.shareUrl)
      setShareUrl(data.shareUrl)
      
      // Track conversation shared
      trackFeatureUsage.conversationShared(conversationId)
      
      // Copy to clipboard
      if (typeof window !== 'undefined' && data.shareUrl) {
        await navigator.clipboard.writeText(data.shareUrl)
        setShareCopied(true)
        setTimeout(() => setShareCopied(false), 2000)
      }
    } catch (error) {
      console.error('[Share] Error sharing conversation:', error)
      alert(`Failed to create share link: ${error.message}. Please try again.`)
    } finally {
      setIsSharing(false)
    }
  }

  const handleClear = useCallback(async () => {
    if (isClearing || isLoading) return
    
    setIsClearing(true)
    
    try {
      // Summarize current conversation before clearing
      if (conversationId && sessionMessages.length > 0) {
        await summarizeConversation()
      }
      
      setMessages([])
      setSessionMessages([])
      setConversationId(null)
      setTokenUsage({ input: 0, output: 0 })
      setShareUrl(null) // Clear share URL when clearing conversation
      // Reset onboarding flag if user still has no data
      if (hasNoData) {
        setHasSentMessagesWithoutData(false)
      }
      
      // Reset coach mode state
      setConversationDepth(0)
      setCurrentTopic(null)
      setLastAssistantOptions([])
      
      // Reset scroll state
      shouldAutoScrollRef.current = true
      lastMessageCountRef.current = 0
      
      // Clear timeouts
      if (summarizeTimeoutRef.current) {
        clearTimeout(summarizeTimeoutRef.current)
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    } catch (error) {
      console.error('Error clearing conversation:', error)
    } finally {
      setIsClearing(false)
    }
  }, [isClearing, isLoading, conversationId, sessionMessages.length, summarizeConversation, tradesStats])

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Expose methods to parent via ref
  // Dependencies include messages.length and conversationId for isNewChat to work correctly
  useImperativeHandle(ref, () => ({
    setPrompt: (prompt) => {
      setInput(prompt)
      // Focus input after setting
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 100)
    },
    clearChat: handleClear,
    loadConversation: loadConversation,
    // Check if currently showing new chat screen (no messages and no conversation)
    isNewChat: () => messages.length === 0 && !conversationId
  }), [handleClear, loadConversation, messages.length, conversationId])

  // Render chat content (reusable for both compact and maximized views)
  const renderChatContent = useCallback((isMaximizedView = false, showHeader = true) => {
    return (
    <div className={`flex flex-col bg-black ${!isMaximizedView && !isFullPage ? 'rounded-xl border border-white/10' : ''} overflow-hidden transition-all duration-300`} style={{ position: 'relative', isolation: 'isolate', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, maxHeight: '100%' }}>
      {/* Header - only show in compact view or if explicitly requested */}
      {showHeader && (!isMaximizedView || isFullPage) && (
        <div className="relative flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white/80" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white/90">
                Vega AI
              </h3>
              {coachMode && (
                <span className="px-2 py-0.5 text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                  Coach
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && !isDemoMode && (
              <button
                onClick={handleShare}
                disabled={isSharing || isLoading || !conversationId}
                className="px-2.5 py-1.5 rounded-md hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-xs text-white/60 hover:text-white/80"
                title={
                  !conversationId 
                    ? "Waiting for conversation to be saved..." 
                    : shareCopied 
                    ? "Link copied!" 
                    : shareUrl 
                    ? "Share link copied" 
                    : "Share conversation"
                }
              >
                {isSharing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sharing...</span>
                  </>
                ) : shareCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share</span>
                  </>
                )}
              </button>
            )}
            {messages.length > 0 && (
              <button
                onClick={handleClear}
                disabled={isClearing || isLoading}
                className="px-2.5 py-1.5 rounded-md hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-xs text-white/60 hover:text-white/80"
                title={isClearing ? "Clearing conversation..." : "Refresh conversation"}
              >
                {isClearing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Refreshing...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                  </>
                )}
              </button>
            )}
            {!isFullPage && (
              <button
                onClick={() => setIsMaximized(true)}
                className="p-1.5 rounded-md hover:bg-white/5 transition-colors text-white/50 hover:text-white/80"
                title="Maximize chat"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages - Always scrollable in maximized view */}
      <div 
        ref={messagesContainerRef} 
        className={`relative flex-1 px-2 sm:px-4 py-2 sm:py-3 space-y-3 chat-scrollbar ${isMaximizedView ? 'overflow-y-auto' : messages.length > 0 ? 'overflow-y-auto' : 'overflow-hidden'}`}
        style={{ 
          overscrollBehavior: 'contain', 
          minHeight: 0, 
          maxHeight: '100%',
          overflowY: isMaximizedView ? 'auto' : (messages.length > 0 ? 'auto' : 'hidden')
        }}
      >
        {/* Show messages if they exist, otherwise show empty state */}
        {messages.length === 0 ? (
          /* Empty state - show onboarding if no data, otherwise show welcome */
          hasNoData ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
              <div className="mb-6">
                <Database className="w-10 h-10 text-white/30 mx-auto mb-3" />
                <h3 className="text-base font-medium text-white/90 mb-1.5">
                  No Trading Data Yet
                </h3>
                <p className="text-xs text-white/50 max-w-sm">
                  Connect your exchange or upload CSV files to get started
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                {onConnectExchange && (
                  <button
                    onClick={onConnectExchange}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white/90 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 border border-white/10 w-full sm:w-auto"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    Connect Exchange
                  </button>
                )}
                {onUploadCSV && (
                  <button
                    onClick={onUploadCSV}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 border border-white/5 w-full sm:w-auto"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload CSV
                  </button>
                )}
              </div>
            </div>
          ) : (
            // Welcome state - show rich content on Vega page, simple on other pages
            isVegaPage && tradesStats ? (
              <div className="flex flex-col h-full relative z-10 overflow-y-auto">
                {/* Content Container - Flex column with space between to separate stats (top) and prompts (bottom) */}
                <div className="flex flex-col flex-1 items-center justify-between min-h-0 px-6 py-8">
                  
                  {/* Top Section: Greeting & Stats */}
                  <div className="w-full max-w-2xl text-center mt-8">
                    {/* Welcome Message */}
                    <div className="mb-6 space-y-4">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Sparkles className="w-5 h-5 text-emerald-400" />
                        <h3 className="text-xl font-semibold text-white/90">
                          {tradesStats.totalTrades > 0 
                            ? (greeting || "Welcome! I've analyzed your trading data")
                            : "Ready to analyze your trading"}
                        </h3>
                      </div>
                      
                      {/* Portfolio Value & Asset Distribution - Only show if user has trades */}
                      {tradesStats.totalTrades > 0 && (portfolioData?.totalValue > 0 || tradesStats.totalTrades > 0) && (
                        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-5 text-xs sm:text-sm text-white/70 mb-4 px-2">
                          {portfolioData && portfolioData.totalValue > 0 && (
                            <>
                              <div className="flex items-center gap-1.5 sm:gap-2 bg-white/5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-white/5">
                                <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 flex-shrink-0" />
                                <span className="whitespace-nowrap">
                                  Portfolio: <span className="text-white/90 font-semibold tabular-nums">
                                    ${portfolioData.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </span>
                              </div>
                              {portfolioData.topHoldings.length > 0 && (
                                <div className="flex items-center gap-1.5 sm:gap-2 bg-white/5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-white/5">
                                  <PieChart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 flex-shrink-0" />
                                  <span className="whitespace-nowrap">
                                    Top: {portfolioData.topHoldings.slice(0, 3).map((h, idx) => (
                                      <span key={idx} className="text-white/80">
                                        {h.asset}
                                        {idx < Math.min(2, portfolioData.topHoldings.length - 1) && ', '}
                                      </span>
                                    ))}
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                          {tradesStats.totalTrades > 0 && (
                            <div className="flex items-center gap-1.5 sm:gap-2 bg-white/5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-white/5">
                              <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 flex-shrink-0" />
                              <span className="whitespace-nowrap">
                                {tradesStats.totalTrades.toLocaleString()} trades
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Insights */}
                      {insights.length > 0 && (
                        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-[10px] sm:text-xs px-2">
                          {insights.map((insight, idx) => {
                            const Icon = insight.icon
                            return (
                              <div
                                key={idx}
                                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border ${
                                  insight.type === 'strength'
                                    ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400'
                                    : insight.type === 'weakness'
                                    ? 'bg-red-400/10 border-red-400/30 text-red-400'
                                    : 'bg-white/5 border-white/10 text-white/70'
                                }`}
                              >
                                <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                                <span className="whitespace-nowrap">{insight.text}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Section: Chat Prompts */}
                  <div className="w-full max-w-3xl flex flex-col items-center justify-end pb-4">
                    {/* Coach Mode: Interactive starter prompts */}
                    {coachMode && coachModeStarters.length > 0 ? (
                      <div className="space-y-3 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 px-2">
                        <p className="text-[10px] sm:text-xs text-center text-white/40 mb-3 uppercase tracking-wider font-medium">
                          Suggested Topics
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                          {coachModeStarters.map((q, idx) => (
                            <button
                              key={idx}
                              onClick={async () => {
                                // Auto-send in coach mode
                                await sendMessage(q)
                              }}
                              className="group px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-white/70 hover:text-white bg-white/5 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 rounded-lg sm:rounded-xl transition-all duration-200 font-medium text-center"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      // Standard Mode Prompts
                      <div className="space-y-3 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                         <p className="text-xs text-center text-white/40 mb-3 uppercase tracking-wider font-medium">
                          Ask Vega
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          {sampleQuestions.slice(0, 4).map((q, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setInput(q)
                                setIsMaximized(true)
                                inputRef.current?.focus()
                              }}
                              className="group px-4 py-2 text-sm text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all duration-200 text-center"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 relative z-10">
                <h4 className="text-sm font-medium text-white/90 mb-1.5">
                  {greeting ? greeting : (coachMode ? 'Start coaching session' : 'Ask me anything about your trading')}
                </h4>
                <p className="text-xs text-white/50 max-w-sm mb-5">
                  {coachMode ? 'Interactive guidance with follow-up options' : 'I can analyze your performance and provide personalized insights'}
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {(coachMode ? coachModeStarters : sampleQuestions).slice(0, 3).map((q, idx) => (
                    <button
                      key={idx}
                      className={`px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-white/70 hover:text-white/90 transition-all cursor-pointer ${coachMode ? 'hover:bg-emerald-500/10 hover:border-emerald-500/30 rounded-full' : ''}`}
                      onClick={async () => {
                        if (coachMode) {
                          // Auto-send in coach mode
                          await sendMessage(q)
                        } else {
                          setInput(q)
                          setIsMaximized(true)
                          inputRef.current?.focus()
                        }
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )
          )) : (
          <>
            {messages.map((message, idx) => (
              <div
                key={message.id}
                className={`group flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'} transition-all duration-300 ease-out`}
                style={{ 
                  opacity: message.isLoading ? 0.7 : 1,
                  transform: 'translateY(0)'
                }}
              >
                <div className={`flex gap-2.5 ${message.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
                  {message.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-white/60" />
                    </div>
                  )}
                  <div className="relative flex items-start gap-2 max-w-[80%] group/message">
                    <div
                      className={`rounded-lg px-3 py-2 transition-all duration-200 flex-1 ${
                        message.role === 'user'
                          ? 'bg-white/10 text-white/90'
                          : message.error
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-white/5 text-white/65'
                      }`}
                    >
                    {message.isLoading ? (
                      <div className="flex flex-col gap-2 py-1">
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        {activeTools.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {activeTools.map((tool, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-1 px-2 py-0.5 bg-white/5 rounded border border-white/10"
                              >
                                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse flex-shrink-0" />
                                <span className="text-[10px] sm:text-xs text-white/40 font-mono">
                                  {formatToolName(tool)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Render message text (without chart block) with markdown support */}
                        <MarkdownMessage 
                          content={message.role === 'assistant' ? removeChartBlock(message.content) : message.content}
                        />
                        {/* Render chart from MCP tool data (auto-detected) */}
                        {message.role === 'assistant' && message.chartData && message.chartData.data?.length > 0 && (
                          <div className="mt-3 -mx-1">
                            <VegaChartRenderer
                              chartConfig={{
                                type: message.chartData.chartType || 'price',
                                title: `${message.chartData.symbol} Price`,
                                options: {
                                  symbol: message.chartData.symbol,
                                  data: message.chartData.data,
                                  showVolume: message.chartData.data.some(d => d.volume > 0),
                                  timeRange: message.chartData.timeRange || null
                                }
                              }}
                              analytics={effectiveAnalytics}
                              allTrades={effectiveAllTrades}
                              height={typeof window !== 'undefined' && window.innerWidth < 640 ? 180 : 220}
                            />
                          </div>
                        )}
                        {/* Render chart if present in assistant message (manual) */}
                        {message.role === 'assistant' && message.content && parseChartRequest(message.content) && (
                          <VegaChartRenderer
                            chartConfig={parseChartRequest(message.content)}
                            analytics={effectiveAnalytics}
                            allTrades={effectiveAllTrades}
                            height={typeof window !== 'undefined' && window.innerWidth < 640 ? 180 : 200}
                            className="mt-3 -mx-1"
                          />
                        )}
                      </>
                    )}
                    </div>
                    {/* Message Actions - Copy button */}
                    {!message.isLoading && message.content && (
                      <div className="flex-shrink-0 mt-1 transition-opacity duration-200 opacity-0 group-hover/message:opacity-100">
                        <MessageActions 
                          content={message.role === 'assistant' ? removeChartBlock(message.content) : message.content}
                        />
                      </div>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5 text-white/60" />
                    </div>
                  )}
                </div>
                {/* Timestamp */}
                {!message.isLoading && message.timestamp && (
                  <div className={`text-xs text-white/30 mt-1 px-1 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {new Date(message.timestamp).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                )}
                {/* Coach mode: Show options after assistant messages */}
                {/* Show options on the last assistant message (same behavior as normal chats) */}
                {coachMode && message.role === 'assistant' && !message.isLoading && Array.isArray(message.options) && message.options.length > 0 && idx === messages.length - 1 && (
                  <div className="ml-8 mt-1">
                    <ChatOptions 
                      options={message.options}
                      onSelect={async (option) => {
                        if (!option || typeof option !== 'string' || isLoading) return
                        // Auto-send the option as a message
                        await sendMessage(option.trim())
                      }}
                      disabled={isLoading}
                    />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="relative px-2 sm:px-4 py-2 sm:py-3 border-t border-white/5 flex-shrink-0">
        {/* Model Selector */}
        <div className="mb-2 flex items-center justify-between">
          <div className="relative" ref={modelSelectorRef}>
            <button
              onClick={() => setShowModelSelector(!showModelSelector)}
              className="px-2.5 py-1 text-[10px] font-medium text-white/60 hover:text-white/80 bg-white/5 hover:bg-white/10 rounded-md border border-white/10 transition-colors flex items-center gap-1.5"
              disabled={isLoading}
            >
              <span>
                {selectedProvider === 'anthropic' ? 'Claude' : 'DeepSeek'}
                {selectedModel && ` (${Object.values(AI_MODELS).find(m => m.id === selectedModel)?.name || selectedModel})`}
              </span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showModelSelector ? 'rotate-180' : ''}`} />
            </button>
            
            {showModelSelector && (
              <div className="absolute bottom-full left-0 mb-1 bg-black/95 border border-white/10 rounded-lg shadow-lg z-50 w-[calc(100vw-2rem)] sm:w-auto sm:min-w-[200px] max-w-[200px] overflow-hidden">
                <div className="p-1.5">
                  <div className="text-[10px] font-semibold text-white/40 px-2 py-1 mb-1">Provider</div>
                  <button
                    onClick={() => {
                      setSelectedProvider('anthropic')
                      // Auto-select Claude model based on tier (default to haiku, can manually select sonnet)
                      // For now, default to null (auto-select) - user can manually select if they want
                      setSelectedModel(null)
                      setShowModelSelector(false)
                    }}
                    className={`w-full text-left px-2 py-1.5 text-[11px] rounded-md transition-colors ${
                      selectedProvider === 'anthropic' 
                        ? 'bg-white/10 text-white/90' 
                        : 'text-white/60 hover:bg-white/5'
                    }`}
                  >
                    Claude (Anthropic)
                  </button>
                  <button
                    onClick={() => {
                      setSelectedProvider('deepseek')
                      // Auto-select DeepSeek model based on tier (default to chat, can manually select reasoner)
                      // For now, default to chat - user can manually select reasoner if they want
                      setSelectedModel(AI_MODELS.DEEPSEEK_CHAT.id)
                      setShowModelSelector(false)
                    }}
                    className={`w-full text-left px-2 py-1.5 text-[11px] rounded-md transition-colors ${
                      selectedProvider === 'deepseek' 
                        ? 'bg-white/10 text-white/90' 
                        : 'text-white/60 hover:bg-white/5'
                    }`}
                  >
                    DeepSeek
                  </button>
                  
                  <div className="border-t border-white/10 my-1.5"></div>
                  
                  <div className="text-[10px] font-semibold text-white/40 px-2 py-1 mb-1">Model</div>
                  {selectedProvider === 'anthropic' ? (
                    <>
                      <button
                        onClick={() => {
                          setSelectedModel(null)
                          setShowModelSelector(false)
                        }}
                        className={`w-full text-left px-2 py-1.5 text-[11px] rounded-md transition-colors ${
                          selectedModel === null 
                            ? 'bg-white/10 text-white/90' 
                            : 'text-white/60 hover:bg-white/5'
                        }`}
                      >
                        Auto (based on tier)
                      </button>
                      <button
                        onClick={() => {
                          setSelectedModel(AI_MODELS.HAIKU.id)
                          setShowModelSelector(false)
                        }}
                        className={`w-full text-left px-2 py-1.5 text-[11px] rounded-md transition-colors ${
                          selectedModel === AI_MODELS.HAIKU.id 
                            ? 'bg-white/10 text-white/90' 
                            : 'text-white/60 hover:bg-white/5'
                        }`}
                      >
                        {AI_MODELS.HAIKU.name}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedModel(AI_MODELS.SONNET.id)
                          setShowModelSelector(false)
                        }}
                        className={`w-full text-left px-2 py-1.5 text-[11px] rounded-md transition-colors ${
                          selectedModel === AI_MODELS.SONNET.id 
                            ? 'bg-white/10 text-white/90' 
                            : 'text-white/60 hover:bg-white/5'
                        }`}
                      >
                        {AI_MODELS.SONNET.name}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setSelectedModel(null)
                          setShowModelSelector(false)
                        }}
                        className={`w-full text-left px-2 py-1.5 text-[11px] rounded-md transition-colors ${
                          selectedModel === null 
                            ? 'bg-white/10 text-white/90' 
                            : 'text-white/60 hover:bg-white/5'
                        }`}
                      >
                        Auto (based on tier)
                      </button>
                      <button
                        onClick={() => {
                          setSelectedModel(AI_MODELS.DEEPSEEK_CHAT.id)
                          setShowModelSelector(false)
                        }}
                        className={`w-full text-left px-2 py-1.5 text-[11px] rounded-md transition-colors ${
                          selectedModel === AI_MODELS.DEEPSEEK_CHAT.id 
                            ? 'bg-white/10 text-white/90' 
                            : 'text-white/60 hover:bg-white/5'
                        }`}
                      >
                        {AI_MODELS.DEEPSEEK_CHAT.name}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedModel(AI_MODELS.DEEPSEEK_REASONER.id)
                          setShowModelSelector(false)
                        }}
                        className={`w-full text-left px-2 py-1.5 text-[11px] rounded-md transition-colors ${
                          selectedModel === AI_MODELS.DEEPSEEK_REASONER.id 
                            ? 'bg-white/10 text-white/90' 
                            : 'text-white/60 hover:bg-white/5'
                        }`}
                      >
                        {AI_MODELS.DEEPSEEK_REASONER.name}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Action buttons for users without data after first message - minimal inline */}
        {hasNoData && hasSentMessagesWithoutData && (
          <div className="mb-2 flex flex-col sm:flex-row gap-2 justify-center">
            {onConnectExchange && (
              <button
                onClick={onConnectExchange}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/15 text-white/80 rounded-md text-[10px] font-medium transition-colors flex items-center justify-center gap-1 border border-white/10 w-full sm:w-auto"
              >
                <LinkIcon className="w-3 h-3" />
                Connect Exchange
              </button>
            )}
            {onUploadCSV && (
              <button
                onClick={onUploadCSV}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white/60 rounded-md text-[10px] font-medium transition-colors flex items-center justify-center gap-1 border border-white/5 w-full sm:w-auto"
              >
                <Upload className="w-3 h-3" />
                Upload CSV
              </button>
            )}
          </div>
        )}
        <div className="relative flex items-center gap-2">
          {/* Mobile Sidebar Toggle Button - Only show on mobile and when on Vega page */}
          {isVegaPage && onOpenMobileSidebar && (
            <button
              onClick={onOpenMobileSidebar}
              className="md:hidden flex-shrink-0 p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors z-10"
              aria-label="Open chat history"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              data-ai-chat-input
              value={input}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              onClick={handleInputClick}
              onKeyPress={handleKeyPress}
              placeholder=""
              className={`relative w-full min-h-[40px] max-h-[120px] py-2.5 pr-10 text-sm bg-white/5 border border-white/10 rounded-lg text-white/90 resize-none focus:outline-none focus:border-white/20 transition-all placeholder:text-white/30 ${
                isVegaPage && onOpenMobileSidebar ? 'md:pl-3 pl-3' : 'px-3'
              }`}
              style={{ lineHeight: '1.5' }}
              rows={1}
              disabled={isLoading}
            />
            {/* Animated placeholder overlay - typing animation */}
            {input.length === 0 && !isInputFocused && messages.length === 0 && (
              <div 
                className={`absolute inset-0 py-2.5 flex items-center pointer-events-none rounded-lg ${
                  isVegaPage && onOpenMobileSidebar ? 'md:px-3 px-3' : 'px-3'
                }`}
                style={{ pointerEvents: 'none', zIndex: 20 }}
              >
                <span className="text-sm text-white/40 font-normal">
                  {displayedSample}
                  <span className={`inline-block w-0.5 h-4 bg-white/40 ml-1 align-middle ${isTypingSample || isDeletingSample ? 'animate-pulse' : 'opacity-0'}`} />
                </span>
              </div>
            )}
          </div>
          {/* Send/Stop button inside chatbox */}
          {isLoading ? (
            <button
              onClick={handleStop}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white/80 transition-colors z-20 flex items-center justify-center p-1.5"
              title="Stop generating"
              type="button"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors z-20 flex items-center justify-center p-1.5"
              title="Send message"
              type="button"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
    )
  }, [messages, input, isInputFocused, displayedSample, isTypingSample, isDeletingSample, isLoading, tokenUsage, handleSend, handleStop, handleInputChange, handleInputFocus, handleInputBlur, handleInputClick, handleKeyPress, handleClear, hasNoData, hasSentMessagesWithoutData, onConnectExchange, onUploadCSV, isVegaPage, tradesStats, portfolioData, insights, sampleQuestions, coachMode, coachModeStarters, sendMessage, selectedProvider, selectedModel, showModelSelector])

  return (
    <>
      {/* Full Page View */}
      {isFullPage && (
        <div className="h-full w-full" style={{ minHeight: 0, maxHeight: '100%' }}>
          {renderChatContent(true, true)}
        </div>
      )}

      {/* Compact View - only render when not maximized and not full page */}
      {!isMaximized && !isFullPage && (
        <div className="h-full w-full transition-all duration-300 animate-in fade-in" style={{ minHeight: 0, maxHeight: '100%' }}>
          {renderChatContent(false)}
        </div>
      )}

      {/* Maximized Dialog */}
      <Dialog 
        open={isMaximized} 
        onOpenChange={(open) => {
          // Prevent closing via overlay click when loading
          if (!open && isLoading) {
            return
          }
          handleCloseMaximized(open)
        }}
        modal={true}
      >
        <DialogContent 
          className="bg-black border-white/10 p-0 gap-0 overflow-hidden rounded-xl [&>button]:hidden !max-w-none"
          style={{ 
            width: 'min(90vw, 1200px)',
            height: 'min(85vh, 800px)',
            maxWidth: 'min(90vw, 1200px)',
            maxHeight: 'min(85vh, 800px)',
            display: 'flex',
            flexDirection: 'column'
          }}
          onInteractOutside={(e) => {
            // Prevent closing when clicking outside while loading
            if (isLoading) {
              e.preventDefault()
            }
          }}
          onEscapeKeyDown={(e) => {
            // Prevent closing with Escape key while loading
            if (isLoading) {
              e.preventDefault()
            }
          }}
        >
          <div className="flex flex-col h-full w-full" style={{ minHeight: 0, maxHeight: '100%' }}>
            {/* Dialog Header with close button */}
            <div className="relative flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white/80" />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white/90">
                    Vega AI
                  </h3>
                  {coachMode && (
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                      Coach
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 0 && !isDemoMode && (
                  <button
                    onClick={handleShare}
                    disabled={isSharing || isLoading || !conversationId}
                    className="px-2.5 py-1.5 rounded-md hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-xs text-white/60 hover:text-white/80"
                    title={
                      !conversationId 
                        ? "Waiting for conversation to be saved..." 
                        : shareCopied 
                        ? "Link copied!" 
                        : shareUrl 
                        ? "Share link copied" 
                        : "Share conversation"
                    }
                  >
                    {isSharing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sharing...</span>
                      </>
                    ) : shareCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share</span>
                      </>
                    )}
                  </button>
                )}
                {messages.length > 0 && (
                  <button
                    onClick={handleClear}
                    className="p-1.5 rounded-md hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={isClearing ? "Clearing conversation..." : "Clear conversation"}
                    disabled={isLoading || isClearing}
                  >
                    {isClearing ? (
                      <Loader2 className="w-4 h-4 text-white/60 animate-spin" />
                    ) : (
                      <RotateCcw className="w-4 h-4 text-white/50 hover:text-white/80 transition-colors" />
                    )}
                  </button>
                )}
                <button
                  onClick={() => handleCloseMaximized(false)}
                  disabled={isLoading}
                  className="p-1.5 rounded-md hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white/50 hover:text-white/80"
                  title={isLoading ? "Cannot close while responding" : "Minimize"}
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Maximized Chat Content - Fixed height container with proper flex layout */}
            <div className="flex-1 overflow-hidden" style={{ minHeight: 0, height: 0, display: 'flex', flexDirection: 'column' }}>
              {renderChatContent(true, false)}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
})

AIChat.displayName = 'AIChat'

export default AIChat

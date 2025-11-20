// app/analyze/components/AIChat.js
// AI Chat component with animated sample questions and token tracking

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Loader2, Bot, User, Sparkles, X, RotateCcw, Square, Minimize2 } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { Dialog, DialogContent } from '@/components/ui/dialog'

const SAMPLE_QUESTIONS = [
  "What are my biggest trading weaknesses?",
  "How can I improve my win rate?",
  "What's my best performing trading time?",
  "Which symbols should I focus on?",
  "Am I overtrading?",
  "What's my risk-adjusted return?",
  "How do I compare to market benchmarks?",
  "What patterns do you see in my losses?",
  "Should I change my position sizing?",
  "What's my biggest opportunity for improvement?"
]

export default function AIChat({ analytics, allTrades, tradesStats }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [sessionMessages, setSessionMessages] = useState([]) // In-memory messages for current session
  const [previousSummaries, setPreviousSummaries] = useState([]) // Previous conversation summaries
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState(null)
  const [currentSampleIndex, setCurrentSampleIndex] = useState(0)
  const [displayedSample, setDisplayedSample] = useState('')
  const [isTypingSample, setIsTypingSample] = useState(false)
  const [isDeletingSample, setIsDeletingSample] = useState(false)
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [tokenUsage, setTokenUsage] = useState({ input: 0, output: 0 })
  const [isClearing, setIsClearing] = useState(false)
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

  // Animate sample questions inside the input box
  useEffect(() => {
    // Stop animation if user has messages, is typing, or input is focused
    if (messages.length > 0 || input.length > 0 || isInputFocused) {
      setDisplayedSample('')
      if (typeIntervalRef.current) clearInterval(typeIntervalRef.current)
      if (deleteIntervalRef.current) clearInterval(deleteIntervalRef.current)
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current)
      return
    }

    const currentQuestion = SAMPLE_QUESTIONS[currentSampleIndex]
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
              // Move to next question (cycles through all 10)
              setCurrentSampleIndex((prev) => (prev + 1) % SAMPLE_QUESTIONS.length)
            }
          }, 30) // Delete speed
        }, 3000) // Wait 3 seconds before deleting
      }
    }, 50) // Typing speed

    return () => {
      if (typeIntervalRef.current) clearInterval(typeIntervalRef.current)
      if (deleteIntervalRef.current) clearInterval(deleteIntervalRef.current)
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current)
    }
  }, [currentSampleIndex, messages.length, input.length, isInputFocused])

  // Summarize conversation function (memoized to avoid stale closures)
  const summarizeConversation = useCallback(async () => {
    if (!conversationId || sessionMessages.length === 0) return

    try {
      await fetch('/api/ai/chat/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversationId,
          messages: sessionMessages,
          contextData: {
            tradesStats,
            analytics,
            allTrades
          }
        })
      })
      
      // Clear session messages after summarizing (summary is saved to DB)
      setSessionMessages([])
    } catch (error) {
      console.error('Error summarizing conversation:', error)
    }
  }, [conversationId, sessionMessages, tradesStats, analytics, allTrades])

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
            analytics,
            allTrades
          }
        })
        navigator.sendBeacon('/api/ai/chat/summarize', data)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [conversationId, sessionMessages])

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
          container.scrollTo({
            top: scrollHeight - clientHeight,
            behavior: 'smooth'
          })
        } else {
          // Instant scroll - directly set scrollTop
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

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsLoading(false)
    // Update any loading messages to show they were stopped
    setMessages(prev => prev.map(msg => 
      msg.isLoading 
        ? { ...msg, isLoading: false, content: msg.content || 'Response stopped by user.' }
        : msg
    ))
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)

    // Create abort controller for this request
    abortControllerRef.current = new AbortController()

    // Ensure we auto-scroll when user sends a message
    shouldAutoScrollRef.current = true
    
    // Blur input to prevent focus-related page scrolling
    if (inputRef.current) {
      inputRef.current.blur()
    }
    
    // Focus will be restored after response completes (see handleStreamComplete)
    
    // Add user message to UI immediately
    const newUserMessage = {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newUserMessage])
    setSessionMessages(prev => [...prev, { role: 'user', content: userMessage }])

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
      let response
      try {
        response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: abortControllerRef.current.signal,
          body: JSON.stringify({
            message: userMessage,
            conversationId: conversationId,
            includeContext: true,
            contextData: {
              tradesStats: tradesStats,
              analytics: analytics,
              allTrades: allTrades
            },
            sessionMessages: sessionMessages,
            previousSummaries: previousSummaries
          })
        })
      } catch (fetchError) {
        console.error('[AIChat] Fetch error:', fetchError)
        throw new Error(fetchError.message || 'Network error. Please check your connection and try again.')
      }

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
        console.error('[AIChat] API error response:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        })
        throw new Error(errorMsg)
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
            if (line.trim() === '') continue // Skip empty lines
            
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6))
                
                if (data.type === 'token' && data.chunk) {
                  assistantContent += data.chunk
                  // Update assistant message and clear loading state once we have content
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessageId
                      ? { ...msg, content: assistantContent, isLoading: false }
                      : msg
                  ))
                } else if (data.type === 'done') {
                  streamComplete = true
                  setIsLoading(false) // Ensure loading is cleared
                  
                  if (data.conversationId) {
                    setConversationId(data.conversationId)
                  }
                  
                  // Add assistant response to session messages
                  if (assistantContent.trim()) {
                    setSessionMessages(prev => [...prev, { role: 'assistant', content: assistantContent }])
                  }
                  
                  if (data.tokens) {
                    currentTokens = data.tokens
                    setTokenUsage(prev => ({
                      input: prev.input + data.tokens.input,
                      output: prev.output + data.tokens.output
                    }))
                  }
                  
                  // Final update to ensure loading state is cleared
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessageId
                      ? { ...msg, isLoading: false, content: assistantContent }
                      : msg
                  ))
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
          return
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
        return
      }
      
      // Show user-friendly error message
      let errorMessage = error.message || 'Sorry, I encountered an error. Please try again.'
      
      // Provide more helpful error messages
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
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
    }
  }

  // Open maximized dialog when Vega starts responding (isLoading becomes true)
  useEffect(() => {
    if (isLoading) {
      setIsMaximized(true)
    }
  }, [isLoading])

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

  const handleClear = async () => {
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
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Render chat content (reusable for both compact and maximized views)
  const renderChatContent = useCallback((isMaximizedView = false, showHeader = true) => {
    return (
    <div className={`flex flex-col h-full bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-800/70 ${!isMaximizedView ? 'rounded-xl border border-emerald-500/20 shadow-2xl shadow-emerald-500/10' : ''} overflow-hidden transition-all duration-300 backdrop-blur-sm`} style={{ position: 'relative', isolation: 'isolate', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-emerald-500/5 opacity-50 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.1),transparent_70%)] pointer-events-none" />
      
      {/* Header - only show in compact view or if explicitly requested */}
      {showHeader && !isMaximizedView && (
        <div className="relative flex items-center justify-between p-4 border-b border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-transparent to-emerald-500/10 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400/30 to-emerald-600/20 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <div className="absolute inset-0 rounded-xl bg-emerald-400/20 animate-pulse" />
              <Bot className="w-5 h-5 text-emerald-300 relative z-10" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-2">
                Vega
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-[10px] font-normal text-emerald-400/70">AI</span>
                </span>
              </h3>
              <p className="text-[10px] text-slate-400">Your trading performance analyst</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tokenUsage.input + tokenUsage.output > 0 && (
              <div className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300">
                <span className="font-semibold">{tokenUsage.input + tokenUsage.output}</span> tokens
              </div>
            )}
            {messages.length > 0 && (
              <button
                onClick={handleClear}
                disabled={isClearing || isLoading}
                className="p-2 rounded-lg hover:bg-slate-700/50 transition-all hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                title={isClearing ? "Clearing conversation..." : "Clear conversation"}
              >
                {isClearing ? (
                  <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4 text-slate-400 hover:text-emerald-400 transition-colors" />
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages - Always scrollable in maximized view */}
      <div 
        ref={messagesContainerRef} 
        className={`relative flex-1 p-4 space-y-4 ${isMaximizedView ? 'overflow-y-auto' : messages.length > 0 ? 'overflow-y-auto' : 'overflow-hidden'}`}
        style={{ 
          overscrollBehavior: 'contain', 
          minHeight: 0, 
          maxHeight: '100%',
          overflowY: isMaximizedView ? 'auto' : (messages.length > 0 ? 'auto' : 'hidden')
        }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 relative z-10">
            <h4 className="text-base font-bold text-slate-200 mb-2 bg-gradient-to-r from-emerald-300 to-emerald-400 bg-clip-text text-transparent">
              Ask me anything about your trading
            </h4>
            <p className="text-xs text-slate-400 max-w-sm">
              I can analyze your performance, identify patterns, and provide personalized insights
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {SAMPLE_QUESTIONS.slice(0, 3).map((q, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300/80 hover:bg-emerald-500/20 transition-all cursor-pointer hover:scale-105"
                  onClick={() => {
                    setInput(q)
                    setIsMaximized(true)
                    inputRef.current?.focus()
                  }}
                >
                  {q}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, idx) => (
              <div
                key={message.id}
                className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400/30 to-emerald-600/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0 mt-1 shadow-lg shadow-emerald-500/20">
                    <Bot className="w-4 h-4 text-emerald-300" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-2.5 shadow-lg transition-all hover:shadow-xl ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 border border-emerald-400/40 text-slate-100 shadow-emerald-500/20'
                      : message.error
                      ? 'bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30 text-red-300 shadow-red-500/20'
                      : 'bg-gradient-to-br from-slate-800/80 to-slate-700/60 border border-slate-600/40 text-slate-200 shadow-slate-900/50 backdrop-blur-sm'
                  }`}
                >
                  {message.isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                      <span className="text-xs text-slate-400 font-medium">Thinking...</span>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700/80 to-slate-600/60 border border-slate-500/40 flex items-center justify-center flex-shrink-0 mt-1 shadow-lg">
                    <User className="w-4 h-4 text-slate-300" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="relative p-4 border-t border-emerald-500/20 bg-gradient-to-r from-slate-800/40 via-slate-800/30 to-slate-800/40 backdrop-blur-sm flex-shrink-0">
        <div className="relative flex items-center">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-emerald-500/5 rounded-lg" />
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onClick={handleInputClick}
            onKeyPress={handleKeyPress}
            placeholder=""
            className="relative w-full min-h-[44px] max-h-[120px] px-4 py-3 pr-12 text-sm bg-slate-900/60 border border-emerald-500/30 rounded-xl text-slate-200 resize-none focus:outline-none focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/30 transition-all backdrop-blur-sm shadow-lg shadow-emerald-500/10 placeholder:text-slate-500"
            style={{ lineHeight: '1.5' }}
            rows={1}
            disabled={isLoading}
          />
          {/* Animated placeholder overlay - typing animation */}
          {input.length === 0 && !isInputFocused && messages.length === 0 && (
            <div 
              className="absolute inset-0 px-4 py-3 flex items-center pointer-events-none rounded-xl"
              style={{ pointerEvents: 'none', zIndex: 20 }}
            >
              <span className="text-sm text-emerald-300/70 font-medium">
                {displayedSample}
                <span className={`inline-block w-0.5 h-4 bg-emerald-400 ml-1 align-middle ${isTypingSample || isDeletingSample ? 'animate-pulse' : 'opacity-0'}`} />
              </span>
            </div>
          )}
          {/* Send/Stop button inside chatbox */}
          {isLoading ? (
            <button
              onClick={handleStop}
              className="absolute right-3 text-red-400 hover:text-red-300 transition-all z-20 flex items-center justify-center p-2 rounded-lg hover:bg-red-500/20 hover:scale-110 active:scale-95 shadow-lg"
              style={{ 
                top: '50%',
                transform: 'translateY(-50%)'
              }}
              title="Stop generating"
              type="button"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="absolute right-3 text-emerald-400 hover:text-emerald-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all z-20 flex items-center justify-center p-2 rounded-lg hover:bg-emerald-500/20 hover:scale-110 active:scale-95 disabled:hover:scale-100 shadow-lg shadow-emerald-500/20"
              style={{ 
                top: '50%',
                transform: 'translateY(-50%)'
              }}
              type="button"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
        {!isMaximizedView && tokenUsage.input + tokenUsage.output > 0 && (
          <div className="mt-3 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300/80 flex items-center justify-between">
            <span className="font-medium">Tokens: <span className="text-emerald-400">{tokenUsage.input}</span> in / <span className="text-emerald-400">{tokenUsage.output}</span> out</span>
            <span className="font-semibold text-emerald-400">Total: {tokenUsage.input + tokenUsage.output}</span>
          </div>
        )}
      </div>
    </div>
    )
  }, [messages, input, isInputFocused, displayedSample, isTypingSample, isDeletingSample, isLoading, tokenUsage, handleSend, handleStop, handleInputChange, handleInputFocus, handleInputBlur, handleInputClick, handleKeyPress, handleClear])

  return (
    <>
      {/* Compact View - only render when not maximized */}
      {!isMaximized && (
        <div className="h-full w-full transition-all duration-300 animate-in fade-in">
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
          className="bg-slate-900 border-slate-700 p-0 gap-0 overflow-hidden rounded-xl [&>button]:hidden !max-w-none"
          style={{ 
            width: 'min(70vw, 1000px)',
            height: 'min(70vh, 700px)',
            maxWidth: 'min(70vw, 1000px)',
            maxHeight: 'min(70vh, 700px)',
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
            <div className="relative flex items-center justify-between p-4 border-b border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-transparent to-emerald-500/10 backdrop-blur-sm flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400/30 to-emerald-600/20 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <div className="absolute inset-0 rounded-xl bg-emerald-400/20 animate-pulse" />
                  <Bot className="w-5 h-5 text-emerald-300 relative z-10" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-2">
                    Vega
                    <span className="inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                      <span className="text-xs font-normal text-emerald-400/70">AI</span>
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400">Your trading performance analyst</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <button
                    onClick={handleClear}
                    className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    title={isClearing ? "Clearing conversation..." : "Clear conversation"}
                    disabled={isLoading || isClearing}
                  >
                    {isClearing ? (
                      <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                    ) : (
                      <RotateCcw className="w-4 h-4 text-slate-400 hover:text-emerald-400 transition-colors" />
                    )}
                  </button>
                )}
                <button
                  onClick={() => handleCloseMaximized(false)}
                  disabled={isLoading}
                  className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-slate-400 hover:text-emerald-400"
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
}

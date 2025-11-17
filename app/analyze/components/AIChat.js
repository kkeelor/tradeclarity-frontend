// app/analyze/components/AIChat.js
// AI Chat component with animated sample questions and token tracking

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Loader2, Bot, User, Sparkles, X, RotateCcw } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'

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
  const [tokenUsage, setTokenUsage] = useState({ input: 0, output: 0 })
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const summarizeTimeoutRef = useRef(null)
  const animationTimeoutRef = useRef(null)
  const typeIntervalRef = useRef(null)
  const deleteIntervalRef = useRef(null)

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
        
        // Wait 2 seconds before deleting
        animationTimeoutRef.current = setTimeout(() => {
          setIsDeletingSample(true)
          deleteIntervalRef.current = setInterval(() => {
            if (charIndexRef.current > 0) {
              charIndexRef.current--
              setDisplayedSample(currentQuestion.substring(0, charIndexRef.current))
            } else {
              clearInterval(deleteIntervalRef.current)
              setIsDeletingSample(false)
              // Move to next question
              setCurrentSampleIndex((prev) => (prev + 1) % SAMPLE_QUESTIONS.length)
            }
          }, 30) // Delete speed
        }, 2000) // Wait 2 seconds before deleting
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
      .then(res => res.json())
      .then(data => {
        if (data.success && data.conversations) {
          setPreviousSummaries(data.conversations.map(c => c.summary))
        }
      })
      .catch(err => console.error('Error loading previous conversations:', err))
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

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)

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
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
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

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''
      let currentTokens = { input: 0, output: 0 }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6))
              
              if (data.type === 'token' && data.chunk) {
                assistantContent += data.chunk
                // Update assistant message
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId
                    ? { ...msg, content: assistantContent, isLoading: false }
                    : msg
                ))
              } else if (data.type === 'done') {
                setConversationId(data.conversationId)
                // Add assistant response to session messages
                setSessionMessages(prev => [...prev, { role: 'assistant', content: assistantContent }])
                
                if (data.tokens) {
                  currentTokens = data.tokens
                  setTokenUsage(prev => ({
                    input: prev.input + data.tokens.input,
                    output: prev.output + data.tokens.output
                  }))
                }
              } else if (data.type === 'error') {
                throw new Error(data.error || 'Unknown error')
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId
          ? { ...msg, content: 'Sorry, I encountered an error. Please try again.', isLoading: false, error: true }
          : msg
      ))
    } finally {
      setIsLoading(false)
    }
  }

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

  const handleClear = async () => {
    // Summarize current conversation before clearing
    if (conversationId && sessionMessages.length > 0) {
      await summarizeConversation()
    }
    
    setMessages([])
    setSessionMessages([])
    setConversationId(null)
    setTokenUsage({ input: 0, output: 0 })
    
    // Clear summarize timeout
    if (summarizeTimeoutRef.current) {
      clearTimeout(summarizeTimeoutRef.current)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <Bot className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Vega</h3>
            <p className="text-[10px] text-slate-400">Your trading performance analyst</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tokenUsage.input + tokenUsage.output > 0 && (
            <div className="text-[10px] text-slate-400">
              <span className="text-emerald-400">{tokenUsage.input + tokenUsage.output}</span> tokens
            </div>
          )}
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
              title="Clear conversation"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Sparkles className="w-12 h-12 text-emerald-400/50 mb-4" />
            <h4 className="text-sm font-semibold text-slate-300 mb-2">Ask me anything about your trading</h4>
            <p className="text-xs text-slate-400">I can analyze your performance, identify patterns, and provide personalized insights</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-3 h-3 text-emerald-400" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    message.role === 'user'
                      ? 'bg-emerald-500/20 border border-emerald-500/30 text-slate-100'
                      : message.error
                      ? 'bg-red-500/10 border border-red-500/30 text-red-300'
                      : 'bg-slate-800/50 border border-slate-700/50 text-slate-200'
                  }`}
                >
                  {message.isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                      <span className="text-xs text-slate-400">Thinking...</span>
                    </div>
                  ) : (
                    <p className="text-xs leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-slate-700/50 border border-slate-600/50 flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-3 h-3 text-slate-400" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
        <div className="relative flex items-center">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onClick={handleInputClick}
            onKeyPress={handleKeyPress}
            placeholder=""
            className="w-full min-h-[40px] max-h-[120px] px-3 py-2 pr-10 text-xs bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-200 resize-none focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 relative z-10"
            style={{ lineHeight: '1.5' }}
            rows={1}
            disabled={isLoading}
          />
          {/* Animated placeholder overlay */}
          {input.length === 0 && !isInputFocused && (
            <div 
              className="absolute inset-0 px-3 py-2 flex items-center pointer-events-none"
              style={{ pointerEvents: 'none', zIndex: 20 }}
            >
              <span className="text-xs" style={{ color: '#ffffff', opacity: 0.9 }}>
                {displayedSample}
                <span className={`inline-block w-0.5 h-3.5 bg-emerald-400 ml-0.5 align-middle ${isTypingSample || isDeletingSample ? 'animate-pulse' : ''}`} />
              </span>
            </div>
          )}
          {/* Send button inside chatbox */}
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 text-emerald-400 hover:text-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all z-20 flex items-center justify-center"
            style={{ 
              padding: 0, 
              background: 'none', 
              border: 'none',
              top: '50%',
              transform: 'translateY(-50%)',
              height: 'auto'
            }}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        {tokenUsage.input + tokenUsage.output > 0 && (
          <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Tokens: {tokenUsage.input} in / {tokenUsage.output} out</span>
            <span>Total: {tokenUsage.input + tokenUsage.output}</span>
          </div>
        )}
      </div>
    </div>
  )
}

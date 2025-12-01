// app/share/[shareId]/page.js
// Read-only view for shared conversations

'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Bot, User, Copy, Check, Calendar, MessageSquare, Sparkles, Info, ExternalLink } from 'lucide-react'
import { FullPageSkeleton } from '@/app/components/LoadingSkeletons'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import dynamic from 'next/dynamic'

// Dynamic import for chart renderer (canvas-based, no SSR)
const VegaChartRenderer = dynamic(
  () => import('@/components/charts/VegaChartRenderer').then(mod => ({ default: mod.default })),
  { ssr: false }
)
import { parseChartRequest, removeChartBlock } from '@/components/charts/VegaChartRenderer'

export default function SharedConversationPage() {
  const params = useParams()
  const shareId = params?.shareId
  const [conversation, setConversation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!shareId) return

    const fetchSharedConversation = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/ai/conversations/shared/${shareId}`)
        
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to load shared conversation')
        }

        const data = await response.json()
        setConversation(data.conversation)
      } catch (err) {
        console.error('Error fetching shared conversation:', err)
        setError(err.message || 'Failed to load conversation')
      } finally {
        setLoading(false)
      }
    }

    fetchSharedConversation()
  }, [shareId])

  const copyShareLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return <FullPageSkeleton />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0b0e11] flex items-center justify-center p-4">
        <div className="bg-[#1e2329] border border-white/10 rounded-xl p-8 max-w-md w-full text-center">
          <div className="text-red-400 mb-4">
            <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h1 className="text-2xl font-bold mb-2 text-white/90">Conversation Not Found</h1>
            <p className="text-white/60">{error}</p>
          </div>
          <p className="text-sm text-white/50 mt-4">
            This conversation may have been revoked or the link is invalid.
          </p>
        </div>
      </div>
    )
  }

  if (!conversation) {
    return null
  }

  // Get user name from the user object
  const userName = conversation.user?.name || conversation.user?.email?.split('@')[0] || 'User'
  const userEmail = conversation.user?.email
  
  // Get first user message for a better title if title is just the first message
  const firstUserMessage = conversation.messages?.find(m => m.role === 'user')?.content
  const displayTitle = conversation.title && conversation.title !== firstUserMessage?.substring(0, 50)
    ? conversation.title
    : 'Conversation with Vega AI'

  return (
    <div className="min-h-screen bg-[#0b0e11] text-white">
      {/* Header */}
      <div className="border-b border-white/5 bg-[#181a20]/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 max-w-5xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                <Sparkles className="w-5 h-5 text-[#EAAF08]" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white/90">TradeClarity</h1>
                <p className="text-xs text-white/50">Shared Conversation</p>
              </div>
            </div>
            <button
              onClick={copyShareLink}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white/70 hover:text-white/90 transition-colors flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Link
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Conversation Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-3xl font-bold text-white/90">{displayTitle}</h1>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-white/50 hover:text-white/70 transition-colors">
                        <Info className="h-5 w-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs bg-[#1e2329] border-white/20 text-white/90">
                      <p className="text-sm">
                        Vega AI is an intelligent trading assistant that analyzes your trading performance, 
                        provides personalized insights, and helps you make better trading decisions.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center gap-4 text-sm text-white/60">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#EAAF08]/20 flex items-center justify-center border border-[#EAAF08]/30">
                    <User className="h-4 w-4 text-[#EAAF08]" />
                  </div>
                  <div>
                    <p className="text-white/90 font-medium">{userName}</p>
                    {userEmail && <p className="text-xs text-white/50">{userEmail}</p>}
                  </div>
                </div>
                <div className="h-4 w-px bg-white/10" />
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(conversation.created_at)}
                </div>
                {conversation.message_count && (
                  <>
                    <div className="h-4 w-px bg-white/10" />
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      <span>{conversation.message_count} messages</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <a
              href={typeof window !== 'undefined' ? `${window.location.origin}/vega` : '/vega'}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-[#EAAF08] hover:bg-[#EAAF08]/90 text-black font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              Try VegaAI
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          <div className="text-sm text-white/50 bg-white/5 border border-white/10 p-3 rounded-lg">
            <p>This is a read-only view of a shared conversation. You cannot interact with the AI here.</p>
          </div>
        </div>

        {/* Messages */}
        <div className="space-y-4 mb-8">
          {conversation.messages && conversation.messages.length > 0 ? (
            conversation.messages.map((message, index) => (
              <MessageBubble key={message.id || index} message={message} />
            ))
          ) : (
            <div className="bg-[#1e2329] border border-white/10 rounded-xl p-8 text-center text-white/50">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No messages found in this conversation.</p>
            </div>
          )}
        </div>

        {/* Summary (if available) */}
        {conversation.summary && (
          <div className="bg-[#1e2329] border border-white/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-3 text-white/90 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#EAAF08]" />
              Conversation Summary
            </h2>
            <p className="text-white/70 whitespace-pre-wrap leading-relaxed">{conversation.summary}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  const content = message.content || ''
  
  // Skip rendering if content is empty
  if (!content || content.trim().length === 0) {
    return null
  }

  // Check if message contains chart data (using [CHART] format)
  const chartConfig = parseChartRequest(content)
  const hasChart = !!chartConfig

  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border ${
        isUser 
          ? 'bg-[#EAAF08]/20 border-[#EAAF08]/30' 
          : 'bg-white/5 border-white/10'
      }`}>
        {isUser ? (
          <User className="h-5 w-5 text-[#EAAF08]" />
        ) : (
          <Bot className="h-5 w-5 text-white/70" />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 ${isUser ? 'flex flex-col items-end' : ''}`}>
        <div className={`rounded-xl p-4 ${
          isUser 
            ? 'bg-[#EAAF08]/10 border border-[#EAAF08]/20 max-w-[85%]' 
            : 'bg-[#1e2329] border border-white/10'
        }`}>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {hasChart ? (
              <div>
                {/* Render text without chart block */}
                {removeChartBlock(content).trim() && (
                  <div className="mb-4 whitespace-pre-wrap text-white/90 leading-relaxed">
                    {removeChartBlock(content)}
                  </div>
                )}
                
                {/* Render chart */}
                <div className="my-4">
                  <VegaChartRenderer 
                    chartConfig={chartConfig}
                    analytics={null}
                    allTrades={[]}
                    height={200}
                  />
                </div>
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-white/90 leading-relaxed">{content}</div>
            )}
          </div>
        </div>
        
        {message.created_at && (
          <div className={`text-xs text-white/40 mt-2 ${isUser ? 'text-right' : ''}`}>
            {new Date(message.created_at).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        )}
      </div>
    </div>
  )
}

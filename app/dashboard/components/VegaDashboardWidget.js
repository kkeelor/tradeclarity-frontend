import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Brain, Sparkles, Plus } from 'lucide-react'

export default function VegaDashboardWidget({ onStartChat, className = '' }) {
  const router = useRouter()
  const [recentChats, setRecentChats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await fetch('/api/ai/chat')
        if (res.ok) {
          const data = await res.json()
          if (data.success && Array.isArray(data.conversations)) {
            // Take the last 3 conversations
            setRecentChats(data.conversations.slice(0, 3))
          }
        }
      } catch (error) {
        console.error('Failed to fetch recent chats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchChats()
  }, [])

  const handleContinueChat = (chatId) => {
    // Navigate to Vega page with the selected chat ID (functionality to be implemented later)
    // For now, just go to Vega page
    router.push('/vega')
  }

  const handleNewChat = () => {
    if (onStartChat) {
      onStartChat()
    } else {
      router.push('/vega')
    }
  }

  if (loading) {
    return (
      <div className={`h-full flex items-center justify-center bg-zinc-900/30 border border-white/5 rounded-xl ${className}`}>
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <div className="w-10 h-10 rounded-xl bg-white/5" />
          <div className="h-4 w-24 bg-white/5 rounded" />
        </div>
      </div>
    )
  }

  // Case 2: New user / No chats
  if (recentChats.length === 0) {
    return (
      <div className={`h-full flex flex-col items-center justify-center p-6 text-center relative overflow-hidden group ${className}`}>
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none transition-opacity opacity-50 group-hover:opacity-70" />
        
        <div className="relative z-10 max-w-sm space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-500 ease-out">
            <Brain className="w-8 h-8 text-emerald-400" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-white/90">
              Meet Vega, Your AI Coach
            </h3>
            <p className="text-sm text-white/50 leading-relaxed">
              Analyze your trading psychology, find hidden patterns, and get personalized insights to improve your P&L.
            </p>
          </div>

          <button
            onClick={handleNewChat}
            className="group/btn relative inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_-5px_rgba(16,185,129,0.5)] hover:-translate-y-0.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>Start Analysis</span>
            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    )
  }

  // Case 1: Pre-existing chats
  return (
    <div className={`flex flex-col h-full overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Brain className="w-5 h-5 text-emerald-400" />
          <h3 className="font-semibold text-white/90">Vega AI</h3>
        </div>
        <button
          onClick={handleNewChat}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        <div className="text-xs font-medium text-white/40 uppercase tracking-wider px-2 mb-2">
          Recent Chats
        </div>
        
        {recentChats.map((chat) => {
          // Clean and truncate summary text intelligently
          let summaryText = chat.summary || 'Trading Analysis'
          
          // Remove common prefixes and suffixes
          summaryText = summaryText
            .replace(/^Trading performance[:\s-]+/i, '')
            .replace(/^Trading analysis[:\s-]+/i, '')
            .replace(/\s+summary$/i, '')
            .trim()
          
          // Remove trailing punctuation (colons, periods, etc.)
          summaryText = summaryText.replace(/[:;.,!?]+$/, '').trim()
          
          // Truncate to max 40 characters, but don't cut words
          const maxLength = 40
          if (summaryText.length <= maxLength) {
            summaryText = summaryText
          } else {
            // Find the last space before the max length to avoid cutting words
            const truncated = summaryText.substring(0, maxLength)
            const lastSpace = truncated.lastIndexOf(' ')
            summaryText = lastSpace > 20 
              ? truncated.substring(0, lastSpace) 
              : truncated
          }
          
          return (
            <button
              key={chat.id}
              onClick={() => handleContinueChat(chat.id)}
              className="w-full flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg hover:bg-white/5 text-left group transition-colors"
            >
              <span className="text-xs font-medium text-white/70 group-hover:text-white truncate transition-colors flex-1 min-w-0">
                {summaryText}
              </span>
              <span className="text-[10px] text-white/30 flex-shrink-0 whitespace-nowrap tabular-nums">
                {new Date(chat.updated_at || chat.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </button>
          )
        })}
      </div>

      <div className="p-4">
        <button
          onClick={() => router.push('/vega')}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-white/60 hover:text-white transition-colors"
        >
          <span>View all conversations</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

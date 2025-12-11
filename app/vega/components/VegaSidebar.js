import { useState, useEffect } from 'react'
import { Plus, MessageSquare, MessageCircle, Trash2, Loader2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useAuth } from '@/lib/AuthContext'
import { toast } from 'sonner'

export default function VegaSidebar({ onNewChat, coachMode, setCoachMode, onSelectChat, currentConversationId }) {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [chatToDelete, setChatToDelete] = useState(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const fetchConversations = async () => {
      try {
        const res = await fetch('/api/ai/chat')
        if (res.ok) {
          const data = await res.json()
          if (data.success && Array.isArray(data.conversations)) {
            setConversations(data.conversations)
          }
        }
      } catch (error) {
        console.error('Failed to fetch conversations:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchConversations()
  }, [user])

  const handleDelete = async (conversationId) => {
    setDeletingId(conversationId)
    try {
      const res = await fetch(`/api/ai/chat/${conversationId}`, {
        method: 'DELETE'
      })
      
      if (res.ok) {
        // Remove from local state
        setConversations(prev => prev.filter(c => c.id !== conversationId))
        // If deleted chat was current, clear it
        if (conversationId === currentConversationId && onNewChat) {
          onNewChat()
        }
        toast.success('Conversation deleted')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to delete conversation')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete conversation')
    } finally {
      setDeletingId(null)
      setShowDeleteConfirm(false)
      setChatToDelete(null)
    }
  }

  const handleDeleteClick = (e, conversation) => {
    e.stopPropagation()
    setChatToDelete(conversation)
    setShowDeleteConfirm(true)
  }

  const cleanSummary = (summary) => {
    if (!summary) return 'New Chat'
    return summary
      .replace(/^Trading performance[:\s-]+/i, '')
      .replace(/^Trading analysis[:\s-]+/i, '')
      .replace(/\s+summary$/i, '')
      .replace(/[:;.,!?]+$/, '')
      .trim()
  }

  const truncateText = (text, maxLength = 40) => {
    if (!text || text.length <= maxLength) return text || 'New Chat'
    const truncated = text.substring(0, maxLength)
    const lastSpace = truncated.lastIndexOf(' ')
    return lastSpace > 20 ? truncated.substring(0, lastSpace) : truncated
  }

  return (
    <div className="w-64 hidden md:flex flex-col border-r border-white/5 bg-zinc-950/30 flex-shrink-0 h-full">
      {/* New Chat Button */}
      <div className="p-4 space-y-4">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-3 px-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-all shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_-3px_rgba(16,185,129,0.4)]"
        >
          <Plus className="w-5 h-5" />
          <span>New Chat</span>
        </button>

        {/* Coach Mode Toggle - Moved to top for better visibility */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setCoachMode(!coachMode)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all border ${
                  coachMode
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    coachMode ? 'bg-emerald-500/20' : 'bg-white/5'
                  }`}>
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">Coach Mode</p>
                    <p className="text-[10px] opacity-60">
                      {coachMode ? 'On' : 'Off'}
                    </p>
                  </div>
                </div>
                
                <div className={`w-8 h-4 rounded-full transition-colors relative ${coachMode ? 'bg-emerald-500/30' : 'bg-white/10'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${coachMode ? 'bg-emerald-400 left-4' : 'bg-white/40 left-0.5'}`} />
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs ml-2">
              <p className="font-medium mb-1">Coach Mode</p>
              <p className="text-xs leading-relaxed">
                {coachMode 
                  ? 'Interactive coaching with concise responses and guided follow-up options.'
                  : 'Enable for more interactive, concise responses with guided follow-up options.'}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Navigation / History Section */}
      <div className="flex-1 overflow-y-auto px-2 py-2 chat-scrollbar">
        <div className="space-y-2">
          <h3 className="px-4 text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
            Recent Chats
          </h3>
          
          {loading ? (
            <div className="px-2 flex items-center justify-center py-8">
              <Loader2 className="w-4 h-4 animate-spin text-white/40" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="px-2 py-4 text-center">
              <p className="text-xs text-white/30">No conversations yet</p>
            </div>
          ) : (
            <div className="px-2 space-y-1">
              {conversations.map((chat) => {
                const summary = cleanSummary(chat.summary || chat.title)
                const truncated = truncateText(summary)
                const isActive = chat.id === currentConversationId
                
                return (
                  <div
                    key={chat.id}
                    className={`group relative flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg hover:bg-white/5 text-left transition-colors ${
                      isActive ? 'bg-white/10' : ''
                    }`}
                  >
                    <button
                      onClick={() => onSelectChat && onSelectChat(chat.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-medium truncate transition-colors ${
                          isActive ? 'text-white' : 'text-white/70 group-hover:text-white'
                        }`}>
                          {truncated}
                        </span>
                        <span className="text-[10px] text-white/30 flex-shrink-0 whitespace-nowrap tabular-nums">
                          {new Date(chat.updated_at || chat.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </button>
                    
                    <button
                      onClick={(e) => handleDeleteClick(e, chat)}
                      disabled={deletingId === chat.id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded text-white/40 hover:text-red-400 disabled:opacity-50"
                      title="Delete conversation"
                    >
                      {deletingId === chat.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-zinc-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white/90">Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              This will permanently delete this conversation and all its messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setShowDeleteConfirm(false)
                setChatToDelete(null)
              }}
              className="bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => chatToDelete && handleDelete(chatToDelete.id)}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bottom Actions - Removed Coach Mode as it is now at top */}
      <div className="p-4 border-t border-white/5 space-y-2">
        <div className="px-2 py-1 text-xs text-center text-white/30">
           Vega AI v1.0
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { MessageSquarePlus, MessageSquare, MessageCircle, Trash2, Loader2, Pencil, Check, X } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useAuth } from '@/lib/AuthContext'
import { toast } from 'sonner'

export default function VegaSidebar({ onNewChat, coachMode, setCoachMode, onSelectChat, currentConversationId, isMobile = false }) {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [chatToDelete, setChatToDelete] = useState(null)
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [renaming, setRenaming] = useState(false)
  const renameInputRef = useRef(null)

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

  const handleRenameClick = (e, conversation) => {
    e.stopPropagation()
    // Use title if it exists (user-renamed), otherwise use summary for display
    const displayName = conversation.title || cleanSummary(conversation.summary || conversation.title)
    setRenamingId(conversation.id)
    setRenameValue(displayName)
    // Focus input after state update
    setTimeout(() => {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    }, 0)
  }

  const handleRenameSave = async (conversationId) => {
    if (!renameValue.trim()) {
      // Cancel rename if empty
      setRenamingId(null)
      setRenameValue('')
      return
    }

    setRenaming(true)
    try {
      const res = await fetch(`/api/ai/chat/${conversationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: renameValue.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to rename conversation')
      }

      // Update local state - update title field, preserve summary for AI context
      setConversations(prev => prev.map(c => 
        c.id === conversationId 
          ? { ...c, title: renameValue.trim() }
          : c
      ))

      toast.success('Conversation renamed')
      setRenamingId(null)
      setRenameValue('')
    } catch (error) {
      console.error('Rename error:', error)
      toast.error(error.message || 'Failed to rename conversation')
      setRenamingId(null)
      setRenameValue('')
    } finally {
      setRenaming(false)
    }
  }

  const handleRenameCancel = () => {
    setRenamingId(null)
    setRenameValue('')
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
    <div className={`w-64 ${isMobile ? 'flex' : 'hidden md:flex'} flex-col border-r border-white/5 bg-zinc-950/30 flex-shrink-0 h-full`}>
      {/* New Chat Button */}
      <div className="p-4 space-y-4">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 text-white/90 font-medium rounded-lg transition-all border border-emerald-500/20 hover:border-emerald-500/30"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>New Chat</span>
        </button>

        {/* Coach Mode Toggle - Moved to top for better visibility */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setCoachMode(!coachMode)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg transition-all border ${
                  coachMode
                    ? 'bg-white/5 border-emerald-500/20 text-white/90'
                    : 'bg-white/5 border-emerald-500/10 text-white/50 hover:bg-white/10 hover:text-white/70 hover:border-emerald-500/15'
                }`}
              >
                <span className="text-sm font-medium">Coach Mode</span>
                
                <div className={`w-8 h-4 rounded-full transition-colors relative ${coachMode ? 'bg-emerald-500/40' : 'bg-white/10'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${coachMode ? 'bg-emerald-400 left-4' : 'bg-white/30 left-0.5'}`} />
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
                // Prefer title (user-renamed) over summary (AI-generated) for display
                // Summary is preserved for AI context, title is for user labeling
                const displayName = chat.title || cleanSummary(chat.summary || chat.title)
                const truncated = truncateText(displayName)
                const isActive = chat.id === currentConversationId
                const isRenaming = renamingId === chat.id
                
                return (
                  <div
                    key={chat.id}
                    className={`group relative flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg hover:bg-white/5 text-left transition-colors ${
                      isActive ? 'bg-white/10' : ''
                    }`}
                  >
                    {isRenaming ? (
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <input
                          ref={renamingId === chat.id ? renameInputRef : null}
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleRenameSave(chat.id)
                            }
                            if (e.key === 'Escape') {
                              handleRenameCancel()
                            }
                          }}
                          onBlur={() => handleRenameSave(chat.id)}
                          maxLength={100}
                          className="flex-1 min-w-0 px-2 py-1 text-xs font-medium bg-white/10 border border-emerald-500/30 rounded text-white placeholder:text-white/40 focus:outline-none focus:border-emerald-500/50"
                          disabled={renaming}
                          autoFocus
                        />
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleRenameSave(chat.id)}
                            disabled={renaming}
                            className="p-1 hover:bg-white/10 rounded text-emerald-400 disabled:opacity-50"
                            title="Save"
                          >
                            {renaming ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            onClick={handleRenameCancel}
                            disabled={renaming}
                            className="p-1 hover:bg-white/10 rounded text-white/40 disabled:opacity-50"
                            title="Cancel"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
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
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleRenameClick(e, chat)}
                            className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-emerald-400 transition-colors"
                            title="Rename conversation"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(e, chat)}
                            disabled={deletingId === chat.id}
                            className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-red-400 disabled:opacity-50 transition-colors"
                            title="Delete conversation"
                          >
                            {deletingId === chat.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </>
                    )}
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

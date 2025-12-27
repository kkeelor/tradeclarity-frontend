// app/analyze/components/chat/ChatMessage.js
// OPTIMIZATION: Extracted from AIChat for better code splitting and memoization
'use client'

import { memo } from 'react'
import { Bot, User } from 'lucide-react'
import dynamic from 'next/dynamic'
import { parseChartRequest, removeChartBlock } from '@/components/charts/VegaChartRenderer'
import { MarkdownMessage } from '@/components/ui/MarkdownMessage'
import { MessageActions } from '@/components/ui/MessageActions'

// Dynamic import for chart renderer (canvas-based, no SSR)
const VegaChartRenderer = dynamic(
  () => import('@/components/charts/VegaChartRenderer').then(mod => ({ default: mod.default })),
  { ssr: false, loading: () => <div className="h-48 bg-white/5 rounded-lg animate-pulse" /> }
)

// Loading indicator component
function LoadingIndicator({ activeTools, formatToolName }) {
  return (
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
              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
              <span className="text-[10px] text-white/40 font-mono">
                {formatToolName(tool)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Memoized message content component
const MessageContent = memo(function MessageContent({ 
  message, 
  effectiveAnalytics, 
  effectiveAllTrades 
}) {
  const isAssistant = message.role === 'assistant'
  const content = isAssistant ? removeChartBlock(message.content) : message.content
  
  return (
    <>
      <MarkdownMessage content={content} />
      
      {/* Render chart from MCP tool data (auto-detected) */}
      {isAssistant && message.chartData && message.chartData.data?.length > 0 && (
        <div className="mt-3 -mx-1">
          <VegaChartRenderer
            chartConfig={{
              type: message.chartData.chartType || 'price',
              title: `${message.chartData.symbol} Price`,
              options: {
                symbol: message.chartData.symbol,
                data: message.chartData.data
              }
            }}
            analytics={effectiveAnalytics}
            allTrades={effectiveAllTrades}
            height={220}
          />
        </div>
      )}
      
      {/* Render chart if present in assistant message (manual) */}
      {isAssistant && message.content && parseChartRequest(message.content) && (
        <VegaChartRenderer
          chartConfig={parseChartRequest(message.content)}
          analytics={effectiveAnalytics}
          allTrades={effectiveAllTrades}
          height={200}
          className="mt-3 -mx-1"
        />
      )}
    </>
  )
})

// Main ChatMessage component
const ChatMessage = memo(function ChatMessage({
  message,
  isLastMessage,
  effectiveAnalytics,
  effectiveAllTrades,
  activeTools,
  formatToolName,
  coachMode,
  isLoading,
  onOptionSelect,
  ChatOptionsComponent
}) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  
  return (
    <div
      className={`group flex flex-col ${isUser ? 'items-end' : 'items-start'} transition-all duration-300 ease-out`}
      style={{ 
        opacity: message.isLoading ? 0.7 : 1,
        transform: 'translateY(0)'
      }}
    >
      <div className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'} w-full`}>
        {isAssistant && (
          <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Bot className="w-3.5 h-3.5 text-white/60" />
          </div>
        )}
        <div className="relative flex items-start gap-2 max-w-[80%] group/message">
          <div
            className={`rounded-lg px-3 py-2 transition-all duration-200 flex-1 ${
              isUser
                ? 'bg-white/10 text-white/90'
                : message.error
                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                : 'bg-white/5 text-white/65'
            }`}
          >
            {message.isLoading ? (
              <LoadingIndicator 
                activeTools={activeTools} 
                formatToolName={formatToolName} 
              />
            ) : (
              <MessageContent 
                message={message}
                effectiveAnalytics={effectiveAnalytics}
                effectiveAllTrades={effectiveAllTrades}
              />
            )}
          </div>
          {/* Message Actions - Copy button */}
          {!message.isLoading && message.content && (
            <div className="flex-shrink-0 mt-1 transition-opacity duration-200 opacity-0 group-hover/message:opacity-100">
              <MessageActions 
                content={isAssistant ? removeChartBlock(message.content) : message.content}
              />
            </div>
          )}
        </div>
        {isUser && (
          <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
            <User className="w-3.5 h-3.5 text-white/60" />
          </div>
        )}
      </div>
      
      {/* Timestamp */}
      {!message.isLoading && message.timestamp && (
        <div className={`text-xs text-white/30 mt-1 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {new Date(message.timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      )}
      
      {/* Coach mode: Show options after assistant messages */}
      {coachMode && isAssistant && !message.isLoading && 
       Array.isArray(message.options) && message.options.length > 0 && isLastMessage && (
        <div className="ml-8 mt-1">
          <ChatOptionsComponent 
            options={message.options}
            onSelect={onOptionSelect}
            disabled={isLoading}
          />
        </div>
      )}
    </div>
  )
})

export default ChatMessage

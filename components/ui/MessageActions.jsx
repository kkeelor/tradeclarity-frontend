'use client'

import { useState } from 'react'
import { Copy, Check, MoreVertical, RotateCcw } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'

/**
 * MessageActions - Action buttons for individual messages
 * Shows copy button and optionally regenerate button
 */
export function MessageActions({ 
  content, 
  onCopy, 
  onRegenerate,
  showRegenerate = false,
  className = ''
}) {
  const [copied, setCopied] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const handleCopy = async () => {
    try {
      const textToCopy = typeof content === 'string' ? content : JSON.stringify(content, null, 2)
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      if (onCopy) onCopy()
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-1 ${className}`}>
        {/* Copy Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-md transition-all duration-200 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 hover:scale-105 active:scale-95"
              aria-label="Copy message"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{copied ? 'Copied!' : 'Copy message'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Regenerate Button (optional) */}
        {showRegenerate && onRegenerate && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onRegenerate}
                className="p-1.5 rounded-md transition-all duration-200 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 hover:scale-105 active:scale-95"
                aria-label="Regenerate response"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Regenerate response</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}

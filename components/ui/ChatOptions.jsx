'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'

/**
 * ChatOptions - Interactive follow-up option buttons for coach mode
 * Renders 2-4 pill buttons below AI responses that users can click
 */
export function ChatOptions({ options, onSelect, disabled = false, className = '' }) {
  const [selectedIndex, setSelectedIndex] = useState(null)

  if (!options || options.length === 0) return null

  const handleClick = (option, index) => {
    if (disabled) return
    setSelectedIndex(index)
    onSelect(option)
  }

  return (
    <div className={`flex flex-wrap gap-2 mt-3 ${className}`}>
      {options.map((option, index) => (
        <button
          key={index}
          onClick={() => handleClick(option, index)}
          disabled={disabled}
          className={`
            group flex items-center gap-1.5 px-3 py-1.5 
            text-xs font-medium rounded-full
            border transition-all duration-200
            ${selectedIndex === index
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
              : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20 hover:text-white/90'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <span>{option}</span>
          <ChevronRight className={`w-3 h-3 transition-transform ${selectedIndex === index ? 'translate-x-0.5' : 'group-hover:translate-x-0.5'}`} />
        </button>
      ))}
    </div>
  )
}

/**
 * Parse options from AI response text
 * Looks for [OPTIONS] ... [/OPTIONS] block
 */
export function parseOptionsFromResponse(responseText) {
  if (!responseText || typeof responseText !== 'string') {
    return { message: responseText || '', options: [] }
  }

  try {
    // Match the options block - only match if both opening and closing tags exist
    const optionsMatch = responseText.match(/\[OPTIONS\]([\s\S]*?)\[\/OPTIONS\]/i)
    
    if (!optionsMatch) {
      return { message: responseText.trim(), options: [] }
    }

    // Extract the message (everything before [OPTIONS])
    const optionsIndex = responseText.indexOf('[OPTIONS]')
    if (optionsIndex === -1) {
      return { message: responseText.trim(), options: [] }
    }
    
    const message = responseText.substring(0, optionsIndex).trim()

    // Parse options (lines starting with -)
    const optionsBlock = optionsMatch[1]
    if (!optionsBlock) {
      return { message, options: [] }
    }
    
    const options = optionsBlock
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('-'))
      .map(line => line.substring(1).trim())
      .filter(option => option.length > 0)
      .slice(0, 4) // Max 4 options

    return { message, options }
  } catch (error) {
    // If anything goes wrong, return the original text with no options
    console.warn('[ChatOptions] Error parsing options:', error)
    return { message: responseText.trim(), options: [] }
  }
}

/**
 * Detect topic from message for depth tracking
 */
export function detectTopicFromMessage(message) {
  const messageLower = message.toLowerCase()
  
  // Topic keywords mapping
  const topicKeywords = {
    'win_rate': ['win rate', 'win%', 'winning', 'losses', 'losing'],
    'profit': ['profit', 'pnl', 'p&l', 'earnings', 'returns', 'loss', 'money'],
    'symbol': ['btc', 'eth', 'symbol', 'coin', 'token', 'trade', 'trading'],
    'timing': ['time', 'hour', 'day', 'when', 'morning', 'evening', 'night'],
    'risk': ['risk', 'drawdown', 'position size', 'stop loss', 'leverage'],
    'performance': ['performance', 'how am i', 'doing', 'overview', 'summary'],
    'psychology': ['psychology', 'emotional', 'fomo', 'revenge', 'discipline'],
    'strategy': ['strategy', 'approach', 'method', 'system']
  }

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(keyword => messageLower.includes(keyword))) {
      return topic
    }
  }

  return 'general'
}

/**
 * Check if message is a follow-up on the same topic
 */
export function isFollowUpOnTopic(newMessage, previousTopic, previousMessage) {
  // If user clicked an option (short message), it's likely a follow-up
  if (newMessage.length < 50 && previousTopic) {
    return true
  }

  const newTopic = detectTopicFromMessage(newMessage)
  
  // Same topic = follow-up
  if (newTopic === previousTopic && previousTopic !== 'general') {
    return true
  }

  // Check for continuation phrases
  const continuationPhrases = [
    'tell me more', 'what about', 'why', 'how', 'show me',
    'explain', 'what do you mean', 'can you', 'more on',
    'dig deeper', 'elaborate', 'specifically'
  ]
  
  const messageLower = newMessage.toLowerCase()
  return continuationPhrases.some(phrase => messageLower.includes(phrase))
}

export default ChatOptions

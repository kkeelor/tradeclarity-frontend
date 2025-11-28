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
 * Also hides partial/incomplete OPTIONS and CHART blocks during streaming
 */
export function parseOptionsFromResponse(responseText, isStreaming = false) {
  if (!responseText || typeof responseText !== 'string') {
    return { message: responseText || '', options: [] }
  }

  try {
    // First, strip any [CHART] blocks (complete or partial)
    let cleanedText = responseText
    
    // Remove complete [CHART]...[/CHART] blocks
    cleanedText = cleanedText.replace(/\[CHART\][\s\S]*?\[\/CHART\]/gi, '')
    
    // Remove partial [CHART] blocks (no closing tag yet - streaming)
    const chartIndex = cleanedText.indexOf('[CHART]')
    if (chartIndex !== -1 && !cleanedText.includes('[/CHART]')) {
      cleanedText = cleanedText.substring(0, chartIndex)
    }
    
    // Remove partial [C, [CH, [CHA, [CHAR, [CHART at end (streaming)
    const partialChartMatch = cleanedText.match(/\[C(?:H(?:A(?:R(?:T)?)?)?)?$/i)
    if (partialChartMatch) {
      cleanedText = cleanedText.substring(0, partialChartMatch.index)
    }
    
    // Check if we have a complete options block (both opening and closing tags)
    const optionsMatch = cleanedText.match(/\[OPTIONS\]([\s\S]*?)\[\/OPTIONS\]/i)
    
    // Find where [OPTIONS] starts (if it exists at all)
    const optionsIndex = cleanedText.indexOf('[OPTIONS]')
    
    // Also check for partial opening tag at the end (e.g., "[O", "[OP", "[OPT", etc.)
    // This handles the case where we're mid-stream and the tag is being typed
    const partialTagMatch = cleanedText.match(/\[O(?:P(?:T(?:I(?:O(?:N(?:S)?)?)?)?)?)?$/i)
    
    // If no [OPTIONS] tag and no partial tag, return cleaned text
    if (optionsIndex === -1 && !partialTagMatch) {
      return { message: cleanedText.trim(), options: [] }
    }
    
    // If we have a partial tag at the end (streaming), strip it
    if (partialTagMatch && optionsIndex === -1) {
      const message = cleanedText.substring(0, partialTagMatch.index).trim()
      return { message, options: [] }
    }
    
    // Get the message content (everything BEFORE [OPTIONS])
    const message = cleanedText.substring(0, optionsIndex).trim()
    
    // If we have a COMPLETE options block, parse the options
    if (optionsMatch) {
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
    }
    
    // If we have [OPTIONS] but NO closing [/OPTIONS] yet (streaming),
    // just return the message without the partial options block
    // This hides the options text during streaming
    return { message, options: [] }
    
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

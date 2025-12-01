'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Colorize numbers and percentages in text
 * Green for positive/profit, red for negative/loss
 * Returns an array of React elements and strings
 */
function colorizeText(text) {
  if (!text || typeof text !== 'string') return text

  const parts = []
  let lastIndex = 0

  // Pattern 1: Explicit +/- signs with numbers/percentages/currency
  const explicitPattern = /([+\-])\s*(\$)?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(%|percent|points?)?/gi
  let match

  // First pass: find all explicit +/- patterns
  const matches = []
  while ((match = explicitPattern.exec(text)) !== null) {
    matches.push({
      index: match.index,
      length: match[0].length,
      sign: match[1],
      currency: match[2] || '',
      number: match[3],
      suffix: match[4] || '',
      isPositive: match[1] === '+'
    })
  }

  // Pattern 2: Context-aware positive patterns (up, gain, profit, etc.)
  const positivePattern = /(up|gain|profit|increase|rise|surge|jump|climb|grow|positive|winning|profitable)\s*[:\-]?\s*(\$)?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(%|percent|points?)?/gi
  while ((match = positivePattern.exec(text)) !== null) {
    // Check if this doesn't overlap with an explicit pattern
    const overlaps = matches.some(m => 
      match.index >= m.index && match.index < m.index + m.length
    )
    if (!overlaps) {
      matches.push({
        index: match.index,
        length: match[0].length,
        sign: '↑',
        currency: match[2] || '',
        number: match[3],
        suffix: match[4] || '',
        isPositive: true,
        contextWord: match[1],
        contextStart: match.index,
        contextLength: match[1].length
      })
    }
  }

  // Pattern 3: Context-aware negative patterns (down, loss, decline, etc.)
  const negativePattern = /(down|loss|decline|decrease|fall|drop|plunge|negative|losing|unprofitable)\s*[:\-]?\s*(\$)?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(%|percent|points?)?/gi
  while ((match = negativePattern.exec(text)) !== null) {
    const overlaps = matches.some(m => 
      match.index >= m.index && match.index < m.index + m.length
    )
    if (!overlaps) {
      matches.push({
        index: match.index,
        length: match[0].length,
        sign: '↓',
        currency: match[2] || '',
        number: match[3],
        suffix: match[4] || '',
        isPositive: false,
        contextWord: match[1],
        contextStart: match.index,
        contextLength: match[1].length
      })
    }
  }

  // Sort matches by index
  matches.sort((a, b) => a.index - b.index)

  // Build parts array
  matches.forEach((m, i) => {
    // Add text before this match
    if (m.index > lastIndex) {
      const beforeText = text.substring(lastIndex, m.index)
      // Check for standalone percentages in the before text
      parts.push(...processStandalonePercentages(beforeText))
    }

    // If there's a context word, replace it with arrow + colored number
    if (m.contextWord) {
      // Replace the entire match (context word + number) with arrow + colored number
      const colorClass = m.isPositive ? 'text-emerald-400' : 'text-red-400'
      parts.push(
        <span key={`num-${i}`} className={`${colorClass} font-medium`}>
          {m.sign} {m.currency}{m.number}{m.suffix}
        </span>
      )
      // Skip over the entire match including the context word
      lastIndex = m.index + m.length
    } else {
      // No context word, just add colored number with sign
      const colorClass = m.isPositive ? 'text-emerald-400' : 'text-red-400'
      parts.push(
        <span key={`num-${i}`} className={`${colorClass} font-medium`}>
          {m.sign}{m.currency}{m.number}{m.suffix}
        </span>
      )
      lastIndex = m.index + m.length
    }
  })

  // Add remaining text
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex)
    const processed = processStandalonePercentages(remainingText)
    if (Array.isArray(processed)) {
      parts.push(...processed)
    } else {
      parts.push(processed)
    }
  }

  // If no matches found, return original text
  if (parts.length === 0) {
    const processed = processStandalonePercentages(text)
    return Array.isArray(processed) && processed.length > 0 ? processed : text
  }

  return parts
}

function processStandalonePercentages(text) {
  const parts = []
  let lastIndex = 0
  const percentPattern = /(-?\d+(?:\.\d+)?)\s*(%|percent)/g
  let match

  while ((match = percentPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index))
    }

    const numValue = parseFloat(match[1])
    const colorClass = numValue > 0 ? 'text-emerald-400' : numValue < 0 ? 'text-red-400' : ''
    
    if (colorClass) {
      parts.push(
        <span key={`pct-${match.index}`} className={`${colorClass} font-medium`}>
          {match[0]}
        </span>
      )
    } else {
      parts.push(match[0])
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}

/**
 * MarkdownMessage - Renders markdown content with proper styling
 * Handles common markdown features: bold, italic, lists, code blocks, links, etc.
 * Also colorizes numbers: green for profit/positive, red for loss/negative
 */
export function MarkdownMessage({ content, className = '' }) {
  if (!content || typeof content !== 'string') {
    return null
  }

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ node, ...props }) => (
            <h1 className="text-xl font-bold mb-3 mt-4 text-white/90 first:mt-0" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-lg font-semibold mb-2 mt-3 text-white/90 first:mt-0" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-base font-semibold mb-2 mt-3 text-white/85 first:mt-0" {...props} />
          ),
          
          // Paragraphs
          p: ({ node, ...props }) => {
            // Process children to colorize numbers
            const processChildren = (children) => {
              if (typeof children === 'string') {
                const colored = colorizeText(children)
                if (Array.isArray(colored)) {
                  return colored.map((part, i) => 
                    typeof part === 'string' ? <span key={`p-${i}`}>{part}</span> : part
                  )
                }
                return colored
              }
              if (Array.isArray(children)) {
                return children.map((child, idx) => {
                  if (typeof child === 'string') {
                    const colored = colorizeText(child)
                    if (Array.isArray(colored)) {
                      return colored.map((part, i) => 
                        typeof part === 'string' ? <span key={`p-${idx}-${i}`}>{part}</span> : part
                      )
                    }
                    return colored
                  }
                  return child
                })
              }
              return children
            }
            
            return (
              <p className="text-sm leading-relaxed mb-2 text-white/90 last:mb-0" {...props}>
                {processChildren(props.children)}
              </p>
            )
          },
          
          // Lists
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside mb-2 ml-2 space-y-1 text-white/90" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside mb-2 ml-2 space-y-1 text-white/90" {...props} />
          ),
          li: ({ node, ...props }) => {
            // Process children to colorize numbers
            const processChildren = (children) => {
              if (typeof children === 'string') {
                const colored = colorizeText(children)
                if (Array.isArray(colored)) {
                  return colored.map((part, i) => 
                    typeof part === 'string' ? <span key={`li-${i}`}>{part}</span> : part
                  )
                }
                return colored
              }
              if (Array.isArray(children)) {
                return children.map((child, idx) => {
                  if (typeof child === 'string') {
                    const colored = colorizeText(child)
                    if (Array.isArray(colored)) {
                      return colored.map((part, i) => 
                        typeof part === 'string' ? <span key={`li-${idx}-${i}`}>{part}</span> : part
                      )
                    }
                    return colored
                  }
                  return child
                })
              }
              return children
            }
            
            return (
              <li className="text-sm leading-relaxed text-white/90" {...props}>
                {processChildren(props.children)}
              </li>
            )
          },
          
          // Code blocks
          code: ({ node, inline, ...props }) => {
            if (inline) {
              return (
                <code className="bg-white/10 text-white/90 px-1.5 py-0.5 rounded text-xs font-mono" {...props} />
              )
            }
            return (
              <code className="block bg-white/5 border border-white/10 rounded-md p-3 my-2 overflow-x-auto text-xs font-mono text-white/90" {...props} />
            )
          },
          pre: ({ node, ...props }) => (
            <pre className="bg-white/5 border border-white/10 rounded-md p-3 my-2 overflow-x-auto" {...props} />
          ),
          
          // Links
          a: ({ node, ...props }) => (
            <a
              className="text-[#EAAF08] hover:text-[#EAAF08]/80 underline underline-offset-2 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          
          // Blockquotes
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-2 border-white/20 pl-3 my-2 italic text-white/70" {...props} />
          ),
          
          // Horizontal rule
          hr: ({ node, ...props }) => (
            <hr className="border-white/10 my-3" {...props} />
          ),
          
          // Strong/Bold
          strong: ({ node, ...props }) => (
            <strong className="font-semibold text-white/95" {...props} />
          ),
          
          // Emphasis/Italic
          em: ({ node, ...props }) => (
            <em className="italic text-white/90" {...props} />
          ),
          
          // Tables (from remark-gfm)
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full border-collapse border border-white/10" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-white/5" {...props} />
          ),
          tbody: ({ node, ...props }) => (
            <tbody {...props} />
          ),
          tr: ({ node, ...props }) => (
            <tr className="border-b border-white/10" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="border border-white/10 px-3 py-2 text-left text-sm font-semibold text-white/90" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="border border-white/10 px-3 py-2 text-sm text-white/80" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

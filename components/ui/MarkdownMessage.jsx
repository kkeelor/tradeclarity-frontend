'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * MarkdownMessage - Renders markdown content with proper styling
 * Handles common markdown features: bold, italic, lists, code blocks, links, etc.
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
          p: ({ node, ...props }) => (
            <p className="text-sm leading-relaxed mb-2 text-white/90 last:mb-0" {...props} />
          ),
          
          // Lists
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside mb-2 ml-2 space-y-1 text-white/90" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside mb-2 ml-2 space-y-1 text-white/90" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="text-sm leading-relaxed text-white/90" {...props} />
          ),
          
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

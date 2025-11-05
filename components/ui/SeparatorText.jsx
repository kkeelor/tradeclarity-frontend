// components/ui/SeparatorText.jsx
'use client'

/**
 * Reusable separator component for text segments
 * Uses ASCII characters for better cross-platform compatibility
 */
export function SeparatorText({
  segments,
  className = '',
  separator = 'bullet', // 'bullet', 'pipe', 'dash', 'dot', or custom character
  separatorClassName = ''
}) {
  const validSegments = segments.filter(Boolean)
  if (validSegments.length === 0) return null

  // Map separator types to ASCII characters for better compatibility
  const separatorMap = {
    bullet: { char: '*', class: 'mx-1.5 text-current' },           // Asterisk (ASCII)
    pipe: { char: '|', class: 'mx-2 text-slate-500' },             // Pipe (ASCII)
    dash: { char: '-', class: 'mx-2 text-slate-500' },             // Hyphen (ASCII)
    dot: { char: '.', class: 'mx-1.5 text-current' },             // Dot (ASCII)
    custom: { char: separator, class: 'mx-1.5 text-current' }
  }

  const separatorType = typeof separator === 'string' && separator.length === 1
    ? 'custom'
    : separator
  const sepConfig = separatorMap[separatorType] || separatorMap.bullet

  return (
    <span className={className}>
      {validSegments.map((segment, idx) => (
        <span key={idx}>
          {idx > 0 && (
            <span
              className={`inline-block separator ${sepConfig.class} ${separatorClassName}`}
              data-separator
              aria-hidden="true"
            >
              {sepConfig.char}
            </span>
          )}
          <span>{segment}</span>
        </span>
      ))}
    </span>
  )
}

/**
 * Simple inline separator - just renders the separator character
 * Using ASCII characters for better cross-platform compatibility
 */
export function Separator({
  type = 'bullet',
  className = 'mx-1.5 text-current opacity-60'
}) {
  const separatorMap = {
    bullet: '*',         // Asterisk (ASCII)
    pipe: '|',           // Pipe (ASCII)
    dash: '-',           // Hyphen/dash (ASCII)
    dot: '.',            // Dot (ASCII)
    hyphen: '-'          // Hyphen (ASCII)
  }

  const char = separatorMap[type] || separatorMap.bullet

  return (
    <span
      className={`separator ${className}`}
      data-separator
      aria-hidden="true"
    >
      {char}
    </span>
  )
}

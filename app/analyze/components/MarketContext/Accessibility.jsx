// app/analyze/components/MarketContext/Accessibility.jsx
// Task 5.5: Accessibility (a11y) utilities and enhancements

'use client'

import { useEffect, useRef } from 'react'

// Hook to manage focus trap in modals
export function useFocusTrap(isOpen) {
  const containerRef = useRef(null)
  const previousFocusRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return

    // Store the previously focused element
    previousFocusRef.current = document.activeElement

    const container = containerRef.current
    if (!container) return

    // Get all focusable elements
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleTab = (e) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    container.addEventListener('keydown', handleTab)
    firstElement?.focus()

    return () => {
      container.removeEventListener('keydown', handleTab)
      // Restore focus to previous element
      previousFocusRef.current?.focus()
    }
  }, [isOpen])

  return containerRef
}

// Hook to announce changes to screen readers
export function useAriaLive(message, priority = 'polite') {
  useEffect(() => {
    if (!message) return

    const liveRegion = document.getElementById('aria-live-region') || (() => {
      const region = document.createElement('div')
      region.id = 'aria-live-region'
      region.setAttribute('role', 'status')
      region.setAttribute('aria-live', priority)
      region.setAttribute('aria-atomic', 'true')
      region.className = 'sr-only'
      document.body.appendChild(region)
      return region
    })()

    liveRegion.setAttribute('aria-live', priority)
    liveRegion.textContent = message

    // Clear after announcement
    const timeout = setTimeout(() => {
      liveRegion.textContent = ''
    }, 1000)

    return () => clearTimeout(timeout)
  }, [message, priority])
}

// Component to add skip link for keyboard navigation
export function SkipLink({ href = '#main-content', children = 'Skip to main content' }) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-emerald-500 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
    >
      {children}
    </a>
  )
}

// Utility to generate accessible labels
export function getAccessibleLabel(label, value, unit = '') {
  return `${label}: ${value}${unit ? ` ${unit}` : ''}`
}

// Utility for color contrast checking (WCAG AA compliance)
export function getContrastColor(backgroundColor) {
  // Simplified contrast checker - in production, use a library
  const rgb = backgroundColor.match(/\d+/g)
  if (!rgb) return '#000000'
  
  const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000
  return brightness > 128 ? '#000000' : '#FFFFFF'
}

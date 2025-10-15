// app/components/ThemeToggle.js
'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const [shouldPulse, setShouldPulse] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)

  useEffect(() => {
    // Check if user has already interacted with theme toggle
    const interacted = localStorage.getItem('theme-toggle-interacted')
    if (interacted) {
      setHasInteracted(true)
      return
    }

    // Only pulse if user hasn't interacted yet
    const pulseInterval = setInterval(() => {
      if (!hasInteracted) {
        setShouldPulse(true)
        // Stop pulsing after 2 seconds
        setTimeout(() => setShouldPulse(false), 2000)
      }
    }, 15000) // Every 15 seconds

    return () => clearInterval(pulseInterval)
  }, [hasInteracted])

  const handleToggle = () => {
    toggleTheme()
    // Mark as interacted and save to localStorage
    setHasInteracted(true)
    localStorage.setItem('theme-toggle-interacted', 'true')
  }

  return (
    <button
      onClick={handleToggle}
      className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 bg-slate-700 dark:bg-slate-700 light:bg-slate-200 ${
        shouldPulse ? 'animate-pulse-subtle' : ''
      }`}
      aria-label="Toggle theme"
    >
      {/* Subtle glow effect when pulsing */}
      {shouldPulse && (
        <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
      )}
      
      {/* Toggle Circle */}
      <div
        className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full transition-all duration-300 flex items-center justify-center ${
          theme === 'light'
            ? 'translate-x-7 bg-yellow-400'
            : 'translate-x-0 bg-slate-800'
        }`}
      >
        {theme === 'light' ? (
          <Sun className="w-4 h-4 text-slate-900" />
        ) : (
          <Moon className="w-4 h-4 text-slate-300" />
        )}
      </div>
    </button>
  )
}
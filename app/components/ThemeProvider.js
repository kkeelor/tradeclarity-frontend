// app/components/ThemeProvider.js
'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({
  theme: 'classic',
  toggleTheme: () => {}
})

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('classic')
  const [mounted, setMounted] = useState(false)

  // Load theme from localStorage on mount
  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('theme') || 'classic'
    setTheme(savedTheme)
    loadThemeStyles(savedTheme)
  }, [])

  // Dynamically load theme CSS file
  const loadThemeStyles = (themeName) => {
    // Remove existing theme link if any
    const existingLink = document.querySelector('link[data-theme-link]')
    if (existingLink) {
      existingLink.remove()
    }

    // Create new link element for theme CSS
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `/styles/themes/${themeName}.css`
    link.setAttribute('data-theme-link', 'true')
    document.head.appendChild(link)
  }

  const toggleTheme = () => {
    const newTheme = theme === 'classic' ? 'midnight' : 'classic'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    loadThemeStyles(newTheme)
  }

  // Prevent flash of wrong theme
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
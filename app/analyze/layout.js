// app/analyze/layout.js
'use client'

import { ThemeProvider } from '../components/ThemeProvider'

export default function AnalyzeLayout({ children }) {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  )
}

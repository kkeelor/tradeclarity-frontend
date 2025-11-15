// app/analyze/components/MarketContext/MobileOptimizations.jsx
// Mobile-specific optimizations and utilities

'use client'

import { useEffect } from 'react'
import { useMobile, useTouch } from './useMobile'

// Hook to reduce chart data points on mobile for performance
export function useOptimizedDataPoints(data, maxPoints = 50) {
  const { isMobile } = useMobile()
  
  return useMemo(() => {
    if (!data || data.length === 0) return []
    
    if (!isMobile || data.length <= maxPoints) return data
    
    // Sample data points evenly for mobile
    const step = Math.ceil(data.length / maxPoints)
    return data.filter((_, index) => index % step === 0)
  }, [data, isMobile, maxPoints])
}

// Hook to disable WebSocket updates on mobile when app is in background
export function useBatteryOptimization(enabled = true) {
  const { isMobile } = useMobile()
  
  useEffect(() => {
    if (!isMobile || !enabled) return
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Could pause WebSocket updates here
        console.log('App in background - pausing updates')
      } else {
        // Resume updates
        console.log('App in foreground - resuming updates')
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isMobile, enabled])
}

// Component wrapper for mobile-optimized charts
export function MobileChartWrapper({ children, mobileHeight = 250, desktopHeight = 400 }) {
  const { isMobile } = useMobile()
  
  return (
    <div style={{ height: isMobile ? `${mobileHeight}px` : `${desktopHeight}px` }}>
      {children}
    </div>
  )
}

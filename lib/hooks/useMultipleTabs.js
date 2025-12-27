// lib/hooks/useMultipleTabs.js
'use client'

import { useState, useEffect, useRef } from 'react'

const TAB_ID_KEY = 'tradeclarity_active_tab_id'
const TAB_HEARTBEAT_KEY = 'tradeclarity_tab_heartbeat'
const HEARTBEAT_INTERVAL = 2000 // 2 seconds
const TAB_TIMEOUT = 5000 // Consider tab inactive after 5 seconds

export function useMultipleTabs() {
  const [hasOtherTabs, setHasOtherTabs] = useState(false)
  const [otherTabCount, setOtherTabCount] = useState(0)
  const tabIdRef = useRef(null)
  const heartbeatIntervalRef = useRef(null)

  useEffect(() => {
    // Generate unique tab ID
    tabIdRef.current = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Register this tab
    const registerTab = () => {
      const tabs = JSON.parse(localStorage.getItem(TAB_ID_KEY) || '[]')
      if (!tabs.includes(tabIdRef.current)) {
        tabs.push(tabIdRef.current)
        localStorage.setItem(TAB_ID_KEY, JSON.stringify(tabs))
        localStorage.setItem(`${TAB_HEARTBEAT_KEY}_${tabIdRef.current}`, Date.now().toString())
      }
    }

    // Update heartbeat
    const updateHeartbeat = () => {
      localStorage.setItem(`${TAB_HEARTBEAT_KEY}_${tabIdRef.current}`, Date.now().toString())
    }

    // Check for other active tabs
    const checkOtherTabs = () => {
      const tabs = JSON.parse(localStorage.getItem(TAB_ID_KEY) || '[]')
      const now = Date.now()
      const activeTabs = tabs.filter(tabId => {
        const heartbeat = localStorage.getItem(`${TAB_HEARTBEAT_KEY}_${tabId}`)
        if (!heartbeat) return false
        const lastHeartbeat = parseInt(heartbeat, 10)
        return (now - lastHeartbeat) < TAB_TIMEOUT
      })

      // Remove inactive tabs
      const inactiveTabs = tabs.filter(tabId => !activeTabs.includes(tabId))
      inactiveTabs.forEach(tabId => {
        localStorage.removeItem(`${TAB_HEARTBEAT_KEY}_${tabId}`)
      })
      
      if (activeTabs.length > 0) {
        localStorage.setItem(TAB_ID_KEY, JSON.stringify(activeTabs))
      }

      // Count other tabs (excluding current)
      const otherTabs = activeTabs.filter(id => id !== tabIdRef.current)
      setHasOtherTabs(otherTabs.length > 0)
      setOtherTabCount(otherTabs.length)
    }

    // Initial registration and check
    registerTab()
    updateHeartbeat()
    checkOtherTabs()

    // Set up heartbeat interval
    heartbeatIntervalRef.current = setInterval(() => {
      updateHeartbeat()
      checkOtherTabs()
    }, HEARTBEAT_INTERVAL)

    // Listen for storage changes (other tabs)
    const handleStorageChange = (e) => {
      if (e.key === TAB_ID_KEY || e.key?.startsWith(TAB_HEARTBEAT_KEY)) {
        checkOtherTabs()
      }
    }
    window.addEventListener('storage', handleStorageChange)

    // Cleanup on unmount
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }
      
      // Remove this tab from registry
      const tabs = JSON.parse(localStorage.getItem(TAB_ID_KEY) || '[]')
      const updatedTabs = tabs.filter(id => id !== tabIdRef.current)
      if (updatedTabs.length > 0) {
        localStorage.setItem(TAB_ID_KEY, JSON.stringify(updatedTabs))
      } else {
        localStorage.removeItem(TAB_ID_KEY)
      }
      localStorage.removeItem(`${TAB_HEARTBEAT_KEY}_${tabIdRef.current}`)
      
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  return { hasOtherTabs, otherTabCount }
}

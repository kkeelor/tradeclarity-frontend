// app/analyze/components/TopHeadlines.js
// Component to display top headlines from Alpha Vantage news API
// Refreshes automatically every hour and checks for stale data

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

// Refresh interval: 1 hour (3600000ms)
const REFRESH_INTERVAL = 60 * 60 * 1000
// Consider headlines stale after 6 hours
const STALE_THRESHOLD = 6 * 60 * 60 * 1000

export default function TopHeadlines() {
  const [headlines, setHeadlines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastFetchTime, setLastFetchTime] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const intervalRef = useRef(null)
  const retryCountRef = useRef(0)
  const headlinesRef = useRef(headlines)

  // Keep ref in sync with state
  useEffect(() => {
    headlinesRef.current = headlines
  }, [headlines])

  const fetchHeadlines = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true)
      } else {
        setIsRefreshing(true)
      }
      setError(null)

      // Add cache-busting query parameter to ensure fresh data
      const cacheBuster = `&t=${Date.now()}`
      const response = await fetch(
        `${BACKEND_URL}/api/context/news/crypto?tickers=BTC,ETH&limit=5${cacheBuster}`,
        {
          // Add cache control headers to prevent stale data
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch headlines: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success && data.articles && data.articles.length > 0) {
        // Filter for most relevant headlines (positive sentiment or high relevance)
        const relevantHeadlines = data.articles
          .filter(article => {
            // Prioritize articles with sentiment scores
            const hasSentiment = article.sentiment?.score !== undefined
            const isRelevant = article.tickers?.length > 0 || article.topics?.length > 0
            return hasSentiment || isRelevant
          })
          .slice(0, 5) // Top 5 headlines
        
        setHeadlines(relevantHeadlines)
        setLastFetchTime(Date.now())
        retryCountRef.current = 0 // Reset retry count on success
      } else {
        setHeadlines([])
      }
    } catch (err) {
      console.error('Error fetching headlines:', err)
      setError(err.message)
      
      // Retry logic: retry up to 3 times with exponential backoff
      if (retryCountRef.current < 3) {
        retryCountRef.current += 1
        const retryDelay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000)
        setTimeout(() => {
          fetchHeadlines(silent)
        }, retryDelay)
      }
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    // Initial fetch
    fetchHeadlines()

    // Set up periodic refresh
    intervalRef.current = setInterval(() => {
      // Only refresh if headlines are stale or empty
      const now = Date.now()
      if (!lastFetchTime || (now - lastFetchTime) >= STALE_THRESHOLD || headlinesRef.current.length === 0) {
        fetchHeadlines(true) // Silent refresh
      }
    }, REFRESH_INTERVAL)

    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [lastFetchTime, fetchHeadlines])

  // Check if component becomes visible and headlines are stale
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now()
        // Refresh if headlines are stale or haven't been fetched in a while
        if (!lastFetchTime || (now - lastFetchTime) >= STALE_THRESHOLD) {
          fetchHeadlines(true) // Silent refresh when tab becomes visible
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [lastFetchTime, fetchHeadlines])

  const handleManualRefresh = () => {
    retryCountRef.current = 0 // Reset retry count
    fetchHeadlines(false)
  }

  // Check if headlines are stale
  const areHeadlinesStale = lastFetchTime 
    ? (Date.now() - lastFetchTime) >= STALE_THRESHOLD 
    : true

  if (loading && !isRefreshing) {
    return (
      <div className="flex items-center justify-center p-2">
        <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
        <span className="text-[10px] text-slate-400 ml-2">Loading headlines...</span>
      </div>
    )
  }

  // Show stale indicator if headlines exist but are stale
  const showStaleWarning = headlines.length > 0 && areHeadlinesStale && !loading

  if ((error && headlines.length === 0) || (!loading && !headlines || headlines.length === 0)) {
    // Show error or empty state only if we don't have cached headlines
    if (error && headlines.length === 0) {
      return (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-emerald-400/80 uppercase tracking-wider">
              Top Headlines
            </p>
            <button
              onClick={handleManualRefresh}
              className="text-[9px] text-slate-400 hover:text-emerald-400 transition-colors"
              title="Refresh headlines"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
          <p className="text-[9px] text-slate-500">Unable to load headlines</p>
        </div>
      )
    }
    return null // Fail silently if no error and no headlines
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-emerald-400/80 uppercase tracking-wider">
          Top Headlines
        </p>
        <div className="flex items-center gap-1.5">
          {showStaleWarning && (
            <span className="text-[8px] text-amber-400/70" title="Headlines may be stale">
              Stale
            </span>
          )}
          {isRefreshing ? (
            <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
          ) : (
            <button
              onClick={handleManualRefresh}
              className="text-[9px] text-slate-400 hover:text-emerald-400 transition-colors"
              title="Refresh headlines"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
      <div className="space-y-1">
        {headlines.map((article, index) => (
          <a
            key={article.url || index}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-[10px] text-slate-300 hover:text-emerald-300 hover:underline transition-colors line-clamp-1"
          >
            {article.title}
          </a>
        ))}
      </div>
    </div>
  )
}

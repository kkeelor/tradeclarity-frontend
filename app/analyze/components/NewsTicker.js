// app/analyze/components/NewsTicker.js
// Horizontal scrolling news ticker component

'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, Radio } from 'lucide-react'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

export default function NewsTicker() {
  const [headlines, setHeadlines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const tickerRef = useRef(null)
  const animationRef = useRef(null)

  useEffect(() => {
    fetchHeadlines()
  }, [])

  useEffect(() => {
    if (headlines.length > 0) {
      startAnimation()
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [headlines])

  const fetchHeadlines = async () => {
    try {
      setLoading(true)
      // Fetch mixed news (stocks + crypto) - backend handles mixing and returns top 10
      const response = await fetch(`${BACKEND_URL}/api/context/news/mixed?limit=10`)
      const data = await response.json()
      
      if (data.success && data.articles && data.articles.length > 0) {
        // Backend already filters and returns top 10 relevant articles
        // No need for additional filtering - just use what backend returns
        setHeadlines(data.articles)
      } else {
        setHeadlines([])
      }
    } catch (err) {
      console.error('Error fetching headlines:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const startAnimation = () => {
    if (!tickerRef.current) return

    const ticker = tickerRef.current
    const content = ticker.querySelector('.ticker-content')
    if (!content) return

    // Wait a bit for content to render
    setTimeout(() => {
      let position = 0
      const speed = 0.5 // pixels per frame
      const contentWidth = content.scrollWidth / 2 // Since we duplicate, divide by 2

      const animate = () => {
        position -= speed
        
        // Reset position when content has scrolled completely
        if (Math.abs(position) >= contentWidth) {
          position = 0
        }
        
        content.style.transform = `translateX(${position}px)`
        animationRef.current = requestAnimationFrame(animate)
      }

      animationRef.current = requestAnimationFrame(animate)
    }, 100)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-2 px-4 border-t border-slate-800/50">
        <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
        <span className="text-[10px] text-slate-400 ml-2">Loading news...</span>
      </div>
    )
  }

  if (error || !headlines || headlines.length === 0) {
    // Show placeholder even if no data
    return (
      <div className="relative w-full overflow-hidden rounded-lg border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
        <div className="flex items-center gap-2 px-3 py-1.5">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Live</span>
          </div>
          <div className="flex-1 text-[11px] text-slate-500">
            {error ? 'News feed temporarily unavailable' : 'Loading market news...'}
          </div>
        </div>
      </div>
    )
  }

  // Duplicate headlines for seamless loop
  const duplicatedHeadlines = [...headlines, ...headlines]

  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
      <div className="flex items-center gap-2 px-3 py-1.5">
        {/* Radio icon indicator */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Live</span>
        </div>

        {/* Scrolling ticker */}
        <div 
          ref={tickerRef}
          className="flex-1 overflow-hidden"
          style={{ maskImage: 'linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)' }}
        >
          <div className="ticker-content flex gap-6 whitespace-nowrap">
            {duplicatedHeadlines.map((article, index) => (
              <a
                key={`${article.url || index}-${Math.floor(index / headlines.length)}`}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[11px] text-slate-300 hover:text-emerald-300 transition-colors flex-shrink-0 group"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 group-hover:bg-emerald-400 transition-colors" />
                <span className="line-clamp-1 max-w-md">{article.title}</span>
                {article.sentiment?.score && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                    article.sentiment.score > 0.1 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : article.sentiment.score < -0.1
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-slate-500/20 text-slate-400'
                  }`}>
                    {article.sentiment.score > 0.1 ? '↑' : article.sentiment.score < -0.1 ? '↓' : '→'}
                  </span>
                )}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

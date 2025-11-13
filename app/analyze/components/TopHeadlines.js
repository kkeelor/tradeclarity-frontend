// app/analyze/components/TopHeadlines.js
// Component to display top headlines from Alpha Vantage news API

'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

export default function TopHeadlines() {
  const [headlines, setHeadlines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchHeadlines()
  }, [])

  const fetchHeadlines = async () => {
    try {
      setLoading(true)
      // Fetch top crypto and financial market news
      const response = await fetch(`${BACKEND_URL}/api/context/news/crypto?tickers=BTC,ETH&limit=5`)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-2">
        <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
        <span className="text-[10px] text-slate-400 ml-2">Loading headlines...</span>
      </div>
    )
  }

  if (error || !headlines || headlines.length === 0) {
    return null // Fail silently - don't show error in dashboard
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold text-emerald-400/80 uppercase tracking-wider">Top Headlines</p>
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

// app/analyze/page.js
'use client'

import { Suspense } from 'react'
import TradeClarityContent from './TradeClarityContent'

export default function TradeClarity() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <TradeClarityContent />
    </Suspense>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="text-white text-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p>Loading...</p>
      </div>
    </div>
  )
}
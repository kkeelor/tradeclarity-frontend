// app/analyze/page.js
'use client'

import { Suspense } from 'react'
import TradeClarityContent from './TradeClarityContent'
import { FullPageSkeleton } from '../components/LoadingSkeletons'

export default function TradeClarity() {
  return (
    <Suspense fallback={<FullPageSkeleton />}>
      <TradeClarityContent />
    </Suspense>
  )
}
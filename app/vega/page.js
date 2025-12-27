// app/vega/page.js
'use client'

import { Suspense } from 'react'
import VegaContent from './VegaContent'
import { FullPageSkeleton } from '../components/LoadingSkeletons'

export default function VegaPage() {
  return (
    <Suspense fallback={<FullPageSkeleton />}>
      <VegaContent />
    </Suspense>
  )
}

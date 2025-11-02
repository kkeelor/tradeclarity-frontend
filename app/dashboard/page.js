// app/dashboard/page.js
'use client'

import { Suspense } from 'react'
import DashboardContent from './DashboardContent'
import { FullPageSkeleton } from '../components/LoadingSkeletons'

export default function DashboardPage() {
  return (
    <Suspense fallback={<FullPageSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}

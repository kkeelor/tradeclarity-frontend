// app/analyze/page.js
'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FullPageSkeleton } from '../components/LoadingSkeletons'

function AnalyticsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    // Redirect all /analyze traffic to /vega, preserving query params
    const queryString = searchParams.toString()
    const redirectUrl = queryString ? `/vega?${queryString}` : '/vega'
    router.replace(redirectUrl)
  }, [router, searchParams])
  
  // Show loading while redirecting
  return <FullPageSkeleton />
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<FullPageSkeleton />}>
      <AnalyticsPageContent />
    </Suspense>
  )
}
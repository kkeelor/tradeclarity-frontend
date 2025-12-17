// app/reset-password/page.js
'use client'

// CRITICAL: Log immediately when page module loads
console.log('🔴 [ResetPasswordPage] PAGE MODULE LOADED - page.js file is being executed')

import { Suspense } from 'react'
import ResetPasswordContent from './ResetPasswordContent'
import { FullPageSkeleton } from '../components/LoadingSkeletons'

export default function ResetPasswordPage() {
  console.log('🔴 [ResetPasswordPage] PAGE COMPONENT RENDERING - ResetPasswordPage component is rendering')
  
  // Log URL info immediately
  if (typeof window !== 'undefined') {
    console.log('🔴 [ResetPasswordPage] URL INFO:', {
      href: window.location.href,
      pathname: window.location.pathname,
      hash: window.location.hash,
      search: window.location.search,
      hashLength: window.location.hash?.length || 0,
      hasAccessToken: window.location.hash?.includes('access_token') || false
    })
  }
  
  return (
    <Suspense fallback={<FullPageSkeleton />}>
      <ResetPasswordContent />
    </Suspense>
  )
}

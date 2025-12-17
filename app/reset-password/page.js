// app/reset-password/page.js
'use client'

import { Suspense } from 'react'
import ResetPasswordContent from './ResetPasswordContent'
import { FullPageSkeleton } from '../components/LoadingSkeletons'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<FullPageSkeleton />}>
      <ResetPasswordContent />
    </Suspense>
  )
}

// app/login/page.js
'use client'

import { Suspense } from 'react'
import LoginContent from './LoginContent'
import { FullPageSkeleton } from '../components/LoadingSkeletons'

export default function LoginPage() {
  return (
    <Suspense fallback={<FullPageSkeleton />}>
      <LoginContent />
    </Suspense>
  )
}

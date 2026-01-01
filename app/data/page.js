// app/data/page.js
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import DataManagement from '@/app/analyze/components/DataManagement'
import { Loader2 } from 'lucide-react'

export default function DataPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    // Only redirect if auth has finished loading and user is still null
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    )
  }

  // Only show nothing/redirect if auth is done loading and no user
  if (!user) {
    return null
  }

  return <DataManagement />
}

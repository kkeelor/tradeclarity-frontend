// app/admin/page.js
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { signInWithGoogle } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [checkingRole, setCheckingRole] = useState(false)
  const [error, setError] = useState(null)

  // Check if user is admin and redirect
  useEffect(() => {
    if (!user || authLoading) return

    let mounted = true

    const checkAdminRole = async () => {
      setCheckingRole(true)
      setError(null)

      // Clear admin login flag if set
      sessionStorage.removeItem('adminLogin')

      try {
        console.log('[Admin Login] Checking role for user:', user.id, user.email)

        // Use API route instead of direct query to avoid RLS issues
        const response = await fetch('/api/admin/check-role')
        
        if (!mounted) return

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP ${response.status}: ${errorData.details || ''}`)
        }

        const { role, isAdmin } = await response.json()

        if (!mounted) return

        console.log('[Admin Login] Role check result:', { role, isAdmin })

        if (isAdmin) {
          console.log('[Admin Login] ✅ Admin access granted, redirecting to mcp-stats')
          router.push('/admin/mcp-stats')
        } else {
          console.log('[Admin Login] ❌ Access denied, role is:', role)
          setError('Access denied. Admin role required.')
          setCheckingRole(false)
        }
      } catch (err) {
        if (!mounted) return
        console.error('[Admin Login] Exception checking role:', err)
        setError(`Failed to verify admin access: ${err.message || 'Unknown error'}`)
        setCheckingRole(false)
      }
    }

    checkAdminRole()

    return () => {
      mounted = false
    }
  }, [user, authLoading, router])

  const handleGoogleLogin = async () => {
    setError(null)
    try {
      // Store that we're logging in from admin page
      sessionStorage.setItem('adminLogin', 'true')
      await signInWithGoogle(true) // Force account selection
    } catch (err) {
      setError(err.message || 'Failed to sign in with Google')
      sessionStorage.removeItem('adminLogin')
    }
  }

  if (authLoading || checkingRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-300">
            {authLoading ? 'Loading...' : 'Checking admin access...'}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Admin Login</h1>
          <p className="text-slate-400">Sign in with your admin account</p>
        </div>

        {error && (
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-400 space-y-2">
              <div>{error}</div>
              <Button
                onClick={() => {
                  setError(null)
                  setCheckingRole(true)
                  // Trigger re-check by updating a dependency
                  window.location.reload()
                }}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!user && (
          <div className="space-y-4">
            <Button
              onClick={handleGoogleLogin}
              className="w-full bg-white text-slate-900 hover:bg-slate-100"
              size="lg"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

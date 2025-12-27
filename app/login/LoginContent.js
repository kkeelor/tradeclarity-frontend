// app/login/LoginContent.js
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import AuthScreen from '../analyze/components/AuthScreen'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, X } from 'lucide-react'

export default function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const [error, setError] = useState(null)
  const [showError, setShowError] = useState(false)

  // Handle OAuth errors from URL parameters
  useEffect(() => {
    const errorParam = searchParams.get('error')
    const errorCode = searchParams.get('error_code')
    const errorDescription = searchParams.get('error_description')

    if (errorParam) {
      let errorMessage = 'Authentication failed'

      // Handle specific error types
      if (errorParam === 'server_error' && errorDescription?.toLowerCase().includes('database')) {
        // Check if user is authenticated despite database error
        const checkAuth = async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession()
            
            if (session?.user) {
              console.log('✅ User authenticated despite database error, redirecting to dashboard')
              // User is authenticated, redirect to dashboard
              router.push('/dashboard')
              return
            }
          } catch (err) {
            console.error('Error checking session:', err)
          }

          // User not authenticated, show error
          errorMessage = 'Database error occurred during authentication. Please try again.'
          setError(errorMessage)
          setShowError(true)
        }

        checkAuth()
      } else if (errorParam === 'no_code') {
        errorMessage = 'Authentication code not received. Please try again.'
        setError(errorMessage)
        setShowError(true)
      } else if (errorParam === 'access_denied') {
        errorMessage = 'Access denied. Please grant the necessary permissions.'
        setError(errorMessage)
        setShowError(true)
      } else if (errorParam === 'exchange_failed') {
        errorMessage = 'Failed to exchange authentication code. Please try again.'
        setError(errorMessage)
        setShowError(true)
      } else if (errorParam === 'no_session') {
        errorMessage = 'No session created. Please try logging in again.'
        setError(errorMessage)
        setShowError(true)
      } else if (errorParam === 'callback_exception') {
        errorMessage = 'An error occurred during authentication. Please try again.'
        setError(errorMessage)
        setShowError(true)
      } else if (errorDescription) {
        // Use error description if available
        try {
          errorMessage = decodeURIComponent(errorDescription)
        } catch (e) {
          // If decoding fails, use as-is
          errorMessage = errorDescription
        }
        setError(errorMessage)
        setShowError(true)
      } else {
        // Generic error message
        errorMessage = `Authentication error: ${errorParam}`
        if (errorCode) {
          errorMessage += ` (${errorCode})`
        }
        setError(errorMessage)
        setShowError(true)
      }

      // Clear error from URL after displaying (but keep other params)
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('error')
      newUrl.searchParams.delete('error_code')
      newUrl.searchParams.delete('error_description')
      window.history.replaceState({}, '', newUrl)
    }
  }, [searchParams, router])

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard')
    }
  }, [user, authLoading, router])

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-300">Loading...</span>
        </div>
      </div>
    )
  }

  // Don't render if already logged in (redirect is happening)
  if (user) {
    return null
  }

  // Show auth screen with error handling
  return (
    <div className="relative">
      {/* Error Alert */}
      {showError && error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-400 flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => {
                  setShowError(false)
                  setError(null)
                }}
                className="ml-4 hover:text-red-300 transition-colors"
                aria-label="Dismiss error"
              >
                <X className="h-4 w-4" />
              </button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <AuthScreen
        onAuthSuccess={(user) => {
          // Clear any errors on successful auth
          setError(null)
          setShowError(false)
          // Redirect to the page specified in redirect param, or dashboard by default
          const redirectPath = searchParams.get('redirect') || '/dashboard'
          router.push(redirectPath)
        }}
      />
    </div>
  )
}

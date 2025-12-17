// app/reset-password/ResetPasswordContent.js
'use client'

// CRITICAL: Log immediately when module loads
console.log('🔴 [ResetPassword] MODULE LOADED - ResetPasswordContent.js file is being executed')

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import { updatePassword } from '@/lib/auth'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Lock, Eye, EyeOff, Loader2, TrendingUp } from 'lucide-react'

export default function ResetPasswordContent() {
  // CRITICAL: Log immediately when component function is called
  console.log('🔴 [ResetPassword] COMPONENT FUNCTION CALLED - ResetPasswordContent component is rendering')
  
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  
  console.log('🔴 [ResetPassword] Hooks initialized', {
    hasRouter: !!router,
    hasUser: !!user,
    userId: user?.id,
    authLoading: authLoading
  })
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tokenValidated, setTokenValidated] = useState(false)
  const [checkingToken, setCheckingToken] = useState(true)
  
  // Wrapper for setError that logs
  const setErrorWithLog = (errorMsg) => {
    console.error('🔴 [ResetPassword] Setting error state:', errorMsg)
    setError(errorMsg)
  }
  
  // Wrapper for setTokenValidated that logs
  const setTokenValidatedWithLog = (validated) => {
    console.log('🔴 [ResetPassword] Setting tokenValidated:', validated)
    setTokenValidated(validated)
  }
  
  // Wrapper for setCheckingToken that logs
  const setCheckingTokenWithLog = (checking) => {
    console.log('🔴 [ResetPassword] Setting checkingToken:', checking)
    setCheckingToken(checking)
  }

  // Log component mount and initial state
  useEffect(() => {
    console.log('🔵 [ResetPassword] Component mounted - useEffect #1', {
      hasWindow: typeof window !== 'undefined',
      pathname: typeof window !== 'undefined' ? window.location.pathname : 'N/A',
      hash: typeof window !== 'undefined' ? window.location.hash : 'N/A',
      hashLength: typeof window !== 'undefined' ? window.location.hash?.length || 0 : 0,
      hasAccessToken: typeof window !== 'undefined' ? window.location.hash?.includes('access_token') : false,
      search: typeof window !== 'undefined' ? window.location.search : 'N/A',
      fullUrl: typeof window !== 'undefined' ? window.location.href : 'N/A',
      timestamp: new Date().toISOString()
    })
    
    // Also log to window for debugging
    if (typeof window !== 'undefined') {
      window.__resetPasswordDebug = {
        mounted: true,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        hash: window.location.hash,
        search: window.location.search
      }
      console.log('🔴 [ResetPassword] Debug info stored in window.__resetPasswordDebug')
    }
  }, [])

  // Handle Supabase password reset token from URL hash
  useEffect(() => {
    console.log('🔵 [ResetPassword] useEffect #2 triggered - Token validation effect', {
      authLoading,
      hasWindow: typeof window !== 'undefined',
      pathname: typeof window !== 'undefined' ? window.location.pathname : 'N/A',
      fullUrl: typeof window !== 'undefined' ? window.location.href : 'N/A',
      hash: typeof window !== 'undefined' ? window.location.hash : 'N/A',
      hashLength: typeof window !== 'undefined' ? window.location.hash?.length || 0 : 0,
      timestamp: new Date().toISOString()
    })

    if (authLoading || typeof window === 'undefined') {
      console.log('🔵 [ResetPassword] Early return from useEffect #2:', { 
        authLoading, 
        hasWindow: typeof window !== 'undefined',
        reason: authLoading ? 'authLoading is true' : 'window is undefined'
      })
      return
    }

    let isMounted = true
    const hash = window.location.hash
    const fullUrl = window.location.href
    const searchParams = window.location.search
    
    console.log('🔵 [ResetPassword] Starting token validation', {
      hash: hash ? `${hash.substring(0, 50)}...` : 'NO HASH',
      hashLength: hash?.length || 0,
      hashFull: hash, // Log full hash for debugging
      searchParams: searchParams || 'NO SEARCH PARAMS',
      fullUrl: fullUrl,
      hasAccessToken: hash?.includes('access_token') || false,
      hasTypeRecovery: hash?.includes('type=recovery') || false,
      timestamp: new Date().toISOString()
    })
    
    // Store hash in window for debugging
    if (typeof window !== 'undefined') {
      window.__resetPasswordHash = hash
      console.log('🔴 [ResetPassword] Hash stored in window.__resetPasswordHash')
    }
    
    const validateToken = async () => {
      console.log('🔵 [ResetPassword] validateToken called', {
        hasHash: !!hash,
        hashIncludesAccessToken: hash?.includes('access_token'),
        hashIncludesType: hash?.includes('type=recovery')
      })

      if (hash && hash.includes('access_token')) {
        // Parse hash to extract tokens
        const hashParams = new URLSearchParams(hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const type = hashParams.get('type')
        
        console.log('🔵 [ResetPassword] Hash parsed', {
          hasAccessToken: !!accessToken,
          accessTokenLength: accessToken?.length || 0,
          accessTokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : 'N/A',
          hasRefreshToken: !!refreshToken,
          refreshTokenLength: refreshToken?.length || 0,
          type: type || 'N/A',
          allHashParams: Array.from(hashParams.keys())
        })
        
        if (accessToken) {
          console.log('🔄 [ResetPassword] Setting session from hash token...', {
            accessTokenLength: accessToken.length,
            accessTokenPreview: `${accessToken.substring(0, 30)}...`,
            refreshTokenLength: refreshToken?.length || 0,
            type: type || 'N/A'
          })
          try {
            const sessionStartTime = Date.now()
            console.log('🔄 [ResetPassword] Calling supabase.auth.setSession...')
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            })
            const sessionDuration = Date.now() - sessionStartTime
            console.log('🔄 [ResetPassword] setSession completed in', sessionDuration, 'ms')
            
            console.log('🔄 [ResetPassword] setSession response', {
              duration: `${sessionDuration}ms`,
              hasData: !!sessionData,
              hasSession: !!sessionData?.session,
              hasUser: !!sessionData?.session?.user,
              userId: sessionData?.session?.user?.id,
              userEmail: sessionData?.session?.user?.email,
              hasError: !!sessionError,
              errorMessage: sessionError?.message,
              errorStatus: sessionError?.status,
              errorName: sessionError?.name,
              fullError: sessionError
            })
            
            if (!isMounted) {
              console.log('🔵 [ResetPassword] Component unmounted, aborting')
              return
            }
            
            if (sessionError) {
              console.error('❌ [ResetPassword] Error setting session:', {
                message: sessionError.message,
                status: sessionError.status,
                name: sessionError.name,
                fullError: sessionError
              })
              setErrorWithLog('Invalid or expired reset link. Please request a new password reset.')
              setCheckingTokenWithLog(false)
              return
            }

            if (sessionData?.session?.user) {
              console.log('✅ [ResetPassword] Session established successfully', {
                userId: sessionData.session.user.id,
                email: sessionData.session.user.email,
                expiresAt: sessionData.session.expires_at
              })
              setTokenValidatedWithLog(true)
              setErrorWithLog('')
              setCheckingTokenWithLog(false)
              // Clear the hash from URL for security
              window.history.replaceState(null, '', window.location.pathname)
              console.log('🔵 [ResetPassword] Hash cleared from URL')
            } else {
              console.error('❌ [ResetPassword] No session in response', {
                sessionData: sessionData,
                sessionDataKeys: sessionData ? Object.keys(sessionData) : [],
                sessionExists: !!sessionData?.session,
                userExists: !!sessionData?.session?.user
              })
              setErrorWithLog('Invalid or expired reset link. Please request a new password reset.')
              setCheckingTokenWithLog(false)
            }
          } catch (err) {
            if (!isMounted) {
              console.log('🔵 [ResetPassword] Component unmounted during catch, aborting')
              return
            }
            console.error('❌ [ResetPassword] Exception setting session:', {
              message: err.message,
              stack: err.stack,
              name: err.name,
              fullError: err
            })
            setErrorWithLog('Invalid or expired reset link. Please request a new password reset.')
            setCheckingTokenWithLog(false)
          }
        } else {
          console.error('❌ [ResetPassword] No access_token found in hash', {
            hash: hash ? `${hash.substring(0, 100)}...` : 'NO HASH',
            hashFull: hash, // Log full hash
            hashParams: hash ? Array.from(new URLSearchParams(hash.substring(1)).keys()) : [],
            hashParamsValues: hash ? {
              access_token: new URLSearchParams(hash.substring(1)).get('access_token') ? 'EXISTS' : 'MISSING',
              refresh_token: new URLSearchParams(hash.substring(1)).get('refresh_token') ? 'EXISTS' : 'MISSING',
              type: new URLSearchParams(hash.substring(1)).get('type') || 'MISSING'
            } : {}
          })
          setErrorWithLog('Invalid reset link. Please request a new password reset.')
          setCheckingTokenWithLog(false)
        }
      } else {
        // No hash - check for existing session
        console.log('🔵 [ResetPassword] No hash with access_token, checking existing session...', {
          hash: hash || 'NO HASH',
          hashLength: hash?.length || 0,
          hashIncludesAccessToken: hash?.includes('access_token') || false
        })
        console.log('🔵 [ResetPassword] Calling supabase.auth.getSession...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        console.log('🔵 [ResetPassword] getSession result', {
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id,
          userEmail: session?.user?.email,
          sessionExpiresAt: session?.expires_at,
          hasError: !!error,
          errorMessage: error?.message,
          errorStatus: error?.status,
          fullError: error
        })
        
        if (!isMounted) {
          console.log('🔵 [ResetPassword] Component unmounted after getSession, aborting')
          return
        }
        
        setCheckingTokenWithLog(false)
        
        if (session?.user) {
          // User has a session but no hash - might be wrong page
          console.log('⚠️ [ResetPassword] User has session but no hash in URL')
          setErrorWithLog('Please use the password reset link from your email.')
        } else {
          console.error('❌ [ResetPassword] No hash and no session', {
            hash: hash || 'NO HASH',
            searchParams: searchParams || 'NO SEARCH PARAMS',
            fullUrl: fullUrl
          })
          setErrorWithLog('Invalid or expired reset link. Please request a new password reset.')
        }
      }
    }

    validateToken()

    return () => {
      console.log('🔵 [ResetPassword] Cleanup: unmounting')
      isMounted = false
    }
  }, [authLoading])

  // Redirect if already logged in (but not from reset flow)
  useEffect(() => {
    if (!authLoading && user && !tokenValidated) {
      router.push('/dashboard')
    }
  }, [user, authLoading, router, tokenValidated])

  const handleResetPassword = async (e) => {
    e.preventDefault()
    console.log('🔵 [ResetPassword] handleResetPassword called', {
      tokenValidated,
      passwordLength: password.length,
      confirmPasswordLength: confirmPassword.length
    })
    setErrorWithLog('')

    // Validation
    if (password.length < 8) {
      console.log('🔵 [ResetPassword] Validation failed: password too short')
      setErrorWithLog('Password must be at least 8 characters long')
      return
    }
    if (!/[a-zA-Z]/.test(password)) {
      console.log('🔵 [ResetPassword] Validation failed: no letter')
      setErrorWithLog('Password must contain at least one letter')
      return
    }
    if (!/\d/.test(password)) {
      console.log('🔵 [ResetPassword] Validation failed: no digit')
      setErrorWithLog('Password must contain at least one digit')
      return
    }
    if (password !== confirmPassword) {
      console.log('🔵 [ResetPassword] Validation failed: passwords do not match')
      setErrorWithLog('Passwords do not match')
      return
    }

    if (!tokenValidated) {
      console.error('❌ [ResetPassword] Token not validated, cannot reset password')
      setErrorWithLog('Please use a valid password reset link from your email.')
      return
    }

    console.log('🔵 [ResetPassword] Starting password update process')
    setLoading(true)
    try {
      // Verify we still have a valid session before updating password
      console.log('🔵 [ResetPassword] Checking session before password update...')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      console.log('🔵 [ResetPassword] Session check result', {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        expiresAt: session?.expires_at,
        hasError: !!sessionError,
        errorMessage: sessionError?.message
      })
      
      if (sessionError || !session) {
        console.error('❌ [ResetPassword] No valid session found', {
          sessionError: sessionError,
          hasSession: !!session
        })
        throw new Error('Session expired. Please request a new password reset link.')
      }

      // Update password using Supabase client directly (must have active session)
      console.log('🔵 [ResetPassword] Calling updateUser to change password...')
      const updateStartTime = Date.now()
      const { data, error } = await supabase.auth.updateUser({
        password: password
      })
      const updateDuration = Date.now() - updateStartTime

      console.log('🔵 [ResetPassword] updateUser response', {
        duration: `${updateDuration}ms`,
        hasData: !!data,
        hasUser: !!data?.user,
        userId: data?.user?.id,
        hasError: !!error,
        errorMessage: error?.message,
        errorStatus: error?.status,
        errorName: error?.name,
        fullError: error
      })

      if (error) {
        console.error('❌ [ResetPassword] Password update error:', {
          message: error.message,
          status: error.status,
          name: error.name,
          fullError: error
        })
        // Provide more specific error messages
        if (error.message?.includes('session') || error.message?.includes('auth')) {
          throw new Error('Session expired. Please request a new password reset link.')
        }
        throw error
      }

      console.log('✅ [ResetPassword] Password updated successfully')
      toast.success('Password updated', {
        description: 'Your password has been successfully reset',
        duration: 3000
      })

      // Sign out the recovery session and redirect to login
      console.log('🔵 [ResetPassword] Signing out recovery session...')
      await supabase.auth.signOut()
      console.log('✅ [ResetPassword] Signed out, redirecting to login')
      
      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/login')
      }, 1500)
    } catch (err) {
      console.error('❌ [ResetPassword] Reset password error:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
        fullError: err
      })
      setErrorWithLog(err.message || 'Failed to reset password. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  // Log render state
  console.log('🔴 [ResetPassword] Component rendering', {
    authLoading,
    hasUser: !!user,
    tokenValidated,
    checkingToken,
    hasError: !!error,
    errorMessage: error,
    timestamp: new Date().toISOString()
  })

  if (authLoading) {
    console.log('🔴 [ResetPassword] Rendering loading state')
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <span className="text-slate-300">Loading...</span>
        </div>
      </div>
    )
  }

  if (user && !tokenValidated) {
    console.log('🔴 [ResetPassword] User exists but token not validated, redirecting')
    return null // Redirect is happening
  }

  console.log('🔴 [ResetPassword] Rendering main form', {
    checkingToken,
    tokenValidated,
    hasError: !!error
  })

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 selection:bg-emerald-500/30">
      {/* Background blobs */}
      <div className="fixed top-1/4 -left-64 w-96 h-96 bg-emerald-500/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="fixed bottom-1/4 -right-64 w-96 h-96 bg-cyan-500/5 rounded-full blur-[128px] pointer-events-none" />

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Logo */}
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-white/90">
              Reset Password
            </h1>
            <p className="text-white/50 text-sm">
              Enter your new password below
            </p>
          </div>
        </div>

        {/* Reset Password Form */}
        <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium text-white/70">
                New Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="pl-10 pr-12 h-11 bg-black/50 border-white/10 text-white placeholder-white/20 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                  required
                  disabled={loading || !tokenValidated || checkingToken}
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="pt-1 space-y-1">
                <p className="text-[10px] font-medium text-white/40 mb-1.5">Password strength:</p>
                <div className="grid grid-cols-3 gap-1">
                  <div className={`h-1 rounded-full transition-all ${password.length >= 8 ? 'bg-emerald-500' : 'bg-white/10'}`} />
                  <div className={`h-1 rounded-full transition-all ${/[a-zA-Z]/.test(password) && password.length >= 4 ? 'bg-emerald-500' : 'bg-white/10'}`} />
                  <div className={`h-1 rounded-full transition-all ${/\d/.test(password) && password.length >= 6 ? 'bg-emerald-500' : 'bg-white/10'}`} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-xs font-medium text-white/70">
                Confirm Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="pl-10 pr-12 h-11 bg-black/50 border-white/10 text-white placeholder-white/20 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                  required
                  disabled={loading || !tokenValidated || checkingToken}
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {checkingToken && !error && (
              <Alert className="bg-blue-500/10 border-blue-500/20 text-blue-400">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription className="text-xs">Validating reset link...</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-400">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            <button
              type="submit"
              disabled={loading || !tokenValidated || checkingToken}
              className="w-full h-12 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating password...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

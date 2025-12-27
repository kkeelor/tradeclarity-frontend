// app/auth/reset-password/ResetPasswordContent.js
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { updatePassword } from '@/lib/auth'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Lock, Eye, EyeOff, Loader2, TrendingUp } from 'lucide-react'

export default function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Check if we have a valid reset token from URL
  useEffect(() => {
    // Supabase includes the token in the URL hash (#access_token=...)
    // If there's no hash, the link might be invalid
    if (!authLoading && typeof window !== 'undefined') {
      const hash = window.location.hash
      if (!hash || !hash.includes('access_token')) {
        setError('Invalid or expired reset link. Please request a new password reset.')
      }
    }
  }, [authLoading])

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard')
    }
  }, [user, authLoading, router])

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')

    // Validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }
    if (!/[a-zA-Z]/.test(password)) {
      setError('Password must contain at least one letter')
      return
    }
    if (!/\d/.test(password)) {
      setError('Password must contain at least one digit')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await updatePassword(password)
      if (error) throw error

      toast.success('Password updated', {
        description: 'Your password has been successfully reset',
        duration: 3000
      })

      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/login')
      }, 1500)
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <span className="text-slate-300">Loading...</span>
        </div>
      </div>
    )
  }

  if (user) {
    return null // Redirect is happening
  }

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
                  disabled={loading}
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
                  disabled={loading}
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

            {error && (
              <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-400">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            <button
              type="submit"
              disabled={loading}
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

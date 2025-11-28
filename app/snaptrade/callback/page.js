// app/snaptrade/callback/page.js
// Client-side callback handler for Snaptrade OAuth
'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [messageSent, setMessageSent] = useState(false)

  useEffect(() => {
    const sessionId = searchParams.get('sessionId')
    const status = searchParams.get('status')
    const error = searchParams.get('error')

    console.log('🔵 [Snaptrade Callback] Page loaded:', {
      sessionId,
      status,
      error,
      hasOpener: !!window.opener,
      openerClosed: window.opener?.closed,
    })

    // Check if we're in a popup window
    const isPopup = window.opener && !window.opener.closed

    if (isPopup && !messageSent) {
      // We're in a popup - send message to parent and close immediately
      setMessageSent(true)
      
      console.log('🔵 [Snaptrade Callback] Sending message to parent window')
      
      if (error) {
        console.log('❌ [Snaptrade Callback] Sending error message to parent:', error)
        window.opener.postMessage(
          {
            type: 'snaptrade_error',
            error: error,
          },
          window.location.origin
        )
        console.log('✅ [Snaptrade Callback] Error message sent')
      } else if (status === 'success' || sessionId) {
        console.log('✅ [Snaptrade Callback] Sending success message to parent:', {
          sessionId,
          status,
        })
        window.opener.postMessage(
          {
            type: 'snaptrade_connected',
            sessionId: sessionId,
            status: status,
          },
          window.location.origin
        )
        console.log('✅ [Snaptrade Callback] Success message sent')
      } else {
        console.warn('⚠️ [Snaptrade Callback] No error or success status, sending generic message')
        window.opener.postMessage(
          {
            type: 'snaptrade_connected',
            sessionId: sessionId,
            status: status,
          },
          window.location.origin
        )
      }

      // Close popup immediately (don't wait)
      try {
        window.close()
      } catch (e) {
        // Popup might be blocked, try again after delay
        setTimeout(() => {
          try {
            window.close()
          } catch (e2) {
            console.log('⚠️ Could not close popup')
          }
        }, 100)
      }
      return
    }

    // Not in popup - redirect to dashboard (only if not already sent message)
    if (!messageSent && !isPopup) {
      setMessageSent(true)
      console.log('🔵 [Snaptrade Callback] Not in popup, redirecting to dashboard')
      if (error) {
        router.push(`/dashboard?snaptrade_error=${encodeURIComponent(error)}`)
      } else if (status === 'success' || sessionId) {
        router.push('/dashboard?snaptrade_connected=true')
      } else {
        router.push('/dashboard')
      }
    }
  }, [searchParams, router, messageSent])

  const sessionId = searchParams.get('sessionId')
  const error = searchParams.get('error')

  // Don't render anything that requires auth - just show a simple message
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {error ? (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">Connection Failed</h2>
              <p className="text-white/60 text-sm">{error}</p>
            </div>
            <p className="text-xs text-white/40">You can close this window.</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">Connection Successful</h2>
              <p className="text-white/60 text-sm">
                Your brokerage account has been connected.
              </p>
              <p className="text-xs text-white/40 mt-2">This window will close automatically.</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function SnaptradeCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">Loading...</h2>
            <p className="text-white/60 text-sm">Processing your connection.</p>
          </div>
        </div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  )
}

// app/confirm/page.js
'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, ArrowRight, TrendingUp, Sparkles, Clock, Loader2 } from 'lucide-react'
import Footer from '../components/Footer'

function ConfirmContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [type, setType] = useState('signup')
  const [message, setMessage] = useState('')
  const [nextSteps, setNextSteps] = useState([])

  useEffect(() => {
    // Get confirmation type from URL params
    const confirmationType = searchParams.get('type') || 'signup'
    setType(confirmationType)

    // Set messages based on type
    switch (confirmationType) {
      case 'signup':
        setMessage('Your account has been created successfully!')
        setNextSteps([
          'Connect your exchange account to start analyzing your trades',
          'Or upload a CSV file with your trading data',
          'Explore your analytics dashboard'
        ])
        break
      case 'subscription':
        setMessage('Your subscription has been activated successfully!')
        setNextSteps([
          'Access all premium features immediately',
          'Connect unlimited exchanges',
          'Generate detailed analytics reports'
        ])
        break
      case 'payment':
        setMessage('Payment confirmed successfully!')
        setNextSteps([
          'Your subscription is now active',
          'Access all premium features',
          'Check your billing page for details'
        ])
        break
      case 'exchange':
        setMessage('Exchange connected successfully!')
        setNextSteps([
          'Your trading data is being synced',
          'Check your analytics dashboard',
          'View insights and patterns'
        ])
        break
      default:
        setMessage('Action completed successfully!')
        setNextSteps([
          'Continue exploring TradeClarity',
          'Check your dashboard',
          'Start analyzing your trades'
        ])
    }

    // Google Ads conversion tracking - fire pixel/tag here
    // Replace AW-CONVERSION_ID/CONVERSION_LABEL with your actual Google Ads conversion ID and label
    if (typeof window !== 'undefined') {
      // Method 1: Using gtag (if Google Analytics is installed)
      if (window.gtag) {
        window.gtag('event', 'conversion', {
          'send_to': 'AW-CONVERSION_ID/CONVERSION_LABEL', // Replace with your actual conversion ID and label
          'value': 1.0,
          'currency': 'USD',
          'transaction_id': searchParams.get('transaction_id') || ''
        })
      }

      // Method 2: Using Google Ads conversion pixel directly
      // Uncomment and replace with your actual conversion ID and label
      /*
      const img = document.createElement('img')
      img.src = `https://www.googleadservices.com/pagead/conversion/AW-CONVERSION_ID/CONVERSION_LABEL/?value=1.0&currency_code=USD&label=CONVERSION_LABEL&guid=ON&script=0`
      img.style.display = 'none'
      img.style.width = '1px'
      img.style.height = '1px'
      document.body.appendChild(img)
      */
    }
  }, [searchParams])

  const handleContinue = () => {
    switch (type) {
      case 'signup':
      case 'subscription':
      case 'payment':
        router.push('/dashboard')
        break
      case 'exchange':
        router.push('/analyze')
        break
      default:
        router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-white/5 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-emerald-400" />
            <span className="text-lg md:text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">TradeClarity</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 md:px-6 py-12 md:py-20">
        <div className="max-w-2xl w-full text-center">
          {/* Success Icon */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full" />
              <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center border-4 border-emerald-400/50">
                <CheckCircle className="w-12 h-12 md:w-16 md:h-16 text-white" />
              </div>
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            {message}
          </h1>

          <p className="text-lg text-slate-400 mb-8">
            You're all set! Welcome to TradeClarity.
          </p>

          {/* Next Steps */}
          {nextSteps.length > 0 && (
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 md:p-8 mb-8 text-left">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-semibold text-white">What's Next?</h2>
              </div>
              <ul className="space-y-3">
                {nextSteps.map((step, index) => (
                  <li key={index} className="flex items-start gap-3 text-slate-300">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-emerald-400">{index + 1}</span>
                    </div>
                    <span className="text-sm md:text-base">{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CTA Button */}
          <button
            onClick={handleContinue}
            className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 rounded-xl text-base font-semibold text-white transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-105"
          >
            Continue to Dashboard
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Additional Info */}
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-500">
            <Clock className="w-4 h-4" />
            <span>Need help? Contact us at tradeclarity.help@gmail.com</span>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  )
}

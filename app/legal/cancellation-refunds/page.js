// app/legal/cancellation-refunds/page.js
'use client'

import { ArrowLeft, RefreshCw, CreditCard } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Footer from '../../components/Footer'

export default function CancellationRefundsPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-white/60 hover:text-white/90 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 text-white/80" />
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-white/90">Cancellation & Refunds</h1>
        </div>

        <div className="prose prose-invert max-w-none space-y-8 text-white/70">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white/90 mb-4">Cancellation Policy</h2>
            <p>
              You may cancel your subscription at any time from your account dashboard or by contacting our support team. 
              When you cancel:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Your subscription will remain active until the end of your current billing period</li>
              <li>You will continue to have access to all features until the period ends</li>
              <li>No further charges will be made after the current period</li>
              <li>You can reactivate your subscription anytime before the period ends</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white/90 mb-4">Refund Policy</h2>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-white/80 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-white/90 mb-2">7-Day Money-Back Guarantee</h3>
                  <p className="text-sm text-white/70">
                    If you're not satisfied with TradeClarity within the first 7 days of your subscription, 
                    we offer a full refund. No questions asked.
                  </p>
                </div>
              </div>
            </div>
            
            <h3 className="text-xl font-semibold text-white/90 mt-6 mb-3">Refund Eligibility</h3>
            <p>Refunds are available under the following conditions:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Within 7 days:</strong> Full refund for any reason</li>
              <li><strong>After 7 days:</strong> Pro-rated refunds may be considered on a case-by-case basis for technical issues or service problems</li>
              <li><strong>Partial periods:</strong> Refunds are calculated based on unused time remaining in your billing period</li>
            </ul>

            <h3 className="text-xl font-semibold text-white/90 mt-6 mb-3">Refund Process</h3>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>Contact our support team at <Link href="/contact" className="text-emerald-400 hover:text-emerald-300">tradeclarity.help@gmail.com</Link></li>
              <li>Provide your account email and reason for refund</li>
              <li>Our team will process your refund within 5-7 business days</li>
              <li>Refunds will be credited to your original payment method</li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white/90 mb-4">Plan Changes</h2>
            <p>
              You can upgrade or downgrade your plan at any time. When you change plans:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Upgrades:</strong> Take effect immediately with prorated charges</li>
              <li><strong>Downgrades:</strong> Take effect at the end of your current billing period</li>
              <li>You'll receive a credit for unused time on your current plan</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white/90 mb-4">Questions?</h2>
            <p>
              If you have any questions about our cancellation or refund policy, please don't hesitate to 
              <Link href="/contact" className="text-emerald-400 hover:text-emerald-300"> contact us</Link>.
            </p>
          </section>

          <div className="pt-8 border-t border-white/10 text-sm text-white/50">
            <p>Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

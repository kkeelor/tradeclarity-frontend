// app/legal/shipping/page.js
'use client'

import { ArrowLeft, Package } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Footer from '../../components/Footer'

export default function ShippingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-white/5 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <Package className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">Shipping Policy</h1>
        </div>

        <div className="prose prose-invert max-w-none space-y-8 text-slate-300">
          <section className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-semibold text-blue-300 mb-2">Digital Service - No Physical Shipping</h2>
              <p>
                TradeClarity is a digital software-as-a-service (SaaS) platform. We do not ship any physical products. 
                All services are delivered instantly via the internet.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white mb-4">Service Delivery</h2>
            <p>
              Upon subscription activation, you gain immediate access to TradeClarity through your web browser. 
              There is no shipping time or delivery period required.
            </p>
            
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">Instant Access</h3>
            <p>Once your payment is processed:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Your subscription is activated immediately</li>
              <li>You receive instant access to all features included in your plan</li>
              <li>No waiting period or shipping confirmation required</li>
              <li>Access is available 24/7 through your account dashboard</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white mb-4">Account Activation</h2>
            <p>
              Account activation typically occurs within minutes of successful payment processing. 
              You will receive an email confirmation with your account details and access instructions.
            </p>
            
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">Activation Timeline</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Free Plan:</strong> Instant activation upon signup</li>
              <li><strong>Paid Plans:</strong> Immediate activation after payment confirmation</li>
              <li><strong>Payment Processing:</strong> Usually completes within 2-5 minutes</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white mb-4">Digital Products</h2>
            <p>
              TradeClarity provides digital services including:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Real-time trading analytics dashboard</li>
              <li>Automated trade analysis and insights</li>
              <li>PDF reports (digital downloads)</li>
              <li>Data export capabilities (CSV/JSON)</li>
              <li>API access (for Pro plans)</li>
            </ul>
            <p className="mt-4">
              All these services are delivered digitally and require no physical shipping.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white mb-4">International Access</h2>
            <p>
              TradeClarity is accessible worldwide. Since we deliver digital services, there are no 
              international shipping restrictions or customs requirements. You can access the platform 
              from anywhere with an internet connection.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white mb-4">Technical Requirements</h2>
            <p>To use TradeClarity, you need:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>An internet connection</li>
              <li>A modern web browser (Chrome, Firefox, Safari, Edge)</li>
              <li>A compatible device (computer, tablet, or smartphone)</li>
              <li>Valid account credentials</li>
            </ul>
            <p className="mt-4">
              No physical installation or shipping of software is required.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white mb-4">Support</h2>
            <p>
              If you experience any issues accessing your account or services, please contact our support team. 
              Since everything is digital, we can typically resolve access issues immediately.
            </p>
          </section>

          <div className="pt-8 border-t border-white/5 text-sm text-slate-400">
            <p>Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

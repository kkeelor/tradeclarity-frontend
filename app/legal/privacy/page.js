// app/legal/privacy/page.js
'use client'

import { ArrowLeft, Shield } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Footer from '../../components/Footer'

export default function PrivacyPage() {
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
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">Privacy Policy</h1>
        </div>

        <div className="prose prose-invert max-w-none space-y-8 text-slate-300">
          <section className="space-y-4">
            <p className="text-slate-400">
              At TradeClarity ("we", "us", "our"), we are committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
              when you use our trading analytics platform.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white mb-4">1. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-white mt-4 mb-3">1.1 Account Information</h3>
            <p>When you create an account, we collect:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Email address</li>
              <li>Name (if provided)</li>
              <li>Password (encrypted)</li>
              <li>Account preferences</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mt-4 mb-3">1.2 Trading Data</h3>
            <p>To provide analytics, we collect:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Trade history from connected exchanges (via API)</li>
              <li>CSV files you upload</li>
              <li>Trade data including symbols, prices, quantities, timestamps</li>
              <li>Account balances and positions</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mt-4 mb-3">1.3 Usage Data</h3>
            <p>We automatically collect:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Usage patterns and feature interactions</li>
              <li>Device information and browser type</li>
              <li>IP address and location (general)</li>
              <li>Log files and error reports</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mt-4 mb-3">1.4 Payment Information</h3>
            <p>
              Payment processing is handled by Razorpay. We do not store your full payment card details. 
              We only receive transaction confirmations and billing information necessary for subscription management.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white mb-4">2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide and improve our analytics services</li>
              <li>Process transactions and manage subscriptions</li>
              <li>Generate personalized insights and recommendations</li>
              <li>Communicate with you about your account and service updates</li>
              <li>Detect and prevent fraud or security issues</li>
              <li>Comply with legal obligations</li>
              <li>Analyze usage patterns to improve our platform</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white mb-4">3. Data Security</h2>
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-emerald-300 mb-2">Security Measures</h3>
              <p className="text-sm">
                We implement industry-standard security measures to protect your data:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-3 text-sm">
                <li>End-to-end encryption for data transmission</li>
                <li>Encrypted storage of sensitive data</li>
                <li>Secure API connections (HTTPS)</li>
                <li>Regular security audits and updates</li>
                <li>Access controls and authentication</li>
              </ul>
            </div>
            <p>
              However, no method of transmission over the internet is 100% secure. While we strive to protect 
              your data, we cannot guarantee absolute security.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white mb-4">4. Data Sharing and Disclosure</h2>
            <p>We do not sell your personal data. We may share information in the following circumstances:</p>
            
            <h3 className="text-xl font-semibold text-white mt-4 mb-3">4.1 Service Providers</h3>
            <p>We may share data with trusted third-party services that help us operate:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Payment processors (Razorpay)</li>
              <li>Cloud hosting providers (Supabase)</li>
              <li>Analytics services (for platform improvement)</li>
            </ul>
            <p className="mt-4">
              These providers are contractually obligated to protect your data and use it only for specified purposes.
            </p>

            <h3 className="text-xl font-semibold text-white mt-4 mb-3">4.2 Legal Requirements</h3>
            <p>We may disclose information if required by law or to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Comply with legal processes or government requests</li>
              <li>Protect our rights, property, or safety</li>
              <li>Prevent fraud or security threats</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mt-4 mb-3">4.3 Business Transfers</h3>
            <p>
              In the event of a merger, acquisition, or sale, your data may be transferred as part of the 
              business assets, with prior notice to users.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white mb-4">5. Your Rights and Choices</h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and data</li>
              <li><strong>Export:</strong> Download your data in a portable format</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
              <li><strong>Object:</strong> Object to certain data processing activities</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, please contact us at{' '}
              <Link href="/contact" className="text-emerald-400 hover:text-emerald-300">tradeclarity.help@gmail.com</Link>
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white mb-4">6. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active or as needed to provide services. 
              After account deletion, we may retain certain data for:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Legal compliance requirements</li>
              <li>Dispute resolution</li>
              <li>Security and fraud prevention</li>
            </ul>
            <p className="mt-4">
              Aggregated, anonymized data may be retained indefinitely for analytics purposes.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white mb-4">7. Cookies and Tracking</h2>
            <p>
              We use cookies and similar technologies to enhance your experience, analyze usage, and provide 
              personalized content. You can control cookies through your browser settings.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white mb-4">8. International Data Transfers</h2>
            <p>
              Your data may be stored and processed in servers located outside your country. We ensure 
              appropriate safeguards are in place to protect your data in accordance with this Privacy Policy.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white mb-4">9. Children's Privacy</h2>
            <p>
              TradeClarity is not intended for users under 18 years of age. We do not knowingly collect 
              personal information from children. If you believe we have collected information from a child, 
              please contact us immediately.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white mb-4">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant changes 
              via email or through the platform. Your continued use after changes constitutes acceptance of 
              the updated policy.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white mb-4">11. Contact Us</h2>
            <p>
              For questions about this Privacy Policy or to exercise your privacy rights, please contact us at:
            </p>
            <ul className="list-none space-y-2 ml-4">
              <li>Email: <Link href="/contact" className="text-emerald-400 hover:text-emerald-300">tradeclarity.help@gmail.com</Link></li>
              <li>Website: <Link href="/contact" className="text-emerald-400 hover:text-emerald-300">tradeclarity.xyz/contact</Link></li>
            </ul>
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

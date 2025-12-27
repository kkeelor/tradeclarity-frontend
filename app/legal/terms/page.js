// app/legal/terms/page.js
'use client'

import { ArrowLeft, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Footer from '../../components/Footer'

export default function TermsPage() {
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
            <FileText className="w-6 h-6 text-white/80" />
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-white/90">Terms and Conditions</h1>
        </div>

        <div className="prose prose-invert max-w-none space-y-8 text-white/70">
          <section className="space-y-4">
            <p className="text-white/60">
              These Terms and Conditions ("Terms") govern your use of TradeClarity ("Service", "Platform", "we", "us", "our"). 
              By accessing or using TradeClarity, you agree to be bound by these Terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white/90 mb-4">1. Acceptance of Terms</h2>
            <p>
              By creating an account, accessing, or using TradeClarity, you acknowledge that you have read, understood, 
              and agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, 
              you may not use the Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white/90 mb-4">2. Description of Service</h2>
            <p>
              TradeClarity is a trading analytics platform that provides insights into your trading patterns, 
              performance analysis, and behavioral insights. The Service allows you to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Connect your exchange accounts via API or upload CSV files</li>
              <li>Analyze your trading history and patterns</li>
              <li>Receive insights and recommendations</li>
              <li>Generate reports and analytics</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white/90 mb-4">3. User Accounts</h2>
            <h3 className="text-xl font-semibold text-white/90 mt-4 mb-3">3.1 Account Creation</h3>
            <p>To use TradeClarity, you must:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Be at least 18 years old</li>
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
            </ul>

            <h3 className="text-xl font-semibold text-white/90 mt-4 mb-3">3.2 Account Responsibility</h3>
            <p>
              You are responsible for all activities that occur under your account. You agree to keep your 
              login credentials secure and confidential.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white/90 mb-4">4. Subscription and Billing</h2>
            <h3 className="text-xl font-semibold text-white/90 mt-4 mb-3">4.1 Subscription Plans</h3>
            <p>
              TradeClarity offers free and paid subscription plans. Paid plans are billed on a monthly or annual basis. 
              Features and limits vary by plan tier.
            </p>

            <h3 className="text-xl font-semibold text-white/90 mt-4 mb-3">4.2 Payment</h3>
            <p>
              Payment is processed through Razorpay. You agree to provide valid payment information and authorize 
              us to charge your payment method for subscription fees.
            </p>

            <h3 className="text-xl font-semibold text-white/90 mt-4 mb-3">4.3 Auto-Renewal</h3>
            <p>
              Subscriptions automatically renew unless cancelled before the end of the billing period. 
              You can cancel anytime from your account settings.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white/90 mb-4">5. Use of Service</h2>
            <h3 className="text-xl font-semibold text-white/90 mt-4 mb-3">5.1 Permitted Use</h3>
            <p>You may use TradeClarity for lawful purposes only. You agree not to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Attempt to gain unauthorized access to the Service</li>
              <li>Use the Service to transmit malware or harmful code</li>
              <li>Reverse engineer or attempt to extract source code</li>
              <li>Resell or redistribute the Service without permission</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white/90 mb-4">6. Data and Privacy</h2>
            <p>
              Your use of TradeClarity is also governed by our Privacy Policy. We take data security seriously 
              and use industry-standard encryption and security measures. However, you acknowledge that:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>You are responsible for the accuracy of data you provide</li>
              <li>We process your data as described in our Privacy Policy</li>
              <li>You grant us permission to analyze your trading data to provide insights</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white/90 mb-4">7. Intellectual Property</h2>
            <p>
              TradeClarity, including its software, design, and content, is protected by copyright and other 
              intellectual property laws. You may not copy, modify, or distribute any part of the Service 
              without our written permission.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white/90 mb-4">8. Disclaimers</h2>
            <p>
              TradeClarity provides analytics and insights based on your trading data. We do not:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide financial advice or recommendations</li>
              <li>Guarantee trading profits or performance</li>
              <li>Make investment decisions on your behalf</li>
              <li>Take responsibility for your trading decisions</li>
            </ul>
            <p className="mt-4">
              The Service is provided "as is" without warranties of any kind. You use TradeClarity at your own risk.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white/90 mb-4">9. API Keys and Exchange Connections</h2>
            <h3 className="text-xl font-semibold text-white/90 mt-4 mb-3">9.1 API Key Permissions</h3>
            <p>
              When connecting your exchange account to TradeClarity, you are required to create API keys with 
                <strong className="text-white/90"> read-only permissions only</strong>. TradeClarity explicitly does not 
              request, require, or support API keys with trading, withdrawal, or transfer permissions.
            </p>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 mt-4 mb-4">
              <h4 className="font-semibold text-red-400 mb-2">⚠️ Critical Security Notice</h4>
              <p className="text-sm text-white/70">
                <strong>Do NOT enable trading, withdrawal, or transfer permissions</strong> when creating API keys 
                for TradeClarity. We only require read-only access to analyze your trading history. Enabling 
                trading permissions creates unnecessary security risks and is not supported by our platform.
              </p>
            </div>

            <h3 className="text-xl font-semibold text-white/90 mt-4 mb-3">9.2 API Key Security</h3>
            <p>You are solely responsible for:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Creating API keys with the correct permissions (read-only)</li>
              <li>Securing and protecting your API keys</li>
              <li>Maintaining the confidentiality of your API credentials</li>
              <li>Regularly reviewing and rotating your API keys</li>
              <li>Immediately revoking API keys if you suspect unauthorized access</li>
            </ul>

            <h3 className="text-xl font-semibold text-white/90 mt-4 mb-3">9.3 Indemnification for Unauthorized Trading</h3>
            <p>
                <strong className="text-white/90">YOU EXPRESSLY ACKNOWLEDGE AND AGREE THAT:</strong>
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                TradeClarity is designed and operates as a <strong className="text-white">read-only analytics platform</strong>. 
                We do not execute trades, initiate withdrawals, or perform any trading actions on your behalf.
              </li>
              <li>
                In the event of any security breach, unauthorized access, or compromise of your API keys or exchange account, 
                TradeClarity shall not be liable for any losses, damages, or unauthorized trades that may occur.
              </li>
              <li>
                If you inadvertently or intentionally create API keys with trading permissions enabled, you assume full 
                responsibility for any consequences, including but not limited to unauthorized trades, financial losses, 
                or account compromises.
              </li>
              <li>
                You agree to indemnify, defend, and hold harmless TradeClarity, its officers, directors, employees, 
                and affiliates from any claims, damages, losses, liabilities, costs, or expenses (including legal fees) 
                arising from:
                <ul className="list-disc list-inside space-y-2 ml-6 mt-2">
                  <li>Unauthorized trades executed in your exchange account</li>
                  <li>Compromise or breach of your API keys</li>
                  <li>Any losses resulting from the use of API keys with trading permissions enabled</li>
                  <li>Any security incident affecting your exchange account</li>
                </ul>
              </li>
            </ul>
            <p className="mt-4">
              TradeClarity stores your API keys using industry-standard encryption and security measures. However, 
              no system is completely secure, and you acknowledge that you use API keys at your own risk.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white/90 mb-4">10. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, TradeClarity shall not be liable for any indirect, 
              incidental, special, or consequential damages arising from your use of the Service, including 
              but not limited to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Loss of profits, trading opportunities, or financial losses</li>
              <li>Unauthorized trades or transactions in your exchange account</li>
              <li>API key breaches or security incidents</li>
              <li>Data loss or corruption</li>
              <li>Service interruptions or downtime</li>
            </ul>
            <p className="mt-4">
              Our total liability to you for any claims arising from or related to the Service shall not exceed 
              the amount you paid to TradeClarity in the twelve (12) months preceding the claim.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white/90 mb-4">11. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account if you violate these Terms. 
              You may terminate your account at any time by canceling your subscription and contacting support.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white/90 mb-4">11. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. We will notify you of significant changes via email 
              or through the Service. Continued use after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white/90 mb-4">12. Contact Information</h2>
            <p>
              For questions about these Terms, please contact us at{' '}
              <Link href="/contact" className="text-emerald-400 hover:text-emerald-300">tradeclarity.help@gmail.com</Link>
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

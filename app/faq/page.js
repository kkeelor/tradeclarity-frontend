// app/faq/page.js
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { Button } from '@/components/ui'
import { ArrowLeft, Search, HelpCircle } from 'lucide-react'
import Footer from '../components/Footer'
import { FAQPageSchema } from '@/app/components/StructuredData'

const faqs = [
  {
    question: 'How does TradeClarity analyze my trades?',
    answer: 'TradeClarity connects to your exchange via read-only API keys or analyzes CSV files you upload. We process your trade history to identify patterns, calculate performance metrics, analyze trading psychology, and detect behavioral patterns that might be costing you money. All analysis happens securely on our servers.',
  },
  {
    question: 'Is my trading data safe and secure?',
    answer: 'Yes, absolutely. TradeClarity uses read-only API keys, meaning we can only view your trades - we cannot execute trades or access your funds. All data is encrypted in transit and at rest. We use bank-level security practices and never share your data with third parties.',
  },
  {
    question: 'What exchanges does TradeClarity support?',
    answer: 'TradeClarity currently supports Binance and CoinDCX, with more exchanges coming soon. You can also upload CSV files from any exchange for analysis.',
  },
  {
    question: 'What is trading psychology analysis?',
    answer: 'Trading psychology analysis identifies behavioral patterns in your trading, such as holding losers longer than winners, revenge trading after losses, panic selling, or trading at specific times when your performance is worse. These insights help you understand your emotional trading patterns and make data-driven improvements.',
  },
  {
    question: 'How accurate is the pattern detection?',
    answer: 'Our pattern detection uses statistical analysis of your actual trade data. We identify statistically significant patterns, such as time-based performance differences, symbol-specific win rates, and behavioral trends. All insights are based on your real trading history, not assumptions.',
  },
  {
    question: 'Can I use TradeClarity for free?',
    answer: 'Yes! TradeClarity offers a free plan that includes 500 trades analyzed per month, 1 exchange connection, and full access to all analytics features. This is perfect for getting started and understanding your trading patterns.',
  },
  {
    question: 'What happens if I exceed my plan limits?',
    answer: 'We\'ll notify you when you\'re approaching your limits. You can upgrade to a higher plan at any time to continue analyzing trades. Your existing data and insights remain accessible.',
  },
  {
    question: 'How do I connect my exchange?',
    answer: 'Go to your dashboard and click "Connect Exchange". Select your exchange (Binance or CoinDCX), and follow the step-by-step guide to create read-only API keys. We provide detailed instructions for each exchange. The process takes about 2 minutes.',
  },
  {
    question: 'Can I analyze trades from multiple exchanges?',
    answer: 'Yes! Free plan includes 1 exchange connection, Trader plan includes 3, and Pro plan includes unlimited exchange connections. You can analyze trades from all connected exchanges together for a complete picture of your trading performance.',
  },
  {
    question: 'What file formats are supported for CSV upload?',
    answer: 'TradeClarity supports standard CSV formats from most exchanges. We automatically detect the format and map columns. If your exchange isn\'t directly supported, CSV upload is a great alternative. We provide templates and guides for common exchanges.',
  },
  {
    question: 'How often is my trade data updated?',
    answer: 'When connected via API, TradeClarity automatically syncs your trades daily. You can also manually trigger a sync anytime from your dashboard. CSV uploads are analyzed immediately upon upload.',
  },
  {
    question: 'What insights will I get from TradeClarity?',
    answer: 'You\'ll get comprehensive insights including: win rate analysis, profit/loss breakdowns, trading psychology scores, time-based performance patterns, symbol-specific performance, behavioral patterns (revenge trading, panic selling), fee analysis, and actionable recommendations.',
  },
  {
    question: 'Can I cancel my subscription anytime?',
    answer: 'Yes, you can cancel your subscription at any time from your billing settings. You\'ll continue to have access to all features until the end of your current billing period. After cancellation, you\'ll revert to the free plan.',
  },
  {
    question: 'Do you offer refunds?',
    answer: 'Yes, we offer a 7-day money-back guarantee for paid plans. If you\'re not satisfied, contact us within 7 days of your purchase for a full refund. See our cancellation and refunds policy for details.',
  },
  {
    question: 'Is TradeClarity suitable for beginners?',
    answer: 'Absolutely! TradeClarity is designed for traders of all levels. Beginners can use it to understand their trading patterns and learn from their mistakes. Advanced traders use it to fine-tune their strategies and identify edge cases.',
  },
  {
    question: 'Can I export my analytics data?',
    answer: 'Yes, you can export your trade data and analytics reports. This helps you keep backups and analyze data in other tools if needed.',
  },
  {
    question: 'What is the difference between Free, Trader, and Pro plans?',
    answer: 'Free plan: 500 trades/month, 1 exchange. Trader plan: 1,000 trades/month, 3 exchanges, everything else unlimited. Pro plan: Unlimited trades, unlimited exchanges, priority support, early access to features.',
  },
  {
    question: 'How do I know if TradeClarity is right for me?',
    answer: 'Try our free plan! It includes full analytics on 500 trades, so you can see exactly what insights TradeClarity provides. If you find value in understanding your trading patterns, upgrading gives you more capacity.',
  },
  {
    question: 'Does TradeClarity provide trading advice?',
    answer: 'No, TradeClarity is an analytics tool, not a trading advisor. We analyze your past trades to identify patterns and provide insights, but we don\'t provide buy/sell recommendations or trading signals.',
  },
  {
    question: 'Can I use TradeClarity for tax purposes?',
    answer: 'While TradeClarity provides comprehensive trade data and P&L calculations, you should consult with a tax professional for tax reporting. We provide exportable data that can be used with tax software.',
  },
]

export default function FAQPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredFAQs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <>
      <FAQPageSchema faqs={faqs} />
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        {/* Header */}
        <div className="border-b border-white/5 bg-slate-950/70 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.push('/')}
                className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </button>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/20 rounded-2xl mb-6">
              <HelpCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
              Everything you need to know about TradeClarity trading analytics
            </p>

            {/* Search */}
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* FAQ Accordion */}
          <div className="space-y-4 mb-12">
            {filteredFAQs.length > 0 ? (
              <Accordion type="single" collapsible className="w-full">
                {filteredFAQs.map((faq, idx) => (
                  <AccordionItem
                    key={idx}
                    value={`item-${idx}`}
                    className="border-white/5 rounded-xl bg-white/[0.03] px-6 mb-4"
                  >
                    <AccordionTrigger className="text-left font-semibold text-emerald-400 hover:no-underline py-4">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-slate-300 pb-4 leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-400 mb-4">No FAQs found matching your search.</p>
                <Button variant="outline" onClick={() => setSearchQuery('')}>
                  Clear Search
                </Button>
              </div>
            )}
          </div>

          {/* CTA Section */}
          <div className="text-center bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-3">Still have questions?</h2>
            <p className="text-slate-400 mb-6">
              Can't find what you're looking for? Get in touch with our support team.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="primary" onClick={() => router.push('/contact')}>
                Contact Support
              </Button>
              <Button variant="outline" onClick={() => router.push('/pricing')}>
                View Pricing
              </Button>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </>
  )
}

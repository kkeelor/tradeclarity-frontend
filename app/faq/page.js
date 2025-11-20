// app/faq/page.js
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { Button } from '@/components/ui'
import { ArrowLeft, Search, Brain, Shield, Database, CreditCard, Zap, HelpCircle, Sparkles, Eye, TrendingUp } from 'lucide-react'
import Footer from '../components/Footer'
import { FAQPageSchema } from '@/app/components/StructuredData'

const faqCategories = [
  {
    id: 'ai-analytics',
    name: 'AI & Analytics',
    icon: Brain,
    color: 'emerald',
    faqs: [
      {
        question: 'How does Vega analyze my trades?',
        answer: 'Vega connects to your exchange via read-only API keys or analyzes CSV files you upload. Advanced algorithms process thousands of trades to identify patterns, detect behavioral issues, and generate personalized insights. Vega uses machine learning to uncover hidden patterns in your trading data.',
      },
      {
        question: 'What AI-powered features does TradeClarity offer?',
        answer: 'Vega provides intelligent analytics including: psychology analysis to detect emotional trading patterns, pattern detection across time periods and symbols, personalized recommendations based on your trading data, behavioral insights that reveal when you make costly mistakes, and predictive analysis of your trading patterns.',
      },
      {
        question: 'How accurate is Vega\'s pattern detection?',
        answer: 'Vega uses statistical analysis and machine learning algorithms to identify statistically significant patterns in your actual trade data. The AI analyzes thousands of trades to find patterns such as time-based performance differences, symbol-specific win rates, and behavioral trends. All insights are based on your real trading history, not assumptions.',
      },
      {
        question: 'Can Vega predict future trades?',
        answer: 'No, Vega does not predict future trades or provide trading signals. Vega analyzes your past trading behavior to identify patterns and provide insights that help you understand your trading psychology and make better decisions. It\'s an analytics tool, not a trading advisor.',
      },
      {
        question: 'How does Vega detect trading psychology issues?',
        answer: 'Vega analyzes patterns like holding losers longer than winners, revenge trading after losses, panic selling, trading at specific times when performance is worse, position sizing changes after losses, and emotional decision-making patterns. The AI identifies these behaviors statistically across your entire trading history.',
      },
      {
        question: 'What makes Vega different from other analytics tools?',
        answer: 'Vega uses advanced AI to provide personalized insights based on YOUR trading data, not generic advice. It detects behavioral patterns invisible to human analysis, provides specific actionable recommendations, and learns from your trading patterns to give increasingly relevant insights over time.',
      },
      {
        question: 'What AI model does Vega use?',
        answer: 'Pro plan users get access to Claude Sonnet 4.5, Anthropic\'s most advanced model for complex analysis and reasoning. Free and Trader plans use Claude 3.5 Haiku, which is faster and optimized for quick insights. Sonnet 4.5 provides deeper analysis, better pattern recognition, and more nuanced understanding of trading psychology.',
      },
    ]
  },
  {
    id: 'security',
    name: 'Security & Privacy',
    icon: Shield,
    color: 'cyan',
    faqs: [
      {
        question: 'Is my trading data safe with Vega?',
        answer: 'Yes, absolutely. We use read-only API keys, meaning Vega can only analyze your trades - we cannot execute trades or access your funds. All data is encrypted in transit and at rest. We use bank-level security practices and never share your data with third parties.',
      },
      {
        question: 'What permissions does Vega need?',
        answer: 'Vega only requires read-only API keys. We explicitly do not request, require, or support API keys with trading, withdrawal, or transfer permissions. This ensures your funds remain completely secure.',
      },
      {
        question: 'How is my data stored and processed?',
        answer: 'Your trading data is encrypted using industry-standard encryption both in transit (HTTPS) and at rest. Data is stored securely on our servers and processed by Vega\'s AI algorithms to generate insights. We never share your data with third parties.',
      },
      {
        question: 'Can I delete my data?',
        answer: 'Yes, you can delete your account and all associated data at any time from your account settings. This will permanently remove your trading data, analytics, and account information from our systems.',
      },
    ]
  },
  {
    id: 'getting-started',
    name: 'Getting Started',
    icon: Zap,
    color: 'purple',
    faqs: [
      {
        question: 'How do I connect my exchange?',
        answer: 'Go to your dashboard and click "Connect Exchange". Select your exchange (Binance or CoinDCX), and follow the step-by-step guide to create read-only API keys. We provide detailed instructions for each exchange. The process takes about 2 minutes.',
      },
      {
        question: 'Can I use TradeClarity for free?',
        answer: 'Yes! Our free plan includes 500 trades analyzed by Vega per month, 1 exchange connection, and full access to all analytics features. Perfect for getting started and understanding your trading patterns.',
      },
      {
        question: 'What exchanges are supported?',
        answer: 'TradeClarity currently supports Binance and CoinDCX, with more exchanges coming soon. You can also upload CSV files from any exchange for Vega to analyze.',
      },
      {
        question: 'Can I analyze trades from multiple exchanges?',
        answer: 'Yes! Free plan includes 1 exchange connection, Trader plan includes 3, and Pro plan includes unlimited exchange connections. You can analyze trades from all connected exchanges together for a complete picture of your trading performance.',
      },
      {
        question: 'What file formats are supported for CSV upload?',
        answer: 'TradeClarity supports standard CSV formats from most exchanges. Vega automatically detects the format and maps columns. If your exchange isn\'t directly supported, CSV upload is a great alternative. We provide templates and guides for common exchanges.',
      },
    ]
  },
  {
    id: 'features',
    name: 'Features & Plans',
    icon: Sparkles,
    color: 'orange',
    faqs: [
      {
        question: 'What insights will I get from Vega?',
        answer: 'You\'ll get comprehensive insights including: win rate analysis, profit/loss breakdowns, trading psychology scores, time-based performance patterns, symbol-specific performance, behavioral patterns (revenge trading, panic selling), fee analysis, and actionable recommendations tailored to your trading style.',
      },
      {
        question: 'What is the difference between Free, Trader, and Pro plans?',
        answer: 'Free plan: 500 trades/month analyzed by Vega using Claude 3.5 Haiku, 1 exchange connection. Trader plan: 1,000 trades/month analyzed by Vega using Claude 3.5 Haiku, 3 exchanges, everything else unlimited. Pro plan: Unlimited trades analyzed by Vega using Claude Sonnet 4.5 (Anthropic\'s most advanced model), unlimited exchanges, priority support, early access to new AI features.',
      },
      {
        question: 'What happens if I exceed my plan limits?',
        answer: 'We\'ll notify you when you\'re approaching your limits. You can upgrade to a higher plan at any time to continue analyzing trades with Vega. Your existing data and insights remain accessible.',
      },
      {
        question: 'How often is my trade data updated?',
        answer: 'When connected via API, Vega automatically syncs your trades daily. You can also manually trigger a sync anytime from your dashboard. CSV uploads are analyzed immediately upon upload.',
      },
      {
        question: 'Can I export my analytics data?',
        answer: 'Yes, you can export your trade data and analytics reports. This helps you keep backups and analyze data in other tools if needed.',
      },
    ]
  },
  {
    id: 'billing',
    name: 'Billing & Subscriptions',
    icon: CreditCard,
    color: 'pink',
    faqs: [
      {
        question: 'Can I cancel my subscription anytime?',
        answer: 'Yes, you can cancel your subscription at any time from your billing settings. You\'ll continue to have access to all features until the end of your current billing period. After cancellation, you\'ll revert to the free plan.',
      },
      {
        question: 'Do you offer refunds?',
        answer: 'Yes, we offer a 7-day money-back guarantee for paid plans. If you\'re not satisfied, contact us within 7 days of your purchase for a full refund. See our cancellation and refunds policy for details.',
      },
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept credit cards, debit cards, and UPI payments through Razorpay. All payments are processed securely and encrypted.',
      },
      {
        question: 'How does billing work?',
        answer: 'Subscriptions are billed monthly or annually depending on your plan. Billing occurs automatically at the start of each billing period. You can view your billing history and manage your subscription from your billing dashboard.',
      },
    ]
  },
  {
    id: 'general',
    name: 'General',
    icon: HelpCircle,
    color: 'slate',
    faqs: [
      {
        question: 'Is TradeClarity suitable for beginners?',
        answer: 'Absolutely! TradeClarity is designed for traders of all levels. Beginners can use Vega to understand their trading patterns and learn from their mistakes. Advanced traders use it to fine-tune their strategies and identify edge cases.',
      },
      {
        question: 'Does Vega provide trading advice?',
        answer: 'No, Vega is an analytics tool, not a trading advisor. Vega analyzes your past trades to identify patterns and provide insights, but we don\'t provide buy/sell recommendations or trading signals.',
      },
      {
        question: 'Can I use TradeClarity for tax purposes?',
        answer: 'While TradeClarity provides comprehensive trade data and P&L calculations, you should consult with a tax professional for tax reporting. We provide exportable data that can be used with tax software.',
      },
      {
        question: 'How do I know if TradeClarity is right for me?',
        answer: 'Try our free plan! It includes full analytics on 500 trades analyzed by Vega, so you can see exactly what insights TradeClarity provides. If you find value in understanding your trading patterns, upgrading gives you more capacity.',
      },
    ]
  },
]

export default function FAQPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)

  const allFAQs = faqCategories.flatMap(category => 
    category.faqs.map(faq => ({ ...faq, category: category.name }))
  )

  const filteredFAQs = selectedCategory
    ? faqCategories.find(cat => cat.id === selectedCategory)?.faqs.filter(
        (faq) =>
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      ) || []
    : allFAQs.filter(
        (faq) =>
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )

  const getCategoryColor = (color) => {
    const colors = {
      emerald: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
      cyan: 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400',
      purple: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
      orange: 'bg-orange-500/20 border-orange-500/30 text-orange-400',
      pink: 'bg-pink-500/20 border-pink-500/30 text-pink-400',
      slate: 'bg-white/5 border-white/10 text-white/70',
    }
    return colors[color] || colors.slate
  }

  return (
    <>
      <FAQPageSchema faqs={allFAQs} />
      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <div className="border-b border-white/10 bg-black/80 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.push('/')}
                className="text-sm text-white/60 hover:text-white/90 transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </button>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/5 border border-white/10 rounded-xl mb-6">
              <HelpCircle className="w-10 h-10 text-white/80" />
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold mb-4 text-white/90">
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-white/60 max-w-2xl mx-auto mb-8">
              Everything you need to know about TradeClarity and Vega
            </p>

            {/* Search */}
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                placeholder="Search FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-black border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20"
              />
            </div>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === null
                  ? 'bg-white/10 border border-white/20 text-white/90'
                  : 'bg-black border border-white/10 text-white/60 hover:bg-white/5 hover:text-white/80'
              }`}
            >
              All Categories
            </button>
            {faqCategories.map((category) => {
              const Icon = category.icon
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    selectedCategory === category.id
                      ? 'bg-white/10 border border-white/20 text-white/90'
                      : 'bg-black border border-white/10 text-white/60 hover:bg-white/5 hover:text-white/80'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {category.name}
                </button>
              )
            })}
          </div>

          {/* FAQ Sections */}
          {selectedCategory ? (
            // Single category view
            <div className="space-y-6 mb-12">
              {(() => {
                const category = faqCategories.find(cat => cat.id === selectedCategory)
                if (!category) return null
                const Icon = category.icon
                return (
                  <div key={category.id} className="mb-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`w-14 h-14 rounded-xl border flex items-center justify-center ${getCategoryColor(category.color)}`}>
                        <Icon className="w-7 h-7" />
                      </div>
                      <h2 className="text-2xl font-semibold text-white/90">{category.name}</h2>
                    </div>
                    <Accordion type="single" collapsible className="w-full space-y-3">
                      {filteredFAQs.map((faq, idx) => (
                        <AccordionItem
                          key={idx}
                          value={`item-${idx}`}
                          className="border border-white/10 rounded-xl bg-black px-6"
                        >
                          <AccordionTrigger className="text-left font-medium text-white/80 hover:no-underline py-4">
                            {faq.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-sm text-white/60 pb-4 leading-relaxed">
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                )
              })()}
            </div>
          ) : (
            // All categories view
            <div className="space-y-12 mb-12">
              {faqCategories.map((category) => {
                const Icon = category.icon
                const categoryFAQs = searchQuery
                  ? category.faqs.filter(
                      (faq) =>
                        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                  : category.faqs

                if (categoryFAQs.length === 0) return null

                return (
                  <div key={category.id} className="mb-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`w-14 h-14 rounded-xl border flex items-center justify-center ${getCategoryColor(category.color)}`}>
                        <Icon className="w-7 h-7" />
                      </div>
                      <h2 className="text-2xl font-semibold text-white/90">{category.name}</h2>
                    </div>
                    <Accordion type="single" collapsible className="w-full space-y-3">
                      {categoryFAQs.map((faq, idx) => (
                        <AccordionItem
                          key={idx}
                          value={`${category.id}-${idx}`}
                          className="border border-white/10 rounded-xl bg-black px-6"
                        >
                          <AccordionTrigger className="text-left font-medium text-white/80 hover:no-underline py-4">
                            {faq.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-sm text-white/60 pb-4 leading-relaxed">
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                )
              })}
            </div>
          )}

          {/* No Results */}
          {filteredFAQs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-white/60 mb-4">No FAQs found matching your search.</p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory(null)
                }}
                className="bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
              >
                Clear Search
              </Button>
            </div>
          )}

          {/* CTA Section */}
          <div className="text-center bg-black border border-white/10 rounded-xl p-8">
            <h2 className="text-2xl font-semibold mb-3 text-white/90">Still have questions?</h2>
            <p className="text-white/60 mb-6">
              Can't find what you're looking for? Get in touch with our support team.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                variant="primary" 
                onClick={() => router.push('/contact')}
                className="bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20"
              >
                Contact Support
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/pricing')}
                className="bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
              >
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

// lib/data/faqs.js
/**
 * FAQ Data for TradeClarity Platform
 * Shared between FAQ page and Vega AI system prompt
 */

export const faqCategories = [
  {
    id: 'getting-started',
    name: 'Getting Started',
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
    id: 'ai-analytics',
    name: 'AI & Analytics',
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
        question: 'What AI model does Vega use?',
        answer: 'Pro plan users get access to Claude Sonnet 4.5, Anthropic\'s most advanced model for complex analysis and reasoning. Free and Trader plans use Claude 3.5 Haiku, which is faster and optimized for quick insights. Sonnet 4.5 provides deeper analysis, better pattern recognition, and more nuanced understanding of trading psychology.',
      },
    ]
  },
  {
    id: 'security',
    name: 'Security & Privacy',
    faqs: [
      {
        question: 'Is my trading data safe with Vega?',
        answer: 'Yes, absolutely. We use read-only API keys, meaning Vega can only analyze your trades - we cannot execute trades or access your funds. All data is encrypted in transit and at rest. We use bank-level security practices and never share your data with third parties.',
      },
      {
        question: 'What permissions does Vega need?',
        answer: 'Vega only requires read-only API keys. We explicitly do not request, require, or support API keys with trading, withdrawal, or transfer permissions. This ensures your funds remain completely secure.',
      },
    ]
  },
  {
    id: 'features',
    name: 'Features & Plans',
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
        question: 'How often is my trade data updated?',
        answer: 'When connected via API, Vega automatically syncs your trades daily. You can also manually trigger a sync anytime from your dashboard. CSV uploads are analyzed immediately upon upload.',
      },
    ]
  },
  {
    id: 'general',
    name: 'General',
    faqs: [
      {
        question: 'Is TradeClarity suitable for beginners?',
        answer: 'Absolutely! TradeClarity is designed for traders of all levels. Beginners can use Vega to understand their trading patterns and learn from their mistakes. Advanced traders use it to fine-tune their strategies and identify edge cases.',
      },
      {
        question: 'Does Vega provide trading advice?',
        answer: 'No, Vega is an analytics tool, not a trading advisor. Vega analyzes your past trades to identify patterns and provide insights, but we don\'t provide buy/sell recommendations or trading signals.',
      },
    ]
  },
]

/**
 * Get all FAQs flattened into a single array
 */
export function getAllFAQs() {
  return faqCategories.flatMap(category => 
    category.faqs.map(faq => ({ ...faq, category: category.name }))
  )
}

// app/faq/layout.js
// SEO metadata for FAQ page

export const metadata = {
  title: 'FAQ - Trading Analytics Questions & Answers',
  description: 'Frequently asked questions about TradeClarity trading analytics. Learn about security, features, pricing, exchange connections, and how to analyze your crypto trades.',
  keywords: [
    'trading analytics FAQ',
    'crypto trade analyzer questions',
    'trading analysis software help',
    'trade performance analyzer FAQ',
    'trading psychology tool questions',
  ],
  openGraph: {
    title: 'FAQ - Trading Analytics Questions & Answers | TradeClarity',
    description: 'Frequently asked questions about TradeClarity trading analytics. Learn about security, features, pricing, and more.',
    url: 'https://tradeclarity.xyz/faq',
  },
  twitter: {
    title: 'FAQ - Trading Analytics Questions & Answers',
    description: 'Frequently asked questions about TradeClarity trading analytics.',
  },
  alternates: {
    canonical: 'https://tradeclarity.xyz/faq',
  },
}

export default function FAQLayout({ children }) {
  return children
}

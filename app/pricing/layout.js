// app/pricing/layout.js
// SEO metadata for pricing page

export const metadata = {
  title: 'Trading Analytics Pricing - Plans Starting at $0',
  description: 'Transparent pricing for crypto trading analytics. Free plan available. Analyze unlimited trades from $29/month. Connect multiple exchanges. Start free.',
  keywords: [
    'trading analytics pricing',
    'crypto trade analyzer cost',
    'trading analysis software price',
    'trade performance analyzer pricing',
    'trading psychology tool cost',
  ],
  openGraph: {
    title: 'Trading Analytics Pricing - Plans Starting at $0 | TradeClarity',
    description: 'Transparent pricing for crypto trading analytics. Free plan available. Analyze unlimited trades from $29/month.',
    url: 'https://tradeclarity.xyz/pricing',
  },
  twitter: {
    title: 'Trading Analytics Pricing - Plans Starting at $0',
    description: 'Transparent pricing for crypto trading analytics. Free plan available.',
  },
  alternates: {
    canonical: 'https://tradeclarity.xyz/pricing',
  },
}

export default function PricingLayout({ children }) {
  return children
}

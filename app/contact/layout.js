// app/contact/layout.js
// SEO metadata for contact page

export const metadata = {
  title: 'Contact Us - Trading Analytics Support',
  description: 'Get in touch with TradeClarity support. We help with account setup, API connections, technical issues, and trading analytics questions. Response within 24 hours.',
  keywords: [
    'trading analytics support',
    'crypto trade analyzer help',
    'trading analysis software contact',
    'trade performance analyzer support',
  ],
  openGraph: {
    title: 'Contact Us - Trading Analytics Support | TradeClarity',
    description: 'Get in touch with TradeClarity support. We help with account setup, API connections, and trading analytics questions.',
    url: 'https://tradeclarity.xyz/contact',
  },
  twitter: {
    title: 'Contact Us - Trading Analytics Support',
    description: 'Get in touch with TradeClarity support.',
  },
  alternates: {
    canonical: 'https://tradeclarity.xyz/contact',
  },
}

export default function ContactLayout({ children }) {
  return children
}

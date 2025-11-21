// app/layout.js
import './globals.css'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { AuthProvider } from '@/lib/AuthContext'
import { Toaster } from 'sonner'
import { Analytics } from '@vercel/analytics/react'
import { OrganizationSchema, SoftwareApplicationSchema, WebSiteSchema } from './components/StructuredData'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
})

export const metadata = {
  metadataBase: new URL('https://tradeclarity.xyz'),
  title: {
    default: 'TradeClarity - Crypto Trading Analytics & Psychology Analysis Tool',
    template: '%s | TradeClarity',
  },
  description: 'Discover hidden patterns in your crypto trades. Analyze trading psychology, detect mistakes, and improve performance. Connect Binance, CoinDCX & more. Free trial.',
  keywords: [
    'trading analytics',
    'crypto trading analysis',
    'trading psychology analysis',
    'trade performance analyzer',
    'trading pattern detection',
    'crypto trade analyzer',
    'binance trade analyzer',
    'trading blind spots',
    'behavioral trading analysis',
    'trading mistakes detector',
  ],
  authors: [{ name: 'TradeClarity' }],
  creator: 'TradeClarity',
  publisher: 'TradeClarity',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://tradeclarity.xyz',
    siteName: 'TradeClarity',
    title: 'TradeClarity - Crypto Trading Analytics & Psychology Analysis Tool',
    description: 'Discover hidden patterns in your crypto trades. Analyze trading psychology, detect mistakes, and improve performance. Connect Binance, CoinDCX & more.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TradeClarity - Trading Analytics Dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TradeClarity - Crypto Trading Analytics & Psychology Analysis Tool',
    description: 'Discover hidden patterns in your crypto trades. Analyze trading psychology, detect mistakes, and improve performance.',
    creator: '@trdclrty',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://tradeclarity.xyz',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={plusJakartaSans.variable}>
      <body className="font-sans">
        <OrganizationSchema />
        <SoftwareApplicationSchema />
        <WebSiteSchema />
        <AuthProvider>
          {children}
          <Toaster
            theme="dark"
            position="top-right"
            richColors
            closeButton
            duration={5000}
          />
          <Analytics />
        </AuthProvider>
      </body>
    </html>
  )
}
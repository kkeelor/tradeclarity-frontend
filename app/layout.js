// app/layout.js
import './globals.css'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { AuthProvider } from '@/lib/AuthContext'
import { Toaster } from 'sonner'
import { Analytics } from '@vercel/analytics/react'
import Script from 'next/script'
import { OrganizationSchema, SoftwareApplicationSchema, WebSiteSchema } from './components/StructuredData'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'], // Reduced from 6 weights to 4 - saves ~30-40KB
  preload: true,
})

export const metadata = {
  metadataBase: new URL('https://www.tradeclarity.xyz'),
  title: {
    default: 'TradeClarity - AI-Powered Trading Analytics & Coaching Platform',
    template: '%s | TradeClarity',
  },
  description: 'AI-powered trading analytics and coaching app. Discover hidden patterns in your trades, analyze trading psychology, detect mistakes, and improve performance with personalized AI coaching.',
  keywords: [
    'AI trading analytics',
    'trading analytics',
    'trading coach app',
    'AI trading coach',
    'trading psychology analysis',
    'trade performance analyzer',
    'trading pattern detection',
    'trade analyzer',
    'trading blind spots',
    'behavioral trading analysis',
    'trading mistakes detector',
    'automated trading analysis',
  ],
  authors: [{ name: 'K Keelor' }],
  creator: 'K Keelor',
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
    icon: [
      { url: '/logo.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://www.tradeclarity.xyz',
    siteName: 'TradeClarity',
    title: 'TradeClarity - AI-Powered Trading Analytics & Coaching Platform',
    description: 'AI-powered trading analytics and coaching app. Discover hidden patterns in your trades, analyze trading psychology, detect mistakes, and improve performance with personalized AI coaching.',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'TradeClarity - AI Trading Analytics & Coaching',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TradeClarity - AI-Powered Trading Analytics & Coaching Platform',
    description: 'AI-powered trading analytics and coaching app. Discover hidden patterns in your trades, analyze trading psychology, detect mistakes, and improve performance with personalized AI coaching.',
    creator: '@trdclrty',
    images: ['/logo.png'],
  },
  alternates: {
    canonical: 'https://www.tradeclarity.xyz',
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
      <head>
        {/* OPTIMIZATION: Preconnect hints for faster external resource loading */}
        {/* Supabase API - critical for auth and data */}
        <link rel="preconnect" href="https://supabase.co" />
        <link rel="dns-prefetch" href="https://supabase.co" />
        {/* Anthropic API - for AI chat */}
        <link rel="preconnect" href="https://api.anthropic.com" />
        <link rel="dns-prefetch" href="https://api.anthropic.com" />
        {/* Google Fonts - already preconnected by Next.js, but add dns-prefetch */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
      </head>
      <body className="font-sans">
        {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-11532080045"
          strategy="afterInteractive"
        />
        <Script id="google-ads" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-11532080045');
          `}
        </Script>
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
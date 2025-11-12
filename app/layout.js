// app/layout.js
import './globals.css'
import { AuthProvider } from '@/lib/AuthContext'
import { Toaster } from 'sonner'
import { Analytics } from '@vercel/analytics/react'

export const metadata = {
  title: 'TradeClarity - Your Trading Analytics',
  description: 'Your trading blind spots, finally revealed',
  keywords: 'trading analytics, crypto trading, trading psychology, behavioral analysis, trading patterns',
  authors: [{ name: 'TradeClarity' }],
  charset: 'UTF-8',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'TradeClarity - Your Trading Analytics',
    description: 'Your trading blind spots, finally revealed',
    url: 'https://tradeclarity.xyz',
    siteName: 'TradeClarity',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TradeClarity - Your Trading Analytics',
    description: 'Your trading blind spots, finally revealed',
    creator: '@trdclrty',
    images: ['/og-image.png'],
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
    <html lang="en" suppressHydrationWarning>
      <body>
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
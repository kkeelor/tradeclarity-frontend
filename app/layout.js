// app/layout.js
import './globals.css'
import { ThemeProvider } from './components/ThemeProvider'
import { AuthProvider } from '@/lib/AuthContext'
import { Toaster } from 'sonner'

export const metadata = {
  title: 'TradeClarity - Your Trading Analytics',
  description: 'Your trading blind spots, finally revealed',
  keywords: 'trading analytics, crypto trading, trading psychology, behavioral analysis, trading patterns',
  authors: [{ name: 'TradeClarity' }],
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

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme') || 'dark';
                document.documentElement.classList.toggle('light', theme === 'light');
              })();
            `,
          }}
        />
      </head>
      <body>
        <AuthProvider>
          <ThemeProvider>
            {children}
            <Toaster
              theme="dark"
              position="top-right"
              richColors
              closeButton
              duration={5000}
            />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
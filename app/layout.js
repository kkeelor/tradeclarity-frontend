// app/layout.js
import './globals.css'
import { ThemeProvider } from './components/ThemeProvider'
import { AuthProvider } from '@/lib/AuthContext'

export const metadata = {
  title: 'TradeClarity - Your Trading Analytics',
  description: 'Powerful trading analytics for Binance traders',
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
          <ThemeProvider>{children}</ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
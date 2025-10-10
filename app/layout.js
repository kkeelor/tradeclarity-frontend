import './globals.css'

export const metadata = {
  title: 'TradeClarity - Your Trading Analytics',
  description: 'Powerful trading analytics for Binance traders',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
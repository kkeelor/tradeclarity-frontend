import './globals.css'

export const metadata = {
  title: 'TradeClarity - Your Trading Analytics',
  description: 'Discover your hidden patterns',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
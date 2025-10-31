import Image from 'next/image'

const EXCHANGE_LOGOS = {
  binance: '/exchanges/binance.svg',
  coindcx: '/exchanges/coindcx.svg',
}

const FALLBACK_ICON = '/exchanges/fallback.svg'

/**
 * ExchangeIcon - Displays exchange logo with fallback support
 *
 * @param {string} exchange - Exchange name (e.g., 'binance', 'coindcx')
 * @param {number} size - Icon size in pixels (default: 20)
 * @param {string} className - Additional CSS classes
 */
export default function ExchangeIcon({ exchange, size = 20, className = '' }) {
  const exchangeLower = exchange?.toLowerCase()
  const logoPath = EXCHANGE_LOGOS[exchangeLower] || FALLBACK_ICON

  return (
    <Image
      src={logoPath}
      alt={`${exchange} logo`}
      width={size}
      height={size}
      className={`inline-block ${className}`}
      onError={(e) => {
        // Fallback to generic icon if exchange logo fails to load
        e.target.src = FALLBACK_ICON
      }}
    />
  )
}

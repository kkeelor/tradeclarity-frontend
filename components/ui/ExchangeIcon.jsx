import Image from 'next/image'

const EXCHANGE_LOGOS = {
  binance: '/exchanges/binance.svg',
  coindcx: '/exchanges/coindcx.png',
}

const FALLBACK_ICON = '/exchanges/fallback.svg'

/**
 * ExchangeIcon - Displays exchange logo with fallback support and appropriate background
 *
 * @param {string} exchange - Exchange name (e.g., 'binance', 'coindcx')
 * @param {number} size - Icon size in pixels (default: 20)
 * @param {string} className - Additional CSS classes
 * @param {boolean} withBackground - Whether to show background container (default: true)
 */
export default function ExchangeIcon({ exchange, size = 20, className = '', withBackground = true }) {
  const exchangeLower = exchange?.toLowerCase()
  const logoPath = EXCHANGE_LOGOS[exchangeLower] || FALLBACK_ICON

  // CoinDCX needs white background, others get grey
  const bgClass = exchangeLower === 'coindcx' ? 'bg-white' : 'bg-slate-700/50'

  const icon = (
    <Image
      src={logoPath}
      alt={`${exchange} logo`}
      width={size}
      height={size}
      className="inline-block"
      onError={(e) => {
        // Fallback to generic icon if exchange logo fails to load
        e.target.src = FALLBACK_ICON
      }}
    />
  )

  if (!withBackground) {
    return <div className={className}>{icon}</div>
  }

  return (
    <div className={`rounded-lg flex items-center justify-center ${bgClass} ${className}`}>
      {icon}
    </div>
  )
}

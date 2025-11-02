// app/api/currency-rate/route.js
import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

// Cache for exchange rates (server-side)
let ratesCache = null
let cacheTimestamp = null
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes

/**
 * Fallback exchange rates (used when external API fails)
 */
const FALLBACK_RATES = {
  'USD': 1.0,
  'INR': 87.0,
  'EUR': 0.92,
  'GBP': 0.79,
  'JPY': 149.5,
  'AUD': 1.52,
  'CAD': 1.36,
  'CNY': 7.24,
  'SGD': 1.34,
  'CHF': 0.88
}

/**
 * Fetch currency rates from external backend
 * Falls back to free API if backend unavailable
 */
async function fetchCurrencyRates() {
  const now = Date.now()

  // Return cached rates if available and not expired
  if (ratesCache && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
    console.log('💱 Using cached currency rates')
    return ratesCache
  }

  // Try to fetch from external backend first
  try {
    console.log('💱 Fetching currency rates from backend:', `${BACKEND_URL}/api/currency-rate`)
    const response = await fetch(`${BACKEND_URL}/api/currency-rate`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(5000)
    })

    if (response.ok) {
      const data = await response.json()
      if (data.success && data.rates) {
        ratesCache = data.rates
        cacheTimestamp = now
        console.log('✅ Currency rates fetched from backend:', Object.keys(data.rates).length, 'currencies')
        return data.rates
      }
    }
  } catch (error) {
    console.warn('⚠️ Backend unavailable, trying free API:', error.message)
  }

  // Fallback: Try fetching from a free currency API
  try {
    // Using exchangerate-api.com (free tier: 1500 requests/month, no API key needed)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)

    if (response.ok) {
      const data = await response.json()
      if (data.rates) {
        // Convert from base USD to our format
        const rates = {
          'USD': 1.0,
          'INR': data.rates.INR || FALLBACK_RATES.INR,
          'EUR': data.rates.EUR || FALLBACK_RATES.EUR,
          'GBP': data.rates.GBP || FALLBACK_RATES.GBP,
          'JPY': data.rates.JPY || FALLBACK_RATES.JPY,
          'AUD': data.rates.AUD || FALLBACK_RATES.AUD,
          'CAD': data.rates.CAD || FALLBACK_RATES.CAD,
          'CNY': data.rates.CNY || FALLBACK_RATES.CNY,
          'SGD': data.rates.SGD || FALLBACK_RATES.SGD,
          'CHF': data.rates.CHF || FALLBACK_RATES.CHF
        }

        ratesCache = rates
        cacheTimestamp = now
        console.log('✅ Currency rates fetched from free API:', Object.keys(rates).length, 'currencies')
        return rates
      }
    }
  } catch (error) {
    console.warn('⚠️ Free API unavailable:', error.message)
  }

  // Final fallback: return static rates
  console.log('⚠️ Using fallback currency rates')
  ratesCache = FALLBACK_RATES
  cacheTimestamp = now
  return FALLBACK_RATES
}

/**
 * GET /api/currency-rate
 * Returns current exchange rates with USD as base currency
 */
export async function GET(request) {
  try {
    const rates = await fetchCurrencyRates()

    return NextResponse.json({
      success: true,
      rates,
      timestamp: cacheTimestamp,
      cached: ratesCache === rates
    })
  } catch (error) {
    console.error('❌ Error fetching currency rates:', error.message)

    // Return fallback rates even on error
    return NextResponse.json({
      success: true,
      rates: FALLBACK_RATES,
      timestamp: Date.now(),
      cached: false,
      fallback: true
    })
  }
}

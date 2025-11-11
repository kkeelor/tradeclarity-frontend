// app/api/currency-rate/route.js
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

// Cache for exchange rates (server-side)
let ratesCache = null
let cacheTimestamp = null
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes

/**
 * Helper function to get today's date as YYYY-MM-DD string
 * @returns {string} Date string in YYYY-MM-DD format
 */
function getTodayDateString() {
  const today = new Date()
  const year = today.getUTCFullYear()
  const month = String(today.getUTCMonth() + 1).padStart(2, '0')
  const day = String(today.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Static fallback exchange rates (last resort when all else fails)
 */
const STATIC_FALLBACK_RATES = {
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
 * Required currencies that must be present
 */
const REQUIRED_CURRENCIES = ['USD', 'INR', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CNY', 'SGD', 'CHF']

/**
 * Filter rates object to only include the 10 required currencies
 * @param {Object} rates - Rates object (may contain many currencies)
 * @returns {Object} Filtered rates object with only required currencies
 */
function filterToRequiredCurrencies(rates) {
  if (!rates || typeof rates !== 'object') {
    return {}
  }
  
  const filtered = {}
  for (const currency of REQUIRED_CURRENCIES) {
    if (rates[currency] !== undefined && rates[currency] !== null) {
      filtered[currency] = rates[currency]
    }
  }
  
  // Always ensure USD is 1.0
  filtered.USD = 1.0
  
  return filtered
}

/**
 * Fetch rates from database (latest available, any age)
 * Only returns the 10 required currencies
 */
async function fetchRatesFromDatabase() {
  try {
    const supabase = createAdminClient()
    
    // Get latest rates for each currency (could be from any date)
    // Filter to only required currencies in the query
    const { data, error } = await supabase
      .from('currency_exchange_rates')
      .select('currency_code, rate, rate_date')
      .in('currency_code', REQUIRED_CURRENCIES)
      .order('rate_date', { ascending: false })
    
    if (error) {
      console.error('❌ Error fetching rates from DB:', error.message)
      return null
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️ No rates found in database')
      return null
    }
    
    // Group by currency and take the latest for each
    const ratesMap = {}
    const rateDates = {}
    
    for (const row of data) {
      // Only process required currencies
      if (REQUIRED_CURRENCIES.includes(row.currency_code) && !ratesMap[row.currency_code]) {
        ratesMap[row.currency_code] = parseFloat(row.rate)
        rateDates[row.currency_code] = row.rate_date
      }
    }
    
    // Ensure USD is always 1.0
    ratesMap['USD'] = 1.0
    
    // Filter to only required currencies (in case any extras got through)
    const filteredRates = filterToRequiredCurrencies(ratesMap)
    
    // Calculate age of oldest rate used
    const oldestDate = Math.min(...Object.values(rateDates).map(d => new Date(d).getTime()))
    const ageDays = Math.floor((Date.now() - oldestDate) / (1000 * 60 * 60 * 24))
    
    console.log(`✅ Fetched ${Object.keys(filteredRates).length} currency rates from DB (age: ${ageDays} days)`)
    
    return {
      rates: filteredRates,
      ageDays,
      source: 'database'
    }
  } catch (error) {
    console.error('❌ Exception fetching rates from DB:', error.message)
    return null
  }
}

/**
 * Fetch currency rates with fallback chain:
 * 1. Free API (exchangerate-api.com) - Live rates, no DB save
 * 2. Database (latest rates, any age) - Saved by cron job
 * 3. Static fallback rates
 * 
 * Frontend does NOT save to DB - only cron job saves
 */
async function fetchCurrencyRates() {
  const now = Date.now()

  // Return cached rates if available and not expired
  if (ratesCache && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
    console.log('💱 Using cached currency rates')
    return {
      rates: ratesCache.rates || ratesCache,
      source: ratesCache.source || 'cache',
      ageDays: ratesCache.ageDays || 0
    }
  }

  // Step 1: Try free currency API (live rates, no DB save)
  try {
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
        // Filter to only required currencies before using
        const filteredRates = filterToRequiredCurrencies(data.rates)
        
        // Verify we have all required currencies
        if (Object.keys(filteredRates).length === REQUIRED_CURRENCIES.length) {
          ratesCache = { rates: filteredRates, source: 'free-api', ageDays: 0 }
          cacheTimestamp = now
          console.log(`✅ Currency rates fetched from free API: ${Object.keys(filteredRates).length} currencies`)
          return { rates: filteredRates, source: 'free-api', ageDays: 0 }
        } else {
          console.warn(`⚠️ Free API missing some required currencies (got ${Object.keys(filteredRates).length}, need ${REQUIRED_CURRENCIES.length})`)
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ Free API unavailable:', error.message)
  }

  // Step 2: Try database fallback (saved by cron job)
  const dbResult = await fetchRatesFromDatabase()
  if (dbResult && dbResult.rates) {
    ratesCache = dbResult
    cacheTimestamp = now
    console.log(`✅ Using database rates (age: ${dbResult.ageDays} days)`)
    return dbResult
  }

  // Step 3: Static fallback rates
  console.log('⚠️ Using static fallback currency rates')
  ratesCache = { rates: STATIC_FALLBACK_RATES, source: 'static', ageDays: null }
  cacheTimestamp = now
  return { rates: STATIC_FALLBACK_RATES, source: 'static', ageDays: null }
}

/**
 * GET /api/currency-rate
 * Returns current exchange rates with USD as base currency
 * Includes metadata about rate source and age
 */
export async function GET(request) {
  try {
    const result = await fetchCurrencyRates()

    if (!result || !result.rates) {
      // This should never happen, but handle it gracefully
      console.error('❌ Critical: fetchCurrencyRates returned no rates')
      return NextResponse.json({
        success: false,
        error: 'Unable to fetch currency rates. Please contact support at tradeclarity-help@gmail.com',
        rates: STATIC_FALLBACK_RATES,
        source: 'static',
        fallback: true
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      rates: result.rates,
      source: result.source,
      ageDays: result.ageDays,
      timestamp: cacheTimestamp,
      cached: ratesCache && ratesCache.rates === result.rates
    })
  } catch (error) {
    console.error('❌ Error fetching currency rates:', error.message)
    console.error('Error stack:', error.stack)

    // Last resort: return static rates with error indicator
    return NextResponse.json({
      success: false,
      error: 'Unable to fetch currency rates. Please contact support at tradeclarity-help@gmail.com',
      rates: STATIC_FALLBACK_RATES,
      source: 'static',
      fallback: true,
      timestamp: Date.now()
    }, { status: 500 })
  }
}

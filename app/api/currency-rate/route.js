// app/api/currency-rate/route.js
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

// Cache for exchange rates (server-side)
let ratesCache = null
let cacheTimestamp = null
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes

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
 * Required currencies that must be present for DB save
 */
const REQUIRED_CURRENCIES = ['USD', 'INR', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CNY', 'SGD', 'CHF']

/**
 * Check if rates object has all required currencies
 * @param {Object} rates - Rates object to check
 * @returns {boolean} True if all required currencies are present
 */
function hasAllRequiredCurrencies(rates) {
  if (!rates || typeof rates !== 'object') return false
  return REQUIRED_CURRENCIES.every(currency => 
    rates[currency] !== undefined && 
    rates[currency] !== null && 
    typeof rates[currency] === 'number' &&
    isFinite(rates[currency]) &&
    rates[currency] > 0
  )
}

/**
 * Ensure all required currencies are present in rates object
 * Merges backend rates with static fallbacks for missing currencies
 * Used for returning rates to client, but NOT for saving to DB
 * @param {Object} rates - Rates object from backend/API
 * @returns {Object} Complete rates object with all 10 currencies
 */
function ensureAllCurrencies(rates) {
  const completeRates = {
    'USD': 1.0, // Always USD = 1.0
    'INR': rates.INR || STATIC_FALLBACK_RATES.INR,
    'EUR': rates.EUR || STATIC_FALLBACK_RATES.EUR,
    'GBP': rates.GBP || STATIC_FALLBACK_RATES.GBP,
    'JPY': rates.JPY || STATIC_FALLBACK_RATES.JPY,
    'AUD': rates.AUD || STATIC_FALLBACK_RATES.AUD,
    'CAD': rates.CAD || STATIC_FALLBACK_RATES.CAD,
    'CNY': rates.CNY || STATIC_FALLBACK_RATES.CNY,
    'SGD': rates.SGD || STATIC_FALLBACK_RATES.SGD,
    'CHF': rates.CHF || STATIC_FALLBACK_RATES.CHF
  }
  return completeRates
}

/**
 * Check if rates for today already exist in database
 */
async function hasRatesForToday() {
  try {
    const supabase = createAdminClient()
    const today = getTodayDateString()
    
    const { data, error } = await supabase
      .from('currency_exchange_rates')
      .select('currency_code')
      .eq('rate_date', today)
      .limit(1)
    
    if (error) {
      console.error('❌ Error checking today\'s rates in DB:', error.message)
      return false
    }
    
    return data && data.length > 0
  } catch (error) {
    console.error('❌ Exception checking today\'s rates:', error.message)
    return false
  }
}

/**
 * Save rates to database (overwrites existing rates for today)
 */
async function saveRatesToDatabase(rates) {
  try {
    const supabase = createAdminClient()
    const today = getTodayDateString()
    
    // Prepare all currency rates for upsert
    const ratesToSave = Object.entries(rates).map(([currency_code, rate]) => ({
      currency_code,
      rate: parseFloat(rate),
      rate_date: today
    }))
    
    // Upsert all rates (will overwrite if they exist for today)
    const { error } = await supabase
      .from('currency_exchange_rates')
      .upsert(ratesToSave, {
        onConflict: 'currency_code,rate_date',
        ignoreDuplicates: false
      })
    
    if (error) {
      console.error('❌ Error saving rates to DB:', error.message)
      return false
    }
    
    console.log(`✅ Saved ${ratesToSave.length} currency rates to DB for ${today}`)
    return true
  } catch (error) {
    console.error('❌ Exception saving rates to DB:', error.message)
    return false
  }
}

/**
 * Fetch rates from database (latest available, any age)
 */
async function fetchRatesFromDatabase() {
  try {
    const supabase = createAdminClient()
    
    // Get latest rates for each currency (could be from any date)
    const { data, error } = await supabase
      .from('currency_exchange_rates')
      .select('currency_code, rate, rate_date')
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
      if (!ratesMap[row.currency_code]) {
        ratesMap[row.currency_code] = parseFloat(row.rate)
        rateDates[row.currency_code] = row.rate_date
      }
    }
    
    // Ensure USD is always 1.0
    ratesMap['USD'] = 1.0
    
    // Calculate age of oldest rate used
    const oldestDate = Math.min(...Object.values(rateDates).map(d => new Date(d).getTime()))
    const ageDays = Math.floor((Date.now() - oldestDate) / (1000 * 60 * 60 * 24))
    
    console.log(`✅ Fetched ${Object.keys(ratesMap).length} currency rates from DB (age: ${ageDays} days)`)
    
    return {
      rates: ratesMap,
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
 * 1. External Backend API
 * 2. Free API (exchangerate-api.com)
 * 3. Database (latest rates, any age)
 * 4. Static fallback rates
 * 5. Error (if all fail)
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

  // Step 1: Try to fetch from external backend first
  try {
    console.log('💱 Fetching currency rates from backend:', `${BACKEND_URL}/api/currency-rate`)
    const response = await fetch(`${BACKEND_URL}/api/currency-rate`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000)
    })

    if (response.ok) {
      const data = await response.json()
      if (data.success && data.rates) {
        // Backend might only return 2 currencies (USD, INR)
        // Ensure we have all 10 currencies by merging with static fallbacks
        const rates = ensureAllCurrencies(data.rates)
        
        // Save to database if not already saved today
        const alreadySaved = await hasRatesForToday()
        if (!alreadySaved) {
          await saveRatesToDatabase(rates)
        }
        
        ratesCache = { rates, source: 'backend', ageDays: 0 }
        cacheTimestamp = now
        console.log('✅ Currency rates fetched from backend:', Object.keys(rates).length, 'currencies')
        return { rates, source: 'backend', ageDays: 0 }
      }
    }
  } catch (error) {
    console.warn('⚠️ Backend unavailable, trying free API:', error.message)
  }

  // Step 2: Fallback to free currency API
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
        // Free API should return all currencies, but verify
        const hasAllCurrencies = hasAllRequiredCurrencies(data.rates)
        
        if (hasAllCurrencies) {
          // Free API has all currencies - save to DB
          const alreadySaved = await hasRatesForToday()
          if (!alreadySaved) {
            await saveRatesToDatabase(data.rates)
          }
          ratesCache = { rates: data.rates, source: 'free-api', ageDays: 0 }
          cacheTimestamp = now
          console.log('✅ Currency rates fetched from free API (all currencies):', Object.keys(data.rates).length, 'currencies')
          return { rates: data.rates, source: 'free-api', ageDays: 0 }
        } else {
          // Free API missing some currencies (shouldn't happen, but handle gracefully)
          const rates = ensureAllCurrencies(data.rates)
          ratesCache = { rates, source: 'free-api', ageDays: 0 }
          cacheTimestamp = now
          console.warn(`⚠️ Free API returned incomplete currencies (${Object.keys(data.rates).length}), not saving to DB`)
          return { rates, source: 'free-api', ageDays: 0 }
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ Free API unavailable:', error.message)
  }

  // Step 3: Try database fallback
  const dbResult = await fetchRatesFromDatabase()
  if (dbResult && dbResult.rates) {
    ratesCache = dbResult
    cacheTimestamp = now
    console.log(`✅ Using database rates (age: ${dbResult.ageDays} days)`)
    return dbResult
  }

  // Step 4: Static fallback rates
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

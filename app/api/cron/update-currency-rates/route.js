// app/api/cron/update-currency-rates/route.js
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

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
 * Save rates to database (overwrites existing rates for today)
 * @param {Object} rates - Rates object with currency codes as keys
 * @returns {Promise<boolean>} True if saved successfully
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
 * Fetch currency rates from free API
 * @returns {Promise<Object|null>} Rates object or null if failed
 */
async function fetchRatesFromFreeAPI() {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
    
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    
    if (!data.rates || typeof data.rates !== 'object') {
      throw new Error('Invalid response format: missing rates object')
    }

    // Ensure USD is always 1.0
    const rates = {
      ...data.rates,
      USD: 1.0
    }

    // Verify we have all required currencies (but save all currencies)
    if (!hasAllRequiredCurrencies(rates)) {
      console.warn('⚠️ Free API missing some required currencies')
      // Check which ones are missing
      const missing = REQUIRED_CURRENCIES.filter(c => !rates[c])
      console.warn('⚠️ Missing currencies:', missing)
      return null
    }

    // Save all currencies (no filtering) - frontend will filter when reading
    console.log(`✅ Fetched ${Object.keys(rates).length} currencies from free API (saving all to DB)`)
    return rates
  } catch (error) {
    console.error('❌ Error fetching from free API:', error.message)
    return null
  }
}

/**
 * Cron job handler: Fetches currency rates and saves to database
 * Runs daily at 2:00 AM UTC
 * 
 * Vercel Cron Jobs:
 * - Automatically calls this endpoint on schedule
 * - Requires vercel.json configuration
 * - Works on free tier (Hobby plan)
 * - Execution time limit: 10s (free), 60s (Pro)
 */
export async function GET(request) {
  // Verify this is a cron job request (optional security check)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  // If CRON_SECRET is set, require it for security
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn('⚠️ Unauthorized cron job request')
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  console.log('🕐 Cron job started: Updating currency rates')
  const startTime = Date.now()

  try {
    // Step 1: Fetch rates from free API
    const rates = await fetchRatesFromFreeAPI()
    
    if (!rates) {
      console.error('❌ Failed to fetch rates from free API')
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch rates from free API',
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

    // Step 2: Save to database
    const saved = await saveRatesToDatabase(rates)
    
    if (!saved) {
      console.error('❌ Failed to save rates to database')
      return NextResponse.json({
        success: false,
        error: 'Failed to save rates to database',
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

    const duration = Date.now() - startTime
    console.log(`✅ Cron job completed successfully in ${duration}ms`)

    return NextResponse.json({
      success: true,
      message: 'Currency rates updated successfully',
      currenciesSaved: Object.keys(rates).length,
      requiredCurrencies: REQUIRED_CURRENCIES.length,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`
    })

  } catch (error) {
    const duration = Date.now() - startTime
    console.error('❌ Cron job failed:', error.message)
    console.error('Error stack:', error.stack)

    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`
    }, { status: 500 })
  }
}

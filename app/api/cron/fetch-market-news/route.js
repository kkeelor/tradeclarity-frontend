// app/api/cron/fetch-market-news/route.js
// Vercel Cron Job: Fetches Alpha Vantage news and stores in database
// Runs daily at 3 AM UTC (configured in vercel.json)
// 
// This frontend route calls the backend cron endpoint which handles:
// - Alpha Vantage API calls
// - Database storage
// - Rate limit management

import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
const CRON_SECRET = process.env.CRON_SECRET

/**
 * Cron job handler: Triggers backend to fetch and store market context news
 * Runs daily at 3 AM UTC via Vercel Cron (configured in vercel.json)
 * 
 * Vercel Cron Jobs:
 * - Automatically calls this endpoint on schedule
 * - Requires vercel.json configuration
 * - Works on free tier (Hobby plan)
 * - Execution time limit: 10s (Hobby), 60s (Pro)
 * 
 * IMPORTANT: Vercel Hobby plan has 10s timeout limit!
 * Backend call must complete within 8 seconds to allow for processing time.
 */
export async function GET(request) {
  // Verify this is a cron job request (optional security check)
  // Vercel cron jobs don't send auth headers by default
  // CRON_SECRET is optional - if set, use it for extra security
  const authHeader = request.headers.get('authorization')
  
  // If CRON_SECRET is set, require it for security
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    console.warn('⚠️ Unauthorized cron job request')
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  // If CRON_SECRET is not set, allow request (Vercel cron is already protected)

  const startTime = Date.now()

  try {
    // Verify backend URL is set
    if (!BACKEND_URL || BACKEND_URL === 'http://localhost:3001') {
      throw new Error('NEXT_PUBLIC_BACKEND_URL environment variable is not set or is using localhost')
    }

    // Call backend cron endpoint
    // Note: Backend will also check CRON_SECRET if set, but it's optional
    const backendHeaders = {
      'Content-Type': 'application/json'
    }
    
    // Only add secret if it's set (optional)
    if (CRON_SECRET) {
      backendHeaders['X-Cron-Secret'] = CRON_SECRET
    }
    
    const backendUrl = `${BACKEND_URL}/api/cron/fetch-market-news`
    
    // CRITICAL: Vercel Hobby plan has 10s timeout limit
    // Set timeout to 8 seconds to allow 2 seconds for processing
    const TIMEOUT_MS = 8000
    
    // IMPORTANT: Cron jobs should always fetch fresh articles from Alpha Vantage API
    // Pass useDatabase: false to force API fetch instead of using cached database results
    const requestBody = {
      useDatabase: false,  // Force fresh API fetch, skip database cache check
      forceRefresh: true   // Additional flag to ensure fresh data
    }
    
    console.log(`🔄 Calling backend cron endpoint: ${backendUrl}`)
    console.log(`⏱️  Timeout set to ${TIMEOUT_MS}ms (Vercel Hobby limit: 10s)`)
    console.log(`🆕 Force refresh enabled: useDatabase=false (skipping database cache)`)
    
    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: backendHeaders,
      body: JSON.stringify(requestBody),
      // Must complete within Vercel Hobby plan's 10s limit
      signal: AbortSignal.timeout(TIMEOUT_MS)
    })

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: errorText || backendResponse.statusText }
      }
      
      console.error(`❌ Backend responded with ${backendResponse.status}:`, errorData)
      throw new Error(`Backend error (${backendResponse.status}): ${errorData.error || backendResponse.statusText}`)
    }

    const result = await backendResponse.json()
    const duration = Date.now() - startTime

    // Log backend response for debugging
    console.log('✅ Backend response:', JSON.stringify(result, null, 2))
    
    // Check if backend actually inserted data
    const insertedCount = result.insertedCount || result.articlesInserted || result.count || 0
    
    if (insertedCount > 0) {
      console.log(`📊 Backend inserted ${insertedCount} fresh articles from Alpha Vantage API`)
    } else {
      console.warn(`⚠️  Backend returned 0 articles inserted`)
      console.warn(`⚠️  Possible causes:`)
      console.warn(`   - Alpha Vantage API returned no articles for the query`)
      console.warn(`   - API response format may have changed`)
      console.warn(`   - API error not being logged properly`)
      console.warn(`   - Check backend logs for Alpha Vantage API response details`)
      
      // Log additional debugging info if available
      if (result.apiResponseCount !== undefined) {
        console.warn(`   - API returned ${result.apiResponseCount} articles but none were inserted`)
      }
      if (result.error) {
        console.error(`   - Backend error: ${result.error}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Market context news fetched successfully',
      backendResult: result,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      // Include backend response details for debugging
      backendInserted: result.insertedCount || result.articlesInserted || result.count || 0,
      // Include warning if no articles were inserted
      warning: (result.insertedCount || result.articlesInserted || result.count || 0) === 0 
        ? 'No articles were inserted. Check backend logs for Alpha Vantage API response details.'
        : undefined
    })

  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error.message || 'Unknown error'
    
    // Check if it's a timeout error
    const isTimeout = error.name === 'AbortError' || errorMessage.includes('timeout') || duration >= 8000
    
    console.error('❌ Cron job failed:', errorMessage)
    console.error('Error name:', error.name)
    console.error('Duration:', `${duration}ms`)
    console.error('Is timeout:', isTimeout)
    
    if (isTimeout) {
      console.error('⚠️  TIMEOUT: Backend call exceeded Vercel Hobby plan limit (10s)')
      console.error('💡 Consider: 1) Optimize backend endpoint, 2) Upgrade to Pro plan, or 3) Use background job queue')
    }
    
    if (error.stack) {
      console.error('Error stack:', error.stack)
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      isTimeout,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      hint: isTimeout ? 'Backend call timed out. Vercel Hobby plan has 10s limit.' : undefined
    }, { status: 500 })
  }
}

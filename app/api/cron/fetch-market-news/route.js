// app/api/cron/fetch-market-news/route.js
// Vercel Cron Job: Fetches Alpha Vantage news and stores in database
// Runs every 2 hours
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
 * Runs every 2 hours via Vercel Cron
 * 
 * Vercel Cron Jobs:
 * - Automatically calls this endpoint on schedule
 * - Requires vercel.json configuration
 * - Works on free tier (Hobby plan)
 * - Execution time limit: 10s (free), 60s (Pro)
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

  console.log('🕐 Cron job started: Fetching market context news')
  console.log(`📍 Backend URL: ${BACKEND_URL}`)
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
    console.log(`🔗 Calling backend: ${backendUrl}`)
    
    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: backendHeaders,
      // Increase timeout for backend call (Alpha Vantage can be slow)
      signal: AbortSignal.timeout(30000) // 30 second timeout
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

    console.log(`✅ Cron job completed successfully in ${duration}ms`)
    console.log(`   Results: ${result.results?.success?.length || 0} successful, ${result.results?.failed?.length || 0} failed`)
    console.log(`   Total articles: ${result.results?.totalArticles || 0}`)

    return NextResponse.json({
      success: true,
      message: 'Market context news fetched successfully',
      backendResult: result,
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

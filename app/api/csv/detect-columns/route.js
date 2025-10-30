// app/api/csv/detect-columns/route.js
import { NextResponse } from 'next/server'
import { generateCompletion, AI_MODELS, isAIConfigured } from '@/lib/ai/client'
import { buildCSVDetectionPrompt } from '@/lib/ai/prompts'
import { getCached, setCached, CACHE_STRATEGIES } from '@/lib/ai/cache'

/**
 * Pre-AI heuristic detection for obvious exchange patterns
 * This catches clear cases before calling AI, improving accuracy and reducing costs
 */
function detectExchangeHeuristically(headers) {
  const headerLower = headers.map(h => h.toLowerCase())

  // CoinDCX Futures - VERY DISTINCTIVE
  // Has "income_type" or combination of "income" + "asset" + "symbol"
  if (headerLower.includes('income_type') ||
      (headerLower.includes('income') && headerLower.includes('asset') && headerLower.includes('info'))) {
    console.log('🎯 Heuristic: Detected CoinDCX Futures (income_type column)')
    return { exchange: 'CoinDCX', type: 'futures', confidence: 0.95 }
  }

  // Binance Futures - "Realized Profit" is distinctive
  if (headerLower.includes('realized profit')) {
    console.log('🎯 Heuristic: Detected Binance Futures (Realized Profit column)')
    return { exchange: 'Binance', type: 'futures', confidence: 0.90 }
  }

  // CoinDCX Spot - Check for unique combination
  if (headerLower.includes('pair') && headerLower.includes('executed') && !headerLower.includes('type')) {
    console.log('🎯 Heuristic: Detected CoinDCX Spot (Pair + Executed, no Type)')
    return { exchange: 'CoinDCX', type: 'spot', confidence: 0.85 }
  }

  // Binance Spot - "AvgTrading Price" is very distinctive
  if (headerLower.includes('avgtrading price') || headerLower.includes('avg trading price')) {
    console.log('🎯 Heuristic: Detected Binance Spot (AvgTrading Price column)')
    return { exchange: 'Binance', type: 'spot', confidence: 0.90 }
  }

  return null // No clear match, defer to AI
}

export async function POST(request) {
  try {
    const { headers, sampleData } = await request.json()

    if (!headers || !Array.isArray(headers) || headers.length === 0) {
      return NextResponse.json(
        { error: 'Invalid input: headers required' },
        { status: 400 }
      )
    }

    // Check cache first
    const cachedResult = getCached('CSV_DETECTION', headers)
    if (cachedResult) {
      return NextResponse.json({
        ...cachedResult,
        cached: true
      })
    }

    // STEP 1: Try heuristic detection first (fast, accurate for clear cases)
    const heuristicResult = detectExchangeHeuristically(headers)
    if (heuristicResult) {
      console.log('✓ Using heuristic detection:', heuristicResult.exchange, heuristicResult.type)

      // Build a basic mapping based on exchange type
      // For now, return partial result and let AI fill in the details
      // But we've already determined the exchange correctly
      const result = {
        detectedExchange: heuristicResult.exchange,
        detectedType: heuristicResult.type,
        confidence: heuristicResult.confidence,
        heuristicMatch: true
      }

      // Still call AI to get the mapping, but with the exchange hint
      // Fall through to AI call below
    }

    // Check if AI is configured
    if (!isAIConfigured()) {
      return NextResponse.json(
        { error: 'AI service not configured. Please set ANTHROPIC_API_KEY.' },
        { status: 503 }
      )
    }

    console.log('🤖 Detecting columns with AI for:', headers.slice(0, 5).join(', '))

    // Build prompt using our prompts library
    const prompt = buildCSVDetectionPrompt(headers, sampleData)

    // Call AI using our client
    const aiResult = await generateCompletion({
      prompt,
      model: AI_MODELS.HAIKU.id,
      maxTokens: 1000,
      temperature: 0.3,
      expectJSON: true,
      retries: 2
    })

    // OVERRIDE: If we had a heuristic match, use that exchange/type (more reliable)
    // But keep AI's column mapping
    let finalResult = aiResult
    if (heuristicResult) {
      console.log('✓ Overriding AI exchange detection with heuristic match')
      finalResult = {
        ...aiResult,
        detectedExchange: heuristicResult.exchange,
        detectedType: heuristicResult.type,
        confidence: Math.max(heuristicResult.confidence, aiResult.confidence || 0),
        heuristicMatch: true
      }
    }

    // Cache the final result
    setCached('CSV_DETECTION', finalResult, headers)

    console.log('✓ Final detection:', finalResult.detectedExchange, finalResult.detectedType, 'with', finalResult.confidence, 'confidence')

    return NextResponse.json({
      ...finalResult,
      cached: false
    })

  } catch (error) {
    console.error('❌ Column detection error:', error)
    return NextResponse.json(
      {
        error: 'Failed to detect columns',
        details: error.message
      },
      { status: 500 }
    )
  }
}

// app/api/csv/detect-columns/route.js
import { NextResponse } from 'next/server'
import { generateCompletion, AI_MODELS, isAIConfigured } from '@/lib/ai/client'
import { buildCSVDetectionPrompt } from '@/lib/ai/prompts'
import { getCached, setCached, CACHE_STRATEGIES } from '@/lib/ai/cache'

export async function POST(request) {
  try {
    const { headers, sampleData } = await request.json()

    if (!headers || !Array.isArray(headers) || headers.length === 0) {
      return NextResponse.json(
        { error: 'Invalid input: headers required' },
        { status: 400 }
      )
    }

    // Check if AI is configured
    if (!isAIConfigured()) {
      return NextResponse.json(
        { error: 'AI service not configured. Please set ANTHROPIC_API_KEY.' },
        { status: 503 }
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

    console.log('🤖 Detecting columns with AI for:', headers.slice(0, 5).join(', '))

    // Build prompt using our prompts library
    const prompt = buildCSVDetectionPrompt(headers, sampleData)

    // Call AI using our client
    const result = await generateCompletion({
      prompt,
      model: AI_MODELS.HAIKU.id,
      maxTokens: 1000,
      temperature: 0.3,
      expectJSON: true,
      retries: 2
    })

    // Cache the result
    setCached('CSV_DETECTION', result, headers)

    console.log('✓ AI detected mapping with', result.confidence, 'confidence')

    return NextResponse.json({
      ...result,
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

/**
 * MCP Tools Test Script
 * 
 * Comprehensive testing of all Alpha Vantage MCP tools to understand:
 * - What data each tool returns
 * - Response structure and format
 * - Data completeness
 * - Tool redundancy
 * - Optimal tool selection
 * 
 * Usage:
 *   1. Add ALPHA_VANTAGE_API_KEY to this file (or use env var)
 *   2. Run: node test-mcp-tools.js
 *   3. Review logs to optimize tool selection
 */

const MCP_SERVER_URL = 'https://mcp.alphavantage.co/mcp'

// ADD YOUR API KEY HERE (or set ALPHA_VANTAGE_API_KEY env var)
const API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'PNC3JHQ1TC3HXPF1'

if (API_KEY === 'YOUR_API_KEY_HERE') {
  console.error('❌ Please set ALPHA_VANTAGE_API_KEY environment variable or update API_KEY in script')
  process.exit(1)
}

/**
 * Make MCP request
 */
async function mcpRequest(method, params = {}) {
  const url = `${MCP_SERVER_URL}?apikey=${API_KEY}`
  
  const requestBody = {
    jsonrpc: '2.0',
    id: Date.now(),
    method,
    params
  }
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30000)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    
    if (data.error) {
      throw new Error(`MCP Error: ${data.error.message || JSON.stringify(data.error)}`)
    }

    return data.result
  } catch (error) {
    throw error
  }
}

/**
 * Test a single tool
 */
async function testTool(toolName, testInput, description) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`🔧 Testing: ${toolName}`)
  console.log(`📝 Description: ${description}`)
  console.log(`📥 Input:`, JSON.stringify(testInput, null, 2))
  console.log(`${'='.repeat(80)}`)
  
  const startTime = Date.now()
  
  try {
    // List tools first to get tool definition
    const toolsList = await mcpRequest('tools/list', {})
    const toolDef = toolsList.tools?.find(t => t.name === toolName)
    
    if (!toolDef) {
      console.log(`❌ Tool ${toolName} not found in available tools`)
      return null
    }
    
    console.log(`✅ Tool found in MCP server`)
    console.log(`📋 Tool definition:`, {
      name: toolDef.name,
      description: toolDef.description?.substring(0, 200),
      hasInputSchema: !!toolDef.inputSchema
    })
    
    // Execute tool
    const result = await mcpRequest('tools/call', {
      name: toolName,
      arguments: testInput
    })
    
    const duration = Date.now() - startTime
    
    // Analyze response
    const analysis = analyzeResponse(result, toolName)
    
    console.log(`\n⏱️  Execution time: ${duration}ms`)
    console.log(`\n📊 Response Analysis:`)
    console.log(JSON.stringify(analysis, null, 2))
    
    // Save full response to file
    const fs = require('fs')
    const outputDir = './mcp-test-results'
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    
    const filename = `${outputDir}/${toolName}_${Date.now()}.json`
    fs.writeFileSync(filename, JSON.stringify({
      toolName,
      description,
      input: testInput,
      result,
      analysis,
      duration,
      timestamp: new Date().toISOString()
    }, null, 2))
    
    console.log(`\n💾 Full response saved to: ${filename}`)
    
    return { toolName, result, analysis, duration }
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`\n❌ Error after ${duration}ms:`, error.message)
    console.error(`Stack:`, error.stack?.split('\n').slice(0, 5).join('\n'))
    return { toolName, error: error.message, duration }
  }
}

/**
 * Analyze tool response structure
 */
function analyzeResponse(result, toolName) {
  const analysis = {
    hasContent: !!result.content,
    contentType: typeof result.content,
    isArray: Array.isArray(result.content),
    contentLength: result.content?.length || 0,
    textContentLength: 0,
    hasText: false,
    hasJson: false,
    jsonKeys: [],
    dataStructure: {},
    sampleData: null,
    dataCompleteness: {},
    recommendations: []
  }
  
  if (result.content && Array.isArray(result.content)) {
    const textItems = result.content.filter(item => item.type === 'text')
    analysis.hasText = textItems.length > 0
    
    if (textItems.length > 0) {
      const textContent = textItems.map(item => item.text).join('\n')
      analysis.textContentLength = textContent.length
      analysis.sampleData = textContent.substring(0, 500)
      
      // Try to parse as JSON
      try {
        const jsonData = JSON.parse(textContent)
        analysis.hasJson = true
        analysis.jsonKeys = Object.keys(jsonData)
        analysis.dataStructure = analyzeJsonStructure(jsonData)
        analysis.dataCompleteness = checkDataCompleteness(jsonData, toolName)
      } catch (e) {
        // Not JSON
      }
    }
  }
  
  // Generate recommendations
  if (analysis.hasText && analysis.textContentLength > 0) {
    if (analysis.hasJson) {
      analysis.recommendations.push('✅ Returns structured JSON data')
      if (analysis.jsonKeys.length > 0) {
        analysis.recommendations.push(`📋 Contains ${analysis.jsonKeys.length} top-level keys: ${analysis.jsonKeys.slice(0, 5).join(', ')}`)
      }
    } else {
      analysis.recommendations.push('⚠️ Returns text but not JSON - may need parsing')
    }
  } else {
    analysis.recommendations.push('❌ No text content found in response')
  }
  
  return analysis
}

/**
 * Analyze JSON structure recursively
 */
function analyzeJsonStructure(obj, depth = 0, maxDepth = 3) {
  if (depth > maxDepth) return '...'
  
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]'
    return `[${obj.length} items: ${analyzeJsonStructure(obj[0], depth + 1, maxDepth)}]`
  }
  
  if (obj === null || typeof obj !== 'object') {
    return typeof obj
  }
  
  const structure = {}
  for (const [key, value] of Object.entries(obj)) {
    if (depth < maxDepth) {
      structure[key] = analyzeJsonStructure(value, depth + 1, maxDepth)
    } else {
      structure[key] = typeof value
    }
  }
  
  return structure
}

/**
 * Check data completeness for common fields
 */
function checkDataCompleteness(data, toolName) {
  const completeness = {}
  
  // Common price fields
  const priceFields = ['price', '05. price', 'latest price', 'close', '4. close']
  completeness.hasPrice = priceFields.some(field => 
    findNestedValue(data, field) !== undefined
  )
  
  // Common timestamp fields
  const timeFields = ['timestamp', '07. latest trading day', 'date', 'time', 'last updated']
  completeness.hasTimestamp = timeFields.some(field => 
    findNestedValue(data, field) !== undefined
  )
  
  // Common volume fields
  const volumeFields = ['volume', '06. volume', 'total volume']
  completeness.hasVolume = volumeFields.some(field => 
    findNestedValue(data, field) !== undefined
  )
  
  // Symbol/ticker
  const symbolFields = ['symbol', '01. symbol', 'ticker']
  completeness.hasSymbol = symbolFields.some(field => 
    findNestedValue(data, field) !== undefined
  )
  
  return completeness
}

/**
 * Find nested value in object
 */
function findNestedValue(obj, key) {
  if (obj === null || typeof obj !== 'object') return undefined
  
  if (key in obj) return obj[key]
  
  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null) {
      const found = findNestedValue(value, key)
      if (found !== undefined) return found
    }
  }
  
  return undefined
}

/**
 * Test suite configuration
 */
const TEST_SUITE = [
  // Real-time & Current Data
  {
    name: 'MARKET_STATUS',
    input: {},
    description: 'Check if markets are open'
  },
  {
    name: 'REALTIME_BULK_QUOTES',
    input: { symbols: ['NVDA'] },
    description: 'Get real-time quotes for NVDA (preferred for current prices)'
  },
  {
    name: 'GLOBAL_QUOTE',
    input: { symbol: 'NVDA', entitlement: 'realtime' },
    description: 'Get latest price and volume for NVDA with real-time entitlement'
  },
  
  // Time Series Data
  {
    name: 'TIME_SERIES_INTRADAY',
    input: { symbol: 'NVDA', interval: '5min', datatype: 'json' },
    description: 'Get intraday OHLCV data for NVDA (5min intervals)'
  },
  {
    name: 'TIME_SERIES_DAILY',
    input: { symbol: 'NVDA', datatype: 'json' },
    description: 'Get daily historical price data for NVDA'
  },
  {
    name: 'TIME_SERIES_DAILY_ADJUSTED',
    input: { symbol: 'NVDA', datatype: 'json' },
    description: 'Get daily adjusted data (splits/dividends) for NVDA'
  },
  
  // Cryptocurrency
  {
    name: 'DIGITAL_CURRENCY_DAILY',
    input: { symbol: 'BTC', market: 'USD', datatype: 'json' },
    description: 'Get daily crypto time series for BTC/USD'
  },
  {
    name: 'CRYPTO_INTRADAY',
    input: { symbol: 'BTC', market: 'USD', interval: '5min', datatype: 'json' },
    description: 'Get intraday crypto data for BTC/USD'
  },
  {
    name: 'CURRENCY_EXCHANGE_RATE',
    input: { from_currency: 'BTC', to_currency: 'USD' },
    description: 'Get crypto exchange rate BTC to USD'
  },
  
  // Market Intelligence
  {
    name: 'NEWS_SENTIMENT',
    input: { tickers: 'NVDA', limit: 5 },
    description: 'Get news sentiment for NVDA (limit 5 articles)'
  },
  {
    name: 'TOP_GAINERS_LOSERS',
    input: {},
    description: 'Get top 20 market movers (gainers, losers, most active)'
  },
  {
    name: 'SYMBOL_SEARCH',
    input: { keywords: 'nvidia' },
    description: 'Search for tickers matching "nvidia"'
  },
  {
    name: 'INSIDER_TRANSACTIONS',
    input: { symbol: 'NVDA', limit: 5 },
    description: 'Get insider transactions for NVDA (limit 5)'
  },
  
  // Technical Indicators
  {
    name: 'RSI',
    input: { symbol: 'NVDA', interval: 'daily', time_period: 14, series_type: 'close' },
    description: 'Get RSI (Relative Strength Index) for NVDA'
  },
  {
    name: 'MACD',
    input: { symbol: 'NVDA', interval: 'daily', series_type: 'close' },
    description: 'Get MACD (Moving Average Convergence Divergence) for NVDA'
  },
  {
    name: 'BBANDS',
    input: { symbol: 'NVDA', interval: 'daily', time_period: 20, series_type: 'close' },
    description: 'Get Bollinger Bands for NVDA'
  },
  {
    name: 'VWAP',
    input: { symbol: 'NVDA', interval: '5min' },
    description: 'Get VWAP (Volume Weighted Average Price) for NVDA'
  },
  {
    name: 'EMA',
    input: { symbol: 'NVDA', interval: 'daily', time_period: 50, series_type: 'close' },
    description: 'Get EMA (Exponential Moving Average) for NVDA'
  },
  {
    name: 'SMA',
    input: { symbol: 'NVDA', interval: 'daily', time_period: 50, series_type: 'close' },
    description: 'Get SMA (Simple Moving Average) for NVDA'
  },
  {
    name: 'STOCH',
    input: { symbol: 'NVDA', interval: 'daily' },
    description: 'Get Stochastic Oscillator for NVDA'
  },
  {
    name: 'ATR',
    input: { symbol: 'NVDA', interval: 'daily', time_period: 14 },
    description: 'Get ATR (Average True Range) for NVDA'
  },
  
  // Fundamental Data
  {
    name: 'COMPANY_OVERVIEW',
    input: { symbol: 'NVDA' },
    description: 'Get company overview and financial ratios for NVDA'
  },
  {
    name: 'EARNINGS_CALENDAR',
    input: { symbol: 'NVDA', horizon: '3month' },
    description: 'Get earnings calendar for NVDA (next 3 months)'
  },
  {
    name: 'EARNINGS',
    input: { symbol: 'NVDA' },
    description: 'Get earnings data (annual/quarterly) for NVDA'
  },
  
  // Advanced Analytics
  {
    name: 'ANALYTICS_FIXED_WINDOW',
    input: { symbol: 'NVDA', interval: 'daily', time_period: 20 },
    description: 'Get advanced analytics over fixed window for NVDA'
  },
  {
    name: 'ANALYTICS_SLIDING_WINDOW',
    input: { symbol: 'NVDA', interval: 'daily', time_period: 20 },
    description: 'Get advanced analytics over sliding window for NVDA'
  },
  
  // Economic Indicators
  {
    name: 'TREASURY_YIELD',
    input: { interval: 'daily', maturity: '10year' },
    description: 'Get 10-year Treasury yield rates'
  },
  {
    name: 'FEDERAL_FUNDS_RATE',
    input: { interval: 'daily' },
    description: 'Get Federal funds rate'
  },
  {
    name: 'CPI',
    input: { interval: 'monthly' },
    description: 'Get Consumer Price Index (inflation)'
  },
  {
    name: 'INFLATION',
    input: {},
    description: 'Get inflation rates'
  }
]

/**
 * Run all tests
 */
async function runTests() {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`🚀 MCP Tools Comprehensive Test Suite`)
  console.log(`📅 Started: ${new Date().toISOString()}`)
  console.log(`🔑 API Key: ${API_KEY.substring(0, 8)}...${API_KEY.substring(API_KEY.length - 4)}`)
  console.log(`📊 Total tools to test: ${TEST_SUITE.length}`)
  console.log(`${'='.repeat(80)}\n`)
  
  const results = []
  const startTime = Date.now()
  
  for (let i = 0; i < TEST_SUITE.length; i++) {
    const test = TEST_SUITE[i]
    console.log(`\n[${i + 1}/${TEST_SUITE.length}]`)
    
    const result = await testTool(test.name, test.input, test.description)
    results.push(result)
    
    // Small delay between tests to avoid rate limiting
    if (i < TEST_SUITE.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  
  const totalTime = Date.now() - startTime
  
  // Generate summary report
  console.log(`\n\n${'='.repeat(80)}`)
  console.log(`📊 TEST SUMMARY`)
  console.log(`${'='.repeat(80)}`)
  console.log(`⏱️  Total time: ${(totalTime / 1000).toFixed(2)}s`)
  console.log(`✅ Successful: ${results.filter(r => r && !r.error).length}`)
  console.log(`❌ Failed: ${results.filter(r => r && r.error).length}`)
  console.log(`📁 Results saved to: ./mcp-test-results/`)
  
  // Group by category
  console.log(`\n📋 Results by Category:`)
  const categories = {
    'Real-time': ['MARKET_STATUS', 'REALTIME_BULK_QUOTES', 'GLOBAL_QUOTE'],
    'Time Series': ['TIME_SERIES_INTRADAY', 'TIME_SERIES_DAILY', 'TIME_SERIES_DAILY_ADJUSTED'],
    'Crypto': ['DIGITAL_CURRENCY_DAILY', 'CRYPTO_INTRADAY', 'CURRENCY_EXCHANGE_RATE'],
    'Market Intelligence': ['NEWS_SENTIMENT', 'TOP_GAINERS_LOSERS', 'SYMBOL_SEARCH', 'INSIDER_TRANSACTIONS'],
    'Technical Indicators': ['RSI', 'MACD', 'BBANDS', 'VWAP', 'EMA', 'SMA', 'STOCH', 'ATR'],
    'Fundamental': ['COMPANY_OVERVIEW', 'EARNINGS_CALENDAR', 'EARNINGS'],
    'Advanced Analytics': ['ANALYTICS_FIXED_WINDOW', 'ANALYTICS_SLIDING_WINDOW'],
    'Economic': ['TREASURY_YIELD', 'FEDERAL_FUNDS_RATE', 'CPI', 'INFLATION']
  }
  
  for (const [category, tools] of Object.entries(categories)) {
    const categoryResults = results.filter(r => r && tools.includes(r.toolName))
    const successful = categoryResults.filter(r => !r.error).length
    const failed = categoryResults.filter(r => r.error).length
    console.log(`  ${category}: ${successful}✅ ${failed}❌`)
  }
  
  // Save summary
  const fs = require('fs')
  const summaryFile = './mcp-test-results/SUMMARY.json'
  fs.writeFileSync(summaryFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalTime,
    results: results.map(r => ({
      toolName: r?.toolName,
      success: !r?.error,
      error: r?.error,
      duration: r?.duration,
      hasText: r?.analysis?.hasText,
      hasJson: r?.analysis?.hasJson,
      textLength: r?.analysis?.textContentLength,
      jsonKeys: r?.analysis?.jsonKeys?.length || 0
    })),
    recommendations: generateRecommendations(results)
  }, null, 2))
  
  console.log(`\n💾 Summary saved to: ${summaryFile}`)
  console.log(`\n✅ Testing complete!\n`)
}

/**
 * Generate optimization recommendations
 */
function generateRecommendations(results) {
  const recommendations = []
  
  // Find tools that return similar data
  const priceTools = results.filter(r => 
    r && !r.error && ['REALTIME_BULK_QUOTES', 'GLOBAL_QUOTE', 'TIME_SERIES_INTRADAY'].includes(r.toolName)
  )
  
  if (priceTools.length > 0) {
    recommendations.push({
      type: 'tool_redundancy',
      message: 'Multiple tools return price data - consider which is most complete',
      tools: priceTools.map(t => ({
        name: t.toolName,
        hasPrice: t.analysis?.dataCompleteness?.hasPrice,
        hasTimestamp: t.analysis?.dataCompleteness?.hasTimestamp,
        textLength: t.analysis?.textContentLength
      }))
    })
  }
  
  // Find fastest tools
  const successful = results.filter(r => r && !r.error && r.duration)
  if (successful.length > 0) {
    const fastest = successful.sort((a, b) => a.duration - b.duration).slice(0, 5)
    recommendations.push({
      type: 'performance',
      message: 'Fastest tools (consider for time-sensitive queries)',
      tools: fastest.map(t => ({ name: t.toolName, duration: t.duration }))
    })
  }
  
  return recommendations
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})

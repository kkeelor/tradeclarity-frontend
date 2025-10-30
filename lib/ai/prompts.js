// lib/ai/prompts.js
/**
 * Reusable AI Prompt Templates for TradeClarity
 *
 * This module contains all AI prompt templates used across the app.
 * Each prompt is a function that returns a formatted string.
 */

/**
 * CSV Column Detection Prompt
 *
 * Analyzes CSV headers and sample data to map columns to standard schema
 */
export function buildCSVDetectionPrompt(headers, sampleData) {
  return `You are an expert at analyzing cryptocurrency trading CSV files. Your task is to map CSV columns to a standard schema and ACCURATELY detect the exchange.

**Standard Schema Fields:**
- symbol: Trading pair (e.g., BTC/USDT, BTCUSDT, BTC-USD)
- side: Trade direction (BUY, SELL, Long, Short)
- timestamp: Date/time of trade (any format)
- price: Execution price per unit
- quantity: Amount/volume traded
- fee: Trading fee (optional)
- total: Total trade value in quote currency (optional)
- positionSide: LONG/SHORT for futures (optional)
- realizedPnl: Profit/loss for the trade (optional)

**CSV Headers:**
${headers.map((h, i) => `${i + 1}. "${h}"`).join('\n')}

**Sample Data (first ${sampleData?.length || 0} rows):**
${sampleData ? sampleData.slice(0, 3).map(row => JSON.stringify(row)).join('\n') : 'No sample data provided'}

**EXCHANGE-SPECIFIC PATTERNS (CRITICAL FOR ACCURACY):**

**CoinDCX Spot:**
- Headers: "Date(UTC)", "Pair", "Side", "Price", "Executed", "Amount", "Fee"
- Pair format: "BTCINR", "ETHINR" (concatenated, no separator)
- Side: "buy" or "sell" (lowercase)
- Currency: Often INR-based

**CoinDCX Futures:**
- Headers: "timestamp", "symbol", "income_type", "income", "asset", "info", "tran_id", "trade_id"
- Symbol format: "BTCUSD_PERP", "BTCUSDT" with underscore
- Income types: "REALIZED_PNL", "COMMISSION", "FUNDING_FEE"
- Has "income" column for P&L amounts
- Often has "info" column with JSON data

**Binance Spot:**
- Headers: "Date(UTC)", "Pair", "Type", "Order Price", "Order Amount", "AvgTrading Price", "Filled", "Total", "status"
- Type: "Limit" or "Market"
- Pair format: "BTCUSDT", "ETHUSDT" (concatenated)
- Currency: Usually USDT-based

**Binance Futures:**
- Headers: "Time", "Symbol", "Side", "Price", "Executed", "Amount", "Fee", "Realized Profit"
- Symbol format: "BTCUSDT" (no underscore)
- Side: "BUY" or "SELL" (uppercase)
- Has "Realized Profit" column
- Currency: USDT-based

**KEY DISTINGUISHING FEATURES:**
1. **CoinDCX Futures** = Headers include "income_type" OR "income" + "asset" columns
2. **CoinDCX Spot** = Headers include "Pair" + "Side" + "Executed" AND pair format like "BTCINR"
3. **Binance Futures** = Headers include "Realized Profit" OR "Position" columns, symbol is "BTCUSDT" format
4. **Binance Spot** = Headers include "Type" (Limit/Market) + "AvgTrading Price" + "status"

**Your Task:**
Analyze the column headers and sample data CAREFULLY. Return a JSON object with:

{
  "mapping": {
    "symbol": "CSV column name that contains symbol/pair",
    "side": "CSV column name that contains buy/sell direction",
    "timestamp": "CSV column name with date/time",
    "price": "CSV column name with execution price",
    "quantity": "CSV column name with trade amount",
    "fee": "CSV column name with fee (or null if not found)",
    "total": "CSV column name with total value (or null)",
    "positionSide": "CSV column name with LONG/SHORT (or null)",
    "realizedPnl": "CSV column name with P&L (or null)"
  },
  "confidence": 0.95,
  "detectedExchange": "Binance|CoinDCX|Coinbase|Kraken|null",
  "detectedType": "spot|futures",
  "missingFields": ["list", "of", "missing", "required", "fields"],
  "warnings": ["any warnings about data quality or format"]
}

**CRITICAL RULES:**
1. **FIRST check for exchange-specific column patterns above** - this is the PRIMARY way to detect exchange
2. If you see "income_type" or "income"+"asset" columns → **MUST be CoinDCX Futures**
3. If you see "Realized Profit" column → **MUST be Binance Futures**
4. If pair format is "BTCINR" → **MUST be CoinDCX**
5. Map to standard field names exactly as shown above
6. Only map fields you're confident about (>70% certain)
7. Confidence should be LOW (<0.6) if you can't match exchange-specific patterns
8. Return ONLY the JSON object, no other text

Return your analysis:`
}

/**
 * Trading Pattern Analysis Prompt
 *
 * Generates natural language description of a trading pattern
 */
export function buildPatternAnalysisPrompt(pattern) {
  return `You are a trading psychology expert. Analyze this behavioral pattern and provide a concise, actionable description.

**Pattern Name:** ${pattern.name}
**Severity:** ${pattern.severity}
**Metrics:**
${JSON.stringify(pattern.metrics, null, 2)}

Provide:
1. A one-sentence summary (20 words max)
2. Why this matters (30 words max)
3. One specific action to improve (20 words max)

Format as JSON:
{
  "summary": "...",
  "impact": "...",
  "action": "..."
}`
}

/**
 * Insight Generation Prompt
 *
 * Creates personalized trading insights from analytics
 */
export function buildInsightGenerationPrompt(analytics, historicalData = null) {
  let prompt = `You are an expert trading analyst. Generate 3 personalized insights for this trader.

**Current Analytics:**
- Total P&L: ${analytics.totalPnL}
- Win Rate: ${analytics.winRate}%
- Profit Factor: ${analytics.profitFactor}
- Psychology Score: ${analytics.psychology?.score || 'N/A'}
- Total Trades: ${analytics.totalTrades}

**Top Patterns:**
${analytics.psychology?.patterns?.slice(0, 3).map(p => `- ${p.name}: ${p.severity}`).join('\n') || 'None'}
`

  if (historicalData) {
    prompt += `\n**Historical Comparison:**
- Last Month P&L: ${historicalData.lastMonth?.totalPnL || 'N/A'}
- Trend: ${historicalData.trend || 'N/A'}
`
  }

  return prompt + `
Generate 3 insights:
1. One about current performance (celebration or concern)
2. One about the most critical pattern to address
3. One forward-looking recommendation

Format as JSON:
{
  "insights": [
    {
      "type": "performance|pattern|recommendation",
      "priority": "high|medium|low",
      "title": "...",
      "message": "...",
      "action": "..."
    }
  ]
}`
}

/**
 * Report Summary Prompt
 *
 * Generates executive summary for trading reports
 */
export function buildReportSummaryPrompt(analytics) {
  return `You are a professional trading analyst writing an executive summary.

**Trading Data:**
- Period: ${analytics.period || 'All time'}
- Total Trades: ${analytics.totalTrades}
- P&L: ${analytics.totalPnL}
- Win Rate: ${analytics.winRate}%
- Best Trade: ${analytics.bestTrade}
- Worst Trade: ${analytics.worstTrade}

Write a 3-paragraph executive summary (150 words total):
1. Overall performance assessment
2. Key strengths and weaknesses
3. Primary recommendation

Return as plain text, professional tone.`
}

/**
 * Trading Question Answering Prompt
 *
 * For future AI chat assistant feature
 */
export function buildQuestionAnsweringPrompt(question, userContext) {
  return `You are a knowledgeable trading assistant helping a cryptocurrency trader.

**User's Trading Profile:**
- Total Trades: ${userContext.totalTrades || 'Unknown'}
- Win Rate: ${userContext.winRate || 'Unknown'}%
- Primary Exchange: ${userContext.exchange || 'Unknown'}
- Experience Level: ${userContext.experienceLevel || 'Unknown'}

**User Question:**
${question}

Provide a helpful, concise answer (100 words max). Be specific and actionable. If the question relates to their trading data, reference it.`
}

/**
 * Pattern Similarity Detection Prompt
 *
 * Finds similar patterns across different time periods
 */
export function buildPatternSimilarityPrompt(currentPatterns, historicalPatterns) {
  return `Analyze these trading patterns across time periods to identify trends.

**Current Period Patterns:**
${JSON.stringify(currentPatterns, null, 2)}

**Historical Patterns:**
${JSON.stringify(historicalPatterns, null, 2)}

Identify:
1. Patterns that are improving
2. Patterns that are worsening
3. New patterns that emerged
4. Patterns that were resolved

Return JSON:
{
  "improving": [...],
  "worsening": [...],
  "new": [...],
  "resolved": [...]
}`
}

/**
 * Trade Labeling Prompt
 *
 * Automatically categorize/label trades based on characteristics
 */
export function buildTradeLabelingPrompt(trade, userHistory) {
  return `Label this trade based on trading behavior patterns.

**Trade Details:**
- Symbol: ${trade.symbol}
- Side: ${trade.side}
- Entry: ${trade.entryPrice}
- Exit: ${trade.exitPrice}
- P&L: ${trade.pnl}
- Duration: ${trade.duration}

**User's Typical Behavior:**
- Avg Win: ${userHistory.avgWin}
- Avg Loss: ${userHistory.avgLoss}
- Avg Duration: ${userHistory.avgDuration}

Assign labels from this list:
- "revenge_trade": Trade after a loss, likely emotional
- "fomo": Entered at peak/top
- "disciplined": Followed rules, reasonable size
- "overleveraged": Position too large relative to account
- "patient": Held for appropriate duration
- "panic_sell": Exited too early in profit

Return JSON:
{
  "labels": ["label1", "label2"],
  "confidence": 0.85,
  "reasoning": "brief explanation"
}`
}

/**
 * Helper: Format large numbers for prompts
 */
export function formatNumber(num) {
  if (num === null || num === undefined) return 'N/A'
  if (Math.abs(num) >= 1000000) return `$${(num / 1000000).toFixed(2)}M`
  if (Math.abs(num) >= 1000) return `$${(num / 1000).toFixed(2)}K`
  return `$${num.toFixed(2)}`
}

/**
 * Helper: Format date for prompts
 */
export function formatDate(date) {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

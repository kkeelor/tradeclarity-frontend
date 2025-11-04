# Insights Engine Flowchart

## Overview
This document visualizes how the insights engine works, from data input to final display.

---

## Main Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ENTRY POINTS                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. AnalyticsView.js (OverviewTab)                                         │
│     ├─ generateValueFirstInsights()                                        │
│     ├─ generateEnhancedInsights()                                          │
│     ├─ analyzeDrawdowns()                                                  │
│     ├─ analyzeTimeBasedPerformance()                                       │
│     └─ analyzeSymbols()                                                    │
│                                                                             │
│  2. Dashboard.js                                                           │
│     └─ generateCombinedInsights()                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATA SOURCES                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  • analytics (totalPnL, winRate, profitFactor, symbols, etc.)              │
│  • psychology (weaknesses, strengths, recommendations from psychologyAnalyzer)│
│  • allTrades (array of trade objects with pnl, time, symbol, etc.)         │
│  • spotTrades / futuresIncome (separate trade arrays)                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              INSIGHT GENERATION LAYERS (Parallel Processing)                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │ 1. VALUE-FIRST INSIGHTS (valueFirstInsights.js)                │       │
│  ├─────────────────────────────────────────────────────────────────┤       │
│  │                                                                 │       │
│  │  IF tradeCount < 30:                                           │       │
│  │    └─> generateLowActivityInsights()                          │       │
│  │         ├─ Benchmark comparisons                               │       │
│  │         ├─ Early pattern detection                             │       │
│  │         ├─ Fee awareness                                        │       │
│  │         └─ Educational insights                                │       │
│  │                                                                 │       │
│  │  ELSE (tradeCount >= 30):                                      │       │
│  │    ├─> calculateStopLossSavings()                             │       │
│  │    │    └─> Type: 'weakness'                                  │       │
│  │    │         Category: 'risk_management'                        │       │
│  │    │         Potential Savings: Calculated from losses         │       │
│  │    │                                                           │       │
│  │    ├─> calculateFeeOptimization()                              │       │
│  │    │    └─> Type: 'recommendation'                             │       │
│  │    │         Category: 'optimization'                           │       │
│  │    │                                                           │       │
│  │    ├─> calculateTimingEdge()                                   │       │
│  │    │    └─> Type: 'recommendation'                             │       │
│  │    │         Category: 'timing'                                 │       │
│  │    │                                                           │       │
│  │    ├─> calculateSymbolFocusOpportunity()                       │       │
│  │    │    └─> Type: 'opportunity'                                │       │
│  │    │         Category: 'opportunity'                            │       │
│  │    │                                                           │       │
│  │    ├─> calculateLossCuttingSavings()                           │       │
│  │    │    └─> Type: 'weakness'                                  │       │
│  │    │         Category: 'behavioral'                            │       │
│  │    │                                                           │       │
│  │    ├─> Win Rate Insights (if >= 60%)                           │       │
│  │    │    └─> Type: 'strength'                                  │       │
│  │    │                                                           │       │
│  │    └─> Profit Factor Insights (if >= 1.8)                      │       │
│  │         └─> Type: 'strength'                                  │       │
│  │                                                                 │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │ 2. DRAWDOWN INSIGHTS (analyzeDrawdowns in AnalyticsView.js)     │       │
│  ├─────────────────────────────────────────────────────────────────┤       │
│  │                                                                 │       │
│  │  • Worst Drawdowns (top 5)                                     │       │
│  │    └─> Type: 'weakness'                                       │       │
│  │         Potential Savings: drawdownAmount * 0.2                │       │
│  │                                                               │       │
│  │  • Drawdown Patterns:                                          │       │
│  │    ├─ frequent_small (Death by a Thousand Cuts)                │       │
│  │    │   └─> Type: 'weakness'                                  │       │
│  │    │        Impact: 2/5 (medium) if 500+ trades               │       │
│  │    │        Potential Savings: cumulativeSmallLosses * 0.3    │       │
│  │    │        Affected Trades: totalTrades                      │       │
│  │    │                                                          │       │
│  │    ├─ slow_recovery                                            │       │
│  │    ├─ large_drawdowns                                          │       │
│  │    └─ current_drawdown                                        │       │
│  │                                                                 │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │ 3. TIME-BASED INSIGHTS (analyzeTimeBasedPerformance)            │       │
│  ├─────────────────────────────────────────────────────────────────┤       │
│  │                                                                 │       │
│  │  • Worst trading hours                                         │       │
│  │    └─> Type: 'weakness'                                       │       │
│  │         Category: 'timing'                                     │       │
│  │                                                               │       │
│  │  • Best trading hours                                          │       │
│  │    └─> Type: 'opportunity' / 'strength'                       │       │
│  │                                                                 │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │ 4. SYMBOL INSIGHTS (analyzeSymbols)                            │       │
│  ├─────────────────────────────────────────────────────────────────┤       │
│  │                                                                 │       │
│  │  • Symbols to avoid                                            │       │
│  │    └─> Type: 'weakness'                                       │       │
│  │         Category: 'opportunity'                                │       │
│  │                                                                 │       │
│  │  • Best performing symbols                                     │       │
│  │    └─> Type: 'opportunity' / 'strength'                       │       │
│  │                                                                 │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │ 5. PSYCHOLOGY INSIGHTS (from psychologyAnalyzer.js)             │       │
│  ├─────────────────────────────────────────────────────────────────┤       │
│  │                                                                 │       │
│  │  • psychology.weaknesses (severity: 'high' or impact >= 3)     │       │
│  │    └─> Type: 'weakness'                                       │       │
│  │         Category: 'behavioral'                                 │       │
│  │                                                                 │       │
│  │  • psychology.strengths                                         │       │
│  │    └─> Type: 'strength'                                       │       │
│  │                                                                 │       │
│  │  • psychology.recommendations                                   │       │
│  │    └─> Type: 'recommendation'                                 │       │
│  │                                                                 │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │ 6. PERFORMANCE ANALOGIES (performanceAnalogies.js)             │       │
│  ├─────────────────────────────────────────────────────────────────┤       │
│  │                                                                 │       │
│  │  • Negative hourly rate                                        │       │
│  │    └─> Type: 'weakness'                                       │       │
│  │                                                                 │       │
│  │  • Profit factor < 1                                           │       │
│  │    └─> Type: 'weakness'                                       │       │
│  │                                                                 │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    INSIGHT COLLECTION & MERGING                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  allAvailableInsights = [                                                  │
│    ...valueFirstInsights.allScored,                                       │
│    ...drawdownInsights,                                                    │
│    ...timeInsights,                                                        │
│    ...symbolInsights,                                                      │
│    ...psychologyInsights,                                                  │
│    ...performanceInsights                                                  │
│  ]                                                                         │
│                                                                             │
│  Each insight includes:                                                   │
│    • type: 'weakness' | 'strength' | 'opportunity' | 'recommendation'      │
│    • category: 'risk_management' | 'timing' | 'behavioral' | etc.         │
│    • impact: 1-5 (1=low, 5=critical)                                      │
│    • potentialSavings: dollar amount (0 if none)                          │
│    • affectedTrades: number of trades                                     │
│    • dataPoints: number of data points                                    │
│    • action: { title, steps, expectedImpact }                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                  PRIORITIZATION & SCORING ENGINE                            │
│              (insightsPrioritizationEngine.js)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  prioritizeInsights(allInsights, analytics)                                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────┐          │
│  │  STEP 1: Calculate Score (0-100) for each insight          │          │
│  ├─────────────────────────────────────────────────────────────┤          │
│  │                                                             │          │
│  │  Score Components:                                          │          │
│  │                                                             │          │
│  │  1. Financial Impact (0-40 points)                         │          │
│  │     • potentialSavings > $1000: +40                         │          │
│  │     • potentialSavings > $500:  +30                         │          │
│  │     • potentialSavings > $100:  +20                         │          │
│  │     • potentialSavings > $0:    +10                         │          │
│  │                                                             │          │
│  │  2. Type Bonus/Penalty:                                     │          │
│  │     • IF type === 'weakness': +15 base                     │          │
│  │     • IF type === 'weakness' AND potentialSavings > 0:     │          │
│  │       +10 additional                                       │          │
│  │     • IF type === 'strength' AND potentialSavings === 0:   │          │
│  │       -10 penalty                                          │          │
│  │                                                             │          │
│  │  3. Actionability (0-30 points)                             │          │
│  │     • actionDifficulty === 'easy':   +30                   │          │
│  │     • actionDifficulty === 'medium': +20                  │          │
│  │     • actionDifficulty === 'hard':    +10                  │          │
│  │                                                             │          │
│  │  4. Surprise Factor (0-20 points)                           │          │
│  │     • isCounterIntuitive === true: +20                     │          │
│  │     • Message contains "3x", "4x", "never seen": +15        │          │
│  │                                                             │          │
│  │  5. Evidence Strength (0-10 points)                       │          │
│  │     • dataPoints >= 20: +10                                │          │
│  │     • dataPoints >= 10: +7                                 │          │
│  │     • dataPoints >= 5:  +4                                 │          │
│  │                                                             │          │
│  │  6. Impact Level Bonus:                                    │          │
│  │     • impact * 2 points                                    │          │
│  │                                                             │          │
│  │  7. Category Bonuses:                                      │          │
│  │     • risk_management + weakness: +5                      │          │
│  │     • opportunity + strength: +3                            │          │
│  │                                                             │          │
│  └─────────────────────────────────────────────────────────────┘          │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────┐          │
│  │  STEP 2: Sort Insights                                       │          │
│  ├─────────────────────────────────────────────────────────────┤          │
│  │                                                             │          │
│  │  Primary Sort: Type (weaknesses first)                     │          │
│  │    IF a.type === 'weakness' AND b.type !== 'weakness': -1   │          │
│  │    IF a.type !== 'weakness' AND b.type === 'weakness': +1   │          │
│  │                                                             │          │
│  │  Secondary Sort: Score (highest first)                     │          │
│  │    return b.score - a.score                                 │          │
│  │                                                             │          │
│  └─────────────────────────────────────────────────────────────┘          │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────┐          │
│  │  STEP 3: Categorize into Groups                              │          │
│  ├─────────────────────────────────────────────────────────────┤          │
│  │                                                             │          │
│  │  critical:     insights with score >= 80 (top 3)            │          │
│  │  opportunities: insights with type 'strength'/'recommendation'│          │
│  │                 AND score >= 60 (top 3)                    │          │
│  │  behavioral:    insights with category 'behavioral'           │          │
│  │                 OR type 'weakness' AND score >= 60 (top 3)  │          │
│  │  allScored:     all insights sorted                        │          │
│  │                                                             │          │
│  └─────────────────────────────────────────────────────────────┘          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ENHANCEMENT FOR DISPLAY                                │
│              (enhanceInsightForDisplay)                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  For each insight:                                                         │
│                                                                             │
│  • formattedSavings: "$X" if potentialSavings > 0, else null             │
│  • urgency: 'critical' | 'high' | 'medium' | 'low' (based on score)       │
│  • benchmark: Comparison data if applicable                                │
│  • formattedDifficulty: 'easy' | 'medium' | 'hard'                        │
│  • visualPriority: 'hero' | 'featured' | 'standard'                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      TYPE-BASED DISPLAY LOGIC                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────┐          │
│  │  WEAKNESS (type === 'weakness')                              │          │
│  ├─────────────────────────────────────────────────────────────┤          │
│  │                                                             │          │
│  │  Display Properties:                                         │          │
│  │    • Border: amber-500/20 (amber)                           │          │
│  │    • Background: amber-500/5                               │          │
│  │    • Text: amber-300                                       │          │
│  │    • Icon: AlertTriangle                                   │          │
│  │                                                             │          │
│  │  Show:                                                      │          │
│  │    ✓ Type: Weakness                                        │          │
│  │    ✓ Impact: X/5                                           │          │
│  │    ✓ Potential Savings: $X (if > 0)                        │          │
│  │    ✓ Affected Trades: X                                    │          │
│  │    ✓ Action Steps                                          │          │
│  │                                                             │          │
│  │  Priority: HIGHEST (always shown first)                    │          │
│  │                                                             │          │
│  └─────────────────────────────────────────────────────────────┘          │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────┐          │
│  │  OPPORTUNITY / RECOMMENDATION                                │          │
│  ├─────────────────────────────────────────────────────────────┤          │
│  │                                                             │          │
│  │  Display Properties:                                         │          │
│  │    • Border: orange-500/20 (orange)                         │          │
│  │    • Background: orange-500/5                             │          │
│  │    • Text: orange-300                                      │          │
│  │    • Icon: Award / TrendingUp                              │          │
│  │                                                             │          │
│  │  Show:                                                      │          │
│  │    ✓ Type: Opportunity / Recommendation                    │          │
│  │    ✓ Impact: X/5                                           │          │
│  │    ✓ Potential Savings: $X (if > 0)                        │          │
│  │    ✓ Affected Trades: X                                    │          │
│  │    ✓ Action Steps                                          │          │
│  │                                                             │          │
│  │  Priority: SECOND (after weaknesses)                       │          │
│  │                                                             │          │
│  └─────────────────────────────────────────────────────────────┘          │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────┐          │
│  │  STRENGTH (type === 'strength')                              │          │
│  ├─────────────────────────────────────────────────────────────┤          │
│  │                                                             │          │
│  │  Display Properties:                                         │          │
│  │    • Border: emerald-500/20 (green)                        │          │
│  │    • Background: emerald-500/5                             │          │
│  │    • Text: emerald-300                                     │          │
│  │    • Icon: CheckCircle / Award                             │          │
│  │                                                             │          │
│  │  Show:                                                      │          │
│  │    ✓ Type: Strength                                        │          │
│  │    ✓ Impact: X/5                                           │          │
│  │    ✓ Potential Savings: $X (if > 0) OR "None (strength)"  │          │
│  │       NOTE: Only shows "None (strength)" if:                │          │
│  │       - potentialSavings === 0                             │          │
│  │       - type === 'strength'                                 │          │
│  │       - NOT type === 'weakness'                             │          │
│  │    ✓ Affected Trades: X                                    │          │
│  │    ✓ Action Steps (if available)                           │          │
│  │                                                             │          │
│  │  Priority: LOWEST (shown last, filtered to meaningful ones)│          │
│  │                                                             │          │
│  │  Filtering: Only show strengths if:                         │          │
│  │    • potentialSavings > 0, OR                              │          │
│  │    • action.steps.length > 0, OR                           │          │
│  │    • score >= 65, OR                                        │          │
│  │    • impact >= 3                                           │          │
│  │                                                             │          │
│  └─────────────────────────────────────────────────────────────┘          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FINAL DISPLAY                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  AnalyticsView.js (OverviewTab):                                            │
│    • Primary Insight (highest score weakness/opportunity)                 │
│    • All Insights Section (limited to top N)                              │
│    • Insight Modal (detailed view)                                         │
│                                                                             │
│  Dashboard.js:                                                              │
│    • Combined Insights (up to 5)                                           │
│    • Rotating carousel display                                              │
│                                                                             │
│  Display Order:                                                             │
│    1. Weaknesses (sorted by score)                                         │
│    2. Opportunities / Recommendations (sorted by score)                    │
│    3. Strengths (filtered, sorted by score)                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Classification Rules

### Type Assignment Logic

| Condition | Type | Example |
|-----------|------|---------|
| Stop loss too wide | `weakness` | "Cut Losses Faster" |
| Fee optimization opportunity | `recommendation` | "Optimize Trading Fees" |
| Best trading hours | `recommendation` | "Optimize Trading Hours" |
| Symbol focus opportunity | `opportunity` | "Focus on Your Best Symbol" |
| Win rate >= 60% | `strength` | "Excellent Win Rate" |
| Profit factor >= 1.8 | `strength` | "Strong Profit Factor" |
| Drawdown patterns | `weakness` | "Death by a Thousand Cuts" |
| Worst trading hours | `weakness` | "Avoid [Hour]" |
| Psychology weaknesses | `weakness` | "Revenge Trading Detected" |
| Performance issues | `weakness` | "Profit Factor Below 1.0" |

### Impact Calculation

| Pattern | Impact Calculation |
|---------|-------------------|
| `frequent_small` (Death by a Thousand Cuts) | 2/5 if 500+ trades, else 1/5 |
| Drawdowns | -20%: 4/5, -10%: 3/5, else: 2/5 |
| Profit factor < 1 | 4/5 |
| Low win rate (< 45%) | 3/5 |
| Stop loss issues | 3-4/5 (based on savings) |

### Potential Savings Calculation

| Insight Type | Calculation Method |
|--------------|-------------------|
| Stop Loss | `sum(all losses - target loss)` |
| Fee Optimization | `takerFees * 0.5` (annualized) |
| Timing Edge | `abs(worstHoursLoss)` |
| Symbol Focus | `(focusedPnL - diversifiedPnL)` |
| Loss Cutting | `avgLoss * (1 - 1/holdTimeRatio) * losers.length` |
| Drawdown Patterns | `cumulativeLoss * 0.3` (frequent_small) |
| Drawdowns | `drawdownAmount * 0.2` |

### Display Logic for "Potential Savings"

```javascript
// In InsightModal (AnalyticsView.js):

let potentialSavingsDisplay = 'Not Calculated'
if (insight.potentialSavings > 0) {
  potentialSavingsDisplay = `$${insight.potentialSavings.toFixed(0)}`
} else if (insight.potentialSavings === 0) {
  // Only show "None (strength)" for actual strengths, not weaknesses
  if (insight.type === 'strength') {
    potentialSavingsDisplay = 'None (strength)'
  } else {
    potentialSavingsDisplay = 'None'
  }
}
```

**Important**: The "None (strength)" message only appears when:
- `potentialSavings === 0` AND
- `type === 'strength'` AND
- NOT `type === 'weakness'`

For weaknesses (like "Death by a Thousand Cuts"), if `potentialSavings > 0`, it will show the calculated amount. If `potentialSavings === 0` for a weakness, it shows "None" (not "None (strength)").

**Fix Applied**: Updated display logic to check insight type before showing "None (strength)".

---

## Common Issues & Fixes

### Issue: "Death by a Thousand Cuts" showing "None (strength)"
**Root Cause**: 
- Missing `potentialSavings` calculation
- Wrong `type` assignment
- Display logic checking `type === 'strength'`

**Fix Applied**:
1. Calculate `potentialSavings` from cumulative small drawdown losses
2. Set `type: 'weakness'` (not 'strength')
3. Set `impact: 2/5` (medium) when affecting 500+ trades
4. Set `affectedTrades: totalTrades`

### Issue: Impact too low for high-volume patterns
**Fix**: Scale impact based on affected trades:
- 500+ trades: impact = 2/5 (medium)
- 200+ trades: impact = 2/5
- Otherwise: impact = 1/5 (low)

### Issue: Missing potential savings calculations
**Fix**: Ensure all insight generators calculate and include `potentialSavings`, even if 0.

---

## File Structure

```
app/analyze/
├── components/
│   ├── AnalyticsView.js          # Main insights display
│   └── Dashboard.js              # Combined insights
│
├── utils/
│   ├── behavioralAnalyzer.js    # Behavioral patterns
│   ├── psychologyAnalyzer.js     # Psychology insights
│   └── insights/
│       ├── valueFirstInsights.js      # Main generator
│       ├── lowActivityInsights.js     # <30 trades
│       ├── moneyCalculations.js       # Savings calculations
│       ├── insightsPrioritizationEngine.js  # Scoring & sorting
│       └── benchmarks.js              # Benchmark comparisons
│
└── [other analysis utilities]
```

---

## Summary

The insights engine:
1. **Collects** insights from multiple sources (value-first, drawdowns, timing, symbols, psychology)
2. **Classifies** each insight as `weakness`, `strength`, `opportunity`, or `recommendation`
3. **Calculates** potential savings and impact scores
4. **Scores** each insight (0-100) based on financial impact, actionability, evidence
5. **Prioritizes** weaknesses first, then by score
6. **Displays** with type-specific styling and formatting

**Key Principle**: Weaknesses with calculated savings are prioritized highest and shown first, as they represent actionable improvement opportunities.

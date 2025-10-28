# AI-Based CSV Column Detection - Implementation Plan

## Overview
Replace hardcoded column validation with AI-based intelligent column mapping to support any CSV format.

---

## Current Flow (BEFORE)
```
User uploads CSV
    ↓
Hardcoded column check (Symbol, Date, Price, etc.)
    ↓
❌ Error if columns don't match exactly
```

## New Flow (AFTER)
```
User uploads CSV
    ↓
Extract headers + first 5 rows
    ↓
Call AI detection API (/api/csv/detect-columns)
    ↓
Show preview with detected mapping
    ↓
User confirms or adjusts
    ↓
Parse CSV using AI-detected mapping
    ↓
✅ Success with any format!
```

---

## Files to Modify

### 1. **app/api/csv/detect-columns/route.js** ✅ DONE
- [x] Created with Claude Haiku integration
- [x] Smart caching by column structure
- [x] Returns mapping + confidence

### 2. **app/api/csv/parse/route.js**
- [ ] Add `columnMapping` parameter
- [ ] Create new `parseWithMapping()` function
- [ ] Keep existing parsers as fallback
- [ ] Use AI mapping when provided

### 3. **app/analyze/components/CSVUploadFlow.js**
- [ ] Add "Analyzing CSV..." step after file selection
- [ ] Call detect-columns API
- [ ] Show preview modal with detected fields
- [ ] Add "Looks good?" confirmation
- [ ] Pass mapping to parse API

### 4. **Create new component: CSVMappingPreview.js**
- [ ] Show detected exchange + type
- [ ] Display confidence level
- [ ] Preview sample rows with field labels
- [ ] "Confirm" and "Adjust Mapping" buttons

---

## Implementation Steps

### Step 1: Modify Parse API (Add Mapping Support)
**File**: `app/api/csv/parse/route.js`

Add new parameter:
```javascript
const columnMapping = formData.get('columnMapping') // JSON string

if (columnMapping) {
  // Use AI-detected mapping
  result = parseWithMapping(lines, JSON.parse(columnMapping), accountType)
} else {
  // Fallback to hardcoded parsers
  // ... existing code ...
}
```

Create generic parser:
```javascript
function parseWithMapping(lines, mapping, accountType) {
  const header = lines[0].split(',').map(h => h.trim())
  const trades = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])

    const trade = {
      symbol: values[header.indexOf(mapping.symbol)],
      side: values[header.indexOf(mapping.side)],
      timestamp: values[header.indexOf(mapping.timestamp)],
      price: parseFloat(values[header.indexOf(mapping.price)]),
      quantity: parseFloat(values[header.indexOf(mapping.quantity)]),
      fee: mapping.fee ? parseFloat(values[header.indexOf(mapping.fee)]) : 0
      // ... more fields
    }

    trades.push(trade)
  }

  return { success: true, trades, totalRows: trades.length }
}
```

### Step 2: Add AI Detection to Upload Flow
**File**: `app/analyze/components/CSVUploadFlow.js`

Modify `handleFileSelect()`:
```javascript
const handleFileSelect = async (selectedFiles) => {
  for (const file of selectedFiles) {
    // Read first few rows
    const preview = await readCSVPreview(file)

    // Call AI detection
    const detection = await fetch('/api/csv/detect-columns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        headers: preview.headers,
        sampleData: preview.rows
      })
    }).then(r => r.json())

    // Add to fileConfigs with mapping
    const newConfig = {
      id: Date.now() + Math.random(),
      file: file,
      mapping: detection.mapping,
      confidence: detection.confidence,
      detectedExchange: detection.detectedExchange,
      detectedType: detection.detectedType,
      preview: preview.rows,
      // ... rest of config
    }

    setFileConfigs(prev => [...prev, newConfig])
  }
}

async function readCSVPreview(file) {
  const text = await file.text()
  const lines = text.split('\n').slice(0, 6) // Header + 5 rows
  const headers = lines[0].split(',').map(h => h.trim())
  const rows = lines.slice(1).map(line => line.split(',').map(v => v.trim()))

  return { headers, rows }
}
```

### Step 3: Create Preview Modal Component
**File**: `app/analyze/components/CSVMappingPreview.js`

```javascript
export default function CSVMappingPreview({
  fileName,
  mapping,
  confidence,
  preview,
  onConfirm,
  onCancel
}) {
  return (
    <Modal>
      <h3>{fileName}</h3>

      <div className="confidence">
        AI Confidence: {Math.round(confidence * 100)}%
      </div>

      <div className="mapping">
        <h4>Detected Fields:</h4>
        <ul>
          <li>Symbol → {mapping.symbol}</li>
          <li>Side → {mapping.side}</li>
          <li>Price → {mapping.price}</li>
          {/* ... */}
        </ul>
      </div>

      <div className="preview">
        <h4>Sample Data:</h4>
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Side</th>
              <th>Price</th>
              {/* ... */}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, i) => (
              <tr key={i}>
                <td>{row[mapping.symbol]}</td>
                <td>{row[mapping.side]}</td>
                <td>{row[mapping.price]}</td>
                {/* ... */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="actions">
        <button onClick={onConfirm}>Looks Good ✓</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </Modal>
  )
}
```

### Step 4: Update Upload Flow to Use Mapping
**File**: `app/analyze/components/CSVUploadFlow.js`

Modify `processFile()`:
```javascript
const processFile = async (config) => {
  const formData = new FormData()
  formData.append('file', config.file)
  formData.append('exchange', exchange)
  formData.append('accountType', config.accountType)

  // Add AI-detected mapping
  if (config.mapping) {
    formData.append('columnMapping', JSON.stringify(config.mapping))
  }

  const parseResponse = await fetch('/api/csv/parse', {
    method: 'POST',
    body: formData
  })

  // ... rest of processing
}
```

---

## Edge Cases & Fallbacks

### High Confidence (>90%)
- Auto-apply mapping
- Show brief "Auto-detected Binance Futures" notification
- Proceed with upload

### Medium Confidence (70-90%)
- Show preview modal
- Ask user to confirm
- Proceed only after confirmation

### Low Confidence (<70%)
- Show preview with warning
- Highlight uncertain fields
- Offer manual column selection dropdown

### AI API Fails
- Fall back to hardcoded parsers
- Show error: "Auto-detection failed, please select exchange manually"

---

## Testing Checklist

- [ ] Test with Binance Spot CSV
- [ ] Test with Binance Futures CSV
- [ ] Test with CoinDCX Spot CSV
- [ ] Test with CoinDCX Futures CSV
- [ ] Test with unknown exchange CSV
- [ ] Test with malformed CSV
- [ ] Test caching (same format twice)
- [ ] Test with missing columns
- [ ] Test with extra columns
- [ ] Test with different date formats

---

## Deployment Checklist

### Development
- [x] Add ANTHROPIC_API_KEY to .env.local
- [ ] Test all steps locally
- [ ] Verify no regressions

### Production
- [ ] Add ANTHROPIC_API_KEY to Vercel env vars
- [ ] Deploy and test on staging
- [ ] Monitor API costs
- [ ] Check error logs

---

## Cost Monitoring

**Expected Usage**:
- Average request: ~500 tokens ($0.00025)
- 80% cache hit rate (after first upload)
- 1000 uploads/month = $0.25/month

**Budget Alerts**:
- Set Anthropic usage limit: $10/month
- Monitor via Anthropic dashboard
- Alert if >$5/month

---

## Timeline Estimate

**Phase 1** (1-2 hours):
- Modify parse API to accept mapping
- Create parseWithMapping function
- Test with sample mapping

**Phase 2** (2-3 hours):
- Add AI detection to upload flow
- Read CSV preview
- Call detect-columns API

**Phase 3** (1-2 hours):
- Create preview modal component
- Show confidence + mapping
- Handle confirm/cancel

**Phase 4** (1 hour):
- Connect everything
- Test end-to-end
- Handle edge cases

**Total**: 5-8 hours of development

---

## Questions Before Implementation

1. **Preview Required?**
   - Show preview for every upload? Or only if confidence <90%?
   - **Recommendation**: Always show brief preview, auto-proceed after 2 seconds if >90%

2. **Manual Adjustment**?
   - Add "Adjust Mapping" button for users to manually select columns?
   - **Recommendation**: Phase 2 feature, not MVP

3. **Exchange Auto-Detection**?
   - Use AI-detected exchange or keep manual selection?
   - **Recommendation**: Show AI suggestion, let user override

4. **Backwards Compatibility**?
   - Keep old hardcoded parsers as fallback?
   - **Recommendation**: Yes, use as fallback if AI fails

---

## Ready to Proceed?

This plan will make CSV upload work with ANY exchange format. The user experience will be:

1. User uploads CSV → **2 seconds** → "✓ Detected Binance Futures trades" → Done
2. If uncertain → Show preview → User confirms → Done

Want me to start implementing? We'll go step-by-step.

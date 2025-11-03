# Stock Exchange & CSV Expansion Analysis

## Executive Summary

This document analyzes expanding TradeClarity beyond crypto to support global stock exchanges, improving CSV handling for unknown exchanges, and evaluating OAuth integration options.

---

## 1. Stock Exchange Support Options

### 1.1 Popular Stock Exchanges with APIs

#### **Tier 1: OAuth Available**

**1. Alpaca Markets** ⭐ RECOMMENDED
- **OAuth**: ✅ Yes (via OAuth 2.0)
- **API**: RESTful, well-documented
- **Coverage**: US stocks, ETFs, options
- **Free Tier**: Yes (paper trading + limited live)
- **Data Types**: Trades, positions, portfolio, historical data
- **Pros**: 
  - Official OAuth support
  - Clean API design
  - Good documentation
  - Free paper trading tier
- **Cons**: 
  - US-focused (limited international)
  - Requires account approval for live trading

**2. Interactive Brokers (IBKR)**
- **OAuth**: ✅ Yes (via IB Gateway)
- **API**: FIX, REST, WebSocket
- **Coverage**: Global (stocks, options, futures, forex, crypto)
- **Free Tier**: Limited (requires account)
- **Pros**: 
  - Massive global coverage
  - Professional-grade API
- **Cons**: 
  - Complex setup (IB Gateway required)
  - Steep learning curve
  - Not consumer-friendly

**3. E*TRADE / Morgan Stanley**
- **OAuth**: ✅ Yes (OAuth 1.0)
- **API**: RESTful
- **Coverage**: US stocks, ETFs, options
- **Pros**: 
  - Large user base
  - Established platform
- **Cons**: 
  - OAuth 1.0 (older standard)
  - API access requires approval

#### **Tier 2: API Key Based**

**4. Polygon.io**
- **OAuth**: ❌ No (API key only)
- **API**: RESTful, WebSocket
- **Coverage**: US stocks, options, forex, crypto
- **Free Tier**: Yes (limited)
- **Pros**: 
  - Excellent data quality
  - Real-time & historical
  - Good free tier
- **Cons**: 
  - No OAuth (API key only)
  - Data-focused (not trading)

**5. Alpha Vantage**
- **OAuth**: ❌ No (API key only)
- **API**: RESTful
- **Coverage**: Global stocks, forex, crypto
- **Free Tier**: Yes (limited)
- **Pros**: 
  - Free tier available
  - Global coverage
- **Cons**: 
  - No OAuth
  - Rate limits on free tier
  - Data-only (not trading)

**6. Yahoo Finance (Unofficial)**
- **OAuth**: ❌ No
- **API**: Web scraping (no official API)
- **Coverage**: Global
- **Pros**: 
  - Free
  - Massive coverage
- **Cons**: 
  - No official API
  - Unreliable (can break)
  - Terms of service concerns

**7. Twelve Data**
- **OAuth**: ❌ No (API key only)
- **API**: RESTful, WebSocket
- **Coverage**: Stocks, forex, crypto, options
- **Free Tier**: Yes
- **Pros**: 
  - Good free tier
  - Multiple asset classes
- **Cons**: 
  - No OAuth
  - Data-focused

#### **Tier 3: International Exchanges**

**8. Zerodha (India)**
- **OAuth**: ✅ Yes (OAuth 2.0)
- **API**: RESTful (Kite API)
- **Coverage**: Indian stocks, derivatives
- **Pros**: 
  - Popular in India
  - Clean API
  - OAuth support
- **Cons**: 
  - India-only
  - Requires Indian account

**9. Interactive Brokers Global**
- See Tier 1 above

**10. TD Ameritrade (Now Schwab)**
- **OAuth**: ⚠️ Partial (OAuth 1.0, being phased out)
- **API**: RESTful
- **Coverage**: US stocks
- **Note**: Being migrated to Schwab platform

---

## 2. OAuth Implementation Analysis

### 2.1 OAuth Availability Summary

| Exchange | OAuth Type | Ease of Setup | Recommended |
|----------|-----------|---------------|-------------|
| **Alpaca** | OAuth 2.0 | ⭐⭐⭐⭐⭐ Easy | ✅ YES |
| **IBKR** | Custom | ⭐⭐ Complex | ⚠️ Maybe |
| **E*TRADE** | OAuth 1.0 | ⭐⭐⭐ Medium | ⚠️ Maybe |
| **Zerodha** | OAuth 2.0 | ⭐⭐⭐⭐ Easy | ✅ India only |
| **Polygon** | ❌ None | N/A | ❌ No |
| **Alpha Vantage** | ❌ None | N/A | ❌ No |

### 2.2 Recommended OAuth Implementation: Alpaca

**Why Alpaca?**
1. **Official OAuth 2.0** - Industry standard
2. **Easy Integration** - Clean, documented flow
3. **Free Tier** - Paper trading perfect for demos
4. **Good Coverage** - US stocks, ETFs, options
5. **Active Development** - Well-maintained API

**OAuth Flow:**
```
1. User clicks "Connect Alpaca"
2. Redirect to Alpaca OAuth consent page
3. User authorizes → callback with code
4. Exchange code for access_token + refresh_token
5. Store encrypted tokens in database
6. Use tokens to fetch trades/positions
```

**Implementation Effort**: ~2-3 days

---

## 3. CSV Handling Improvements

### 3.1 Current State

**Strengths:**
- ✅ AI-based column detection (`/api/csv/detect-columns`)
- ✅ Generic parser (`parseWithAIMapping`)
- ✅ Exchange-agnostic mapping

**Limitations:**
- ⚠️ Still requires "exchange" parameter (even if generic)
- ⚠️ Some hardcoded parsers for Binance/CoinDCX
- ⚠️ Account type detection could be improved

### 3.2 Recommended Improvements

#### **A. Remove Exchange Dependency**

**Current Flow:**
```javascript
// User must select exchange
formData.append('exchange', exchange) // Required!

// Falls back to hardcoded parsers if exchange known
if (exchange === 'binance') {
  parseBinanceFutures(lines)
}
```

**Improved Flow:**
```javascript
// 1. AI detects exchange + type automatically
const detection = await detectColumns(headers, sampleData)
// Returns: { detectedExchange: 'Alpaca', detectedType: 'spot', mapping: {...} }

// 2. Use generic parser with AI mapping
const result = parseWithAIMapping(lines, detection.mapping, detection.detectedType)

// 3. No exchange-specific logic needed!
```

**Changes Needed:**
- Make `exchange` parameter optional in `/api/csv/parse`
- Remove hardcoded exchange checks
- Rely entirely on AI mapping
- Add exchange field to CSV metadata (for display only)

#### **B. Enhanced Account Type Detection**

**Current:**
- User manually selects SPOT/FUTURES/BOTH
- Some detection in AI, but not comprehensive

**Improved:**
```javascript
// Auto-detect from CSV structure
function detectAccountType(mapping, headers, sampleRows) {
  // Futures indicators:
  // - "realized_pnl", "unrealized_pnl"
  // - "leverage", "margin"
  // - "position_side" (LONG/SHORT)
  // - "funding_fee"
  
  // Spot indicators:
  // - "buy"/"sell" side
  // - "price" * "quantity" = trade value
  // - No leverage/position fields
  
  // Options indicators:
  // - "option_type" (CALL/PUT)
  // - "strike_price", "expiry"
  
  // Return: 'SPOT' | 'FUTURES' | 'OPTIONS' | 'MIXED'
}
```

#### **C. Symbol Normalization**

**Issue**: Stock symbols differ from crypto pairs
- Crypto: `BTCUSDT` (base + quote)
- Stocks: `AAPL`, `MSFT` (single symbol)
- International: `TSLA` vs `TSLA.US` vs `TSLA.L` (exchange suffixes)

**Solution:**
```javascript
function normalizeSymbol(symbol, exchange) {
  // Handle exchange suffixes
  // AAPL → AAPL (US)
  // TSLA.US → TSLA
  // TSLA.L → TSLA (London)
  
  // Store both normalized and original
  return {
    normalized: cleanSymbol,
    original: symbol,
    exchange: detectedExchange
  }
}
```

#### **D. Universal Currency Handling**

**Current**: Assumes USDT/USD pairs
**Improved**: 
- Detect currency from symbol/quote asset
- Support multi-currency portfolios
- Auto-convert to USD for analysis

---

## 4. Architecture Recommendations

### 4.1 Exchange Abstraction Layer

**Current Structure:**
```
/exchanges/
  binance.js
  coindcx.js
  index.js
```

**Proposed Structure:**
```
/exchanges/
  /crypto/
    binance.js
    coindcx.js
  /stocks/
    alpaca.js
    polygon.js (data only)
  /universal/
    csv.js (generic CSV handler)
    oauth.js (OAuth flow handler)
  index.js (unified interface)
```

**Benefits:**
- Clear separation of asset types
- Easy to add new exchanges
- Reusable OAuth logic
- Generic CSV handler

### 4.2 Unified Data Format

**Current**: Crypto-focused format
```javascript
{
  symbol: "BTCUSDT",
  qty: "0.05",
  price: "42000",
  commissionAsset: "USDT"
}
```

**Proposed**: Asset-agnostic format
```javascript
{
  symbol: "AAPL", // or "BTCUSDT"
  quantity: 10, // shares or coins
  price: 150.25,
  currency: "USD", // or "USDT"
  assetType: "stock" | "crypto" | "option" | "future",
  exchange: "alpaca" | "binance" | "csv",
  // ... rest
}
```

### 4.3 Database Schema Updates

**Current `exchange_connections` table:**
- `exchange` (binance, coindcx)
- `api_key_encrypted`
- `api_secret_encrypted`

**Proposed additions:**
```sql
ALTER TABLE exchange_connections ADD COLUMN:
  asset_type VARCHAR(20) DEFAULT 'crypto' -- 'crypto' | 'stocks' | 'mixed'
  oauth_token_encrypted TEXT -- for OAuth exchanges
  oauth_refresh_token_encrypted TEXT
  oauth_provider VARCHAR(50) -- 'alpaca' | 'ibkr' | etc.
  exchange_country VARCHAR(10) -- 'US' | 'IN' | 'UK' | etc.
```

---

## 5. Implementation Roadmap

### Phase 1: CSV Improvements (1-2 weeks)
**Priority: HIGH** - Enables any exchange via CSV

1. ✅ Make exchange parameter optional
2. ✅ Remove hardcoded exchange parsers
3. ✅ Improve AI detection for account types
4. ✅ Add symbol normalization
5. ✅ Support multi-currency detection

**Impact**: Users can upload CSV from ANY exchange/broker

### Phase 2: Alpaca OAuth Integration (1 week)
**Priority: MEDIUM** - Good user experience

1. ✅ Add Alpaca OAuth flow
2. ✅ Store OAuth tokens securely
3. ✅ Implement Alpaca API client
4. ✅ Normalize Alpaca data to unified format
5. ✅ Add Alpaca to exchange list

**Impact**: One-click connection for US stock traders

### Phase 3: Additional Stock Exchanges (2-3 weeks)
**Priority: LOW** - Expand coverage

1. ⚠️ Polygon.io (API key, data-only)
2. ⚠️ Alpha Vantage (API key, data-only)
3. ⚠️ Zerodha (OAuth, India only)
4. ⚠️ IBKR (OAuth, complex)

**Impact**: Broader global coverage

---

## 6. Technical Considerations

### 6.1 OAuth Security

**Best Practices:**
- Store tokens encrypted (already doing this ✅)
- Implement token refresh (before expiry)
- Handle token revocation gracefully
- Store minimal permissions (read-only for analysis)

**Token Refresh Flow:**
```javascript
// Check token expiry before API calls
if (tokenExpiresSoon) {
  const newTokens = await refreshOAuthToken(refreshToken)
  await updateConnectionTokens(connectionId, newTokens)
}
```

### 6.2 Rate Limiting

**Stock APIs have stricter limits:**
- Alpaca: 200 req/min (free tier)
- Polygon: 5 req/min (free tier)
- Alpha Vantage: 5 req/min (free tier)

**Solution:**
- Implement request queuing
- Cache responses aggressively
- Batch API calls when possible
- Show progress to users

### 6.3 Data Volume

**Stocks vs Crypto:**
- Stocks: More trades (higher frequency)
- Crypto: Simpler data structure
- Both: Need efficient storage

**Optimizations:**
- Batch inserts (already doing ✅)
- Compression for historical data
- Pagination for large datasets

---

## 7. Cost Analysis

### 7.1 API Costs

| Exchange | Free Tier | Paid Tier | Best For |
|----------|-----------|-----------|----------|
| **Alpaca** | Paper trading free | $0 | Demo + Live |
| **Polygon** | 5 req/min | $199/mo | Data-heavy |
| **Alpha Vantage** | 5 req/min | $49/mo | Budget option |
| **IBKR** | Account required | Trading fees | Professional |

### 7.2 Infrastructure Costs

**Current (Crypto-only):**
- Backend API: ~$50-100/mo
- Database: ~$25/mo
- AI calls: ~$20-50/mo

**With Stocks:**
- Backend API: +$50/mo (more requests)
- Database: +$25/mo (more data)
- AI calls: Same (CSV parsing)
- **Total increase: ~$75-100/mo**

---

## 8. Recommendations

### ✅ **DO THIS FIRST: CSV Improvements**

**Why**: 
- Enables ALL exchanges immediately (not just crypto)
- No API costs
- Works for stocks, crypto, forex, anything
- User provides their own data

**Effort**: 1-2 weeks
**Impact**: HUGE (universal support)

### ✅ **DO THIS SECOND: Alpaca OAuth**

**Why**:
- Best OAuth experience
- Free tier for demos
- US market coverage
- Clean API

**Effort**: 1 week
**Impact**: HIGH (one-click connection)

### ⚠️ **CONSIDER LATER: Other Stock APIs**

**Why**:
- Diminishing returns after Alpaca
- CSV already covers most users
- API costs add up
- Maintenance burden

**Effort**: 2-3 weeks each
**Impact**: MEDIUM (broader coverage)

---

## 9. Migration Strategy

### For Existing Users
- ✅ No breaking changes
- ✅ Crypto exchanges continue working
- ✅ CSV improvements backward compatible

### For New Features
- ✅ Gradual rollout (feature flags)
- ✅ User can choose asset type
- ✅ Unified analytics view

---

## 10. Next Steps

### Immediate (This Week)
1. Review this analysis
2. Prioritize CSV improvements vs OAuth
3. Design unified data format

### Short-term (Next 2 Weeks)
1. Implement CSV improvements
2. Test with stock CSV samples
3. Prepare OAuth infrastructure

### Medium-term (Next Month)
1. Implement Alpaca OAuth
2. Add stock symbols to analytics
3. Test end-to-end flow

---

## Questions for Discussion

1. **Priority**: CSV improvements first, or OAuth first?
2. **Scope**: US stocks only, or international too?
3. **Cost**: Comfortable with API costs, or CSV-only approach?
4. **Timeline**: Aggressive expansion, or gradual?

---

## Resources

- [Alpaca API Docs](https://alpaca.markets/docs/)
- [Alpaca OAuth Guide](https://alpaca.markets/docs/oauth/)
- [Polygon.io Docs](https://polygon.io/docs)
- [Zerodha Kite API](https://kite.trade/docs/connect/v3/)
- [IBKR API](https://www.interactivebrokers.com/api/)

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-27  
**Author**: AI Assistant

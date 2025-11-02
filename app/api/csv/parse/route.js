// app/api/csv/parse/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request) {
  try {
    // Verify authentication
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file')
    const exchange = formData.get('exchange')
    const accountType = formData.get('accountType')
    const columnMappingStr = formData.get('columnMapping') // AI-detected mapping

    if (!file || !exchange || !accountType) {
      return NextResponse.json(
        { error: 'Missing required fields: file, exchange, accountType' },
        { status: 400 }
      )
    }

    // Read file content
    const text = await file.text()

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'File is empty' },
        { status: 400 }
      )
    }

    // Parse CSV
    const lines = text.trim().split('\n')

    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV must have at least a header row and one data row' },
        { status: 400 }
      )
    }

    // If AI mapping provided, use it (new flow)
    if (columnMappingStr) {
      try {
        const columnMapping = JSON.parse(columnMappingStr)
        console.log('🤖 AI Mapping received:', JSON.stringify(columnMapping, null, 2))
        console.log('📊 CSV has', lines.length, 'lines total')
        console.log('📋 CSV headers:', lines[0])

        const result = parseWithAIMapping(lines, columnMapping, accountType)

        console.log('✅ AI Parse result:', {
          success: result.success,
          spotTrades: result.spotTrades?.length || 0,
          futuresIncome: result.futuresIncome?.length || 0,
          totalRows: result.totalRows
        })

        if (!result.success) {
          console.error('❌ AI parse failed:', result.error)
          return NextResponse.json({ error: result.error }, { status: 400 })
        }

        return NextResponse.json({
          success: true,
          spotTrades: result.spotTrades || [],
          futuresIncome: result.futuresIncome || [],
          totalRows: result.totalRows,
          accountType: accountType,
          aiParsed: true
        })
      } catch (error) {
        console.error('❌ AI mapping parse error:', error)
        console.error('Stack:', error.stack)
        // Fall through to traditional parsers
      }
    }

    // Parse based on exchange and account type (traditional flow)
    let result = { success: true, spotTrades: [], futuresIncome: [], totalRows: 0 }

    if (accountType === 'BOTH') {
      // Try to parse both SPOT and FUTURES
      let spotResult, futuresResult

      if (exchange === 'binance') {
        spotResult = parseBinanceSpot(lines)
        futuresResult = parseBinanceFutures(lines)
      } else if (exchange === 'coindcx') {
        spotResult = parseCoinDCXSpot(lines)
        futuresResult = parseCoinDCXFutures(lines)
      }

      // Combine results - at least one should succeed
      if (spotResult?.success) {
        result.spotTrades = spotResult.spotTrades || []
        result.totalRows += spotResult.totalRows || 0
      }
      if (futuresResult?.success) {
        result.futuresIncome = futuresResult.futuresIncome || []
        result.totalRows += futuresResult.totalRows || 0
      }

      // If both failed, return error
      if (!spotResult?.success && !futuresResult?.success) {
        return NextResponse.json(
          { error: spotResult?.error || futuresResult?.error || 'Failed to parse CSV' },
          { status: 400 }
        )
      }
    } else {
      // Parse specific account type
      if (exchange === 'binance') {
        result = accountType === 'SPOT' ? parseBinanceSpot(lines) : parseBinanceFutures(lines)
      } else if (exchange === 'coindcx') {
        result = accountType === 'SPOT' ? parseCoinDCXSpot(lines) : parseCoinDCXFutures(lines)
      } else {
        return NextResponse.json(
          { error: `Unsupported exchange: ${exchange}` },
          { status: 400 }
        )
      }

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      spotTrades: result.spotTrades || [],
      futuresIncome: result.futuresIncome || [],
      totalRows: result.totalRows,
      accountType: accountType
    })

  } catch (error) {
    console.error('CSV parse error:', error)
    return NextResponse.json(
      { error: 'Failed to parse CSV: ' + error.message },
      { status: 500 }
    )
  }
}

function parseBinanceSpot(lines) {
  try {
    const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))

    // Check for required columns
    const requiredColumns = ['Symbol', 'Date(UTC)', 'Pair', 'Side', 'Price', 'Executed', 'Amount', 'Fee']
    const hasRequiredColumns = requiredColumns.some(col => header.includes(col))

    if (!hasRequiredColumns) {
      return {
        success: false,
        error: 'Invalid Binance SPOT CSV format. Missing required columns.'
      }
    }

    const spotTrades = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = parseCSVLine(line)

      // Map CSV columns to our format
      const symbolIdx = header.indexOf('Symbol') !== -1 ? header.indexOf('Symbol') : header.indexOf('Pair')
      const dateIdx = header.indexOf('Date(UTC)')
      const sideIdx = header.indexOf('Side')
      const priceIdx = header.indexOf('Price')
      const qtyIdx = header.indexOf('Executed') !== -1 ? header.indexOf('Executed') : header.indexOf('Amount')
      const feeIdx = header.indexOf('Fee')

      if (symbolIdx === -1 || dateIdx === -1 || sideIdx === -1) continue

      const symbol = values[symbolIdx]?.replace(/"/g, '')
      const dateStr = values[dateIdx]?.replace(/"/g, '')
      const side = values[sideIdx]?.replace(/"/g, '')
      const price = parseFloat(values[priceIdx]?.replace(/"/g, '') || 0)
      const qty = parseFloat(values[qtyIdx]?.replace(/"/g, '') || 0)
      const fee = parseFloat(values[feeIdx]?.replace(/"/g, '') || 0)

      if (!symbol || !dateStr || !side) continue

      const timestamp = new Date(dateStr).getTime()

      spotTrades.push({
        symbol: symbol,
        qty: String(qty),
        price: String(price),
        quoteQty: String(price * qty),
        commission: String(fee),
        commissionAsset: 'USDT',
        isBuyer: side.toUpperCase() === 'BUY',
        isMaker: false, // CSV doesn't have this info
        time: timestamp,
        orderId: `csv_${timestamp}_${Math.random()}`,
        id: `csv_${timestamp}_${Math.random()}`,
        accountType: 'SPOT'
      })
    }

    return {
      success: true,
      spotTrades: spotTrades,
      totalRows: spotTrades.length
    }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to parse Binance SPOT CSV: ' + error.message
    }
  }
}

function parseBinanceFutures(lines) {
  try {
    const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))

    const requiredColumns = ['Symbol', 'Income', 'Time']
    const hasRequiredColumns = requiredColumns.some(col => header.includes(col))

    if (!hasRequiredColumns) {
      return {
        success: false,
        error: 'Invalid Binance FUTURES CSV format. Missing required columns.'
      }
    }

    const futuresIncome = []

    console.log('📋 Parsing Binance Futures CSV:')
    console.log('   Headers:', header)
    console.log('   Total rows:', lines.length - 1)

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = parseCSVLine(line)

      const symbolIdx = header.indexOf('Symbol')
      const incomeIdx = header.indexOf('Income')
      const timeIdx = header.indexOf('Time')
      const incomeTypeIdx = header.indexOf('Income Type')
      const assetIdx = header.indexOf('Asset')

      if (symbolIdx === -1 || incomeIdx === -1 || timeIdx === -1) continue

      const symbol = values[symbolIdx]?.replace(/"/g, '')
      const income = parseFloat(values[incomeIdx]?.replace(/"/g, '') || 0)
      const timeStr = values[timeIdx]?.replace(/"/g, '')
      const incomeType = values[incomeTypeIdx]?.replace(/"/g, '') || 'REALIZED_PNL'
      const asset = values[assetIdx]?.replace(/"/g, '') || 'USDT'

      if (!symbol || !timeStr) continue

      const timestamp = new Date(timeStr).getTime()

      futuresIncome.push({
        symbol: symbol,
        income: String(income),
        asset: asset,
        incomeType: incomeType,
        time: timestamp,
        tranId: `csv_${timestamp}_${Math.random()}`,
        id: `csv_${timestamp}_${Math.random()}`
      })
    }

    console.log(`✅ Parsed ${futuresIncome.length} futures income records`)
    if (futuresIncome.length > 0) {
      const sampleIncome = futuresIncome.slice(0, 5)
      console.log('📊 Sample parsed income (first 5):', sampleIncome.map(inc => ({
        symbol: inc.symbol,
        income: inc.income,
        incomeType: inc.incomeType,
        asset: inc.asset
      })))
      const incomeValues = futuresIncome.map(inc => parseFloat(inc.income))
      const nonZeroCount = incomeValues.filter(v => Math.abs(v) > 0.0001).length
      console.log(`📊 Income values: ${nonZeroCount} non-zero out of ${futuresIncome.length} total`)
      if (nonZeroCount > 0) {
        const nonZeroIncomes = incomeValues.filter(v => Math.abs(v) > 0.0001)
        console.log('📊 Income range:', {
          min: Math.min(...nonZeroIncomes),
          max: Math.max(...nonZeroIncomes),
          avg: nonZeroIncomes.reduce((a, b) => a + b, 0) / nonZeroIncomes.length
        })
      }
    }

    return {
      success: true,
      futuresIncome: futuresIncome,
      totalRows: futuresIncome.length
    }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to parse Binance FUTURES CSV: ' + error.message
    }
  }
}

function parseCoinDCXSpot(lines) {
  try {
    const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))

    const requiredColumns = ['Market', 'Type', 'Price', 'Quantity', 'Timestamp']
    const hasRequiredColumns = requiredColumns.every(col => header.includes(col))

    if (!hasRequiredColumns) {
      return {
        success: false,
        error: 'Invalid CoinDCX SPOT CSV format. Missing required columns.'
      }
    }

    const spotTrades = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = parseCSVLine(line)

      const marketIdx = header.indexOf('Market')
      const typeIdx = header.indexOf('Type')
      const priceIdx = header.indexOf('Price')
      const qtyIdx = header.indexOf('Quantity')
      const timestampIdx = header.indexOf('Timestamp')
      const feeIdx = header.indexOf('Fee')

      const market = values[marketIdx]?.replace(/"/g, '')
      const type = values[typeIdx]?.replace(/"/g, '')
      const price = parseFloat(values[priceIdx]?.replace(/"/g, '') || 0)
      const qty = parseFloat(values[qtyIdx]?.replace(/"/g, '') || 0)
      const timestampStr = values[timestampIdx]?.replace(/"/g, '')
      const fee = parseFloat(values[feeIdx]?.replace(/"/g, '') || 0)

      if (!market || !type || !timestampStr) continue

      const timestamp = new Date(timestampStr).getTime()

      spotTrades.push({
        symbol: market,
        qty: String(qty),
        price: String(price),
        quoteQty: String(price * qty),
        commission: String(fee),
        commissionAsset: 'USDT',
        isBuyer: type.toUpperCase() === 'BUY',
        isMaker: false,
        time: timestamp,
        orderId: `csv_${timestamp}_${Math.random()}`,
        id: `csv_${timestamp}_${Math.random()}`,
        accountType: 'SPOT'
      })
    }

    return {
      success: true,
      spotTrades: spotTrades,
      totalRows: spotTrades.length
    }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to parse CoinDCX SPOT CSV: ' + error.message
    }
  }
}

function parseCoinDCXFutures(lines) {
  // CoinDCX futures format similar to spot
  return parseCoinDCXSpot(lines)
}

// Helper to parse CSV line handling quoted values
function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}

// AI-based parser using detected column mapping
function parseWithAIMapping(lines, mapping, accountType) {
  try {
    const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))

    console.log('🤖 parseWithAIMapping called')
    console.log('📋 Headers:', header)
    console.log('🗺️ Mapping:', JSON.stringify(mapping, null, 2))
    console.log('📦 Account Type:', accountType)

    // Determine if this is spot or futures based on mapping
    const isFutures = accountType === 'FUTURES' || mapping.positionSide || mapping.realizedPnl
    console.log('💱 Detected as:', isFutures ? 'FUTURES' : 'SPOT')

    const spotTrades = []
    const futuresIncome = []
    let skippedRows = 0

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) {
        skippedRows++
        continue
      }

      const values = parseCSVLine(line)

      if (i === 1) {
        console.log('📝 First data row values:', values)
      }

      // Helper to get value by mapped column
      const getValue = (field) => {
        const columnName = mapping.mapping?.[field] || mapping[field]
        if (!columnName) return null
        const idx = header.indexOf(columnName)
        if (idx === -1) return null
        return values[idx]?.replace(/"/g, '')
      }

      // Get core fields
      const symbol = getValue('symbol')
      const side = getValue('side')
      const timestamp = getValue('timestamp')
      const price = parseFloat(getValue('price') || 0)
      const quantity = parseFloat(getValue('quantity') || 0)
      const fee = parseFloat(getValue('fee') || 0)

      if (i === 1) {
        console.log('🔍 Extracted values:', { symbol, side, timestamp, price, quantity, fee })
      }

      if (!symbol || !timestamp) {
        if (i === 1) {
          console.warn('⚠️ Skipping row - missing symbol or timestamp')
        }
        skippedRows++
        continue
      }

      // Parse timestamp (handle both date strings and numeric timestamps)
      let timestampMs
      try {
        // Check if it's already a numeric timestamp (milliseconds)
        const numericTimestamp = parseFloat(timestamp)
        if (!isNaN(numericTimestamp) && numericTimestamp > 1000000000000) {
          // Looks like milliseconds timestamp (>year 2001)
          timestampMs = Math.floor(numericTimestamp)
        } else {
          // Try parsing as date string
          timestampMs = new Date(timestamp).getTime()
        }

        if (isNaN(timestampMs)) {
          if (i === 1) {
            console.warn('⚠️ Invalid timestamp:', timestamp, '→', timestampMs)
          }
          skippedRows++
          continue
        }
      } catch (e) {
        if (i === 1) {
          console.error('❌ Timestamp parse error:', e.message)
        }
        skippedRows++
        continue
      }

      if (isFutures) {
        // Parse as futures/income
        const realizedPnl = getValue('realizedPnl')
        const incomeRaw = realizedPnl || getValue('income') || getValue('pnl')
        
        // For futures, income should come from realizedPnl/income column, NOT price * quantity
        let income = 0
        if (incomeRaw) {
          income = parseFloat(incomeRaw)
          if (isNaN(income)) {
            console.warn(`⚠️ Row ${i}: Invalid income value "${incomeRaw}" for symbol ${symbol}, skipping`)
            skippedRows++
            continue
          }
        } else {
          // If no income column found, this is a problem - don't fall back to price*quantity
          console.warn(`⚠️ Row ${i}: No income/realizedPnl column found for futures trade ${symbol}, skipping`)
          skippedRows++
          continue
        }

        if (i <= 3) {
          console.log(`📊 AI Futures Row ${i}:`, {
            symbol,
            realizedPnl,
            incomeRaw,
            income,
            price,
            quantity,
            mapping: mapping.mapping || mapping
          })
        }

        futuresIncome.push({
          symbol: symbol,
          income: String(income),
          asset: 'USDT', // Default, could be detected
          incomeType: 'REALIZED_PNL',
          time: timestampMs,
          tranId: `csv_ai_${timestampMs}_${Math.random()}`,
          id: `csv_ai_${timestampMs}_${Math.random()}`
        })
      } else {
        // Parse as spot trade
        const total = getValue('total')
        const quoteQty = total ? parseFloat(total) : (price * quantity)

        spotTrades.push({
          symbol: symbol,
          qty: String(quantity),
          price: String(price),
          quoteQty: String(quoteQty),
          commission: String(fee),
          commissionAsset: 'USDT', // Could be detected from CSV
          time: timestampMs,
          isBuyer: side?.toUpperCase() === 'BUY',
          isMaker: false, // Can't determine from basic CSV
          orderId: `csv_ai_${timestampMs}_${Math.random()}`,
          id: `csv_ai_${timestampMs}_${Math.random()}`
        })
      }
    }

    console.log('📊 Parse complete:')
    console.log('   - Total lines processed:', lines.length - 1)
    console.log('   - Skipped rows:', skippedRows)
    console.log('   - Spot trades:', spotTrades.length)
    console.log('   - Futures income:', futuresIncome.length)
    
    if (futuresIncome.length > 0) {
      const incomeValues = futuresIncome.map(inc => parseFloat(inc.income))
      const nonZeroCount = incomeValues.filter(v => Math.abs(v) > 0.0001).length
      console.log(`   - Futures income: ${nonZeroCount} non-zero out of ${futuresIncome.length} total`)
      if (nonZeroCount > 0) {
        const nonZeroIncomes = incomeValues.filter(v => Math.abs(v) > 0.0001)
        console.log('   - Income range:', {
          min: Math.min(...nonZeroIncomes),
          max: Math.max(...nonZeroIncomes),
          avg: nonZeroIncomes.reduce((a, b) => a + b, 0) / nonZeroIncomes.length
        })
      }
    }

    return {
      success: true,
      spotTrades: spotTrades,
      futuresIncome: futuresIncome,
      totalRows: spotTrades.length + futuresIncome.length
    }

  } catch (error) {
    console.error('❌ AI mapping parse error:', error)
    console.error('Stack:', error.stack)
    return {
      success: false,
      error: 'Failed to parse with AI mapping: ' + error.message
    }
  }
}

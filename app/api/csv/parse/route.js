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

    // Parse based on exchange and account type
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

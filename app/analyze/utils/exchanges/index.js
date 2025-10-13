// app/analyze/utils/exchanges/index.js

import { binanceConfig, fetchBinanceTrades, normalizeBinanceTrades } from './binance'
import { coindcxConfig, fetchCoinDCXTrades, normalizeCoinDCXTrades } from './coindcx'

export const EXCHANGES = {
  binance: {
    config: binanceConfig,
    fetchTrades: fetchBinanceTrades,
    normalizeTrades: normalizeBinanceTrades
  },
  coindcx: {
    config: coindcxConfig,
    fetchTrades: fetchCoinDCXTrades,
    normalizeTrades: normalizeCoinDCXTrades
  }
}

export const getExchangeList = () => {
  return Object.entries(EXCHANGES).map(([key, exchange]) => ({
    id: key,
    ...exchange.config
  }))
}
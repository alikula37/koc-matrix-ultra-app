export type Symbol = {
  symbol: string
  price: number
  change24h: number
  volume: string
  high: number
  low: number
  matrixScore: number // 0-100 Koç Matrix skoru
  signal: 'AL' | 'SAT' | 'NÖTR'
}

export type Candle = {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type Position = {
  id: string
  symbol: string
  side: 'LONG' | 'SHORT'
  entry: number
  mark: number
  size: number
  leverage: number
  pnl: number
  pnlPercent: number
  liquidation: number
}

export type Order = {
  price: number
  amount: number
  total: number
  side: 'bid' | 'ask'
}

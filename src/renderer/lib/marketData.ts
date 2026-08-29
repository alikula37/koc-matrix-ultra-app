import { Candle, Symbol, Position, Order } from "../types/trading"

export const mockSymbols: Symbol[] = [
  { symbol: "BTCUSDT", price: 67842.5, change24h: 2.34, volume: "1.2B", high: 68400, low: 66200, matrixScore: 78, signal: "AL" },
  { symbol: "ETHUSDT", price: 3421.12, change24h: -1.12, volume: "890M", high: 3480, low: 3380, matrixScore: 42, signal: "NÖTR" },
  { symbol: "SOLUSDT", price: 142.88, change24h: 5.67, volume: "420M", high: 144, low: 134, matrixScore: 91, signal: "AL" },
  { symbol: "XU100", price: 9852.33, change24h: 0.89, volume: "112B₺", high: 9900, low: 9780, matrixScore: 64, signal: "AL" },
  { symbol: "THYAO", price: 312.5, change24h: -0.45, volume: "2.1B₺", high: 315, low: 308, matrixScore: 33, signal: "SAT" },
  { symbol: "GARAN", price: 128.9, change24h: 1.22, volume: "1.8B₺", high: 130, low: 127, matrixScore: 71, signal: "AL" },
  { symbol: "AKBNK", price: 62.15, change24h: 2.01, volume: "900M₺", high: 63, low: 60.5, matrixScore: 58, signal: "NÖTR" },
  { symbol: "SASA", price: 42.3, change24h: -2.5, volume: "600M₺", high: 43.5, low: 41.8, matrixScore: 21, signal: "SAT" },
]

export const mockCandles: Candle[] = Array.from({ length: 48 }, (_, i) => {
  const base = 67000 + Math.sin(i / 4) * 800 + (Math.random() - 0.5) * 300
  const open = base
  const close = base + (Math.random() - 0.5) * 400
  return {
    time: `${String(9 + Math.floor(i/4)).padStart(2,"0")}:${String((i%4)*15).padStart(2,"0")}`,
    open: Number(open.toFixed(2)),
    close: Number(close.toFixed(2)),
    high: Number((Math.max(open, close) + Math.random()*200).toFixed(2)),
    low: Number((Math.min(open, close) - Math.random()*200).toFixed(2)),
    volume: Number((Math.random()*1000).toFixed(0)),
  }
})

export const mockPositions: Position[] = [
  { id: "1", symbol: "BTCUSDT", side: "LONG", entry: 66500, mark: 67842, size: 0.12, leverage: 5, pnl: 161.04, pnlPercent: 10.09, liquidation: 54200 },
  { id: "2", symbol: "THYAO", side: "SHORT", entry: 318, mark: 312.5, size: 200, leverage: 3, pnl: 1100, pnlPercent: 1.73, liquidation: 335 },
]

export const mockBids: Order[] = Array.from({ length: 7 }, (_, i) => ({
  price: 67842 - (i+1)*12.5,
  amount: Number((Math.random()*1.5).toFixed(3)),
  total: 0,
  side: "bid" as const
})).map(o=>({...o, total: o.price*o.amount}))

export const mockAsks: Order[] = Array.from({ length: 7 }, (_, i) => ({
  price: 67842 + (i+1)*12.5,
  amount: Number((Math.random()*1.5).toFixed(3)),
  total: 0,
  side: "ask" as const
})).map(o=>({...o, total: o.price*o.amount}))

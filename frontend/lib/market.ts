"use client"
// Market live price service — Binance (crypto) + Yahoo Finance (stocks/ETF) free public APIs
// Spec 2.2: favori ürünlerin canlı fiyatını çek, Trades form entry_price otomatik doldur.
// CORS-friendly: Binance data-api.binance.vision supports CORS; Yahoo may block → graceful fallback.

export type PriceResult = { price: number; source: "binance" | "yahoo" | "cache"; ts: number }

const CACHE = new Map<string, PriceResult>()
const CACHE_TTL_MS = 3500

function normSymbol(s: string): string {
  return s.trim().toUpperCase().replace("/", "").replace("-", "")
}

function isCryptoSymbol(s: string): boolean {
  const n = normSymbol(s)
  // Binance quote suffixes
  return /(USDT|USDC|BUSD|BTC|ETH|BNB|TRY|EUR)$/.test(n) || ["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT","ADAUSDT","AVAXUSDT","DOTUSDT","DOGEUSDT","MATICUSDT"].includes(n)
}

async function fetchBinance(symbol: string): Promise<number | null> {
  const n = normSymbol(symbol)
  if (!isCryptoSymbol(n)) return null
  const urls = [
    `https://data-api.binance.vision/api/v3/ticker/price?symbol=${n}`,
    `https://api.binance.com/api/v3/ticker/price?symbol=${n}`,
    `https://api1.binance.com/api/v3/ticker/price?symbol=${n}`,
  ]
  for (const url of urls) {
    try {
      const r = await fetch(url, { cache: "no-store" })
      if (!r.ok) continue
      const j = await r.json()
      const p = parseFloat(j.price || j[0]?.price)
      if (Number.isFinite(p) && p > 0) return p
    } catch {}
  }
  return null
}

async function fetchYahoo(symbol: string): Promise<number | null> {
  // Yahoo suffix mapping for BIST: THYAO -> THYAO.IS
  const n = normSymbol(symbol)
  const candidates = [n]
  // if seems BIST without .IS, try with .IS
  if (/^[A-Z]{3,6}$/.test(n) && !n.includes(".") && !isCryptoSymbol(n)) {
    candidates.push(`${n}.IS`)
  }
  // also try raw symbol as-is (user may include .IS)
  if (symbol !== n) candidates.unshift(symbol.trim().toUpperCase())
  for (const sym of candidates) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1m&range=1d`
      const r = await fetch(url, { cache: "no-store" })
      if (!r.ok) continue
      const j = await r.json()
      const result = j.chart?.result?.[0]
      const metaPrice = result?.meta?.regularMarketPrice
      if (Number.isFinite(metaPrice) && metaPrice > 0) return metaPrice
      const quote = result?.indicators?.quote?.[0]?.close
      if (Array.isArray(quote)) {
        for (let i = quote.length - 1; i >= 0; i--) {
          if (Number.isFinite(quote[i]) && quote[i] > 0) return quote[i]
        }
      }
    } catch {}
  }
  return null
}

export async function getLivePrice(rawSymbol: string): Promise<PriceResult | null> {
  const sym = normSymbol(rawSymbol)
  if (!sym) return null
  const cached = CACHE.get(sym)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached
  let price: number | null = null
  let source: PriceResult["source"] = "cache"
  // crypto first → Binance
  if (isCryptoSymbol(sym)) {
    price = await fetchBinance(sym)
    if (price != null) source = "binance"
    else {
      // fallback Yahoo for crypto? skip
    }
  }
  // if not crypto or binance failed, try Yahoo
  if (price == null) {
    price = await fetchYahoo(rawSymbol)
    if (price != null) source = "yahoo"
  }
  // also for crypto try Yahoo as second fallback (e.g. CORS blocked)
  if (price == null && isCryptoSymbol(sym)) {
    const y = await fetchYahoo(sym.replace("USDT","-USD").replace("TRY","-TRY"))
    if (y != null) { price = y; source = "yahoo" }
  }
  if (price == null || !Number.isFinite(price)) return null
  const res: PriceResult = { price, source, ts: Date.now() }
  CACHE.set(sym, res)
  return res
}

export async function getLivePrices(symbols: string[]): Promise<Record<string, PriceResult>> {
  const uniq = [...new Set(symbols.map(normSymbol).filter(Boolean))]
  const out: Record<string, PriceResult> = {}
  await Promise.all(uniq.map(async (s) => {
    const r = await getLivePrice(s)
    if (r) out[s] = r
  }))
  return out
}

export function formatPrice(price: number | null | undefined, symbol: string): string {
  if (price == null || !Number.isFinite(price as number)) return "—"
  const p = price as number
  if (p >= 1000) return p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (p >= 1) return p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })
  return p.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 8 })
}

// helper to compute floating R for OPEN trades given live price map
export function computeFloatingR(trade: any, livePrice: number | null): number | null {
  if (!trade || trade.status !== "OPEN") return null
  if (livePrice == null || !Number.isFinite(livePrice)) return null
  const entry = trade.entry_price
  const sl = trade.stop_loss
  const size = trade.position_size
  if (!entry || !size) return null
  const dir = trade.direction
  const pnlCash = dir === "LONG" ? (livePrice - entry) * size : (entry - livePrice) * size
  const fees = trade.commission_fees || 0
  const netCash = pnlCash - fees
  const riskPerUnit = sl ? Math.abs(entry - sl) : entry * 0.02
  if (!riskPerUnit || riskPerUnit === 0) return null
  const pnlR = netCash / (riskPerUnit * size)
  return Math.round(pnlR * 1000) / 1000
}

export function computeFloatingCash(trade: any, livePrice: number | null): number | null {
  if (!trade || trade.status !== "OPEN") return null
  if (livePrice == null) return null
  const entry = trade.entry_price
  const size = trade.position_size
  const dir = trade.direction
  const pnlCash = dir === "LONG" ? (livePrice - entry) * size : (entry - livePrice) * size
  const fees = trade.commission_fees || 0
  return Math.round((pnlCash - fees) * 100) / 100
}

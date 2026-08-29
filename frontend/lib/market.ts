"use client"
// Market live price — artık backend proxy üzerinden (CORS korumalı)
// Spec 3: Frontend doğrudan Binance/Yahoo'ya gitmez, FastAPI GET /api/v1/market/prices (3.5s cache) üzerinden geçer.
// Fallback: backend yoksa/401 ise direkt Binance/Yahoo'ya düşer (offline dev).

export type PriceResult = { price: number; source: "binance" | "yahoo" | "cache" | "proxy"; ts: number }

const CACHE = new Map<string, PriceResult>()
const CACHE_TTL_MS = 3500

function normSymbol(s: string): string {
  return s.trim().toUpperCase().replace('/', '').replace('-', '')
}

function isCryptoSymbol(s: string): boolean {
  const n = normSymbol(s)
  return /(USDT|USDC|BUSD|BTC|ETH|BNB|TRY|EUR)$/.test(n) || ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','ADAUSDT','AVAXUSDT','DOTUSDT','DOGEUSDT','MATICUSDT'].includes(n)
}

// --- Fallback direkt fetch (backend yoksa) ---
async function fetchBinanceDirect(symbol: string): Promise<number | null> {
  const n = normSymbol(symbol)
  if (!isCryptoSymbol(n)) return null
  const urls = [
    `https://data-api.binance.vision/api/v3/ticker/price?symbol=${n}`,
    `https://api.binance.com/api/v3/ticker/price?symbol=${n}`,
    `https://api1.binance.com/api/v3/ticker/price?symbol=${n}`,
  ]
  for (const url of urls) {
    try {
      const r = await fetch(url, { cache: 'no-store' })
      if (!r.ok) continue
      const j = await r.json()
      const p = parseFloat(j.price ?? j[0]?.price)
      if (Number.isFinite(p) && p > 0) return p
    } catch {}
  }
  return null
}

async function fetchYahooDirect(symbol: string): Promise<number | null> {
  const n = normSymbol(symbol)
  const candidates = [n]
  if (/^[A-Z]{3,6}$/.test(n) && !n.includes('.') && !isCryptoSymbol(n)) candidates.push(`${n}.IS`)
  if (symbol !== n) candidates.unshift(symbol.trim().toUpperCase())
  for (const sym of candidates) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1m&range=1d`
      const r = await fetch(url, { cache: 'no-store' })
      if (!r.ok) continue
      const j = await r.json()
      const result = j.chart?.result?.[0]
      const metaPrice = result?.meta?.regularMarketPrice
      if (Number.isFinite(metaPrice) && metaPrice > 0) return metaPrice as number
      const quote = result?.indicators?.quote?.[0]?.close
      if (Array.isArray(quote)) {
        for (let i = quote.length - 1; i >= 0; i--) if (Number.isFinite(quote[i]) && (quote[i] as number) > 0) return quote[i] as number
      }
    } catch {}
  }
  return null
}

// --- Backend proxy (tercih) ---
async function fetchViaBackend(symbols: string[]): Promise<Record<string, PriceResult> | null> {
  const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001'
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  if (!token) return null
  const qs = symbols.map(encodeURIComponent).join(',')
  try {
    const r = await fetch(`${BASE}/api/v1/market/prices?symbols=${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!r.ok) return null
    const j = (await r.json()) as Record<string, { price: number; source: string; ts: number }>
    const out: Record<string, PriceResult> = {}
    for (const [k, v] of Object.entries(j)) {
      const n = normSymbol(k)
      if (typeof v?.price === 'number' && Number.isFinite(v.price)) {
        const pr: PriceResult = { price: v.price, source: (v.source as PriceResult['source']) ?? 'proxy', ts: v.ts ?? Date.now() }
        out[n] = pr
        CACHE.set(n, pr)
      }
    }
    return out
  } catch {
    return null
  }
}

export async function getLivePrice(rawSymbol: string): Promise<PriceResult | null> {
  const sym = normSymbol(rawSymbol)
  if (!sym) return null
  const cached = CACHE.get(sym)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached

  // Önce backend proxy dene
  const via = await fetchViaBackend([rawSymbol])
  if (via && via[sym]) return via[sym]

  // Fallback direkt
  let price: number | null = null
  let source: PriceResult['source'] = 'cache'
  if (isCryptoSymbol(sym)) {
    price = await fetchBinanceDirect(sym)
    if (price != null) source = 'binance'
  }
  if (price == null) {
    price = await fetchYahooDirect(rawSymbol)
    if (price != null) source = 'yahoo'
  }
  if (price == null && isCryptoSymbol(sym)) {
    const y = await fetchYahooDirect(sym.replace('USDT', '-USD').replace('TRY', '-TRY'))
    if (y != null) { price = y; source = 'yahoo' }
  }
  if (price == null || !Number.isFinite(price)) return null
  const res: PriceResult = { price, source, ts: Date.now() }
  CACHE.set(sym, res)
  return res
}

export async function getLivePrices(symbols: string[]): Promise<Record<string, PriceResult>> {
  const uniq = [...new Set(symbols.map(normSymbol).filter(Boolean))]
  if (uniq.length === 0) return {}
  // Cache hit ayır
  const now = Date.now()
  const pending: string[] = []
  const out: Record<string, PriceResult> = {}
  for (const s of uniq) {
    const c = CACHE.get(s)
    if (c && now - c.ts < CACHE_TTL_MS) out[s] = c
    else pending.push(s)
  }
  if (pending.length === 0) return out

  // Backend toplu
  const via = await fetchViaBackend(pending)
  if (via) {
    for (const [k, v] of Object.entries(via)) out[k] = v
    const missing = pending.filter((s) => !(s in via))
    if (missing.length === 0) return out
    // kalanlar için fallback
    await Promise.all(missing.map(async (s) => {
      const r = await getLivePrice(s)
      if (r) out[s] = r
    }))
    return out
  }

  // Backend yoksa direkt paralel
  await Promise.all(pending.map(async (s) => {
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

// helper — OPEN + PARTIAL için kalan miktar üzerinden floating
export function computeFloatingR(trade: any, livePrice: number | null): number | null {
  if (!trade || (trade.status !== 'OPEN' && trade.status !== 'PARTIAL')) return null
  if (livePrice == null || !Number.isFinite(livePrice)) return null
  const entry: number = trade.entry_price
  const sl: number | null = trade.stop_loss ?? null
  const size: number = trade.position_size
  if (!entry || !size) return null
  const filled: number = Array.isArray(trade.exits) ? trade.exits.reduce((s: number, e: any) => s + (Number(e.exit_quantity) || 0), 0) : 0
  const remaining = Math.max(0, size - filled)
  if (remaining <= 1e-9) return null
  const dir = trade.direction
  // SHORT: fiyat düşüşü artı R yazmalı — (entry - live)*remaining
  const pnlCash = dir === 'LONG' ? (livePrice - entry) * remaining : (entry - livePrice) * remaining
  const totalFees: number = trade.commission_fees ?? 0
  // Komisyon kalan’a oransal + slippage varsa düş
  const slippage: number = trade.slippage ?? 0
  const feeForRemaining = totalFees * (remaining / size)
  const netCash = pnlCash - feeForRemaining - slippage
  const riskPerUnit = sl != null ? Math.abs(entry - sl) : entry * 0.02
  if (!riskPerUnit || riskPerUnit === 0) return null
  // R = netCash / (riskPerUnit * original size) → or remaining? Spec: kalan miktar üzerinden → remaining
  // Karar: kalan risk = riskPerUnit * remaining (kalanın riski)
  const pnlR = netCash / (riskPerUnit * remaining)
  return Math.round(pnlR * 1000) / 1000
}

export function computeFloatingCash(trade: any, livePrice: number | null): number | null {
  if (!trade || (trade.status !== 'OPEN' && trade.status !== 'PARTIAL')) return null
  if (livePrice == null) return null
  const entry: number = trade.entry_price
  const size: number = trade.position_size
  const dir = trade.direction
  const filled: number = Array.isArray(trade.exits) ? trade.exits.reduce((s: number, e: any) => s + (Number(e.exit_quantity) || 0), 0) : 0
  const remaining = Math.max(0, size - filled)
  if (remaining <= 1e-9) return null
  const pnlCash = dir === 'LONG' ? (livePrice - entry) * remaining : (entry - livePrice) * remaining
  const totalFees: number = trade.commission_fees ?? 0
  const feeForRemaining = totalFees * (remaining / size)
  const slippage: number = trade.slippage ?? 0
  return Math.round((pnlCash - feeForRemaining - slippage) * 100) / 100
}

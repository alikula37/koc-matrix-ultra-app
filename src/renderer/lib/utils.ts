// Konsolide utils — tek kaynak frontend/lib/utils.ts
// Spec 2: src/renderer/lib vs frontend/lib tek paket yapısına konsolide
// @/services alias -> frontend/lib (vite.config.ts + tsconfig.json)
export { cn } from '@/services/utils'
export { formatR, formatCash, localeToIntl, currencyForLocale, formatChartDate, heatColorFor, apiUrl, wsUrl } from '@/services/utils'

// Renderer'a özgü trader terminal formatları (ortak cn üstüne ek)
export function formatPrice(n: number, decimals = 2): string {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function formatPercent(n: number): string {
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

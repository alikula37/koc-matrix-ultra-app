import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
export const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"
export const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8001"
export function formatR(n?: number | null) { if(n==null) return "-"; return `${n>0?"+":""}${n.toFixed(2)}R` }
export function formatCash(n?: number | null, cur="₺", locale="tr-TR") { if(n==null) return "-"; return `${n>0?"+":""}${cur}${n.toLocaleString(locale,{minimumFractionDigits:2})}` }
export function localeToIntl(locale: string) {
  if (locale === "tr") return "tr-TR"
  if (locale === "de") return "de-DE"
  return "en-US"
}
export function currencyForLocale(locale: string) {
  if (locale === "tr") return "₺"
  if (locale === "de") return "€"
  return "$"
}

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

// Spec 1.4: Grafik X eksen tarih formatı — salisiz, okunaklı DD.MM veya DD.MM.YYYY HH:mm
export function formatChartDate(iso: string, locale="tr"): string {
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return String(iso).slice(0,10)
    const pad = (n:number)=>String(n).padStart(2,"0")
    const dd = pad(d.getDate())
    const mm = pad(d.getMonth()+1)
    const yy = d.getFullYear()
    const hh = pad(d.getHours())
    const mi = pad(d.getMinutes())
    // If same year as now, show DD.MM HH:mm; otherwise DD.MM.YYYY
    const now = new Date()
    const sameYear = d.getFullYear()===now.getFullYear()
    const timePart = `${hh}:${mi}`
    if (!sameYear) return `${dd}.${mm}.${yy} ${timePart}`
    // check if midnight (date only) vs datetime
    const hasTime = d.getHours()!==0 || d.getMinutes()!==0 || String(iso).includes("T")
    if (hasTime) return `${dd}.${mm} ${timePart}`
    return `${dd}.${mm}`
  } catch { return String(iso).slice(0,10) }
}

export function heatColorFor(val:number, maxAbs:number=5){
  // dynamic gradient intensity → hsl green/red with opacity based on |val|/maxAbs
  const intensity = Math.min(1, Math.abs(val)/(maxAbs||5))
  if (val>0) return { bg: `rgba(0,255,136,${0.10+intensity*0.32})`, border: `rgba(0,255,136,${0.22+intensity*0.4})`, text: "#00ff88" }
  if (val<0) return { bg: `rgba(255,51,102,${0.10+intensity*0.32})`, border: `rgba(255,51,102,${0.22+intensity*0.4})`, text: "#ff3366" }
  return { bg: "rgba(30,41,59,0.9)", border: "rgba(51,65,85,0.9)", text: "#94a3b8" }
}

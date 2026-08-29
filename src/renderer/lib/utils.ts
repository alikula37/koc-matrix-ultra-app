import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(n: number, decimals = 2) {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function formatPercent(n: number) {
  const sign = n > 0 ? "+" : ""
  return `${sign}${n.toFixed(2)}%`
}

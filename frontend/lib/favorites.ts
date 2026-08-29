"use client"
// Favorites store — localStorage, per-device (spec 2.1)
// DEFAULT_FAVORITES seeds common pairs; user can add custom symbols.

const LS_KEY = "koc_favorites_v1"

export const DEFAULT_FAVORITES = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XU100", "THYAO", "AKBNK", "GARAN", "AAPL"] as const

export function getFavorites(): string[] {
  if (typeof window === "undefined") return [...DEFAULT_FAVORITES]
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return [...DEFAULT_FAVORITES]
    const arr = JSON.parse(raw)
    if (Array.isArray(arr) && arr.length) {
      // normalize
      const norm = [...new Set(arr.map((s: any) => String(s).trim().toUpperCase()).filter(Boolean))]
      return norm.length ? norm : [...DEFAULT_FAVORITES]
    }
  } catch {}
  return [...DEFAULT_FAVORITES]
}

export function setFavorites(list: string[]) {
  const norm = [...new Set(list.map((s) => s.trim().toUpperCase()).filter(Boolean))]
  if (typeof window !== "undefined") {
    localStorage.setItem(LS_KEY, JSON.stringify(norm))
    // notify same-tab listeners
    window.dispatchEvent(new CustomEvent("koc:favorites", { detail: norm }))
  }
  return norm
}

export function addFavorite(symbol: string) {
  const s = symbol.trim().toUpperCase()
  if (!s) return getFavorites()
  const cur = getFavorites()
  if (cur.includes(s)) return cur
  return setFavorites([...cur, s])
}

export function removeFavorite(symbol: string) {
  const s = symbol.trim().toUpperCase()
  return setFavorites(getFavorites().filter((x) => x !== s))
}

export function toggleFavorite(symbol: string) {
  const s = symbol.trim().toUpperCase()
  const cur = getFavorites()
  if (cur.includes(s)) return removeFavorite(s)
  return addFavorite(s)
}

export function isFavorite(symbol: string) {
  return getFavorites().includes(symbol.trim().toUpperCase())
}

export function onFavoritesChange(cb: (list: string[]) => void) {
  if (typeof window === "undefined") return () => {}
  const h = (e: Event) => {
    try {
      const ce = e as CustomEvent
      if (ce.detail) cb(ce.detail)
      else cb(getFavorites())
    } catch { cb(getFavorites()) }
  }
  window.addEventListener("koc:favorites", h)
  window.addEventListener("storage", h as any)
  return () => {
    window.removeEventListener("koc:favorites", h)
    window.removeEventListener("storage", h as any)
  }
}

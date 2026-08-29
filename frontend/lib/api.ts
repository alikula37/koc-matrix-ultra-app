"use client"
// cache-bust 2026-08-29 api BASE 8001
const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"

function authHeaders(): HeadersInit {
  if(typeof window==="undefined") return {}
  const t = localStorage.getItem("access_token")
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const url = `${BASE}${path}`
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...(init.headers||{}) },
  })
  if(!res.ok) {
    const txt = await res.text()
    // 401 -> token expired / not logged in, redirect to login
    if(res.status===401 && typeof window!=="undefined") {
      // don't loop if already on login
      if(!window.location.pathname.includes("/login")) {
        // clear invalid token to avoid lock loop
        // keep enc_token for PIN lock
        localStorage.removeItem("access_token")
      }
    }
    throw new Error(`${res.status}: ${txt.slice(0,500)}`)
  }
  // handle 204 No Content
  if(res.status===204) return null
  const ct = res.headers.get("content-type") || ""
  if(ct.includes("application/json")) return res.json()
  return res.json().catch(()=>null)
}

export const api = {
  health: () => fetch(`${BASE}/api/v1/health`).then(r=>r.json()),
  login: (email:string,password:string) => apiFetch("/api/v1/auth/login",{method:"POST", body: JSON.stringify({email,password})}),
  register: (email:string,password:string,full_name?:string) => apiFetch("/api/v1/auth/register",{method:"POST", body: JSON.stringify({email,password,full_name})}),
  me: () => apiFetch("/api/v1/auth/me"),
  trades: () => apiFetch("/api/v1/trades"),
  createTrade: (data:any) => apiFetch("/api/v1/trades",{method:"POST", body: JSON.stringify(data)}),
  closeTrade: (id:number, payload:{exit_price?:number, exit_quantity?:number, exit_reason?:string}) => apiFetch(`/api/v1/trades/${id}/close`,{method:"POST", body: JSON.stringify(payload)}),
  cancelTrade: (id:number) => apiFetch(`/api/v1/trades/${id}/cancel`,{method:"POST"}),
  deleteTrade: (id:number) => apiFetch(`/api/v1/trades/${id}`,{method:"DELETE"}),
  analytics: (params="") => apiFetch(`/api/v1/analytics/summary${params}`),
  calendar: (year:number, month?:number) => apiFetch(`/api/v1/analytics/heatmap?year=${year}`),
  accounts: () => apiFetch("/api/v1/accounts"),
}

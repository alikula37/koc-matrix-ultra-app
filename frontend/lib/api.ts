"use client"
const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

function authHeaders(): HeadersInit {
  if(typeof window==="undefined") return {}
  const t = localStorage.getItem("access_token")
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...(init.headers||{}) },
  })
  if(!res.ok) {
    const txt = await res.text()
    throw new Error(`${res.status}: ${txt.slice(0,300)}`)
  }
  return res.json()
}

export const api = {
  health: () => fetch(`${BASE}/api/v1/health`).then(r=>r.json()),
  login: (email:string,password:string) => apiFetch("/api/v1/auth/login",{method:"POST", body: JSON.stringify({email,password})}),
  register: (email:string,password:string,full_name?:string) => apiFetch("/api/v1/auth/register",{method:"POST", body: JSON.stringify({email,password,full_name})}),
  me: () => apiFetch("/api/v1/auth/me"),
  trades: () => apiFetch("/api/v1/trades"),
  createTrade: (data:any) => apiFetch("/api/v1/trades",{method:"POST", body: JSON.stringify(data)}),
  analytics: (params="") => apiFetch(`/api/v1/analytics/summary${params}`),
  calendar: (year:number, month?:number) => apiFetch(`/api/v1/analytics/heatmap?year=${year}`),
  accounts: () => apiFetch("/api/v1/accounts"),
}

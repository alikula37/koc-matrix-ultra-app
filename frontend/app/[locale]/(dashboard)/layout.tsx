"use client"
import { Link } from "@/i18n/routing"
import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { isLocked, lock } from "@/lib/auth"
import PinLock from "@/components/PinLock"
import { NavLink } from "@/components/NavLink"
import { LocaleSwitcher } from "@/components/LocaleSwitcher"

export default function DashboardLayout({children}:{children:React.ReactNode}) {
  const tNav = useTranslations("Nav")
  const tBrand = useTranslations("Brand")
  const [locked, setLocked] = useState(false)
  const [checked, setChecked] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  useEffect(()=>{
    setLocked(isLocked())
    setChecked(true)
    // lock on visibility hidden (PWA background) — AES-GCM async
    const onHide = ()=>{ if(document.visibilityState==="hidden") { lock().catch(()=>{}) } }
    document.addEventListener("visibilitychange", onHide)
    return ()=> document.removeEventListener("visibilitychange", onHide)
  },[])
  if(!checked) return null
  return (
    <div className="min-h-screen">
      {locked && <PinLock onUnlock={()=>setLocked(false)} />}
      <header className="sticky top-0 z-40 bg-[#0f172a]/85 backdrop-blur-xl border-b border-[#1e293b] h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-[#00ff88] to-[#00e5ff] flex items-center justify-center font-bold text-black text-xs shadow-[0_0_10px_rgba(0,255,136,.35)]">KM</div>
            <span className="font-bold text-sm tracking-widest hidden sm:inline">{tBrand("name")}</span>
            <span className="font-bold text-sm tracking-widest sm:hidden">KOÇ MATRIX</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1.5">
            <NavLink href="/dashboard">{tNav("dashboard")}</NavLink>
            <NavLink href="/trades">{tNav("trades")}</NavLink>
            <NavLink href="/calendar">{tNav("calendar")}</NavLink>
            <NavLink href="/analytics">{tNav("analytics")}</NavLink>
            <NavLink href="/settings">{tNav("settings")}</NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <span className="hidden lg:inline-flex items-center gap-1.5 text-xs bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88] px-3 py-1 rounded-full shadow-[0_0_8px_rgba(0,255,136,.18)]"><span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] shadow-[0_0_6px_#00ff88] animate-pulse" /> {tNav("live")}</span>
          <Link href="/trades" className="hidden sm:inline-flex bg-[#00ff88] hover:bg-[#00e676] text-black px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-[0_0_12px_rgba(0,255,136,.25)]">{tNav("newTrade")}</Link>
          <button onClick={()=>{ localStorage.removeItem("access_token"); localStorage.removeItem("enc_token"); location.href="/login"}} className="hidden sm:inline-flex text-xs bg-[#1e293b] border border-[#334155] hover:border-[#475569] px-2.5 py-1.5 rounded-lg transition-colors">{tNav("logout")}</button>
          <button aria-label={tNav("menu")} aria-expanded={mobileOpen} onClick={()=>setMobileOpen(v=>!v)} className="md:hidden w-9 h-9 grid place-items-center rounded-lg bg-[#1e293b] border border-[#334155] text-white">
            <span className="text-base leading-none">{mobileOpen ? "✕" : "☰"}</span>
          </button>
        </div>
      </header>
      {mobileOpen && (
        <div className="md:hidden sticky top-14 z-30 bg-[#0f172a]/95 backdrop-blur-xl border-b border-[#1e293b] p-3">
          <nav className="grid grid-cols-2 gap-2">
            <NavLink href="/dashboard">{tNav("dashboard")}</NavLink>
            <NavLink href="/trades">{tNav("trades")}</NavLink>
            <NavLink href="/calendar">{tNav("calendar")}</NavLink>
            <NavLink href="/analytics">{tNav("analytics")}</NavLink>
            <NavLink href="/settings">{tNav("settings")}</NavLink>
          </nav>
          <div className="flex gap-2 mt-3">
            <Link href="/trades" onClick={()=>setMobileOpen(false)} className="flex-1 text-center bg-[#00ff88] text-black py-2 rounded-lg text-xs font-bold">{tNav("newTrade")}</Link>
            <button onClick={()=>{ localStorage.removeItem("access_token"); localStorage.removeItem("enc_token"); location.href="/login"}} className="flex-1 bg-[#1e293b] border border-[#334155] py-2 rounded-lg text-xs">{tNav("logout")}</button>
          </div>
        </div>
      )}
      <main className="max-w-[1400px] mx-auto p-4">{children}</main>
    </div>
  )
}

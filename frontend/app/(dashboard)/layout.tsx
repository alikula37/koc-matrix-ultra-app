"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { isLocked } from "@/lib/auth"
import PinLock from "@/components/PinLock"

export default function DashboardLayout({children}:{children:React.ReactNode}) {
  const [locked, setLocked] = useState(false)
  const [checked, setChecked] = useState(false)
  useEffect(()=>{
    setLocked(isLocked())
    setChecked(true)
    // lock on visibility hidden (PWA background)
    const onHide = ()=>{ if(document.visibilityState==="hidden") { try{ const { lock } = require("@/lib/auth"); lock() } catch{} } }
    document.addEventListener("visibilitychange", onHide)
    return ()=> document.removeEventListener("visibilitychange", onHide)
  },[])
  if(!checked) return null
  return (
    <div className="min-h-screen">
      {locked && <PinLock onUnlock={()=>setLocked(false)} />}
      <header className="sticky top-0 z-40 bg-[#0f172a]/80 backdrop-blur border-b border-[#1e293b] h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-[#00ff88] to-[#00e5ff] flex items-center justify-center font-bold text-black text-xs">KM</div>
            <span className="font-bold text-sm tracking-widest">KOÇ MATRIX ULTRA</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-xs">
            {[["Dashboard","/dashboard"],["İşlemler","/trades"],["Takvim","/calendar"],["Analitik","/analytics"],["Ayarlar","/settings"]].map(([l,h])=>(
              <Link key={h} href={h} className="px-3 py-1.5 rounded-lg hover:bg-[#1e293b] text-[#94a3b8] hover:text-white">{l}</Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-xs bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88] px-3 py-1 rounded-full">● CANLI — WS</span>
          <Link href="/trades" className="bg-[#00ff88] text-black px-3 py-1.5 rounded-lg text-xs font-bold">+ Yeni İşlem</Link>
          <button onClick={()=>{ localStorage.removeItem("access_token"); localStorage.removeItem("enc_token"); location.href="/login"}} className="text-xs bg-[#1e293b] border border-[#334155] px-2 py-1.5 rounded-lg">Çıkış</button>
        </div>
      </header>
      <main className="max-w-[1400px] mx-auto p-4">{children}</main>
    </div>
  )
}

"use client"
import Link from "next/link"
import { useState, useEffect } from "react"

export default function Home() {
  const [apiStatus, setApiStatus] = useState<"checking"|"ok"|"error">("checking")
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/health`)
      .then(r=>r.json()).then(()=>setApiStatus("ok")).catch(()=>setApiStatus("error"))
  }, [])
  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-[#0f172a] border border-[#1e293b] px-4 py-2 rounded-full text-xs">
          <span className={`w-2 h-2 rounded-full ${apiStatus==="ok" ? "bg-[#00ff88] animate-pulse" : apiStatus==="error" ? "bg-[#ff3366]" : "bg-[#ffaa00] animate-pulse"}`}></span>
          <span className="text-[#94a3b8]">API</span>
          <span className="text-white mono">{apiStatus==="ok" ? "Çalışıyor" : apiStatus==="error" ? "Bağlantı yok (docker compose up?)" : "Kontrol..."}</span>
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight">KOÇ MATRIX ULTRA</h1>
        <p className="text-[#00ff88] font-mono text-sm tracking-widest">TRADING JOURNAL & EXECUTION ANALYTICS ENGINE</p>
        <p className="mt-4 text-[#94a3b8] max-w-2xl mx-auto">Production-grade, veri kaybı riski sıfır, PWA + realtime. iPhone/Android/Mac'te aynı anda açık, bir cihazdan işlem ekle — diğerinde anında görünür.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { title: "Dashboard", desc: "Equity curve, Win Rate, PF, Expectancy, Sharpe", href: "/dashboard", color: "from-[#00ff88]/20 to-[#00e5ff]/20 border-[#00ff88]/30" },
          { title: "İşlemler", desc: "CRUD + kısmi çıkış (TP1/TP2/TP3) + edit history", href: "/trades", color: "from-[#ffaa00]/15 to-[#ff3366]/15 border-[#ffaa00]/30" },
          { title: "Takvim", desc: "Günlük Net R heatmap, R/$ toggle, ay kapanış özeti", href: "/calendar", color: "from-[#00e5ff]/15 to-[#7c3aed]/15 border-[#00e5ff]/30" },
        ].map(c=>(
          <Link key={c.href} href={c.href} className={`bg-gradient-to-br ${c.color} border rounded-2xl p-6 hover:scale-[1.02] transition`}>
            <h3 className="font-bold text-white">{c.title}</h3>
            <p className="text-sm text-[#cbd5e1] mt-1">{c.desc}</p>
            <span className="inline-flex mt-4 text-xs bg-black/30 px-3 py-1.5 rounded-full text-white">Aç →</span>
          </Link>
        ))}
      </div>
      <div className="mt-8 bg-[#0f172a] border border-[#1e293b] rounded-xl p-4">
        <h3 className="text-xs font-bold tracking-widest text-white mb-2">HIZLI BAŞLANGIÇ (SIFIR TERMİNAL)</h3>
        <ol className="text-sm text-[#94a3b8] list-decimal pl-5 space-y-1">
          <li>GitHub Releases → <span className="text-white">KoçMatrixUltra.dmg</span> indir</li>
          <li>Sürükle-bırak kur → Uygulamayı aç</li>
          <li>Menü çubuğunda ● Journal Çalışıyor → Uygulamayı Aç</li>
          <li>iPhone’da Tailscale ile aynı adresle bağlan</li>
        </ol>
        <div className="mt-3 flex gap-2">
          <Link href="/dashboard" className="bg-[#00ff88] text-black px-4 py-2 rounded-lg text-sm font-bold">Dashboard’a Git</Link>
          <a href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/docs`} target="_blank" className="bg-[#1e293b] text-white px-4 py-2 rounded-lg text-sm border border-[#334155]">API Docs →</a>
        </div>
      </div>
    </main>
  )
}

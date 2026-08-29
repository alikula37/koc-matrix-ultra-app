"use client"
import { Link } from "@/i18n/routing"
import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { LocaleSwitcher } from "@/components/LocaleSwitcher"

export default function Home() {
  const t = useTranslations("Home")
  const tCommon = useTranslations("Common")
  const tBrand = useTranslations("Brand")
  const [apiStatus, setApiStatus] = useState<"checking"|"ok"|"error">("checking")
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"}/api/v1/health`)
      .then(r=>r.json()).then(()=>setApiStatus("ok")).catch(()=>setApiStatus("error"))
  }, [])
  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex justify-end mb-2">
        <LocaleSwitcher />
      </div>
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-[#0f172a] border border-[#1e293b] px-4 py-2 rounded-full text-xs">
          <span className={`w-2 h-2 rounded-full ${apiStatus==="ok" ? "bg-[#00ff88] animate-pulse" : apiStatus==="error" ? "bg-[#ff3366]" : "bg-[#ffaa00] animate-pulse"}`}></span>
          <span className="text-[#94a3b8]">{t("apiLabel")}</span>
          <span className="text-white mono">{apiStatus==="ok" ? tCommon("apiStatusOk") : apiStatus==="error" ? tCommon("apiStatusError") : tCommon("apiStatusChecking")}</span>
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight">{tBrand("name")}</h1>
        <p className="text-[#00ff88] font-mono text-sm tracking-widest">{tBrand("subtitle")}</p>
        <p className="mt-4 text-[#94a3b8] max-w-2xl mx-auto">{t("description")}</p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: t("cards.dashboardTitle"), desc: t("cards.dashboardDesc"), href: "/dashboard", color: "from-[#00ff88]/20 to-[#00e5ff]/20 border-[#00ff88]/30" },
          { title: t("cards.tradesTitle"), desc: t("cards.tradesDesc"), href: "/trades", color: "from-[#ffaa00]/15 to-[#ff3366]/15 border-[#ffaa00]/30" },
          { title: t("cards.calendarTitle"), desc: t("cards.calendarDesc"), href: "/calendar", color: "from-[#00e5ff]/15 to-[#7c3aed]/15 border-[#00e5ff]/30" },
          { title: t("cards.analyticsTitle"), desc: t("cards.analyticsDesc"), href: "/analytics", color: "from-[#7c3aed]/15 to-[#00ff88]/15 border-[#7c3aed]/30" },
        ].map(c=>(
          <Link key={c.href} href={c.href} className={`bg-gradient-to-br ${c.color} border rounded-2xl p-6 hover:scale-[1.02] transition`}>
            <h3 className="font-bold text-white">{c.title}</h3>
            <p className="text-sm text-[#cbd5e1] mt-1">{c.desc}</p>
            <span className="inline-flex mt-4 text-xs bg-black/30 px-3 py-1.5 rounded-full text-white">{tCommon("open")}</span>
          </Link>
        ))}
      </div>
      <div className="mt-8 bg-[#0f172a] border border-[#1e293b] rounded-xl p-4">
        <h3 className="text-xs font-bold tracking-widest text-white mb-2">{t("quickStart")}</h3>
        <ol className="text-sm text-[#94a3b8] list-decimal pl-5 space-y-1">
          <li>{t("quickStartSteps.1")}</li>
          <li>{t("quickStartSteps.2")}</li>
          <li>{t("quickStartSteps.3")}</li>
          <li>{t("quickStartSteps.4")}</li>
        </ol>
        <div className="mt-3 flex gap-2">
          <Link href="/dashboard" className="bg-[#00ff88] text-black px-4 py-2 rounded-lg text-sm font-bold">{t("goDashboard")}</Link>
          <a href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"}/docs`} target="_blank" className="bg-[#1e293b] text-white px-4 py-2 rounded-lg text-sm border border-[#334155]">{t("apiDocs")}</a>
        </div>
      </div>
    </main>
  )
}

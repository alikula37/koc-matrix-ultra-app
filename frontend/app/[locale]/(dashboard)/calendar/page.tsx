"use client"
import { useEffect, useState, useMemo } from "react"
import { useTranslations, useLocale } from "next-intl"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatR, formatCash, localeToIntl, currencyForLocale } from "@/lib/utils"

export default function CalendarPage() {
  const t = useTranslations("Calendar")
  const tCommon = useTranslations("Common")
  const locale = useLocale() as "tr" | "en" | "de"
  const intlLocale = localeToIntl(locale)
  const cur = currencyForLocale(locale)
  const [year, setYear] = useState(2025)
  const [mode, setMode] = useState<"R"|"cash">("R")
  const [data, setData] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [hovered, setHovered] = useState<{cell:any, x:number, y:number} | null>(null)

  useEffect(()=>{ api.calendar(year).then(setData).catch(()=>setData([])) }, [year])
  const exportPdf = async ()=>{
    const { exportCalendarPdf } = await import("@/lib/pdf")
    await exportCalendarPdf(year, mode, data, locale as "tr" | "en" | "de")
  }

  const byDate: Record<string, any> = Object.fromEntries(data.map(d=>[d.date,d]))

  // compute max abs for dynamic gradient scaling (heatmap dynamic)
  const maxAbs = useMemo(()=>{
    if(!data.length) return mode==="R"? 3 : 5000
    const vals = data.map(d=> mode==="R"? d.total_r : d.total_cash)
    const m = Math.max(...vals.map(v=> Math.abs(v)), 1)
    return m
  }, [data, mode])

  const daysInMonth = (m:number,y:number)=> new Date(y,m+1,0).getDate()
  const monthNames = Array.from({length:12}, (_,i)=> new Date(year,i,1).toLocaleDateString(locale, {month:"long"}))

  // helper for heatmap intensity → background alpha
  const cellStyle = (val:number, has:boolean)=>{
    if(!has) return { background: "#020617", borderColor: "#1e293b", opacity:1 }
    const intensity = Math.min(1, Math.abs(val)/(maxAbs||1))
    // High win dark green, low win light green; high loss dark red, low loss light red
    const alphaBg = 0.14 + intensity*0.36
    const alphaBorder = 0.25 + intensity*0.45
    if(val>0) return { background: `rgba(0,255,136,${alphaBg})`, borderColor:`rgba(0,255,136,${alphaBorder})`, opacity: 0.92 }
    if(val<0) return { background: `rgba(255,51,102,${alphaBg})`, borderColor:`rgba(255,51,102,${alphaBorder})`, opacity: 0.92 }
    return { background:`rgba(30,41,59,0.85)`, borderColor:`rgba(51,65,85,0.9)`, opacity:1 }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#64748b] hidden md:inline">{t("heatmapHint")}</span>
          <button onClick={()=>setMode(mode==="R"?"cash":"R")} className="text-xs bg-[#1e293b] border border-[#334155] px-3 py-1.5 rounded-full">{mode==="R" ? t("modeR") : t("modeCash")}</button>
          <button onClick={exportPdf} className="text-xs bg-[#00ff88] text-black font-bold px-3 py-1.5 rounded-full hover:bg-[#00e5ff]">{t("downloadPdf")}</button>
          <select value={year} onChange={e=>setYear(Number(e.target.value))} className="bg-[#0f172a] border border-[#1e293b] text-xs rounded-lg px-2 py-1.5">
            {[2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        {monthNames.map((name, mi)=>{
          const days = daysInMonth(mi, year)
          const first = new Date(year, mi, 1).getDay()
          const pad = (first+6)%7
          return (
            <Card key={mi} className="overflow-hidden">
              <CardHeader className="py-3"><CardTitle className="text-center text-sm">{name}</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 text-[9px] text-[#64748b] text-center mb-1"><span>{t("days.monday").charAt(0)}</span><span>{t("days.tuesday").charAt(0)}</span><span>{t("days.wednesday").charAt(0)}</span><span>{t("days.thursday").charAt(0)}</span><span>{t("days.friday").charAt(0)}</span><span>{t("days.saturday").charAt(0)}</span><span>{t("days.sunday").charAt(0)}</span></div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({length:pad}).map((_,i)=><div key={"p"+i} />)}
                  {Array.from({length:days}).map((_,d)=>{
                    const date = `${year}-${String(mi+1).padStart(2,"0")}-${String(d+1).padStart(2,"0")}`
                    const cell = byDate[date]
                    const val = cell ? (mode==="R" ? cell.total_r : cell.total_cash) : 0
                    const has = !!cell
                    const style = cellStyle(val, has)
                    const valLabel = has ? (mode==="R"? `${val>0?"+":""}${val.toFixed(1)}R` : `${val>0?"+":""}${Math.round(val).toLocaleString(intlLocale)}`) : ""
                    return (
                      <button
                        key={d}
                        onClick={()=>has && setSelected(cell)}
                        onMouseEnter={(e)=>{
                          if(!has) return
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                          setHovered({ cell, x: rect.left + rect.width/2, y: rect.top })
                        }}
                        onMouseLeave={()=> setHovered(null)}
                        className={`relative aspect-square rounded border flex flex-col items-center justify-center text-[9px] transition-all hover:scale-[1.06] hover:z-10`}
                        style={{ background: style.background as string, borderColor: style.borderColor as string, opacity: style.opacity }}>
                        <span className="mono text-white text-[10px] leading-none">{d+1}</span>
                        {has && <span className={`mono text-[8px] font-bold leading-none mt-0.5 ${val>0?"text-[#00ff88]":val<0?"text-[#ff3366]":"text-[#94a3b8]"}`}>{valLabel}</span>}
                        {has && cell.count>1 && <span className="absolute -top-1 -right-1 bg-[#0f172a] border border-[#1e293b] text-[7px] mono px-1 rounded-full">{cell.count}</span>}
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 justify-center text-[10px] mono">
        <span className="text-[#64748b]">{t("legend.loss")}</span>
        <span className="w-6 h-3 rounded" style={{background:"rgba(255,51,102,0.45)", border:"1px solid rgba(255,51,102,0.6)"}}/>
        <span className="w-6 h-3 rounded bg-[#1e293b] border border-[#334155]"/>
        <span className="w-6 h-3 rounded" style={{background:"rgba(0,255,136,0.45)", border:"1px solid rgba(0,255,136,0.6)"}}/>
        <span className="text-[#64748b]">{t("legend.profit")}</span>
        <span className="ml-2 text-[#64748b]">• {t("legend.intensity", {max: mode==="R"? `${maxAbs.toFixed(1)}R` : `${Math.round(maxAbs).toLocaleString(intlLocale)}${cur}`})}</span>
      </div>

      {/* Hover tooltip — spec 4.1 + 4.2 çift birim */}
      {hovered && (
        <div className="fixed z-40 pointer-events-none" style={{ left: hovered.x, top: hovered.y, transform:"translate(-50%, -100%) translateY(-8px)" }}>
          <div className="bg-[#020617] border border-[#1e293b] rounded-xl shadow-xl p-3 min-w-[220px] max-w-[260px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">{new Date(hovered.cell.date).toLocaleDateString(locale==="tr"?"tr-TR":locale==="de"?"de-DE":"en-US",{weekday:"short", day:"2-digit", month:"long", year:"numeric"})}</span>
              <span className="text-[10px] bg-[#0f172a] border border-[#1e293b] rounded-full px-2 py-0.5 mono">{t("tradeCount", {count: hovered.cell.count})}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2.5">
              <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-2 text-center">
                <div className="text-[9px] tracking-widest text-[#64748b]">R</div>
                <div className={`text-sm font-bold mono ${hovered.cell.total_r>=0?"text-[#00ff88]":"text-[#ff3366]"}`}>{hovered.cell.total_r>0?"+":""}{hovered.cell.total_r.toFixed(2)}R</div>
                <div className="text-[10px] text-[#94a3b8] mono">avg {hovered.cell.avg_r?.toFixed(2) ?? (hovered.cell.total_r/hovered.cell.count).toFixed(2)}R</div>
              </div>
              <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-2 text-center">
                <div className="text-[9px] tracking-widest text-[#64748b]">{cur}</div>
                <div className={`text-sm font-bold mono ${hovered.cell.total_cash>=0?"text-[#00ff88]":"text-[#ff3366]"}`}>{hovered.cell.total_cash>0?"+":""}{Number(hovered.cell.total_cash).toLocaleString(intlLocale, {minimumFractionDigits:2})}{cur}</div>
                <div className="text-[10px] text-[#94a3b8] mono">≈ {(hovered.cell.total_cash/hovered.cell.count).toLocaleString(intlLocale,{maximumFractionDigits:0})}{cur}/trade</div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] mono bg-[#1e293b] border border-[#334155] rounded-full px-2 py-0.5">{t("tooltip.winRate", {value: hovered.cell.win_rate ?? 0})}</span>
              <span className={`text-[11px] mono font-bold ${hovered.cell.total_r>=0?"text-[#00ff88]":"text-[#ff3366]"}`}>{hovered.cell.total_r>=0?"▲":"▼"} {Math.abs(hovered.cell.total_r).toFixed(2)}R {hovered.cell.total_cash>=0?"▲":"▼"} {Math.abs(hovered.cell.total_cash).toLocaleString(intlLocale,{maximumFractionDigits:0})}{cur}</span>
            </div>
            <div className="text-[10px] text-[#64748b] mt-1.5 text-center">{t("tooltip.clickForDetails")}</div>
            <div className="absolute left-1/2 -bottom-1.5 w-3 h-3 bg-[#020617] border-r border-b border-[#1e293b] rotate-45" style={{transform:"translateX(-50%) rotate(45deg)"}}/>
          </div>
        </div>
      )}

      {/* Click modal (selected) */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={()=>setSelected(null)}>
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-5 max-w-md w-full" onClick={e=>e.stopPropagation()}>
            <h3 className="font-bold flex items-center justify-between">{new Date(selected.date).toLocaleDateString(locale, {dateStyle:"long"})} <span className="text-xs bg-[#1e293b] px-2 py-1 rounded-full mono">{t("tradeCount", {count: selected.count})} • {t("tooltip.winRate", {value: selected.win_rate ?? 0})}</span></h3>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-[#020617] border border-[#1e293b] rounded-xl p-3 text-center"><div className="text-xs text-[#64748b]">{t("metrics.r")}</div><div className={`text-lg font-bold mono ${selected.total_r>=0?"text-[#00ff88]":"text-[#ff3366]"}`}>{selected.total_r>0?"+":""}{selected.total_r.toFixed(2)}R</div></div>
              <div className="bg-[#020617] border border-[#1e293b] rounded-xl p-3 text-center"><div className="text-xs text-[#64748b]">{t("metrics.cash",{cur})}</div><div className={`text-lg font-bold mono ${selected.total_cash>=0?"text-[#00ff88]":"text-[#ff3366]"}`}>{Number(selected.total_cash).toLocaleString(intlLocale,{minimumFractionDigits:2})}{cur}</div></div>
            </div>
            <p className="mono text-xs mt-3 text-[#94a3b8]">{t("total", {r: selected.total_r, cash: selected.total_cash})} • {t("tooltip.winRate", {value: selected.win_rate ?? 0})} • avg {(selected.total_r/selected.count).toFixed(2)}R</p>
            <button onClick={()=>setSelected(null)} className="mt-4 w-full bg-[#1e293b] hover:bg-[#334155] text-white py-2 rounded-lg text-sm">{tCommon("close")}</button>
          </div>
        </div>
      )}
    </div>
  )
}

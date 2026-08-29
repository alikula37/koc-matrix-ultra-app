"use client"
// cache-bust: 2026-08-29 dashboard fix for 8001 + defensive
import { useEffect, useState } from "react"
import { useTranslations, useLocale } from "next-intl"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatR, formatCash, localeToIntl, currencyForLocale } from "@/lib/utils"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"

export default function DashboardPage() {
  const t = useTranslations("Dashboard")
  const tCommon = useTranslations("Common")
  const locale = useLocale() as "tr" | "en" | "de"
  const intlLocale = localeToIntl(locale)
  const cur = currencyForLocale(locale)
  const [data, setData] = useState<any>(null)
  const [err, setErr] = useState("")
  const [rMode, setRMode] = useState(true)

  useEffect(() => {
    const tok = typeof window!=="undefined" ? localStorage.getItem("access_token") : null
    const enc = typeof window!=="undefined" ? localStorage.getItem("enc_token") : null
    if(!tok && !enc) { setErr(t("sessionMissing")); return }
    api.analytics().then(d=>{
      if(!d || !d.basic) throw new Error(t("invalidData"))
      setData(d)
    }).catch(e=>{
      const msg = String(e)
      if(msg.includes("401")) setErr(t("sessionExpired"))
      else setErr(msg.slice(0,500))
    })
    const wsProto = (process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8001")
    try {
      const ws = new WebSocket(`${wsProto}/ws/trades`)
      ws.onmessage = (ev) => {
        try { const msg = JSON.parse(ev.data); if(msg.event?.startsWith("trade")) api.analytics().then(setData).catch(()=>{}) } catch {}
      }
      ws.onerror = ()=>{}
      return () => { try{ ws.close()} catch{} }
    } catch {}
  }, [t])

  if(err) return <div className="bg-[#ff3366]/10 border border-[#ff3366]/30 rounded-xl p-6 text-sm text-[#ff3366]">{tCommon("connectionError", {error: err})}</div>
  if(!data) return <div className="text-center py-10 text-[#64748b]">{tCommon("loading")}</div>

  const b = data.basic
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{t("title")}</h1>
        <button onClick={()=>setRMode(v=>!v)} className="text-xs bg-[#1e293b] border border-[#334155] px-3 py-1.5 rounded-full">{rMode ? t("modeR") : t("modeCash")}</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4"><div className="text-[10px] tracking-widest text-[#64748b]">{t("metrics.winRate")}</div><div className="text-xl font-bold mono">{b.win_rate}%</div><div className="text-xs text-[#94a3b8]">{t("metrics.winCount", {win: b.win_count, loss: b.loss_count, total: b.total_trades})}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-[10px] tracking-widest text-[#64748b]">{t("metrics.profitFactor")}</div><div className="text-xl font-bold mono">{b.profit_factor}</div><div className="text-xs text-[#94a3b8]">{t("metrics.expectancyValue", {value: b.expectancy})}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-[10px] tracking-widest text-[#64748b]">{t("metrics.total")}</div><div className={`text-xl font-bold mono ${rMode ? (b.total_r>=0?"text-[#00ff88]":"text-[#ff3366]") : (b.total_cash>=0?"text-[#00ff88]":"text-[#ff3366]")}`}>{rMode ? formatR(b.total_r) : formatCash(b.total_cash, cur, intlLocale)}</div><div className="text-xs text-[#94a3b8]">{t("metrics.avgRR", {value: b.avg_rr, pf: b.profit_factor})}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-[10px] tracking-widest text-[#64748b]">{t("metrics.sharpeSortino")}</div><div className="text-xl font-bold mono">{b.sharpe} / {b.sortino}</div><div className="text-xs text-[#94a3b8]">{t("metrics.drawdownRor", {drawdown: rMode?formatR(b.max_drawdown_r):formatCash(b.max_drawdown_cash, cur, intlLocale), ror: (data.risk_of_ruin*100).toFixed(2)})}</div></CardContent></Card>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <Card className="md:col-span-2"><CardHeader><CardTitle>{t("sections.equityCurve", {mode: rMode?"R":cur})}</CardTitle></CardHeader><CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.equity_curve}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" opacity={0.3}/>
              <XAxis dataKey="date" tick={{fill:"#64748b", fontSize:10}} tickFormatter={(v:string)=>v.slice(5,10)} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:"#64748b", fontSize:10}} axisLine={false} tickLine={false} width={50}/>
              <Tooltip contentStyle={{background:"#020617", border:"1px solid #1e293b", borderRadius:8, fontSize:11}}/>
              <Area type="monotone" dataKey="equity_r" stroke="#00ff88" fill="#00ff88" fillOpacity={0.15} strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>{t("sections.breakdownEmotion")}</CardTitle></CardHeader><CardContent className="space-y-2">
          {Object.entries(data.breakdown.by_emotion || {}).slice(0,6).map(([k,v]:any)=>(
            <div key={k} className="flex items-center justify-between bg-[#020617] border border-[#1e293b] rounded-lg p-2.5">
              <div><div className="text-xs font-bold">{k}</div><div className="text-[11px] text-[#64748b]">{v.count} {t("chart.tradesUnit")}</div></div>
              <div className="text-right"><div className="text-xs mono font-bold">{v.win_rate}% WR</div><div className="text-[11px] mono text-[#94a3b8]">{v.expectancy}R exp</div></div>
            </div>
          ))}
          {Object.keys(data.breakdown.by_emotion||{}).length===0 && <div className="text-xs text-[#64748b]">{t("metrics.noEmotionData")}</div>}
        </CardContent></Card>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <Card><CardHeader><CardTitle>{t("sections.breakdownSetup")}</CardTitle></CardHeader><CardContent className="space-y-2">
          {Object.entries(data.breakdown.by_setup||{}).slice(0,5).map(([k,v]:any)=>(
            <div key={k} className="flex justify-between bg-[#020617] border border-[#1e293b] rounded-lg p-2 text-xs"><span>{k}</span><span className="mono">{v.expectancy}R • {v.win_rate}%</span></div>
          ))}
        </CardContent></Card>
        <Card><CardHeader><CardTitle>{t("sections.breakdownHour")}</CardTitle></CardHeader><CardContent className="space-y-2">
          {Object.entries(data.breakdown.by_hour||{}).slice(0,5).map(([k,v]:any)=>(
            <div key={k} className="flex justify-between bg-[#020617] border border-[#1e293b] rounded-lg p-2 text-xs"><span>{k}</span><span className="mono">{v.expectancy}R</span></div>
          ))}
        </CardContent></Card>
        <Card><CardHeader><CardTitle>{t("sections.breakdownAccount")}</CardTitle></CardHeader><CardContent className="space-y-2">
          {Object.entries(data.breakdown.by_account||{}).map(([k,v]:any)=>(
            <div key={k} className="flex justify-between bg-[#020617] border border-[#1e293b] rounded-lg p-2 text-xs"><span>{t("sections.accountLabel", {id: k})}</span><span className="mono">{v.total_r>0?"+":""}{v.total_r}R</span></div>
          ))}
        </CardContent></Card>
      </div>
    </div>
  )
}

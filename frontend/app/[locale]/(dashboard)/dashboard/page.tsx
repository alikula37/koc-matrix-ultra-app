"use client"
// cache-bust: 2026-08-29 dashboard dual equity + floating + markers + X format + favorites strip
import { useEffect, useState, useMemo } from "react"
import { useTranslations, useLocale } from "next-intl"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatR, formatCash, localeToIntl, currencyForLocale, formatChartDate } from "@/lib/utils"
import { getLivePrices, computeFloatingR, computeFloatingCash } from "@/lib/market"
import { getFavorites } from "@/lib/favorites"
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid, Scatter, ReferenceDot } from "recharts"

type LiveMap = Record<string, { price:number }>

export default function DashboardPage() {
  const t = useTranslations("Dashboard")
  const tCommon = useTranslations("Common")
  const locale = useLocale() as "tr" | "en" | "de"
  const intlLocale = localeToIntl(locale)
  const cur = currencyForLocale(locale)
  const [data, setData] = useState<any>(null)
  const [trades, setTrades] = useState<any[]>([])
  const [err, setErr] = useState("")
  const [rMode, setRMode] = useState(true)
  const [liveMap, setLiveMap] = useState<LiveMap>({})
  const [liveErr, setLiveErr] = useState("")

  const loadAnalytics = async () => {
    const d = await api.analytics()
    if(!d || !d.basic) throw new Error(t("invalidData"))
    setData(d)
  }

  const loadAll = async () => {
    const tok = typeof window!=="undefined" ? localStorage.getItem("access_token") : null
    const enc = typeof window!=="undefined" ? localStorage.getItem("enc_token") : null
    if(!tok && !enc) { setErr(t("sessionMissing")); return }
    try {
      const [an, tr] = await Promise.all([api.analytics(), api.trades().catch(()=>[])])
      if(!an || !an.basic) throw new Error(t("invalidData"))
      setData(an)
      setTrades(Array.isArray(tr)? tr : [])
    } catch(e:any){
      const msg = String(e?.message||e)
      if(msg.includes("401")) setErr(t("sessionExpired"))
      else setErr(msg.slice(0,500))
    }
  }

  // live price polling for OPEN symbols
  useEffect(()=>{
    let cancelled=false
    const tick = async () => {
      const open = trades.filter((x:any)=>x.status==="OPEN")
      const symbols = [...new Set(open.map((x:any)=> String(x.symbol).toUpperCase()))]
      if(symbols.length===0) { setLiveMap({}); return }
      try {
        const m = await getLivePrices(symbols)
        if(!cancelled) { setLiveMap(m as any); setLiveErr("") }
      } catch { if(!cancelled) setLiveErr("live-price-error") }
    }
    tick()
    const id = setInterval(tick, 5000)
    return ()=>{ cancelled=true; clearInterval(id) }
  }, [trades])

  useEffect(()=>{
    loadAll()
    const wsProto = (process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8001")
    try {
      const ws = new WebSocket(`${wsProto}/ws/trades`)
      ws.onmessage = (ev) => {
        try { const msg = JSON.parse(ev.data); if(msg.event?.startsWith("trade")) { loadAll() } } catch {}
      }
      ws.onerror = ()=>{}
      return () => { try{ ws.close()} catch{} }
    } catch {}
  }, [])

  const computed = useMemo(()=>{
    if(!data?.equity_curve) return { chart:[], lastEquityR:0, lastEquityCash:0, floatingR:0, floatingCash:0, openCount:0 }
    const curve = data.equity_curve as any[]
    const lastR = curve.length ? curve[curve.length-1].equity_r : 0
    const lastCash = curve.length ? (curve[curve.length-1].cash ?? 0) : 0
    // compute floating totals from trades OPEN
    const open = trades.filter((x:any)=>x.status==="OPEN")
    let floatingR = 0
    let floatingCash = 0
    let withPriceCount = 0
    for(const tr of open){
      const sym = String(tr.symbol).toUpperCase()
      const lp = liveMap[sym]?.price ?? null
      const fr = computeFloatingR(tr, lp)
      const fc = computeFloatingCash(tr, lp)
      if(fr!=null) { floatingR += fr; withPriceCount++ }
      if(fc!=null) floatingCash += fc
    }
    // build chart data
    const chart = curve.map((p:any)=>{
      const base:any = {
        date: p.date,
        equity_r: p.equity_r,
        equity_r_realized: p.equity_r,
        equity_r_total: p.equity_r,
        equity_cash_realized: p.cash != null ? (()=>{ // running cash equity approx from curve? curve stores per-trade cash but equity_r stores cumulative R; for cash we need cumulative cash
          // Actually curve.cash is per-trade net_pnl_cash, not cumulative. We compute cumulative cash separately.
          return null
        })() : null,
        // for markers
        win: p.win,
        pnl_r: p.pnl_r,
        symbol: p.symbol,
      }
      return base
    })
    // Recompute cumulative cash properly (since curve cash is per-trade pnl_cash, not cumulative — backend sent as per-trade .cash field )
    // We have curve entries with p.cash = net_pnl_cash of that trade (not cumulative). So we need to calc cumulative cash.
    let cumCash = 0
    const chartWithCash = chart.map((pt:any, idx:number)=>{
      const perTradeCash = curve[idx]?.cash ?? 0
      cumCash += perTradeCash ?? 0
      return {
        ...pt,
        equity_cash: Math.round(cumCash*100)/100,
        equity_cash_realized: Math.round(cumCash*100)/100,
        equity_cash_total: Math.round(cumCash*100)/100,
      }
    })
    // push unrealized extension point if open exists
    if(open.length>0){
      const nowIso = new Date().toISOString()
      const lastPt = chartWithCash[chartWithCash.length-1]
      const lastCumR = lastPt ? lastPt.equity_r : 0
      const lastCumCash = lastPt ? lastPt.equity_cash : 0
      const ext:any = {
        date: nowIso,
        // realized stays flat
        equity_r: lastCumR + (rMode ? floatingR : 0), // for single Area legacy? not used
        equity_r_realized: lastCumR,
        equity_r_total: Math.round((lastCumR + floatingR)*1000)/1000,
        equity_cash: lastCumCash + (rMode ? 0 : floatingCash),
        equity_cash_realized: lastCumCash,
        equity_cash_total: Math.round((lastCumCash + floatingCash)*100)/100,
        isOpenImpact: true,
        win: floatingR>=0,
        pnl_r: Math.round(floatingR*1000)/1000,
      }
      chartWithCash.push(ext)
    }
    // For scatter markers we need separate fields: equity_r_win / equity_r_loss positions
    const chartWithMarkers = chartWithCash.map((pt:any, idx:number)=>{
      if(pt.isOpenImpact) return { ...pt, winMarker: null, lossMarker: null, winMarkerCash: null, lossMarkerCash: null }
      const isWin = pt.win === true
      const isLoss = pt.win === false
      if(rMode){
        return {
          ...pt,
          winMarker: isWin ? pt.equity_r : null,
          lossMarker: isLoss ? pt.equity_r : null,
          winMarkerCash: null,
          lossMarkerCash: null,
        }
      } else {
        return {
          ...pt,
          winMarkerCash: isWin ? pt.equity_cash : null,
          lossMarkerCash: isLoss ? pt.equity_cash : null,
          winMarker: null,
          lossMarker: null,
        }
      }
    })
    return { chart: chartWithMarkers, lastEquityR: lastR, lastEquityCash: cumCash, floatingR: Math.round(floatingR*1000)/1000, floatingCash: Math.round(floatingCash*100)/100, openCount: open.length, withPriceCount }
  }, [data, trades, liveMap, rMode])

  if(err) return <div className="bg-[#ff3366]/10 border border-[#ff3366]/30 rounded-xl p-6 text-sm text-[#ff3366]">{tCommon("connectionError", {error: err})}</div>
  if(!data) return <div className="text-center py-10 text-[#64748b]">{tCommon("loading")}</div>

  const b = data.basic
  const chartData = computed.chart
  const floatingR = computed.floatingR
  const floatingCash = computed.floatingCash
  const openCount = computed.openCount

  // favorites strip
  const favs = typeof window!=="undefined" ? getFavorites().slice(0,6) : []
  const favPrices = favs.map(sym => ({ sym, price: liveMap[sym]?.price }))

  const yKeyRealized = rMode ? "equity_r_realized" : "equity_cash_realized"
  const yKeyTotal = rMode ? "equity_r_total" : "equity_cash_total"
  const winKey = rMode ? "winMarker" : "winMarkerCash"
  const lossKey = rMode ? "lossMarker" : "lossMarkerCash"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{t("title")}</h1>
        <div className="flex items-center gap-2">
          {openCount>0 && (
            <span className={`text-[11px] px-2.5 py-1 rounded-full border font-mono font-bold ${floatingR>=0?"bg-[#00ff88]/10 border-[#00ff88]/30 text-[#00ff88]":"bg-[#ff3366]/10 border-[#ff3366]/30 text-[#ff3366]"}`}>
              {rMode? formatR(floatingR) : formatCash(floatingCash, cur, intlLocale)} {t("openImpact", {count: openCount})}
            </span>
          )}
          <button onClick={()=>setRMode(v=>!v)} className="text-xs bg-[#1e293b] border border-[#334155] px-3 py-1.5 rounded-full">{rMode ? t("modeR") : t("modeCash")}</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4"><div className="text-[10px] tracking-widest text-[#64748b]">{t("metrics.winRate")}</div><div className="text-xl font-bold mono">{b.win_rate}%</div><div className="text-xs text-[#94a3b8]">{t("metrics.winCount", {win: b.win_count, loss: b.loss_count, total: b.total_trades})}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-[10px] tracking-widest text-[#64748b]">{t("metrics.profitFactor")}</div><div className="text-xl font-bold mono">{b.profit_factor}</div><div className="text-xs text-[#94a3b8]">{t("metrics.expectancyValue", {value: b.expectancy})}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-[10px] tracking-widest text-[#64748b]">{t("metrics.total")}</div><div className={`text-xl font-bold mono ${rMode ? (b.total_r>=0?"text-[#00ff88]":"text-[#ff3366]") : (b.total_cash>=0?"text-[#00ff88]":"text-[#ff3366]")}`}>{rMode ? formatR(b.total_r) : formatCash(b.total_cash, cur, intlLocale)}</div><div className="text-xs text-[#94a3b8]">{t("metrics.avgRR", {value: b.avg_rr, pf: b.profit_factor})}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-[10px] tracking-widest text-[#64748b]">{t("metrics.sharpeSortino")}</div><div className="text-xl font-bold mono">{b.sharpe} / {b.sortino}</div><div className="text-xs text-[#94a3b8]">{t("metrics.drawdownRor", {drawdown: rMode?formatR(b.max_drawdown_r):formatCash(b.max_drawdown_cash, cur, intlLocale), ror: (data.risk_of_ruin*100).toFixed(2)})}</div></CardContent></Card>
      </div>

      {/* Favorites live strip */}
      {favPrices.length>0 && (
        <Card className="border-[#1e293b]/60"><CardContent className="py-2.5 flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] tracking-widest text-[#64748b] shrink-0">{t("favoritesStrip")}</span>
          {favPrices.map(({sym, price})=> (
            <span key={sym} className="shrink-0 bg-[#020617] border border-[#1e293b] rounded-full px-2.5 py-1 text-xs mono flex items-center gap-1.5">
              <span className="font-bold text-white">{sym}</span>
              <span className={`${price!=null?"text-[#00e5ff]":"text-[#64748b]"}`}>{price!=null ? price.toLocaleString("en-US",{maximumFractionDigits:2}) : "—"}</span>
            </span>
          ))}
          <span className="text-[10px] text-[#64748b] ml-auto hidden md:inline">{liveErr? t("liveError") : t("liveHint")}</span>
        </CardContent></Card>
      )}

      <div className="grid md:grid-cols-3 gap-3">
        <Card className="md:col-span-2"><CardHeader className="flex-row items-center justify-between"><CardTitle>{t("sections.equityCurve", {mode: rMode?"R":cur})}</CardTitle><span className="text-[10px] text-[#64748b]">{t("sections.equityHint")}</span></CardHeader><CardContent className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{left:4,right:12,top:8,bottom:4}}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" opacity={0.3}/>
              <XAxis dataKey="date" tick={{fill:"#64748b", fontSize:10}} tickFormatter={(v:string)=> formatChartDate(v, locale)} axisLine={false} tickLine={false} minTickGap={24}/>
              <YAxis tick={{fill:"#64748b", fontSize:10}} axisLine={false} tickLine={false} width={56} tickFormatter={(v:number)=> rMode? `${v.toFixed(1)}R` : `${v.toFixed(0)}`}/>
              <Tooltip
                contentStyle={{background:"#020617", border:"1px solid #1e293b", borderRadius:8, fontSize:11}}
                labelFormatter={(l:string)=> formatChartDate(l, locale) + " • " + new Date(l).toLocaleTimeString(locale==="tr"?"tr-TR":locale==="de"?"de-DE":"en-US",{hour:"2-digit",minute:"2-digit"})}
                formatter={(value:any, name:any, props:any)=>{
                  const p = props.payload
                  if(name===yKeyRealized) return [rMode? formatR(value) : formatCash(value,cur,intlLocale), t("legendRealized")]
                  if(name===yKeyTotal) return [rMode? formatR(value) : formatCash(value,cur,intlLocale), t("legendUnrealized")]
                  if(name===winKey) return [rMode? formatR(value) : formatCash(value,cur,intlLocale), "● WIN"]
                  if(name===lossKey) return [rMode? formatR(value) : formatCash(value,cur,intlLocale), "● LOSS"]
                  return [String(value), name]
                }}
              />
              {/* Realized equity filled area */}
              <Area type="monotone" dataKey={yKeyRealized} stroke="#00ff88" fill="#00ff88" fillOpacity={0.14} strokeWidth={2} dot={false} />
              {/* Unrealized / Total dashed line — only diverges at last point, but render full line dashed */}
              <Line type="monotone" dataKey={yKeyTotal} stroke={floatingR>=0?"#38bdf8":"#f59e0b"} strokeWidth={2} dot={false} strokeDasharray="6 4" />
              {/* Win markers green */}
              <Scatter dataKey={winKey} fill="#22c55e" />
              {/* Loss markers red */}
              <Scatter dataKey={lossKey} fill="#ef4444" />
            </ComposedChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="flex items-center gap-3 mt-1 text-[10px] mono">
            <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-[#00ff88] inline-block"/><span className="text-[#94a3b8]">{t("legendRealized")}</span></span>
            <span className="flex items-center gap-1.5"><span className={`w-3 h-[2px] inline-block ${floatingR>=0?"bg-[#38bdf8]":"bg-[#f59e0b]"}`} style={{borderTop:"2px dashed currentColor"}}/><span className="text-[#94a3b8]">{t("legendUnrealized")}</span></span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#22c55e] inline-block"/><span className="text-[#94a3b8]">{t("legendWin")}</span></span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#ef4444] inline-block"/><span className="text-[#94a3b8]">{t("legendLoss")}</span></span>
            {openCount>0 && <span className="ml-auto bg-[#38bdf8]/10 border border-[#38bdf8]/30 text-[#38bdf8] px-2 py-0.5 rounded-full">{t("openTradesBadge",{count: openCount, value: rMode? formatR(floatingR): formatCash(floatingCash,cur,intlLocale)})}</span>}
          </div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>{t("sections.breakdownEmotion")}</CardTitle></CardHeader><CardContent className="space-y-2">
          {Object.entries(data.breakdown.by_emotion || {}).slice(0,6).map(([k,v]:any)=>(
            <div key={k} className="flex items-center justify-between bg-[#020617] border border-[#1e293b] rounded-lg p-2.5">
              <div><div className="text-xs font-bold">{k}</div><div className="text-[11px] text-[#64748b]">{v.count} {t("chart.tradesUnit")}</div></div>
              <div className="text-right"><div className="text-xs mono font-bold">{v.win_rate}% WR</div><div className="text-[11px] mono text-[#94a3b8]">{v.expectancy}R exp</div></div>
            </div>
          ))}
          {Object.keys(data.breakdown.by_emotion||{}).length===0 && <div className="text-xs text-[#64748b]">{t("metrics.noEmotionData")}</div>}
          {data.open_trades && <div className="mt-3 bg-[#38bdf8]/5 border border-[#38bdf8]/20 rounded-lg p-2.5 text-xs"><div className="font-bold text-[#38bdf8]">{t("openTradesTitle",{count: data.open_trades.count})}</div><div className="mono text-[#94a3b8]">{data.open_trades.symbols?.join(" • ") || "—"}</div><div className={`mono font-bold ${floatingR>=0?"text-[#00ff88]":"text-[#ff3366]"}`}>{t("openImpactValue",{value: rMode? formatR(floatingR): formatCash(floatingCash,cur,intlLocale)})}</div></div>}
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

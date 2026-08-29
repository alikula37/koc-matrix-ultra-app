"use client"
import { useEffect, useState, useMemo } from "react"
import { useTranslations, useLocale } from "next-intl"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { localeToIntl, currencyForLocale, formatCash, formatR } from "@/lib/utils"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts"

export default function AnalyticsPage() {
  const t = useTranslations("Analytics")
  const tCommon = useTranslations("Common")
  const locale = useLocale() as "tr" | "en" | "de"
  const intlLocale = localeToIntl(locale)
  const cur = currencyForLocale(locale)
  const [data, setData]=useState<any>(null)
  const [period, setPeriod]=useState<any>(null)
  useEffect(()=>{
    api.analytics().then(setData).catch(()=>{})
    fetch(`${process.env.NEXT_PUBLIC_API_URL||"http://localhost:8001"}/api/v1/analytics/period-summary?period=monthly`,{headers:{Authorization:`Bearer ${localStorage.getItem("access_token")||""}`}}).then(r=>r.json()).then(setPeriod).catch(()=>{})
  },[])
  if(!data) return <div className="py-10 text-center text-[#64748b]">{tCommon("loading")}</div>
  const exportPdf = async () => {
    const { exportAnalyticsPdf } = await import("@/lib/pdf")
    await exportAnalyticsPdf(data, period, locale)
  }

  const bySymbol = Object.entries(data.breakdown.by_symbol||{}).map(([k,v]:any)=>({name:k, ...v}))
  const byDirection = Object.entries(data.breakdown.by_direction||{}).map(([k,v]:any)=>({name:k, ...v}))
  const bySetup = Object.entries(data.breakdown.by_setup||{}).map(([k,v]:any)=>({name:k, ...v}))
  const byWeekday = Object.entries(data.breakdown.by_weekday||{}).map(([k,v]:any)=>({name:k,...v}))
  const byHour = Object.entries(data.breakdown.by_hour||{}).map(([k,v]:any)=>({name:k,...v}))
  const byEmotion = Object.entries(data.breakdown.by_emotion||{}).map(([k,v]:any)=>({name:k,...v}))

  // sort helpers
  const topSymbols = [...bySymbol].sort((a,b)=> b.total_r - a.total_r)
  const longShort = byDirection

  return (
    <div className="space-y-4 print:bg-white">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg font-bold">{t("title")}</h1>
        <div className="flex gap-2 flex-wrap">
          <button onClick={exportPdf} className="text-xs bg-[#00ff88] text-black font-bold px-3 py-1.5 rounded-full hover:bg-[#00e5ff]">{t("downloadPdf")}</button>
          <button onClick={()=>window.print()} className="text-xs bg-[#1e293b] border border-[#334155] px-3 py-1.5 rounded-full">{t("print")}</button>
          {period && <span className="text-xs bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88] px-3 py-1.5 rounded-full">{t("summary", {r: period.basic?.total_r ?? 0, cash: Number(period.basic?.total_cash ?? 0).toLocaleString(intlLocale), setup: period.best_setup || "-"})}</span>}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <Card><CardHeader><CardTitle>{t("sections.expectancyPayoff")}</CardTitle></CardHeader><CardContent className="text-sm space-y-1 mono">
          <div>{t("metrics.expectancy")}: <span className="text-[#00ff88] font-bold">{data.basic.expectancy}R</span></div>
          <div>{t("details.profitFactor", {value: data.basic.profit_factor})}</div>
          <div>{t("details.avgWinLoss", {win: data.basic.avg_win_r, loss: data.basic.avg_loss_r})}</div>
          <div>{t("details.rrDeviation", {value: data.basic.rr_deviation})}</div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>{t("details.risk")}</CardTitle></CardHeader><CardContent className="text-sm space-y-1 mono">
          <div>{t("details.sharpeSortino", {sharpe: data.basic.sharpe, sortino: data.basic.sortino})}</div>
          <div>{t("details.maxDD", {r: data.basic.max_drawdown_r, cash: formatCash(data.basic.max_drawdown_cash, cur, intlLocale)})}</div>
          <div>{t("details.riskOfRuin", {value: (data.risk_of_ruin*100).toFixed(2)})}</div>
          <div>{t("details.streak", {wins: data.basic.consecutive_wins, losses: data.basic.consecutive_losses})}</div>
        </CardContent></Card>
      </div>

      {/* Symbol breakdown */}
      <Card>
        <CardHeader className="flex-row items-center justify-between"><CardTitle>{t("sections.bySymbol")}</CardTitle><span className="text-[11px] text-[#64748b]">{t("sections.bySymbolHint")}</span></CardHeader>
        <CardContent>
          {bySymbol.length===0 ? <div className="text-xs text-[#64748b]">{tCommon("noData")}</div> : (
            <>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topSymbols.slice(0,8)} layout="vertical" margin={{left:60, right:12}}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" opacity={0.25} />
                    <XAxis type="number" tick={{fill:"#64748b", fontSize:10}} axisLine={false} tickLine={false}/>
                    <YAxis type="category" dataKey="name" tick={{fill:"#94a3b8", fontSize:11, fontWeight:700}} axisLine={false} tickLine={false} width={64}/>
                    <Tooltip contentStyle={{background:"#020617", border:"1px solid #1e293b", borderRadius:8, fontSize:11}} formatter={(v:any)=>[`${v>0?"+":""}${v}R`, "PnL"]}/>
                    <Bar dataKey="total_r" radius={[0,6,6,0]}>
                      {topSymbols.slice(0,8).map((e, idx)=><Cell key={idx} fill={e.total_r>=0?"#00ff88":"#ff3366"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid md:grid-cols-3 gap-2 mt-3">
                {topSymbols.map((s)=>(
                  <div key={s.name} className="bg-[#020617] border border-[#1e293b] rounded-lg p-2.5 flex justify-between items-center">
                    <div><div className="text-xs font-bold mono">{s.name}</div><div className="text-[11px] text-[#64748b]">{s.count} trades • PF {s.profit_factor}</div></div>
                    <div className="text-right"><div className={`text-sm mono font-bold ${s.total_r>=0?"text-[#00ff88]":"text-[#ff3366]"}`}>{s.total_r>0?"+":""}{s.total_r}R</div><div className="text-[11px] mono text-[#94a3b8]">{s.win_rate}% WR • {s.expectancy}R</div></div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-3">
        {/* Long vs Short */}
        <Card>
          <CardHeader><CardTitle>{t("sections.longShort")}</CardTitle></CardHeader>
          <CardContent>
            {longShort.length===0 ? <div className="text-xs text-[#64748b]">{tCommon("noData")}</div> : (
              <>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={longShort}>
                      <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" opacity={0.25}/>
                      <XAxis dataKey="name" tick={{fill:"#94a3b8", fontSize:12, fontWeight:700}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fill:"#64748b", fontSize:10}} axisLine={false} tickLine={false}/>
                      <Tooltip contentStyle={{background:"#020617", border:"1px solid #1e293b", borderRadius:8}} formatter={(v:any, n:any)=> v===undefined? ["-",""] : n==="total_r"? [`${v}R`,"Total R"] : n==="expectancy"? [`${v}R`,"Expectancy"] : [`${v}%`,"Win Rate"]}/>
                      <Bar dataKey="total_r" fill="#00e5ff" radius={[6,6,0,0]} name="total_r"/>
                      <Bar dataKey="expectancy" fill="#00ff88" radius={[6,6,0,0]} name="expectancy"/>
                      <Bar dataKey="win_rate" fill="#ffaa00" radius={[6,6,0,0]} name="win_rate"/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {longShort.map((d:any)=>(
                    <div key={d.name} className="bg-[#020617] border border-[#1e293b] rounded-lg p-3 text-center">
                      <div className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${d.name==="LONG"?"bg-[#00ff88] text-black":"bg-[#ff3366] text-white"}`}>{d.name}</div>
                      <div className="mono text-xs mt-2 space-y-0.5">
                        <div className={d.total_r>=0?"text-[#00ff88]":"text-[#ff3366]"}>{d.total_r>0?"+":""}{d.total_r}R • PF {d.profit_factor}</div>
                        <div className="text-[#94a3b8]">{d.win_rate}% WR • {d.expectancy}R exp • {d.count} trades</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Setup breakdown */}
        <Card>
          <CardHeader className="flex-row items-center justify-between"><CardTitle>{t("sections.bySetup")}</CardTitle><span className="text-[11px] text-[#64748b]">{t("sections.bySetupHint")}</span></CardHeader>
          <CardContent>
            {bySetup.length===0 ? <div className="text-xs text-[#64748b]">{tCommon("noData")}</div> : (
              <>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[...bySetup].sort((a,b)=>b.expectancy - a.expectancy).slice(0,6)}>
                      <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" opacity={0.25}/>
                      <XAxis dataKey="name" tick={{fill:"#94a3b8", fontSize:10}} axisLine={false} tickLine={false} interval={0} angle={-12} dy={10} height={36}/>
                      <YAxis tick={{fill:"#64748b", fontSize:10}} axisLine={false} tickLine={false}/>
                      <Tooltip contentStyle={{background:"#020617", border:"1px solid #1e293b", borderRadius:8}}/>
                      <Bar dataKey="expectancy" radius={[6,6,0,0]}>
                        {bySetup.slice(0,6).map((e, idx)=> <Cell key={idx} fill={e.expectancy>=0?"#00ff88":"#ff3366"} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1 mt-2">
                  {[...bySetup].sort((a,b)=>b.total_r - a.total_r).map((s:any)=>(
                    <div key={s.name} className="flex justify-between bg-[#020617] border border-[#1e293b] rounded px-2 py-1.5 text-xs">
                      <span className="font-bold">{s.name}</span><span className="mono">{s.total_r>0?"+":""}{s.total_r}R • {s.win_rate}% • {s.expectancy}R • {s.count}×</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Time breakdowns: weekday + hour */}
      <Card><CardHeader><CardTitle>{t("sections.timeBreakdown")}</CardTitle></CardHeader><CardContent className="grid md:grid-cols-2 gap-4 text-xs">
        <div>
          <div className="font-bold mb-2 flex items-center justify-between">{t("details.day")} <span className="text-[10px] text-[#64748b] font-normal">{t("sections.dayHint")}</span></div>
          <div className="h-[180px] mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byWeekday}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" opacity={0.25}/>
                <XAxis dataKey="name" tick={{fill:"#94a3b8", fontSize:10}} axisLine={false} tickLine={false} interval={0}/>
                <YAxis tick={{fill:"#64748b", fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{background:"#020617", border:"1px solid #1e293b", borderRadius:8}}/>
                <Bar dataKey="win_rate" fill="#38bdf8" radius={[4,4,0,0]} name="win_rate"/>
                <Bar dataKey="expectancy" fill="#00ff88" radius={[4,4,0,0]} name="expectancy"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {byWeekday.map(([k,v]:any)=> false && null)}
          {Object.entries(data.breakdown.by_weekday||{}).map(([k,v]:any)=><div key={k} className="flex justify-between bg-[#020617] border border-[#1e293b] rounded px-2 py-1 mb-1"><span>{k}</span><span className="mono">{v.win_rate}% • {v.expectancy}R • {v.count}× {v.total_r>0?`+${v.total_r}R`:`${v.total_r}R`}</span></div>)}
          {Object.keys(data.breakdown.by_weekday||{}).length===0 && <div className="text-xs text-[#64748b]">{tCommon("noData")}</div>}
        </div>
        <div>
          <div className="font-bold mb-2 flex items-center justify-between">{t("details.hour")} <span className="text-[10px] text-[#64748b] font-normal">Europe/Istanbul</span></div>
          <div className="h-[180px] mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byHour.slice(0,12)}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" opacity={0.25}/>
                <XAxis dataKey="name" tick={{fill:"#94a3b8", fontSize:9}} axisLine={false} tickLine={false} interval={0} angle={-14} dy={8} height={30}/>
                <YAxis tick={{fill:"#64748b", fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{background:"#020617", border:"1px solid #1e293b", borderRadius:8}}/>
                <Bar dataKey="win_rate" fill="#ffaa00" radius={[4,4,0,0]} name="win_rate"/>
                <Bar dataKey="expectancy" fill="#00ff88" radius={[4,4,0,0]} name="expectancy"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {Object.entries(data.breakdown.by_hour||{}).map(([k,v]:any)=><div key={k} className="flex justify-between bg-[#020617] border border-[#1e293b] rounded px-2 py-1 mb-1"><span>{k}</span><span className="mono">{v.win_rate}% • {v.expectancy}R</span></div>)}
          {Object.keys(data.breakdown.by_hour||{}).length===0 && <div className="text-xs text-[#64748b]">{tCommon("noData")}</div>}
        </div>
      </CardContent></Card>

      {/* Emotion + Indicator quick */}
      <div className="grid md:grid-cols-2 gap-3">
        <Card><CardHeader><CardTitle>{t("sections.byEmotion")}</CardTitle></CardHeader><CardContent className="space-y-1">
          {byEmotion.slice(0,6).map((e:any)=>(
            <div key={e.name} className="flex justify-between bg-[#020617] border border-[#1e293b] rounded px-2 py-1.5 text-xs"><span>{e.name}</span><span className="mono">{e.win_rate}% • {e.expectancy}R • {e.total_r>0?"+":""}{e.total_r}R</span></div>
          ))}
          {byEmotion.length===0 && <div className="text-xs text-[#64748b]">{tCommon("noData")}</div>}
        </CardContent></Card>
        <Card><CardHeader><CardTitle>{t("sections.byIndicator")}</CardTitle></CardHeader><CardContent className="space-y-1">
          {Object.entries(data.breakdown.by_indicator||{}).slice(0,6).map(([k,v]:any)=><div key={k} className="flex justify-between bg-[#020617] border border-[#1e293b] rounded px-2 py-1.5 text-xs"><span>{k}</span><span className="mono">{(v as any).win_rate}% • {(v as any).expectancy}R</span></div>)}
          {Object.keys(data.breakdown.by_indicator||{}).length===0 && <div className="text-xs text-[#64748b]">{tCommon("noData")}</div>}
        </CardContent></Card>
      </div>
    </div>
  )
}

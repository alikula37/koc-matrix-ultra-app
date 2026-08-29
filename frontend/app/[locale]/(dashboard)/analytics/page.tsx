"use client"
import { useEffect, useState } from "react"
import { useTranslations, useLocale } from "next-intl"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { localeToIntl, currencyForLocale, formatCash } from "@/lib/utils"

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
  return (
    <div className="space-y-4 print:bg-white">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{t("title")}</h1>
        <div className="flex gap-2">
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
      <Card><CardHeader><CardTitle>{t("sections.timeBreakdown")}</CardTitle></CardHeader><CardContent className="grid md:grid-cols-2 gap-4 text-xs">
        <div><div className="font-bold mb-2">{t("details.day")}</div>{Object.entries(data.breakdown.by_weekday||{}).map(([k,v]:any)=><div key={k} className="flex justify-between bg-[#020617] border border-[#1e293b] rounded px-2 py-1 mb-1"><span>{k}</span><span className="mono">{v.win_rate}% • {v.expectancy}R</span></div>)}</div>
        <div><div className="font-bold mb-2">{t("details.hour")}</div>{Object.entries(data.breakdown.by_hour||{}).map(([k,v]:any)=><div key={k} className="flex justify-between bg-[#020617] border border-[#1e293b] rounded px-2 py-1 mb-1"><span>{k}</span><span className="mono">{v.win_rate}% • {v.expectancy}R</span></div>)}</div>
      </CardContent></Card>
    </div>
  )
}

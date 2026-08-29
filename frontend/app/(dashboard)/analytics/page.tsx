"use client"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AnalyticsPage() {
  const [data, setData]=useState<any>(null)
  const [period, setPeriod]=useState<any>(null)
  useEffect(()=>{
    api.analytics().then(setData).catch(()=>{})
    // period summary for PDF
    fetch(`${process.env.NEXT_PUBLIC_API_URL||"http://localhost:8000"}/api/v1/analytics/period-summary?period=monthly`,{headers:{Authorization:`Bearer ${localStorage.getItem("access_token")||""}`}}).then(r=>r.json()).then(setPeriod).catch(()=>{})
  },[])
  if(!data) return <div className="py-10 text-center text-[#64748b]">Yükleniyor…</div>
  const exportPdf = async () => {
    const { exportAnalyticsPdf } = await import("@/lib/pdf")
    await exportAnalyticsPdf(data, period)
  }
  return (
    <div className="space-y-4 print:bg-white">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Gelişmiş Analitik — R & ₺ Paralel</h1>
        <div className="flex gap-2">
          <button onClick={exportPdf} className="text-xs bg-[#00ff88] text-black font-bold px-3 py-1.5 rounded-full hover:bg-[#00e5ff]">📄 PDF İndir (jsPDF)</button>
          <button onClick={()=>window.print()} className="text-xs bg-[#1e293b] border border-[#334155] px-3 py-1.5 rounded-full">Print</button>
          {period && <span className="text-xs bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88] px-3 py-1.5 rounded-full">Bu Ay: {period.basic?.total_r}R / {period.basic?.total_cash}₺ • En iyi setup: {period.best_setup||"-"}</span>}
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <Card><CardHeader><CardTitle>EXPECTANCY & PAYOFF</CardTitle></CardHeader><CardContent className="text-sm space-y-1 mono">
          <div>Expectancy: <span className="text-[#00ff88] font-bold">{data.basic.expectancy}R</span></div>
          <div>Profit Factor: {data.basic.profit_factor}</div>
          <div>Ort. Kazanç {data.basic.avg_win_r}R vs Ort. Kayıp {data.basic.avg_loss_r}R</div>
          <div>RR Sapma: {data.basic.rr_deviation}</div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>RISK</CardTitle></CardHeader><CardContent className="text-sm space-y-1 mono">
          <div>Sharpe {data.basic.sharpe} • Sortino {data.basic.sortino}</div>
          <div>Max DD {data.basic.max_drawdown_r}R / {data.basic.max_drawdown_cash}₺</div>
          <div>Risk of Ruin {(data.risk_of_ruin*100).toFixed(2)}%</div>
          <div>Streak {data.basic.consecutive_wins}W / {data.basic.consecutive_losses}L</div>
        </CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle>ZAMAN KIRILIMI — Gün / Saat (İST)</CardTitle></CardHeader><CardContent className="grid md:grid-cols-2 gap-4 text-xs">
        <div><div className="font-bold mb-2">Gün</div>{Object.entries(data.breakdown.by_weekday||{}).map(([k,v]:any)=><div key={k} className="flex justify-between bg-[#020617] border border-[#1e293b] rounded px-2 py-1 mb-1"><span>{k}</span><span className="mono">{v.win_rate}% • {v.expectancy}R</span></div>)}</div>
        <div><div className="font-bold mb-2">Saat</div>{Object.entries(data.breakdown.by_hour||{}).map(([k,v]:any)=><div key={k} className="flex justify-between bg-[#020617] border border-[#1e293b] rounded px-2 py-1 mb-1"><span>{k}</span><span className="mono">{v.win_rate}% • {v.expectancy}R</span></div>)}</div>
      </CardContent></Card>
    </div>
  )
}

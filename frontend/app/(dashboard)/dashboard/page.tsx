"use client"
// cache-bust: 2026-08-29 dashboard fix for 8001 + defensive
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatR, formatCash } from "@/lib/utils"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)
  const [err, setErr] = useState("")
  const [rMode, setRMode] = useState(true)

  useEffect(() => {
    const tok = typeof window!=="undefined" ? localStorage.getItem("access_token") : null
    const enc = typeof window!=="undefined" ? localStorage.getItem("enc_token") : null
    if(!tok && !enc) { setErr("Oturum yok — /login ile giriş yapın"); return }
    api.analytics().then(d=>{
      // guard: backend returns {basic, breakdown, equity_curve} ; if not, show error
      if(!d || !d.basic) throw new Error("Geçersiz analytics verisi")
      setData(d)
    }).catch(e=>{
      const msg = String(e)
      if(msg.includes("401")) setErr("Oturum süresi doldu — tekrar giriş yapın")
      else setErr(msg.slice(0,500))
    })
    // WS realtime
    const wsProto = (process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8001")
    try {
      const ws = new WebSocket(`${wsProto}/ws/trades`)
      ws.onmessage = (ev) => {
        try { const msg = JSON.parse(ev.data); if(msg.event?.startsWith("trade")) api.analytics().then(setData).catch(()=>{}) } catch {}
      }
      ws.onerror = ()=>{}
      return () => { try{ ws.close()} catch{} }
    } catch {}
  }, [])

  if(err) return <div className="bg-[#ff3366]/10 border border-[#ff3366]/30 rounded-xl p-6 text-sm text-[#ff3366]">Bağlantı hatası: {err} — <span className="text-[#94a3b8]">docker compose up ile backend’i ayağa kaldırın.</span></div>
  if(!data) return <div className="text-center py-10 text-[#64748b]">Yükleniyor…</div>

  const b = data.basic
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Dashboard — Execution Analytics</h1>
        <button onClick={()=>setRMode(v=>!v)} className="text-xs bg-[#1e293b] border border-[#334155] px-3 py-1.5 rounded-full">{rMode ? "R Modu" : "₺/$ Modu"}</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4"><div className="text-[10px] tracking-widest text-[#64748b]">WIN RATE</div><div className="text-xl font-bold mono">{b.win_rate}%</div><div className="text-xs text-[#94a3b8]">{b.win_count}W / {b.loss_count}L — {b.total_trades} işlem</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-[10px] tracking-widest text-[#64748b]">PROFIT FACTOR</div><div className="text-xl font-bold mono">{b.profit_factor}</div><div className="text-xs text-[#94a3b8]">Expectancy {b.expectancy}R</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-[10px] tracking-widest text-[#64748b]">TOPLAM</div><div className={`text-xl font-bold mono ${rMode ? (b.total_r>=0?"text-[#00ff88]":"text-[#ff3366]") : (b.total_cash>=0?"text-[#00ff88]":"text-[#ff3366]")}`}>{rMode ? formatR(b.total_r) : formatCash(b.total_cash)}</div><div className="text-xs text-[#94a3b8]">Ort. RR {b.avg_rr} — PF {b.profit_factor}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-[10px] tracking-widest text-[#64748b]">SHARPE / SORTINO</div><div className="text-xl font-bold mono">{b.sharpe} / {b.sortino}</div><div className="text-xs text-[#94a3b8]">DD {rMode?formatR(b.max_drawdown_r):formatCash(b.max_drawdown_cash)} • RoR {(data.risk_of_ruin*100).toFixed(2)}%</div></CardContent></Card>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <Card className="md:col-span-2"><CardHeader><CardTitle>EQUITY CURVE ({rMode?"R":"₺"} )</CardTitle></CardHeader><CardContent className="h-[300px]">
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
        <Card><CardHeader><CardTitle>BREAKDOWN — DUYGU</CardTitle></CardHeader><CardContent className="space-y-2">
          {Object.entries(data.breakdown.by_emotion || {}).slice(0,6).map(([k,v]:any)=>(
            <div key={k} className="flex items-center justify-between bg-[#020617] border border-[#1e293b] rounded-lg p-2.5">
              <div><div className="text-xs font-bold">{k}</div><div className="text-[11px] text-[#64748b]">{v.count} işlem</div></div>
              <div className="text-right"><div className="text-xs mono font-bold">{v.win_rate}% WR</div><div className="text-[11px] mono text-[#94a3b8]">{v.expectancy}R exp</div></div>
            </div>
          ))}
          {Object.keys(data.breakdown.by_emotion||{}).length===0 && <div className="text-xs text-[#64748b]">Veri yok — işlem ekle</div>}
        </CardContent></Card>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <Card><CardHeader><CardTitle>SETUP BAZLI</CardTitle></CardHeader><CardContent className="space-y-2">
          {Object.entries(data.breakdown.by_setup||{}).slice(0,5).map(([k,v]:any)=>(
            <div key={k} className="flex justify-between bg-[#020617] border border-[#1e293b] rounded-lg p-2 text-xs"><span>{k}</span><span className="mono">{v.expectancy}R • {v.win_rate}%</span></div>
          ))}
        </CardContent></Card>
        <Card><CardHeader><CardTitle>SAAT DİLİMİ (İST)</CardTitle></CardHeader><CardContent className="space-y-2">
          {Object.entries(data.breakdown.by_hour||{}).slice(0,5).map(([k,v]:any)=>(
            <div key={k} className="flex justify-between bg-[#020617] border border-[#1e293b] rounded-lg p-2 text-xs"><span>{k}</span><span className="mono">{v.expectancy}R</span></div>
          ))}
        </CardContent></Card>
        <Card><CardHeader><CardTitle>HESAP BAZLI</CardTitle></CardHeader><CardContent className="space-y-2">
          {Object.entries(data.breakdown.by_account||{}).map(([k,v]:any)=>(
            <div key={k} className="flex justify-between bg-[#020617] border border-[#1e293b] rounded-lg p-2 text-xs"><span>Hesap #{k}</span><span className="mono">{v.total_r>0?"+":""}{v.total_r}R</span></div>
          ))}
        </CardContent></Card>
      </div>
    </div>
  )
}

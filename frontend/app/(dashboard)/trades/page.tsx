"use client"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function TradesPage() {
  const [trades, setTrades] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<any>({ symbol:"BTCUSDT", direction:"LONG", entry_price:67000, stop_loss:66000, take_profit_1:69000, position_size:0.1, account_id:1, entry_date: new Date().toISOString().slice(0,16), commission_fees:0 })

  const load = ()=> api.trades().then(setTrades).catch(()=>{})
  useEffect(()=>{ load(); const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000"; try{ const ws=new WebSocket(`${wsUrl}/ws/trades`); ws.onmessage=(e)=>{ if(e.data.includes("trade")) load() }; return()=>ws.close()}catch{} }, [])

  const submit = async(e:React.FormEvent)=>{ e.preventDefault(); await api.createTrade({...form, entry_date: new Date(form.entry_date).toISOString()}); setShowForm(false); load() }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">İşlemler</h1>
        <Button onClick={()=>setShowForm(v=>!v)}>{showForm?"Kapat":"+ Yeni İşlem"}</Button>
      </div>

      {showForm && (
        <Card><CardHeader><CardTitle>YENİ TRADE</CardTitle></CardHeader><CardContent>
          <form onSubmit={submit} className="grid md:grid-cols-3 gap-3 text-sm">
            <label className="space-y-1"><span className="text-xs text-[#64748b]">Sembol</span><input value={form.symbol} onChange={e=>setForm({...form,symbol:e.target.value})} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 mono"/></label>
            <label className="space-y-1"><span className="text-xs text-[#64748b]">Yön</span><select value={form.direction} onChange={e=>setForm({...form,direction:e.target.value})} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2"><option>LONG</option><option>SHORT</option></select></label>
            <label className="space-y-1"><span className="text-xs text-[#64748b]">Giriş Fiyatı</span><input type="number" step="0.01" value={form.entry_price} onChange={e=>setForm({...form,entry_price:parseFloat(e.target.value)})} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 mono"/></label>
            <label className="space-y-1"><span className="text-xs text-[#64748b]">Stop</span><input type="number" step="0.01" value={form.stop_loss} onChange={e=>setForm({...form,stop_loss:parseFloat(e.target.value)})} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 mono"/></label>
            <label className="space-y-1"><span className="text-xs text-[#64748b]">TP1</span><input type="number" step="0.01" value={form.take_profit_1} onChange={e=>setForm({...form,take_profit_1:parseFloat(e.target.value)})} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 mono"/></label>
            <label className="space-y-1"><span className="text-xs text-[#64748b]">Miktar</span><input type="number" step="0.01" value={form.position_size} onChange={e=>setForm({...form,position_size:parseFloat(e.target.value)})} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 mono"/></label>
            <label className="space-y-1"><span className="text-xs text-[#64748b]">Hesap ID</span><input type="number" value={form.account_id} onChange={e=>setForm({...form,account_id:parseInt(e.target.value)})} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 mono"/></label>
            <label className="space-y-1"><span className="text-xs text-[#64748b]">Giriş Tarihi</span><input type="datetime-local" value={form.entry_date} onChange={e=>setForm({...form,entry_date:e.target.value})} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 mono"/></label>
            <label className="space-y-1"><span className="text-xs text-[#64748b]">Not (Markdown)</span><input placeholder="Kurulum notu" onChange={e=>setForm({...form,trade_setup_notes:e.target.value})} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2"/></label>
            <div className="md:col-span-3"><Button type="submit" className="w-full">Kaydet — OpenAPI sabit sözleşme</Button></div>
          </form>
        </CardContent></Card>
      )}

      <Card>
        <CardHeader><CardTitle>AÇIK & KAPALI İŞLEMLER ({trades.length})</CardTitle></CardHeader>
        <CardContent className="divide-y divide-[#1e293b]/50">
          {trades.length===0 && <div className="text-xs text-[#64748b] py-6 text-center">Henüz işlem yok — seed için backend/tests/seed.py çalıştır veya yukarıdan ekle.</div>}
          {trades.map((t:any)=>(
            <div key={t.id} className="py-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2"><span className="mono text-sm font-bold text-white">{t.symbol}</span><span className={`text-[10px] px-2 py-0.5 rounded font-bold ${t.direction==="LONG"?"bg-[#00ff88] text-black":"bg-[#ff3366] text-white"}`}>{t.direction}</span><span className={`text-[10px] px-2 py-0.5 rounded border ${t.status==="OPEN"?"border-[#ffaa00] text-[#ffaa00]":t.status==="CLOSED"?"border-[#00ff88] text-[#00ff88]":"border-[#00e5ff] text-[#00e5ff]"}`}>{t.status}</span></div>
                <div className="text-xs mono text-[#64748b]">Giriş {t.entry_price} → SL {t.stop_loss} • TP1 {t.take_profit_1} • {t.trade_no}</div>
                {t.trade_setup_notes && <div className="text-xs text-[#94a3b8] mt-1">{t.trade_setup_notes.slice(0,80)}</div>}
              </div>
              <div className="text-right">
                <div className="text-xs mono">Plan RR {t.planned_rr ?? "-"} • Gerçek {t.realized_rr ?? "-"}</div>
                <div className={`text-sm mono font-bold ${ (t.net_pnl_r||0)>=0 ? "text-[#00ff88]" : "text-[#ff3366]"}`}>{t.net_pnl_r!=null?`${t.net_pnl_r>0?"+":""}${t.net_pnl_r}R`:"-"} / {t.net_pnl_cash!=null?`${t.net_pnl_cash}₺`:"-"}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

"use client"
// cache-bust 2026-08-29 trades defensive
import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function TradesPage() {
  const t = useTranslations("Trades")
  const tCommon = useTranslations("Common")
  const [trades, setTrades] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<any>({ symbol:"BTCUSDT", direction:"LONG", entry_price:67000, stop_loss:66000, take_profit_1:69000, position_size:0.1, account_id:1, entry_date: new Date().toISOString().slice(0,16), commission_fees:0, emotions:[], indicators_used:[], setups:[], chart_snapshot_paths:[] })
  const [refs, setRefs] = useState<{setups:any[], indicators:any[], emotions:any[]}>({setups:[],indicators:[],emotions:[]})
  const [history, setHistory] = useState<any[]|null>(null)
  const [selectedExit, setSelectedExit] = useState<any>(null)

  const load = ()=> api.trades().then(d=> setTrades(Array.isArray(d)? d : [])).catch(()=> setTrades([]))
  const loadRefs = ()=>{
    const token = typeof window!=="undefined" ? localStorage.getItem("access_token") : ""
    if(!token) { setRefs({setups:[],indicators:[],emotions:[]}); return }
    const h={ Authorization:`Bearer ${token}` }
    const base = process.env.NEXT_PUBLIC_API_URL||"http://localhost:8001"
    const safe = (url:string)=> fetch(url,{headers:h}).then(async r=>{
      if(!r.ok) return []
      const j=await r.json().catch(()=>[])
      return Array.isArray(j) ? j : []
    }).catch(()=>[])
    Promise.all([
      safe(`${base}/api/v1/refs/setups`),
      safe(`${base}/api/v1/refs/indicators`),
      safe(`${base}/api/v1/refs/emotions`),
    ]).then(([a,b,c])=> setRefs({setups: Array.isArray(a)?a:[], indicators: Array.isArray(b)?b:[], emotions: Array.isArray(c)?c:[]}))
  }
  useEffect(()=>{
    // if not logged in, redirect to login
    const tok = typeof window!=="undefined" ? localStorage.getItem("access_token") : null
    const enc = typeof window!=="undefined" ? localStorage.getItem("enc_token") : null
    if(!tok && !enc) { window.location.href="/login"; return }
    load(); loadRefs();
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8001";
    try{ const ws=new WebSocket(`${wsUrl}/ws/trades`); ws.onmessage=(e)=>{ try{ if(typeof e.data==="string" && e.data.includes("trade")) load() } catch{} }; ws.onerror=()=>{}; return()=>{ try{ ws.close()}catch{} } }catch{}
  }, [])

  const submit = async(e:React.FormEvent)=>{ e.preventDefault(); await api.createTrade({...form, entry_date: new Date(form.entry_date).toISOString()}); setShowForm(false); load() }
  const openHistory = async(id:number)=>{
    const base = process.env.NEXT_PUBLIC_API_URL||"http://localhost:8001"
    const r = await fetch(`${base}/api/v1/trades/${id}/history`,{headers:{Authorization:`Bearer ${localStorage.getItem("access_token")||""}`}})
    setHistory(await r.json())
  }
  const uploadChart = async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const f=e.target.files?.[0]; if(!f) return
    const fd=new FormData(); fd.append("file",f)
    const base = process.env.NEXT_PUBLIC_API_URL||"http://localhost:8001"
    const r = await fetch(`${base}/api/v1/media/upload`,{method:"POST", headers:{Authorization:`Bearer ${localStorage.getItem("access_token")||""}`}, body: fd})
    const j=await r.json()
    if(j.path) setForm((prev:any)=>({...prev, chart_snapshot_paths:[...(prev.chart_snapshot_paths||[]), j.path]}))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{t("title")}</h1>
        <Button onClick={()=>setShowForm(v=>!v)}>{showForm ? t("close") : t("newTradeButton")}</Button>
      </div>

      {showForm && (
        <Card><CardHeader><CardTitle>{t("newTrade")}</CardTitle></CardHeader><CardContent>
          <form onSubmit={submit} className="grid md:grid-cols-3 gap-3 text-sm">
            <label className="space-y-1"><span className="text-xs text-[#64748b]">{t("form.symbol")}</span><input value={form.symbol} onChange={e=>setForm({...form,symbol:e.target.value})} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 mono"/></label>
            <label className="space-y-1"><span className="text-xs text-[#64748b]">{t("form.direction")}</span><select value={form.direction} onChange={e=>setForm({...form,direction:e.target.value})} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2"><option>{t("form.long")}</option><option>{t("form.short")}</option></select></label>
            <label className="space-y-1"><span className="text-xs text-[#64748b]">{t("form.entryPrice")}</span><input type="number" step="0.01" value={form.entry_price} onChange={e=>setForm({...form,entry_price:parseFloat(e.target.value)})} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 mono"/></label>
            <label className="space-y-1"><span className="text-xs text-[#64748b]">{t("form.stopLoss")}</span><input type="number" step="0.01" value={form.stop_loss} onChange={e=>setForm({...form,stop_loss:parseFloat(e.target.value)})} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 mono"/></label>
            <label className="space-y-1"><span className="text-xs text-[#64748b]">{t("form.takeProfit")}</span><input type="number" step="0.01" value={form.take_profit_1} onChange={e=>setForm({...form,take_profit_1:parseFloat(e.target.value)})} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 mono"/></label>
            <label className="space-y-1"><span className="text-xs text-[#64748b]">{t("form.positionSize")}</span><input type="number" step="0.01" value={form.position_size} onChange={e=>setForm({...form,position_size:parseFloat(e.target.value)})} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 mono"/></label>
            <label className="space-y-1"><span className="text-xs text-[#64748b]">{t("form.account")}</span><input type="number" value={form.account_id} onChange={e=>setForm({...form,account_id:parseInt(e.target.value)})} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 mono"/></label>
            <label className="space-y-1"><span className="text-xs text-[#64748b]">{t("form.entryDate")}</span><input type="datetime-local" value={form.entry_date} onChange={e=>setForm({...form,entry_date:e.target.value})} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 mono"/></label>
            <label className="space-y-1"><span className="text-xs text-[#64748b]">{t("form.emotions")}</span><select multiple value={form.emotions} onChange={e=>setForm({...form, emotions:Array.from(e.target.selectedOptions).map(o=>o.value)})} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 text-xs h-[70px]"><option value="">—</option>{refs.emotions.map((x:any)=><option key={x.id} value={x.name}>{x.name}</option>)}</select></label>
            <label className="space-y-1"><span className="text-xs text-[#64748b]">{t("form.indicators")}</span><select multiple value={form.indicators_used} onChange={e=>setForm({...form, indicators_used:Array.from(e.target.selectedOptions).map(o=>o.value)})} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 text-xs h-[70px]"><option value="">—</option>{refs.indicators.map((x:any)=><option key={x.id} value={x.name}>{x.name}</option>)}</select></label>
            <label className="space-y-1"><span className="text-xs text-[#64748b]">{t("form.setups")}</span><select multiple value={form.setups} onChange={e=>setForm({...form, setups:Array.from(e.target.selectedOptions).map(o=>o.value)})} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 text-xs h-[70px]"><option value="">—</option>{refs.setups.map((x:any)=><option key={x.id} value={x.name}>{x.name}</option>)}</select></label>
            <label className="space-y-1"><span className="text-xs text-[#64748b]">{t("form.chart")}</span><input type="file" accept="image/*" onChange={uploadChart} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 text-xs" /><span className="text-[10px] text-[#64748b]">{t("form.chartCount", {count: (form.chart_snapshot_paths||[]).length})}</span></label>
            <label className="space-y-1"><span className="text-xs text-[#64748b]">{t("form.notes")}</span><input placeholder={t("form.notesPlaceholder")} onChange={e=>setForm({...form,trade_setup_notes:e.target.value})} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2"/></label>
            <div className="md:col-span-3"><Button type="submit" className="w-full">{t("form.save")}</Button></div>
          </form>
        </CardContent></Card>
      )}

      <Card>
        <CardHeader><CardTitle>{t("list.title", {count: trades.length})}</CardTitle></CardHeader>
        <CardContent className="divide-y divide-[#1e293b]/50">
          {trades.length===0 && <div className="text-xs text-[#64748b] py-6 text-center">{t("list.empty")}</div>}
          {trades.map((trade:any)=>(
            <div key={trade.id} className="py-3 flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap"><span className="mono text-sm font-bold text-white">{trade.symbol}</span><span className={`text-[10px] px-2 py-0.5 rounded font-bold ${trade.direction==="LONG"?"bg-[#00ff88] text-black":"bg-[#ff3366] text-white"}`}>{trade.direction}</span><span className={`text-[10px] px-2 py-0.5 rounded border ${trade.status==="OPEN"?"border-[#ffaa00] text-[#ffaa00]":trade.status==="CLOSED"?"border-[#00ff88] text-[#00ff88]":"border-[#00e5ff] text-[#00e5ff]"}`}>{trade.status}</span><button onClick={()=>openHistory(trade.id)} className="text-[10px] bg-[#1e293b] px-2 py-1 rounded">{t("list.history")}</button></div>
                <div className="text-xs mono text-[#64748b]">{t("list.entryToSL", {entry: trade.entry_price, sl: trade.stop_loss, tp: trade.take_profit_1, no: trade.trade_no, fee: trade.commission_fees})}</div>
                {(trade.emotions?.length || trade.setups?.length) && <div className="text-[11px] text-[#94a3b8] mt-1">{t("list.meta", {emotions: trade.emotions?.join(", ") ?? "-", setups: trade.setups?.join(", ") ?? "-", score: trade.execution_quality_score ?? "-"})}</div>}
                {trade.trade_setup_notes && <div className="text-xs text-[#94a3b8] mt-1">{trade.trade_setup_notes.slice(0,120)}</div>}
                {trade.chart_snapshot_paths?.length>0 && <div className="flex gap-1 mt-2">{trade.chart_snapshot_paths.map((p:string,i:number)=><img key={i} src={`${process.env.NEXT_PUBLIC_API_URL||"http://localhost:8001"}${p}`} alt="chart" className="w-16 h-10 object-cover rounded border border-[#1e293b]" />)}</div>}
                {trade.exits?.length>0 && <div className="mt-2 text-[11px] mono bg-[#020617] border border-[#1e293b] rounded p-2">{t("list.exits", {exits: trade.exits.map((e:any)=>`${e.exit_reason} ${e.exit_quantity} @${e.exit_price} (${e.pnl_r}R)`).join(" • ")})}</div>}
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs mono">{t("list.rr", {plan: trade.planned_rr ?? "-", real: trade.realized_rr ?? "-"})}</div>
                <div className={`text-sm mono font-bold ${ (trade.net_pnl_r||0)>=0 ? "text-[#00ff88]" : "text-[#ff3366]"}`}>{trade.net_pnl_r!=null?`${trade.net_pnl_r>0?"+":""}${trade.net_pnl_r}R`:"-"} / {trade.net_pnl_cash!=null?`${trade.net_pnl_cash}₺`:"-"}</div>
                {trade.deleted_at && <div className="text-[10px] text-[#ff3366]">{t("list.softDeleted")}</div>}
              </div>
            </div>
          ))}
          {history && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={()=>setHistory(null)}>
              <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4 max-w-lg w-full max-h-[70vh] overflow-auto" onClick={e=>e.stopPropagation()}>
                <h3 className="font-bold mb-2">{t("detail.editHistory")}</h3>
                {history.length===0 ? <div className="text-xs text-[#64748b]">{t("detail.noHistory")}</div> : history.map((h:any)=><div key={h.id} className="bg-[#020617] border border-[#1e293b] rounded p-2 mb-2 text-xs mono"><div className="text-[#94a3b8]">{new Date(h.created_at).toLocaleString("tr-TR")}</div><pre className="whitespace-pre-wrap text-[11px] mt-1">{JSON.stringify(h.diff,null,2)}</pre></div>)}
                <button onClick={()=>setHistory(null)} className="mt-3 w-full bg-[#1e293b] py-2 rounded-lg text-sm">{tCommon("close")}</button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

"use client"
// cache-bust 2026-08-29 trades favorites + live price auto-fill + close/cancel actions
import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { getLivePrice, computeFloatingR, computeFloatingCash, formatPrice } from "@/lib/market"
import { getFavorites, addFavorite, removeFavorite, onFavoritesChange } from "@/lib/favorites"

export default function TradesPage() {
  const t = useTranslations("Trades")
  const tCommon = useTranslations("Common")
  const [trades, setTrades] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<any>({ symbol:"BTCUSDT", direction:"LONG", entry_price:67000, stop_loss:66000, take_profit_1:69000, position_size:0.1, account_id:1, entry_date: new Date().toISOString().slice(0,16), commission_fees:0, emotions:[], indicators_used:[], setups:[], chart_snapshot_paths:[] })
  const [refs, setRefs] = useState<{setups:any[], indicators:any[], emotions:any[]}>({setups:[],indicators:[],emotions:[]})
  const [history, setHistory] = useState<any[]|null>(null)
  const [favorites, setFavorites] = useState<string[]>([])
  const [livePrice, setLivePrice] = useState<{price:number, source:string} | null>(null)
  const [liveLoading, setLiveLoading] = useState(false)
  const [liveMap, setLiveMap] = useState<Record<string, number>>({})
  const [closing, setClosing] = useState<any>(null)
  const [canceling, setCanceling] = useState<any>(null)
  const [closePrice, setClosePrice] = useState<string>("")
  const [newFavInput, setNewFavInput] = useState("")

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
    const tok = typeof window!=="undefined" ? localStorage.getItem("access_token") : null
    const enc = typeof window!=="undefined" ? localStorage.getItem("enc_token") : null
    if(!tok && !enc) { window.location.href="/login"; return }
    load(); loadRefs();
    setFavorites(getFavorites())
    const off = onFavoritesChange(setFavorites)
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8001";
    try{ const ws=new WebSocket(`${wsUrl}/ws/trades`); ws.onmessage=(e)=>{ try{ if(typeof e.data==="string" && e.data.includes("trade")) load() } catch{} }; ws.onerror=()=>{}; return()=>{ off(); try{ ws.close()}catch{} } }catch{ return off }
  }, [])

  // live price for form symbol
  useEffect(()=>{
    let cancelled=false
    const sym = form.symbol?.trim()
    if(!sym) { setLivePrice(null); return }
    setLiveLoading(true)
    getLivePrice(sym).then(r=>{
      if(!cancelled){ setLivePrice(r? {price:r.price, source:r.source}: null); setLiveLoading(false) }
    }).catch(()=>{ if(!cancelled) setLiveLoading(false) })
    // poll live price for form while form open
    if(!showForm) return
    const id=setInterval(()=>{ getLivePrice(sym).then(r=>{ if(!cancelled && r) setLivePrice({price:r.price, source:r.source}) }).catch(()=>{}) }, 5000)
    return ()=>{ cancelled=true; clearInterval(id) }
  }, [form.symbol, showForm])

  // live map for OPEN trades floating
  useEffect(()=>{
    let cancelled=false
    const upd= async ()=>{
      const open = trades.filter((x:any)=>x.status==="OPEN" || x.status==="PARTIAL")
      const syms=[...new Set(open.map((x:any)=>String(x.symbol).toUpperCase()))]
      if(syms.length===0) return
      const { getLivePrices } = await import("@/lib/market")
      const m = await getLivePrices(syms)
      if(!cancelled){
        const map:Record<string,number>={...liveMap}
        for(const [k,v] of Object.entries(m)) map[k]= (v as any).price
        setLiveMap(map)
      }
    }
    upd()
    const id=setInterval(upd, 5000)
    return ()=>{ cancelled=true; clearInterval(id)}
  }, [trades])

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

  const applyLiveToForm = ()=>{
    if(livePrice?.price) setForm({...form, entry_price: Math.round(livePrice.price*100)/100})
  }
  const handleFavoriteSelect = (sym:string)=>{
    setForm({...form, symbol: sym})
  }
  const handleAddFavorite = ()=>{
    const s=newFavInput.trim().toUpperCase()
    if(!s) return
    addFavorite(s); setNewFavInput(""); setFavorites(getFavorites())
  }

  const openCloseModal = (trade:any)=>{
    const sym = String(trade.symbol).toUpperCase()
    const lp = liveMap[sym]
    setClosePrice(lp? String(lp) : String(trade.entry_price))
    setClosing(trade)
  }
  const confirmClose = async()=>{
    if(!closing) return
    const p = parseFloat(closePrice)
    if(!Number.isFinite(p)) return
    await api.closeTrade(closing.id, { exit_price: p, exit_reason: "Manual" })
    setClosing(null); load()
  }
  const confirmCancel = async()=>{
    if(!canceling) return
    await api.cancelTrade(canceling.id)
    setCanceling(null); load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{t("title")}</h1>
        <Button onClick={()=>setShowForm(v=>!v)}>{showForm ? t("close") : t("newTradeButton")}</Button>
      </div>

      {showForm && (
        <Card className="border-[#00ff88]/20"><CardHeader className="space-y-3"><CardTitle>{t("newTrade")}</CardTitle>
          {/* Favorites bar */}
          <div className="bg-[#020617] border border-[#1e293b] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] tracking-widest text-[#64748b] font-bold">{t("favorites.title")}</span>
              <span className="text-[11px] text-[#64748b]">{t("favorites.hint")}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {favorites.map(sym=> (
                <button key={sym} onClick={()=>handleFavoriteSelect(sym)} className={`text-xs px-2.5 py-1 rounded-full border font-mono flex items-center gap-1 ${form.symbol?.toUpperCase()===sym?"bg-[#00ff88] text-black border-[#00ff88] font-bold":"bg-[#0f172a] border-[#1e293b] text-[#94a3b8] hover:border-[#00ff88]/40"}`}>
                  {sym} {liveMap[sym] ? <span className="text-[10px]">• {formatPrice(liveMap[sym], sym)}</span> : null}
                  <span onClick={(e)=>{ e.stopPropagation(); removeFavorite(sym); setFavorites(getFavorites())}} className="ml-1 opacity-60 hover:opacity-100">✕</span>
                </button>
              ))}
              {favorites.length===0 && <span className="text-xs text-[#64748b]">{t("favorites.empty")}</span>}
            </div>
            <div className="flex gap-2">
              <input value={newFavInput} onChange={e=>setNewFavInput(e.target.value.toUpperCase())} placeholder={t("favorites.placeholder")} className="flex-1 bg-[#0f172a] border border-[#1e293b] rounded-lg px-2 py-1.5 text-xs mono" />
              <Button size="sm" variant="secondary" onClick={handleAddFavorite}>{t("favorites.add")}</Button>
            </div>
          </div>
        </CardHeader><CardContent>
          <form onSubmit={submit} className="grid md:grid-cols-3 gap-3 text-sm">
            <label className="space-y-1"><span className="text-xs text-[#64748b]">{t("form.symbol")} {favorites.includes(form.symbol?.toUpperCase())?"⭐": ""}</span>
              <div className="flex gap-1">
                <input value={form.symbol} onChange={e=>setForm({...form,symbol:e.target.value.toUpperCase()})} className="flex-1 bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 mono"/>
              </div>
            </label>
            <label className="space-y-1"><span className="text-xs text-[#64748b]">{t("form.direction")}</span><select value={form.direction} onChange={e=>setForm({...form,direction:e.target.value})} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2"><option>{t("form.long")}</option><option>{t("form.short")}</option></select></label>
            <label className="space-y-1"><span className="text-xs text-[#64748b]">{t("form.entryPrice")}
              {liveLoading?<span className="text-[10px] text-[#38bdf8] ml-1">• {t("live.fetching")}</span> : livePrice? <span className={`text-[10px] ml-1 ${livePrice.source==="binance"?"text-[#f0b90b]":"text-[#38bdf8]"}`}>• LIVE {formatPrice(livePrice.price, form.symbol)} ({livePrice.source})</span>: <span className="text-[10px] text-[#64748b] ml-1">• {t("live.noData")}</span>}
            </span>
              <div className="flex gap-1">
                <input type="number" step="0.01" value={form.entry_price} onChange={e=>setForm({...form,entry_price:parseFloat(e.target.value)})} className="flex-1 bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 mono"/>
                {livePrice && <button type="button" onClick={applyLiveToForm} className="shrink-0 bg-[#00ff88] text-black text-xs font-bold px-2.5 rounded-lg hover:bg-[#00e5ff]">{t("live.fill")}</button>}
              </div>
            </label>
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
          {trades.map((trade:any)=>{
            const symUpper = String(trade.symbol).toUpperCase()
            const lp = liveMap[symUpper] ?? null
            const floatingR = computeFloatingR(trade, lp)
            const floatingCash = computeFloatingCash(trade, lp)
            const isOpen = trade.status==="OPEN" || trade.status==="PARTIAL"
            const isCancelled = trade.status==="CANCELLED"
            return (
            <div key={trade.id} className={`py-3 flex items-start justify-between gap-3 ${isCancelled?"opacity-60":""}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap"><span className="mono text-sm font-bold text-white">{trade.symbol}</span><span className={`text-[10px] px-2 py-0.5 rounded font-bold ${trade.direction==="LONG"?"bg-[#00ff88] text-black":"bg-[#ff3366] text-white"}`}>{trade.direction}</span><span className={`text-[10px] px-2 py-0.5 rounded border ${trade.status==="OPEN"?"border-[#ffaa00] text-[#ffaa00]":trade.status==="CLOSED"?"border-[#00ff88] text-[#00ff88]":trade.status==="CANCELLED"?"border-[#64748b] text-[#64748b] line-through":"border-[#00e5ff] text-[#00e5ff]"}`}>{trade.status}</span><button onClick={()=>openHistory(trade.id)} className="text-[10px] bg-[#1e293b] px-2 py-1 rounded">{t("list.history")}</button>
                {isOpen && <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${floatingR!=null && floatingR>=0?"bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/30":"bg-[#ff3366]/10 text-[#ff3366] border border-[#ff3366]/30"}`}>{floatingR!=null? `${floatingR>0?"+":""}${floatingR.toFixed(2)}R ${floatingCash!=null?`(${floatingCash.toFixed(2)})`:""} • LIVE ${lp? formatPrice(lp,symUpper):"…"}`: t("list.noLive")}</span>}
                </div>
                <div className="text-xs mono text-[#64748b]">{t("list.entryToSL", {entry: trade.entry_price, sl: trade.stop_loss, tp: trade.take_profit_1, no: trade.trade_no, fee: trade.commission_fees})}</div>
                {(trade.emotions?.length || trade.setups?.length) && <div className="text-[11px] text-[#94a3b8] mt-1">{t("list.meta", {emotions: trade.emotions?.join(", ") ?? "-", setups: trade.setups?.join(", ") ?? "-", score: trade.execution_quality_score ?? "-"})}</div>}
                {trade.trade_setup_notes && <div className="text-xs text-[#94a3b8] mt-1">{trade.trade_setup_notes.slice(0,120)}</div>}
                {trade.chart_snapshot_paths?.length>0 && <div className="flex gap-1 mt-2">{trade.chart_snapshot_paths.map((p:string,i:number)=><img key={i} src={`${process.env.NEXT_PUBLIC_API_URL||"http://localhost:8001"}${p}`} alt="chart" className="w-16 h-10 object-cover rounded border border-[#1e293b]" />)}</div>}
                {trade.exits?.length>0 && <div className="mt-2 text-[11px] mono bg-[#020617] border border-[#1e293b] rounded p-2">{t("list.exits", {exits: trade.exits.map((e:any)=>`${e.exit_reason} ${e.exit_quantity} @${e.exit_price} (${e.pnl_r}R)`).join(" • ")})}</div>}
              </div>
              <div className="text-right shrink-0 space-y-1">
                <div className="text-xs mono">{t("list.rr", {plan: trade.planned_rr ?? "-", real: trade.realized_rr ?? "-"})}</div>
                <div className={`text-sm mono font-bold ${isCancelled?"text-[#64748b]": (trade.net_pnl_r||0)>=0 ? "text-[#00ff88]" : "text-[#ff3366]"}`}>{isCancelled? t("list.cancelled") : trade.net_pnl_r!=null?`${trade.net_pnl_r>0?"+":""}${trade.net_pnl_r}R`:"-"} / {isCancelled? "—" : trade.net_pnl_cash!=null?`${trade.net_pnl_cash}₺`:"-"}</div>
                {isOpen && !isCancelled && (
                  <div className="flex gap-1.5 justify-end">
                    <button onClick={()=>openCloseModal(trade)} className="text-[11px] bg-[#00ff88] text-black font-bold px-2.5 py-1 rounded-full hover:bg-[#00e5ff]">{t("actions.close")}</button>
                    <button onClick={()=>setCanceling(trade)} className="text-[11px] bg-[#0f172a] border border-[#ff3366]/40 text-[#ff3366] px-2.5 py-1 rounded-full hover:bg-[#ff3366]/10">{t("actions.cancel")}</button>
                  </div>
                )}
                {trade.deleted_at && <div className="text-[10px] text-[#ff3366]">{t("list.softDeleted")}</div>}
              </div>
            </div>
          )})}
          {history && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={()=>setHistory(null)}>
              <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4 max-w-lg w-full max-h-[70vh] overflow-auto" onClick={e=>e.stopPropagation()}>
                <h3 className="font-bold mb-2">{t("detail.editHistory")}</h3>
                {history.length===0 ? <div className="text-xs text-[#64748b]">{t("detail.noHistory")}</div> : history.map((h:any)=><div key={h.id} className="bg-[#020617] border border-[#1e293b] rounded p-2 mb-2 text-xs mono"><div className="text-[#94a3b8]">{new Date(h.created_at).toLocaleString("tr-TR")}</div><pre className="whitespace-pre-wrap text-[11px] mt-1">{JSON.stringify(h.diff,null,2)}</pre></div>)}
                <button onClick={()=>setHistory(null)} className="mt-3 w-full bg-[#1e293b] py-2 rounded-lg text-sm">{tCommon("close")}</button>
              </div>
            </div>
          )}
          {/* Close confirmation */}
          <Dialog open={!!closing} onOpenChange={(v)=>!v && setClosing(null)}>
            <h3 className="font-bold text-sm">{t("actions.closeTitle", {symbol: closing?.symbol || ""})}</h3>
            <p className="text-xs text-[#64748b] mt-1">{t("actions.closeDesc")}</p>
            <label className="block mt-3 space-y-1"><span className="text-xs text-[#94a3b8]">{t("actions.closePrice")}</span><input value={closePrice} onChange={e=>setClosePrice(e.target.value)} type="number" step="0.01" className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 mono text-sm" /></label>
            {closing && liveMap[String(closing.symbol).toUpperCase()] && <div className="text-[11px] text-[#38bdf8] mt-1">LIVE {String(closing.symbol).toUpperCase()} ≈ {formatPrice(liveMap[String(closing.symbol).toUpperCase()], closing.symbol)} • {t("actions.liveHint")}</div>}
            <div className="flex gap-2 mt-4">
              <Button variant="secondary" className="flex-1" onClick={()=>setClosing(null)}>{tCommon("cancel")}</Button>
              <Button className="flex-1 bg-[#00ff88] text-black hover:bg-[#00e5ff]" onClick={confirmClose}>{t("actions.confirmClose")}</Button>
            </div>
          </Dialog>
          {/* Cancel confirmation */}
          <Dialog open={!!canceling} onOpenChange={(v)=>!v && setCanceling(null)}>
            <h3 className="font-bold text-sm text-[#ff3366]">{t("actions.cancelTitle", {symbol: canceling?.symbol || ""})}</h3>
            <p className="text-xs text-[#64748b] mt-1">{t("actions.cancelDesc")}</p>
            <div className="bg-[#ff3366]/5 border border-[#ff3366]/20 rounded-lg p-2 mt-3 text-xs text-[#ff3366]">{t("actions.cancelWarning")}</div>
            <div className="flex gap-2 mt-4">
              <Button variant="secondary" className="flex-1" onClick={()=>setCanceling(null)}>{tCommon("cancel")}</Button>
              <Button className="flex-1 bg-[#ff3366] text-white hover:bg-[#cc2952]" onClick={confirmCancel}>{t("actions.confirmCancel")}</Button>
            </div>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
}

"use client"
import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

function RefManager({ title, endpoint }: { title:string, endpoint:string }){
  const t = useTranslations("Settings")
  const [items,setItems]=useState<any[]>([])
  const [name,setName]=useState("")
  const load=()=>fetch(`${process.env.NEXT_PUBLIC_API_URL||"http://localhost:8001"}/api/v1/refs/${endpoint}`,{headers:{Authorization:`Bearer ${localStorage.getItem("access_token")||""}`}}).then(r=>r.json()).then(setItems).catch(()=>setItems([]))
  useEffect(()=>{load()},[])
  const add=async()=>{
    if(!name.trim()) return
    await fetch(`${process.env.NEXT_PUBLIC_API_URL||"http://localhost:8001"}/api/v1/refs/${endpoint}`,{method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${localStorage.getItem("access_token")||""}`}, body: JSON.stringify({name}) })
    setName(""); load()
  }
  const del=async(id:number)=>{
    await fetch(`${process.env.NEXT_PUBLIC_API_URL||"http://localhost:8001"}/api/v1/refs/${endpoint}/${id}`,{method:"DELETE", headers:{Authorization:`Bearer ${localStorage.getItem("access_token")||""}`}})
    load()
  }
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-2"><input value={name} onChange={e=>setName(e.target.value)} placeholder={t("form.placeholder", {name: title.toLowerCase()})} className="flex-1 bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 text-sm" /><Button onClick={add}>{t("form.add")}</Button></div>
        <div className="space-y-1 max-h-[200px] overflow-auto">
          {items.map((it:any)=><div key={it.id} className="flex justify-between items-center bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 text-sm"><span>{it.name}</span><button onClick={()=>del(it.id)} className="text-[#ff3366] text-xs">{t("form.delete")}</button></div>)}
          {items.length===0 && <div className="text-xs text-[#64748b]">{t("form.noData")}</div>}
        </div>
      </CardContent>
    </Card>
  )
}

export default function SettingsPage(){
  const t = useTranslations("Settings")
  const [accounts,setAccounts]=useState<any[]>([])
  const [accName,setAccName]=useState("")
  const [accCur,setAccCur]=useState("USDT")

  const loadAcc=()=> fetch(`${process.env.NEXT_PUBLIC_API_URL||"http://localhost:8001"}/api/v1/accounts`,{headers:{Authorization:`Bearer ${localStorage.getItem("access_token")||""}`}}).then(r=>r.json()).then(setAccounts).catch(()=>{})
  useEffect(()=>{loadAcc()},[])
  const addAcc=async()=>{
    await fetch(`${process.env.NEXT_PUBLIC_API_URL||"http://localhost:8001"}/api/v1/accounts`,{method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${localStorage.getItem("access_token")||""}`}, body: JSON.stringify({name:accName, base_currency:accCur})})
    setAccName(""); loadAcc()
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">{t("title")}</h1>
      <p className="text-xs text-[#94a3b8]">{t("description")}</p>
      <Card>
        <CardHeader><CardTitle>{t("sections.accounts")}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2"><input placeholder={t("accounts.namePlaceholder")} value={accName} onChange={e=>setAccName(e.target.value)} className="flex-1 bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 text-sm" /><select value={accCur} onChange={e=>setAccCur(e.target.value)} className="bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 text-sm"><option>USDT</option><option>TRY</option><option>USD</option></select><Button onClick={addAcc}>{t("form.add")}</Button></div>
          <div className="space-y-1">{accounts.map((a:any)=><div key={a.id} className="bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 text-sm flex justify-between"><span>{a.name} <span className="text-[#64748b]">({a.base_currency})</span></span><span className="text-xs text-[#64748b]">#{a.id}</span></div>)}</div>
        </CardContent>
      </Card>
      <div className="grid md:grid-cols-3 gap-3">
        <RefManager title={t("sections.setups")} endpoint="setups" />
        <RefManager title={t("sections.indicators")} endpoint="indicators" />
        <RefManager title={t("sections.emotions")} endpoint="emotions" />
      </div>
      <Card><CardHeader><CardTitle>{t("sections.webhookBackup")}</CardTitle></CardHeader><CardContent className="text-xs text-[#94a3b8] space-y-1 mono">
        <div>TradingView webhook: <span className="text-white">POST /api/v1/webhooks/tradingview</span> — `WEBHOOK_ENABLED=false` default (env ile aç)</div>
        <div>Yedek: `docker compose exec backup /usr/local/bin/backup.sh` → `./backups/dump_*.sql.gz` (30 gün) + haftalık rclone</div>
        <div>Media: `POST /api/v1/media/upload` — giriş/çıkış grafiği ayrı yükle, `chart_snapshot_paths` içinde sakla</div>
        <div>OpenAPI: `/openapi.json` commitli — sözleşme sabit, frontend bağımsız</div>
      </CardContent></Card>
    </div>
  )
}

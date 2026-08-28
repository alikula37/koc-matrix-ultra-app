"use client"
import { useEffect, useState } from "react"

export default function NotificationBell(){
  const [perm, setPerm]=useState<NotificationPermission>("default")
  const [count,setCount]=useState(0)
  useEffect(()=>{
    if(typeof window!=="undefined" && "Notification" in window) setPerm(Notification.permission)
    // load count
    fetch(`${process.env.NEXT_PUBLIC_API_URL||"http://localhost:8000"}/api/v1/notifications`,{headers:{Authorization:`Bearer ${localStorage.getItem("access_token")||""}`}}).then(r=>r.json()).then(d=>setCount(Array.isArray(d)? d.filter((x:any)=>!x.is_read).length : 0)).catch(()=>{})
  },[])
  const enable=async()=>{
    const p = await Notification.requestPermission()
    setPerm(p)
    if(p==="granted"){
      // subscribe via service worker
      const reg = await navigator.serviceWorker.ready
      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if(vapid){
        const sub = await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey: vapid })
        await fetch(`${process.env.NEXT_PUBLIC_API_URL||"http://localhost:8000"}/api/v1/notifications/subscribe`,{method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${localStorage.getItem("access_token")||""}`}, body: JSON.stringify(sub.toJSON())})
      }
      // test
      new Notification("Koç Matrix — Bildirimler Açık", { body: "Gün/hafta/ay kapanış + drawdown uyarıları artık gelecek" })
    }
  }
  return (
    <div className="flex items-center gap-2">
      {perm!=="granted" ? <button onClick={enable} className="text-xs bg-[#1e293b] border border-[#334155] px-3 py-1.5 rounded-full">🔔 Bildirimleri Aç</button> :
        <span className="text-xs bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88] px-3 py-1.5 rounded-full">🔔 Açık {count>0 && `• ${count}`}</span>}
    </div>
  )
}

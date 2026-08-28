"use client"
import { useState } from "react"
import Link from "next/link"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"

export default function RegisterPage(){
  const [email,setEmail]=useState("")
  const [password,setPassword]=useState("")
  const [fullName,setFullName]=useState("")
  const [err,setErr]=useState("")
  const [ok,setOk]=useState(false)

  const submit=async(e:React.FormEvent)=>{
    e.preventDefault(); setErr("")
    try{ await api.register(email,password,fullName); setOk(true) } catch(e:any){ setErr(String(e.message).slice(0,300)) }
  }

  return (
    <div className="w-full max-w-md bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 space-y-4">
      <h1 className="font-bold text-center">Kayıt Ol</h1>
      <p className="text-xs text-[#64748b] text-center">JWT altyapısı çok kullanıcılı hazır — şimdilik tek trader</p>
      {ok ? <div className="bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] p-3 rounded-lg text-sm">Kayıt başarılı → <Link href="/login" className="underline">Giriş Yap</Link></div> :
      <form onSubmit={submit} className="space-y-3">
        <input placeholder="Ad Soyad" value={fullName} onChange={e=>setFullName(e.target.value)} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2.5 text-sm" />
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2.5 text-sm" />
        <input type="password" placeholder="Şifre" value={password} onChange={e=>setPassword(e.target.value)} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2.5 text-sm mono" />
        {err && <div className="text-xs bg-[#ff3366]/10 border border-[#ff3366]/30 text-[#ff3366] p-2 rounded-lg">{err}</div>}
        <Button type="submit" className="w-full">Kayıt Ol</Button>
      </form>
      }
      <div className="text-center text-xs"><Link href="/login" className="text-[#00ff88]">Giriş Yap</Link></div>
    </div>
  )
}

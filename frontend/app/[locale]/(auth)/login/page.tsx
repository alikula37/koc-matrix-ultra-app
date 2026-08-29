"use client"
import { useState } from "react"
import { Link } from "@/i18n/routing"
import { useTranslations } from "next-intl"
import { api } from "@/lib/api"
import { setToken } from "@/lib/auth"
import { Button } from "@/components/ui/button"

export default function LoginPage(){
  const t = useTranslations("Auth")
  const [email,setEmail]=useState("trader@kocmatrix.com")
  const [password,setPassword]=useState("KocMatrix2025!")
  const [pin,setPin]=useState("")
  const [err,setErr]=useState("")
  const [loading,setLoading]=useState(false)

  const submit=async(e:React.FormEvent)=>{
    e.preventDefault(); setErr(""); setLoading(true)
    try{
      const res = await api.login(email,password)
      await setToken(res.access_token, res.refresh_token, pin || undefined)
      location.href="/dashboard"
    }catch(e:any){ setErr(String(e.message).slice(0,300)) } finally{ setLoading(false) }
  }

  return (
    <div className="w-full max-w-md bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 space-y-4">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-[#00ff88] to-[#00e5ff] flex items-center justify-center font-bold text-black">KM</div>
        <h1 className="mt-3 font-bold">{t("login.title")}</h1>
        <p className="text-xs text-[#64748b]">{t("login.subtitle")}</p>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <label className="block"><span className="text-xs text-[#94a3b8]">{t("login.email")}</span><input value={email} onChange={e=>setEmail(e.target.value)} className="w-full mt-1 bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2.5 text-sm" /></label>
        <label className="block"><span className="text-xs text-[#94a3b8]">{t("login.password")}</span><input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full mt-1 bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2.5 text-sm mono" /></label>
        <label className="block"><span className="text-xs text-[#94a3b8]">{t("login.pin")}</span><input type="password" inputMode="numeric" maxLength={6} placeholder={t("login.pinPlaceholder")} value={pin} onChange={e=>setPin(e.target.value)} className="w-full mt-1 bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2.5 text-sm mono tracking-widest" /></label>
        {err && <div className="text-xs bg-[#ff3366]/10 border border-[#ff3366]/30 text-[#ff3366] p-2 rounded-lg">{err}</div>}
        <Button type="submit" disabled={loading} className="w-full">{loading ? t("login.submitting") : t("login.submit")}</Button>
      </form>
      <div className="text-center text-xs text-[#64748b]">{t("login.noAccount")} <Link href="/register" className="text-[#00ff88]">{t("login.registerLink")}</Link> • <Link href="/" className="text-[#94a3b8]">{t("login.home")}</Link></div>
      <div className="text-[11px] bg-[#020617] border border-[#1e293b] rounded-lg p-2.5 text-[#64748b]">{t("login.demo", {email: "trader@kocmatrix.com", password: "KocMatrix2025!"})}</div>
    </div>
  )
}

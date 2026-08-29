"use client"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { unlockWithPin, authWithBiometric, clearAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"

export default function PinLock({ onUnlock }: { onUnlock: ()=>void }) {
  const t = useTranslations("Auth.pinLock")
  const [pin, setPin] = useState("")
  const [err, setErr] = useState("")
  const [bio, setBio] = useState(!! (typeof window!=="undefined" && (window as any).PublicKeyCredential))

  const submit = async (e:React.FormEvent)=>{ e.preventDefault(); if(await unlockWithPin(pin)) { onUnlock(); location.reload() } else setErr(t("wrongPin")) }
  const handleBio = async()=>{
    if(await authWithBiometric()){
      const hash = localStorage.getItem("pin_hash")
      if(hash && await unlockWithPin(atob(hash))) { onUnlock(); location.reload() }
      else setErr(t("biometricUnlockFailed"))
    } else setErr(t("biometricFailed"))
  }

  return (
    <div className="fixed inset-0 bg-[#020617]/90 backdrop-blur flex items-center justify-center p-4 z-50">
      <form onSubmit={submit} className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 w-full max-w-sm space-y-4">
        <h2 className="font-bold text-center">{t("title")}</h2>
        <p className="text-xs text-[#94a3b8] text-center">{t("description")}</p>
        <input type="password" inputMode="numeric" maxLength={6} placeholder={t("placeholder")} value={pin} onChange={e=>setPin(e.target.value)} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-3 text-center mono text-lg tracking-widest" />
        {err && <div className="text-xs text-[#ff3366] text-center">{err}</div>}
        <Button type="submit" className="w-full">{t("unlock")}</Button>
        {bio && <button type="button" onClick={handleBio} className="w-full text-xs bg-[#1e293b] hover:bg-[#334155] text-white py-2 rounded-lg">{t("biometric")}</button>}
        <button type="button" onClick={()=>{ clearAuth(); location.href="/login" }} className="w-full text-[11px] text-[#64748b]">{t("logout")}</button>
      </form>
    </div>
  )
}

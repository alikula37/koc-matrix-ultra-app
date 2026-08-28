"use client"
import * as React from "react"
import { cn } from "@/lib/utils"
export function Dialog({open,onOpenChange, children}:{open:boolean,onOpenChange:(v:boolean)=>void,children:React.ReactNode}){
  if(!open) return null
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={()=>onOpenChange(false)}><div onClick={e=>e.stopPropagation()} className={cn("bg-[#0f172a] border border-[#1e293b] rounded-xl p-4 w-full max-w-md")}>{children}</div></div>
}

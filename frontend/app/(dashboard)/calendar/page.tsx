"use client"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function CalendarPage() {
  const [year, setYear] = useState(2025)
  const [mode, setMode] = useState<"R"|"cash">("R")
  const [data, setData] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)

  useEffect(()=>{ api.calendar(year).then(setData).catch(()=>setData([])) }, [year])
  const exportPdf = async ()=>{
    const { exportCalendarPdf } = await import("@/lib/pdf")
    await exportCalendarPdf(year, mode, data)
  }

  const byDate: Record<string, any> = Object.fromEntries(data.map(d=>[d.date,d]))
  const daysInMonth = (m:number,y:number)=> new Date(y,m+1,0).getDate()
  const monthNames = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Takvim Heatmap</h1>
        <div className="flex items-center gap-2">
          <button onClick={()=>setMode(mode==="R"?"cash":"R")} className="text-xs bg-[#1e293b] border border-[#334155] px-3 py-1.5 rounded-full">{mode==="R" ? "R Modu" : "₺ Modu"}</button>
          <button onClick={exportPdf} className="text-xs bg-[#00ff88] text-black font-bold px-3 py-1.5 rounded-full hover:bg-[#00e5ff]">📄 PDF İndir</button>
          <select value={year} onChange={e=>setYear(Number(e.target.value))} className="bg-[#0f172a] border border-[#1e293b] text-xs rounded-lg px-2 py-1.5">
            {[2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        {monthNames.map((name, mi)=>{
          const days = daysInMonth(mi, year)
          const first = new Date(year, mi, 1).getDay()
          const pad = (first+6)%7
          return (
            <Card key={mi}>
              <CardHeader className="py-3"><CardTitle className="text-center">{name}</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 text-[9px] text-[#64748b] text-center mb-1"><span>P</span><span>S</span><span>Ç</span><span>P</span><span>C</span><span>C</span><span>P</span></div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({length:pad}).map((_,i)=><div key={"p"+i} />)}
                  {Array.from({length:days}).map((_,d)=>{
                    const date = `${year}-${String(mi+1).padStart(2,"0")}-${String(d+1).padStart(2,"0")}`
                    const cell = byDate[date]
                    const val = cell ? (mode==="R" ? cell.total_r : cell.total_cash) : 0
                    const has = !!cell
                    const bg = !has ? "bg-[#020617] border-[#1e293b]" : val>0 ? `bg-[#00ff88]/30 border-[#00ff88]/40` : val<0 ? `bg-[#ff3366]/30 border-[#ff3366]/40` : "bg-[#1e293b] border-[#334155]"
                    const intensity = has ? Math.min(1, Math.abs(val)/(mode==="R"?3:5000)) : 0
                    return (
                      <button key={d} onClick={()=>has && setSelected(cell)} className={`aspect-square rounded border flex flex-col items-center justify-center text-[9px] ${bg}`} style={{opacity: has? 0.6+intensity*0.4 : 1}}>
                        <span className="mono text-white text-[10px]">{d+1}</span>
                        {has && <span className={`mono text-[8px] font-bold ${val>0?"text-[#00ff88]":val<0?"text-[#ff3366]":"text-[#94a3b8]"}`}>{mode==="R"?`${val>0?"+":""}${val.toFixed(1)}R`:`${val>0?"+":""}${val.toFixed(0)}`}</span>}
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={()=>setSelected(null)}>
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-5 max-w-md w-full" onClick={e=>e.stopPropagation()}>
            <h3 className="font-bold">{selected.date} — {selected.count} işlem</h3>
            <p className="mono text-sm mt-1">Toplam: <span className={selected.total_r>=0?"text-[#00ff88]":"text-[#ff3366]"}>{selected.total_r}R</span> / {selected.total_cash}₺</p>
            <button onClick={()=>setSelected(null)} className="mt-4 w-full bg-[#1e293b] hover:bg-[#334155] text-white py-2 rounded-lg text-sm">Kapat</button>
          </div>
        </div>
      )}
    </div>
  )
}

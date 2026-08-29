import { useState } from 'react'

export default function OrderPanel({ symbol }: { symbol: string }) {
  const [side, setSide] = useState<'LONG'|'SHORT'>('LONG')
  const [leverage, setLeverage] = useState(5)
  const [size, setSize] = useState('0.10')

  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl overflow-hidden">
      <div className="grid grid-cols-2 gap-0">
        <button onClick={()=>setSide('LONG')} className={`py-3 text-xs font-bold tracking-widest ${side==='LONG' ? 'bg-[#00ff88] text-black' : 'bg-[#020617] text-[#64748b]'}`}>LONG / AL</button>
        <button onClick={()=>setSide('SHORT')} className={`py-3 text-xs font-bold tracking-widest ${side==='SHORT' ? 'bg-[#ff3366] text-white' : 'bg-[#020617] text-[#64748b]'}`}>SHORT / SAT</button>
      </div>
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#64748b]">Sembol</span>
          <span className="mono text-white font-bold">{symbol}</span>
        </div>
        <div>
          <label className="text-[10px] text-[#64748b] tracking-widest">MİKTAR</label>
          <div className="mt-1 flex items-center bg-[#020617] border border-[#1e293b] rounded-lg overflow-hidden">
            <input value={size} onChange={e=>setSize(e.target.value)} className="flex-1 bg-transparent px-3 py-2.5 mono text-white text-sm outline-none" />
            <span className="px-3 text-xs text-[#64748b] mono">{symbol.replace('USDT','')}</span>
          </div>
          <div className="grid grid-cols-4 gap-1 mt-2">
            {[25,50,75,100].map(p=>(
              <button key={p} className="text-[10px] bg-[#1e293b] hover:bg-[#334155] text-[#94a3b8] py-1.5 rounded">{p}%</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] text-[#64748b] tracking-widest">KALDIRAÇ: <span className="text-white font-bold">{leverage}x</span></label>
          <input type="range" min={1} max={20} value={leverage} onChange={e=>setLeverage(Number(e.target.value))} className="w-full accent-[#00ff88] mt-1" />
          <div className="flex justify-between text-[9px] text-[#475569] mono"><span>1x</span><span>10x</span><span>20x</span></div>
        </div>
        <div className="bg-[#020617] border border-[#1e293b] rounded-lg p-3 space-y-1.5 text-xs mono">
          <div className="flex justify-between"><span className="text-[#64748b]">Giriş</span><span className="text-white">67,842.50 USDT</span></div>
          <div className="flex justify-between"><span className="text-[#64748b]">Likidasyon</span><span className="text-[#ff3366]">54,200 (LONG)</span></div>
          <div className="flex justify-between"><span className="text-[#64748b]">Ücret</span><span className="text-white">%0.02</span></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#020617] border border-[#1e293b] rounded-lg p-2">
            <div className="text-[10px] text-[#64748b]">TAKE PROFIT</div>
            <input placeholder="70,000" className="w-full bg-transparent mono text-white text-xs outline-none mt-1" />
          </div>
          <div className="bg-[#020617] border border-[#1e293b] rounded-lg p-2">
            <div className="text-[10px] text-[#64748b]">STOP LOSS</div>
            <input placeholder="66,000" className="w-full bg-transparent mono text-white text-xs outline-none mt-1" />
          </div>
        </div>
        <button className={`w-full py-3 rounded-lg font-bold text-sm tracking-widest ${side==='LONG' ? 'bg-[#00ff88] text-black hover:bg-[#00e67a]' : 'bg-[#ff3366] text-white hover:bg-[#e62e5c]'}`}>
          {side==='LONG' ? 'LONG AÇ — AL' : 'SHORT AÇ — SAT'}
        </button>
        <div className="text-[10px] text-center text-[#475569]">Koç Matrix Risk Skoru: <span className="text-[#ffaa00] font-bold">ORTA</span> — Pozisyon büyüklüğünü kontrol et</div>
      </div>
    </div>
  )
}

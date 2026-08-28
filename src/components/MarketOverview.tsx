import { mockSymbols } from "../lib/marketData"
import { formatPrice } from "../lib/utils"

export default function MarketOverview({ onSelect, selected }: { onSelect: (s:string)=>void, selected:string }) {
  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl overflow-hidden">
      <div className="px-3 py-2 border-b border-[#1e293b] flex items-center justify-between">
        <h3 className="text-xs font-semibold text-white tracking-widest">MATRIX / PİYASA</h3>
        <span className="text-[10px] text-[#64748b]">Skor = Koç Matrix AI</span>
      </div>
      <div className="divide-y divide-[#1e293b]/50">
        {mockSymbols.map(s => (
          <button
            key={s.symbol}
            onClick={()=>onSelect(s.symbol)}
            className={`w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#1e293b]/50 transition text-left ${selected===s.symbol ? 'bg-[#00ff88]/5 border-l-2 border-[#00ff88]' : 'border-l-2 border-transparent'}`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white mono">{s.symbol}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${s.signal==='AL' ? 'bg-[#00ff88]/20 text-[#00ff88]' : s.signal==='SAT' ? 'bg-[#ff3366]/20 text-[#ff3366]' : 'bg-[#64748b]/20 text-[#94a3b8]'}`}>{s.signal}</span>
              </div>
              <div className="text-[11px] text-[#64748b] mono">{s.volume} hacim</div>
            </div>
            <div className="text-right">
              <div className="text-xs mono text-white font-medium">{formatPrice(s.price, s.symbol.includes('USDT') ? 2 : 2)}</div>
              <div className={`text-[11px] mono ${s.change24h>=0 ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>{s.change24h>=0?'+':''}{s.change24h.toFixed(2)}%</div>
            </div>
            <div className="ml-3 w-10 h-10 rounded-lg bg-[#020617] border border-[#1e293b] flex flex-col items-center justify-center">
              <span className="text-[10px] text-[#64748b]">SKOR</span>
              <span className={`text-xs font-bold mono ${s.matrixScore>=70 ? 'text-[#00ff88]' : s.matrixScore>=40 ? 'text-[#ffaa00]' : 'text-[#ff3366]'}`}>{s.matrixScore}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

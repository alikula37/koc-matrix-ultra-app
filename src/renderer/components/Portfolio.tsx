import { mockPositions, mockBids, mockAsks } from "../lib/marketData"
import { formatPrice } from "../lib/utils"

export default function Portfolio() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <div className="lg:col-span-2 bg-[#0f172a] border border-[#1e293b] rounded-xl overflow-hidden">
        <div className="px-3 py-2 border-b border-[#1e293b] flex items-center justify-between">
          <h3 className="text-xs font-bold text-white tracking-widest">AÇIK POZİSYONLAR</h3>
          <span className="text-[10px] bg-[#00ff88]/15 text-[#00ff88] px-2 py-1 rounded-full border border-[#00ff88]/20">2 pozisyon</span>
        </div>
        <div className="divide-y divide-[#1e293b]/50">
          {mockPositions.map(p=>(
            <div key={p.id} className="px-3 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-bold px-2 py-1 rounded ${p.side==='LONG' ? 'bg-[#00ff88] text-black' : 'bg-[#ff3366] text-white'}`}>{p.side}</span>
                <div>
                  <div className="text-xs font-bold text-white mono">{p.symbol} <span className="text-[#64748b] font-normal">{p.leverage}x</span></div>
                  <div className="text-[11px] mono text-[#64748b]">Giriş {formatPrice(p.entry)} → Mark {formatPrice(p.mark)}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-xs mono font-bold ${p.pnl>=0 ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>{p.pnl>=0?'+':''}{formatPrice(p.pnl)} USDT ({p.pnlPercent.toFixed(2)}%)</div>
                <div className="text-[10px] mono text-[#64748b]">Liq: {formatPrice(p.liquidation)}</div>
              </div>
              <button className="ml-3 text-[11px] bg-[#1e293b] hover:bg-[#ff3366] hover:text-white text-[#94a3b8] px-3 py-1.5 rounded-lg transition">Kapat</button>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl overflow-hidden">
        <div className="px-3 py-2 border-b border-[#1e293b]">
          <h3 className="text-xs font-bold text-white tracking-widest">EMİR DEFTERİ</h3>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-3 text-[10px] text-[#64748b] mono pb-1 border-b border-[#1e293b]"><span>Fiyat</span><span className="text-right">Miktar</span><span className="text-right">Toplam</span></div>
          <div className="space-y-0.5 mt-1">
            {mockAsks.slice().reverse().map((o,i)=>(
              <div key={'ask'+i} className="grid grid-cols-3 mono text-[11px]"><span className="text-[#ff3366]">{o.price.toFixed(1)}</span><span className="text-right text-white">{o.amount.toFixed(3)}</span><span className="text-right text-[#94a3b8]">{(o.total/1000).toFixed(2)}k</span></div>
            ))}
            <div className="py-1.5 text-center mono text-sm font-bold text-[#00ff88] border-y border-[#1e293b] my-1">67,842.5 <span className="text-[#64748b] text-xs">spread 25.0</span></div>
            {mockBids.map((o,i)=>(
              <div key={'bid'+i} className="grid grid-cols-3 mono text-[11px]"><span className="text-[#00ff88]">{o.price.toFixed(1)}</span><span className="text-right text-white">{o.amount.toFixed(3)}</span><span className="text-right text-[#94a3b8]">{(o.total/1000).toFixed(2)}k</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

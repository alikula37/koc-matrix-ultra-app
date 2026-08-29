export default function MatrixIndicator() {
  return (
    <div className="bg-gradient-to-br from-[#0f172a] to-[#020617] border border-[#1e293b] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold tracking-widest text-white">KOÇ MATRIX SKORU</h3>
        <span className="text-[10px] bg-[#00ff88] text-black font-bold px-2 py-1 rounded">GÜÇLÜ AL</span>
      </div>
      <div className="flex items-end gap-1 h-16 mb-3">
        {[30,45,60,78,55,82,91,68,74,88].map((v,i)=>(
          <div key={i} className="flex-1 rounded-t flex flex-col justify-end" style={{ height: '100%' }}>
            <div className={`w-full rounded-t transition-all ${v>=70 ? 'bg-[#00ff88]' : v>=40 ? 'bg-[#ffaa00]' : 'bg-[#ff3366]'}`} style={{ height: `${v}%` }}></div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-[#020617] border border-[#1e293b] rounded-lg p-2">
          <div className="text-[10px] text-[#64748b]">Skor</div>
          <div className="text-lg font-bold mono text-[#00ff88]">78</div>
        </div>
        <div className="bg-[#020617] border border-[#1e293b] rounded-lg p-2">
          <div className="text-[10px] text-[#64748b]">Risk</div>
          <div className="text-sm font-bold text-[#ffaa00]">ORTA</div>
        </div>
        <div className="bg-[#020617] border border-[#1e293b] rounded-lg p-2">
          <div className="text-[10px] text-[#64748b]">Sinyal</div>
          <div className="text-sm font-bold text-[#00ff88]">AL</div>
        </div>
      </div>
      <div className="mt-3 text-[11px] leading-relaxed text-[#94a3b8] bg-[#020617] border border-[#1e293b] rounded-lg p-2.5">
        <span className="text-white font-semibold">Matrix Analizi:</span> BTCUSDT için momentum ve hacim uyumu yüksek. 68,400 direnci kırılırsa 70k hedef. Stop: 66,200 altı.
      </div>
    </div>
  )
}

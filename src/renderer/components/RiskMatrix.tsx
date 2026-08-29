export default function RiskMatrix() {
  const data = [
    { sym: "BTC", risk: "ORTA", color: "bg-[#ffaa00]" },
    { sym: "ETH", risk: "DÜŞÜK", color: "bg-[#00ff88]" },
    { sym: "SOL", risk: "YÜKSEK", color: "bg-[#ff3366]" },
    { sym: "XU100", risk: "DÜŞÜK", color: "bg-[#00ff88]" },
    { sym: "THYAO", risk: "YÜKSEK", color: "bg-[#ff3366]" },
    { sym: "GARAN", risk: "ORTA", color: "bg-[#ffaa00]" },
  ]
  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-3">
      <h3 className="text-xs font-bold text-white tracking-widest mb-3">RİSK MATRİSİ</h3>
      <div className="grid grid-cols-3 gap-2">
        {data.map(d=>(
          <div key={d.sym} className="bg-[#020617] border border-[#1e293b] rounded-lg p-2.5 text-center">
            <div className="text-xs mono font-bold text-white">{d.sym}</div>
            <div className={`mt-1 text-[10px] font-bold text-black px-2 py-1 rounded ${d.color}`}>{d.risk}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-[10px] text-[#64748b] leading-relaxed">
        Risk matrisi pozisyon büyüklüğünü ve kaldıracı otomatik önerir. Yüksek riskli varlıklarda kaldıraç düşür.
      </div>
    </div>
  )
}

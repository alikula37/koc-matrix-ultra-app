import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { mockCandles } from '../lib/marketData'

export default function TradingChart({ symbol }: { symbol: string }) {
  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl overflow-hidden flex flex-col">
      <div className="px-3 py-2 border-b border-[#1e293b] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-bold text-white tracking-widest">{symbol} — 15M</h3>
          <div className="hidden md:flex items-center gap-1.5 text-[10px]">
            {['1M','5M','15M','1H','4H','1G'].map(tf=>(
              <span key={tf} className={`px-2 py-1 rounded ${tf==='15M' ? 'bg-[#00ff88] text-black font-bold' : 'bg-[#020617] text-[#64748b] border border-[#1e293b]'}`}>{tf}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] mono">
          <span className="text-[#64748b]">O<span className="text-white">67,520</span></span>
          <span className="text-[#64748b]">H<span className="text-white">68,100</span></span>
          <span className="text-[#64748b]">L<span className="text-white">66,900</span></span>
          <span className="text-[#00ff88]">C 67,842</span>
        </div>
      </div>
      <div className="h-[320px] p-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={mockCandles}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval={7} />
            <YAxis domain={['auto','auto']} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={60} />
            <Tooltip contentStyle={{ background: '#020617', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }} labelStyle={{ color: '#94a3b8' }} />
            <Bar dataKey="volume" barSize={4} fill="#1e293b" opacity={0.5} />
            <Line type="monotone" dataKey="close" stroke="#00ff88" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="open" stroke="#00e5ff" strokeWidth={1.2} dot={false} strokeDasharray="4 4" opacity={0.7} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="px-3 py-2 bg-[#020617] border-t border-[#1e293b] flex items-center gap-2 text-[10px]">
        <span className="text-[#64748b]">İndikatörler:</span>
        <span className="bg-[#1e293b] text-white px-2 py-1 rounded">RSI 62.4</span>
        <span className="bg-[#1e293b] text-white px-2 py-1 rounded">MACD <span className="text-[#00ff88]">▲</span></span>
        <span className="bg-[#1e293b] text-white px-2 py-1 rounded">EMA20/50</span>
        <span className="bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/30 px-2 py-1 rounded font-bold">MATRIX 78 — AL</span>
      </div>
    </div>
  )
}

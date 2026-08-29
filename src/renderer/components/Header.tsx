export default function Header() {
  return (
    <header className="h-14 border-b border-[#1e293b] bg-[#0f172a]/80 backdrop-blur flex items-center justify-between px-4 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-gradient-to-br from-[#00ff88] to-[#00e5ff] flex items-center justify-center font-bold text-black text-sm">KM</div>
        <div>
          <div className="font-bold text-white text-sm leading-none">KOÇ MATRIX ULTRA</div>
          <div className="text-[10px] text-[#64748b] tracking-widest">TRADER TERMINAL v1.0</div>
        </div>
        <span className="ml-3 hidden md:inline-flex items-center gap-2 text-xs bg-[#020617] border border-[#1e293b] px-3 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse"></span>
          <span className="text-[#94a3b8]">CANLI</span>
          <span className="text-white mono">BTC 67,842.50</span>
          <span className="text-[#00ff88]">+2.34%</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 text-xs">
          <span className="text-[#64748b]">Bakiye</span>
          <span className="text-white mono font-semibold">₺ 1,248,500</span>
          <span className="text-[#00ff88] text-[10px] bg-[#00ff88]/10 px-2 py-0.5 rounded">+₺12,420 bugün</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-[#1e293b] border border-[#334155] flex items-center justify-center text-white text-xs">AK</div>
      </div>
    </header>
  )
}

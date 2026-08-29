import { useState } from 'react'
import Header from './components/Header'
import MarketOverview from './components/MarketOverview'
import TradingChart from './components/TradingChart'
import OrderPanel from './components/OrderPanel'
import Portfolio from './components/Portfolio'
import MatrixIndicator from './components/MatrixIndicator'
import RiskMatrix from './components/RiskMatrix'

export default function App() {
  const [selected, setSelected] = useState('BTCUSDT')

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Header />
      <main className="max-w-[1600px] mx-auto p-3 md:p-4 space-y-3">
        {/* Top stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-3">
            <div className="text-[10px] tracking-widest text-[#64748b]">TOPLAM HACİM 24S</div>
            <div className="mono text-lg font-bold text-white mt-1">$2.84B</div>
            <div className="text-[11px] text-[#00ff88]">+4.2% dün</div>
          </div>
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-3">
            <div className="text-[10px] tracking-widest text-[#64748b]">AÇIK POZİSYON PnL</div>
            <div className="mono text-lg font-bold text-[#00ff88] mt-1">+₺1,261</div>
            <div className="text-[11px] text-[#94a3b8]">2 pozisyon</div>
          </div>
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-3">
            <div className="text-[10px] tracking-widest text-[#64748b]">MATRIX ORTALAMA SKOR</div>
            <div className="mono text-lg font-bold text-[#ffaa00] mt-1">62 / 100</div>
            <div className="text-[11px] text-[#94a3b8]">6 AL • 2 SAT</div>
          </div>
          <div className="bg-gradient-to-br from-[#00ff88]/20 to-[#00e5ff]/20 border border-[#00ff88]/30 rounded-xl p-3">
            <div className="text-[10px] tracking-widest text-[#00ff88]">KOÇ MATRIX SİNYALİ</div>
            <div className="text-sm font-bold text-white mt-1">SOLUSDT — GÜÇLÜ AL (91)</div>
            <div className="text-[11px] text-[#ccffdd]">Hacim + momentum uyumlu</div>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 lg:col-span-3">
            <MarketOverview selected={selected} onSelect={setSelected} />
          </div>
          <div className="col-span-12 lg:col-span-6 space-y-3">
            <TradingChart symbol={selected} />
            <Portfolio />
          </div>
          <div className="col-span-12 lg:col-span-3 space-y-3">
            <OrderPanel symbol={selected} />
            <MatrixIndicator />
            <RiskMatrix />
          </div>
        </div>

        <footer className="text-center text-[10px] text-[#475569] py-4 border-t border-[#1e293b] mono">
          Koç Matrix Ultra • Trader Terminal • Veriler gecikmeli olabilir, yatırım tavsiyesi değildir. • alikula37/koc-matrix-ultra-app
        </footer>
      </main>
    </div>
  )
}

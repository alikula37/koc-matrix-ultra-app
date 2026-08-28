# Koç Matrix Ultra - Trader App

> Trader için gelişmiş, Matrix tarzı trading platformu.

**Repo:** `alikula37/koc-matrix-ultra-app`  
**Stack:** React + TypeScript + Vite + Tailwind CSS + Recharts

## Özellikler

- **Matrix Dashboard** - Koç Matrix konseptli piyasa heatmap ve korelasyon matrisi
- **Canlı Fiyatlar** - WebSocket tabanlı ticker (Binance / BIST mock)
- **Trading Chart** - Mum grafik, indikatörler (RSI, MACD, EMA, Matrix Level)
- **Emir Paneli** - Long/Short, kaldıraç, TP/SL, risk hesaplayıcı
- **Portföy & PnL** - Pozisyonlar, geçmiş işlemler, toplam kar/zarar
- **Risk Matrix** - Pozisyon büyüklüğü, marjin, liquidation seviyesi
- **Sinyal Motoru** - Matrix skoruna göre al/sat sinyalleri

## Kurulum

```bash
# Node 20+ önerilir
npm install
npm run dev
```

Tarayıcıda: http://localhost:5173

```bash
npm run build
npm run preview
```

## Proje Yapısı

```
src/
  components/
    Header.tsx
    MarketOverview.tsx
    TradingChart.tsx
    OrderPanel.tsx
    Portfolio.tsx
    MatrixIndicator.tsx
    RiskMatrix.tsx
  lib/
    utils.ts
    marketData.ts
  types/
    trading.ts
  App.tsx
  main.tsx
```

## Git

```bash
git clone https://github.com/alikula37/koc-matrix-ultra-app.git
cd koc-matrix-ultra-app
```

## Güvenlik Notu

GitHub token'ınızı asla public repo veya chat'te paylaşmayın. Bu repo oluşturulurken kullanılan token'ı GitHub > Settings > Developer settings > Personal access tokens menüsünden revoke edin ve gerekirse yenisiyle `git remote` güncelleyin.

## Lisans

MIT

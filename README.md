# Koç Matrix Ultra — Trading Journal & Execution Analytics Engine

> **Tek kullanıcı (trader) için, gerçek para kararlarının dayandığı production-grade sistem.**  
> Ticari değil, ama kalite prod kadar yüksek. macOS + Docker, sıfır veri kaybı, PWA + Tailscale.

**Repo:** `alikula37/koc-matrix-ultra-app` • **Stack:** FastAPI + PostgreSQL + Next.js + Caddy + Docker Compose + Tailscale

---

## 0. Sıfır Terminal Kurulum (Trader için)

Trader hiçbir zaman terminal/GitHub görmez:

1. **GitHub Releases → `KoçMatrixUltra.dmg` indir** (CI otomatik üretir)
2. Sürükle-bırak **Uygulamalar** klasörüne kur
3. Uygulamayı aç → menü çubuğunda:
   - Docker yoksa “Docker İndir” yönlendirmesi
   - `ghcr.io`’dan image pull + `docker compose up -d` (arka planda)
   - `● Journal Çalışıyor` / `○ Başlatılıyor…` / `✕ Hata — Yardım Al`
4. Menü → **Uygulamayı Aç** → http://localhost:3000 (veya `koc-matrix.ts.net` via Tailscale)
5. iPhone/Android’de Tailscale + PWA “Ana Ekrana Ekle”

> Güncelleme: yeni `.dmg` indir-kur yeterli. Wrapper “Güncellemeleri Kontrol Et” de yapar. Log için **Tanı Bilgisi Kopyala** → WhatsApp’a yapıştır.

Geliştirici için: `docker compose up -d` tek komutla tüm stack healthy.

---

## 1. Mimari

```
koc-matrix-ultra/
├── docker-compose.yml              # prod (db, backend, frontend, backup, caddy[prod profile])
├── docker-compose.override.yml     # dev overrides (reload, ports)
├── Caddyfile                       # local + Tailscale HTTPS
├── .env.example                    # kopyala -> .env
├── backend/                        # FastAPI 3.11 + async SQLAlchemy 2.0 + Alembic
│   ├── Dockerfile
│   ├── alembic/ + alembic.ini
│   ├── app/core/{config, database, security}
│   ├── app/models/{trade, trade_exit, trade_edit_history, account, setup, notification, draft_trade}
│   ├── app/api/v1/{auth, trades, analytics, webhooks, accounts}
│   ├── app/services/{analytics, notifications}
│   └── seed.py + app/tests
├── frontend/                       # Next.js 14 App Router + TS + Tailwind + Shadcn + PWA (next-pwa)
│   ├── app/(dashboard)/{dashboard, trades, calendar, analytics}
│   ├── components/ui/{button, card}
│   ├── lib/{api, utils}
│   └── public/manifest.json
├── backup/                         # pg_dump cron + 30 gün retention + rclone (opsiyonel)
├── wrapper/                        # Electron menü çubuğu app (Tauri’ye geçiş hazır)
└── .github/workflows/{ci.yml, release.yml} # GHCR push + .dmg notarize
```

- **DB Decoupling:** `pg_data` named volume, `docker compose down -v` **yapmadan** veri kalır.
- **Realtime:** `ws://…/ws/trades` — bir cihazdan trade eklenince diğerinde auto refresh (WS broadcast).
- **Auth:** JWT access+refresh, `Authorization: Bearer <token>`; mobilde PWA + PIN/biometric (WebAuthn hazır).
- **OpenAPI:** `http://localhost:8000/docs` sabit — frontend sil-yeniden yaz, sözleşme bozulmaz.

---

## 2. Veri Modeli

- **accounts** (çoklu hesap: Binance Futures / BIST ayrı)
- **trades**: `trade_no`, `entry_date`, `exit_date`, `symbol`, `direction`, `entry_price`, `sl`, `tp1/2/3`, `position_size`, `leverage`, `commission_fees`, `status` (OPEN/CLOSED/PARTIAL), `emotions`/`indicators_used`/`setups` (JSON), `execution_quality_score`, `chart_snapshot_paths`, `planned_rr`, `realized_rr`, `net_pnl_cash/r`
- **trade_exits**: her kısmi çıkış ayrı satır — `exit_price/qty/time/reason` (TP1/TP2/TP3/SL/Manual/BE/Panic), `pnl_cash/r` aggregate → `trades.net_pnl`
- **trade_edit_history**: JSON diff + timestamp (soft audit)
- **setups / indicators / emotions**: CRUD referans tablolar (hardcoded değil)
- **notifications**: push/telegram log
- **draft_trades**: TradingView webhook (`WEBHOOK_ENABLED=false` default)

Tümü Alembic ile versiyonlu, `seed.py` 12 senaryo ile test verisi üretir.

---

## 3. Analytics

- Temel: Win Rate, Total Net R, Avg RR, W/L count
- Gelişmiş: Profit Factor, Expectancy, Sharpe, Sortino, Max Drawdown (R & ₺), Streak, Risk of Ruin
- Kırılımlar: duygu, setup, indikatör, saat (İST), haftanın günü, hesap → ayrı equity curve
- Her metrik **R ve ₺/USDT paralel**
- Sapma: realized vs planned RR

Endpoint: `GET /api/v1/analytics/summary?account_id=&date_from=&date_to=` + `breakdown.by_*`

---

## 4. Takvim & Bildirim

- **Heatmap takvim:** her gün `total_r`/`total_cash` ve yeşil/kırmızı yoğunluk, tıkla → o günün trade’leri, R/₺ toggle
- Haftalık/aylık özet + PDF export (`window.print`)
- **Push:** Web Push (PWA) + opsiyonel Telegram (`TELEGRAM_BOT_TOKEN`) — drawdown `-5R`, 3 kayıp streak, gün/hafta/ay kapanışı

---

## 5. Webhook

`POST /api/v1/webhooks/tradingview` `{symbol, signal_type, price, sl, tp}` → doğrula → `draft_trades`. Feature flag kapalı.

---

## 6. Geliştirici Kurulumu

```bash
cp .env.example .env
docker compose up -d          # dev (override otomatik)
# veya prod: docker compose --profile prod up -d
docker compose logs -f backend
# migration
docker compose exec backend alembic upgrade head
# seed 12 senaryo
docker compose exec backend python seed.py
# test
docker compose exec backend pytest app/tests -v
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000/docs, health: /api/v1/health
- DB: localhost:5432 (koc_matrix / koc_matrix_secret_2025)

**Yedek:** `docker compose exec backup /usr/local/bin/backup.sh` → `./backups/dump_*.sql.gz` (30 gün) + haftalık rclone (RCLONE_ENABLED=true + /rclone.conf)

**Restore:** `gunzip -c backups/dump_*.sql.gz | docker compose exec -T db psql -U koc_matrix -d koc_matrix_ultra`

**Tailscale:** `tailscale up` → Caddyfile’de `koc-matrix.ts.net` uncomment.

---

## 7. Test & DoD

- `pytest` (Win Rate, PF, Expectancy, Sharpe, Sortino, DD, kısmi PnL, multi-account) — `backend/app/tests/test_analytics.py`
- E2E (Playwright hazır): trade ekle/düzenle (edit history), takvim, bildirim
- Responsive: Mac + iPhone + Android snapshot
- Veri kaybı: `docker compose down` (v olmadan) + `up` → veri duruyor mu
- Backup dump + restore testi, `docker compose logs` temiz

CI: `.github/workflows/ci.yml` — backend test + frontend build + compose health  
Release: `.github/workflows/release.yml` — tag `v*` → GHCR push + `.dmg` build + notarize + Releases

---

## 8. Wrapper (macOS .dmg)

`wrapper/main.js` — Electron menü çubuğu: Docker check → pull → up → tray `●/○/✕` + “Uygulamayı Aç / Güncellemeleri Kontrol Et / Yedek Al / Tanı Bilgisi Kopyala”. Login Items ile otostart, `restart: always`. Kod imzalama: `APPLE_ID / APPLE_PASSWORD / APPLE_TEAM_ID` secrets ile notarize.

---

## Lisans

MIT — kişisel kullanım.

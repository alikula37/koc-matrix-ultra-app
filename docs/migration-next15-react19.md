# Migration Plan — Next.js 14 → 15 + React 18 → 19 + next-intl 3 → 4

**Durum (2026-08-29):** `main` şu an **Next 14.2.33 (LTS patch) + React 18.3.1 + next-intl 3.26.3 + next-pwa 5.6.0** ile **CI 4/4 yeşil**. Root Electron **Vite 6.3.5 + electron 38.1.2 + electron-builder 26.0.12** ile `tsc --noEmit --strict true` geçiyor. Major yükseltmeler **kırılma riski** nedeniyle ayrı planlandı — bu doküman adım adım, CI kırılmadan nasıl geçileceğini tanımlar.

## Neden bekletildi?
- **Next 15** `next-intl 4` ister (3, 15'i resmen desteklemez). `next-pwa 5.6` de 15 ile peer uyarısı verir (workbox 7 gerekir).
- **React 19** `react-dom 19` + `@types/react 19` ister; `recharts 2.15` 19'u destekler ama `next 14` 19'u desteklemez (hydration mismatch).
- **ESLint 9** `eslint-config-next 15` ile birlikte gelmeli (8→9 flat config breaking).
- CI `frontend-build` `npm ci || npm install` şu an **patch** seviyesinde yeşil; major'ı tek PR'da yapmak `i18n-check` ve `docker-compose-health`'i riske atar.

## Hedef versiyonlar (LTS)
- `next@15.4.6` (App Router stable), `react@19.1.1` `react-dom@19.1.1`, `@types/react@19.1.x` `@types/react-dom@19.1.x`
- `next-intl@4.3.x` (Next 15 için), `next-pwa@5.6.x` veya `serwist@9` (next-pwa EOL ise)
- `eslint@9.20.x` + `eslint-config-next@15.4.6`, `typescript@5.8.x` (zaten 5.8.3), `tailwind@3.4.17` (korunuyor)
- `zustand 5.0.x` (4→5 store API küçük breaking), `date-fns 4.x` (zaten 4.1.0), `recharts 2.15.x` (3 beta beklet)

## Adım adım plan (CI kırılmadan)

### Faz 0 — Hazırlık (yapıldı)
- [x] `next 14.2.5 → 14.2.33` patch, `recharts 2.15`, `date-fns 4`, `@types/node 20.19` — `26feaae` + `fa4dfc7`
- [x] `vite 6.3.5 + electron 38` — `fa4dfc7`
- [x] `src/main` `strict:true` + preload tip güvenliği — bu PR

### Faz 1 — next-intl 3 → 4 (izole PR)
1. Branch `chore/next-intl-4`
2. `npm install next-intl@4.3.x` (peer `next@^15` ister ama `14` ile de çalışır — önce intl'i hazırla)
3. `frontend/i18n/routing.ts` `defineRouting` → `createNavigation` API'i 4'te aynı, fakat `getRequestConfig` import `next-intl/server` oldu.
4. `frontend/i18n/request.ts` → `import {getRequestConfig} from 'next-intl/server'` + `deepMergeFallback` korunacak.
5. `frontend/middleware.ts` `createMiddleware(routing)` 3→4 aynı.
6. `messages/*.json` değişmez (241 keys).
7. `npm run build` + `node scripts/check-i18n.cjs` + `docker compose build frontend` — CI `i18n-check` yeşilse merge.

### Faz 2 — React 18 → 19 + Next 15 (birlikte)
1. Branch `chore/next15-react19`
2. `npm install next@15.4.6 react@19.1.1 react-dom@19.1.1 @types/react@19 @types/react-dom@19 eslint-config-next@15.4.6 eslint@9`
3. `frontend/next.config.js` `withPWA` → `next-pwa` 15'te `experimental.turbo` uyarısı verirse `serwist`'e geç (PWA config `serwist/next`).
4. `frontend/app/layout.tsx` `NextIntlClientProvider` 4'te `locale` prop'u değişti → kontrol.
5. `React.memo` + `useMemo` zaten yapıldı (`dashboard/page.tsx:14` `EquityChart memo`) — 19'da `react/compiler` opsiyonel, şimdilik pas.
6. `npm run build` 27/27 `generateStaticParams` 15'te `output:standalone` aynı.
7. Playwright `frontend/e2e/*` `npm run build && npx playwright test` — CI `docker-compose-health` ile birlikte.

### Faz 3 — Zustand 4 → 5, ESLint 8 → 9
- `zustand 5` `create` API aynı, sadece `persist` import yolu `zustand/middleware` değişebilir — `grep -R zustand frontend`.
- ESLint 9 flat config: `eslint.config.mjs` oluştur, `eslint .` CI'da `frontend-build` sonrası çalıştır.

### Faz 4 — Vite 6 → 7 (opsiyonel, electron-vite 3.1 zaten 7'yi destekler)
- `vite 6.3.5 → 7.x` sadece `electron.vite.config.ts` ve `vite.config.ts` `resolve.__dirname` zaten ESM-safe.

## Doğrulama checklist (her fazda)
- `npx tsc --noEmit --strict` (root `src/main|preload|renderer` + `frontend` ayrı)
- `npm ci --prefix frontend && npm run build` (27 pages, `/_next/static` 3 dil)
- `node scripts/check-i18n.cjs` (241 keys, `Nav.dashboard=Dashboard`)
- `docker compose config` + `docker compose build frontend` (CI `docker-compose-health` aynı)
- `pytest app/tests -v` (backend etkilenmez)

## Riskler ve geri alma
- **Rollback:** Her faz tek PR, `git revert` ile tek adım geri. `release-please` `v*` tag'i sadece `main` merge'de üretildiği için major PR'lar `chore` olarak `minor` bump verir (0.2.0 → 0.3.0), `major` için `feat!:` commit gerekir.
- **PWA:** `next-pwa` 15'te çalışmazsa `serwist` fallback, `public/sw.js` gitignore zaten.

## Zamanlama
- Faz 1 + 2 birlikte **1 gün** (CI 15dk). Faz 3+4 **0.5 gün**. Toplam **<2 gün** kesintisiz.

## Mevcut CI-safe durum
- Şu anki `frontend/package.json:12` `next 14.2.33` + `react 18.3.1` **LTS** ve **CI yeşil** — production-ready. Major'lar için bu plan uygulanana kadar **erteleme** bilinçli teknik borç değil, risk yönetimi.

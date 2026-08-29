# CONTRIBUTING — Koç Matrix Ultra

## Dil (i18n) Kuralı — Zorunlu

> **TR/EN/DE ayrı, `localePrefix: always`, Dashboard sabit, çevirisi yoksa EN fallback.**  
> Bu kuralı ihlal eden PR **CI `i18n-check` de fail eder** ve merge edilmez.

### 1. `localePrefix: always` (SEO + PWA cache)
```ts
// frontend/i18n/routing.ts
defineRouting({ locales: ['tr','en','de'], defaultLocale: 'tr', localePrefix: 'always' })
```
- URL her zaman prefixli: `/tr/dashboard`, `/en/dashboard`, `/de/dashboard`
- `/` → `307 /tr` (middleware), `/dashboard` → `307 /tr/dashboard`
- `Link`, `useRouter`, `usePathname` **her zaman** `from "@/i18n/routing"` kullan — `next/link` veya `next/navigation` doğrudan **yasak**.

### 2. `Dashboard` sabit
```json
// frontend/messages/tr.json, en.json, de.json
"Nav": { "dashboard": "Dashboard" } // her 3 dilde bire bir aynı
```
- Kullanıcı isteği: nav'da TR’de de `Dashboard` yazar. Değiştirme.

### 3. Çeviri altyapısı — yeni metin ekleme akışı
1. Hard-coded Türkçe/İngilizce string **yazma**. `>İşlemler<` veya `"Kazanma Oranı"` gibi literaller **yasak**.
2. Önce `frontend/messages/{tr,en,de}.json` üçüne de ekle (aynı key seti):
```json
"Home": { "cards": { "analyticsTitle": "Analitik" } } // tr
"Home": { "cards": { "analyticsTitle": "Analytics" } } // en
"Home": { "cards": { "analyticsTitle": "Analyse" } }   // de
```
3. Kaynakta `useTranslations` ile tüket:
```tsx
"use client"
import { useTranslations } from "next-intl"
const t = useTranslations("Home")
<h3>{t("cards.analyticsTitle")}</h3>
```
4. Teknik terimler **EN kalır** (fallback EN + tooltip): `Setup`, `Equity Curve`, `Expectancy`, `Payoff`, `Breakdown`, `Live`, `Sharpe`, `Sortino`, `Long`, `Short`, `R`. Glossary tabanı: Binance TR, TradingView TR/DE, IG.de, cTrader.
5. `npm run build` öncesi **lokal kontrol**:
```bash
docker run --rm -v "$PWD:/work" -w /work node:20-alpine node scripts/check-i18n.cjs
# veya WSL'de: node scripts/check-i18n.cjs  (package.json type module ise .cjs kullan)
```
- `192 keys` parity, `Nav.dashboard = Dashboard`, `fallback EN` hepsi `✓` olmalı.
- Missing key varsa `✗ tr.json missing ...` ile **fail** eder — PR oluşturma.

### 4. Fallback kuralı (çevirisi yoksa EN)
`frontend/i18n/request.ts` → `deepMergeFallback(localeMessages, enMessages)`  
DE veya TR’de bir key eksikse **ekrandaki metin EN gösterilir**, boş kalmaz. Ancak CI yine de fail eder — eksik key’i tamamlamak zorundasın.

### 5. PWA & hreflang
- `frontend/public/manifest.json` `start_url: "/tr"`, `scope: "/"` — PWA TR ile açılır.
- `frontend/app/[locale]/layout.tsx` `generateMetadata` → `alternates.languages { tr: "/tr", en: "/en", de: "/de", "x-default": "/tr" }` + `<html lang={locale}>` otomatik hreflang.
- `next-pwa` workbox `disable: development`, middleware `matcher: "/((?!api|_next|_vercel|.*\\..*).*)"` PWA sw’leri locale middleware’den hariç.

### 6. Wrapper (Electron)
`wrapper/main.js` → `frontendUrl('/tr/dashboard')` + `backendDocsUrl()`  
`FRONTEND_PORT`/`BACKEND_PORT` env ile `http://localhost:3001` (dev compose `3001→3000`). Eski `3000` hard-code kullanma.

### 7. CI
`.github/workflows/ci.yml` jobs:
- `backend-test` (pytest + seed)
- `frontend-build` (`npm run build` → 27 static pages `/tr|en|de`)
- `i18n-check` (`node scripts/check-i18n.cjs` — key parity + Dashboard kuralı)
- `docker-compose-health` (`docker compose config` + `db` health)

Branch koruması: `required_status_checks.strict=true`, `contexts: ["backend-test","frontend-build","i18n-check","docker-compose-health"]`, `required_approving_review_count:1`.  
Yeni PR’da `i18n-check` kırmızıysa çeviriyi tamamlamadan merge yok.

### 8. Dış AI’a devretme prompt’u (otomatik çeviri)
Yeni feature’ı harici AI’a yaptırırken şu prompt’u ver — bizde yapılan derin glossarial araştırma korunur:

> “Koc Matrix Ultra: Next.js 14 + next-intl 3.26.3, localePrefix always, 3 locale tr/en/de. Dashboard nav’da her dilde ‘Dashboard’. Yeni ekleyeceğin her UI stringi `frontend/messages/{tr,en,de}.json` içinde aynı key’le 3 dilde ekle; çeviriler için TradingView TR/DE + IG.de + cTrader glossary’ini referans al, teknik terim (Setup/Equity Curve/Sharpe/R) EN bırak, fallback EN, `Link/useRouter/usePathname` için `@/i18n/routing` kullan. PR öncesi `node scripts/check-i18n.cjs` 0 exit vermeli. Çevirileri otomatik üret ama son review için diff’i `messages/*.json` olarak göster.”

### 9. Hızlı checklist (PR öncesi)
- [ ] `Link`/`useRouter` import’u `@/i18n/routing`’ten mi?
- [ ] Yeni string `messages/*.json` 3 dilde var mı? `Dashboard` sabit kaldı mı?
- [ ] `node scripts/check-i18n.cjs` `✓ PASSED` ?
- [ ] `npm run build` 27 pages? `/tr/dashboard` `curl` ile `KAZANMA ORANI` / `WIN RATE` / `TREFFERQUOTE` doğru mu?
- [ ] `docker compose up -d` still healthy?

 Sorun olursa `docker compose logs --tail 100` + `Tanı Bilgisi Kopyala` (wrapper) → WhatsApp.

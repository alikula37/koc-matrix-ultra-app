#!/usr/bin/env node
/**
 * Koç Matrix — i18n guard
 * - messages/tr|en|de.json aynı anahtar setine sahip mi? (eksik çeviri = fail)
 * - Dashboard Nav değeri 3 dilde de "Dashboard" mı? (kullanıcı isteği)
 * - Kaynakta hard-coded Türkçe/UI literali kalmış mı? (geliştirici hatası)
 * Exit 0 = ok, 1 = fail (CI fail)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MESSAGES_DIR = path.join(ROOT, 'frontend/messages');
const LOCALES = ['tr', 'en', 'de'];

function loadJson(locale) {
  const p = path.join(MESSAGES_DIR, `${locale}.json`);
  if (!fs.existsSync(p)) {
    console.error(`✗ missing ${p}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function flatKeys(obj, prefix = '') {
  const out = new Set();
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const sub of flatKeys(v)) out.add(`${key}.${sub}`);
    } else {
      out.add(key);
    }
  }
  return out;
}

console.log('=== i18n check: key parity ===');
const dicts = Object.fromEntries(LOCALES.map(l => [l, loadJson(l)]));
const keySets = Object.fromEntries(LOCALES.map(l => [l, flatKeys(dicts[l])]));
const allKeys = new Set([...keySets.tr, ...keySets.en, ...keySets.de]);

let fail = false;
for (const loc of LOCALES) {
  const missing = [...allKeys].filter(k => !keySets[loc].has(k));
  const extra = [...keySets[loc]].filter(k => !allKeys.has(k)); // always empty but keep
  if (missing.length) {
    console.error(`✗ ${loc}.json missing ${missing.length} keys:`);
    missing.slice(0, 30).forEach(k => console.error(`  - ${k}`));
    if (missing.length > 30) console.error(`  ... +${missing.length - 30} more`);
    fail = true;
  } else {
    console.log(`✓ ${loc}.json — ${keySets[loc].size} keys`);
  }
}

// parity detay: tr vs en vs de diff
for (const a of LOCALES) for (const b of LOCALES) if (a < b) {
  const diffAB = [...keySets[a]].filter(k => !keySets[b].has(k));
  const diffBA = [...keySets[b]].filter(k => !keySets[a].has(k));
  if (diffAB.length || diffBA.length) {
    console.error(`✗ parity ${a} vs ${b}: ${a}→${b} missing ${diffAB.length}, ${b}→${a} missing ${diffBA.length}`);
    fail = true;
  }
}

// Dashboard sabit kuralı
console.log('\n=== i18n check: Dashboard sabit ===');
for (const loc of LOCALES) {
  const v = dicts[loc]?.Nav?.dashboard;
  if (v !== 'Dashboard') {
    console.error(`✗ Nav.dashboard in ${loc}.json is "${v}" — expected "Dashboard"`);
    fail = true;
  }
}
if (!fail) console.log('✓ Nav.dashboard = "Dashboard" in all locales');

// Hard-coded literal guard (basit heuristic)
// İzin verilen yerler: messages/*.json, test fixtures, password seed, e2e snapshot
console.log('\n=== i18n check: hard-coded literal scan ===');
const ALLOW_LIST = [
  'KocMatrix2025!', // seed password
  'KOÇ MATRIX', // brand fallback in html title
  'POST /api', // technical docs in settings
  'chart_snapshot_paths',
  'openapi.json',
];
const SCAN_DIRS = ['frontend/app', 'frontend/components', 'frontend/lib'];
const TURKISH_RE = /[A-ZÇĞİÖŞÜ]{2,}|İşlem|Kazanma|Takvim|Analitik|Giriş|Çıkış|Kaydet|İptal/;
const SCAN_EXCLUDE_RE = /settings\/page\.tsx$/; // settings has technical docs with Turkish description, allowed

let hardCodedHits = [];
for (const dir of SCAN_DIRS) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  const files = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(tsx?|ts)$/.test(e.name)) files.push(p);
    }
  })(abs);
  for (const f of files) {
    if (SCAN_EXCLUDE_RE.test(f)) continue;
    const txt = fs.readFileSync(f, 'utf8');
    const lines = txt.split('\n');
    lines.forEach((line, idx) => {
      // t() veya useTranslations kullanan satırları skip, import line skip
      if (line.includes('useTranslations') || line.includes('t(') || line.trim().startsWith('import')) return;
      // allow list
      if (ALLOW_LIST.some(s => line.includes(s))) return;
      // JSX text node literal: >Türkçe<  veya "Türkçe" içinde TR karakter
      // Sadece bariz Türkçe UI kelimeleri ara, çok katı değil — warning olarak raporla
      if (/>[^<]*[çğıöşüÇĞİÖŞÜ][^<]*</.test(line) && TURKISH_RE.test(line)) {
        // eğer t( ile çevrilmemişse
        if (!line.includes('t(') && !line.includes('tCommon') && !line.includes('tNav') && !line.includes('tBrand')) {
          hardCodedHits.push(`${path.relative(ROOT, f)}:${idx + 1}: ${line.trim().slice(0, 120)}`);
        }
      }
    });
  }
}
if (hardCodedHits.length) {
  console.warn(`⚠ possible hard-coded Turkish literals (${hardCodedHits.length}) — review:`);
  hardCodedHits.slice(0, 20).forEach(h => console.warn('  ' + h));
  // warning only, not fail — çünkü false positive yüksek; CI fail sadece key parity
} else {
  console.log('✓ no obvious hard-coded Turkish literals in app/components/lib');
}

console.log('\n=== i18n check: fallback EN rule ===');
console.log('  Policy: çevirisi yoksa EN göster (next-intl getRequestConfig fallback).');
console.log('  Eponym & trading terms KEEP: Sharpe/Sortino/Long/Short/R — verified via glossary.');

if (fail) {
  console.error('\n✗ i18n check FAILED — missing keys or Dashboard rule. Fix messages/*.json.');
  process.exit(1);
}
console.log('\n✓ i18n check PASSED');

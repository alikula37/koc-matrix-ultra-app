/**
 * Koç Matrix Ultra — macOS menü çubuğu wrapper (Electron)
 * Trader sıfır terminal görecek:
 * 1. Docker Desktop kurulu değilse yönlendir
 * 2. ghcr.io'dan image pull
 * 3. docker compose up -d (arka planda)
 * Menü: ● Çalışıyor / ○ Başlatılıyor / ✕ Hata — Yardım Al
 */
const { app, Menu, Tray, shell, dialog, Notification } = require('electron')
const { exec, spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

// --- Auto-Updater (electron-updater) — opsiyonel, sadece packaged app'te aktif ---
let autoUpdater = null
try {
  // require dinamik: geliştirme ortamında modül yoksa crash etme
  const updater = require('electron-updater')
  autoUpdater = updater.autoUpdater
  if (autoUpdater) {
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    // GitHub Releases provider — build.publish config'ten otomatik okur
    // Manuel check için log ekle
    autoUpdater.logger = {
      info: (msg) => console.log('[updater]', msg),
      warn: (msg) => console.warn('[updater]', msg),
      error: (msg) => console.error('[updater]', msg),
      debug: (msg) => console.debug('[updater]', msg),
    }
  }
} catch (e) {
  console.warn('[updater] electron-updater yüklenemedi (dev mod):', e.message)
}

let tray = null
let status = 'starting' // starting | running | error

function run(cmd, opts={}) {
  return new Promise((resolve, reject) => {
    exec(cmd, opts, (err, stdout, stderr) => {
      if(err) reject({err, stdout, stderr})
      else resolve({stdout, stderr})
    })
  })
}

async function checkDocker() {
  try { await run('docker --version'); return true } catch { return false }
}
async function pullImages() {
  // ghcr.io images — public, no auth needed if repo public; if private, user will be prompted to docker login
  await run('docker compose pull', { cwd: path.join(__dirname, '..') })
}
async function up() {
  await run('docker compose up -d', { cwd: path.join(__dirname, '..') })
}
async function isHealthy() {
  try {
    const { stdout } = await run('docker compose ps --format json', { cwd: path.join(__dirname, '..') })
    return stdout.includes('healthy') || stdout.includes('running')
  } catch { return false }
}

function frontendUrl(path='/tr') {
  const port = process.env.FRONTEND_PORT || '3001';
  return `http://localhost:${port}${path}`;
}
function backendDocsUrl() {
  const port = process.env.BACKEND_PORT || '8001';
  return `http://localhost:${port}/docs`;
}

function setupAutoUpdater() {
  if (!autoUpdater || !app.isPackaged) {
    console.log('[updater] skipped — dev mode or not packaged (isPackaged=', app.isPackaged, ')');
    return;
  }
  // Event listeners — kullanıcıya native dialoglarla bildir
  autoUpdater.on('checking-for-update', () => console.log('[updater] checking-for-update'));
  autoUpdater.on('update-available', (info) => {
    console.log('[updater] update-available', info.version);
    new Notification({ title: 'Koç Matrix — Güncelleme Var', body: `v${info.version} indirilmeye başlandı…` }).show();
  });
  autoUpdater.on('update-not-available', (info) => console.log('[updater] update-not-available', info.version));
  autoUpdater.on('error', (err) => {
    console.error('[updater] error', err);
    // Sessiz kal — kullanıcı manuel menüden tekrar deneyebilir; log clipboard için saklanır
  });
  autoUpdater.on('download-progress', (p) => console.log(`[updater] download ${Math.round(p.percent)}%`));
  autoUpdater.on('update-downloaded', (info) => {
    console.log('[updater] update-downloaded', info.version);
    dialog.showMessageBox({
      type: 'info',
      buttons: ['Şimdi Yeniden Başlat', 'Sonra'],
      defaultId: 0,
      message: `Koç Matrix v${info.version} hazır`,
      detail: 'İndirme tamamlandı. Uygulamayı yeniden başlatarak güncellemeyi kurmak ister misiniz?',
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
  });
  // İlk kontrol: uygulama açıldıktan 5 sn sonra (Docker boottan sonra)
  setTimeout(() => checkForAppUpdates(false), 5000);
  // Periyodik: her 6 saatte bir
  setInterval(() => checkForAppUpdates(false), 6 * 60 * 60 * 1000);
}

async function checkForAppUpdates(manual = false) {
  if (!autoUpdater) {
    if (manual) dialog.showMessageBox({ message: 'Auto-updater dev modda kapalı (sadece packaged build’te çalışır).' });
    return;
  }
  if (!app.isPackaged) {
    if (manual) dialog.showMessageBox({ message: 'Auto-updater sadece paketlenmiş .dmg/.exe build’lerde çalışır. `npm run dist` ile oluşturulan sürümü test edin.' });
    return;
  }
  try {
    const result = await autoUpdater.checkForUpdatesAndNotify();
    if (manual && !result) {
      // result null ise update yoksa da kullanıcıya bildir
      // electron-updater döküm: checkForUpdatesAndNotify null dönebilir → manuelde bilgi ver
      // Ek kontrol için checkForUpdates() kullan
      const upd = await autoUpdater.checkForUpdates().catch(() => null);
      if (!upd || !upd.updateInfo || upd.updateInfo.version === app.getVersion()) {
        dialog.showMessageBox({ message: `Güncel sürümdesiniz — v${app.getVersion()}` });
      }
    }
  } catch (e) {
    console.error('[updater] check failed', e);
    if (manual) dialog.showErrorBox('Güncelleme Kontrol Hatası', String(e.message || e));
  }
}

function buildMenu() {
  const label = status==='running' ? '● Journal Çalışıyor' : status==='starting' ? '○ Başlatılıyor...' : '✕ Hata — Yardım Al'
  const updaterAvailable = !!autoUpdater && app.isPackaged
  return Menu.buildFromTemplate([
    { label, enabled: false },
    { type: 'separator' },
    { label: 'Uygulamayı Aç', click: () => shell.openExternal(frontendUrl('/tr/dashboard')) },
    { label: 'API Docs', click: () => shell.openExternal(backendDocsUrl()) },
    { label: 'Güncellemeleri Kontrol Et (Docker)', click: async () => {
        try { await pullImages(); await up(); new Notification({title:'Koç Matrix', body:'Docker imajları güncellendi'}).show() } catch(e){ dialog.showErrorBox('Güncelleme Hatası', String(e.err || e)) }
      }},
    ...(updaterAvailable ? [{ label: 'Uygulama Güncellemesini Kontrol Et', click: () => checkForAppUpdates(true) }] : []),
    { label: 'Yedek Al', click: async () => {
        try { await run('docker compose exec backup /usr/local/bin/backup.sh', {cwd: path.join(__dirname,'..')}); dialog.showMessageBox({message:'Yedek alındı — ./backups klasöründe'}) } catch(e){ dialog.showErrorBox('Yedek Hatası', String(e.stderr || e)) }
      }},
    { label: 'Tanı Bilgisi Kopyala', click: async () => {
        try {
          const {stdout: logs} = await run('docker compose logs --tail 200', {cwd: path.join(__dirname,'..')})
          const {clipboard} = require('electron')
          clipboard.writeText(logs.slice(-8000))
          dialog.showMessageBox({message:'Son 200 satır log panoya kopyalandı — WhatsApp ile geliştiriciye gönder'})
        } catch(e){ dialog.showErrorBox('Log Hatası', String(e)) }
      }},
    { type: 'separator' },
    { label: 'Çıkış', role: 'quit' },
  ])
}

app.whenReady().then(async () => {
  // Tray icon — placeholder
  const iconPath = path.join(__dirname, 'iconTemplate.png')
  tray = new Tray(iconPath && fs.existsSync(iconPath) ? iconPath : undefined)
  tray.setContextMenu(buildMenu())
  tray.setToolTip('Koç Matrix Ultra')

  // Auto-updater GitHub Releases kontrolü (sadece packaged build)
  setupAutoUpdater()

  // Autostart at login
  app.setLoginItemSettings({ openAtLogin: true })

  // Boot sequence
  try {
    if(!await checkDocker()) {
      const r = await dialog.showMessageBox({ type:'warning', buttons:['Docker İndir','İptal'], message:'Docker Desktop bulunamadı', detail:'Koç Matrix Ultra Docker ile çalışır. İndirme sayfasına yönlendirilsin mi?' })
      if(r.response===0) shell.openExternal('https://www.docker.com/products/docker-desktop/')
      status='error'; tray.setContextMenu(buildMenu()); return
    }
    tray.setContextMenu(buildMenu())
    await pullImages().catch(()=>{}) // best effort
    await up()
    status = await isHealthy() ? 'running' : 'starting'
    tray.setContextMenu(buildMenu())
    // poll health
    setInterval(async()=>{ status = await isHealthy() ? 'running':'error'; tray.setContextMenu(buildMenu()) }, 15000)
  } catch(e) {
    status='error'; tray.setContextMenu(buildMenu())
    dialog.showErrorBox('Başlatma Hatası', String(e.stderr || e.err || e))
  }
})

app.on('window-all-closed', (e)=> e.preventDefault())

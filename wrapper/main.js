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

function buildMenu() {
  const label = status==='running' ? '● Journal Çalışıyor' : status==='starting' ? '○ Başlatılıyor...' : '✕ Hata — Yardım Al'
  return Menu.buildFromTemplate([
    { label, enabled: false },
    { type: 'separator' },
    { label: 'Uygulamayı Aç', click: () => shell.openExternal('http://localhost:3000') },
    { label: 'API Docs', click: () => shell.openExternal('http://localhost:8000/docs') },
    { label: 'Güncellemeleri Kontrol Et', click: async () => {
        try { await pullImages(); await up(); new Notification({title:'Koç Matrix', body:'Güncelleme kontrol edildi'}).show() } catch(e){ dialog.showErrorBox('Güncelleme Hatası', String(e.err || e)) }
      }},
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

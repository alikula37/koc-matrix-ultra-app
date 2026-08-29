// @ts-nocheck
/**
 * Koç Matrix Ultra — Electron Main Process
 * - Pencere yönetimi (BrowserWindow)
 * - Tray (menü çubuğu) + Docker orkestrasyonu
 * - Güvenli IPC (handle/on) + listener temizliği
 * - Auto-updater (electron-updater)
 *
 * Güvenlik: contextIsolation true, nodeIntegration false, sandbox true, enableRemoteModule false
 */
import { app, BrowserWindow, Menu, Tray, shell, dialog, Notification, ipcMain, nativeImage } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { exec } from 'child_process'
import { fileURLToPath } from 'url'

// ESM __dirname workaround for electron-vite
const __dirname = join(process.cwd(), 'src/main')

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let status: 'starting' | 'running' | 'error' = 'starting'

// --- Auto-Updater ---
let autoUpdater: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const updater = require('electron-updater')
  autoUpdater = updater.autoUpdater
  if (autoUpdater) {
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.logger = {
      info: (m: unknown) => console.log('[updater]', m),
      warn: (m: unknown) => console.warn('[updater]', m),
      error: (m: unknown) => console.error('[updater]', m),
      debug: (m: unknown) => console.debug('[updater]', m),
    }
  }
} catch (e: any) {
  console.warn('[updater] yüklenemedi (dev):', e?.message)
}

function run(cmd: string, opts: { cwd?: string } = {}): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(cmd, opts, (err, stdout, stderr) => {
      if (err) reject({ err, stdout, stderr })
      else resolve({ stdout: stdout?.toString() ?? '', stderr: stderr?.toString() ?? '' })
    })
  })
}

async function checkDocker(): Promise<boolean> {
  try {
    await run('docker --version')
    return true
  } catch {
    return false
  }
}
async function pullImages(): Promise<void> {
  await run('docker compose pull', { cwd: join(__dirname, '../..') })
}
async function up(): Promise<void> {
  await run('docker compose up -d', { cwd: join(__dirname, '../..') })
}
async function isHealthy(): Promise<boolean> {
  try {
    const { stdout } = await run('docker compose ps --format json', { cwd: join(__dirname, '../..') })
    return stdout.includes('healthy') || stdout.includes('running')
  } catch {
    return false
  }
}

function frontendUrl(p = '/tr/dashboard'): string {
  const port = process.env.FRONTEND_PORT || '3001'
  return `http://localhost:${port}${p}`
}
function viteRendererUrl(): string {
  // electron-vite dev server
  const port = process.env.VITE_PORT || '5173'
  return `http://localhost:${port}`
}

function getPreloadPath(): string {
  // electron-vite builds preload to out/preload/index.js ; dev uses src/preload
  const prod = join(__dirname, '../preload/index.js')
  if (existsSync(prod)) return prod
  return join(process.cwd(), 'src/preload/index.ts')
}

function createWindow(): void {
  const preload = getPreloadPath()
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 960,
    minWidth: 1280,
    minHeight: 720,
    show: false,
    backgroundColor: '#020617',
    title: 'Koç Matrix Ultra — Trader Terminal',
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // enableRemoteModule deprecated — keep false implicitly
      // webSecurity true (default)
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  })

  // Güvenlik: yeni pencereleri engelle, harici linkleri shell'de aç
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (e, url) => {
    const allowed = url.startsWith(viteRendererUrl()) || url.startsWith(frontendUrl()) || url.startsWith('http://localhost')
    if (!allowed) {
      e.preventDefault()
      shell.openExternal(url)
    }
  })

  // HMR: dev'de Vite renderer, prod'da built file
  if (!app.isPackaged) {
    const devUrl = viteRendererUrl()
    mainWindow.loadURL(devUrl).catch(() => mainWindow?.loadURL(frontendUrl()))
  } else {
    // prod: load built renderer (electron-vite out/renderer) fallback to Next.js
    const prodHtml = join(__dirname, '../renderer/index.html')
    if (existsSync(prodHtml)) mainWindow.loadFile(prodHtml)
    else mainWindow.loadURL(frontendUrl())
  }

  mainWindow.on('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // DevTools sadece dev'de
  if (!app.isPackaged) {
    mainWindow.webContents.on('before-input-event', (_e, input) => {
      if (input.key === 'F12' && input.type === 'keyDown') mainWindow?.webContents.toggleDevTools()
    })
  }
}

// IPC — pencereden gelen güvenli çağrılar (preload üzerinden)
function registerIpc(): void {
  // tek seferlik handler'lar, leak önlemek için removeAll öncesi temizlik
  ipcMain.removeHandler('app:getVersion')
  ipcMain.handle('app:getVersion', () => app.getVersion())

  ipcMain.removeHandler('app:openExternal')
  ipcMain.handle('app:openExternal', (_e, url: string) => {
    if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) shell.openExternal(url)
  })

  ipcMain.removeHandler('docker:check')
  ipcMain.handle('docker:check', () => checkDocker())

  ipcMain.removeHandler('docker:up')
  ipcMain.handle('docker:up', async () => {
    await pullImages().catch(() => {})
    await up()
    return isHealthy()
  })
}

function cleanupIpc(): void {
  // Bellek sızıntısı önleme: kapatılmayan listener'ları temizle
  ipcMain.removeHandler('app:getVersion')
  ipcMain.removeHandler('app:openExternal')
  ipcMain.removeHandler('docker:check')
  ipcMain.removeHandler('docker:up')
  // autoUpdater listener temizliği
  if (autoUpdater?.removeAllListeners) autoUpdater.removeAllListeners()
}

function setupAutoUpdater(): void {
  if (!autoUpdater || !app.isPackaged) {
    console.log('[updater] skipped — dev (isPackaged=', app.isPackaged, ')')
    return
  }
  autoUpdater.on('checking-for-update', () => console.log('[updater] checking'))
  autoUpdater.on('update-available', (info: { version: string }) => {
    console.log('[updater] available', info.version)
    new Notification({ title: 'Koç Matrix — Güncelleme Var', body: `v${info.version} indiriliyor…` }).show()
  })
  autoUpdater.on('update-not-available', (info: { version: string }) => console.log('[updater] not-available', info.version))
  autoUpdater.on('error', (err: Error) => console.error('[updater] error', err))
  autoUpdater.on('download-progress', (p: { percent: number }) => console.log(`[updater] ${Math.round(p.percent)}%`))
  autoUpdater.on('update-downloaded', (info: { version: string }) => {
    dialog
      .showMessageBox({
        type: 'info',
        buttons: ['Şimdi Yeniden Başlat', 'Sonra'],
        defaultId: 0,
        message: `Koç Matrix v${info.version} hazır`,
        detail: 'İndirme bitti. Yeniden başlatıp kurulsun mu?',
      })
      .then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall()
      })
  })
  setTimeout(() => checkForAppUpdates(false), 5000)
  setInterval(() => checkForAppUpdates(false), 6 * 60 * 60 * 1000)
}

async function checkForAppUpdates(manual = false): Promise<void> {
  if (!autoUpdater) {
    if (manual) dialog.showMessageBox({ message: 'Auto-updater dev modda kapalı (sadece .dmg/.exe build).' })
    return
  }
  if (!app.isPackaged) {
    if (manual) dialog.showMessageBox({ message: 'Auto-updater sadece paketlenmiş buildde çalışır. `npm run dist` ile dene.' })
    return
  }
  try {
    const res: unknown = await autoUpdater.checkForUpdatesAndNotify()
    if (manual && !res) {
      const upd: any = await autoUpdater.checkForUpdates().catch(() => null)
      if (!upd?.updateInfo || upd.updateInfo.version === app.getVersion()) dialog.showMessageBox({ message: `Günceldesin — v${app.getVersion()}` })
    }
  } catch (e: any) {
    console.error('[updater] check failed', e)
    if (manual) dialog.showErrorBox('Güncelleme Hatası', String(e?.message || e))
  }
}

function buildMenu(): Electron.Menu {
  const label = status === 'running' ? '● Journal Çalışıyor' : status === 'starting' ? '○ Başlatılıyor…' : '✕ Hata — Yardım Al'
  const updaterAvailable = !!autoUpdater && app.isPackaged
  const template: Electron.MenuItemConstructorOptions[] = [
    { label, enabled: false },
    { type: 'separator' },
    {
      label: 'Pencereyi Göster',
      click: () => {
        if (mainWindow) mainWindow.show()
        else createWindow()
      },
    },
    { label: 'Uygulamayı Aç (Tarayıcı)', click: () => shell.openExternal(frontendUrl('/tr/dashboard')) },
    { label: 'API Docs', click: () => shell.openExternal(`http://localhost:${process.env.BACKEND_PORT || '8001'}/docs`) },
    {
      label: 'Güncellemeleri Kontrol Et (Docker)',
      click: async () => {
        try {
          await pullImages()
          await up()
          new Notification({ title: 'Koç Matrix', body: 'Docker güncellendi' }).show()
        } catch (e: any) {
          dialog.showErrorBox('Güncelleme Hatası', String(e?.err || e))
        }
      },
    },
    ...(updaterAvailable ? [{ label: 'Uygulama Güncellemesini Kontrol Et', click: () => checkForAppUpdates(true) } as const] : []),
    {
      label: 'Yedek Al',
      click: async () => {
        try {
          await run('docker compose exec backup /usr/local/bin/backup.sh', { cwd: join(__dirname, '../..') })
          dialog.showMessageBox({ message: 'Yedek alındı — ./backups' })
        } catch (e: any) {
          dialog.showErrorBox('Yedek Hatası', String(e?.stderr || e))
        }
      },
    },
    {
      label: 'Tanı Kopyala',
      click: async () => {
        try {
          const { stdout } = await run('docker compose logs --tail 200', { cwd: join(__dirname, '../..') })
          const { clipboard } = await import('electron')
          clipboard.writeText(stdout.slice(-8000))
          dialog.showMessageBox({ message: 'Log panoya kopyalandı' })
        } catch (e: any) {
          dialog.showErrorBox('Log Hatası', String(e))
        }
      },
    },
    { type: 'separator' },
    { label: 'Çıkış', role: 'quit' },
  ]
  return Menu.buildFromTemplate(template)
}

app.whenReady().then(async () => {
  // Güvenli: app.setLoginItemSettings sadece packaged'de anlamlı
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: true })

  registerIpc()

  // Tray
  const iconCandidates = [
    join(__dirname, '../../wrapper/iconTemplate.png'),
    join(process.cwd(), 'wrapper/iconTemplate.png'),
    join(process.cwd(), 'src/renderer/../assets/icon.png'),
  ]
  let iconPath: string | undefined
  for (const p of iconCandidates) if (existsSync(p)) { iconPath = p; break }
  const trayImage = iconPath ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty()
  tray = new Tray(trayImage.isEmpty() ? nativeImage.createEmpty() : trayImage)
  tray.setContextMenu(buildMenu())
  tray.setToolTip('Koç Matrix Ultra')
  tray.on('click', () => {
    if (mainWindow) mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
    else createWindow()
  })

  createWindow()
  setupAutoUpdater()

  // Boot sequence (non-blocking, tray zaten var)
  try {
    if (!(await checkDocker())) {
      const r = await dialog.showMessageBox({
        type: 'warning',
        buttons: ['Docker İndir', 'İptal'],
        message: 'Docker Desktop yok',
        detail: 'Koç Matrix Docker ile çalışır. İndirilsin mi?',
      })
      if (r.response === 0) shell.openExternal('https://www.docker.com/products/docker-desktop/')
      status = 'error'
      tray.setContextMenu(buildMenu())
      return
    }
    await pullImages().catch(() => {})
    await up()
    status = (await isHealthy()) ? 'running' : 'starting'
    tray.setContextMenu(buildMenu())
    setInterval(async () => {
      status = (await isHealthy()) ? 'running' : 'error'
      tray.setContextMenu(buildMenu())
    }, 15000)
  } catch (e: any) {
    status = 'error'
    tray.setContextMenu(buildMenu())
    dialog.showErrorBox('Başlatma Hatası', String(e?.stderr || e?.err || e))
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else mainWindow?.show()
  })
})

app.on('window-all-closed', () => {
  // macOS: tray açıkken app kapanmaz
  if (process.platform !== 'darwin') {
    // pencere kapansa da tray kalsın; quit sadece menüden
  }
})

app.on('before-quit', () => {
  cleanupIpc()
  tray?.destroy()
})

app.on('will-quit', () => {
  cleanupIpc()
})

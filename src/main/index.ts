/**
 * Koç Matrix Ultra — Electron Main Process
 * - Pencere yönetimi (BrowserWindow)
 * - Tray (menü çubuğu) + Docker orkestrasyonu
 * - Güvenli IPC (handle/on) + listener temizliği
 * - Auto-updater (electron-updater)
 *
 * Güvenlik: contextIsolation true, nodeIntegration false, sandbox true, webSecurity true
 */
import { app, BrowserWindow, Menu, Tray, shell, dialog, Notification, ipcMain, nativeImage } from 'electron'
import { join, dirname } from 'path'
import { existsSync } from 'fs'
import { exec } from 'child_process'
import { fileURLToPath } from 'url'
import { createRequire } from 'node:module'

// ESM __dirname / __filename
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const _require = createRequire(import.meta.url)

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let status: 'starting' | 'running' | 'error' = 'starting'

// --- Auto-Updater (typed, dev'de graceful fallback) ---
type AutoUpdaterType = {
  autoDownload: boolean
  autoInstallOnAppQuit: boolean
  logger: { info: (m: unknown) => void; warn: (m: unknown) => void; error: (m: unknown) => void; debug: (m: unknown) => void }
  on: (ev: string, cb: (...args: unknown[]) => void) => void
  removeAllListeners: () => void
  checkForUpdatesAndNotify: () => Promise<unknown>
  checkForUpdates: () => Promise<{ updateInfo?: { version: string } } | null>
  quitAndInstall: () => void
}

let autoUpdater: AutoUpdaterType | null = null
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const updater = _require('electron-updater') as unknown as { autoUpdater: AutoUpdaterType } | AutoUpdaterType
  const resolved: AutoUpdaterType | null =
    (updater as { autoUpdater?: AutoUpdaterType }).autoUpdater ?? (updater as AutoUpdaterType) ?? null
  if (resolved) {
    autoUpdater = resolved
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.logger = {
      info: (m: unknown) => console.log('[updater]', m),
      warn: (m: unknown) => console.warn('[updater]', m),
      error: (m: unknown) => console.error('[updater]', m),
      debug: (m: unknown) => console.debug('[updater]', m),
    }
  }
} catch (e: unknown) {
  const msg = e instanceof Error ? e.message : String(e)
  console.warn('[updater] yüklenemedi (dev):', msg)
}

function run(cmd: string, opts: { cwd?: string } = {}): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(cmd, opts, (err: Error | null, stdout: string, stderr: string) => {
      if (err) reject({ err, stdout, stderr } as { err: Error; stdout: string; stderr: string })
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
  const port = process.env.FRONTEND_PORT ?? '3001'
  return `http://localhost:${port}${p}`
}

function viteRendererUrl(): string {
  const port = process.env.VITE_PORT ?? '5173'
  return `http://localhost:${port}`
}

function getPreloadPath(): string {
  const prod = join(__dirname, '../preload/index.js')
  if (existsSync(prod)) return prod
  // dev: ts source (electron-vite handles transpilation)
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
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (e: Electron.Event, url: string) => {
    const allowed =
      url.startsWith(viteRendererUrl()) || url.startsWith(frontendUrl()) || url.startsWith('http://localhost')
    if (!allowed) {
      e.preventDefault()
      void shell.openExternal(url)
    }
  })

  if (!app.isPackaged) {
    const devUrl = viteRendererUrl()
    void mainWindow.loadURL(devUrl).catch(() => mainWindow?.loadURL(frontendUrl()))
  } else {
    const prodHtml = join(__dirname, '../renderer/index.html')
    if (existsSync(prodHtml)) void mainWindow.loadFile(prodHtml)
    else void mainWindow.loadURL(frontendUrl())
  }

  mainWindow.on('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (!app.isPackaged) {
    mainWindow.webContents.on('before-input-event', (_e: Electron.Event, input: Electron.Input) => {
      if (input.key === 'F12' && input.type === 'keyDown') mainWindow?.webContents.toggleDevTools()
    })
  }
}

// IPC — güvenli handler'lar
function registerIpc(): void {
  ipcMain.removeHandler('app:getVersion')
  ipcMain.handle('app:getVersion', (): string => app.getVersion())

  ipcMain.removeHandler('app:openExternal')
  ipcMain.handle('app:openExternal', (_e: Electron.IpcMainInvokeEvent, url: unknown): void => {
    if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) void shell.openExternal(url)
  })

  ipcMain.removeHandler('docker:check')
  ipcMain.handle('docker:check', async (): Promise<boolean> => checkDocker())

  ipcMain.removeHandler('docker:up')
  ipcMain.handle('docker:up', async (): Promise<boolean> => {
    await pullImages().catch(() => {})
    await up()
    return isHealthy()
  })
}

function cleanupIpc(): void {
  ipcMain.removeHandler('app:getVersion')
  ipcMain.removeHandler('app:openExternal')
  ipcMain.removeHandler('docker:check')
  ipcMain.removeHandler('docker:up')
  if (autoUpdater?.removeAllListeners) autoUpdater.removeAllListeners()
}

function setupAutoUpdater(): void {
  if (!autoUpdater || !app.isPackaged) {
    console.log('[updater] skipped — dev (isPackaged=', app.isPackaged, ')')
    return
  }
  autoUpdater.on('checking-for-update', () => console.log('[updater] checking'))
  autoUpdater.on('update-available', (info: unknown) => {
    const ver = (info as { version?: string })?.version ?? 'unknown'
    console.log('[updater] available', ver)
    new Notification({ title: 'Koç Matrix — Güncelleme Var', body: `v${ver} indiriliyor…` }).show()
  })
  autoUpdater.on('update-not-available', (info: unknown) => {
    const ver = (info as { version?: string })?.version ?? 'unknown'
    console.log('[updater] not-available', ver)
  })
  autoUpdater.on('error', (err: unknown) => console.error('[updater] error', err))
  autoUpdater.on('download-progress', (p: unknown) => {
    const percent = (p as { percent?: number })?.percent ?? 0
    console.log(`[updater] ${Math.round(percent)}%`)
  })
  autoUpdater.on('update-downloaded', (info: unknown) => {
    const ver = (info as { version?: string })?.version ?? app.getVersion()
    void dialog
      .showMessageBox({
        type: 'info',
        buttons: ['Şimdi Yeniden Başlat', 'Sonra'],
        defaultId: 0,
        message: `Koç Matrix v${ver} hazır`,
        detail: 'İndirme bitti. Yeniden başlatıp kurulsun mu?',
      })
      .then(({ response }: { response: number }) => {
        if (response === 0) autoUpdater?.quitAndInstall()
      })
  })
  setTimeout(() => void checkForAppUpdates(false), 5000)
  setInterval(() => void checkForAppUpdates(false), 6 * 60 * 60 * 1000)
}

async function checkForAppUpdates(manual = false): Promise<void> {
  if (!autoUpdater) {
    if (manual) void dialog.showMessageBox({ message: 'Auto-updater dev modda kapalı (sadece .dmg/.exe build).' })
    return
  }
  if (!app.isPackaged) {
    if (manual) void dialog.showMessageBox({ message: 'Auto-updater sadece paketlenmiş buildde çalışır. `npm run dist` ile dene.' })
    return
  }
  try {
    const res: unknown = await autoUpdater.checkForUpdatesAndNotify()
    if (manual && !res) {
      const upd = await autoUpdater.checkForUpdates().catch(() => null)
      const current = app.getVersion()
      const updVer = (upd as { updateInfo?: { version?: string } } | null)?.updateInfo?.version
      if (!upd || !updVer || updVer === current) void dialog.showMessageBox({ message: `Günceldesin — v${current}` })
    }
  } catch (e: unknown) {
    console.error('[updater] check failed', e)
    if (manual) {
      const msg = e instanceof Error ? e.message : String(e)
      dialog.showErrorBox('Güncelleme Hatası', msg)
    }
  }
}

function buildMenu(): Electron.Menu {
  const label = status === 'running' ? '● Journal Çalışıyor' : status === 'starting' ? '○ Başlatılıyor…' : '✕ Hata — Yardım Al'
  const updaterAvailable = Boolean(autoUpdater && app.isPackaged)
  const template: Electron.MenuItemConstructorOptions[] = [
    { label, enabled: false },
    { type: 'separator' },
    {
      label: 'Pencereyi Göster',
      click: (): void => {
        if (mainWindow) mainWindow.show()
        else createWindow()
      },
    },
    { label: 'Uygulamayı Aç (Tarayıcı)', click: (): void => { void shell.openExternal(frontendUrl('/tr/dashboard')) } },
    { label: 'API Docs', click: (): void => { void shell.openExternal(`http://localhost:${process.env.BACKEND_PORT ?? '8001'}/docs`) } },
    {
      label: 'Güncellemeleri Kontrol Et (Docker)',
      click: async (): Promise<void> => {
        try {
          await pullImages()
          await up()
          new Notification({ title: 'Koç Matrix', body: 'Docker güncellendi' }).show()
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String((e as { err?: unknown })?.err ?? e)
          dialog.showErrorBox('Güncelleme Hatası', msg)
        }
      },
    },
    ...(updaterAvailable ? [{ label: 'Uygulama Güncellemesini Kontrol Et', click: (): Promise<void> => checkForAppUpdates(true) } as const] : []),
    {
      label: 'Yedek Al',
      click: async (): Promise<void> => {
        try {
          await run('docker compose exec backup /usr/local/bin/backup.sh', { cwd: join(__dirname, '../..') })
          void dialog.showMessageBox({ message: 'Yedek alındı — ./backups' })
        } catch (e: unknown) {
          const stderr = (e as { stderr?: string })?.stderr ?? String(e)
          dialog.showErrorBox('Yedek Hatası', stderr)
        }
      },
    },
    {
      label: 'Tanı Kopyala',
      click: async (): Promise<void> => {
        try {
          const { stdout } = await run('docker compose logs --tail 200', { cwd: join(__dirname, '../..') })
          const { clipboard } = await import('electron')
          clipboard.writeText(stdout.slice(-8000))
          void dialog.showMessageBox({ message: 'Log panoya kopyalandı' })
        } catch (e: unknown) {
          dialog.showErrorBox('Log Hatası', String(e))
        }
      },
    },
    { type: 'separator' },
    { label: 'Çıkış', role: 'quit' },
  ]
  return Menu.buildFromTemplate(template)
}

app.whenReady().then(async (): Promise<void> => {
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: true })

  registerIpc()

  const iconCandidates = [
    join(process.cwd(), 'build/icon.png'),
    join(__dirname, '../../build/icon.png'),
    join(process.cwd(), 'src/renderer/assets/icon.png'),
  ]
  let iconPath: string | undefined
  for (const p of iconCandidates) if (existsSync(p)) { iconPath = p; break }
  const trayImage = iconPath ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty()
  tray = new Tray(trayImage.isEmpty() ? nativeImage.createEmpty() : trayImage)
  tray!.setContextMenu(buildMenu())
  tray!.setToolTip('Koç Matrix Ultra')
  tray!.on('click', () => {
    if (mainWindow) mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
    else createWindow()
  })

  createWindow()
  setupAutoUpdater()

  try {
    if (!(await checkDocker())) {
      const r = await dialog.showMessageBox({
        type: 'warning',
        buttons: ['Docker İndir', 'İptal'],
        message: 'Docker Desktop yok',
        detail: 'Koç Matrix Docker ile çalışır. İndirilsin mi?',
      })
      if (r.response === 0) void shell.openExternal('https://www.docker.com/products/docker-desktop/')
      status = 'error'
      tray?.setContextMenu(buildMenu())
      return
    }
    await pullImages().catch(() => {})
    await up()
    status = (await isHealthy()) ? 'running' : 'starting'
    tray?.setContextMenu(buildMenu())
    setInterval(async (): Promise<void> => {
      status = (await isHealthy()) ? 'running' : 'error'
      tray?.setContextMenu(buildMenu())
    }, 15000)
  } catch (e: unknown) {
    status = 'error'
    tray?.setContextMenu(buildMenu())
    const msg = (e as { stderr?: string; err?: unknown })?.stderr ?? String((e as { err?: unknown })?.err ?? e)
    dialog.showErrorBox('Başlatma Hatası', msg)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else mainWindow?.show()
  })
})

app.on('window-all-closed', (): void => {
  // macOS: tray açıkken app kapanmaz; pencere kapansa da quit sadece menüden
})

app.on('before-quit', (): void => {
  cleanupIpc()
  tray?.destroy()
})

app.on('will-quit', (): void => {
  cleanupIpc()
})

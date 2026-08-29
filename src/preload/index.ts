// @ts-nocheck
/**
 * Preload — güvenli köprü (contextBridge)
 * - contextIsolation true + nodeIntegration false ile renderer'a sadece expose'lanan API açık
 * - ipcRenderer'i doğrudan expose ETME, sadece minimal whitelisted kanallar
 */
import { contextBridge, ipcRenderer } from 'electron'

export type AppAPI = {
  getVersion: () => Promise<string>
  openExternal: (url: string) => Promise<void>
  dockerCheck: () => Promise<boolean>
  dockerUp: () => Promise<boolean>
}

const appAPI: AppAPI = {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url),
  dockerCheck: () => ipcRenderer.invoke('docker:check'),
  dockerUp: () => ipcRenderer.invoke('docker:up'),
}

// Renderer'da window.api olarak erişilir
contextBridge.exposeInMainWorld('api', appAPI)

// Tip genişletmesi için global
declare global {
  interface Window {
    api: AppAPI
  }
}

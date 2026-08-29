/**
 * Preload — güvenli köprü (contextBridge)
 * - contextIsolation true + nodeIntegration false ile renderer'a sadece expose'lanan API açık
 * - ipcRenderer'i doğrudan expose ETME, sadece minimal whitelisted kanallar
 */
import { contextBridge, ipcRenderer } from 'electron'

export interface ElectronAPI {
  getVersion: () => Promise<string>
  openExternal: (url: string) => Promise<void>
  dockerCheck: () => Promise<boolean>
  dockerUp: () => Promise<boolean>
}

const appAPI: ElectronAPI = {
  getVersion: () => ipcRenderer.invoke('app:getVersion') as Promise<string>,
  openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url) as Promise<void>,
  dockerCheck: () => ipcRenderer.invoke('docker:check') as Promise<boolean>,
  dockerUp: () => ipcRenderer.invoke('docker:up') as Promise<boolean>,
}

// Renderer'da window.api olarak erişilir
contextBridge.exposeInMainWorld('api', appAPI)

declare global {
  interface Window {
    api: ElectronAPI
  }
}

const { contextBridge, ipcRenderer } = require('electron')

const tempBridge = {
  getDirectory: () => ipcRenderer.invoke('bsky-temp:get-dir'),
  write: (payload) => ipcRenderer.invoke('bsky-temp:write', payload),
  read: (payload) => ipcRenderer.invoke('bsky-temp:read', payload),
  delete: (payload) => ipcRenderer.invoke('bsky-temp:delete', payload),
  cleanup: (payload) => ipcRenderer.invoke('bsky-temp:cleanup', payload)
}

try {
  contextBridge.exposeInMainWorld('bskyTemp', tempBridge)
} catch {
  // Im Dev-Server (reiner Browser) existiert kein Electron-Kontext
}

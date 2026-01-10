const { contextBridge, ipcRenderer } = require('electron')

const tempBridge = {
  getDirectory: () => ipcRenderer.invoke('bsky-temp:get-dir'),
  write: (payload) => ipcRenderer.invoke('bsky-temp:write', payload),
  read: (payload) => ipcRenderer.invoke('bsky-temp:read', payload),
  delete: (payload) => ipcRenderer.invoke('bsky-temp:delete', payload),
  cleanup: (payload) => ipcRenderer.invoke('bsky-temp:cleanup', payload)
}

const configBridge = {
  get: () => ipcRenderer.invoke('bsky-config:get'),
  set: (config) => ipcRenderer.invoke('bsky-config:set', { config }),
  subscribe: (handler) => {
    if (typeof handler !== 'function') return () => {}
    const listener = (_event, payload) => handler(payload?.config || null)
    ipcRenderer.on('bsky-config:updated', listener)
    return () => ipcRenderer.removeListener('bsky-config:updated', listener)
  }
}

try {
  contextBridge.exposeInMainWorld('bskyTemp', tempBridge)
  contextBridge.exposeInMainWorld('bskyConfig', configBridge)
  contextBridge.exposeInMainWorld('__BSKY_PREVIEW_FETCH__', async (url) => {
    const response = await ipcRenderer.invoke('bsky-preview:fetch', { url })
    if (response?.error) {
      const error = new Error(response.message || 'Link preview failed.')
      error.code = response.error
      throw error
    }
    return response?.data || null
  })
} catch {
  // Im Dev-Server (reiner Browser) existiert kein Electron-Kontext
}

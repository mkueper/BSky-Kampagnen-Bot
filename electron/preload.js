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

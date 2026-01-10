const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const { pathToFileURL } = require('url')
const { registerTempFileBridge } = require('./tempBridge')
const { loadWindowState, persistWindowState } = require('./windowState')
const { getLinkPreview } = require('link-preview-js')

const startupDebugEnabled = String(process.env.BSKY_STARTUP_DEBUG || '').toLowerCase() === 'true'

function configureEarlyTempDir () {
  const isAppImage = Boolean(process.env.APPIMAGE)
  const useSystemTmp = String(process.env.BSKY_USE_SYSTEM_TMP || '').toLowerCase() === 'true'
  if (!isAppImage || useSystemTmp) return null
  const home = process.env.HOME || ''
  if (!home) return null
  const tempDir = path.join(home, '.bsky-client-tmp')
  try {
    fs.mkdirSync(tempDir, { recursive: true })
    process.env.TMPDIR = tempDir
    process.env.TMP = tempDir
    process.env.TEMP = tempDir
    try {
      app.setPath('temp', tempDir)
    } catch { /* ignore */ }
    logStartup('configured early temp dir', { path: tempDir })
    return tempDir
  } catch (error) {
    logStartup('failed to configure early temp dir', { error: error?.message })
    return null
  }
}

function logStartup (message, payload) {
  if (!startupDebugEnabled) return
  if (payload) {
    console.log('[bsky-startup]', message, payload)
  } else {
    console.log('[bsky-startup]', message)
  }
}

function isWritableDir (targetPath) {
  if (!targetPath) return false
  try {
    fs.accessSync(targetPath, fs.constants.W_OK | fs.constants.X_OK)
    const probe = path.join(targetPath, `.bsky-probe-${process.pid}-${Date.now()}`)
    fs.writeFileSync(probe, 'probe')
    fs.unlinkSync(probe)
    return true
  } catch (error) {
    logStartup('temp dir not writable', { path: targetPath, error: error?.message })
    return false
  }
}

function ensureEarlyTempFallbacks () {
  configureEarlyTempDir()
  const isAppImage = Boolean(process.env.APPIMAGE)
  const forceDevShm = String(process.env.BSKY_ENABLE_DEV_SHM || '').toLowerCase() === 'true'
  if (isAppImage && !forceDevShm) {
    try {
      app.commandLine.appendSwitch('disable-dev-shm-usage')
      logStartup('disabled dev shm usage (appimage default)')
    } catch { /* ignore */ }
  }
  const shmOk = isWritableDir('/dev/shm')
  if (!shmOk) {
    try {
      app.commandLine.appendSwitch('disable-dev-shm-usage')
      logStartup('disabled dev shm usage (early)')
    } catch { /* ignore */ }
  }
  const tmpOk = isWritableDir('/tmp')
  if (tmpOk) return
  const home = process.env.HOME || ''
  if (!home) return
  const tempDir = path.join(home, '.tmp')
  try {
    fs.mkdirSync(tempDir, { recursive: true })
    process.env.TMPDIR = tempDir
    try {
      app.setPath('temp', tempDir)
    } catch { /* ignore */ }
    logStartup('using home temp dir', { path: tempDir })
  } catch (error) {
    logStartup('failed to create home temp dir', { error: error?.message })
  }
}

function shouldDisableSandbox () {
  if (process.env.BSKY_FORCE_SANDBOX === '1') return false
  if (process.env.BSKY_FORCE_NO_SANDBOX === '1') return true
  if (process.platform !== 'linux') return false
  try {
    const execDir = path.dirname(process.execPath || '')
    const chromeSandbox = path.join(execDir, 'chrome-sandbox')
    const stats = fs.statSync(chromeSandbox)
    const isRootOwned = stats.uid === 0
    const hasSetuid = Boolean(stats.mode & 0o4000)
    logStartup('sandbox helper status', {
      path: chromeSandbox,
      rootOwned: isRootOwned,
      setuid: hasSetuid
    })
    return !(isRootOwned && hasSetuid)
  } catch {
    logStartup('sandbox helper missing or unreadable')
    return true
  }
}

ensureEarlyTempFallbacks()

if (process.platform === 'linux') {
  try {
    app.setName('BSky Client Beta')
    if (typeof app.setDesktopName === 'function') {
      app.setDesktopName('BSky Client Beta')
    }
  } catch { /* ignore */ }
}

const sandboxDisabled = shouldDisableSandbox()
if (sandboxDisabled) {
  try {
    app.commandLine.appendSwitch('no-sandbox')
    app.commandLine.appendSwitch('disable-gpu-sandbox')
    logStartup('disabled sandbox via chromium switches')
  } catch { /* ignore */ }
}

if (String(process.env.BSKY_DISABLE_DEV_SHM || '').toLowerCase() === 'true') {
  try {
    app.commandLine.appendSwitch('disable-dev-shm-usage')
  } catch { /* ignore */ }
}

// Bluesky-Client als Single-Instance erzwingen
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

let mainWindow
let previewHandlerRegistered = false
const previewDebugEnabled = String(process.env.BSKY_PREVIEW_DEBUG || '').toLowerCase() === 'true'

function resolveWindowIcon () {
  const candidates = [
    path.resolve(process.resourcesPath, '..', 'bsky-kampagnen-tool.png'),
    path.join(app.getAppPath(), 'bsky-client', 'dist', 'favicon.png')
  ]
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate
    } catch { /* ignore */ }
  }
  return null
}

function normalizePreviewUrl (value) {
  if (!value) return ''
  try {
    const parsed = new URL(String(value))
    if (!/^https?:$/i.test(parsed.protocol)) return ''
    return parsed.toString()
  } catch {
    return ''
  }
}

function formatPreviewResponse (targetUrl, payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      uri: targetUrl,
      title: '',
      description: '',
      image: '',
      domain: ''
    }
  }
  const firstImage = Array.isArray(payload.images) && payload.images.length > 0
    ? payload.images[0]
    : ''
  let domain = payload.siteName || ''
  if (!domain) {
    try {
      const parsed = new URL(payload.url || targetUrl)
      domain = parsed.hostname.replace(/^www\./, '')
    } catch {
      domain = ''
    }
  }
  return {
    uri: payload.url || targetUrl,
    title: payload.title || '',
    description: payload.description || '',
    image: firstImage || payload.favicons?.[0] || '',
    domain
  }
}

function registerPreviewBridge () {
  if (previewHandlerRegistered) return
  previewHandlerRegistered = true
  ipcMain.handle('bsky-preview:fetch', async (_event, payload = {}) => {
    const normalized = normalizePreviewUrl(payload?.url)
    if (!normalized) {
      return { error: 'PREVIEW_INVALID_URL', message: 'Ungültige URL.' }
    }
    try {
      const result = await getLinkPreview(normalized, {
        timeout: Number(process.env.PREVIEW_PROXY_TIMEOUT_MS) || 9000,
        headers: {
          'user-agent': 'BSky-Kampagnen-Tool-LinkPreview/1.0 (+https://github.com/mkueper/BSky-Kampagnen-Tool)'
        }
      })
      return { data: formatPreviewResponse(normalized, result) }
    } catch (error) {
      const isTimeout = error?.code === 'ETIMEDOUT'
      if (previewDebugEnabled) {
        console.warn('[preview] Fehler beim Abruf', {
          url: normalized,
          code: error?.code,
          message: error?.message
        })
      }
      return {
        error: isTimeout ? 'PREVIEW_TIMEOUT' : 'PREVIEW_ERROR',
        message: error?.message || 'Link-Vorschau konnte nicht geladen werden.'
      }
    }
  })
}

function createWindow () {
  const icon = resolveWindowIcon()
  if (!icon) {
    logStartup('window icon missing')
  } else {
    logStartup('window icon resolved', { path: icon })
  }
  registerTempFileBridge(app)
  registerPreviewBridge()
  const state = loadWindowState(app)
  const browserOpts = {
    width: state.width || 1240,
    height: state.height || 980,
    x: state.x,
    y: state.y,
    show: false,
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: !sandboxDisabled
    }
  }
  logStartup('renderer sandbox', { enabled: !sandboxDisabled })
  if (state.x == null || state.y == null) browserOpts.center = true

  mainWindow = new BrowserWindow(browserOpts)
  persistWindowState(app, mainWindow)
  mainWindow.once('ready-to-show', () => mainWindow.show())
  try { if (state.isMaximized) mainWindow.maximize() } catch { /* ignore */ }

  setupMenu(mainWindow)
  setupGuards(mainWindow)
  loadFrontend(mainWindow)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function setupMenu (window) {
  try {
    const isDev = Boolean(process.env.VITE_DEV_SERVER_URL)
    /** @type {import('electron').MenuItemConstructorOptions[]} */
    const template = [
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' }
        ]
      }
    ]
    if (isDev) {
      template.push({
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'toggleDevTools' }
        ]
      })
    }
    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
    window.setMenuBarVisibility(false)
  } catch {
    /* ignore menu errors */
  }
}

function setupGuards (window) {
  try {
    window.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url).catch(() => {})
      return { action: 'deny' }
    })
  } catch { /* ignore */ }

  try {
    window.webContents.on('context-menu', (event, params) => {
      const editable = params.isEditable || Boolean(params?.selectionText)
      if (!editable) event.preventDefault()
    })
  } catch { /* ignore */ }

  try {
    const isDev = Boolean(process.env.VITE_DEV_SERVER_URL)
    if (!isDev) {
      window.webContents.on('before-input-event', (event, input) => {
        const key = String(input.key || '').toLowerCase()
        const mod = (input.control || input.meta)
        if (key === 'f5' || (mod && key === 'r') || (mod && input.shift && key === 'i')) {
          event.preventDefault()
        }
      })
    }
  } catch { /* ignore */ }
}

function loadFrontend (window) {
  const devUrl = process.env.VITE_DEV_SERVER_URL
  if (devUrl) {
    window.loadURL(devUrl)
    return
  }

  try {
    const indexPath = path.join(app.getAppPath(), 'bsky-client', 'dist', 'index.html')
    const fileUrl = pathToFileURL(indexPath).toString()
    window.loadURL(fileUrl)
  } catch (error) {
    console.error('Konnte Bluesky-Client nicht laden', error)
    window.loadURL('about:blank')
  }
}

app.on('second-instance', () => {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.focus()
})

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})

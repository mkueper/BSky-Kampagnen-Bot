const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')
const http = require('http')
const os = require('os')

// Ensure Chromium sandbox is disabled on Linux AppImage before any browser process spawns
if (process.platform === 'linux') {
  try {
    app.commandLine.appendSwitch('no-sandbox')
    app.commandLine.appendSwitch('disable-setuid-sandbox')
    app.commandLine.appendSwitch('disable-gpu-sandbox')
  } catch { /* ignore */ }
}

// Make the app single-instance
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

// In AppImage/most sandboxed Linux envs, Chromium's setuid sandbox cannot be
// enabled because the helper cannot be root-owned within the mounted image.
// Fall back to no-sandbox to prevent startup aborts.
if (process.platform === 'linux') {
  try {
    app.commandLine.appendSwitch('no-sandbox')
    app.commandLine.appendSwitch('disable-gpu-sandbox')
  } catch { /* ignore */ }
}

let mainWindow
// Backend läuft im selben Prozess (require), kein Child-Prozess nötig

function getAppRoot () {
  // In dev: project root; in production: app.asar
  return app.getAppPath()
}

function resolveBackendEntry () {
  return path.join(getAppRoot(), 'backend', 'server.js')
}

function startBackend () {
  const port = process.env.APP_PORT || process.env.BACKEND_PORT || '35123'

  // Prefer a stable config dir under XDG (~/.config/bsky-kampagnen-bot)
  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config')
  const cfgDirPreferred = path.join(configHome, 'bsky-kampagnen-bot')
  const cfgDirLegacy = path.join(configHome, 'BSky Kampagnen Bot')
  const cfgDir = fs.existsSync(cfgDirPreferred) || !fs.existsSync(cfgDirLegacy)
    ? cfgDirPreferred
    : cfgDirLegacy
  try { fs.mkdirSync(cfgDir, { recursive: true }) } catch { /* ignore */ }

  // Data/Uploads/Temp inside config dir
  const dataRoot = path.join(cfgDir, 'data')
  const uploadsDir = path.join(dataRoot, 'uploads')
  const tempDir = path.join(dataRoot, 'temp')
  try { fs.mkdirSync(uploadsDir, { recursive: true }) } catch { /* ignore */ }
  try { fs.mkdirSync(tempDir, { recursive: true }) } catch { /* ignore */ }

  // SQLite storage override inside config dir
  const sqlitePath = path.join(dataRoot, 'app.sqlite')
  // User-specific .env (preferred location)
  const envFile = path.join(cfgDir, '.env')

  // Apply runtime env overrides for the backend
  process.env.NODE_ENV = 'production'
  process.env.APP_PORT = String(port)
  process.env.BACKEND_PORT = String(port)
  process.env.APP_ROOT = getAppRoot()
  process.env.SQLITE_STORAGE = process.env.SQLITE_STORAGE || sqlitePath
  process.env.UPLOAD_DIR = process.env.UPLOAD_DIR || uploadsDir
  process.env.TEMP_UPLOAD_DIR = process.env.TEMP_UPLOAD_DIR || tempDir
  // Always point ENV_PATH to the canonical config location
  process.env.ENV_PATH = process.env.ENV_PATH || envFile
  // First run bootstrap: trigger baseline migration if DB file is missing
  if (!fs.existsSync(sqlitePath)) process.env.RUN_BASELINE_MIGRATION = 'true'

  // Prepare module aliases to work inside asar
  try {
    const moduleAlias = require('module-alias')
    const appRoot = getAppRoot()
    moduleAlias.addAliases({
      '@api': path.join(appRoot, 'backend', 'src', 'api'),
      '@core': path.join(appRoot, 'backend', 'src', 'core'),
      '@data': path.join(appRoot, 'backend', 'src', 'data'),
      '@platforms': path.join(appRoot, 'backend', 'src', 'platforms'),
      '@utils': path.join(appRoot, 'backend', 'src', 'utils'),
      '@config': path.join(appRoot, 'backend', 'src', 'config.js'),
      '@env': path.join(appRoot, 'backend', 'src', 'env.js')
    })
  } catch { /* ignore */ }

  // Require the backend entry directly (runs in this process)
  const entry = resolveBackendEntry()
  try {
    require(entry)
  } catch (e) {
    console.error('Backend start failed:', e)
    throw e
  }

  return Number(port)
}

function createWindow () {
  const backendPort = startBackend()
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    show: false
  })

  mainWindow.once('ready-to-show', () => mainWindow.show())

  const devUrl = process.env.VITE_DEV_SERVER_URL
  if (devUrl) {
    mainWindow.loadURL(devUrl)
  } else {
    // In prod: Backend dient auch die statischen Dashboard-Dateien aus
    // Warten, bis der Server lauscht
    waitForServer(backendPort, 30000)
      .then(() => mainWindow.loadURL(`http://127.0.0.1:${backendPort}`))
      .catch(() => mainWindow.loadURL(`http://127.0.0.1:${backendPort}`))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})

// Backend läuft im selben Prozess – kein explizites Cleanup nötig

function waitForServer (port, timeoutMs = 20000) {
  const started = Date.now()
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get({ host: '127.0.0.1', port, path: '/health', timeout: 2500 }, (res) => {
        res.resume()
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
          resolve()
        } else {
          retry()
        }
      })
      req.on('error', retry)
      req.on('timeout', () => { try { req.destroy() } catch { /* ignore */ } ; retry() })
    }
    const retry = () => {
      if (Date.now() - started > timeoutMs) return reject(new Error('server-timeout'))
      setTimeout(tryOnce, 400)
    }
    tryOnce()
  })
}

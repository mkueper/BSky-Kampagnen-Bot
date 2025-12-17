const { app, BrowserWindow, Menu, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { pathToFileURL } = require('url')
const { registerTempFileBridge } = require('./tempBridge')
const { loadWindowState, persistWindowState } = require('./windowState')

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
    return !(isRootOwned && hasSetuid)
  } catch {
    return true
  }
}

if (shouldDisableSandbox()) {
  try {
    app.commandLine.appendSwitch('no-sandbox')
    app.commandLine.appendSwitch('disable-gpu-sandbox')
  } catch { /* ignore */ }
}

// Bluesky-Client als Single-Instance erzwingen
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

let mainWindow

function createWindow () {
  registerTempFileBridge(app)
  const state = loadWindowState(app)
  const browserOpts = {
    width: state.width || 1240,
    height: state.height || 980,
    x: state.x,
    y: state.y,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  }
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

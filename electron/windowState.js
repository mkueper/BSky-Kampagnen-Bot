const { screen } = require('electron')
const path = require('path')
const fs = require('fs')

function loadWindowState (app) {
  try {
    const storePath = path.join(app.getPath('userData'), 'window-state.json')
    const raw = fs.existsSync(storePath) ? fs.readFileSync(storePath, 'utf8') : ''
    const json = raw ? JSON.parse(raw) : null
    if (!json || typeof json !== 'object') throw new Error('no state')
    const display = screen.getDisplayMatching({ x: json.x || 0, y: json.y || 0, width: json.width || 0, height: json.height || 0 })
    const wa = display && display.workArea ? display.workArea : { x: 0, y: 0, width: 1920, height: 1080 }
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v))
    const width = clamp(json.width || 1240, 800, wa.width)
    const height = clamp(json.height || 980, 600, wa.height)
    const x = json.x != null ? json.x : Math.floor(wa.x + (wa.width - width) / 2)
    const y = json.y != null ? json.y : Math.floor(wa.y + (wa.height - height) / 2)
    return { x, y, width, height, isMaximized: Boolean(json.isMaximized) }
  } catch {
    return { width: 1240, height: 980, isMaximized: false }
  }
}

function persistWindowState (app, mainWindow) {
  if (!mainWindow) return
  const storePath = path.join(app.getPath('userData'), 'window-state.json')
  let saveWindowStateTimeout = null

  const saveWindowStateDebounced = () => {
    try { if (saveWindowStateTimeout) clearTimeout(saveWindowStateTimeout) } catch { /* ignore */ }
    saveWindowStateTimeout = setTimeout(() => {
      try {
        if (!mainWindow) return
        const isMaximized = mainWindow.isMaximized()
        const bounds = isMaximized ? mainWindow.getNormalBounds() : mainWindow.getBounds()
        const state = { ...bounds, isMaximized }
        fs.mkdirSync(path.dirname(storePath), { recursive: true })
        fs.writeFileSync(storePath, JSON.stringify(state))
      } catch { /* ignore */ }
    }, 250)
  }

  mainWindow.on('resize', saveWindowStateDebounced)
  mainWindow.on('move', saveWindowStateDebounced)
  mainWindow.on('close', saveWindowStateDebounced)
}

module.exports = {
  loadWindowState,
  persistWindowState
}

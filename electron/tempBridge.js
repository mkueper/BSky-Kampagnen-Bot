const { ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const fsp = require('fs/promises')
const os = require('os')
const crypto = require('crypto')

let tempBridgeRegistered = false
let clientTempDir = null

function ensureDirWritable (dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
  fs.accessSync(dirPath, fs.constants.W_OK)
}

function resolveClientTempDir (app) {
  if (clientTempDir) return clientTempDir
  const attempts = [
    path.join(app.getPath('temp'), 'bsky-client'),
    path.join(app.getPath('userData'), 'temp')
  ]
  for (const candidate of attempts) {
    try {
      ensureDirWritable(candidate)
      clientTempDir = candidate
      return candidate
    } catch {
      /* ignore and try next */
    }
  }
  const fallback = path.join(os.tmpdir(), `bsky-client-${process.pid}`)
  ensureDirWritable(fallback)
  clientTempDir = fallback
  return fallback
}

const TEMP_FILE_PREFIX = 'bsky-media'
function createTempId (fileName = 'upload.bin') {
  const ext = path.extname(fileName || '')
  const uuid = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : crypto.randomBytes(16).toString('hex')
  return `${TEMP_FILE_PREFIX}-${Date.now()}-${uuid}${ext}`
}

function resolveTempFilePath (tempId, baseDir) {
  const safeName = path.basename(tempId || '')
  return path.join(baseDir, safeName)
}

async function cleanupTempDir (dir, maxAgeMs = 24 * 60 * 60 * 1000) {
  const entries = await fsp.readdir(dir, { withFileTypes: true })
  const threshold = Date.now() - Math.max(0, Number(maxAgeMs) || 0)
  let removed = 0
  await Promise.all(entries.map(async (entry) => {
    if (!entry.isFile()) return
    try {
      const fullPath = path.join(dir, entry.name)
      const stat = await fsp.stat(fullPath)
      if (stat.mtimeMs < threshold) {
        await fsp.unlink(fullPath)
        removed += 1
      }
    } catch {
      /* ignore individual cleanup errors */
    }
  }))
  return removed
}

function registerTempFileBridge (app) {
  if (tempBridgeRegistered) return
  const dir = resolveClientTempDir(app)
  process.env.BSKY_CLIENT_TEMP_DIR = process.env.BSKY_CLIENT_TEMP_DIR || dir

  ipcMain.handle('bsky-temp:get-dir', () => dir)
  ipcMain.handle('bsky-temp:write', async (_event, payload = {}) => {
    const { fileName = 'upload.bin', buffer } = payload
    if (!buffer) throw new Error('buffer erforderlich')
    const data = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)
    const tempId = createTempId(fileName)
    const target = resolveTempFilePath(tempId, dir)
    await fsp.writeFile(target, data)
    return { tempId, bytesWritten: data.length }
  })
  ipcMain.handle('bsky-temp:read', async (_event, payload = {}) => {
    const { tempId } = payload
    if (!tempId) throw new Error('tempId erforderlich')
    const target = resolveTempFilePath(tempId, dir)
    const exists = fs.existsSync(target)
    if (!exists) return null
    return fsp.readFile(target)
  })
  ipcMain.handle('bsky-temp:delete', async (_event, payload = {}) => {
    const { tempId } = payload
    if (!tempId) return { success: false }
    const target = resolveTempFilePath(tempId, dir)
    try {
      await fsp.unlink(target)
      return { success: true }
    } catch {
      return { success: false }
    }
  })
  ipcMain.handle('bsky-temp:cleanup', async (_event, payload = {}) => {
    const maxAgeMs = payload?.maxAgeMs
    const removed = await cleanupTempDir(dir, maxAgeMs)
    return { removed }
  })

  tempBridgeRegistered = true
}

module.exports = {
  registerTempFileBridge
}

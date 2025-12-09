const fs = require('fs')
const fsp = require('fs/promises')
const path = require('path')

function ensureTempDir () {
  const dir = process.env.TEMP_UPLOAD_DIR || path.join(process.cwd(), 'data', 'temp')
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  } catch (error) {
    console.error(error)
  }
  return dir
}

function sanitizeFilename (name = '') {
  return String(name).replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 120) || 'file'
}

function writeBufferToTemp (buffer, { filename, mime, altText } = {}) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Ungültiger Dateiinhalt.')
  }
  const dir = ensureTempDir()
  const safeName = sanitizeFilename(filename || 'upload')
  const base = `tmp-${Date.now()}-${safeName}`
  const filePath = path.join(dir, base)
  fs.writeFileSync(filePath, buffer)
  return {
    tempId: base,
    filename: filename || base,
    mime: mime || 'application/octet-stream',
    size: buffer.length,
    altText: typeof altText === 'string' ? altText : undefined,
    previewUrl: `/temp/${base}`
  }
}

function parseTempTimestamp (name = '') {
  try {
    const m = /^tmp-(\d+)-/.exec(String(name))
    if (!m) return null
    const ts = Number(m[1])
    return Number.isFinite(ts) ? ts : null
  } catch {
    return null
  }
}

async function cleanupOldTempUploads ({ maxAgeMs = 24 * 60 * 60 * 1000, nowMs } = {}) {
  const now = typeof nowMs === 'number' && Number.isFinite(nowMs) ? nowMs : Date.now()
  const dir = ensureTempDir()
  let entries
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true })
  } catch (error) {
    console.error('cleanupOldTempUploads: konnte Verzeichnis nicht lesen', {
      dir,
      error: error?.message || String(error)
    })
    return { removed: [], kept: [] }
  }

  const removed = []
  const kept = []

  for (const entry of entries) {
    if (!entry.isFile()) continue
    const ts = parseTempTimestamp(entry.name)
    if (!ts) {
      kept.push(entry.name)
      continue
    }
    if (now - ts < maxAgeMs) {
      kept.push(entry.name)
      continue
    }
    const filePath = path.join(dir, entry.name)
    try {
      await fsp.unlink(filePath)
      removed.push(entry.name)
    } catch (error) {
      console.error('cleanupOldTempUploads: Datei konnte nicht gelöscht werden', {
        filePath,
        error: error?.message || String(error)
      })
      kept.push(entry.name)
    }
  }

  return { removed, kept }
}

module.exports = {
  writeBufferToTemp,
  ensureTempDir,
  sanitizeFilename,
  cleanupOldTempUploads
}

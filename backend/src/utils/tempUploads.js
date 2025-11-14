const fs = require('fs')
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

module.exports = {
  writeBufferToTemp,
  ensureTempDir,
  sanitizeFilename
}

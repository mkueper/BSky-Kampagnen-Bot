const fs = require('fs');
const path = require('path');

function ensureTempDir() {
  const dir = process.env.TEMP_UPLOAD_DIR || path.join(process.cwd(), 'data', 'temp');
  try { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); } catch {}
  return dir;
}

function sanitizeFilename(name = '') {
  return String(name).replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 120) || 'file';
}

async function uploadTemp(req, res) {
  try {
    const { filename, mime, data, altText } = req.body || {};
    if (!data || typeof data !== 'string' || !data.includes('base64,')) {
      return res.status(400).json({ error: 'Ungültige Dateiübertragung (data URL erwartet).' });
    }
    const buffer = Buffer.from(String(data).split(',').pop(), 'base64');
    const maxBytes = Number(process.env.UPLOAD_MAX_BYTES || 8 * 1024 * 1024);
    if (buffer.length > maxBytes) {
      return res.status(413).json({ error: 'Datei ist zu groß.' });
    }
    const dir = ensureTempDir();
    const base = `tmp-${Date.now()}-${sanitizeFilename(filename || 'image')}`;
    const filePath = path.join(dir, base);
    fs.writeFileSync(filePath, buffer);
    const tempId = base;
    const out = {
      tempId,
      filename: filename || base,
      mime: mime || 'application/octet-stream',
      size: buffer.length,
      altText: typeof altText === 'string' ? altText : undefined,
      previewUrl: `/temp/${base}`,
    };
    return res.status(201).json(out);
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Upload fehlgeschlagen.' });
  }
}

module.exports = { uploadTemp };

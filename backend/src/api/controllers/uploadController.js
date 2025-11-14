const { writeBufferToTemp } = require('@utils/tempUploads');

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
    const stored = writeBufferToTemp(buffer, { filename, mime, altText });
    return res.status(201).json(stored);
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Upload fehlgeschlagen.' });
  }
}

module.exports = { uploadTemp };

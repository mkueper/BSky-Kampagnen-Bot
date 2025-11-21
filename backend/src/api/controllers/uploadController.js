const multer = require('multer');
const { writeBufferToTemp } = require('@utils/tempUploads');

const DEFAULT_MAX_BYTES = 8 * 1024 * 1024;

const getMaxBytes = () => {
  const value = Number(process.env.UPLOAD_MAX_BYTES);
  if (Number.isFinite(value) && value > 0) return value;
  return DEFAULT_MAX_BYTES;
};

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: getMaxBytes() }
});

async function uploadTemp(req, res) {
  try {
    const limitBytes = getMaxBytes();

    if (req.file) {
      const { originalname, mimetype, buffer } = req.file;
      if (buffer?.length > limitBytes) {
        return res.status(413).json({ error: 'Datei ist zu groß.' });
      }
      const stored = writeBufferToTemp(buffer, { filename: originalname, mime: mimetype, altText: req.body?.altText });
      return res.status(201).json(stored);
    }

    const { filename, mime, data, altText } = req.body || {};
    if (typeof data !== 'string') {
      return res.status(400).json({ error: 'Keine Datei hochgeladen.' });
    }

    const match = data.match(/^data:([^;]+);base64,(.+)$/i);
    if (!match) {
      return res.status(400).json({ error: 'Ungültiges Datenformat.' });
    }
    const [, dataMime, base64Payload] = match;
    let buffer;
    try {
      buffer = Buffer.from(base64Payload, 'base64');
      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      return res.status(400).json({ error: 'Ungültige Datei.' });
    }
    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ error: 'Ungültige Datei.' });
    }
    if (buffer.length > limitBytes) {
      return res.status(413).json({ error: 'Datei ist zu groß.' });
    }

    const stored = writeBufferToTemp(buffer, {
      filename,
      mime: mime || dataMime,
      altText
    });
    return res.status(201).json(stored);
  } catch (error) {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Datei ist zu groß.' });
    }
    return res.status(500).json({ error: error?.message || 'Upload fehlgeschlagen.' });
  }
}

module.exports = {
  uploadTemp,
  // Export the multer middleware so the router can use it
  uploadMiddleware: upload.single('media')
};

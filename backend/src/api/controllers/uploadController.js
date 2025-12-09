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
        const message = 'Datei ist zu groß.';
        return res.status(413).json({
          error: message,
          code: 'UPLOAD_TOO_LARGE',
          message,
        });
      }
      const stored = writeBufferToTemp(buffer, { filename: originalname, mime: mimetype, altText: req.body?.altText });
      return res.status(201).json(stored);
    }

    const { filename, mime, data, altText } = req.body || {};
    if (typeof data !== 'string') {
      const message = 'Keine Datei hochgeladen.';
      return res.status(400).json({
        error: message,
        code: 'UPLOAD_MISSING_DATA',
        message,
      });
    }

    const match = data.match(/^data:([^;]+);base64,(.+)$/i);
    if (!match) {
      const message = 'Ungültiges Datenformat.';
      return res.status(400).json({
        error: message,
        code: 'UPLOAD_INVALID_DATA_URL',
        message,
      });
    }
    const [, dataMime, base64Payload] = match;
    let buffer;
    try {
      buffer = Buffer.from(base64Payload, 'base64');
    } catch {
      const message = 'Ungültige Datei.';
      return res.status(400).json({
        error: message,
        code: 'UPLOAD_INVALID_BASE64',
        message,
      });
    }
    if (!buffer || buffer.length === 0) {
      const message = 'Ungültige Datei.';
      return res.status(400).json({
        error: message,
        code: 'UPLOAD_INVALID_BUFFER',
        message,
      });
    }
    if (buffer.length > limitBytes) {
      const message = 'Datei ist zu groß.';
      return res.status(413).json({
        error: message,
        code: 'UPLOAD_TOO_LARGE',
        message,
      });
    }

    const stored = writeBufferToTemp(buffer, {
      filename,
      mime: mime || dataMime,
      altText
    });
    return res.status(201).json(stored);
  } catch (error) {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      const message = 'Datei ist zu groß.';
      return res.status(413).json({
        error: message,
        code: 'UPLOAD_TOO_LARGE',
        message,
      });
    }
    const message = error?.message || 'Upload fehlgeschlagen.';
    return res.status(500).json({
      error: message,
      code: 'UPLOAD_FAILED',
      message,
    });
  }
}

module.exports = {
  uploadTemp,
  // Export the multer middleware so the router can use it
  uploadMiddleware: upload.single('media')
};

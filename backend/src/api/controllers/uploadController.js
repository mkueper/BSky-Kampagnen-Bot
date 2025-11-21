const multer = require('multer');
const { writeBufferToTemp } = require('@utils/tempUploads');

const maxBytes = Number(process.env.UPLOAD_MAX_BYTES || 8 * 1024 * 1024);

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: maxBytes }
});

async function uploadTemp(req, res) {
  try {
    // The uploaded file is available in req.file
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen.' });
    }

    const { originalname, mimetype, buffer } = req.file;
    const { altText } = req.body || {};

    const stored = writeBufferToTemp(buffer, { filename: originalname, mime: mimetype, altText });
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
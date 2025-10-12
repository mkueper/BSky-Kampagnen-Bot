const fs = require('fs');
const path = require('path');
const { Thread, ThreadSkeet, ThreadSkeetMedia, Skeet, SkeetMedia } = require('@data/models');

function ensureUploadDir() {
  const dir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function sanitizeFilename(name = '') {
  return String(name).replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 120) || 'file';
}

function isAllowedMime(mime) {
  const allowed = (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/webp,image/gif')
    .split(',').map((s) => s.trim()).filter(Boolean);
  return allowed.includes(mime);
}

async function addMedia(req, res) {
  try {
    const threadId = Number(req.params.id);
    const sequence = Number(req.params.sequence);
    if (!Number.isInteger(threadId) || !Number.isInteger(sequence)) {
      return res.status(400).json({ error: 'Ungültige Parameter.' });
    }

    const thread = await Thread.findByPk(threadId, { include: [{ model: ThreadSkeet, as: 'segments', order: [['sequence','ASC']] }] });
    if (!thread) return res.status(404).json({ error: 'Thread nicht gefunden.' });
    const segment = (thread.segments || []).find((s) => Number(s.sequence) === sequence);
    if (!segment) return res.status(404).json({ error: 'Segment nicht gefunden.' });

    const { filename, mime, data, altText = '' } = req.body || {};
    if (!mime || !data) return res.status(400).json({ error: 'mime und data erforderlich.' });
    if (!isAllowedMime(mime)) return res.status(400).json({ error: 'Nicht unterstützter MIME-Typ.' });

    const maxBytes = Number(process.env.UPLOAD_MAX_BYTES || 10 * 1024 * 1024);
    const buffer = Buffer.from(String(data).split(',').pop(), 'base64');
    if (buffer.length > maxBytes) return res.status(413).json({ error: 'Datei zu groß.' });

    const dir = ensureUploadDir();
    const base = `${Date.now()}-${sanitizeFilename(filename || 'image')}`;
    const filePath = path.join(dir, base);
    fs.writeFileSync(filePath, buffer);

    const nextOrder = await ThreadSkeetMedia.count({ where: { threadSkeetId: segment.id } });
    const row = await ThreadSkeetMedia.create({ threadSkeetId: segment.id, order: nextOrder, path: filePath, mime, size: buffer.length, altText });
    res.json({ id: row.id, order: row.order, mime: row.mime, size: row.size, altText: row.altText, path: row.path });
  } catch (error) {
    console.error('Fehler beim Medien-Upload:', error);
    res.status(500).json({ error: error?.message || 'Upload fehlgeschlagen.' });
  }
}

async function updateMedia(req, res) {
  try {
    const mediaId = Number(req.params.mediaId);
    if (!Number.isInteger(mediaId)) return res.status(400).json({ error: 'Ungültige ID.' });
    const row = await ThreadSkeetMedia.findByPk(mediaId);
    if (!row) return res.status(404).json({ error: 'Medium nicht gefunden.' });

    const { altText, order } = req.body || {};
    const payload = {};
    if (typeof altText === 'string') payload.altText = altText;
    if (Number.isInteger(order)) payload.order = order;
    await row.update(payload);
    res.json({ ok: true, id: row.id, altText: row.altText, order: row.order });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Aktualisierung fehlgeschlagen.' });
  }
}

async function deleteMedia(req, res) {
  try {
    const mediaId = Number(req.params.mediaId);
    if (!Number.isInteger(mediaId)) return res.status(400).json({ error: 'Ungültige ID.' });
    const row = await ThreadSkeetMedia.findByPk(mediaId);
    if (!row) return res.status(404).json({ error: 'Medium nicht gefunden.' });
    try { fs.unlinkSync(row.path); 

    } catch (e) { console.error(e); }
    await row.destroy();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Löschen fehlgeschlagen.' });
  }
}

module.exports = { addMedia, updateMedia, deleteMedia };

// Skeet Media endpoints
async function addSkeetMedia(req, res) {
  try {
    const skeetId = Number(req.params.id);
    if (!Number.isInteger(skeetId)) return res.status(400).json({ error: 'Ungültige ID.' });
    const skeet = await Skeet.findByPk(skeetId);
    if (!skeet) return res.status(404).json({ error: 'Skeet nicht gefunden.' });

    const { filename, mime, data, altText = '' } = req.body || {};
    if (!mime || !data) return res.status(400).json({ error: 'mime und data erforderlich.' });
    if (!isAllowedMime(mime)) return res.status(400).json({ error: 'Nicht unterstützter MIME-Typ.' });
    const maxBytes = Number(process.env.UPLOAD_MAX_BYTES || 10 * 1024 * 1024);
    const buffer = Buffer.from(String(data).split(',').pop(), 'base64');
    if (buffer.length > maxBytes) return res.status(413).json({ error: 'Datei zu groß.' });

    const dir = ensureUploadDir();
    const base = `${Date.now()}-${sanitizeFilename(filename || 'image')}`;
    const filePath = path.join(dir, base);
    fs.writeFileSync(filePath, buffer);
    const nextOrder = await SkeetMedia.count({ where: { skeetId } });
    const row = await SkeetMedia.create({ skeetId, order: nextOrder, path: filePath, mime, size: buffer.length, altText });
    res.json({ id: row.id, order: row.order, mime: row.mime, size: row.size, altText: row.altText, path: row.path });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Upload fehlgeschlagen.' });
  }
}

async function updateSkeetMedia(req, res) {
  try {
    const mediaId = Number(req.params.mediaId);
    if (!Number.isInteger(mediaId)) return res.status(400).json({ error: 'Ungültige ID.' });
    const row = await SkeetMedia.findByPk(mediaId);
    if (!row) return res.status(404).json({ error: 'Medium nicht gefunden.' });
    const { altText, order } = req.body || {};
    const payload = {};
    if (typeof altText === 'string') payload.altText = altText;
    if (Number.isInteger(order)) payload.order = order;
    await row.update(payload);
    res.json({ ok: true, id: row.id, altText: row.altText, order: row.order });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Aktualisierung fehlgeschlagen.' });
  }
}

async function deleteSkeetMedia(req, res) {
  try {
    const mediaId = Number(req.params.mediaId);
    if (!Number.isInteger(mediaId)) return res.status(400).json({ error: 'Ungültige ID.' });
    const row = await SkeetMedia.findByPk(mediaId);
    if (!row) return res.status(404).json({ error: 'Medium nicht gefunden.' });
    try { fs.unlinkSync(row.path); 

    } catch (e) { console.warn(e); }
    await row.destroy();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Löschen fehlgeschlagen.' });
  }
}

module.exports.addSkeetMedia = addSkeetMedia;
module.exports.updateSkeetMedia = updateSkeetMedia;
module.exports.deleteSkeetMedia = deleteSkeetMedia;

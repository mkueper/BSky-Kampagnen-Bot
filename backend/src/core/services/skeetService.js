const { Skeet, SkeetMedia } = require('../../data/models');
const { createLogger } = require('../../utils/logging');
const log = createLogger('skeet');
const fs = require('fs');
const path = require('path');
const { ALLOWED_PLATFORMS } = require('../../constants/platforms');
const { deletePost } = require('./postService');
const { ensurePlatforms, resolvePlatformEnv, validatePlatformEnv } = require('./platformContext');

function normalizeTargetPlatforms(raw) {
  if (!raw) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw.filter(Boolean);
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch (error) {
      log.warn('Konnte targetPlatforms nicht parsen', { error: error?.message || String(error) });
      return [];
    }
  }
  return [];
}

function ensureTargetPlatforms(platforms) {
  const normalized = Array.from(new Set(platforms));
  if (normalized.length === 0) {
    throw new Error('targetPlatforms muss mindestens eine Plattform enthalten.');
  }
  const invalid = normalized.filter((p) => !ALLOWED_PLATFORMS.includes(p));
  if (invalid.length > 0) {
    throw new Error(`Ungültige Plattform(en): ${invalid.join(', ')}`);
  }
  return normalized;
}

function parsePlatformResults(raw) {
  if (!raw) {
    return {};
  }

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
      log.warn('Konnte platformResults nicht parsen', { error: error?.message || String(error) });
      return {};
    }
  }

  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return { ...raw };
  }

  return {};
}

function collectTargetPlatformsForRemoval(skeet, results, override) {
  if (Array.isArray(override) && override.length > 0) {
    return Array.from(new Set(override));
  }

  const platforms = new Set();
  normalizeTargetPlatforms(skeet?.targetPlatforms || []).forEach((id) => platforms.add(id));
  Object.keys(results || {}).forEach((id) => platforms.add(id));
  return Array.from(platforms);
}

function markResultAsDeleted(entry = {}, identifiers = {}) {
  const next = { ...entry };
  next.status = 'deleted';
  next.deletedAt = new Date().toISOString();
  if (identifiers.uri) {
    next.deletedUri = identifiers.uri;
  }
  if (identifiers.statusId) {
    next.deletedStatusId = identifiers.statusId;
  }
  next.uri = '';
  next.statusId = null;
  next.error = null;
  next.metrics = { likes: 0, reposts: 0 };
  return next;
}

function parseOptionalDate(value) {
  if (value == null || value === '') {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('scheduledAt ist kein gültiges Datum.');
  }
  return parsed;
}

function normalizeRepeatFields(payload, existing) {
  const repeat = payload.repeat ?? existing?.repeat ?? 'none';
  let repeatDayOfWeek = null;
  let repeatDayOfMonth = null;

  if (repeat === 'weekly') {
    const value = Number(payload.repeatDayOfWeek ?? existing?.repeatDayOfWeek);
    if (!Number.isInteger(value) || value < 0 || value > 6) {
      throw new Error("repeatDayOfWeek muss zwischen 0 (Sonntag) und 6 liegen.");
    }
    repeatDayOfWeek = value;
  }

  if (repeat === 'monthly') {
    const value = Number(payload.repeatDayOfMonth ?? existing?.repeatDayOfMonth);
    if (!Number.isInteger(value) || value < 1 || value > 31) {
      throw new Error('repeatDayOfMonth muss zwischen 1 und 31 liegen.');
    }
    repeatDayOfMonth = value;
  }

  return { repeat, repeatDayOfWeek, repeatDayOfMonth };
}

function buildSkeetAttributes(payload, existing = null) {
  const rawContent = payload.content ?? existing?.content ?? '';
  const content = typeof rawContent === 'string' ? rawContent.trim() : '';
  if (!content) {
    throw new Error('content ist erforderlich.');
  }

  const rawPlatforms = payload.targetPlatforms ?? existing?.targetPlatforms ?? ['bluesky'];
  let normalizedList = normalizeTargetPlatforms(rawPlatforms);
  if (normalizedList.length === 0 && Array.isArray(rawPlatforms)) {
    normalizedList = rawPlatforms.filter(Boolean);
  }
  if (normalizedList.length === 0) {
    normalizedList = ['bluesky'];
  }
  const normalizedPlatforms = ensureTargetPlatforms(normalizedList);

  let scheduledAt;
  if (Object.prototype.hasOwnProperty.call(payload, 'scheduledAt')) {
    scheduledAt = parseOptionalDate(payload.scheduledAt);
  } else {
    scheduledAt = existing?.scheduledAt ?? null;
  }

  const { repeat, repeatDayOfWeek, repeatDayOfMonth } = normalizeRepeatFields(payload, existing);

  if (repeat === 'none' && !scheduledAt) {
    throw new Error("scheduledAt ist erforderlich, wenn repeat = 'none' ist.");
  }

  const attributes = {
    content,
    repeat,
    repeatDayOfWeek,
    repeatDayOfMonth,
    threadId: payload.threadId ?? existing?.threadId ?? null,
    isThreadPost: Boolean(payload.isThreadPost ?? existing?.isThreadPost ?? false),
    targetPlatforms: normalizedPlatforms,
  };

  if (repeat === 'none') {
    attributes.scheduledAt = scheduledAt;
    attributes.postUri = null;
    attributes.postedAt = null;
  } else if (scheduledAt) {
    attributes.scheduledAt = scheduledAt;
  }

  return attributes;
}

async function listSkeets({ includeDeleted = false, onlyDeleted = false, includeMedia = false } = {}) {
  const include = [];
  if (includeMedia) {
    include.push({ model: SkeetMedia, as: 'media', separate: true, order: [["order","ASC"],["id","ASC"]] });
  }
  const queryOptions = { order: [["scheduledAt","ASC"],["createdAt","DESC"]], include };

  if (includeDeleted || onlyDeleted) {
    queryOptions.paranoid = false;
  }

  const skeets = await Skeet.findAll(queryOptions);
  const list = skeets.map((s) => s.toJSON());
  if (onlyDeleted) {
    return list.filter((entry) => Boolean(entry.deletedAt));
  }
  // add previewUrl
  if (includeMedia) {
    for (const s of list) {
      if (!Array.isArray(s.media)) continue;
      s.media = s.media.map((m) => ({ ...m, previewUrl: m?.path ? (`/uploads/` + path.basename(m.path)) : null }));
    }
  }
  return list;
}

async function createSkeet(payload) {
  const attributes = buildSkeetAttributes(payload);
  attributes.platformResults = {};
  const skeet = await Skeet.create(attributes);
  try {
    const mediaItems = Array.isArray(payload.media) ? payload.media : [];
    if (mediaItems.length > 0) {
      const dir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      let order = await SkeetMedia.count({ where: { skeetId: skeet.id } });
      const maxBytes = Number(process.env.UPLOAD_MAX_BYTES || 10 * 1024 * 1024);
      for (const m of mediaItems) {
        if (!m?.data) continue;
        const buffer = Buffer.from(String(m.data).split(',').pop(), 'base64');
        if (buffer.length > maxBytes) continue;
        const base = `${Date.now()}-${String(m.filename || 'image').replace(/[^A-Za-z0-9._-]+/g, '_').slice(0,120)}`;
        const filePath = path.join(dir, base);
        fs.writeFileSync(filePath, buffer);
        await SkeetMedia.create({ skeetId: skeet.id, order, path: filePath, mime: m.mime || 'image/jpeg', size: buffer.length, altText: typeof m.altText === 'string' ? m.altText : null });
        order += 1;
        if (order >= 4) break;
      }
    }
  } catch (e) { log.error("Fehler beim Erstellen des Skeet", { error: e?.message || String(e) }); }
  return skeet;
}

async function updateSkeet(id, payload) {
  const skeet = await Skeet.findByPk(id);
  if (!skeet) {
    throw new Error('Skeet nicht gefunden.');
  }
  const attributes = buildSkeetAttributes(payload, skeet);
  attributes.platformResults = {};
  if (attributes.repeat === 'none') {
    attributes.postUri = null;
    attributes.postedAt = null;
  }
  await skeet.update(attributes);
  // Optional: neue Medien anhängen (Base64 oder temp-Dateien werden in diesem Flow nicht verwendet)
  try {
    const mediaItems = Array.isArray(payload.media) ? payload.media : [];
    if (mediaItems.length > 0) {
      const dir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      let order = await SkeetMedia.count({ where: { skeetId: skeet.id } });
      const maxBytes = Number(process.env.UPLOAD_MAX_BYTES || 10 * 1024 * 1024);
      for (const m of mediaItems) {
        if (!m?.data) continue;
        const buffer = Buffer.from(String(m.data).split(',').pop(), 'base64');
        if (buffer.length > maxBytes) continue;
        const base = `${Date.now()}-${String(m.filename || 'image').replace(/[^A-Za-z0-9._-]+/g, '_').slice(0,120)}`;
        const filePath = path.join(dir, base);
        fs.writeFileSync(filePath, buffer);
        await SkeetMedia.create({ skeetId: skeet.id, order, path: filePath, mime: m.mime || 'image/jpeg', size: buffer.length, altText: typeof m.altText === 'string' ? m.altText : null });
        order += 1;
        if (order >= 4) break;
      }
    }
  } catch (e) { log.error("Fehler beim Aktualisieren des Skeet", { error: e?.message || String(e) }); }
  return skeet;
}

async function deleteSkeet(id, { permanent = false } = {}) {
  const skeet = await Skeet.findByPk(id, { paranoid: !permanent });
  if (!skeet) {
    throw new Error('Skeet nicht gefunden.');
  }
  await skeet.destroy({ force: Boolean(permanent) });
}

async function retractSkeet(id, options = {}) {
  ensurePlatforms();

  const skeet = await Skeet.findByPk(id, { paranoid: false });
  if (!skeet) {
    const error = new Error('Skeet nicht gefunden.');
    error.status = 404;
    throw error;
  }

  const results = parsePlatformResults(skeet.platformResults);
  const targets = collectTargetPlatformsForRemoval(skeet, results, options.platforms).filter((platformId) =>
    ALLOWED_PLATFORMS.includes(platformId)
  );

  if (targets.length === 0) {
    const error = new Error('Für diesen Skeet liegen keine veröffentlichten Plattformdaten vor.');
    error.status = 400;
    throw error;
  }

  const updatedResults = { ...results };
  const summary = {};
  let anySuccess = false;

  for (const platformId of targets) {
    const platformEnv = resolvePlatformEnv(platformId);
    const envError = validatePlatformEnv(platformId, platformEnv);
    if (envError) {
      summary[platformId] = { ok: false, error: envError };
      continue;
    }

    const entry = results[platformId] || {};
    const identifiers = {
      uri: entry.uri || (platformId === 'bluesky' ? skeet.postUri : null),
      statusId: entry.statusId || null,
    };

    if (!identifiers.uri && !identifiers.statusId) {
      summary[platformId] = { ok: false, error: 'Keine Remote-ID gefunden.' };
      continue;
    }

    try {
      const res = await deletePost(platformId, identifiers, platformEnv);
      if (res.ok) {
        anySuccess = true;
        updatedResults[platformId] = markResultAsDeleted(entry, identifiers);
        summary[platformId] = { ok: true };
      } else {
        summary[platformId] = { ok: false, error: res.error || 'Unbekannter Fehler' };
      }
    } catch (error) {
      summary[platformId] = { ok: false, error: error?.message || String(error) };
    }
  }

  if (anySuccess) {
    const updatePayload = {
      platformResults: updatedResults,
      likesCount: 0,
      repostsCount: 0,
    };

    if (skeet.repeat === 'none') {
      updatePayload.postUri = null;
      updatePayload.postedAt = null;
      updatePayload.scheduledAt = null;
    }

    await skeet.update(updatePayload);
  }

  const fresh = await Skeet.findByPk(id, { paranoid: false });
  return {
    skeet: fresh ? fresh.toJSON() : null,
    summary,
    success: anySuccess,
  };
}

async function restoreSkeet(id) {
  const skeet = await Skeet.findByPk(id, { paranoid: false });
  if (!skeet) {
    const error = new Error('Skeet nicht gefunden.');
    error.status = 404;
    throw error;
  }
  if (!skeet.deletedAt) {
    return skeet;
  }
  await skeet.restore();
  return skeet;
}

module.exports = {
  listSkeets,
  createSkeet,
  updateSkeet,
  deleteSkeet,
  retractSkeet,
  restoreSkeet,
  normalizeTargetPlatforms,
  ensurePlatforms: ensureTargetPlatforms,
  parseOptionalDate,
  buildSkeetAttributes,
};

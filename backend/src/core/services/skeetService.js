const { Op } = require('sequelize');
const { Skeet, SkeetMedia, PostSendLog } = require('../../data/models');
const config = require('../../config');
const { parseDatetimeLocal, DATETIME_LOCAL_REGEX } = require('../../utils/timezone');
const { createLogger } = require('../../utils/logging');
const log = createLogger('skeet');
const fs = require('fs');
const path = require('path');
const { ALLOWED_PLATFORMS } = require('../../constants/platforms');
const { deletePost } = require('./postService');
const events = require('./events');
const { ensurePlatforms, resolvePlatformEnv, validatePlatformEnv } = require('./platformContext');
const schedulerService = require('./scheduler');

function emitSkeetEvent(eventName, payload) {
  try {
    events.emit(eventName, payload);
  } catch (error) {
    log.warn(`Event ${eventName} konnte nicht gesendet werden`, {
      error: error?.message || String(error)
    });
  }
}

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

const PLATFORM_STATES = {
  ONLINE: 'online',
  DELETED: 'deleted',
  DELETE_FAILED: 'delete_failed',
  SEND_FAILED: 'send_failed',
  UNKNOWN: 'unknown'
};

const SKEET_DELETION_STATUS = {
  NONE: 'none',
  PARTIAL: 'partial',
  FULL: 'full'
};

function derivePlatformStateFromLog(log) {
  if (!log) return PLATFORM_STATES.UNKNOWN;
  if (log.eventType === 'send') {
    return log.status === 'success' ? PLATFORM_STATES.ONLINE : PLATFORM_STATES.SEND_FAILED;
  }
  if (log.eventType === 'delete') {
    return log.status === 'success' ? PLATFORM_STATES.DELETED : PLATFORM_STATES.DELETE_FAILED;
  }
  return PLATFORM_STATES.UNKNOWN;
}

async function deriveSkeetPlatformStates(skeetId, targetPlatforms = []) {
  const platforms = Array.from(new Set((targetPlatforms || []).filter(Boolean)));
  if (platforms.length === 0) {
    return {};
  }
  const logs = await PostSendLog.findAll({
    where: {
      skeetId,
      platform: { [Op.in]: platforms }
    },
    order: [
      ['postedAt', 'DESC'],
      ['createdAt', 'DESC']
    ]
  });

  const states = {};
  platforms.forEach((platform) => {
    states[platform] = PLATFORM_STATES.UNKNOWN;
  });

  for (const log of logs) {
    if (!(log.platform in states)) continue;
    if (states[log.platform] !== PLATFORM_STATES.UNKNOWN) continue;
    states[log.platform] = derivePlatformStateFromLog(log);
  }

  return states;
}

function deriveSkeetDeletionStatus(platformStates = {}) {
  const entries = Object.keys(platformStates);
  if (entries.length === 0) {
    return SKEET_DELETION_STATUS.NONE;
  }

  const allDeleted = entries.every((platform) => platformStates[platform] === PLATFORM_STATES.DELETED);
  if (allDeleted) {
    return SKEET_DELETION_STATUS.FULL;
  }

  const needsAttention = entries.some((platform) =>
    platformStates[platform] === PLATFORM_STATES.ONLINE ||
    platformStates[platform] === PLATFORM_STATES.DELETE_FAILED
  );
  if (needsAttention) {
    return SKEET_DELETION_STATUS.PARTIAL;
  }

  return SKEET_DELETION_STATUS.NONE;
}

async function fetchLatestSuccessfulSendLog(skeetId, platform) {
  return PostSendLog.findOne({
    where: {
      skeetId,
      platform,
      eventType: 'send',
      status: 'success'
    },
    order: [
      ['postedAt', 'DESC'],
      ['createdAt', 'DESC']
    ]
  });
}

async function resolveDeleteIdentifiers(skeet, platformId, results = {}) {
  const sendLog = await fetchLatestSuccessfulSendLog(skeet.id, platformId);
  if (sendLog && (sendLog.postUri || sendLog.postCid)) {
    return {
      uri: sendLog.postUri || null,
      statusId: results[platformId]?.statusId || null,
      cid: sendLog.postCid || null
    };
  }

  const entry = results[platformId] || {};
  const fallbackUri = entry.uri || (platformId === 'bluesky' ? skeet.postUri : null);
  const statusId = entry.statusId || null;

  if (!fallbackUri && !statusId) {
    return null;
  }

  return {
    uri: fallbackUri || null,
    statusId,
    cid: entry.cid || null
  };
}

async function logPlatformEvent({
  skeetId,
  platform,
  eventType,
  status,
  postUri = null,
  postCid = null,
  error = null,
  contentSnapshot = null,
  mediaSnapshot = null,
  postedAt = new Date()
}) {
  try {
    await PostSendLog.create({
      skeetId,
      platform,
      eventType,
      status,
      postUri,
      postCid,
      error,
      contentSnapshot,
      mediaSnapshot,
      postedAt
    });
  } catch (err) {
    log.warn('Konnte PostSendLog nicht schreiben', {
      skeetId,
      platform,
      eventType,
      status,
      error: err?.message || String(err)
    });
  }
}

function parseOptionalDate(value) {
  if (value == null || value === '') {
    return null;
  }
  if (typeof value === 'string' && DATETIME_LOCAL_REGEX.test(value)) {
    try {
      return parseDatetimeLocal(value, config.TIME_ZONE);
    } catch {
      throw new Error('scheduledAt ist kein gültiges Datum.');
    }
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
   let repeatDaysOfWeek = null;

  if (repeat === 'weekly') {
    const rawDays =
      Array.isArray(payload.repeatDaysOfWeek) && payload.repeatDaysOfWeek.length
        ? payload.repeatDaysOfWeek
        : Array.isArray(existing?.repeatDaysOfWeek) &&
            existing.repeatDaysOfWeek.length
          ? existing.repeatDaysOfWeek
          : null;

    if (rawDays && rawDays.length) {
      const normalized = Array.from(
        new Set(
          rawDays
            .map(v => Number(v))
            .filter(v => Number.isInteger(v) && v >= 0 && v <= 6)
        )
      ).sort((a, b) => a - b);

      if (!normalized.length) {
        throw new Error("repeatDaysOfWeek muss mindestens einen gültigen Wochentag (0–6) enthalten.");
      }
      repeatDaysOfWeek = normalized;
      repeatDayOfWeek = normalized[0];
    } else {
      const value = Number(payload.repeatDayOfWeek ?? existing?.repeatDayOfWeek);
      if (!Number.isInteger(value) || value < 0 || value > 6) {
        throw new Error("repeatDayOfWeek muss zwischen 0 (Sonntag) und 6 liegen.");
      }
      repeatDayOfWeek = value;
    }
  }

  if (repeat === 'monthly') {
    const value = Number(payload.repeatDayOfMonth ?? existing?.repeatDayOfMonth);
    if (!Number.isInteger(value) || value < 1 || value > 31) {
      throw new Error('repeatDayOfMonth muss zwischen 1 und 31 liegen.');
    }
    repeatDayOfMonth = value;
  }

  return { repeat, repeatDayOfWeek, repeatDayOfMonth, repeatDaysOfWeek };
}

function buildSkeetAttributes(payload, existing = null) {
  const rawContent = payload.content ?? existing?.content ?? '';
  const content = typeof rawContent === 'string' ? rawContent.trim() : '';
  // Allow media-only skeets: if no textual content, require at least one media item in payload
  const hasMediaInPayload = Array.isArray(payload.media)
    ? payload.media.some((m) => m && (m.data || m.tempId || m.path))
    : false;
  const existingHasMedia = Boolean(existing && (existing._hasExistingMedia || (Array.isArray(existing.media) && existing.media.length > 0)));
  if (!content && !hasMediaInPayload && !existingHasMedia) {
    throw new Error('content oder Medien sind erforderlich.');
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

  const hasScheduledAtInput = Object.prototype.hasOwnProperty.call(payload, 'scheduledAt');
  let scheduledAt;
  if (hasScheduledAtInput) {
    scheduledAt = parseOptionalDate(payload.scheduledAt);
  } else {
    scheduledAt = existing?.scheduledAt ?? null;
  }

  const { repeat, repeatDayOfWeek, repeatDayOfMonth, repeatDaysOfWeek } = normalizeRepeatFields(payload, existing);

  if (repeat === 'none' && !scheduledAt) {
    throw new Error("scheduledAt ist erforderlich, wenn repeat = 'none' ist.");
  }

  const attributes = {
    content,
    repeat,
    repeatDayOfWeek,
    repeatDayOfMonth,
    repeatDaysOfWeek,
    threadId: payload.threadId ?? existing?.threadId ?? null,
    isThreadPost: Boolean(payload.isThreadPost ?? existing?.isThreadPost ?? false),
    targetPlatforms: normalizedPlatforms,
  };

  if (repeat === 'none') {
    attributes.scheduledAt = scheduledAt;
    attributes.postUri = null;
    attributes.postedAt = null;
    attributes.repeatAnchorAt = null;
  } else {
    if (scheduledAt) {
      attributes.scheduledAt = scheduledAt;
    } else if (existing?.scheduledAt) {
      attributes.scheduledAt = existing.scheduledAt;
    }
    if (hasScheduledAtInput) {
      attributes.repeatAnchorAt = scheduledAt || null;
    } else if (existing?.repeatAnchorAt) {
      attributes.repeatAnchorAt = existing.repeatAnchorAt;
    } else if (attributes.scheduledAt) {
      attributes.repeatAnchorAt = attributes.scheduledAt;
    }
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
      const dir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'medien');
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
  emitSkeetEvent('skeet:updated', { id: skeet.id, status: attributes.repeat === 'none' ? 'scheduled' : 'scheduled' });
  return skeet;
}

async function updateSkeet(id, payload) {
  const skeet = await Skeet.findByPk(id);
  if (!skeet) {
    throw new Error('Skeet nicht gefunden.');
  }
  // Hinweis für Validierung: vorhandene Medien berücksichtigen
  const existingCount = await SkeetMedia.count({ where: { skeetId: skeet.id } }).catch(() => 0);
  skeet._hasExistingMedia = existingCount > 0;
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
      const dir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'medien');
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
  emitSkeetEvent('skeet:updated', { id: skeet.id });
  return skeet;
}

async function deleteSkeet(id, { permanent = false } = {}) {
  const skeet = await Skeet.findByPk(id, { paranoid: !permanent });
  if (!skeet) {
    throw new Error('Skeet nicht gefunden.');
  }
  await skeet.destroy({ force: Boolean(permanent) });
  emitSkeetEvent('skeet:updated', { id: skeet.id, status: 'deleted', permanent: Boolean(permanent) });
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
    emitSkeetEvent('skeet:updated', { id: skeet.id });
  }

  const fresh = await Skeet.findByPk(id, { paranoid: false });
  return {
    skeet: fresh ? fresh.toJSON() : null,
    summary,
    success: anySuccess,
  };
}

async function retractSkeetCompletely(id) {
  ensurePlatforms();

  const skeet = await Skeet.findByPk(id, { paranoid: false });
  if (!skeet) {
    const error = new Error('Skeet nicht gefunden.');
    error.status = 404;
    throw error;
  }
  if (skeet.deletedAt) {
    const error = new Error('Der Skeet befindet sich bereits im Papierkorb.');
    error.status = 400;
    throw error;
  }

  const results = parsePlatformResults(skeet.platformResults);
  const targetPlatforms = collectTargetPlatformsForRemoval(skeet, results).filter((platformId) =>
    ALLOWED_PLATFORMS.includes(platformId)
  );
  if (targetPlatforms.length === 0) {
    const error = new Error('Für diesen Skeet liegen keine Zielplattformen vor.');
    error.status = 400;
    throw error;
  }

  const platformStatesBefore = await deriveSkeetPlatformStates(skeet.id, targetPlatforms);
  const deleteResults = {};
  const updatedResults = { ...results };
  let anySuccess = false;

  for (const platformId of targetPlatforms) {
    const stateBefore = platformStatesBefore[platformId] || PLATFORM_STATES.UNKNOWN;
    if (![PLATFORM_STATES.ONLINE, PLATFORM_STATES.DELETE_FAILED].includes(stateBefore)) {
      deleteResults[platformId] = 'skipped';
      continue;
    }

    const platformEnv = resolvePlatformEnv(platformId);
    const envError = validatePlatformEnv(platformId, platformEnv);
    if (envError) {
      deleteResults[platformId] = 'failed';
      await logPlatformEvent({
        skeetId: skeet.id,
        platform: platformId,
        eventType: 'delete',
        status: 'failed',
        error: envError
      });
      continue;
    }

    const identifiers = await resolveDeleteIdentifiers(skeet, platformId, updatedResults);
    if (!identifiers) {
      deleteResults[platformId] = 'failed';
      await logPlatformEvent({
        skeetId: skeet.id,
        platform: platformId,
        eventType: 'delete',
        status: 'failed',
        error: 'Keine Remote-ID gefunden.'
      });
      continue;
    }

    try {
      const response = await deletePost(platformId, { uri: identifiers.uri, statusId: identifiers.statusId }, platformEnv);
      if (response.ok) {
        anySuccess = true;
        updatedResults[platformId] = markResultAsDeleted(updatedResults[platformId], identifiers);
        deleteResults[platformId] = 'success';
        await logPlatformEvent({
          skeetId: skeet.id,
          platform: platformId,
          eventType: 'delete',
          status: 'success',
          postUri: identifiers.uri || null,
          postCid: identifiers.cid || null
        });
      } else {
        deleteResults[platformId] = 'failed';
        await logPlatformEvent({
          skeetId: skeet.id,
          platform: platformId,
          eventType: 'delete',
          status: 'failed',
          postUri: identifiers.uri || null,
          postCid: identifiers.cid || null,
          error: response.error || 'Unbekannter Fehler'
        });
      }
    } catch (error) {
      deleteResults[platformId] = 'failed';
      await logPlatformEvent({
        skeetId: skeet.id,
        platform: platformId,
        eventType: 'delete',
        status: 'failed',
        postUri: identifiers.uri || null,
        postCid: identifiers.cid || null,
        error: error?.message || String(error)
      });
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
    emitSkeetEvent('skeet:updated', { id: skeet.id });
  }

  const platformStatesAfter = await deriveSkeetPlatformStates(skeet.id, targetPlatforms);
  const skeetDeletionStatus = deriveSkeetDeletionStatus(platformStatesAfter);

  if (skeetDeletionStatus === SKEET_DELETION_STATUS.FULL && !skeet.deletedAt) {
    await skeet.update({ status: 'deleted' });
    await skeet.destroy();
    emitSkeetEvent('skeet:updated', { id: skeet.id, status: 'deleted', trashed: true });
  }

  return {
    platformStatesBefore,
    deleteResults,
    platformStatesAfter,
    skeetDeletionStatus,
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
  emitSkeetEvent('skeet:updated', { id: skeet.id });
  return skeet;
}

async function findPendingManualSkeetOrThrow(id) {
  const skeet = await Skeet.findByPk(id);
  if (!skeet) {
    const error = new Error('Skeet nicht gefunden.');
    error.status = 404;
    throw error;
  }
  if (skeet.deletedAt) {
    const error = new Error('Skeet wurde gelöscht.');
    error.status = 404;
    throw error;
  }
  if (skeet.status !== 'pending_manual') {
    const error = new Error('Skeet ist nicht im Status pending_manual.');
    error.status = 400;
    throw error;
  }
  return skeet;
}

async function listPendingSkeets() {
  const skeets = await Skeet.findAll({
    where: { status: 'pending_manual' },
    order: [["scheduledAt", "ASC"], ["createdAt", "DESC"]],
  });
  return skeets.map((s) => s.toJSON());
}

async function publishPendingSkeetOnce(id) {
  const skeet = await findPendingManualSkeetOrThrow(id);

  if (skeet.repeat === 'none') {
    // Einmaliger Skeet: jetzt einmalig veröffentlichen (wie publish-now)
    await schedulerService.publishSkeetNow(id);
    const fresh = await Skeet.findByPk(id);
    if (!fresh) {
      const error = new Error('Skeet wurde während der Veröffentlichung entfernt.');
      error.status = 404;
      throw error;
    }
    emitSkeetEvent('skeet:updated', { id: fresh.id, status: 'sent' });
    return fresh;
  }

  // Wiederkehrender Skeet: verpasste Ausführung jetzt nachholen, Turnus aktiv lassen
  await schedulerService.publishSkeetNow(id);
  const fresh = await Skeet.findByPk(id);
  if (!fresh) {
    const error = new Error('Skeet wurde während der Veröffentlichung entfernt.');
    error.status = 404;
    throw error;
  }

  // Sicherstellen, dass Status/pendingReason konsistent sind
  if (fresh.status !== 'scheduled' || fresh.pendingReason) {
    await fresh.update({ status: 'scheduled', pendingReason: null });
  }

  emitSkeetEvent('skeet:updated', { id: fresh.id, status: 'scheduled' });
  return fresh;
}

async function discardPendingSkeet(id) {
  const skeet = await findPendingManualSkeetOrThrow(id);

  if (skeet.repeat === 'none') {
    await skeet.update({
      status: 'skipped',
      pendingReason: 'discarded_by_user',
      scheduledAt: null,
    });
    emitSkeetEvent('skeet:updated', { id: skeet.id, status: 'skipped' });
    return skeet;
  }

  // Wiederkehrender Skeet: verpasste Ausführung fällt aus, Turnus weiterführen
  const now = new Date();
  const nextAt = schedulerService.getNextScheduledAt(skeet, now);
  if (!nextAt) {
    const error = new Error('Konnte den nächsten Wiederholungstermin nicht bestimmen.');
    error.status = 400;
    throw error;
  }

  await skeet.update({
    status: 'scheduled',
    pendingReason: null,
    scheduledAt: schedulerService.applyRandomOffset(nextAt) || nextAt,
    repeatAnchorAt: nextAt,
  });
  emitSkeetEvent('skeet:updated', { id: skeet.id, status: 'scheduled' });
  return skeet;
}

async function getSkeetSendHistory(id, { limit = 50, offset = 0 } = {}) {
  const skeetId = Number(id);
  const target = await Skeet.findByPk(skeetId);
  if (!target) {
    const error = new Error('Skeet nicht gefunden.');
    error.status = 404;
    throw error;
  }

  const parsedLimit = Number.isFinite(Number(limit)) && Number(limit) >= 0 ? Number(limit) : 50;
  const parsedOffset = Number.isFinite(Number(offset)) && Number(offset) >= 0 ? Number(offset) : 0;

  const logs = await PostSendLog.findAll({
    where: { skeetId: target.id },
    order: [
      ['postedAt', 'DESC'],
      ['createdAt', 'DESC'],
    ],
    limit: parsedLimit,
    offset: parsedOffset,
  });

  return logs.map((log) => {
    const entry = log.toJSON();
    return {
      id: entry.id,
      eventType: entry.eventType,
      status: entry.status,
      platform: entry.platform,
      postedAt: entry.postedAt,
      postUri: entry.postUri,
      postCid: entry.postCid,
      error: entry.error,
      attempt: entry.attempt,
      contentSnapshot: entry.contentSnapshot,
      mediaSnapshot: entry.mediaSnapshot,
      createdAt: entry.createdAt,
    };
  });
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
  listPendingSkeets,
  publishPendingSkeetOnce,
  discardPendingSkeet,
  getSkeetSendHistory,
  deriveSkeetPlatformStates,
  deriveSkeetDeletionStatus,
  retractSkeetCompletely,
};

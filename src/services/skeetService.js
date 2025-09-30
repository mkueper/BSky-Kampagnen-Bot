const { Skeet } = require('../models');
const { ALLOWED_PLATFORMS } = require('../constants/platforms');
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

async function listSkeets({ includeDeleted = false, onlyDeleted = false } = {}) {
  const queryOptions = {
    order: [
      ['scheduledAt', 'ASC'],
      ['createdAt', 'DESC'],
    ],
  };

  if (includeDeleted || onlyDeleted) {
    queryOptions.paranoid = false;
  }

  const skeets = await Skeet.findAll(queryOptions);
  if (onlyDeleted) {
    return skeets.filter((entry) => Boolean(entry.deletedAt));
  }
  return skeets;
}

async function createSkeet(payload) {
  const attributes = buildSkeetAttributes(payload);
  attributes.platformResults = {};
  return Skeet.create(attributes);
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

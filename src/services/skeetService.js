const { Skeet } = require('../models');
const { ALLOWED_PLATFORMS } = require('../constants/platforms');

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

function ensurePlatforms(platforms) {
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
  const normalizedPlatforms = ensurePlatforms(normalizedList);

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

async function listSkeets() {
  return Skeet.findAll({
    order: [
      ['scheduledAt', 'ASC'],
      ['createdAt', 'DESC'],
    ],
  });
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

async function deleteSkeet(id) {
  const skeet = await Skeet.findByPk(id);
  if (!skeet) {
    throw new Error('Skeet nicht gefunden.');
  }
  await skeet.destroy();
}

module.exports = {
  listSkeets,
  createSkeet,
  updateSkeet,
  deleteSkeet,
  normalizeTargetPlatforms,
  ensurePlatforms,
  parseOptionalDate,
  buildSkeetAttributes,
};

const { Skeet } = require('../models');
const threadService = require('./threadService');
const skeetService = require('./skeetService');
async function exportPlannedSkeets() {
  const skeets = await Skeet.findAll({
    where: { postUri: null },
    order: [['scheduledAt', 'ASC'], ['createdAt', 'DESC']],
  });

  return {
    exportedAt: new Date().toISOString(),
    count: skeets.length,
    skeets: skeets.map((entry) => ({
      content: entry.content,
      scheduledAt: entry.scheduledAt ? entry.scheduledAt.toISOString() : null,
      repeat: entry.repeat,
      repeatDayOfWeek: entry.repeatDayOfWeek,
      repeatDayOfMonth: entry.repeatDayOfMonth,
      threadId: entry.threadId,
      isThreadPost: entry.isThreadPost,
      targetPlatforms: Array.isArray(entry.targetPlatforms)
        ? entry.targetPlatforms
        : ['bluesky'],
    })),
  };
}

function normalizeImportPayload(body) {
  if (!body) {
    return [];
  }
  if (Array.isArray(body)) {
    return body;
  }
  if (Array.isArray(body.skeets)) {
    return body.skeets;
  }
  return [];
}

async function importPlannedSkeets(body) {
  const entries = normalizeImportPayload(body);
  if (entries.length === 0) {
    throw new Error('Erwartet ein Array geplanter Skeets im JSON-Body.');
  }

  const created = [];
  for (let index = 0; index < entries.length; index += 1) {
    const item = entries[index];
    if (!item || typeof item !== 'object') {
      throw new Error(`Eintrag ${index + 1}: Ungültige Struktur.`);
    }

    const payload = {
      content: item.content,
      scheduledAt: item.scheduledAt,
      repeat: item.repeat,
      repeatDayOfWeek: item.repeatDayOfWeek,
      repeatDayOfMonth: item.repeatDayOfMonth,
      threadId: item.threadId,
      isThreadPost: item.isThreadPost,
      targetPlatforms: item.targetPlatforms,
    };

    try {
      const skeet = await skeetService.createSkeet(payload);
      created.push(skeet);
    } catch (error) {
      throw new Error(`Eintrag ${index + 1}: ${error?.message || error}`);
    }
  }

  return created;
}

async function exportThreads(options = {}) {
  const { status } = options;
  const threads = await threadService.listThreads();

  const allowedStatuses = status
    ? [status]
    : ['draft', 'scheduled'];

  const filtered = threads.filter((thread) => {
    if (thread.status === 'deleted') {
      return false;
    }
    return allowedStatuses.includes(thread.status);
  });

  const payload = filtered.map((thread) => {
    const rawMetadata = thread.metadata && typeof thread.metadata === 'object' && !Array.isArray(thread.metadata)
      ? { ...thread.metadata }
      : {};
    if (rawMetadata && typeof rawMetadata === 'object') {
      delete rawMetadata.platformResults;
      delete rawMetadata.lastDispatchAt;
      delete rawMetadata.lastSuccessAt;
      delete rawMetadata.lastError;
    }

    const scheduledAtValue = thread.scheduledAt ? new Date(thread.scheduledAt) : null;
    return {
      title: thread.title || null,
      scheduledAt: scheduledAtValue ? scheduledAtValue.toISOString() : null,
      status: thread.status,
      targetPlatforms: Array.isArray(thread.targetPlatforms) && thread.targetPlatforms.length
        ? thread.targetPlatforms
        : ['bluesky'],
      appendNumbering: Boolean(thread.appendNumbering),
      metadata: rawMetadata,
      segments: Array.isArray(thread.segments)
        ? thread.segments.map((segment) => ({
            sequence: segment.sequence,
            content: segment.content,
            appendNumbering: Boolean(segment.appendNumbering),
            characterCount: segment.characterCount,
          }))
        : [],
    };
  });

  return {
    exportedAt: new Date().toISOString(),
    count: payload.length,
    threads: payload,
  };
}

function normalizeThreadImportPayload(body) {
  if (!body) {
    return [];
  }
  if (Array.isArray(body)) {
    return body;
  }
  if (Array.isArray(body.threads)) {
    return body.threads;
  }
  return [];
}

function sanitizeThreadSegments(rawSegments, appendNumbering, threadIndex) {
  if (!Array.isArray(rawSegments) || rawSegments.length === 0) {
    throw new Error(`Thread ${threadIndex + 1}: Mindestens ein Segment ist erforderlich.`);
  }

  return rawSegments.map((segment, segmentIndex) => {
    const content = String(segment?.content || '').trimEnd();
    if (!content) {
      throw new Error(`Thread ${threadIndex + 1}: Segment ${segmentIndex + 1} darf nicht leer sein.`);
    }

    const characterCount = Number.isFinite(segment?.characterCount)
      ? segment.characterCount
      : content.length;

    return {
      sequence: Number.isFinite(segment?.sequence) ? segment.sequence : segmentIndex,
      content,
      appendNumbering: typeof segment?.appendNumbering === 'boolean'
        ? segment.appendNumbering
        : appendNumbering,
      characterCount,
    };
  });
}

async function importThreads(body) {
  const entries = normalizeThreadImportPayload(body);
  if (entries.length === 0) {
    throw new Error('Erwartet ein Array von Threads im JSON-Body.');
  }

  const created = [];

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (!entry || typeof entry !== 'object') {
      throw new Error(`Thread ${index + 1}: Ungültige Struktur.`);
    }

    const appendNumbering = typeof entry.appendNumbering === 'boolean' ? entry.appendNumbering : true;
    const metadata = entry.metadata && typeof entry.metadata === 'object' && !Array.isArray(entry.metadata)
      ? { ...entry.metadata }
      : {};

    if (metadata && typeof metadata === 'object') {
      delete metadata.platformResults;
      delete metadata.lastDispatchAt;
      delete metadata.lastSuccessAt;
      delete metadata.lastError;
    }

    const segments = sanitizeThreadSegments(entry.segments, appendNumbering, index);

    const payload = {
      title: entry.title ?? null,
      scheduledAt: entry.scheduledAt ?? null,
      status: entry.status ?? 'draft',
      targetPlatforms: entry.targetPlatforms,
      appendNumbering,
      metadata,
      skeets: segments,
    };

    try {
      const thread = await threadService.createThread(payload);
      created.push(thread);
    } catch (error) {
      throw new Error(`Thread ${index + 1}: ${error?.message || error}`);
    }
  }

  return created;
}

module.exports = {
  exportPlannedSkeets,
  importPlannedSkeets,
  exportThreads,
  importThreads,
};

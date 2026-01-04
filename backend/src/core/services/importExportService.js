const { Skeet, Thread, ThreadSkeet } = require('../../data/models');
const threadService = require('./threadService');
const skeetService = require('./skeetService');
const fs = require('fs');
const path = require('path');

function fileToDataUrl(filePath, mime) {
  try {
    const buf = fs.readFileSync(filePath);
    const b64 = buf.toString('base64');
    const safeMime = mime || 'application/octet-stream';
    return `data:${safeMime};base64,${b64}`;
  } catch {
    return null;
  }
}
async function exportPlannedSkeets({ includeMedia = true } = {}) {
  const all = await skeetService.listSkeets({ includeDeleted: false, includeMedia });
  const skeets = all.filter((s) => !s.postUri);

  return {
    exportedAt: new Date().toISOString(),
    count: skeets.length,
    skeets: skeets.map((entry) => ({
      content: entry.content,
      scheduledAt: entry.scheduledAt ? new Date(entry.scheduledAt).toISOString() : null,
      scheduledPlannedAt: entry.scheduledPlannedAt
        ? new Date(entry.scheduledPlannedAt).toISOString()
        : (entry.scheduledAt ? new Date(entry.scheduledAt).toISOString() : null),
      repeat: entry.repeat,
      repeatDayOfWeek: entry.repeatDayOfWeek,
      repeatDayOfMonth: entry.repeatDayOfMonth,
      threadId: entry.threadId,
      isThreadPost: entry.isThreadPost,
      targetPlatforms: Array.isArray(entry.targetPlatforms)
        ? entry.targetPlatforms
        : ['bluesky'],
      media: includeMedia && Array.isArray(entry.media)
        ? entry.media.slice(0, 4)
            .map((m) => ({
              filename: m?.path ? path.basename(m.path) : (m?.filename || 'image'),
              mime: m?.mime || 'application/octet-stream',
              altText: m?.altText || null,
              data: m?.path ? fileToDataUrl(m.path, m.mime) : null,
            }))
            .filter((m) => Boolean(m.data))
        : undefined,
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

function normalizeRepeatValue(value) {
  if (value == null || value === '' || value === 0 || value === '0' || value === false) {
    return 'none';
  }
  if (value === 'daily' || value === 'weekly' || value === 'monthly' || value === 'none') {
    return value;
  }
  return 'none';
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

    const normalizedRepeat = normalizeRepeatValue(item.repeat);
    const payload = {
      content: item.content,
      scheduledAt: item.scheduledAt ?? item.scheduledPlannedAt,
      scheduledPlannedAt: item.scheduledPlannedAt ?? null,
      repeat: normalizedRepeat,
      repeatDayOfWeek: item.repeatDayOfWeek,
      repeatDayOfMonth: item.repeatDayOfMonth,
      threadId: item.threadId,
      isThreadPost: item.isThreadPost,
      targetPlatforms: item.targetPlatforms,
      media: Array.isArray(item.media) ? item.media : undefined,
    };

    // Dedup anhand Inhalt + Termin/Repeat-Feldern
    const where = {
      content: payload.content,
      repeat: payload.repeat ?? 'none',
    };
    if (payload.repeat === 'weekly') {
      where.repeatDayOfWeek = payload.repeatDayOfWeek ?? null;
    }
    if (payload.repeat === 'monthly') {
      where.repeatDayOfMonth = payload.repeatDayOfMonth ?? null;
    }
    if ((payload.repeat ?? 'none') === 'none') {
      where.scheduledAt = payload.scheduledAt ? new Date(payload.scheduledAt) : null;
    }

    try {
      const existing = await Skeet.findOne({ where });
      if (existing) {
        continue; // Duplikat, überspringen
      }
      const skeet = await skeetService.createSkeet(payload);
      created.push(skeet);
    } catch (error) {
      throw new Error(`Eintrag ${index + 1}: ${error?.message || error}`);
    }
  }

  return created;
}

async function exportThreads(options = {}) {
  const { status, includeMedia = true } = options;
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
    const scheduledPlannedAtValue = thread.scheduledPlannedAt
      ? new Date(thread.scheduledPlannedAt)
      : scheduledAtValue;
    return {
      title: thread.title || null,
      scheduledAt: scheduledAtValue ? scheduledAtValue.toISOString() : null,
      scheduledPlannedAt: scheduledPlannedAtValue ? scheduledPlannedAtValue.toISOString() : null,
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
            media: includeMedia && Array.isArray(segment.media)
              ? segment.media
                  .slice(0, 4)
                  .map((m) => ({
                    filename: m?.path ? path.basename(m.path) : (m?.filename || 'image'),
                    mime: m?.mime || 'application/octet-stream',
                    altText: m?.altText || null,
                    data: m?.path ? fileToDataUrl(m.path, m.mime) : null,
                  }))
                  .filter((m) => Boolean(m.data))
              : undefined,
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
    // Medien vom Original beibehalten (per sequence matchen)
    const withMedia = segments.map((seg, i) => {
      const orig = Array.isArray(entry.segments) ? entry.segments[i] : null;
      const media = orig && Array.isArray(orig.media) ? orig.media : undefined;
      return media ? { ...seg, media } : seg;
    });

    const payload = {
      title: entry.title ?? null,
      scheduledAt: entry.scheduledAt ?? entry.scheduledPlannedAt ?? null,
      scheduledPlannedAt: entry.scheduledPlannedAt ?? null,
      status: entry.status ?? 'draft',
      targetPlatforms: entry.targetPlatforms,
      appendNumbering,
      metadata,
      skeets: withMedia,
    };

    try {
      // Dedup: gleicher Title/ScheduledAt + identische Inhalte
      const title = payload.title || null;
      const scheduledAt = payload.scheduledAt ? new Date(payload.scheduledAt) : null;
      const candidates = await Thread.findAll({ where: { title, scheduledAt } });
      let isDuplicate = false;
      for (const cand of candidates) {
        const existingSegs = await ThreadSkeet.findAll({ where: { threadId: cand.id }, order: [["sequence","ASC"]] });
        if (existingSegs.length !== segments.length) continue;
        let equal = true;
        for (let i = 0; i < segments.length; i++) {
          const a = String(segments[i].content || '').trim();
          const b = String(existingSegs[i]?.content || '').trim();
          if (a !== b) { equal = false; break; }
        }
        if (equal) { isDuplicate = true; break; }
      }
      if (isDuplicate) {
        continue; // überspringen
      }

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

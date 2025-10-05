const { ValidationError } = require("sequelize");
const { sequelize, Thread, ThreadSkeet, SkeetReaction } = require("../models");
const { deletePost } = require("./postService");
const { ensurePlatforms, resolvePlatformEnv, validatePlatformEnv } = require("./platformContext");

const ALLOWED_PLATFORMS = ["bluesky", "mastodon"];

function sanitizePlatforms(input) {
  if (!Array.isArray(input)) {
    return ["bluesky"];
  }

  const unique = [...new Set(input.map((value) => String(value).toLowerCase()))];
  const filtered = unique.filter((value) => ALLOWED_PLATFORMS.includes(value));
  return filtered.length > 0 ? filtered : ["bluesky"];
}

function normalizeSkeets(skeets, appendNumbering) {
  if (!Array.isArray(skeets) || skeets.length === 0) {
    throw new ValidationError("Mindestens ein Skeet ist erforderlich.");
  }

  return skeets.map((entry, index) => {
    const content = String(entry?.content || "").trimEnd();
    if (!content) {
      throw new ValidationError(`Segment ${index + 1} darf nicht leer sein.`);
    }

    const characterCount = typeof entry?.characterCount === "number" ? entry.characterCount : content.length;

    return {
      sequence: Number.isFinite(entry?.sequence) ? entry.sequence : index,
      content,
      appendNumbering: typeof entry?.appendNumbering === "boolean" ? entry.appendNumbering : appendNumbering,
      characterCount,
    };
  });
}

// Lokaler Helfer: optionales Datum robust parsen
// Akzeptiert leere Werte (-> null) und JS-parsebare Strings/Date-Objekte.
function parseOptionalDate(value) {
  if (value == null || value === "") {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError("scheduledAt ist kein gültiges Datum.");
  }
  return parsed;
}

function ensureMetadataObject(raw) {
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

function extractMastodonStatusId(uri) {
  if (!uri) {
    return null;
  }
  const match = String(uri).match(/\/([0-9A-Za-z]+)(?:$|[/?#])/);
  return match && match[1] ? match[1] : null;
}

function markThreadSegmentAsDeleted(segment = {}, identifiers = {}) {
  const next = { ...segment };
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
  return next;
}

async function listThreads({ status } = {}) {
  const where = {};
  if (status) {
    where.status = status;
  }

  const threads = await Thread.findAll({
    where,
    order: [
      [sequelize.literal("CASE WHEN scheduledAt IS NULL THEN 1 ELSE 0 END"), "ASC"],
      ["scheduledAt", "ASC"],
      ["createdAt", "DESC"],
    ],
    include: [
      {
        model: ThreadSkeet,
        as: "segments",
        attributes: ["id", "sequence", "content", "characterCount", "appendNumbering", "postedAt", "remoteId"],
        separate: true,
        order: [["sequence", "ASC"]],
        include: [
          {
            model: SkeetReaction,
            as: "reactions",
            separate: true,
            order: [["createdAt", "DESC"]],
          },
        ],
      },
    ],
  });

  return threads.map((thread) => thread.toJSON());
}

async function getThread(id) {
  const thread = await Thread.findByPk(id, {
    include: [
      {
        model: ThreadSkeet,
        as: "segments",
        separate: true,
        order: [["sequence", "ASC"]],
        include: [
          {
            model: SkeetReaction,
            as: "reactions",
            separate: true,
            order: [["createdAt", "DESC"]],
          },
        ],
      },
    ],
  });

  if (!thread) {
    const error = new Error("Thread nicht gefunden.");
    error.status = 404;
    throw error;
  }

  return thread.toJSON();
}

async function createThread(payload = {}) {
  const {
    title = null,
    scheduledAt = null,
    status = "draft",
    targetPlatforms = ["bluesky"],
    appendNumbering = true,
    metadata = {},
    skeets = [],
  } = payload;

  const normalizedPlatforms = sanitizePlatforms(targetPlatforms);
  const normalizedSkeets = normalizeSkeets(skeets, appendNumbering);
  const safeMetadata = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};

  return sequelize.transaction(async (transaction) => {
    const thread = await Thread.create(
      {
        title,
        // Wichtig: Datum parsebar machen (lokale Eingaben von <input type="datetime-local">
        // werden hier in echte Date-Objekte umgewandelt, DB speichert in UTC.)
        scheduledAt: parseOptionalDate(scheduledAt),
        status,
        targetPlatforms: normalizedPlatforms,
        appendNumbering,
        metadata: safeMetadata,
      },
      { transaction }
    );

    const segments = normalizedSkeets.map((entry) => ({
      ...entry,
      threadId: thread.id,
    }));

    await ThreadSkeet.bulkCreate(segments, { transaction });

    const fresh = await Thread.findByPk(thread.id, {
      include: [
        {
          model: ThreadSkeet,
          as: "segments",
          order: [["sequence", "ASC"]],
        },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    return fresh.toJSON();
  });
}

async function updateThread(id, payload = {}) {
  const threadId = Number(id);
  if (!Number.isInteger(threadId)) {
    throw new ValidationError("Ungültige Thread-ID.");
  }

  const {
    title = undefined,
    scheduledAt = undefined,
    status = undefined,
    targetPlatforms = undefined,
    appendNumbering = undefined,
    metadata = undefined,
    skeets = undefined,
  } = payload;

  const thread = await Thread.findByPk(threadId, {
    include: [{ model: ThreadSkeet, as: "segments", order: [["sequence", "ASC"]] }],
  });

  if (!thread) {
    const error = new Error("Thread nicht gefunden.");
    error.status = 404;
    throw error;
  }

  const nextTargetPlatforms = targetPlatforms === undefined ? thread.targetPlatforms : sanitizePlatforms(targetPlatforms);
  const nextAppendNumbering = appendNumbering === undefined ? thread.appendNumbering : Boolean(appendNumbering);
  const nextMetadata = metadata === undefined || typeof metadata !== "object" || Array.isArray(metadata) ? thread.metadata : metadata;

  const shouldReplaceSkeets = Array.isArray(skeets);
  const normalizedSkeets = shouldReplaceSkeets ? normalizeSkeets(skeets, nextAppendNumbering) : null;

  return sequelize.transaction(async (transaction) => {
    await thread.update(
      {
        title: title === undefined ? thread.title : title,
        // Nur ändern, wenn Feld explizit vorhanden ist; dann robust parsen.
        scheduledAt:
          scheduledAt === undefined
            ? thread.scheduledAt
            : parseOptionalDate(scheduledAt),
        status: status === undefined ? thread.status : status,
        targetPlatforms: nextTargetPlatforms,
        appendNumbering: nextAppendNumbering,
        metadata: nextMetadata,
      },
      { transaction }
    );

    if (shouldReplaceSkeets) {
      await ThreadSkeet.destroy({ where: { threadId }, transaction });
      const segments = normalizedSkeets.map((entry, index) => ({
        ...entry,
        threadId,
        sequence: entry.sequence ?? index,
      }));
      await ThreadSkeet.bulkCreate(segments, { transaction });
    }

    const fresh = await Thread.findByPk(threadId, {
      include: [
        {
          model: ThreadSkeet,
          as: "segments",
          order: [["sequence", "ASC"]],
          include: [{ model: SkeetReaction, as: "reactions", separate: true, order: [["createdAt", "DESC"]] }],
        },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    return fresh.toJSON();
  });
}

async function deleteThread(id, { permanent = false } = {}) {
  const threadId = Number(id);
  if (!Number.isInteger(threadId)) {
    throw new ValidationError("Ungültige Thread-ID.");
  }

  const thread = await Thread.findByPk(threadId);
  if (!thread) {
    const error = new Error("Thread nicht gefunden.");
    error.status = 404;
    throw error;
  }

  if (permanent) {
    await Thread.destroy({ where: { id: threadId } });
    return { id: threadId, permanent: true };
  }

  if (thread.status === "deleted") {
    return { id: threadId, status: thread.status };
  }

  const metadata = thread.metadata && typeof thread.metadata === "object" && !Array.isArray(thread.metadata)
    ? { ...thread.metadata }
    : {};

  if (!metadata.deletedPreviousStatus) {
    metadata.deletedPreviousStatus = thread.status;
  }
  metadata.deletedAt = new Date().toISOString();

  await thread.update({ status: "deleted", metadata });
  return { id: threadId, status: "deleted" };
}

async function retractThread(id, options = {}) {
  ensurePlatforms();

  const threadId = Number(id);
  if (!Number.isInteger(threadId)) {
    throw new ValidationError("Ungültige Thread-ID.");
  }

  const thread = await Thread.findByPk(threadId, {
    include: [{ model: ThreadSkeet, as: "segments", order: [["sequence", "ASC"]] }],
  });

  if (!thread) {
    const error = new Error("Thread nicht gefunden.");
    error.status = 404;
    throw error;
  }

  const metadata = ensureMetadataObject(thread.metadata);
  const rawPlatformResults = metadata.platformResults && typeof metadata.platformResults === 'object' && !Array.isArray(metadata.platformResults)
    ? { ...metadata.platformResults }
    : {};

  const requested = Array.isArray(options.platforms) ? options.platforms.map((value) => String(value)) : [];
  const targetsSource = requested.length > 0 ? requested : Object.keys(rawPlatformResults);
  const targets = targetsSource.filter((platformId) => ALLOWED_PLATFORMS.includes(platformId));

  if (targets.length === 0) {
    const error = new Error('Für diesen Thread liegen keine veröffentlichten Plattformdaten vor.');
    error.status = 400;
    throw error;
  }

  const updatedPlatformResults = { ...rawPlatformResults };
  const summary = {};
  const clearedBskySequences = new Set();
  let anySuccess = false;

  for (const platformId of targets) {
    const platformEnv = resolvePlatformEnv(platformId);
    const envError = validatePlatformEnv(platformId, platformEnv);
    if (envError) {
      summary[platformId] = { ok: false, error: envError };
      continue;
    }

    const baseResult = rawPlatformResults[platformId] || {};
    let segments = Array.isArray(baseResult.segments)
      ? baseResult.segments.map((segment) => ({ ...segment }))
      : [];

    if (!segments.length && platformId === 'bluesky') {
      segments = thread.segments
        .filter((segment) => Boolean(segment.remoteId))
        .map((segment) => ({
          sequence: segment.sequence,
          status: 'sent',
          uri: segment.remoteId,
          postedAt: segment.postedAt ? new Date(segment.postedAt).toISOString() : null,
        }));
    }

    if (!segments.length) {
      summary[platformId] = { ok: false, error: 'Keine veröffentlichten Segmentdaten gefunden.' };
      continue;
    }

    const sentSegments = segments.filter((segment) => segment.status === 'sent' && (segment.uri || segment.statusId));
    if (!sentSegments.length) {
      summary[platformId] = { ok: false, error: 'Keine aktiven Segmente für das Löschen vorhanden.' };
      continue;
    }

    const perSegment = new Map();
    let platformSuccess = true;

    for (const segment of [...sentSegments].reverse()) {
      const identifiers = {
        uri: segment.uri || null,
        statusId: segment.statusId || (platformId === 'mastodon' ? extractMastodonStatusId(segment.uri) : null),
      };

      if (!identifiers.uri && !identifiers.statusId) {
        platformSuccess = false;
        perSegment.set(segment.sequence, { sequence: segment.sequence, ok: false, error: 'Keine Remote-ID gefunden.' });
        continue;
      }

      try {
        const result = await deletePost(platformId, identifiers, platformEnv);
        if (result.ok) {
          anySuccess = true;
          perSegment.set(segment.sequence, { sequence: segment.sequence, ok: true, identifiers });
          if (platformId === 'bluesky') {
            clearedBskySequences.add(segment.sequence);
          }
        } else {
          platformSuccess = false;
          perSegment.set(segment.sequence, { sequence: segment.sequence, ok: false, error: result.error || 'Unbekannter Fehler' });
        }
      } catch (error) {
        platformSuccess = false;
        perSegment.set(segment.sequence, { sequence: segment.sequence, ok: false, error: error?.message || String(error) });
      }
    }

    const updatedSegments = segments.map((segment) => {
      const outcome = perSegment.get(segment.sequence);
      if (outcome?.ok) {
        return markThreadSegmentAsDeleted(segment, outcome.identifiers);
      }
      return segment;
    });

    updatedPlatformResults[platformId] = {
      ...baseResult,
      status: platformSuccess ? 'deleted' : 'partial',
      deletedAt: platformSuccess ? new Date().toISOString() : baseResult.deletedAt ?? null,
      segments: updatedSegments,
    };

    summary[platformId] = {
      ok: platformSuccess,
      segments: Array.from(perSegment.values()).map(({ sequence, ok, error }) => ({ sequence, ok, error })),
    };
  }

  if (anySuccess) {
    const removalStamp = new Date().toISOString();
    metadata.platformResults = updatedPlatformResults;
    metadata.lastRemovalAt = removalStamp;

    await sequelize.transaction(async (transaction) => {
      await thread.update(
        {
          metadata,
          status: thread.status === 'deleted' ? thread.status : 'draft',
          scheduledAt: null,
        },
        { transaction }
      );

      if (clearedBskySequences.size > 0) {
        for (const segment of thread.segments) {
          if (clearedBskySequences.has(segment.sequence)) {
            await segment.update({ remoteId: null, postedAt: null }, { transaction });
          }
        }
      }
    });
  }

  const fresh = await Thread.findByPk(threadId, {
    include: [
      {
        model: ThreadSkeet,
        as: 'segments',
        order: [['sequence', 'ASC']],
        include: [{ model: SkeetReaction, as: 'reactions', separate: true, order: [['createdAt', 'DESC']] }],
      },
    ],
  });

  return {
    thread: fresh ? fresh.toJSON() : null,
    summary,
    success: anySuccess,
  };
}

async function restoreThread(id) {
  const threadId = Number(id);
  if (!Number.isInteger(threadId)) {
    throw new ValidationError("Ungültige Thread-ID.");
  }

  const thread = await Thread.findByPk(threadId);
  if (!thread) {
    const error = new Error("Thread nicht gefunden.");
    error.status = 404;
    throw error;
  }

  if (thread.status !== "deleted") {
    const error = new Error("Thread ist nicht gelöscht.");
    error.status = 400;
    throw error;
  }

  const metadata = thread.metadata && typeof thread.metadata === "object" && !Array.isArray(thread.metadata)
    ? { ...thread.metadata }
    : {};

  const previousStatus = metadata.deletedPreviousStatus && Thread.STATUS.includes(metadata.deletedPreviousStatus)
    ? metadata.deletedPreviousStatus
    : "draft";

  delete metadata.deletedPreviousStatus;
  delete metadata.deletedAt;

  await thread.update({ status: previousStatus, metadata });

  return thread.toJSON();
}

module.exports = {
  listThreads,
  getThread,
  createThread,
  updateThread,
  deleteThread,
  retractThread,
  restoreThread,
};

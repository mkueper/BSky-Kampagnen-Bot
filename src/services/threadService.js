const { ValidationError } = require("sequelize");
const { sequelize, Thread, ThreadSkeet, SkeetReaction } = require("../models");

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
        scheduledAt,
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
        scheduledAt: scheduledAt === undefined ? thread.scheduledAt : scheduledAt,
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
  restoreThread,
};

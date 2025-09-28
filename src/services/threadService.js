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

module.exports = {
  listThreads,
  getThread,
  createThread,
};

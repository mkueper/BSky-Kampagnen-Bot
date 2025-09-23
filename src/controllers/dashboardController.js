// src/controllers/dashboardController.js
/**
 * Sammlung der Express-Controller für das Dashboard.
 *
 * Die Methoden kapseln alle CRUD-Operationen rund um "Skeets" sowie
 * das Nachladen von Kennzahlen (Reaktionen) und Replies direkt aus Bluesky.
 * Dadurch bleibt server.js schlank und die Frontend-API konsistent.
 */
const { Skeet, Reply } = require("../models");
const { getReactions: getBlueskyReactions, getReplies } = require("../services/blueskyClient");
const { hasCredentials: hasMastodonCredentials, getStatus: getMastodonStatus } = require("../services/mastodonClient");

const ALLOWED_PLATFORMS = ["bluesky", "mastodon"];
const ALLOWED_REPEAT_VALUES = new Set(["none", "daily", "weekly", "monthly"]);

function normalizeImportedPlatforms(value) {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.filter((p) => ALLOWED_PLATFORMS.includes(p))));
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return Array.from(new Set(parsed.filter((p) => ALLOWED_PLATFORMS.includes(p))));
      }
    } catch (error) {
      console.warn("Fehler beim Parsen von targetPlatforms während des Imports:", error);
    }
  }

  return ["bluesky"];
}

function parseOptionalDate(value) {
  if (value == null || value === "") {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("scheduledAt ist kein gültiges Datum.");
  }
  return parsed;
}


function parsePlatformResults(raw) {
  if (!raw) return {};

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.error("Fehler beim Parsen von platformResults:", error);
      return {};
    }
  }

  if (typeof raw === "object" && !Array.isArray(raw)) {
    return { ...raw };
  }

  return {};
}

function extractMastodonStatusId(uri) {
  if (typeof uri !== "string" || uri.trim() === "") {
    return null;
  }

  try {
    const parsed = new URL(uri);
    const segments = parsed.pathname.split("/").filter(Boolean);
    return segments.pop() || null;
  } catch (error) {
    const fallbackSegments = uri.split("/").filter(Boolean);
    return fallbackSegments.pop() || null;
  }
}

function isAtUri(value) {
  if (typeof value !== "string") {
    return false;
  }
  return value.trim().startsWith("at://");
}

function findFirstAtUri(...candidates) {
  for (const candidate of candidates) {
    if (typeof candidate !== "string") {
      continue;
    }
    const trimmed = candidate.trim();
    if (isAtUri(trimmed)) {
      return trimmed;
    }
  }
  return null;
}

/**
 * Liefert alle gespeicherten Skeets sortiert nach geplanter Ausspielung
 * sowie Erstellungsdatum.
 *
 * GET /api/skeets
 */
async function getSkeets(req, res) {
  try {
    const skeets = await Skeet.findAll({
      order: [
        ["scheduledAt", "ASC"],
        ["createdAt", "DESC"],
      ],
    });
    res.json(skeets);
  } catch (error) {
    console.error("Fehler beim Laden der Skeets:", error);
    res.status(500).json({ error: "Fehler beim Laden der Skeets." });
  }
}

/**
 * Ruft Likes und Reposts direkt bei Bluesky ab und synchronisiert die
 * gespeicherten Zählerstände des Skeets.
 *
 * GET /api/reactions/:skeetId
 */
async function getReactionsController(req, res) {
  const { skeetId } = req.params;
  try {
    const skeet = await Skeet.findByPk(skeetId);
    if (!skeet) return res.status(404).json({ error: "Skeet nicht gefunden." });

    const platformResults = parsePlatformResults(skeet.platformResults);
    const nowIso = new Date().toISOString();
    const perPlatform = {};
    const errors = {};
    let totalLikes = 0;
    let totalReposts = 0;

    const normalizedPlatforms = Array.isArray(skeet.targetPlatforms)
      ? skeet.targetPlatforms.filter(Boolean)
      : [];

    const platformSet = new Set(normalizedPlatforms);
    Object.keys(platformResults).forEach((platformId) => {
      if (platformId) {
        platformSet.add(platformId);
      }
    });

    const blueskyEntry = platformResults.bluesky || {};
    const blueskyUri = findFirstAtUri(blueskyEntry.uri, blueskyEntry.raw?.uri, skeet.postUri);
    const blueskySent = blueskyEntry.status === "sent" || Boolean(blueskyUri);
    if (blueskySent && blueskyUri) {
      try {
        const reactions = await getBlueskyReactions(blueskyUri);
        const likes = Array.isArray(reactions.likes) ? reactions.likes.length : 0;
        const reposts = Array.isArray(reactions.reposts) ? reactions.reposts.length : 0;
        perPlatform.bluesky = { likes, reposts };
        totalLikes += likes;
        totalReposts += reposts;
        platformSet.add("bluesky");
        platformResults.bluesky = {
          ...blueskyEntry,
          metrics: perPlatform.bluesky,
          metricsUpdatedAt: nowIso,
        };
      } catch (error) {
        console.error("Fehler beim Laden der Bluesky-Reaktionen:", error);
        errors.bluesky = error?.message || "Fehler beim Laden der Bluesky-Reaktionen.";
      }
    } else if (blueskySent && !blueskyUri) {
      errors.bluesky = "Keine gültige Bluesky-URI für Reaktionen gefunden.";
    }

    const mastodonEntry = platformResults.mastodon || {};
    const mastodonConfigured = hasMastodonCredentials();
    const mastodonUrlCandidate =
      mastodonEntry.uri || mastodonEntry.raw?.url || mastodonEntry.raw?.uri || null;
    let mastodonStatusId = mastodonEntry.statusId || null;
    if (!mastodonStatusId && mastodonUrlCandidate) {
      mastodonStatusId = extractMastodonStatusId(mastodonUrlCandidate);
    }

    const shouldFetchMastodon = mastodonConfigured && (mastodonStatusId || mastodonUrlCandidate);
    if (shouldFetchMastodon) {
      if (mastodonStatusId) {
        try {
          const status = await getMastodonStatus(mastodonStatusId);
          const likes = Number(status?.favourites_count) || 0;
          const reposts = Number(status?.reblogs_count) || 0;
          perPlatform.mastodon = { likes, reposts };
          totalLikes += likes;
          totalReposts += reposts;
          platformSet.add("mastodon");
          platformResults.mastodon = {
            ...mastodonEntry,
            statusId: mastodonStatusId,
            uri: mastodonEntry.uri || status?.url || mastodonUrlCandidate || "",
            raw: mastodonEntry.raw || { url: status?.url, uri: status?.uri, id: status?.id },
            metrics: perPlatform.mastodon,
            metricsUpdatedAt: nowIso,
          };
        } catch (error) {
          console.error("Fehler beim Laden der Mastodon-Reaktionen:", error);
          errors.mastodon = error?.message || "Fehler beim Laden der Mastodon-Reaktionen.";
        }
      } else {
        errors.mastodon = "Konnte Mastodon-Status-ID nicht bestimmen.";
      }
    } else if ((mastodonEntry.uri || normalizedPlatforms.includes("mastodon")) && !mastodonConfigured) {
      errors.mastodon = "Mastodon-Zugangsdaten fehlen.";
    }

    const normalizedTargets = Array.from(platformSet);

    await skeet.update({
      likesCount: totalLikes,
      repostsCount: totalReposts,
      targetPlatforms: normalizedTargets.length > 0 ? normalizedTargets : ["bluesky"],
      platformResults,
    });

    const payload = {
      total: { likes: totalLikes, reposts: totalReposts },
      platforms: perPlatform,
    };

    if (Object.keys(errors).length > 0) {
      payload.errors = errors;
    }

    res.json(payload);
  } catch (error) {
    console.error("Fehler beim Laden der Reaktionen:", error);
    res.status(500).json({ error: "Fehler beim Laden der Reaktionen." });
  }
}

/**
 * Extrahiert alle Antworten eines Threads als flache Liste.
 *
 * Die Bluesky-API liefert für Threads verschachtelte Strukturen mit optionalen
 * Post-Daten. Die BFS-Suche stellt sicher, dass jede Antwort höchstens einmal
 * auftaucht und wir defensive Checks gegen fehlende Felder haben.
 */
function extractRepliesFromThread(thread) {
  if (!thread || typeof thread !== "object") return [];

  const queue = Array.isArray(thread.replies) ? [...thread.replies] : [];
  const collected = [];

  while (queue.length > 0) {
    const node = queue.shift();
    if (!node || typeof node !== "object") continue;

    if (Array.isArray(node.replies) && node.replies.length > 0) {
      queue.push(...node.replies);
    }

    const post = node.post;
    if (!post || typeof post !== "object") continue;

    const authorHandle = post.author?.handle;
    const content = post.record?.text ?? "";
    const indexedAt = post.indexedAt ?? post.record?.createdAt ?? new Date().toISOString();

    if (!authorHandle) {
      continue;
    }

    collected.push({
      authorHandle,
      content,
      indexedAt,
    });
  }

  return collected;
}

/**
 * Lädt Replies zu einem Skeet über Bluesky, speichert sie transactional und
 * liefert die Daten an das Dashboard zurück.
 *
 * GET /api/replies/:skeetId
 */
async function getRepliesController(req, res) {
  const { skeetId } = req.params;
  try {
    const skeet = await Skeet.findByPk(skeetId);
    if (!skeet) return res.status(404).json({ error: "Skeet nicht gefunden." });

    const platformResults = parsePlatformResults(skeet.platformResults);
    const blueskyEntry = platformResults.bluesky || {};
    const blueskyUri = findFirstAtUri(blueskyEntry.uri, blueskyEntry.raw?.uri, skeet.postUri);

    if (!isAtUri(blueskyUri || "")) {
      return res
        .status(400)
        .json({ error: "Für diesen Skeet liegt keine gültige Bluesky-URI vor." });
    }

    const repliesData = await getReplies(blueskyUri);
    const replies = extractRepliesFromThread(repliesData);

    // Atomar: alte Replies weg, neue speichern
    await Reply.sequelize.transaction(async (t) => {
      await Reply.destroy({ where: { skeetId: skeet.id }, transaction: t });
      if (replies.length > 0) {
        await Reply.bulkCreate(
          replies.map((r) => ({
            skeetId: skeet.id,
            authorHandle: r.authorHandle,
            content: r.content,
            createdAt: new Date(r.indexedAt), // überschreibt timestamps, ist ok
          })),
          { transaction: t }
        );
      }
    });

    res.json(replies);
  } catch (error) {
    console.error("Fehler beim Laden der Replies:", error);
    res.status(500).json({ error: "Fehler beim Laden der Replies." });
  }
}

/**
 * Legt einen neuen Skeet an.
 *
 * Enthält Validierung für Pflichtfelder, Plattform-Auswahl und Terminierung,
 * sodass inkonsistente Datensätze bereits an der API abgefangen werden.
 *
 * POST /api/skeets
 */
async function createSkeet(req, res) {
  try {
    const {
      content,
      scheduledAt,
      repeat = "none",
      repeatDayOfWeek = null,
      repeatDayOfMonth = null,
      threadId = null,
      isThreadPost = false,
      targetPlatforms = ["bluesky"],
    } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "content ist erforderlich." });
    }

    if (!Array.isArray(targetPlatforms) || targetPlatforms.length === 0) {
      return res
        .status(400)
        .json({ error: "targetPlatforms muss mindestens eine Plattform enthalten." });
    }

    const normalizedPlatforms = Array.from(new Set(targetPlatforms));

    const invalidPlatforms = normalizedPlatforms.filter((p) => !ALLOWED_PLATFORMS.includes(p));
    if (invalidPlatforms.length > 0) {
      return res
        .status(400)
        .json({ error: `Ungültige Plattform(en): ${invalidPlatforms.join(", ")}` });
    }

    // Datum nur prüfen, wenn es übergeben wurde
    let scheduled = null;
    if (scheduledAt != null) {
      scheduled = new Date(scheduledAt);
      if (isNaN(scheduled)) {
        return res.status(400).json({ error: "scheduledAt ist kein gültiges Datum." });
      }
    }

    const skeet = await Skeet.create({
      content: content.trim(),
      scheduledAt: scheduled, // darf null sein
      repeat,
      repeatDayOfWeek,
      repeatDayOfMonth,
      threadId,
      isThreadPost,
      targetPlatforms: normalizedPlatforms,
      platformResults: {},
    });

    res.status(201).json(skeet);
  } catch (err) {
    console.error("Fehler beim Anlegen des Skeets:", err);
    res.status(400).json({ error: err.message || "Fehler beim Anlegen des Skeets." });
  }
}

/**
 * Aktualisiert einen bestehenden Skeet.
 *
 * Bei Wechsel des Wiederholungsmusters werden abhängige Felder angepasst
 * (z. B. geplantes Datum oder Thread-Flags). Außerdem werden Plattformlisten
 * dedupliziert, um das Frontend konsistent zu halten.
 *
 * PATCH /api/skeets/:id
 */
async function updateSkeet(req, res) {
  const { id } = req.params;

  try {
    const skeet = await Skeet.findByPk(id);
    if (!skeet) {
      return res.status(404).json({ error: "Skeet nicht gefunden." });
    }

    const {
      content,
      scheduledAt,
      repeat = "none",
      repeatDayOfWeek = null,
      repeatDayOfMonth = null,
      threadId = null,
      isThreadPost = false,
      targetPlatforms = ["bluesky"],
    } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "content ist erforderlich." });
    }

    if (!Array.isArray(targetPlatforms) || targetPlatforms.length === 0) {
      return res
        .status(400)
        .json({ error: "targetPlatforms muss mindestens eine Plattform enthalten." });
    }

    const normalizedPlatforms = Array.from(new Set(targetPlatforms));
    const invalidPlatforms = normalizedPlatforms.filter((p) => !ALLOWED_PLATFORMS.includes(p));
    if (invalidPlatforms.length > 0) {
      return res
        .status(400)
        .json({ error: `Ungültige Plattform(en): ${invalidPlatforms.join(", ")}` });
    }

    let scheduled = skeet.scheduledAt;
    if (scheduledAt !== undefined) {
      if (scheduledAt === null || scheduledAt === "") {
        scheduled = null;
      } else {
        const parsed = new Date(scheduledAt);
        if (isNaN(parsed)) {
          return res.status(400).json({ error: "scheduledAt ist kein gültiges Datum." });
        }
        scheduled = parsed;
      }
    }

    if (repeat === "none") {
      if (!scheduled) {
        return res
          .status(400)
          .json({ error: "scheduledAt ist erforderlich, wenn repeat = 'none' ist." });
      }
    }

    let normalizedRepeatDayOfWeek = null;
    if (repeat === "weekly") {
      const value = Number(repeatDayOfWeek);
      if (!Number.isInteger(value) || value < 0 || value > 6) {
        return res
          .status(400)
          .json({ error: "repeatDayOfWeek muss zwischen 0 (Sonntag) und 6 liegen." });
      }
      normalizedRepeatDayOfWeek = value;
    }

    let normalizedRepeatDayOfMonth = null;
    if (repeat === "monthly") {
      const value = Number(repeatDayOfMonth);
      if (!Number.isInteger(value) || value < 1 || value > 31) {
        return res
          .status(400)
          .json({ error: "repeatDayOfMonth muss zwischen 1 und 31 liegen." });
      }
      normalizedRepeatDayOfMonth = value;
    }

    const updates = {
      content: content.trim(),
      repeat,
      repeatDayOfWeek: normalizedRepeatDayOfWeek,
      repeatDayOfMonth: normalizedRepeatDayOfMonth,
      threadId,
      isThreadPost,
      targetPlatforms: normalizedPlatforms,
      platformResults: {},
    };

    if (repeat === "none") {
      updates.scheduledAt = scheduled;
      updates.postUri = null;
      updates.postedAt = null;
    } else if (scheduled) {
      updates.scheduledAt = scheduled;
    }

    await skeet.update(updates);

    res.json(skeet);
  } catch (err) {
    console.error(`Fehler beim Aktualisieren des Skeets ${req.params.id}:`, err);
    res.status(400).json({ error: err.message || "Fehler beim Aktualisieren des Skeets." });
  }
}

/**
 * Entfernt einen Skeet endgültig.
 *
 * Verbundene Replies werden dank ON DELETE CASCADE vom Datenbank-Schema
 * automatisch mitgelöscht.
 *
 * DELETE /api/skeets/:id
 */
async function deleteSkeet(req, res) {
  const { id } = req.params;

  try {
    const skeet = await Skeet.findByPk(id);
    if (!skeet) {
      return res.status(404).json({ error: "Skeet nicht gefunden." });
    }

    await skeet.destroy();
    res.status(204).send();
  } catch (err) {
    console.error(`Fehler beim Löschen des Skeets ${req.params.id}:`, err);
    res.status(500).json({ error: "Fehler beim Löschen des Skeets." });
  }
}

async function exportPlannedSkeets(req, res) {
  try {
    const skeets = await Skeet.findAll({
      where: { postUri: null },
      order: [["scheduledAt", "ASC"], ["createdAt", "DESC"]],
    });

    const payload = {
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
          : ["bluesky"],
      })),
    };

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .replace("T", "_")
      .replace("Z", "");

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="skeets-${timestamp}.json"`
    );
    res.send(JSON.stringify(payload, null, 2));
  } catch (error) {
    console.error("Fehler beim Export der Skeets:", error);
    res.status(500).json({ error: "Fehler beim Export der Skeets." });
  }
}

async function importPlannedSkeets(req, res) {
  const body = req.body;
  const raw = Array.isArray(body?.skeets) ? body.skeets : Array.isArray(body) ? body : null;

  if (!Array.isArray(raw) || raw.length === 0) {
    return res
      .status(400)
      .json({ error: "Erwartet ein Array geplanter Skeets im JSON-Body." });
  }

  try {
    const entries = raw.map((item, index) => {
      if (!item || typeof item !== "object") {
        throw new Error(`Eintrag ${index + 1}: Ungültige Struktur.`);
      }

      const content = typeof item.content === "string" ? item.content.trim() : "";
      if (!content) {
        throw new Error(`Eintrag ${index + 1}: content ist erforderlich.`);
      }

      const repeat = typeof item.repeat === "string" ? item.repeat : "none";
      if (!ALLOWED_REPEAT_VALUES.has(repeat)) {
        throw new Error(`Eintrag ${index + 1}: Ungültiger repeat-Wert.`);
      }

      const scheduledAt = parseOptionalDate(item.scheduledAt);

      if (repeat === "none" && !scheduledAt) {
        throw new Error(
          `Eintrag ${index + 1}: scheduledAt ist erforderlich, wenn repeat = 'none' ist.`
        );
      }

      let repeatDayOfWeek = null;
      if (repeat === "weekly") {
        const value = Number(item.repeatDayOfWeek);
        if (!Number.isInteger(value) || value < 0 || value > 6) {
          throw new Error(
            `Eintrag ${index + 1}: repeatDayOfWeek muss zwischen 0 und 6 liegen.`
          );
        }
        repeatDayOfWeek = value;
      }

      let repeatDayOfMonth = null;
      if (repeat === "monthly") {
        const value = Number(item.repeatDayOfMonth);
        if (!Number.isInteger(value) || value < 1 || value > 31) {
          throw new Error(
            `Eintrag ${index + 1}: repeatDayOfMonth muss zwischen 1 und 31 liegen.`
          );
        }
        repeatDayOfMonth = value;
      }

      const targetPlatforms = normalizeImportedPlatforms(item.targetPlatforms);

      const threadId = item.threadId == null ? null : Number(item.threadId);
      if (threadId != null && !Number.isInteger(threadId)) {
        throw new Error(`Eintrag ${index + 1}: threadId muss eine ganze Zahl oder null sein.`);
      }

      return {
        content,
        scheduledAt,
        repeat,
        repeatDayOfWeek,
        repeatDayOfMonth,
        threadId,
        isThreadPost: Boolean(item.isThreadPost),
        targetPlatforms: targetPlatforms.length > 0 ? targetPlatforms : ["bluesky"],
        platformResults: {},
        postUri: null,
        postedAt: null,
        likesCount: 0,
        repostsCount: 0,
      };
    });

    const created = await Skeet.sequelize.transaction(async (transaction) => {
      return Skeet.bulkCreate(entries, { validate: true, transaction });
    });

    res.status(201).json({ imported: created.length, ids: created.map((entry) => entry.id) });
  } catch (error) {
    console.error("Fehler beim Import der Skeets:", error);
    res
      .status(400)
      .json({ error: error.message || "Fehler beim Import der Skeets." });
  }
}

module.exports = {
  getSkeets,
  createSkeet,
  updateSkeet,
  deleteSkeet,
  getReactions: getReactionsController,
  getReplies: getRepliesController,
  exportPlannedSkeets,
  importPlannedSkeets,
};

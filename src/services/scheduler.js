// src/services/scheduler.js
/**
 * Verantwortlich für das periodische Abholen und Ausspielen geplanter Skeets.
 *
 * Holt sich fällige Einträge aus der Datenbank, delegiert das Posting an das
 * Plattform-Registry und protokolliert Ergebnisse. Unterstützt einfache,
 * Wiederholungs- und Mehrplattform-Workflows.
 */
const cron = require("node-cron");
const { Op } = require("sequelize");
const config = require("../config");
const { Skeet } = require("../models");
const { env } = require("../env");
const { setupPlatforms } = require("../platforms/setup");
const { sendPost } = require("./postService");

const MAX_BATCH_SIZE = 10;
const RETRY_DELAY_MS = 60 * 1000;
let platformsReady = false;
let task = null;

/**
 * Registriert Plattformprofile lazy, damit Tests/CLI-Läufe ohne Scheduler
 * keine Netzwerk-Initialisierung benötigen.
 */
function ensurePlatforms() {
  if (!platformsReady) {
    setupPlatforms();
    platformsReady = true;
  }
}

/**
 * Normalisiert beliebige persistierte Plattformlisten (Array oder JSON-String)
 * zu einem eindeutigen Array.
 */
function normalizeTargetPlatforms(raw) {
  if (!raw) {
    return [];
  }

  if (Array.isArray(raw)) {
    return Array.from(new Set(raw));
  }

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? Array.from(new Set(parsed)) : [];
    } catch (error) {
      console.warn("❕ Konnte targetPlatforms nicht parsen:", error?.message || error);
      return [];
    }
  }

  return [];
}

/**
 * Stellt sicher, dass mindestens Bluesky angesprochen wird, wenn nichts
 * gespeichert wurde.
 */
function getTargetPlatforms(skeet) {
  const normalized = normalizeTargetPlatforms(skeet?.targetPlatforms);
  return normalized.length > 0 ? normalized : ["bluesky"];
}

/**
 * Mapped Plattform-IDs auf die passenden Credentials aus `env`.
 */
function resolvePlatformEnv(platformId) {
  switch (platformId) {
    case "bluesky":
      return env.bluesky;
    case "mastodon":
      return env.mastodon;
    default:
      return null;
  }
}

/**
 * Prüft, ob notwendige Secrets für die Plattform vorhanden sind.
 */
function validatePlatformEnv(platformId, platformEnv) {
  if (platformId === "bluesky") {
    if (!platformEnv?.identifier || !platformEnv?.appPassword) {
      return "Bluesky-Credentials fehlen.";
    }
  }

  if (platformId === "mastodon") {
    if (!platformEnv?.apiUrl || !platformEnv?.accessToken) {
      return "Mastodon-Credentials fehlen.";
    }
  }

  return null;
}

/**
 * Hilfsmethoden: behalten Uhrzeitbestandteile beim Verschieben bei.
 */
function addDaysKeepingTime(date, days) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/**
 * Berechnet den nächsten Wochentermin für ein wiederkehrendes Posting.
 */
function computeNextWeekly(base, targetDay) {
  const next = new Date(base.getTime());
  const desired = typeof targetDay === "number" ? targetDay : next.getUTCDay();
  const current = next.getUTCDay();
  let delta = (desired - current + 7) % 7;
  if (delta === 0) {
    delta = 7;
  }
  next.setUTCDate(next.getUTCDate() + delta);
  return next;
}

/**
 * Liefert die Anzahl der Tage im gewünschten Monat (UTC-sicher).
 */
function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/**
 * Verschiebt den Termin um exakt einen Monat und fixiert den gewünschten Tag.
 */
function computeNextMonthly(base, targetDay) {
  const next = new Date(base.getTime());
  const desiredDay = typeof targetDay === "number" ? targetDay : next.getUTCDate();
  next.setUTCMonth(next.getUTCMonth() + 1, 1);
  const maxDay = daysInMonth(next.getUTCFullYear(), next.getUTCMonth());
  next.setUTCDate(Math.min(desiredDay, maxDay));
  return next;
}

/**
 * Liefert das nächste Ausführungsdatum für Wiederholungs-Skeets.
 */
function calculateNextScheduledAt(skeet) {
  if (!skeet.repeat || skeet.repeat === "none") {
    return null;
  }

  const reference = skeet.scheduledAt ? new Date(skeet.scheduledAt) : new Date();

  switch (skeet.repeat) {
    case "daily":
      return addDaysKeepingTime(reference, 1);
    case "weekly":
      return computeNextWeekly(reference, skeet.repeatDayOfWeek);
    case "monthly":
      return computeNextMonthly(reference, skeet.repeatDayOfMonth);
    default:
      return null;
  }
}

/**
 * Sorgt dafür, dass `platformResults` als bearbeitbares Objekt vorliegt.
 */
function ensureResultsObject(raw) {
  if (!raw) {
    return {};
  }

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.error("❌ Konnte platformResults nicht parsen:", error?.message || error);
      return {};
    }
  }

  if (typeof raw === "object" && !Array.isArray(raw)) {
    return { ...raw };
  }

  return {};
}

/**
 * Kümmert sich um das eigentliche Versenden eines Skeets auf alle Zielplattformen.
 *
 * Aktualisiert den Datensatz mit Statusinformationen und steuert das
 * Wiederholungsverhalten.
 */
async function dispatchSkeet(skeet) {
  ensurePlatforms();

  const targetPlatforms = getTargetPlatforms(skeet);
  const normalizedPlatforms = Array.from(new Set(targetPlatforms));
  const results = ensureResultsObject(skeet.platformResults);
  const successOrder = [];

  for (const platformId of targetPlatforms) {
    if (skeet.repeat === "none" && results[platformId]?.status === "sent") {
      continue;
    }

    const platformEnv = resolvePlatformEnv(platformId);
    const envError = validatePlatformEnv(platformId, platformEnv);
    if (envError) {
      results[platformId] = {
        status: "failed",
        error: envError,
        failedAt: new Date().toISOString(),
      };
      console.error(`❌ ${envError}`);
      continue;
    }

    try {
      const result = await sendPost({ content: skeet.content }, platformId, platformEnv);
      const postedAt = result?.postedAt ? new Date(result.postedAt) : new Date();
      results[platformId] = {
        status: "sent",
        uri: result?.uri ?? "",
        postedAt: postedAt.toISOString(),
      };
      successOrder.push({ platformId, uri: result?.uri ?? "", postedAt });
      console.log(`✅ Skeet ${skeet.id} auf ${platformId} veröffentlicht (${result?.uri ?? "ohne URI"})`);
    } catch (error) {
      results[platformId] = {
        status: "failed",
        error: error?.message || String(error),
        failedAt: new Date().toISOString(),
      };
      console.error(`❌ Fehler beim Senden von Skeet ${skeet.id} auf ${platformId}:`, error?.message || error);
    }
  }

  const allSent = normalizedPlatforms.every((platformId) => results[platformId]?.status === "sent");
  const nextRun = calculateNextScheduledAt(skeet);

  const updates = {
    platformResults: results,
    targetPlatforms: normalizedPlatforms.length > 0 ? normalizedPlatforms : ["bluesky"],
  };

  if (successOrder.length > 0) {
    const primary =
      successOrder.find((entry) => entry.platformId === "bluesky") ?? successOrder[0];
    if (primary) {
      if (skeet.repeat === "none") {
        if (allSent) {
          updates.postUri = primary.uri;
          updates.postedAt = primary.postedAt;
        }
      } else {
        updates.postUri = primary.uri;
        updates.postedAt = primary.postedAt;
      }
    }
  }

  if (skeet.repeat === "none") {
    if (allSent) {
      updates.scheduledAt = null;
    } else {
      updates.scheduledAt = new Date(Date.now() + RETRY_DELAY_MS);
    }
  } else {
    updates.scheduledAt = nextRun ?? new Date(Date.now() + RETRY_DELAY_MS);
  }

  await skeet.update(updates);
}

/**
 * Holt fällige Skeets aus der Datenbank und versucht, sie zu versenden.
 */
async function processDueSkeets(now = new Date()) {
  const dueSkeets = await Skeet.findAll({
    where: {
      scheduledAt: { [Op.ne]: null, [Op.lte]: now },
      isThreadPost: false,
      [Op.or]: [
        { repeat: "none", postUri: null },
        { repeat: { [Op.ne]: "none" } },
      ],
    },
    order: [["scheduledAt", "ASC"]],
    limit: MAX_BATCH_SIZE,
  });

  for (const skeet of dueSkeets) {
    try {
      await dispatchSkeet(skeet);
    } catch (error) {
      console.error(`❌ Fehler beim Senden von Skeet ${skeet.id}:`, error?.message || error);
    }
  }
}

/**
 * Initialisiert und startet den Cron-Scheduler.
 */
function startScheduler() {
  const schedule = config.SCHEDULE_TIME;

  if (!cron.validate(schedule)) {
    throw new Error(`Ungültiger Cron-Ausdruck für SCHEDULE_TIME: "${schedule}"`);
  }

  if (task) {
    task.stop();
  }

  task = cron.schedule(
    schedule,
    () => {
      processDueSkeets().catch((error) => {
        console.error("❌ Scheduler-Lauf fehlgeschlagen:", error?.message || error);
      });
    },
    { timezone: config.TIME_ZONE }
  );

  console.log(
    `🕑 Scheduler aktiv – Cron: ${schedule} (Zeitzone: ${config.TIME_ZONE || "system"})`
  );

  processDueSkeets().catch((error) => {
    console.error("❌ Initialer Scheduler-Lauf fehlgeschlagen:", error?.message || error);
  });

  return task;
}

module.exports = {
  startScheduler,
  processDueSkeets,
};

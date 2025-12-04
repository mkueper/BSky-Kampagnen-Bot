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
const config = require("@config");
const { Skeet, Thread, ThreadSkeet, PostSendLog } = require("@data/models");
const { sendPost } = require("./postService");
const events = require("./events");
const settingsService = require("./settingsService");
const { ensurePlatforms, resolvePlatformEnv, validatePlatformEnv } = require("./platformContext");
const { refreshPublishedThreadsBatch } = require("./threadEngagementService");
const presence = require("./presenceService");
const { createLogger } = require("@utils/logging");
const log = createLogger('scheduler');

const MAX_BATCH_SIZE = 10;
const RETRY_DELAY_MS = 60 * 1000;
let task = null;
//let lastScheduleConfig = null;
let lastEngagementRunAt = 0;
const GRACE_WINDOW_MINUTES = Number(config.SCHEDULER_GRACE_WINDOW_MINUTES || 10);
const MAX_ERROR_MESSAGE_LENGTH = 500;

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
      log.warn("Konnte targetPlatforms nicht parsen", { error: error?.message || String(error) });
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

async function logPostSendAttempt({
  skeetId,
  platform,
  status,
  postedAt,
  postUri = null,
  errorCode = null,
  errorMessage = null,
}) {
  try {
    const attemptCount = await PostSendLog.count({ where: { skeetId } });
    await PostSendLog.create({
      skeetId,
      platform,
      status,
      postedAt,
      postUri: postUri || null,
      errorCode: errorCode || null,
      errorMessage: errorMessage
        ? String(errorMessage).slice(0, MAX_ERROR_MESSAGE_LENGTH)
        : null,
      attempt: attemptCount + 1,
    });
  } catch (error) {
    log.warn("Konnte PostSendLog nicht speichern", {
      error: error?.message || String(error),
    });
  }
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
 * Normalisiert die konfigurierten Wochentage eines Skeets zu einem
 * eindeutigen Array von Zahlen (0–6). Fällt auf repeatDayOfWeek zurück,
 * wenn keine Liste gepflegt ist.
 */
function normalizeWeeklyDays(skeet) {
  if (!skeet) return [];

  const raw = skeet.repeatDaysOfWeek;
  let days = [];

  if (Array.isArray(raw)) {
    days = raw;
  } else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        days = parsed;
      }
    } catch {
      // Ignorieren – fällt weiter unten auf repeatDayOfWeek zurück
    }
  }

  const normalized = Array.from(
    new Set(
      days
        .map((v) => Number(v))
        .filter((v) => Number.isInteger(v) && v >= 0 && v <= 6)
    )
  );

  if (normalized.length > 0) {
    return normalized;
  }

  const single =
    skeet.repeatDayOfWeek != null ? Number(skeet.repeatDayOfWeek) : null;
  if (Number.isInteger(single) && single >= 0 && single <= 6) {
    return [single];
  }

  return [];
}

/**
 * Berechnet den nächsten Wochentermin für ein wiederkehrendes Posting.
 */
function computeNextWeekly(base, skeetOrTargetDay) {
  const next = new Date(base.getTime());
  const current = next.getUTCDay();

  let days;
  if (typeof skeetOrTargetDay === "number") {
    const d = Number(skeetOrTargetDay);
    days = Number.isInteger(d) ? [((d % 7) + 7) % 7] : [];
  } else if (skeetOrTargetDay && typeof skeetOrTargetDay === "object") {
    days = normalizeWeeklyDays(skeetOrTargetDay);
  } else {
    days = [];
  }

  if (!Array.isArray(days) || days.length === 0) {
    // Fallback: eine Woche nach dem aktuellen Wochentag
    next.setUTCDate(next.getUTCDate() + 7);
    return next;
  }

  let bestDelta = null;
  for (const day of days) {
    let delta = (day - current + 7) % 7;
    if (delta === 0) {
      delta = 7;
    }
    if (bestDelta === null || delta < bestDelta) {
      bestDelta = delta;
    }
  }

  next.setUTCDate(next.getUTCDate() + bestDelta);
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
      return computeNextWeekly(reference, skeet);
    case "monthly":
      return computeNextMonthly(reference, skeet.repeatDayOfMonth);
    default:
      return null;
  }
}

/**
 * Berechnet den nächsten Wiederholungstermin nach einem frei wählbaren
 * Bezugszeitpunkt. Nutzt den ursprünglich geplanten `scheduledAt`‑Wert als
 * Startpunkt und iteriert so lange vorwärts, bis ein Termin in der Zukunft
 * (>= fromDate) gefunden wurde.
 *
 * Wird u. a. von der Pending‑API genutzt, um für wiederkehrende Skeets nach
 * manuellem Eingreifen den nächsten regulären Slot zu bestimmen.
 *
 * @param {object} skeet
 * @param {Date} [fromDate=new Date()]
 * @returns {Date|null}
 */
function getNextScheduledAt(skeet, fromDate = new Date()) {
  // TODO: Für einfache Muster (insb. repeat === "daily") könnten wir den
  // nächsten Termin ohne Iteration in O(1) berechnen (z. B. via
  // Differenz in Tagen ab scheduledAt/fromDate), um die Schleife weiter
  // zu vereinfachen. Die aktuelle Iteration ist auf 366 Schritte begrenzt
  // und funktional korrekt, aber nicht optimal.
  if (!skeet || !skeet.repeat || skeet.repeat === "none") {
    return null;
  }

  const from =
    fromDate instanceof Date ? new Date(fromDate.getTime()) : new Date(fromDate);
  if (Number.isNaN(from.getTime())) {
    return null;
  }

  const baseRaw = skeet.scheduledAt || from;
  const base =
    baseRaw instanceof Date ? new Date(baseRaw.getTime()) : new Date(baseRaw);
  if (Number.isNaN(base.getTime())) {
    return null;
  }

  let current = base;
  let next = null;
  // Sicherheitsgrenze gegen Endlosschleifen (z. B. fehlerhafte Konfiguration)
  let safety = 366;

  while (safety > 0) {
    safety -= 1;

    switch (skeet.repeat) {
      case "daily":
        next = addDaysKeepingTime(current, 1);
        break;
      case "weekly":
        next = computeNextWeekly(current, skeet);
        break;
      case "monthly":
        next = computeNextMonthly(current, skeet.repeatDayOfMonth);
        break;
      default:
        return null;
    }

    if (!next || Number.isNaN(next.getTime())) {
      return null;
    }

    if (next > from) {
      return next;
    }

    current = next;
  }

  return null;
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
      log.error("Konnte platformResults nicht parsen", { error: error?.message || String(error) });
      return {};
    }
  }

  if (typeof raw === "object" && !Array.isArray(raw)) {
    return { ...raw };
  }

  return {};
}

/**
 * Markiert überfällige Skeets beim Start als "pending_manual", damit sie
 * nicht automatisch nachgeholt werden.
 */
async function markMissedSkeetsPending(now = new Date()) {
  const minutes = Number.isFinite(GRACE_WINDOW_MINUTES) && GRACE_WINDOW_MINUTES >= 0
    ? GRACE_WINDOW_MINUTES
    : 10;
  const cutoff = new Date(now.getTime() - minutes * 60 * 1000);

  try {
    const overdue = await Skeet.findAll({
      attributes: ["id"],
      where: {
        status: "scheduled",
        isThreadPost: false,
        scheduledAt: { [Op.lt]: cutoff },
      },
    });

    if (!overdue.length) {
      log.info("Scheduler-Startup: keine überfälligen Skeets gefunden", {
        cutoff: cutoff.toISOString(),
        graceMinutes: minutes,
      });
      return;
    }

    const ids = overdue.map((s) => s.id);
    await Skeet.update(
      { status: "pending_manual", pendingReason: "missed_while_offline" },
      { where: { id: { [Op.in]: ids } } }
    );

    log.info("Scheduler-Startup: Skeets in pending_manual verschoben", {
      count: ids.length,
      cutoff: cutoff.toISOString(),
      graceMinutes: minutes,
    });
    log.debug("Scheduler-Startup: IDs in pending_manual", { ids });
  } catch (error) {
    log.error("Fehler beim Markieren überfälliger Skeets als pending_manual", {
      error: error?.message || String(error),
    });
  }
}

/**
 * Kümmert sich um das eigentliche Versenden eines Skeets auf alle Zielplattformen.
 *
 * Aktualisiert den Datensatz mit Statusinformationen und steuert das
 * Wiederholungsverhalten.
 */
async function dispatchSkeet(skeet) {
  ensurePlatforms();

  const current = await Skeet.findByPk(skeet.id);
  if (!current) {
    log.info(`Skeet ${skeet.id} wurde inzwischen gelöscht – überspringe Versand.`);
    return;
  }

  if (!current.scheduledAt || current.scheduledAt > new Date()) {
    return;
  }

  if (current.repeat === "none" && current.postUri) {
    return;
  }

  const targetPlatforms = getTargetPlatforms(current);
  const normalizedPlatforms = Array.from(new Set(targetPlatforms));
  const results = ensureResultsObject(current.platformResults);
  const successOrder = [];

  for (const platformId of targetPlatforms) {
    if (current.repeat === "none" && results[platformId]?.status === "sent") {
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
      log.error(envError);
      await logPostSendAttempt({
        skeetId: current.id,
        platform: platformId,
        status: "skipped",
        postedAt: new Date(),
        postUri: null,
        errorMessage: envError,
      });
      continue;
    }

    try {
      // Medien laden (falls vorhanden)
      const { SkeetMedia } = require('../../data/models');
      const mediaRows = await SkeetMedia.findAll({ where: { skeetId: current.id }, order: [["order","ASC"],["id","ASC"]] });
      const media = mediaRows.slice(0, 4).map((m) => ({ path: m.path, mime: m.mime, altText: m.altText || '' }));
      const res = await sendPost({ content: current.content, media }, platformId, platformEnv);

      if (res.ok) {
        const postedAt = res.postedAt ? new Date(res.postedAt) : new Date();
        const resultEntry = {
          status: "sent",
          uri: res.uri || "",
          postedAt: postedAt.toISOString(),
          attempts: res.attempts || 1,
        };

        if (res.statusId) {
          resultEntry.statusId = String(res.statusId);
        }

        if (res.raw) {
          resultEntry.raw = res.raw;
        }

        results[platformId] = resultEntry;
        successOrder.push({ platformId, uri: res.uri || "", postedAt });
        log.info("Skeet veröffentlicht", { id: current.id, platform: platformId, uri: res.uri || "" });
        await logPostSendAttempt({
          skeetId: current.id,
          platform: platformId,
          status: "success",
          postedAt,
          postUri: res.uri || null,
          errorCode: null,
          errorMessage: null,
        });
      } else {
        const errorMessage = res.error || "Unbekannter Fehler";
        const failedAt = new Date();
        results[platformId] = {
          status: "failed",
          error: errorMessage,
          failedAt: failedAt.toISOString(),
          attempts: res.attempts || 1,
        };
        log.error("Fehler beim Senden eines Skeets", { id: current.id, platform: platformId, error: errorMessage });
        await logPostSendAttempt({
          skeetId: current.id,
          platform: platformId,
          status: "failed",
          postedAt: failedAt,
          postUri: null,
          errorCode: null,
          errorMessage,
        });
      }
    } catch (unexpected) {
      const failedAt = new Date();
      const errorMessage = unexpected?.message || String(unexpected);
      results[platformId] = {
        status: "failed",
        error: errorMessage,
        failedAt: failedAt.toISOString(),
      };
      log.error("Unerwarteter Fehler beim Senden eines Skeets", { id: current.id, platform: platformId, error: errorMessage });
      await logPostSendAttempt({
        skeetId: current.id,
        platform: platformId,
        status: "failed",
        postedAt: failedAt,
        postUri: null,
        errorCode: unexpected?.code ? String(unexpected.code) : null,
        errorMessage,
      });
    }
  }

  const allSent = normalizedPlatforms.every((platformId) => results[platformId]?.status === "sent");
  const nextRun = calculateNextScheduledAt(current);

  const updates = {
    platformResults: results,
    targetPlatforms: normalizedPlatforms.length > 0 ? normalizedPlatforms : ["bluesky"],
  };

  if (successOrder.length > 0) {
    const primary = successOrder.find((entry) => entry.platformId === "bluesky") ?? successOrder[0];
    if (primary) {
      if (current.repeat === "none") {
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

  if (current.repeat === "none") {
    if (allSent) {
      updates.scheduledAt = null;
      updates.status = "sent";
      updates.pendingReason = null;
    } else {
      updates.scheduledAt = new Date(Date.now() + RETRY_DELAY_MS);
    }
  } else {
    // Wiederkehrende Skeets bleiben im Status "scheduled"
    if (current.status !== "scheduled") {
      updates.status = "scheduled";
    }
    if (allSent) {
      updates.pendingReason = null;
    }
    updates.scheduledAt = nextRun ?? new Date(Date.now() + RETRY_DELAY_MS);
  }

  await current.update(updates);
  try {
    // UI informieren (Statuswechsel von geplant -> veröffentlicht/verschoben)
    const status = current.repeat === 'none'
      ? (allSent ? 'published' : 'scheduled')
      : 'scheduled';
    events.emit('skeet:updated', { id: current.id, status });
  } catch { /* ignore SSE emit error */ }
}

/**
 * Holt fällige Skeets aus der Datenbank und versucht, sie zu versenden.
 */
async function processDueSkeets(now = new Date()) {
  const discardMode = Boolean(config.DISCARD_MODE);

  // console.log("[Scheduler] Tick @", now.toISOString());
  
  const dueSkeets = await Skeet.findAll({
    where: {
      status: "scheduled",
      scheduledAt: { [Op.ne]: null, [Op.lte]: now },
      isThreadPost: false,
      [Op.or]: [{ repeat: "none", postUri: null }, { repeat: { [Op.ne]: "none" } }],
    },
    order: [["scheduledAt", "ASC"]],
    limit: MAX_BATCH_SIZE,
  });

  // console.log(
  //   "[Scheduler] Tick – fällige Skeets:",
  //   dueSkeets.map((s) => ({
  //     id: s.id,
  //     repeat: s.repeat,
  //     status: s.status,
  //     scheduledAt: s.scheduledAt,
  //     pendingReason: s.pendingReason,
  //   }))
  // );

  for (const skeet of dueSkeets) {
    try {
      if (discardMode) {
        // Demo: Nicht senden, sondern als "veröffentlicht" markieren
        const current = await Skeet.findByPk(skeet.id);
        if (current) {
          const targetPlatforms = getTargetPlatforms(current);
          const normalizedPlatforms = Array.from(new Set(targetPlatforms));
          const now = new Date();
          const nowIso = now.toISOString();

          const results = {};
          for (const platformId of normalizedPlatforms) {
            results[platformId] = {
              status: "sent",
              uri: "",
              postedAt: nowIso,
              attempts: 0,
              demo: true,
            };
          }

          const primaryPlatform = normalizedPlatforms.includes("bluesky")
            ? "bluesky"
            : normalizedPlatforms[0] || "bluesky";
          const fakeUri = `demo://${primaryPlatform}/skeet/${current.id}`;

          const updates = {
            platformResults: results,
            targetPlatforms: normalizedPlatforms.length > 0 ? normalizedPlatforms : ["bluesky"],
            postUri: fakeUri,
            postedAt: now,
          };

          if (current.repeat === "none") {
            updates.scheduledAt = null;
            updates.status = "sent";
            updates.pendingReason = null;
          } else {
            const nextRun = calculateNextScheduledAt(current);
            updates.scheduledAt = nextRun ?? null;
            if (current.status !== "scheduled") {
              updates.status = "scheduled";
            }
          }

          await current.update(updates);
          try { events.emit('skeet:updated', { id: current.id, status: 'published' }); } catch { /* ignore SSE emit error */ }
          log.info("Discard-Mode: Skeet als veröffentlicht markiert (Demo)", { id: current.id });
        }
        continue;
      }
      await dispatchSkeet(skeet);
    } catch (error) {
      log.error("Fehler beim Senden eines Skeets", { id: skeet.id, error: error?.message || String(error) });
    }
  }
}

function ensureMetadataObject(raw) {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) || {};
    } catch (error) {
      log.warn("Konnte Thread-Metadaten nicht parsen", { error: error?.message || String(error) });
      return {};
    }
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return { ...raw };
  }
  return {};
}

async function dispatchThread(thread) {
  ensurePlatforms();

  const { ThreadSkeetMedia } = require('../../data/models');
  const current = await Thread.findByPk(thread.id, {
    include: [{ model: ThreadSkeet, as: "segments", order: [["sequence", "ASC"]], include: [{ model: ThreadSkeetMedia, as: 'media', separate: true, order: [["order","ASC"],["id","ASC"]] }] }],
  });

  if (!current) {
    log.info(`Thread ${thread.id} wurde inzwischen entfernt – überspringe Versand.`);
    return;
  }

  if (!current.scheduledAt || new Date(current.scheduledAt) > new Date()) {
    return;
  }

  if (!Array.isArray(current.segments) || current.segments.length === 0) {
    log.warn("Thread besitzt keine Segmente – überspringe", { id: current.id });
    await current.update({ status: "failed", metadata: { ...(ensureMetadataObject(current.metadata)), lastError: "Keine Segmente" } });
    return;
  }

  const targetPlatforms = getTargetPlatforms(current);
  const normalizedPlatforms = Array.from(new Set(targetPlatforms));
  if (!normalizedPlatforms.length) {
    log.warn("Thread hat keine Zielplattformen – markiere als fehlgeschlagen", { id: current.id });
    const metadata = ensureMetadataObject(current.metadata);
    metadata.lastError = "Keine Zielplattformen";
    await current.update({ status: "failed", metadata });
    return;
  }

  await current.update({ status: "publishing" });

  const metadata = ensureMetadataObject(current.metadata);
  const platformResults = typeof metadata.platformResults === "object" && !Array.isArray(metadata.platformResults)
    ? { ...metadata.platformResults }
    : {};

  const segmentPrimaryInfo = new Array(current.segments.length).fill(null);
  const platformThreadState = {};
  let overallSuccess = true;

  for (const platformId of normalizedPlatforms) {
    const platformEnv = resolvePlatformEnv(platformId);
    const envError = validatePlatformEnv(platformId, platformEnv);
    if (envError) {
      platformResults[platformId] = {
        status: "failed",
        error: envError,
        failedAt: new Date().toISOString(),
      };
      overallSuccess = false;
      log.error(envError);
      continue;
    }

    const segmentResults = [];
    let platformSuccess = true;
    let threadState = platformThreadState[platformId] || null;

    for (let index = 0; index < current.segments.length; index += 1) {
      const segment = current.segments[index];
      const postInput = { content: segment.content };
      if (Array.isArray(segment.media) && segment.media.length > 0) {
        postInput.media = segment.media.slice(0, 4).map((m) => ({ path: m.path, mime: m.mime, altText: m.altText || '' }));
      }

      if (threadState) {
        postInput.reply = {
          root: threadState.root,
          parent: threadState.parent,
        };
      }

      try {
        const res = await sendPost(postInput, platformId, platformEnv);

        if (res.ok) {
          const postedAt = res.postedAt ? new Date(res.postedAt) : new Date();
          segmentResults.push({
            sequence: segment.sequence,
            status: "sent",
            uri: res.uri || "",
            statusId: res.statusId || null,
            postedAt: postedAt.toISOString(),
          });

          const meta = {
            uri: res.uri || "",
            cid: res.cid || null,
            statusId: res.statusId || null,
            postedAt,
          };

          if (!threadState) {
            threadState = {
              root: { uri: meta.uri, cid: meta.cid, statusId: meta.statusId },
              parent: { uri: meta.uri, cid: meta.cid, statusId: meta.statusId },
            };
          } else {
            threadState = {
              root: threadState.root,
              parent: { uri: meta.uri, cid: meta.cid, statusId: meta.statusId },
            };
          }

          platformThreadState[platformId] = threadState;

          if (
            !segmentPrimaryInfo[index] ||
            segmentPrimaryInfo[index].platformId !== "bluesky" ||
            platformId === "bluesky"
          ) {
            segmentPrimaryInfo[index] = {
              platformId,
              uri: meta.uri,
              postedAt,
            };
          }
        } else {
          platformSuccess = false;
          segmentResults.push({
            sequence: segment.sequence,
            status: "failed",
            error: res.error || "Unbekannter Fehler",
            failedAt: new Date().toISOString(),
          });
          log.error("Fehler beim Senden eines Thread-Segments", { id: current.id, seq: segment.sequence, platform: platformId, error: res.error || "Unbekannter Fehler" });
          break;
        }
      } catch (unexpected) {
        platformSuccess = false;
        segmentResults.push({
          sequence: segment.sequence,
          status: "failed",
          error: unexpected?.message || String(unexpected),
          failedAt: new Date().toISOString(),
        });
        log.error("Unerwarteter Fehler beim Senden eines Thread-Segments", { id: current.id, seq: segment.sequence, platform: platformId, error: unexpected?.message || String(unexpected) });
        break;
      }
    }

    platformResults[platformId] = {
      status: platformSuccess ? "sent" : "failed",
      segments: segmentResults,
      completedAt: new Date().toISOString(),
    };

    if (!platformSuccess) {
      overallSuccess = false;
    }
  }

  for (let index = 0; index < current.segments.length; index += 1) {
    const info = segmentPrimaryInfo[index];
    const segment = current.segments[index];
    if (info) {
      await segment.update({
        remoteId: info.uri,
        postedAt: info.postedAt,
      });
    }
  }

  metadata.platformResults = platformResults;
  metadata.lastDispatchAt = new Date().toISOString();

  const updatePayload = {
    metadata,
    targetPlatforms: normalizedPlatforms,
    scheduledAt: null,
  };

  if (overallSuccess) {
    updatePayload.status = "published";
    metadata.lastSuccessAt = new Date().toISOString();
  } else {
    updatePayload.status = "failed";
    metadata.lastError = metadata.lastError || "Fehler beim Versenden";
  }

  await current.update(updatePayload);
  try {
    events.emit('thread:updated', { id: current.id, status: updatePayload.status || current.status || 'published' });
  } catch { /* ignore SSE emit error */ }
}

async function processDueThreads(now = new Date()) {
  const discardMode = Boolean(config.DISCARD_MODE);

  const dueThreads = await Thread.findAll({
    where: {
      scheduledAt: { [Op.ne]: null, [Op.lte]: now },
      status: "scheduled",
    },
    order: [["scheduledAt", "ASC"]],
    limit: MAX_BATCH_SIZE,
  });

  for (const thread of dueThreads) {
    try {
      if (discardMode) {
        const { ThreadSkeetMedia } = require('../../data/models');
        const current = await Thread.findByPk(thread.id, {
          include: [{ model: ThreadSkeet, as: "segments", order: [["sequence", "ASC"]], include: [{ model: ThreadSkeetMedia, as: 'media', separate: true, order: [["order","ASC"],["id","ASC"]] }] }],
        });
        if (current) {
          const targetPlatforms = getTargetPlatforms(current);
          const normalizedPlatforms = Array.from(new Set(targetPlatforms));
          const now = new Date();
          const nowIso = now.toISOString();

          const metadata = ensureMetadataObject(current.metadata);
          const platformResults = {};

          for (const platformId of normalizedPlatforms) {
            const segmentResults = [];
            for (const segment of current.segments || []) {
              segmentResults.push({
                sequence: segment.sequence,
                status: "sent",
                uri: "",
                postedAt: nowIso,
                demo: true,
              });
            }
            platformResults[platformId] = {
              status: "sent",
              segments: segmentResults,
              completedAt: nowIso,
            };
          }

          // Segmente mit Dummy-RemoteId/postedAt versehen
          if (Array.isArray(current.segments)) {
            for (const segment of current.segments) {
              await segment.update({ remoteId: `demo://thread/${current.id}/seg/${segment.sequence}`, postedAt: now });
            }
          }

          metadata.platformResults = platformResults;
          metadata.lastDispatchAt = nowIso;
          metadata.lastSuccessAt = nowIso;

          await current.update({
            metadata,
            targetPlatforms: normalizedPlatforms,
            scheduledAt: null,
            status: "published",
          });
          try { events.emit('thread:updated', { id: current.id, status: 'published' }); } catch { /* ignore SSE emit error */ }

          log.info("Discard-Mode: Thread als veröffentlicht markiert (Demo)", { id: current.id });
        }
        continue;
      }
      await dispatchThread(thread);
    } catch (error) {
      log.error("Fehler beim Senden eines Threads", { id: thread.id, error: error?.message || String(error) });
    }
  }
}

/**
 * Initialisiert oder aktualisiert den Cron-Scheduler basierend auf gespeicherten Settings.
 */
async function applySchedulerTask() {
  const { values } = await settingsService.getSchedulerSettings();
  const schedule = values.scheduleTime || config.SCHEDULE_TIME;
  const timeZone = values.timeZone || config.TIME_ZONE;

  if (!cron.validate(schedule)) {
    throw new Error(`Ungültiger Cron-Ausdruck für den Scheduler: "${schedule}"`);
  }

  if (task) {
    task.stop();
  }

  task = cron.schedule(
    schedule,
    () => {
      processDueSkeets().catch((error) => {
        log.error("Scheduler-Lauf (Skeets) fehlgeschlagen", { error: error?.message || String(error) });
      });
      processDueThreads().catch((error) => {
        log.error("Scheduler-Lauf (Threads) fehlgeschlagen", { error: error?.message || String(error) });
      });
      // Engagement-Refresh: dynamisch je nach Client-Präsenz
      if (!config.DISCARD_MODE) {
        const now = Date.now();
        const lastSeen = presence.getLastSeen() || 0;
        const idleThreshold = config.CLIENT_IDLE_THRESHOLD_MS;
        const isActiveClients = lastSeen > 0 && (now - lastSeen) < idleThreshold;
        const minInterval = isActiveClients ? config.ENGAGEMENT_ACTIVE_MIN_MS : config.ENGAGEMENT_IDLE_MIN_MS;
        if (now - lastEngagementRunAt >= minInterval) {
          lastEngagementRunAt = now;
          refreshPublishedThreadsBatch(3).catch((error) => {
            log.error("Engagement-Refresh fehlgeschlagen", { error: error?.message || String(error) });
          });
        }
      }
    },
    { timezone: timeZone }
  );

  //lastScheduleConfig = { schedule, timeZone };
  log.info("Scheduler aktiv", { cron: schedule, timezone: timeZone || "system" });

  // Beim Start einmalig überfällige Skeets in pending_manual verschieben
  await markMissedSkeetsPending().catch((error) => {
    log.error("Startup-Scan (überfällige Skeets) fehlgeschlagen", {
      error: error?.message || String(error),
    });
  });

  await Promise.all([
    processDueSkeets().catch((error) => {
      log.error("Initialer Scheduler-Lauf (Skeets) fehlgeschlagen", { error: error?.message || String(error) });
    }),
    processDueThreads().catch((error) => {
      log.error("Initialer Scheduler-Lauf (Threads) fehlgeschlagen", { error: error?.message || String(error) });
    }),
  ]);

  return task;
}

async function startScheduler() {
  return applySchedulerTask();
}

async function restartScheduler() {
  if (task) {
    task.stop();
    task = null;
  }
  return applySchedulerTask();
}

/**
 * Veröffentlicht einen einzelnen Thread sofort (ohne Cron‑Tick), indem
 * `scheduledAt` auf jetzt gesetzt und direkt `dispatchThread` aufgerufen wird.
 */
async function publishThreadNow(id) {
  const threadId = Number(id);
  if (!Number.isInteger(threadId)) {
    const err = new Error('Ungültige Thread-ID.');
    err.status = 400;
    throw err;
  }
  const current = await Thread.findByPk(threadId, { include: [{ model: ThreadSkeet, as: 'segments', order: [["sequence","ASC"]] }] });
  if (!current) {
    const err = new Error('Thread nicht gefunden.');
    err.status = 404;
    throw err;
  }
  if (!Array.isArray(current.segments) || current.segments.length === 0) {
    const err = new Error('Thread besitzt keine Segmente.');
    err.status = 400;
    throw err;
  }
  if (current.status === 'deleted') {
    const err = new Error('Gelöschte Threads können nicht veröffentlicht werden.');
    err.status = 400;
    throw err;
  }
  // Sofort fällig markieren und in den Versand schicken
  await current.update({ scheduledAt: new Date(), status: 'scheduled' });
  await dispatchThread({ id: current.id });
  return current.id;
}

/**
 * Veröffentlicht einen einzelnen eigenständigen Skeet sofort (ohne Cron‑Tick).
 */
async function publishSkeetNow(id) {
  const skeetId = Number(id);
  if (!Number.isInteger(skeetId)) {
    const err = new Error('Ungültige Skeet-ID.');
    err.status = 400;
    throw err;
  }
  const { Skeet } = require('../../data/models');
  const current = await Skeet.findByPk(skeetId);
  if (!current) {
    const err = new Error('Skeet nicht gefunden.');
    err.status = 404;
    throw err;
  }
  if (current.isThreadPost) {
    const err = new Error('Thread-Segmente können nicht direkt veröffentlicht werden.');
    err.status = 400;
    throw err;
  }
  await current.update({ scheduledAt: new Date() });
  await dispatchSkeet({ id: current.id });
  return current.id;
}

module.exports = {
  startScheduler,
  restartScheduler,
  processDueSkeets,
  processDueThreads,
  // Direktversand (ohne Cron)
  publishThreadNow,
  publishSkeetNow,
  // Expose helpers for unit tests
  addDaysKeepingTime,
  computeNextWeekly,
  computeNextMonthly,
  calculateNextScheduledAt,
   getNextScheduledAt,
};

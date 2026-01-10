/**
 * @file settingsController.js
 * @summary Controller für Laufzeit-/Scheduler-Einstellungen.
 *
 * Stellt Endpunkte bereit, um sichere, nicht-sensitive Konfigurationen
 * (Cron-Ausdruck, Zeitzone) zu lesen und zu speichern. Nach einem Update
 * wird der Scheduler neugestartet, damit Änderungen unmittelbar greifen.
 */
const settingsService = require("@core/services/settingsService");
const { restartScheduler } = require("@core/services/scheduler");

function mapSchedulerSaveError(error) {
  const message = error?.message || "Fehler beim Speichern der Einstellungen.";
  if (message.includes("Ungültiger Cron-Ausdruck")) {
    return {
      status: 400,
      code: "SETTINGS_SCHEDULER_INVALID_CRON",
      message,
    };
  }
  if (message.includes("POST_RETRIES und Backoff-Werte müssen positive Zahlen sein.")) {
    return {
      status: 400,
      code: "SETTINGS_SCHEDULER_INVALID_NUMBERS",
      message,
    };
  }
  if (message.includes("SCHEDULER_GRACE_WINDOW_MINUTES muss mindestens 2 Minuten betragen.")) {
    return {
      status: 400,
      code: "SETTINGS_SCHEDULER_INVALID_GRACE_WINDOW",
      message,
    };
  }
  if (message.includes("SCHEDULER_RANDOM_OFFSET_MINUTES muss zwischen")) {
    return {
      status: 400,
      code: "SETTINGS_SCHEDULER_INVALID_RANDOM_OFFSET",
      message,
    };
  }
  return {
    status: 500,
    code: "SETTINGS_SCHEDULER_SAVE_FAILED",
    message,
  };
}

function mapGeneralSaveError(error) {
  const message =
    error?.message || "Fehler beim Speichern der allgemeinen Einstellungen.";
  if (message.includes("TIME_ZONE muss angegeben werden.")) {
    return {
      status: 400,
      code: "SETTINGS_GENERAL_TIME_ZONE_REQUIRED",
      message,
    };
  }
  if (message.includes("LOCALE muss angegeben werden.")) {
    return {
      status: 400,
      code: "SETTINGS_GENERAL_LOCALE_REQUIRED",
      message,
    };
  }
  if (message.includes('LOCALE muss entweder "de" oder "en" sein.')) {
    return {
      status: 400,
      code: "SETTINGS_GENERAL_LOCALE_UNSUPPORTED",
      message,
    };
  }
  if (message.includes("OVERVIEW_PREVIEW_MAX_LINES muss eine ganze Zahl sein.")) {
    return {
      status: 400,
      code: "SETTINGS_GENERAL_PREVIEW_LINES_INVALID",
      message,
    };
  }
  if (message.includes("OVERVIEW_PREVIEW_MAX_LINES muss zwischen")) {
    return {
      status: 400,
      code: "SETTINGS_GENERAL_PREVIEW_LINES_OUT_OF_RANGE",
      message,
    };
  }
  return {
    status: 500,
    code: "SETTINGS_GENERAL_SAVE_FAILED",
    message,
  };
}

function mapClientPollingSaveError(error) {
  const message =
    error?.message || "Fehler beim Speichern der Client-Konfiguration.";
  if (message.includes("Polling-Intervalle und Backoff-Werte müssen positive Zahlen sein.")) {
    return {
      status: 400,
      code: "SETTINGS_POLLING_INVALID_NUMBERS",
      message,
    };
  }
  if (message.includes("POLL_JITTER_RATIO muss zwischen 0 und 1 liegen.")) {
    return {
      status: 400,
      code: "SETTINGS_POLLING_INVALID_JITTER",
      message,
    };
  }
  return {
    status: 500,
    code: "SETTINGS_POLLING_SAVE_FAILED",
    message,
  };
}

/**
 * GET /api/settings/scheduler
 *
 * Liefert aktuelle Werte und Defaults für den Scheduler.
 * Antwort: 200 OK mit { values, defaults }
 * Fehler: 500 Internal Server Error
 */
async function getSchedulerSettings(req, res) {
  try {
    const data = await settingsService.getSchedulerSettings();
    res.json(data);
  } catch (error) {
    const message =
      error?.message || "Fehler beim Laden der Einstellungen.";
    res.status(500).json({
      error: "SETTINGS_SCHEDULER_LOAD_FAILED",
      message,
    });
  }
}

/**
 * PUT /api/settings/scheduler
 *
 * Speichert Scheduler-Settings (Cron-Ausdruck, Zeitzone etc.) und startet
 * den Scheduler neu. Unerlaubte/ungültige Werte führen zu 400.
 *
 * Body (JSON): { scheduleTime?: string, timeZone?: string }
 * Antwort: 200 OK mit { values, defaults }
 * Fehler:
 * - 400 Bad Request: z. B. ungültiger Cron oder fehlende Pflichtfelder
 * - 500 Internal Server Error
 */
async function updateSchedulerSettings(req, res) {
  try {
    const data = await settingsService.saveSchedulerSettings(req.body || {});
    await restartScheduler();
    res.json(data);
  } catch (error) {
    const { status, code, message } = mapSchedulerSaveError(error);
    res.status(status).json({ error: code, message });
  }
}

/**
 * GET /api/settings/general
 *
 * Liefert allgemeine Konfiguration (z. B. Zeitzone) mit Defaults.
 */
async function getGeneralSettings(req, res) {
  try {
    const data = await settingsService.getGeneralSettings();
    res.json(data);
  } catch (error) {
    const message =
      error?.message || "Fehler beim Laden der allgemeinen Einstellungen.";
    res.status(500).json({
      error: "SETTINGS_GENERAL_LOAD_FAILED",
      message,
    });
  }
}

/**
 * PUT /api/settings/general
 *
 * Speichert allgemeine Settings (aktuell TIME_ZONE) und startet den Scheduler neu.
 */
async function updateGeneralSettings(req, res) {
  try {
    const data = await settingsService.saveGeneralSettings(req.body || {});
    await restartScheduler();
    res.json(data);
  } catch (error) {
    const { status, code, message } = mapGeneralSaveError(error);
    res.status(status).json({ error: code, message });
  }
}

module.exports = {
  getSchedulerSettings,
  updateSchedulerSettings,
  getGeneralSettings,
  updateGeneralSettings,
  // Client-Polling
  async getClientPollingSettings(req, res) {
    try {
      const data = await settingsService.getClientPollingSettings();
      res.json(data);
    } catch (error) {
      const message =
        error?.message || "Fehler beim Laden der Client-Konfiguration.";
      res.status(500).json({
        error: "SETTINGS_POLLING_LOAD_FAILED",
        message,
      });
    }
  },
  async updateClientPollingSettings(req, res) {
    try {
      const data = await settingsService.saveClientPollingSettings(req.body || {});
      res.json(data);
    } catch (error) {
      const { status, code, message } = mapClientPollingSaveError(error);
      res.status(status).json({ error: code, message });
    }
  },
};

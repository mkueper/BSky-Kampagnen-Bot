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
    res.status(500).json({ error: error?.message || "Fehler beim Laden der Einstellungen." });
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
    const message = error?.message || "Fehler beim Speichern der Einstellungen.";
    const status = message.includes("Ungültiger Cron") || message.includes("müssen") ? 400 : 500;
    res.status(status).json({ error: message });
  }
}

module.exports = {
  getSchedulerSettings,
  updateSchedulerSettings,
  // Client-Polling
  async getClientPollingSettings(req, res) {
    try {
      const data = await settingsService.getClientPollingSettings();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error?.message || "Fehler beim Laden der Client-Konfiguration." });
    }
  },
  async updateClientPollingSettings(req, res) {
    try {
      const data = await settingsService.saveClientPollingSettings(req.body || {});
      res.json(data);
    } catch (error) {
      const message = error?.message || "Fehler beim Speichern der Client-Konfiguration.";
      const status = message.includes("müssen") || message.includes("zwischen 0 und 1") ? 400 : 500;
      res.status(status).json({ error: message });
    }
  },
};

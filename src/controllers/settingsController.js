const settingsService = require("../services/settingsService");
const { restartScheduler } = require("../services/scheduler");

async function getSchedulerSettings(req, res) {
  try {
    const data = await settingsService.getSchedulerSettings();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error?.message || "Fehler beim Laden der Einstellungen." });
  }
}

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
};

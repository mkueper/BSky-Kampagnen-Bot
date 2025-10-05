// server.js – Einstiegspunkt der Anwendung
/**
 * Bootstrapt Express, nimmt Logins zu Bluesky/Mastodon vor, synchronisiert die
 * DB und startet anschließend den Scheduler.
 *
 * Alle API-Endpoints werden hier verdrahtet, die Implementierung liegt in den
 * jeweiligen Controllern und Services.
 */

const express = require("express");
const path = require("path");
const fs = require("fs");
const { login: loginBluesky } = require("./src/services/blueskyClient");
const { login: loginMastodon, hasCredentials: hasMastodonCredentials } = require("./src/services/mastodonClient");
const { startScheduler } = require("./src/services/scheduler");
const settingsController = require("./src/controllers/settingsController");
const skeetController = require("./src/controllers/skeetController");
const threadController = require("./src/controllers/threadController");
const importExportController = require("./src/controllers/importExportController");
const engagementController = require("./src/controllers/engagementController");
const configController = require("./src/controllers/configController");
const { runPreflight } = require("./src/utils/preflight");
const config = require("./src/config");
const { sequelize, Thread, ThreadSkeet, SkeetReaction, Skeet, Reply } = require("./src/models");

const app = express();
const PORT = config.PORT;
const DIST_DIR = path.join(__dirname, "dashboard", "dist");
const INDEX_HTML = path.join(DIST_DIR, "index.html");

// Statische Dateien
app.use(express.static(DIST_DIR));
app.use(express.json());

// API-Routen
app.get("/api/skeets", skeetController.getSkeets);
app.post("/api/skeets", skeetController.createSkeet);
app.patch("/api/skeets/:id", skeetController.updateSkeet);
app.delete("/api/skeets/:id", skeetController.deleteSkeet);
app.post("/api/skeets/:id/retract", skeetController.retractSkeet);
app.post("/api/skeets/:id/restore", skeetController.restoreSkeet);

app.get("/api/threads/export", importExportController.exportThreads);
app.get("/api/threads", threadController.listThreads);
app.get("/api/threads/:id", threadController.getThread);
app.post("/api/threads", threadController.createThread);
app.patch("/api/threads/:id", threadController.updateThread);
app.delete("/api/threads/:id", threadController.deleteThread);
app.post("/api/threads/:id/retract", threadController.retractThread);
app.post("/api/threads/:id/restore", threadController.restoreThread);
app.post("/api/threads/import", importExportController.importThreads);

app.get("/api/skeets/export", importExportController.exportPlannedSkeets);
app.post("/api/skeets/import", importExportController.importPlannedSkeets);

app.get("/api/reactions/:skeetId", engagementController.getReactions);
app.get("/api/replies/:skeetId", engagementController.getReplies);
app.get("/api/settings/scheduler", settingsController.getSchedulerSettings);
app.put("/api/settings/scheduler", settingsController.updateSchedulerSettings);
// Client-Polling-Konfiguration
app.get("/api/settings/client-polling", settingsController.getClientPollingSettings);
app.put("/api/settings/client-polling", settingsController.updateClientPollingSettings);
app.get("/api/client-config", configController.getClientConfig);

// Health endpoint for liveness checks
app.get("/health", (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || "development", version: require("./package.json").version });
});

// Wildcard-Route (nur GET) – leitet unbekannte Pfade an das Dashboard weiter.
app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api/")) {
    return next();
  }

  console.log("Wildcard Route ausgelöst für:", req.originalUrl);
  fs.access(INDEX_HTML, fs.constants.F_OK, (err) => {
    if (err) {
      console.error("FEHLER: index.html nicht gefunden unter:", INDEX_HTML);
      return res
        .status(500)
        .send('Frontend-Build fehlt. Bitte "npm run build" im dashboard ausführen.');
    }
    res.sendFile(INDEX_HTML);
  });
});

// Init-Pipeline: Logins, DB-Setup und Scheduler-Start.
(async () => {
  // --- Preflight: prüfe notwendige Umgebungsvariablen
  try {
    const report = runPreflight();

    if (report.bluesky.critical) {
      console.error("❌ Preflight fehlgeschlagen (Bluesky):", report.bluesky.issues.join("; "));
      report.bluesky.hints.forEach(h => console.error("   Hinweis:", h));
      process.exit(1);
    }

    report.mastodon.warnings.forEach(w => console.warn("⚠️  Preflight:", w));
  } catch (pfErr) {
    console.error("❌ Preflight-Fehler:", pfErr?.message || pfErr);
    process.exit(1);
  }

  try {
    await loginBluesky();
    console.log("✅ Bluesky-Login erfolgreich");

    if (hasMastodonCredentials()) {
      try {
        await loginMastodon();
        console.log("✅ Mastodon-Login erfolgreich");
      } catch (mastodonError) {
        console.error("❌ Mastodon-Login fehlgeschlagen:", mastodonError?.message || mastodonError);
      }
    } else {
      console.log("ℹ️ Mastodon-Zugangsdaten nicht gesetzt – Login übersprungen.");
    }

    await sequelize.authenticate();
    console.log("✅ DB-Verbindung ok");

    await sequelize.sync(); // ggf. sync({ alter: false }) oder migrations nutzen
    console.log("✅ DB synchronisiert");

    try {
      await startScheduler();
    } catch (schedulerError) {
      console.error("❌ Scheduler konnte nicht gestartet werden:", schedulerError?.message || schedulerError);
    }

    app.listen(PORT, () => {
      if (process.env.NODE_ENV !== "test") {
        console.log(`🚀 Server läuft auf http://localhost:${PORT}`);
      }
    });
  } catch (err) {
    console.error("❌ Fehler beim Initialisieren des Servers:", err);
  }
})();

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
const mediaController = require("./src/controllers/mediaController");
const uploadController = require("./src/controllers/uploadController");
const heartbeatController = require("./src/controllers/heartbeatController");
const { runPreflight } = require("./src/utils/preflight");
const config = require("./src/config");
const { sequelize, Thread, ThreadSkeet, SkeetReaction, Skeet, Reply } = require("./src/models");
const { createLogger } = require("./src/utils/logging");
const appLog = createLogger('app');

const app = express();
const PORT = config.PORT;
const DIST_DIR = path.join(__dirname, "dashboard", "dist");
const INDEX_HTML = path.join(DIST_DIR, "index.html");

// Statische Dateien
// Uploads (Bilder) serven
try {
  const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads');
  app.use('/uploads', express.static(UPLOAD_DIR));
} catch {}
// Temporäre Uploads (Entwurf) serven
try {
  const TEMP_DIR = process.env.TEMP_UPLOAD_DIR || path.join(process.cwd(), 'data', 'temp');
  app.use('/temp', express.static(TEMP_DIR));
} catch {}
app.use(express.static(DIST_DIR));
// Erweitertes JSON-/URL‑encoded Body‑Limit (für Base64‑Uploads)
const JSON_LIMIT_MB = Number(process.env.JSON_BODY_LIMIT_MB || 25);
app.use(express.json({ limit: `${JSON_LIMIT_MB}mb` }));
app.use(express.urlencoded({ extended: true, limit: `${JSON_LIMIT_MB}mb` }));

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
app.post("/api/threads/:id/engagement/refresh", threadController.refreshEngagement);
app.post("/api/threads/engagement/refresh-all", threadController.refreshAllEngagement);
app.post("/api/threads/import", importExportController.importThreads);

app.get("/api/skeets/export", importExportController.exportPlannedSkeets);
app.post("/api/skeets/import", importExportController.importPlannedSkeets);

app.get("/api/reactions/:skeetId", engagementController.getReactions);
app.get("/api/replies/:skeetId", engagementController.getReplies);
app.post("/api/engagement/refresh-many", engagementController.refreshMany);
app.get("/api/settings/scheduler", settingsController.getSchedulerSettings);
app.put("/api/settings/scheduler", settingsController.updateSchedulerSettings);
// Client-Polling-Konfiguration
app.get("/api/settings/client-polling", settingsController.getClientPollingSettings);
app.put("/api/settings/client-polling", settingsController.updateClientPollingSettings);
app.get("/api/client-config", configController.getClientConfig);
// Client-Heartbeat (Präsenz)
app.post("/api/heartbeat", heartbeatController.postHeartbeat);

// Media (JSON upload: { filename, mime, data(base64), altText? })
app.post("/api/threads/:id/segments/:sequence/media", mediaController.addMedia);
app.patch("/api/media/:mediaId", mediaController.updateMedia);
app.delete("/api/media/:mediaId", mediaController.deleteMedia);
// Skeet media
app.post("/api/skeets/:id/media", mediaController.addSkeetMedia);
app.patch("/api/skeet-media/:mediaId", mediaController.updateSkeetMedia);
app.delete("/api/skeet-media/:mediaId", mediaController.deleteSkeetMedia);
// Temp uploads for thread draft media
app.post("/api/uploads/temp", uploadController.uploadTemp);

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
    const demoMode = Boolean(config.DISCARD_MODE);

    if (report.bluesky.critical) {
      if (demoMode) {
        console.warn("⚠️  Preflight (Bluesky) kritisch, aber Demo-/Discard-Modus ist aktiv – fahre ohne Login fort.");
        report.bluesky.hints.forEach(h => console.warn("   Hinweis:", h));
      } else {
        console.error("❌ Preflight fehlgeschlagen (Bluesky):", report.bluesky.issues.join("; "));
        report.bluesky.hints.forEach(h => console.error("   Hinweis:", h));
        process.exit(1);
      }
    }

    report.mastodon.warnings.forEach(w => console.warn("⚠️  Preflight:", w));
  } catch (pfErr) {
    console.error("❌ Preflight-Fehler:", pfErr?.message || pfErr);
    process.exit(1);
  }

  try {
    const demoMode = Boolean(config.DISCARD_MODE);
    if (!demoMode) {
      await loginBluesky();
      console.log("✅ Bluesky-Login erfolgreich");
      appLog.info("Bluesky-Login erfolgreich");

      if (hasMastodonCredentials()) {
        try {
          await loginMastodon();
          console.log("✅ Mastodon-Login erfolgreich");
          appLog.info("Mastodon-Login erfolgreich");
        } catch (mastodonError) {
          console.error("❌ Mastodon-Login fehlgeschlagen:", mastodonError?.message || mastodonError);
          appLog.error("Mastodon-Login fehlgeschlagen", { error: mastodonError?.message || String(mastodonError) });
        }
      } else {
        console.log("ℹ️ Mastodon-Zugangsdaten nicht gesetzt – Login übersprungen.");
      }
    } else {
      console.log("ℹ️ Demo-/Discard-Modus aktiv – Logins zu Bluesky/Mastodon werden übersprungen.");
      appLog.info("Demo-/Discard-Modus: Logins übersprungen");
    }

    await sequelize.authenticate();
    console.log("✅ DB-Verbindung ok");
    appLog.info("DB-Verbindung ok");

    const syncFlag = (process.env.DB_SYNC || "").toLowerCase();
    const shouldSync = syncFlag === "true" || (process.env.NODE_ENV !== "production" && syncFlag !== "false");
    if (shouldSync) {
      await sequelize.sync(); // in Prod i. d. R. per Migrationen verwalten
      console.log("✅ DB synchronisiert (sequelize.sync)");
      appLog.info("DB synchronisiert (sequelize.sync)");
    } else {
      console.log("ℹ️ sequelize.sync() übersprungen – Migrationen verwenden");
      appLog.info("sequelize.sync() übersprungen – Migrationen verwenden");
    }

    try {
      await startScheduler();
      appLog.info("Scheduler gestartet");
    } catch (schedulerError) {
      console.error("❌ Scheduler konnte nicht gestartet werden:", schedulerError?.message || schedulerError);
      appLog.error("Scheduler konnte nicht gestartet werden", { error: schedulerError?.message || String(schedulerError) });
    }

    app.listen(PORT, () => {
      if (process.env.NODE_ENV !== "test") {
        console.log(`🚀 Server läuft auf http://localhost:${PORT}`);
        appLog.info("Server läuft", { port: PORT, env: process.env.NODE_ENV || "development", target: process.env.LOG_TARGET || 'console', level: process.env.LOG_LEVEL || 'info', file: process.env.LOG_FILE || 'logs/server.log' });
      }
    });
  } catch (err) {
    console.error("❌ Fehler beim Initialisieren des Servers:", err);
  }
})();

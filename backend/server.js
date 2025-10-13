// server.js – Einstiegspunkt der Anwendung
/**
 * Bootstrapt Express, nimmt Logins zu Bluesky/Mastodon vor, synchronisiert die
 * DB und startet anschließend den Scheduler.
 *
 * Alle API-Endpoints werden hier verdrahtet, die Implementierung liegt in den
 * jeweiligen Controllern und Services.
 */

try { require('module-alias/register'); } catch { /* Aliases optional at runtime */ }
const express = require("express");
const path = require("path");
const fs = require("fs");
const { login: loginBluesky } = require("@core/services/blueskyClient");
const { login: loginMastodon, hasCredentials: hasMastodonCredentials } = require("@core/services/mastodonClient");
const { startScheduler } = require("@core/services/scheduler");
const settingsController = require("@api/controllers/settingsController");
const skeetController = require("@api/controllers/skeetController");
const threadController = require("@api/controllers/threadController");
const importExportController = require("@api/controllers/importExportController");
const engagementController = require("@api/controllers/engagementController");
const configController = require("@api/controllers/configController");
const mediaController = require("@api/controllers/mediaController");
const uploadController = require("@api/controllers/uploadController");
const credentialsController = require("@api/controllers/credentialsController");
const heartbeatController = require("@api/controllers/heartbeatController");
const { runPreflight } = require("@utils/preflight");
const config = require("@config");
const { sequelize } = require("@data/models");
const { createLogger } = require("@utils/logging");
const { sseHandler } = require("@core/services/events");
const appLog = createLogger('app');

const app = express();
const PORT = config.PORT;
// Hinweis: Nach dem Umzug liegt das Dashboard außerhalb von __dirname.
// Wir referenzieren es deshalb relativ zum Projekt-Root (process.cwd()).
const APP_ROOT = process.env.APP_ROOT || process.cwd();
const DIST_DIR = path.join(APP_ROOT, "dashboard", "dist");
const INDEX_HTML = path.join(DIST_DIR, "index.html");

// Statische Dateien
// Uploads (Bilder) bereitstellen
try {
  const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads');
  app.use('/uploads', express.static(UPLOAD_DIR));
} catch (e) { appLog.error("Fehler beim Bereitstellen des Upload-Verzeichnisses", { error: e?.message || String(e) }); }
// Temporäre Uploads (Entwurf) bereitstellen
try {
  const TEMP_DIR = process.env.TEMP_UPLOAD_DIR || path.join(process.cwd(), 'data', 'temp');
  app.use('/temp', express.static(TEMP_DIR));
} catch (e) { appLog.error("Fehler beim Bereitstellen des temporären Upload-Verzeichnisses", { error: e?.message || String(e) }); }
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
// Zugangsdaten (nur Admin-Nutzung; speichert in .env-Zieldatei)
app.get("/api/config/credentials", credentialsController.getCredentials);
app.put("/api/config/credentials", credentialsController.updateCredentials);
// Client-Heartbeat (Präsenz)
app.post("/api/heartbeat", heartbeatController.postHeartbeat);

// Server-Sent Events (UI Push-Updates)
app.get('/api/events', (req, res) => sseHandler(req, res));

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
  let version = '0.0.0'
  try { version = require(path.join(APP_ROOT, "package.json")).version } catch { /* ignore */ }
  res.json({ ok: true, env: process.env.NODE_ENV || "development", version });
});

// Wildcard-Route (nur GET) – leitet unbekannte Pfade an das Dashboard weiter.
app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api/")) {
    return next();
  }

  appLog.debug(`Wildcard Route: ${req.originalUrl}`);
  fs.access(INDEX_HTML, fs.constants.F_OK, (err) => {
    if (err) {
      appLog.error("index.html nicht gefunden", { path: INDEX_HTML });
      return res
        .status(500)
        .send('Frontend-Build fehlt. Bitte "npm run build" im dashboard ausführen.');
    }
    // Verhindere, dass Browser eine alte index.html cachen und mit neuen Asset‑Hashes mischen
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
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
      // Kein harter Abbruch mehr: starte ohne Logins und markiere, dass Credentials fehlen
      process.env.CREDENTIALS_REQUIRED = 'true'
      const logFn = demoMode ? appLog.warn : appLog.warn
      logFn("Preflight (Bluesky) kritisch – starte ohne Logins. Zugangsdaten in der App hinterlegen.", { issues: report.bluesky.issues })
      report.bluesky.hints.forEach(h => appLog.warn("Hinweis", { hint: h }))
    }

    report.mastodon.warnings.forEach(w => appLog.warn("Preflight Warnung", { warning: w }));
  } catch (pfErr) {
    appLog.error("Preflight-Fehler", { error: pfErr?.message || String(pfErr) });
    process.exit(1);
  }

  try {
    const demoMode = Boolean(config.DISCARD_MODE);
    const credsMissing = String(process.env.CREDENTIALS_REQUIRED || '').toLowerCase() === 'true'
    if (!demoMode && !credsMissing) {
      await loginBluesky();
      appLog.info("Bluesky-Login erfolgreich");

      if (hasMastodonCredentials()) {
        try {
          await loginMastodon();
          appLog.info("Mastodon-Login erfolgreich");
        } catch (mastodonError) {
          appLog.error("Mastodon-Login fehlgeschlagen", { error: mastodonError?.message || String(mastodonError) });
        }
      } else {
        appLog.info("Mastodon-Zugangsdaten nicht gesetzt – Login übersprungen.");
      }
    } else {
      appLog.info("Logins übersprungen (Demo-Modus oder fehlende Zugangsdaten).");
    }

    await sequelize.authenticate();
    appLog.info("DB-Verbindung ok");

    // Baseline-Migration immer idempotent anwenden (legt fehlende Tabellen an)
    try {
      const qi = sequelize.getQueryInterface()
      const SequelizeLib = require('sequelize')
      const migration = require(path.join(APP_ROOT, 'migrations', '00000000000000-baseline-rebuild.js'))
      await migration.up(qi, SequelizeLib)
      appLog.info('Baseline-Migration geprüft/angewendet (idempotent)')
    } catch (mErr) {
      appLog.error('Baseline-Migration fehlgeschlagen', { error: mErr?.message || String(mErr), stack: mErr?.stack })
    }

    // sync nur im Development-Modus nutzen (Produktion: Migrationen)
    const devSync = process.env.NODE_ENV !== 'production' && String(process.env.DB_SYNC || '').toLowerCase() === 'true'
    if (devSync) {
      await sequelize.sync()
      appLog.info('DB synchronisiert (sequelize.sync, dev)')
    }

    try {
      await startScheduler();
      appLog.info("Scheduler gestartet");
    } catch (schedulerError) {
      appLog.error("Scheduler konnte nicht gestartet werden", { error: schedulerError?.message || String(schedulerError) });
    }

    app.listen(PORT, () => {
      if (process.env.NODE_ENV !== "test") {
        appLog.info("Server läuft", { port: PORT, env: process.env.NODE_ENV || "development", target: process.env.LOG_TARGET || 'console', level: process.env.LOG_LEVEL || 'info', file: process.env.LOG_FILE || 'logs/server.log' });
      }
    });
  } catch (err) {
    appLog.error("Fehler beim Initialisieren des Servers", { error: err?.message || String(err) });
  }
})();

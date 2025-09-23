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
const dashboardController = require("./src/controllers/dashboardController");
const { runPreflight } = require("./src/utils/preflight");
const config = require("./src/config");
const { sequelize, Thread, Skeet, Reply } = require("./src/models");

const app = express();
const PORT = config.PORT;
const DIST_DIR = path.join(__dirname, "dashboard", "dist");
const INDEX_HTML = path.join(DIST_DIR, "index.html");

// Statische Dateien
app.use(express.static(DIST_DIR));
app.use(express.json());

// API-Routen
app.get("/api/skeets", dashboardController.getSkeets);
app.get("/api/skeets/export", dashboardController.exportPlannedSkeets);
app.get("/api/reactions/:skeetId", dashboardController.getReactions);
app.get("/api/replies/:skeetId", dashboardController.getReplies);
app.post("/api/skeets", dashboardController.createSkeet);
app.post("/api/skeets/import", dashboardController.importPlannedSkeets);
app.patch("/api/skeets/:id", dashboardController.updateSkeet);
app.delete("/api/skeets/:id", dashboardController.deleteSkeet);

// Health endpoint for liveness checks
app.get("/health", (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || "development", version: require("./package.json").version });
});

// Wildcard-Route (nur GET) – leitet unbekannte Pfade an das Dashboard weiter.
app.use((req, res, next) => {
  if (req.method === "GET") {
    console.log("Wildcard Route ausgelöst für:", req.originalUrl);
    fs.access(INDEX_HTML, fs.constants.F_OK, (err) => {
      if (err) {
        console.error("FEHLER: index.html nicht gefunden unter:", INDEX_HTML);
        return res.status(500).send('Frontend-Build fehlt. Bitte "npm run build" im dashboard ausführen.');
      }
      res.sendFile(INDEX_HTML);
    });
  } else {
    next();
  }
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
      startScheduler();
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

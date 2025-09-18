// Projekt: Bluesky Kampagnen-Tool in Node.js (Express 5 kompatibel)

const express = require("express");
const path = require("path");
const fs = require("fs");
const { login: loginBluesky } = require("./src/services/blueskyClient");
const { login: loginMastodon, hasCredentials: hasMastodonCredentials } = require("./src/services/mastodonClient");
const { startScheduler } = require("./src/services/scheduler");
const dashboardController = require("./src/controllers/dashboardController");
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
app.get("/api/reactions/:skeetId", dashboardController.getReactions);
app.get("/api/replies/:skeetId", dashboardController.getReplies);
app.post("/api/skeets", dashboardController.createSkeet);
app.patch("/api/skeets/:id", dashboardController.updateSkeet);
app.delete("/api/skeets/:id", dashboardController.deleteSkeet);

// Wildcard-Route (nur GET)
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

// Init: Bluesky-Login, DB, Serverstart
(async () => {
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
      console.log(`🚀 Server läuft auf http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Fehler beim Initialisieren des Servers:", err);
  }
})();

// src/models/db.js
/**
 * Zentrales Sequelize-Setup für das Projekt.
 *
 * Liest die Umgebungs-spezifische Konfiguration aus `config/config.js`, erzeugt
 * eine Singleton-Instanz und stellt sie den Models zur Verfügung. Dadurch
 * greifen alle Models auf dieselbe Verbindung & Connection-Pool zurück.
 */
const { Sequelize } = require("sequelize");
const path = require("path");

// Robustes Laden der DB-Konfiguration:
// 1) Umgebungsvariablen (SQLITE_STORAGE oder DATABASE_URL)
// 2) Expliziter Pfad über SEQUELIZE_CONFIG_PATH
// 3) Versuche bekannte Pfade relativ zu App-Root/aktueller Datei
function loadConfig () {
  // Env-first: sqlite single-file
  const storageFromEnv = process.env.SQLITE_STORAGE;
  const databaseUrl = process.env.DATABASE_URL;
  if (storageFromEnv) {
    return { dialect: 'sqlite', storage: storageFromEnv, logging: false };
  }
  if (databaseUrl) {
    // Sequelize versteht sqlite::memory:, sqlite:path, postgres://..., etc.
    return { dialect: undefined, url: databaseUrl, logging: false };
  }

  const explicitPath = process.env.SEQUELIZE_CONFIG_PATH;
  const candidates = [];
  if (explicitPath) candidates.push(explicitPath);
  // appRoot über APP_ROOT (von Electron gesetzt) oder process.cwd()
  const appRoot = process.env.APP_ROOT || process.cwd();
  candidates.push(path.join(appRoot, 'config', 'config.js'));
  // relativ zur aktuellen Datei (backend/src/data/models/db.js)
  candidates.push(path.resolve(__dirname, '../../../../config/config.js'));

  for (const file of candidates) {
    try {
      const cfg = require(file);
      const env = process.env.NODE_ENV || 'development';
      return cfg[env] || cfg;
    } catch { /* try next */ }
  }
  // Fallback: lokale sqlite-Datei im Arbeitsverzeichnis
  return { dialect: 'sqlite', storage: path.join(appRoot || process.cwd(), 'data', 'bluesky_campaign.sqlite'), logging: false };
}

const config = loadConfig();

/**
 * Gemeinsame Sequelize-Instanz für sämtliche Models.
 *
 * @type {Sequelize}
 */
// Optional Override des SQLite-Speicherpfads per ENV, z. B. für Electron-Pakete
const storageOverride = process.env.SQLITE_STORAGE;

const sequelize = config.url
  ? new Sequelize(config.url, { logging: config.logging ?? false, timezone: "+00:00", dialectOptions: { useUTC: true } })
  : new Sequelize(config.database || "", config.username || "", config.password || "", {
  dialect: config.dialect || 'sqlite',
  storage: storageOverride || config.storage,
  logging: config.logging ?? false,

  // Zeitstempel-Handling
  timezone: "+00:00", // UTC speichern
  dialectOptions: {
    useUTC: true, // sicherstellen, dass UTC genutzt wird
  },
});

module.exports = sequelize;

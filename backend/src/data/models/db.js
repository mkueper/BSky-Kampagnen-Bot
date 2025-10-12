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

// CLI-Config laden (Root/config/config.js)
// Nutzt das Projekt-Root (process.cwd()), da Models verschoben wurden
const dbConfig = require(path.resolve(process.cwd(), "config", "config.js"));

// Umgebung bestimmen (default: development)
const env = process.env.NODE_ENV || "development";
const config = dbConfig[env];

/**
 * Gemeinsame Sequelize-Instanz für sämtliche Models.
 *
 * @type {Sequelize}
 */
const sequelize = new Sequelize(config.database || "", config.username || "", config.password || "", {
  dialect: config.dialect,
  storage: config.storage,
  logging: config.logging ?? false,

  // Zeitstempel-Handling
  timezone: "+00:00", // UTC speichern
  dialectOptions: {
    useUTC: true, // sicherstellen, dass UTC genutzt wird
  },
});

module.exports = sequelize;

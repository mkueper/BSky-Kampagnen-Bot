// src/models/db.js
const { Sequelize } = require("sequelize");
const path = require("path");

// CLI-Config laden (Root/config/config.js)
const dbConfig = require(path.join(__dirname, "../../config/config.js"));

// Umgebung bestimmen (default: development)
const env = process.env.NODE_ENV || "development";
const config = dbConfig[env];

// Sequelize-Instanz erzeugen
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

// config/config.js
const path = require("path");

// Basisname der DB-Datei abhängig von der Umgebung
const env = process.env.NODE_ENV || "development";
const dbFile = `bluesky_campaign_${env}.sqlite`;

module.exports = {
  [env]: {
    dialect: "sqlite",
    storage: path.join(__dirname, "..", "data", dbFile),
    logging: false,
  },

  // Optional: Wenn du gleich mehrere Umgebungen explizit definieren willst
  development: {
    dialect: "sqlite",
    storage: path.join(__dirname, "..", "data", "bluesky_campaign_development.sqlite"),
    logging: false,
  },
  test: {
    dialect: "sqlite",
    storage: path.join(__dirname, "..", "data", "bluesky_campaign_test.sqlite"),
    logging: false,
  },
  production: {
    dialect: "sqlite",
    storage: path.join(__dirname, "..", "data", "bluesky_campaign_production.sqlite"),
    logging: false,
  },
};

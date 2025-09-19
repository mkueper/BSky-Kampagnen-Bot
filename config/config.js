// config/config.js – Sequelize CLI Konfiguration
/**
 * Stellt environment-spezifische Datenbankpfade bereit.
 *
 * Wird sowohl von sequelize-cli als auch vom Runtime-Code (`src/models/db.js`)
 * genutzt, damit Migrationen und Anwendung dieselbe Datei verwenden.
 */
const path = require("path");

const env = process.env.NODE_ENV || "development";

const createConfig = (envName) => ({
  dialect: "sqlite",
  storage: path.join(__dirname, "..", "data", `bluesky_campaign_${envName}.sqlite`),
  logging: false,
});

const ENVIRONMENTS = ["development", "test", "production"];

const configs = ENVIRONMENTS.reduce((acc, name) => {
  acc[name] = createConfig(name);
  return acc;
}, {});

module.exports = {
  ...configs,
  [env]: configs[env] ?? createConfig(env),
};

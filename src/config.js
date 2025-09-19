// src/config.js
/**
 * Ableitung laufzeitrelevanter Konfigurationen (Cron, Ports, Locale).
 *
 * Im Unterschied zu `env.js` werden hier konkrete Defaults und Fallbacks
 * zusammengeführt, die der Server unmittelbar benötigt.
 */
require("dotenv").config();

const DEFAULT_CRON = "* * * * *"; // Standard: jede Minute prüfen

module.exports = {
  SCHEDULE_TIME:
    process.env.SCHEDULE_TIME ||
    process.env.VITE_SCHEDULE_TIME ||
    DEFAULT_CRON,
  PORT: parseInt(process.env.PORT ?? "", 10) || 3000,
  TIME_ZONE:
    process.env.TIME_ZONE || process.env.VITE_TIME_ZONE || "Europe/Berlin",
  LOCALE: process.env.LOCALE || process.env.VITE_LOCALE || "de-DE",
};

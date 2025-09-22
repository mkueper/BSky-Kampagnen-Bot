// src/config.js
/**
 * Ableitung laufzeitrelevanter Konfigurationen (Cron, Ports, Locale).
 *
 * Im Unterschied zu `env.js` werden hier konkrete Defaults und Fallbacks
 * zusammengeführt, die der Server unmittelbar benötigt.
 */
require("dotenv").config();

const DEFAULT_CRON = "* * * * *"; // Standard: jede Minute prüfen

const resolvePort = () => {
  const candidates = [
    process.env.APP_PORT,
    process.env.BACKEND_INTERNAL_PORT,
    process.env.INTERNAL_BACKEND_PORT,
    process.env.BACKEND_PORT,
  ];

  for (const value of candidates) {
    const parsed = parseInt(value ?? "", 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return 3000;
};

module.exports = {
  SCHEDULE_TIME:
    process.env.SCHEDULE_TIME ||
    process.env.VITE_SCHEDULE_TIME ||
    DEFAULT_CRON,
  PORT: resolvePort(),
  TIME_ZONE:
    process.env.TIME_ZONE || process.env.VITE_TIME_ZONE || "Europe/Berlin",
  LOCALE: process.env.LOCALE || process.env.VITE_LOCALE || "de-DE",
};

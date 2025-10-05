// src/config.js
/**
 * Ableitung laufzeitrelevanter Konfigurationen (Cron, Ports, Locale).
 *
 * Im Unterschied zu `env.js` werden hier konkrete Defaults und Fallbacks
 * zusammengeführt, die der Server unmittelbar benötigt.
 */
require("dotenv").config();

const DEFAULT_CRON = "* * * * *"; // Standard: jede Minute prüfen
const toNumber = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : def;
};
const toBool = (v, def = false) => {
  if (v == null) return def;
  const s = String(v).toLowerCase().trim();
  return s === "1" || s === "true" || s === "yes";
};

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
  // Werte, die gefahrlos an den Client exponiert werden dürfen (read-only)
  CLIENT_CONFIG: {
    polling: {
      skeets: {
        activeMs:
          toNumber(process.env.SKEET_POLL_ACTIVE_MS, null) ??
          toNumber(process.env.VITE_SKEET_POLL_ACTIVE_MS, 8000),
        idleMs:
          toNumber(process.env.SKEET_POLL_IDLE_MS, null) ??
          toNumber(process.env.VITE_SKEET_POLL_IDLE_MS, 40000),
        hiddenMs:
          toNumber(process.env.SKEET_POLL_HIDDEN_MS, null) ??
          toNumber(process.env.VITE_SKEET_POLL_HIDDEN_MS, 180000),
        minimalHidden:
          toBool(process.env.SKEET_POLL_MINIMAL_HIDDEN, null) ??
          toBool(process.env.VITE_SKEET_POLL_MINIMAL_HIDDEN, false),
      },
      threads: {
        activeMs:
          toNumber(process.env.THREAD_POLL_ACTIVE_MS, null) ??
          toNumber(process.env.VITE_THREAD_POLL_ACTIVE_MS, 8000),
        idleMs:
          toNumber(process.env.THREAD_POLL_IDLE_MS, null) ??
          toNumber(process.env.VITE_THREAD_POLL_IDLE_MS, 40000),
        hiddenMs:
          toNumber(process.env.THREAD_POLL_HIDDEN_MS, null) ??
          toNumber(process.env.VITE_THREAD_POLL_HIDDEN_MS, 180000),
        minimalHidden:
          toBool(process.env.THREAD_POLL_MINIMAL_HIDDEN, null) ??
          toBool(process.env.VITE_THREAD_POLL_MINIMAL_HIDDEN, false),
      },
      backoffStartMs:
        toNumber(process.env.POLL_BACKOFF_START_MS, null) ??
        toNumber(process.env.VITE_POLL_BACKOFF_START_MS, 10000),
      backoffMaxMs:
        toNumber(process.env.POLL_BACKOFF_MAX_MS, null) ??
        toNumber(process.env.VITE_POLL_BACKOFF_MAX_MS, 300000),
      jitterRatio:
        (() => {
          const n = Number(process.env.POLL_JITTER_RATIO ?? process.env.VITE_POLL_JITTER_RATIO);
          return Number.isFinite(n) && n >= 0 && n <= 1 ? n : 0.15;
        })(),
      heartbeatMs:
        toNumber(process.env.POLL_HEARTBEAT_MS, null) ??
        toNumber(process.env.VITE_POLL_HEARTBEAT_MS, 2000),
    },
  },
};

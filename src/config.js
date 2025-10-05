// src/config.js
/**
 * Laufzeit‑Konfiguration des Backends und exportierbare Client‑Defaults.
 *
 * Abgrenzung:
 * - `env.js` kapselt sensible Plattform‑Credentials und rohe Env‑Werte.
 * - Dieses Modul leitet konkrete, sofort nutzbare Einstellungen ab,
 *   validiert/normalisiert Eingaben und definiert robuste Defaultwerte.
 *
 * Allgemeine Priorität für Werte:
 * 1) Serverseitige Variablen ohne `VITE_` (z. B. `TIME_ZONE`, `POLL_*`).
 * 2) Build‑Zeit‑Variablen mit `VITE_` (z. B. `VITE_TIME_ZONE`, `VITE_POLL_*`).
 * 3) Hart kodierte Defaults (Fallbacks) in diesem Modul.
 *
 * VITE‑Hinweis:
 * - `VITE_*` wird beim Frontend‑Build in den Client codiert und ist sichtbar.
 * - Serverseitige Gegenstücke können zur Laufzeit überschreiben und werden über
 *   `/api/client-config` an das Dashboard geliefert.
 */
require("dotenv").config();

const DEFAULT_CRON = "* * * * *"; // Standard: jede Minute prüfen
/**
 * Parst Zahlenwerte robust, sonst Default.
 * @param {unknown} v
 * @param {number} def
 * @returns {number}
 */
const toNumber = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : def;
};
/**
 * Interpretiert "1"/"true"/"yes" (case‑insensitive) als true, sonst Default.
 * @param {unknown} v
 * @param {boolean} [def=false]
 * @returns {boolean}
 */
const toBool = (v, def = false) => {
  if (v == null) return def;
  const s = String(v).toLowerCase().trim();
  return s === "1" || s === "true" || s === "yes";
};

/**
 * Ermittelt den Express‑Port für lokale und Container‑Setups.
 * Kandidatenreihenfolge: `APP_PORT` → `BACKEND_INTERNAL_PORT` →
 * `INTERNAL_BACKEND_PORT` → `BACKEND_PORT` → 3000.
 * @returns {number}
 */
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
  /**
   * Cron‑Ausdruck für die Scheduler‑Prüfung.
   * Reihenfolge: `SCHEDULE_TIME` → `VITE_SCHEDULE_TIME` → jede Minute.
   */
  SCHEDULE_TIME:
    process.env.SCHEDULE_TIME ||
    process.env.VITE_SCHEDULE_TIME ||
    DEFAULT_CRON,
  /** Server‑Port (siehe `resolvePort`). */
  PORT: resolvePort(),
  /**
   * Serverseitige Zeitzone (IANA), z. B. "Europe/Berlin".
   * Reihenfolge: `TIME_ZONE` → `VITE_TIME_ZONE` → Default.
   */
  TIME_ZONE:
    process.env.TIME_ZONE || process.env.VITE_TIME_ZONE || "Europe/Berlin",
  /**
   * Fallback‑Locale für serverseitige Formatierungen.
   * Reihenfolge: `LOCALE` → `VITE_LOCALE` → "de-DE".
   */
  LOCALE: process.env.LOCALE || process.env.VITE_LOCALE || "de-DE",
  /**
   * Read‑only Client‑Konfiguration, die via `/api/client-config` ausgeliefert wird.
   * Vereint Build‑Zeit‑Werte (VITE_*) mit optionalen Laufzeit‑Overrides.
   */
  CLIENT_CONFIG: {
    polling: {
      /** Skeet‑Polling‑Intervalle im Dashboard. */
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
      /** Thread‑Polling‑Intervalle im Dashboard. */
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
      /** Exponentielles Backoff inkl. Jitter für Polling. */
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

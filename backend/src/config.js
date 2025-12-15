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
const fs = require('fs');
const path = require('path');
const { getCustomization, DEFAULT_CUSTOMIZATION } = require('./utils/customization');

const APP_ROOT = process.env.APP_ROOT || process.cwd();

const customization = getCustomization();

const readJsonFile = (filePath) => {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      console.warn(`[config] Konnte ${filePath} nicht laden:`, error.message);
    }
    return null;
  }
};

const normalizePrefixHintMap = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entries = Object.entries(value)
    .map(([key, hint]) => {
      if (!key) return null;
      const id = String(key).trim();
      if (!id) return null;
      const text = typeof hint === 'string' ? hint.trim() : '';
      return [id, text];
    })
    .filter(Boolean);
  if (!entries.length) return null;
  return Object.fromEntries(entries);
};

const normalizeAdvancedPrefixes = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (Array.isArray(entry)) {
        const prefix = typeof entry[0] === 'string' ? entry[0].trim() : '';
        if (!prefix) return null;
        const hint = typeof entry[1] === 'string' ? entry[1].trim() : '';
        const id = typeof entry[2] === 'string' ? entry[2].trim() : null;
        return { id: id || null, prefix, hint };
      }
      if (typeof entry === 'string') {
        const trimmed = entry.trim();
        return trimmed ? { id: null, prefix: trimmed, hint: '' } : null;
      }
      if (entry && typeof entry === 'object') {
        const prefix = typeof entry.prefix === 'string' ? entry.prefix.trim() : '';
        if (!prefix) return null;
        const hint = typeof entry.hint === 'string' ? entry.hint.trim() : '';
        const id = typeof entry.id === 'string' ? entry.id.trim() : null;
        return { id: id || null, prefix, hint };
      }
      return null;
    })
    .filter(Boolean);
};

const DEFAULT_CRON = "* * * * *"; // Standard: jede Minute prüfen
const DEFAULT_ADVANCED_PREFIXES = normalizeAdvancedPrefixes(DEFAULT_CUSTOMIZATION.search?.advancedPrefixes) || [];
const configuredAdvancedPrefixesList = normalizeAdvancedPrefixes(customization?.search?.advancedPrefixes);
const configuredAdvancedPrefixes = configuredAdvancedPrefixesList.length
  ? configuredAdvancedPrefixesList
  : DEFAULT_ADVANCED_PREFIXES;

const DEFAULT_PREFIX_HINTS = {
  de: {
    from: '@handle oder "me"',
    mention: '@handle oder "me"',
    mentions: '@handle oder "me"',
    to: '@handle oder "me"',
    domain: 'example.com',
    lang: 'de, en',
    since: 'YYYY-MM-DD oder YYYY-MM-DDTHH:MM:SSZ',
    until: 'YYYY-MM-DD oder YYYY-MM-DDTHH:MM:SSZ'
  },
  en: {
    from: '@handle or "me"',
    mention: '@handle or "me"',
    mentions: '@handle or "me"',
    to: '@handle or "me"',
    domain: 'example.com',
    lang: 'en, de',
    since: 'YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ',
    until: 'YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ'
  }
};

const loadPrefixHintsForLocale = (locale) => {
  const filePath = path.join(APP_ROOT, 'config', `search-prefix-hints.${locale}.json`);
  const parsed = readJsonFile(filePath);
  const normalized = normalizePrefixHintMap(parsed);
  if (normalized) return normalized;
  return null;
};

const configuredPrefixHints = {
  de: loadPrefixHintsForLocale('de') || DEFAULT_PREFIX_HINTS.de,
  en: loadPrefixHintsForLocale('en') || DEFAULT_PREFIX_HINTS.en
};
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
   * Gnadenzeitraum für überfällige Skeets (in Minuten).
   * Skeets, deren scheduledAt deutlich vor "jetzt" liegt, werden beim
   * Scheduler-Start in den Status "pending_manual" verschoben, damit sie
   * nicht ungefragt nachgefeuert werden.
   */
  SCHEDULER_GRACE_WINDOW_MINUTES:
    toNumber(process.env.SCHEDULER_GRACE_WINDOW_MINUTES, 10),
  /**
   * Globaler Zufallsversatz für wiederkehrende Posts (in Minuten).
   * Jeder Turnus wird zufällig um ±N Minuten verschoben.
   */
  SCHEDULER_RANDOM_OFFSET_MINUTES:
    toNumber(process.env.SCHEDULER_RANDOM_OFFSET_MINUTES, 0),
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
      /** Skeet‑Polling‑Intervalle im Dashboard (Fallback, wenn SSE ausfällt). */
      skeets: {
        activeMs:
          toNumber(process.env.SKEET_POLL_ACTIVE_MS, null) ??
          toNumber(process.env.VITE_SKEET_POLL_ACTIVE_MS, 30000),
        idleMs:
          toNumber(process.env.SKEET_POLL_IDLE_MS, null) ??
          toNumber(process.env.VITE_SKEET_POLL_IDLE_MS, 120000),
        hiddenMs:
          toNumber(process.env.SKEET_POLL_HIDDEN_MS, null) ??
          toNumber(process.env.VITE_SKEET_POLL_HIDDEN_MS, 300000),
        minimalHidden:
          toBool(process.env.SKEET_POLL_MINIMAL_HIDDEN, null) ??
          toBool(process.env.VITE_SKEET_POLL_MINIMAL_HIDDEN, false),
      },
      /** Thread‑Polling‑Intervalle im Dashboard (Fallback, wenn SSE ausfällt). */
      threads: {
        activeMs:
          toNumber(process.env.THREAD_POLL_ACTIVE_MS, null) ??
          toNumber(process.env.VITE_THREAD_POLL_ACTIVE_MS, 30000),
        idleMs:
          toNumber(process.env.THREAD_POLL_IDLE_MS, null) ??
          toNumber(process.env.VITE_THREAD_POLL_IDLE_MS, 120000),
        hiddenMs:
          toNumber(process.env.THREAD_POLL_HIDDEN_MS, null) ??
          toNumber(process.env.VITE_THREAD_POLL_HIDDEN_MS, 300000),
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
          return Number.isFinite(n) && n >= 0 && n <= 1 ? n : 0.2;
        })(),
      heartbeatMs:
        toNumber(process.env.POLL_HEARTBEAT_MS, null) ??
        toNumber(process.env.VITE_POLL_HEARTBEAT_MS, 2000),
    },
    images: {
      maxCount: 4,
      maxBytes:
        toNumber(process.env.UPLOAD_MAX_BYTES, null) ?? 8 * 1024 * 1024,
      allowedMimes: (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/webp,image/gif')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      requireAltText:
        toBool(process.env.REQUIRE_ALT_TEXT_IMAGES, false),
    },
    search: {
      advancedPrefixes: configuredAdvancedPrefixes,
      prefixHints: configuredPrefixHints
    },
  },
  /** Serverseitige Steuerung des Engagement-Collectors */
  ENGAGEMENT_ACTIVE_MIN_MS:
    toNumber(process.env.ENGAGEMENT_ACTIVE_MIN_MS, 120000), // 2 Min
  ENGAGEMENT_IDLE_MIN_MS:
    toNumber(process.env.ENGAGEMENT_IDLE_MIN_MS, 1200000), // 20 Min
  CLIENT_IDLE_THRESHOLD_MS:
    toNumber(process.env.CLIENT_IDLE_THRESHOLD_MS, 1200000), // 20 Min ohne Heartbeat => idle
  /** Bulk-Refresh Limits */
  BULK_REFRESH_MAX_IDS: toNumber(process.env.BULK_REFRESH_MAX_IDS, 50),
  BULK_REFRESH_CONCURRENCY: toNumber(process.env.BULK_REFRESH_CONCURRENCY, 4),
  /** Demo-/Discard-Modus: Scheduler verwirft fällige Posts statt zu senden */
  DISCARD_MODE: toBool(process.env.SCHEDULER_DISCARD_MODE, false),
};

// src/platforms/types.js
/**
 * Sammlung gemeinsamer Typ-Konstanten für Plattformprofile.
 *
 * Ermöglicht, dass Scheduler/Dashboard auf symbolische Konstanten zugreifen
 * können, ohne die tatsächlichen ID-Strings duplizieren zu müssen.
 */

/**
 * @typedef {"bluesky" | "mastodon"} TargetPlatform
 */

const PLATFORMS = {
  BLUESKY: "bluesky",
  MASTODON: "mastodon",
};

module.exports = {
  PLATFORMS,
  // Optional export: TargetPlatform JSDoc-Typ existiert nur für Editor/IDE
};

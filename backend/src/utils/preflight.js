// src/utils/preflight.js
/**
 * Minimaler Preflight-Check für notwendige Umgebungsvariablen.
 * - Bluesky-Creds sind "kritisch": ohne sie können Kernfunktionen nicht arbeiten.
 * - Mastodon-Creds sind "optional": bei Fehlen nur Warnung, Features bleiben aus.
 */
const { env } = require("../env");

function checkBluesky() {
  const issues = [];
  const hints = [];

  if (!env.bluesky.identifier) {
    issues.push("BLUESKY_IDENTIFIER fehlt");
    hints.push('Setze BLUESKY_IDENTIFIER in deiner .env (z. B. "name.bsky.social" oder E-Mail).');
  }
  if (!env.bluesky.appPassword) {
    issues.push("BLUESKY_APP_PASSWORD fehlt");
    hints.push("Lege ein App-Passwort in den Bluesky-Einstellungen an und setze BLUESKY_APP_PASSWORD.");
  }
  if (!env.bluesky.serverUrl) {
    issues.push("BLUESKY_SERVER_URL fehlt");
    hints.push('Standard wäre "https://bsky.social" – setze BLUESKY_SERVER_URL, falls du einen anderen Service nutzt.');
  }

  return { issues, hints, critical: issues.length > 0 };
}

function checkMastodon() {
  const warnings = [];
  if (!env.mastodon.apiUrl || !env.mastodon.accessToken) {
    warnings.push("Mastodon-Credentials unvollständig – Mastodon-Funktionen werden übersprungen.");
  }
  return { warnings };
}

function runPreflight() {
  const bluesky = checkBluesky();
  const mastodon = checkMastodon();

  return {
    bluesky,
    mastodon,
    hasCritical: bluesky.critical,
  };
}

module.exports = { runPreflight };

// src/env.js
/**
 * Zentrale Drehscheibe für Konfigurationswerte aus `.env` und Build-Varianten.
 *
 * Beim Import wird dotenv einmalig initialisiert. Alle Services greifen auf die
 * hier exportierten Objekte zurück, damit die Herkunft der Secrets gekapselt
 * bleibt.
 */
// Erlaubt ein benutzerdefiniertes .env über ENV_PATH/DOTENV_PATH
try {
  const dotenv = require('dotenv')
  const customPath = process.env.ENV_PATH || process.env.DOTENV_PATH || process.env.DOTENV_CONFIG_PATH
  if (customPath) dotenv.config({ path: customPath })
  else dotenv.config()
} catch { /* dotenv optional at runtime */ }

const env = {
  bluesky: {
    serverUrl: process.env.BLUESKY_SERVER_URL || "https://bsky.social",
    identifier: process.env.BLUESKY_IDENTIFIER || "",
    appPassword: process.env.BLUESKY_APP_PASSWORD || "",
  },
  mastodon: {
    apiUrl: process.env.MASTODON_API_URL || "https://mastodon.social",
    accessToken: process.env.MASTODON_ACCESS_TOKEN || "",
  },
  logging: {
    level: (process.env.LOG_LEVEL || 'info').toLowerCase(),
    target: (process.env.LOG_TARGET || 'console').toLowerCase(),
    file: process.env.LOG_FILE || 'logs/server.log',
    engagementDebug: /^(1|true|yes)$/i.test(String(process.env.ENGAGEMENT_DEBUG || 'false')),
  },
  timeZone: process.env.TIME_ZONE || "Europe/Berlin",
};

module.exports = { env };

// src/services/mastodonClient.js
/**
 * Thin Wrapper um die mastodon-api Library.
 *
 * Bietet Login, Credential-Checks und vereinfachte Post-Aufrufe. Die meisten
 * Funktionen nehmen optionale Overrides entgegen, sodass Tests andere
 * Zugangsdaten nutzen können.
 */
const Mastodon = require("mastodon-api");
const { env } = require("../env");

let client = null;

function resolveReadClient(overrides) {
  if (overrides) {
    return createClient(overrides);
  }
  if (client) {
    return client;
  }
  client = createClient();
  return client;
}

/**
 * Entfernt einen trailing Slash, damit wir konsistente Basis-URLs bilden.
 */
function normalizeApiUrl(url) {
  if (!url) {
    return url;
  }

  return url.endsWith("/") ? url.slice(0, -1) : url;
}

/**
 * Ermittelt final genutzte Konfiguration einschließlich Overrides.
 */
function resolveConfig(overrides = {}) {
  const base = env.mastodon || {};
  return {
    apiUrl: overrides.apiUrl ?? base.apiUrl,
    accessToken: overrides.accessToken ?? base.accessToken,
  };
}

/**
 * Convenience-Helfer für `server.js`, um Credentials schnell zu prüfen.
 */
function hasCredentials(config = env.mastodon) {
  return Boolean(config?.apiUrl && config?.accessToken);
}

/**
 * Erstellt eine neue Mastodon-Clientinstanz (ohne sie global zu speichern).
 */
function createClient(overrides = {}) {
  const { apiUrl, accessToken } = resolveConfig(overrides);

  if (!apiUrl) {
    throw new Error("MASTODON_API_URL fehlt. Bitte .env prüfen.");
  }

  if (!accessToken) {
    throw new Error("MASTODON_ACCESS_TOKEN fehlt. Bitte .env prüfen.");
  }

  return new Mastodon({
    access_token: accessToken,
    api_url: `${normalizeApiUrl(apiUrl)}/api/v1/`,
  });
}

/**
 * Führt einen Login durch und cached den Client für Folgeoperationen.
 */
async function login(overrides = {}) {
  client = createClient(overrides);
  await client.get("accounts/verify_credentials");
  return client;
}

/**
 * Liefert den zuletzt angemeldeten Client oder wirft, falls nicht initialisiert.
 */
function getClient() {
  if (!client) {
    throw new Error("Mastodon-Client ist nicht initialisiert. Bitte login() aufrufen.");
  }

  return client;
}

/**
 * Postet einen Status; nutzt optional temporäre Credentials.
 */
async function postStatus(status, options) {
  const activeClient = options ? createClient(options) : getClient();
  const response = await activeClient.post("statuses", { status });
  return response.data;
}

/**
 * Ruft einen Status ab und liefert die rohe API-Antwort zurück.
 */
async function getStatus(statusId, options) {
  if (!statusId) {
    throw new Error("statusId ist erforderlich, um einen Mastodon-Status abzurufen.");
  }
  const activeClient = resolveReadClient(options);
  const response = await activeClient.get(`statuses/${statusId}`);
  return response.data;
}

async function getStatusContext(statusId, options) {
  if (!statusId) {
    throw new Error("statusId ist erforderlich, um Mastodon-Replies abzurufen.");
  }
  const activeClient = resolveReadClient(options);
  const response = await activeClient.get(`statuses/${statusId}/context`);
  return response.data;
}

module.exports = {
  login,
  getClient,
  postStatus,
  createClient,
  hasCredentials,
  getStatus,
  getStatusContext,
};

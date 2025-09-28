// src/services/mastodonClient.js
/**
 * Mastodon-Client Wrapper.
 *
 * Zentralisiert den Umgang mit der `mastodon-api` Library, kapselt dabei die
 * Credential-Verwaltung (inkl. `.env`-Fallbacks) und bietet schmale Helper für
 * typische Operationen wie Login, Status posten oder Reaktionen abrufen.
 *
 * Die Funktionen werfen bewusst Fehler, wenn essenzielle Angaben fehlen. So
 * können Aufrufer situativ entscheiden, ob sie abbrechen, einen Retry
 * einplanen oder alternative Workflows starten.
 */
const Mastodon = require("mastodon-api");
const { env } = require("../env");

let client = null;

/**
 * Liefert einen Mastodon-Client für reine Lesezugriffe.
 *
 * Falls bereits ein globaler Client existiert, wird dieser wiederverwendet;
 * andernfalls wird ein neuer über {@link createClient} erzeugt. Durch optionale
 * Overrides lassen sich Tests oder Sonderfälle mit abweichenden Zugangsdaten
 * abdecken, ohne den globalen Cache zu verändern.
 *
 * @param {object} [overrides] Alternative Credential-Quelle (z. B. für Tests).
 * @returns {Mastodon} Initialisierte Client-Instanz.
 */
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
 * Entfernt einen trailing Slash am Ende der Basis-URL.
 *
 * Mastodon-Endpoints hängen immer an `/api/v1/...`. Ohne Normalisierung könnte
 * ein doppelter Slash entstehen, was einige Reverse-Proxy-Konfigurationen
 * stören würde.
 *
 * @param {string|undefined} url Ursprüngliche URL aus `.env` oder Overrides.
 * @returns {string|undefined} Normalisierte URL (oder `undefined`, falls Input leer).
 */
function normalizeApiUrl(url) {
  if (!url) {
    return url;
  }

  return url.endsWith("/") ? url.slice(0, -1) : url;
}

/**
 * Zusammenführen der finalen Mastodon-Konfiguration.
 *
 * @param {object} [overrides={}] Partielle Credentials, die `.env` ersetzen.
 * @returns {{ apiUrl?: string, accessToken?: string }} Kombinierte Werte.
 */
function resolveConfig(overrides = {}) {
  const base = env.mastodon || {};
  return {
    apiUrl: overrides.apiUrl ?? base.apiUrl,
    accessToken: overrides.accessToken ?? base.accessToken,
  };
}

/**
 * Schneller Credential-Check ohne Client-Erzeugung.
 *
 * @param {{ apiUrl?: string, accessToken?: string }} [config=env.mastodon]
 *   Datenquelle (Default: `.env`).
 * @returns {boolean} `true`, wenn API-URL und Token vorhanden sind.
 */
function hasCredentials(config = env.mastodon) {
  return Boolean(config?.apiUrl && config?.accessToken);
}

/**
 * Erstellt eine neue Mastodon-Clientinstanz (ohne sie zu cachen).
 *
 * Wird sowohl intern (für temporäre Overrides) als auch beim initialen Login
 * genutzt. Wirft bei fehlenden Credentials, damit Aufrufer den Fehler bewusst
 * behandeln müssen.
 *
 * @param {{ apiUrl?: string, accessToken?: string }} [overrides={}] Optionales
 *   Credential-Override.
 * @throws {Error} Wenn `apiUrl` oder `accessToken` fehlen.
 * @returns {Mastodon} Frisch erzeugter Client.
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
 * Führt einen Login gegen die Mastodon-Instanz durch und cached den Client.
 *
 * Sobald der Login erfolgt ist, können Folgeoperationen über {@link getClient}
 * oder {@link resolveReadClient} auf den gleichen Client zugreifen.
 *
 * @param {{ apiUrl?: string, accessToken?: string }} [overrides]
 *   Alternativ-Credentials (Tests, Migrationen).
 * @returns {Promise<Mastodon>} Der verifizierte Client.
 */
async function login(overrides = {}) {
  client = createClient(overrides);
  await client.get("accounts/verify_credentials");
  return client;
}

/**
 * Gibt den aktuell gecachten Client zurück.
 *
 * @throws {Error} Wenn der Cache leer ist (d. h. `login()` wurde nicht aufgerufen).
 * @returns {Mastodon} Bereits initialisierte Client-Instanz.
 */
function getClient() {
  if (!client) {
    throw new Error("Mastodon-Client ist nicht initialisiert. Bitte login() aufrufen.");
  }

  return client;
}

/**
 * Postet einen Text-Status auf Mastodon.
 *
 * Wenn `options` gesetzt ist, werden temporäre Credentials verwendet; andernfalls
 * nutzt die Funktion den gecachten Client (und setzt voraus, dass `login()`
 * einmalig aufgerufen wurde).
 *
 * @param {string} status Inhalt des Status.
 * @param {{ apiUrl?: string, accessToken?: string }} [options] Optionaler
 *   Credential-Override.
 * @returns {Promise<object>} API-Antwort der Instanz (`response.data`).
 */
async function postStatus(status, options) {
  const activeClient = options ? createClient(options) : getClient();
  const response = await activeClient.post("statuses", { status });
  return response.data;
}

/**
 * Lädt einen Mastodon-Status inklusive Metriken.
 *
 * @param {string|number} statusId Eindeutige ID des Status.
 * @param {{ apiUrl?: string, accessToken?: string }} [options]
 *   Credential-Override.
 * @throws {Error} Wenn keine ID übergeben wird.
 * @returns {Promise<object>} Rohdaten (`response.data`).
 */
async function getStatus(statusId, options) {
  if (!statusId) {
    throw new Error("statusId ist erforderlich, um einen Mastodon-Status abzurufen.");
  }
  const activeClient = resolveReadClient(options);
  const response = await activeClient.get(`statuses/${statusId}`);
  return response.data;
}

/**
 * Holt Kontextinformationen (Vorgänger und Antworten) zu einem Status.
 *
 * @param {string|number} statusId Mastodon-Status-ID.
 * @param {{ apiUrl?: string, accessToken?: string }} [options]
 *   Credential-Override.
 * @throws {Error} Wenn keine ID angegeben wird.
 * @returns {Promise<object>} Kontextobjekt mit `ancestors` und `descendants`.
 */
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

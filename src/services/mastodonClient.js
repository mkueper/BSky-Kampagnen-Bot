const Mastodon = require("mastodon-api");
const { env } = require("../env");

let client = null;

function normalizeApiUrl(url) {
  if (!url) {
    return url;
  }

  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function resolveConfig(overrides = {}) {
  const base = env.mastodon || {};
  return {
    apiUrl: overrides.apiUrl ?? base.apiUrl,
    accessToken: overrides.accessToken ?? base.accessToken,
  };
}

function hasCredentials(config = env.mastodon) {
  return Boolean(config?.apiUrl && config?.accessToken);
}

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

async function login(overrides = {}) {
  client = createClient(overrides);
  await client.get("accounts/verify_credentials");
  return client;
}

function getClient() {
  if (!client) {
    throw new Error("Mastodon-Client ist nicht initialisiert. Bitte login() aufrufen.");
  }

  return client;
}

async function postStatus(status, options) {
  const activeClient = options ? createClient(options) : getClient();
  const response = await activeClient.post("statuses", { status });
  return response.data;
}

module.exports = {
  login,
  getClient,
  postStatus,
  createClient,
  hasCredentials,
};

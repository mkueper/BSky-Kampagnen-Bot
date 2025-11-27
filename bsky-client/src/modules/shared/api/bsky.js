import { BskyAgent } from '@atproto/api'

const JSON_HEADERS = { 'Content-Type': 'application/json' };

const ensureFetch = () => {
  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch.bind(globalThis);
  }
  throw new Error('Fetch API ist in dieser Umgebung nicht verfuegbar.');
};

const createSearchParams = (init) => {
  if (typeof globalThis.URLSearchParams === 'function') {
    return new globalThis.URLSearchParams(init);
  }
  throw new Error('URLSearchParams ist in dieser Umgebung nicht verfuegbar.');
};

async function requestJson(path, { method = 'GET', body, headers, retries = 1, ...options } = {}) {
  const serializedBody =
    body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body));

  let attempt = 0;
  let lastError;

  while (attempt <= retries) {
    const init = {
      method,
      headers: { ...(headers || {}) },
      ...options,
    };

    if (serializedBody !== undefined) {
      init.body = serializedBody;
      if (!init.headers['Content-Type']) init.headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await ensureFetch()(path, init);

      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        const message = data?.error || `HTTP ${response.status}`;
        const error = new Error(message);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data ?? {};
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === retries) break;
      attempt += 1;
    }
  }

  if (lastError?.message === 'Failed to fetch') {
    const networkError = new Error('Netzwerkfehler beim Kontaktieren des Backends.');
    networkError.cause = lastError;
    throw networkError;
  }

  throw lastError;
}

const GLOBAL_SCOPE = (typeof globalThis === 'object' && globalThis) ? globalThis : undefined;
const DEFAULT_BSKY_SERVICE = 'https://bsky.social';

const noopPushTransport = {
  async register () {
    return { success: false, skipped: true, reason: 'push_transport_disabled' };
  },
  async unregister () {
    return { success: false, skipped: true, reason: 'push_transport_disabled' };
  }
};

const backendPushTransport = {
  async register (payload) {
    return requestJson('/api/bsky/notifications/register-push', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: payload
    });
  },
  async unregister (payload) {
    return requestJson('/api/bsky/notifications/unregister-push', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: payload
    });
  }
};

function isValidPushTransport (transport) {
  if (!transport || typeof transport !== 'object') return false;
  return typeof transport.register === 'function' && typeof transport.unregister === 'function';
}

let configuredPushTransport = null;
let cachedDirectTransport = null;
let cachedDirectSignature = '';

export function configurePushTransport (transport) {
  if (!transport) {
    configuredPushTransport = null;
    return;
  }
  if (!isValidPushTransport(transport)) {
    throw new Error('push transport muss register/unregister bereitstellen');
  }
  configuredPushTransport = transport;
}

function getEnvPushTransportPreference () {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BSKY_PUSH_TRANSPORT) {
      return String(import.meta.env.VITE_BSKY_PUSH_TRANSPORT || '').toLowerCase();
    }
  } catch {
    /* noop */
  }
  return '';
}

function normalizeConfigEntry (value) {
  if (typeof value === 'string') return value.trim();
  if (value == null) return '';
  return String(value).trim();
}

function resolveDirectPushConfig () {
  const envConfig = (() => {
    try {
      if (typeof import.meta === 'undefined' || !import.meta.env) return null;
      const service = normalizeConfigEntry(import.meta.env.VITE_BSKY_DIRECT_SERVICE || DEFAULT_BSKY_SERVICE) || DEFAULT_BSKY_SERVICE;
      const identifier = normalizeConfigEntry(import.meta.env.VITE_BSKY_DIRECT_IDENTIFIER || '');
      const appPassword = normalizeConfigEntry(import.meta.env.VITE_BSKY_DIRECT_APP_PASSWORD || '');
      if (identifier && appPassword) {
        return { service, identifier, appPassword };
      }
      return null;
    } catch {
      return null;
    }
  })();
  if (envConfig) return envConfig;
  const globalConfig = GLOBAL_SCOPE && GLOBAL_SCOPE.__BSKY_DIRECT_PUSH_CONFIG__;
  if (globalConfig && typeof globalConfig === 'object') {
    const service = normalizeConfigEntry(globalConfig.service || DEFAULT_BSKY_SERVICE) || DEFAULT_BSKY_SERVICE;
    const identifier = normalizeConfigEntry(globalConfig.identifier || '');
    const appPassword = normalizeConfigEntry(globalConfig.appPassword || '');
    if (identifier && appPassword) {
      return { service, identifier, appPassword };
    }
  }
  return null;
}

function createDirectSignature (config) {
  if (!config) return '';
  return `${config.service}::${config.identifier}`;
}

function createBskyAgentPushTransport ({ service = DEFAULT_BSKY_SERVICE, identifier, appPassword }) {
  const normalizedService = normalizeConfigEntry(service) || DEFAULT_BSKY_SERVICE;
  const normalizedIdentifier = normalizeConfigEntry(identifier);
  const normalizedPassword = normalizeConfigEntry(appPassword);
  if (!normalizedIdentifier || !normalizedPassword) {
    throw new Error('identifier und appPassword sind für den direkten Push-Transport erforderlich');
  }
  const agent = new BskyAgent({ service: normalizedService });
  let loginPromise = null;
  const ensureLoggedIn = async () => {
    if (agent?.session?.did) return;
    if (!loginPromise) {
      loginPromise = agent.login({ identifier: normalizedIdentifier, password: normalizedPassword })
        .catch((error) => {
          loginPromise = null;
          throw error;
        });
    }
    await loginPromise;
  };
  return {
    async register (payload) {
      await ensureLoggedIn();
      const res = await agent.app.bsky.notification.registerPush(payload);
      return { success: res?.success ?? true };
    },
    async unregister (payload) {
      await ensureLoggedIn();
      const res = await agent.app.bsky.notification.unregisterPush(payload);
      return { success: res?.success ?? true };
    }
  };
}

function getOrCreateDirectTransport () {
  const config = resolveDirectPushConfig();
  if (!config) return null;
  const signature = createDirectSignature(config);
  if (cachedDirectTransport && cachedDirectSignature === signature) {
    return cachedDirectTransport;
  }
  try {
    cachedDirectTransport = createBskyAgentPushTransport(config);
    cachedDirectSignature = signature;
    return cachedDirectTransport;
  } catch (error) {
    const logger = typeof globalThis !== 'undefined' ? globalThis.console : undefined;
    logger?.warn?.('[push] direkter Transport konnte nicht initialisiert werden:', error);
    cachedDirectTransport = null;
    cachedDirectSignature = '';
    return null;
  }
}

function resolveEnvPreferredTransport () {
  const preference = getEnvPushTransportPreference();
  switch (preference) {
    case 'noop':
    case 'disabled':
      return noopPushTransport;
    case 'direct': {
      const direct = getOrCreateDirectTransport();
      if (direct) return direct;
      return backendPushTransport;
    }
    case 'auto': {
      const direct = getOrCreateDirectTransport();
      if (direct) return direct;
      return backendPushTransport;
    }
    case 'backend':
    default:
      return backendPushTransport;
  }
}

function resolvePushTransport () {
  if (configuredPushTransport) return configuredPushTransport;
  const globalTransport = GLOBAL_SCOPE?.__BSKY_PUSH_TRANSPORT__;
  if (isValidPushTransport(globalTransport)) return globalTransport;
  return resolveEnvPreferredTransport();
}

export function getActivePushTransportName () {
  const transport = resolvePushTransport();
  if (transport === configuredPushTransport) return 'custom';
  if (transport === cachedDirectTransport) return 'direct';
  if (transport === noopPushTransport) return 'noop';
  if (transport === backendPushTransport) return 'backend';
  if (transport && GLOBAL_SCOPE?.__BSKY_PUSH_TRANSPORT__ === transport) return 'global';
  return 'custom';
}

export async function fetchTimeline({ tab, feedUri, cursor, limit } = {}) {
  const params = createSearchParams();
  if (feedUri) params.set('feedUri', feedUri);
  else if (tab) params.set('tab', tab);
  if (cursor) params.set('cursor', cursor);
  if (typeof limit === 'number') params.set('limit', String(limit));
  const query = params.toString();
  const data = await requestJson(`/api/bsky/timeline${query ? `?${query}` : ''}`);
  return {
    items: Array.isArray(data?.feed) ? data.feed : [],
    cursor: data?.cursor || null,
  };
}

export async function fetchNotifications({ cursor, markSeen, filter, limit } = {}) {
  const params = createSearchParams();
  if (cursor) params.set('cursor', cursor);
  if (markSeen) params.set('markSeen', 'true');
  if (filter) params.set('filter', filter);
  if (typeof limit === 'number') params.set('limit', String(limit));
  const query = params.toString();
  const data = await requestJson(`/api/bsky/notifications${query ? `?${query}` : ''}`);
  return {
    items: Array.isArray(data?.notifications) ? data.notifications : [],
    cursor: data?.cursor || null,
    unreadCount: Number(data?.unreadCount) || 0,
    seenAt: data?.seenAt || null
  };
}

export async function fetchUnreadNotificationsCount () {
  try {
    const data = await requestJson('/api/bsky/notifications/unread-count')
    return {
      unreadCount: Number(data?.unreadCount) || 0
    }
  } catch (error) {
    if (error?.status === 404) {
      const fallback = await fetchNotifications()
      return {
        unreadCount: Number(fallback?.unreadCount) || 0
      }
    }
    throw error
  }
}

export async function fetchThread(uri) {
  const params = createSearchParams();
  params.set('uri', uri);
  return requestJson(`/api/bsky/thread?${params.toString()}`);
}

export async function fetchBlocks ({ cursor, limit } = {}) {
  const params = createSearchParams()
  if (cursor) params.set('cursor', cursor)
  if (typeof limit === 'number') params.set('limit', String(limit))
  const query = params.toString()
  const data = await requestJson(`/api/bsky/blocks${query ? `?${query}` : ''}`)
  return {
    blocks: Array.isArray(data?.blocks) ? data.blocks : [],
    cursor: data?.cursor || null
  }
}

export async function likePost({ uri, cid }) {
  return requestJson('/api/bsky/like', {
    method: 'POST',
    body: { uri, cid },
    headers: JSON_HEADERS,
  });
}

export async function unlikePost({ likeUri }) {
  return requestJson('/api/bsky/like', {
    method: 'DELETE',
    body: { likeUri },
    headers: JSON_HEADERS,
  });
}

export async function repostPost({ uri, cid }) {
  return requestJson('/api/bsky/repost', {
    method: 'POST',
    body: { uri, cid },
    headers: JSON_HEADERS,
  });
}

export async function unrepostPost({ repostUri }) {
  return requestJson('/api/bsky/repost', {
    method: 'DELETE',
    body: { repostUri },
    headers: JSON_HEADERS,
  });
}

export async function bookmarkPost({ uri, cid }) {
  return requestJson('/api/bsky/bookmark', {
    method: 'POST',
    body: { uri, cid },
    headers: JSON_HEADERS,
  });
}

export async function unbookmarkPost({ uri }) {
  return requestJson('/api/bsky/bookmark', {
    method: 'DELETE',
    body: { uri },
    headers: JSON_HEADERS,
  });
}

export async function fetchReactions({ uri }) {
  const params = createSearchParams({ uri });
  return requestJson(`/api/bsky/reactions?${params.toString()}`);
}

export async function fetchBookmarks({ cursor, limit } = {}) {
  const params = createSearchParams();
  if (cursor) params.set('cursor', cursor);
  if (typeof limit === 'number') params.set('limit', String(limit));
  const query = params.toString();
  const data = await requestJson(`/api/bsky/bookmarks${query ? `?${query}` : ''}`);
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    cursor: data?.cursor || null,
  };
}

export async function searchBsky({ query, type, cursor, limit } = {}) {
  const params = createSearchParams();
  if (query) params.set('q', query);
  if (type) params.set('type', type);
  if (cursor) params.set('cursor', cursor);
  if (typeof limit === 'number') params.set('limit', String(limit));
  const queryString = params.toString();
  const data = await requestJson(`/api/bsky/search${queryString ? `?${queryString}` : ''}`);
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    cursor: data?.cursor || null,
    type: data?.type || type || 'top'
  };
}

export async function fetchProfile(actor) {
  const normalized = String(actor || '').trim();
  if (!normalized) throw new Error('actor erforderlich');
  const params = createSearchParams({ actor: normalized });
  const data = await requestJson(`/api/bsky/profile?${params.toString()}`);
  return data?.profile || null;
}

export async function fetchProfileFeed ({ actor, cursor, limit, filter } = {}) {
  const normalized = typeof actor === 'string' ? actor.trim() : ''
  if (!normalized) throw new Error('actor erforderlich')
  const params = createSearchParams({ actor: normalized })
  if (cursor) params.set('cursor', cursor)
  if (typeof limit === 'number') params.set('limit', String(limit))
  if (filter) params.set('filter', filter)
  const data = await requestJson(`/api/bsky/profile/feed?${params.toString()}`)
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    cursor: data?.cursor || null
  }
}

export async function fetchProfileLikes ({ actor, cursor, limit } = {}) {
  const normalized = typeof actor === 'string' ? actor.trim() : ''
  if (!normalized) throw new Error('actor erforderlich')
  const params = createSearchParams({ actor: normalized })
  if (cursor) params.set('cursor', cursor)
  if (typeof limit === 'number') params.set('limit', String(limit))
  const data = await requestJson(`/api/bsky/profile/likes?${params.toString()}`)
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    cursor: data?.cursor || null
  }
}

export async function fetchFeeds () {
  const data = await requestJson('/api/bsky/feeds');
  return {
    official: Array.isArray(data?.official) ? data.official : [],
    pinned: Array.isArray(data?.pinned) ? data.pinned : [],
    saved: Array.isArray(data?.saved) ? data.saved : [],
    errors: Array.isArray(data?.errors) ? data.errors : [],
  };
}

export async function pinFeed ({ feedUri }) {
  if (!feedUri) throw new Error('feedUri erforderlich');
  return requestJson('/api/bsky/feeds/pin', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: { feedUri }
  });
}

export async function unpinFeed ({ feedUri }) {
  if (!feedUri) throw new Error('feedUri erforderlich');
  return requestJson('/api/bsky/feeds/pin', {
    method: 'DELETE',
    headers: JSON_HEADERS,
    body: { feedUri }
  });
}

export async function reorderPinnedFeeds ({ order }) {
  if (!Array.isArray(order) || order.length === 0) {
    throw new Error('order erforderlich');
  }
  return requestJson('/api/bsky/feeds/pin-order', {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: { order }
  });
}

function ensurePushPayload({ serviceDid, token, platform, appId }) {
  const payload = {
    serviceDid: typeof serviceDid === 'string' ? serviceDid.trim() : '',
    token: typeof token === 'string' ? token.trim() : '',
    platform: typeof platform === 'string' ? platform.trim() : '',
    appId: typeof appId === 'string' ? appId.trim() : ''
  };
  if (!payload.serviceDid || !payload.token || !payload.platform || !payload.appId) {
    throw new Error('serviceDid, token, platform und appId erforderlich');
  }
  return payload;
}

function parseBooleanFlag(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  }
  return undefined;
}

export async function registerPushSubscription({ serviceDid, token, platform, appId, ageRestricted } = {}) {
  const payload = ensurePushPayload({ serviceDid, token, platform, appId });
  const flag = parseBooleanFlag(ageRestricted);
  if (flag !== undefined) payload.ageRestricted = flag;
  const transport = resolvePushTransport();
  return transport.register(payload, { action: 'register' });
}

export async function unregisterPushSubscription({ serviceDid, token, platform, appId } = {}) {
  const payload = ensurePushPayload({ serviceDid, token, platform, appId });
  const transport = resolvePushTransport();
  return transport.unregister(payload, { action: 'unregister' });
}

export { requestJson, createBskyAgentPushTransport };

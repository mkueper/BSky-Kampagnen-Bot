// src/services/blueskyClient.js
/**
 * Wrapper um den Bluesky `AtpAgent`.
 *
 * Stellt Funktionen für Login, Posten sowie das Abfragen von Reaktionen und
 * Replies bereit. Die Agent-Instanz wird einmalig erzeugt und wiederverwendet,
 * um Rate-Limits zu schonen.
 */
const { env } = require("@env");
const { createLogger } = require("@utils/logging");
const log = createLogger('bluesky');

const { serverUrl, identifier, appPassword } = env.bluesky;
const { AtpAgent } = require("@atproto/api");

const agent = new AtpAgent({ service: serverUrl });
let loginPromise = null;
let refreshPromise = null;
let refreshTimer = null;
const DEFAULT_REFRESH_INTERVAL_MS = 60 * 1000; // 1 Minute
const sessionRefreshInterval =
  Number(process.env.BLUESKY_SESSION_REFRESH_INTERVAL_MS) ||
  DEFAULT_REFRESH_INTERVAL_MS;

const OFFICIAL_FEED_GENERATORS = {
  discover: 'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot',
  mutuals: 'at://did:plc:tenurhgjptubkk5zf5qhi3og/app.bsky.feed.generator/mutuals',
  'friends-popular': 'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/with-friends',
  'best-of-follows': 'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/best-of-follows'
};
const TIMELINE_FOLLOWING_VALUE = 'following';

function createStatusError (statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}


/**
 * Stellt sicher, dass der Agent eine gültige Session besitzt, indem er sich mit
 * den in `.env` hinterlegten App-Credentials bei Bluesky anmeldet.
 *
 * @throws {Error} Wenn BLUESKY_IDENTIFIER oder BLUESKY_APP_PASSWORD fehlen bzw. der Login scheitert.
 */
async function login() {
  if (!identifier) {
    throw new Error("BLUESKY_IDENTIFIER fehlt. Bitte .env prüfen.");
  }

  if (!appPassword) {
    throw new Error("BLUESKY_APP_PASSWORD fehlt. Bitte .env prüfen.");
  }

  try {
    await agent.login({ identifier, password: appPassword });
    log.info("Bluesky Login ok", { serverUrl, did: agent?.session?.did || null, identifier });
    scheduleSessionRefresh();
  } catch (e) {
    log.error("Bluesky Login fehlgeschlagen", { error: e?.message || String(e) });
    throw e;
  }
}

/**
 * Wartet (falls nötig) auf einen laufenden Login und sorgt dafür, dass alle
 * API-Aufrufe nur mit gültiger Session ausgeführt werden.
 */
async function ensureLoggedIn() {
  if (agent?.session?.did) {
    return;
  }

  if (!loginPromise) {
    loginPromise = login().catch((error) => {
      loginPromise = null;
      throw error;
    });
  }

  await loginPromise;
}

/**
 * Plant in festen Abständen ein Session-Refresh ein. Dadurch bleiben Tokens
 * auch bei langen Laufzeiten gültig, ohne dass alle Requests neu einloggen müssen.
 */
function scheduleSessionRefresh () {
  if (!sessionRefreshInterval || sessionRefreshInterval <= 0) return;
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(async () => {
    try {
      await refreshSession();
    } catch (error) {
      log.warn('Bluesky Session-Refresh fehlgeschlagen', { error: error?.message || String(error) });
    } finally {
      scheduleSessionRefresh();
    }
  }, sessionRefreshInterval);
  if (typeof refreshTimer.unref === 'function') refreshTimer.unref();
}

/**
 * Erzwingt ein sofortiges Refresh der Bluesky-Session. Fällt auf einen
 * vollständigen Re-Login zurück, wenn das Refresh fehlschlägt.
 */
async function refreshSession () {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    if (!agent?.session?.did) {
      await ensureLoggedIn();
      return;
    }
    if (typeof agent.sessionManager?.refreshSession === 'function') {
      await agent.sessionManager.refreshSession();
      log.debug('Bluesky Session erneuert');
      return;
    }
    // Fallback: Login erneut ausführen
    await login();
  })()
    .catch(async (error) => {
      log.warn('Bluesky Session konnte nicht erneuert werden, versuche Re-Login', { error: error?.message || String(error) });
      // Reset Session, damit ensureLoggedIn einen frischen Login erzwingt
      try {
        await agent.logout();
      } catch (logoutError) {
        log.debug('Logout nach fehlgeschlagenem Refresh nicht möglich', { error: logoutError?.message || String(logoutError) });
      }
      await ensureLoggedIn();
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

/**
 * Veröffentlicht einen einfachen Text-Skeet im eingeloggten Account.
 *
 * @param {string} text Inhalt des Skeets.
 * @returns {Promise<object|null>} Die API-Antwort (inkl. URI/CID) oder `null`, falls keine Daten vorliegen.
 */
async function postSkeet(text) {
  await ensureLoggedIn();
  const post = await agent.app.bsky.feed.post.create({
    repo: agent.session.did,
    record: {
      text,
      createdAt: new Date().toISOString(),
      $type: "app.bsky.feed.post",
    },
  });
  try {
    const uri = post?.uri || post?.data?.uri || null;
    log.info("Bluesky Post gesendet", { uri });
  } catch (e) { log.error("Bluesky Post senden fehlgeschlagen", { error: e?.message || String(e) }); }
  return post?.data ?? post ?? null;
}

/**
 * Ruft Likes und Reposts zu einem Post ab.
 *
 * @param {string} postUri at:// URI des Posts.
 * @returns {Promise<{likes: Array, reposts: Array}>} Objekt mit Rohdaten der API.
 */
async function getReactions(postUri) {
  await ensureLoggedIn();
  const likes = await agent.app.bsky.feed.getLikes({ uri: postUri });
  const reposts = await agent.app.bsky.feed.getRepostedBy({ uri: postUri });
  const out = { likes: likes.data.likes, reposts: reposts.data.repostedBy };
  try {
    const likeCount = Array.isArray(out.likes) ? out.likes.length : 0;
    const repostCount = Array.isArray(out.reposts) ? out.reposts.length : 0;
    log.debug("Bluesky Reactions geladen", { uri: postUri, likes: likeCount, reposts: repostCount });
  } catch (e) { log.error("Bluesky Reactions laden fehlgeschlagen", { error: e?.message || String(e) }); }
  return out;
}

/**
 * Lädt einen vollständigen Post-Thread (inkl. Antworten).
 *
 * @param {string} postUri at:// URI des Root-Posts.
 * @returns {Promise<object>} Struktur, die direkt an die UI weitergereicht werden kann.
 */
async function getReplies(postUri) {
  await ensureLoggedIn();
  const thread = await agent.app.bsky.feed.getPostThread({ uri: postUri });
  try {
    const repliesLen = Array.isArray(thread?.data?.thread?.replies) ? thread.data.thread.replies.length : 0;
    log.debug("Bluesky Thread geladen", { uri: postUri, repliesTopLevel: repliesLen });
  } catch (e) { log.error("Bluesky Thread laden fehlgeschlagen", { error: e?.message || String(e) }); }
  return thread.data.thread;
}

/**
 * Listet Benachrichtigungen des eingeloggten Accounts.
 *
 * @param {{limit?: number, cursor?: string}} [opts]
 */
async function getNotifications ({ limit = 30, cursor } = {}) {
  await ensureLoggedIn();
  const res = await agent.app.bsky.notification.listNotifications({ limit, cursor });
  return res?.data ?? null;
}

/**
 * Markiert alle Benachrichtigungen als „gesehen“.
 *
 * @param {string} [seenAt] ISO-Timestamp, standardmäßig `now`.
 */
async function markNotificationsSeen (seenAt = new Date().toISOString()) {
  await ensureLoggedIn();
  await agent.app.bsky.notification.updateSeen({ seenAt });
}

/**
 * Lädt Posts anhand ihrer at:// URIs in 25er-Chunks.
 *
 * @param {string[]} uris Liste von at:// URIs
 * @returns {Promise<object[]>} Aggregierte Posts
 */
async function getPostsByUri (uris = []) {
  await ensureLoggedIn();
  const list = Array.isArray(uris) ? uris.filter(Boolean) : [];
  if (!list.length) return [];
  const chunkSize = 25;
  const posts = [];
  for (let i = 0; i < list.length; i += chunkSize) {
    const chunk = list.slice(i, i + chunkSize);
    try {
      const res = await agent.app.bsky.feed.getPosts({ uris: chunk });
      if (Array.isArray(res?.data?.posts)) posts.push(...res.data.posts);
    } catch (error) {
      log.warn('getPosts chunk failed', { error: error?.message || String(error), size: chunk.length });
    }
  }
  return posts;
}

async function getPreferencesWrapper () {
  await ensureLoggedIn();
  if (typeof agent.getPreferences !== 'function') {
    throw new Error('Bluesky SDK unterstützt getPreferences nicht.');
  }
  return agent.getPreferences();
}

async function getSavedFeedsPreferenceWrapper () {
  const prefs = await getPreferencesWrapper();
  return Array.isArray(prefs?.savedFeeds) ? prefs.savedFeeds : [];
}

async function getFeedGeneratorInfoWrapper (feedUri) {
  const normalized = String(feedUri || '').trim();
  if (!normalized) throw createStatusError(400, 'feedUri erforderlich');
  await ensureLoggedIn();
  const res = await agent.app.bsky.feed.getFeedGenerator({ feed: normalized });
  return res?.data ?? null;
}

async function overwriteSavedFeedsWrapper (entries = []) {
  await ensureLoggedIn();
  if (typeof agent.overwriteSavedFeeds !== 'function') {
    throw new Error('Bluesky SDK unterstützt overwriteSavedFeeds nicht.');
  }
  return agent.overwriteSavedFeeds(entries);
}

async function updateSavedFeedsWrapper (entries = []) {
  await ensureLoggedIn();
  if (typeof agent.updateSavedFeeds !== 'function') {
    throw new Error('Bluesky SDK unterstützt updateSavedFeeds nicht.');
  }
  return agent.updateSavedFeeds(entries);
}

async function addSavedFeedsWrapper (entries = []) {
  await ensureLoggedIn();
  if (typeof agent.addSavedFeeds !== 'function') {
    throw new Error('Bluesky SDK unterstützt addSavedFeeds nicht.');
  }
  return agent.addSavedFeeds(entries);
}

async function pinSavedFeed (feedUri, { type = 'feed' } = {}) {
  const normalized = type === 'feed' ? String(feedUri || '').trim() : String(feedUri || '').trim();
  if (type === 'feed' && !normalized) {
    throw createStatusError(400, 'feedUri erforderlich');
  }
  let savedFeeds = await getSavedFeedsPreferenceWrapper();
  const target = findSavedFeed(savedFeeds, type, normalized);
  let changed = false;
  if (!target) {
    savedFeeds = await addSavedFeedsWrapper([{ type, value: normalized, pinned: true }]);
    changed = true;
  } else if (!target.pinned) {
    savedFeeds = await updateSavedFeedsWrapper([{ ...target, pinned: true }]);
    changed = true;
  }
  if (!changed) return savedFeeds;
  return persistOrderedFeeds(savedFeeds);
}

async function unpinSavedFeed (feedUri) {
  const normalized = String(feedUri || '').trim();
  if (!normalized) {
    throw createStatusError(400, 'feedUri erforderlich');
  }
  const savedFeeds = await getSavedFeedsPreferenceWrapper();
  const target = findSavedFeed(savedFeeds, 'feed', normalized);
  if (!target) {
    throw createStatusError(404, 'Feed nicht gefunden.');
  }
  if (!target.pinned) return savedFeeds;
  const updated = await updateSavedFeedsWrapper([{ ...target, pinned: false }]);
  return persistOrderedFeeds(updated);
}

async function reorderPinnedFeeds (orderedIds = []) {
  const savedFeeds = await getSavedFeedsPreferenceWrapper();
  return persistOrderedFeeds(savedFeeds, orderedIds);
}

function findSavedFeed (savedFeeds = [], type, value) {
  return savedFeeds.find((entry) => entry?.type === type && entry?.value === value) || null;
}

function persistOrderedFeeds (savedFeeds = [], pinnedOrder = []) {
  const ordered = orderSavedFeeds(savedFeeds, pinnedOrder);
  return overwriteSavedFeedsWrapper(ordered);
}

function orderSavedFeeds (savedFeeds = [], pinnedOrder = []) {
  const list = Array.isArray(savedFeeds) ? savedFeeds.slice() : [];
  const pinned = list.filter((entry) => entry?.pinned);
  const others = list.filter((entry) => !entry?.pinned);
  const pinnedMap = new Map();
  pinned.forEach((entry) => {
    if (entry?.id) pinnedMap.set(entry.id, entry);
  });
  const seen = new Set();
  const orderedPinned = [];
  const addPinned = (entry) => {
    if (!entry || !entry.id || seen.has(entry.id)) return;
    orderedPinned.push(entry);
    seen.add(entry.id);
  };
  const following = pinned.find((entry) => entry.type === 'timeline' && entry.value === TIMELINE_FOLLOWING_VALUE);
  addPinned(following);
  pinnedOrder.forEach((id) => {
    const entry = typeof id === 'string' ? pinnedMap.get(id) : undefined;
    if (entry) addPinned(entry);
  });
  pinned.forEach((entry) => addPinned(entry));
  return orderedPinned.concat(others);
}

module.exports = {
  login,
  postSkeet,
  getReactions,
  getReplies,
  getNotifications,
  markNotificationsSeen,
  getPostsByUri,
  FEED_GENERATORS: OFFICIAL_FEED_GENERATORS,
  getPreferences: getPreferencesWrapper,
  getSavedFeedsPreference: getSavedFeedsPreferenceWrapper,
  getFeedGeneratorInfo: getFeedGeneratorInfoWrapper,
  overwriteSavedFeeds: overwriteSavedFeedsWrapper,
  updateSavedFeeds: updateSavedFeedsWrapper,
  addSavedFeeds: addSavedFeedsWrapper,
  pinSavedFeed,
  unpinSavedFeed,
  reorderPinnedFeeds,
  /**
   * Holt die persönliche Timeline des eingeloggten Accounts (Home-Feed).
   *
   * @param {{limit?: number, cursor?: string}} [opts]
   */
  async getTimeline({ limit = 30, cursor } = {}) {
    await ensureLoggedIn();
    const res = await agent.app.bsky.feed.getTimeline({ limit, cursor });
    return res?.data ?? null;
  },
  /**
   * Lädt den Inhalt eines offiziellen Feed-Generators (Discover, Mutuals, …).
   *
   * @param {string} feedUri at:// URI des Generators
   * @param {{limit?: number, cursor?: string}} opts
   */
  async getFeedGenerator(feedUri, { limit = 30, cursor } = {}) {
    if (!feedUri) throw new Error('feedUri erforderlich');
    await ensureLoggedIn();
    const res = await agent.app.bsky.feed.getFeed({ feed: feedUri, limit, cursor });
    return res?.data ?? null;
  },
  /**
   * Setzt ein Like auf den angegebenen Post.
   * @param {string} uri at:// URI des Posts
   * @param {string} cid CID des Posts
   * @returns {Promise<string>} URI des Like-Records
   */
  async likePost(uri, cid) {
    await ensureLoggedIn();
    const res = await agent.com.atproto.repo.createRecord({
      repo: agent.session.did,
      collection: 'app.bsky.feed.like',
      record: {
        subject: { uri, cid },
        createdAt: new Date().toISOString(),
      }
    })
    return res?.uri || res?.data?.uri || null;
  },
  /**
   * Entfernt ein Like-Record.
   * @param {string} likeUri at:// URI des Like-Records
   */
  async unlikePost(likeUri) {
    await ensureLoggedIn();
    const parts = String(likeUri || '').split('/');
    const rkey = parts[parts.length - 1];
    await agent.com.atproto.repo.deleteRecord({
      repo: agent.session.did,
      collection: 'app.bsky.feed.like',
      rkey
    })
  },
  /**
   * Erstellt einen Repost-Record für den angegebenen Post.
   * @param {string} uri at:// URI des Posts
   * @param {string} cid CID des Posts
   * @returns {Promise<string>} URI des Repost-Records
   */
  async repostPost(uri, cid) {
    await ensureLoggedIn();
    const res = await agent.com.atproto.repo.createRecord({
      repo: agent.session.did,
      collection: 'app.bsky.feed.repost',
      record: {
        subject: { uri, cid },
        createdAt: new Date().toISOString(),
      }
    })
    return res?.uri || res?.data?.uri || null;
  },
  /**
   * Entfernt einen Repost-Record.
   * @param {string} repostUri at:// URI des Repost-Records
   */
  async unrepostPost(repostUri) {
    await ensureLoggedIn();
    const parts = String(repostUri || '').split('/');
    const rkey = parts[parts.length - 1];
    await agent.com.atproto.repo.deleteRecord({
      repo: agent.session.did,
      collection: 'app.bsky.feed.repost',
      rkey
    })
  },
  /**
   * Durchsucht Bluesky-Posts (Tabs „Top“/„Latest“ im Client).
   *
   * @param {{q?: string, limit?: number, cursor?: string, sort?: 'top'|'latest'}} [opts]
   */
  async searchPosts({ q, limit = 25, cursor, sort } = {}) {
    await ensureLoggedIn();
    const res = await agent.app.bsky.feed.searchPosts({
      q,
      limit,
      cursor,
      sort
    });
    return res?.data ?? { posts: [], cursor: null };
  },
  /**
   * Durchsucht Bluesky-Handles/Accounts („People“-Tab).
   *
   * @param {{q?: string, limit?: number, cursor?: string}} [opts]
   */
  async searchProfiles({ q, limit = 25, cursor } = {}) {
    await ensureLoggedIn();
    const res = await agent.app.bsky.actor.searchActors({
      q,
      limit,
      cursor
    });
    return res?.data ?? { actors: [], cursor: null };
  },
  /**
   * Holt ein Profil anhand DID/Handle.
   *
   * @param {string} actor Handle oder DID
   */
  async getProfile(actor) {
    const normalized = String(actor || '').trim();
    if (!normalized) {
      throw new Error('actor erforderlich');
    }
    await ensureLoggedIn();
    const res = await agent.app.bsky.actor.getProfile({ actor: normalized });
    return res?.data ?? null;
  },
  /**
   * Durchsucht Feed-Generatoren („Feeds“-Tab). Nutzt das neue API, fällt aber
   * bei älteren SDKs auf einen generischen XRPC-Call zurück.
   *
   * @param {{q?: string, limit?: number, cursor?: string}} [opts]
   */
  async searchFeeds({ q, limit = 25, cursor } = {}) {
    await ensureLoggedIn();
    const params = { q, limit, cursor };
    // Neuere Versionen von @atproto/api stellen searchFeedGenerators bereit.
    if (typeof agent.app?.bsky?.feed?.searchFeedGenerators === 'function') {
      const res = await agent.app.bsky.feed.searchFeedGenerators(params);
      return res?.data ?? { feeds: [], cursor: null };
    }
    // Rückfall: direkte XRPC-Call
    const res = await agent.call('app.bsky.feed.searchFeedGenerators', params);
    return res?.data ?? { feeds: [], cursor: null };
  },
};

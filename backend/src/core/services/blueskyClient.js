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


/**
 * Meldet den Agenten mit den hinterlegten App-Credentials an.
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
 * Postet einen einfachen Text-Skeet und gibt die API-Antwort zurück.
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
 * Holt Likes/Reposts zu einem Beitrag und aggregiert die Antwort.
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
 * Ruft den kompletten Thread (inkl. Replies) zu einem Post ab.
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

async function getNotifications ({ limit = 30, cursor } = {}) {
  await ensureLoggedIn();
  const res = await agent.app.bsky.notification.listNotifications({ limit, cursor });
  return res?.data ?? null;
}

async function markNotificationsSeen (seenAt = new Date().toISOString()) {
  await ensureLoggedIn();
  await agent.app.bsky.notification.updateSeen({ seenAt });
}

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

module.exports = {
  login,
  postSkeet,
  getReactions,
  getReplies,
  getNotifications,
  markNotificationsSeen,
  getPostsByUri,
  FEED_GENERATORS: OFFICIAL_FEED_GENERATORS,
  /**
   * Liefert die persönliche Timeline des eingeloggten Accounts
   */
  async getTimeline({ limit = 30, cursor } = {}) {
    await ensureLoggedIn();
    const res = await agent.app.bsky.feed.getTimeline({ limit, cursor });
    return res?.data ?? null;
  },
  /**
   * Lädt einen offiziellen Feed-Generator (z. B. Discover/Mutuals)
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
  async searchProfiles({ q, limit = 25, cursor } = {}) {
    await ensureLoggedIn();
    const res = await agent.app.bsky.actor.searchActors({
      q,
      limit,
      cursor
    });
    return res?.data ?? { actors: [], cursor: null };
  },
  async getProfile(actor) {
    const normalized = String(actor || '').trim();
    if (!normalized) {
      throw new Error('actor erforderlich');
    }
    await ensureLoggedIn();
    const res = await agent.app.bsky.actor.getProfile({ actor: normalized });
    return res?.data ?? null;
  },
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

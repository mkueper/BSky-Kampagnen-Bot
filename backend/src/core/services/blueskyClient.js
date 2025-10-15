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

module.exports = {
  login,
  postSkeet,
  getReactions,
  getReplies,
  /**
   * Liefert die persönliche Timeline des eingeloggten Accounts
   */
  async getTimeline({ limit = 30, cursor } = {}) {
    await ensureLoggedIn();
    const res = await agent.app.bsky.feed.getTimeline({ limit, cursor });
    return res?.data ?? null;
  },
};

// src/services/blueskyClient.js
/**
 * Wrapper um den Bluesky `AtpAgent`.
 *
 * Stellt Funktionen für Login, Posten sowie das Abfragen von Reaktionen und
 * Replies bereit. Die Agent-Instanz wird einmalig erzeugt und wiederverwendet,
 * um Rate-Limits zu schonen.
 */
const { env } = require("../env");

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

  console.log("Bluesky-Login mit bereitgestellten Zugangsdaten gestartet");
  await agent.login({ identifier, password: appPassword });
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
  return post.data;
}

/**
 * Holt Likes/Reposts zu einem Beitrag und aggregiert die Antwort.
 */
async function getReactions(postUri) {
  await ensureLoggedIn();
  const likes = await agent.app.bsky.feed.getLikes({ uri: postUri });
  const reposts = await agent.app.bsky.feed.getRepostedBy({ uri: postUri });

  return { likes: likes.data.likes, reposts: reposts.data.repostedBy };
}

/**
 * Ruft den kompletten Thread (inkl. Replies) zu einem Post ab.
 */
async function getReplies(postUri) {
  await ensureLoggedIn();
  const thread = await agent.app.bsky.feed.getPostThread({ uri: postUri });
  return thread.data.thread;
}

module.exports = {
  login,
  postSkeet,
  getReactions,
  getReplies,
};

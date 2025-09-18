const { env } = require("../env");

const { serverUrl, identifier, appPassword } = env.bluesky;
const { AtpAgent } = require("@atproto/api");

const agent = new AtpAgent({ service: serverUrl });


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

async function postSkeet(text) {
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

async function getReactions(postUri) {
  const likes = await agent.app.bsky.feed.getLikes({ uri: postUri });
  const reposts = await agent.app.bsky.feed.getRepostedBy({ uri: postUri });

  return { likes: likes.data.likes, reposts: reposts.data.repostedBy };
}

async function getReplies(postUri) {
  const thread = await agent.app.bsky.feed.getPostThread({ uri: postUri });
  return thread.data.thread;
}

module.exports = {
  login,
  postSkeet,
  getReactions,
  getReplies,
};

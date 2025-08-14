const { env } = require("../env");

const { serverUrl, identifier, appPassword } = env.bluesky;
const { AtpAgent } = require("@atproto/api");

const agent = new AtpAgent({ service: serverUrl });


async function login() {
  console.log("identifier:", identifier);
  console.log("password:", appPassword ? "[gesetzt]" : "[FEHLT]");
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

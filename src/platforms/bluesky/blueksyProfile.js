const { countGraphemesSync } = require("../../utils/graphemes");
const { BskyAgent, RichText } = require("@atproto/api");

/**
 * Erwartete env-Felder:
 *  - serverUrl: string (z. B. https://bsky.social)
 *  - identifier: string (Handle oder E-Mail)
 *  - appPassword: string (App Password)
 */

/**
 * @typedef {Object} BlueskyEnv
 * @property {string} serverUrl
 * @property {string} identifier
 * @property {string} appPassword
 */

async function createAgent(env) {
  const agent = new BskyAgent({ service: env.serverUrl });
  await agent.login({
    identifier: env.identifier,
    password: env.appPassword,
  });
  return agent;
}

const blueskyProfile = {
  id: "bluesky",
  displayName: "Bluesky",
  maxChars: 300,
  countMethod: "graphemes",
  description: "Bluesky-Limit (Unicode-Grapheme)",

  validate(input) {
    const text = typeof input.content === "string" ? input.content : "";
    const len = countGraphemesSync(text);
    const remaining = this.maxChars - len;
    return {
      ok: remaining >= 0,
      remaining,
      errors: remaining >= 0 ? [] : [`Text ist ${-remaining} Zeichen zu lang (Limit ${this.maxChars}).`],
    };
  },

  normalizeContent(text) {
    // Optional: zero-width chars o. Ä. entfernen
    return text.replace(/[\u200B-\u200D\uFEFF]/g, "");
  },

  toPostPayload(input) {
    const text = this.normalizeContent ? this.normalizeContent(input.content) : input.content;
    return { text };
  },

  async post(payload, env) {
    if (!env?.serverUrl || !env?.identifier || !env?.appPassword) {
      throw new Error("Bluesky-Env unvollständig (serverUrl, identifier, appPassword erforderlich).");
    }

    const agent = await createAgent(env);

    const text = payload.text;
    const rt = new RichText({ text });
    await rt.detectFacets(agent);

    const res = await agent.post({
      text: rt.text,
      facets: rt.facets,
      createdAt: new Date().toISOString(),
    });

    return {
      uri: res.uri,
      postedAt: new Date(),
      raw: res,
    };
  },
};

module.exports = blueskyProfile;

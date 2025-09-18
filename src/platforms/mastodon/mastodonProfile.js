const { countGraphemesSync } = require("../../utils/graphemes");
const { createClient } = require("../../services/mastodonClient");

/**
 * Erwartete env-Felder:
 *  - apiUrl: string (z. B. https://mastodon.social)
 *  - accessToken: string (persönlicher Access Token)
 */

/**
 * @typedef {Object} MastodonEnv
 * @property {string} apiUrl
 * @property {string} accessToken
 */

const mastodonProfile = {
  id: "mastodon",
  displayName: "Mastodon",
  maxChars: 500,
  countMethod: "graphemes",
  description: "Mastodon-Limit (Unicode-Grapheme)",

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
    return text.replace(/[\u200B-\u200D\uFEFF]/g, "");
  },

  toPostPayload(input) {
    const text = this.normalizeContent ? this.normalizeContent(input.content) : input.content;
    return { status: text };
  },

  async post(payload, env) {
    if (!env?.apiUrl || !env?.accessToken) {
      throw new Error("Mastodon-Env unvollständig (apiUrl, accessToken erforderlich).");
    }

    const client = createClient(env);
    const res = await client.post("statuses", payload);

    return {
      uri: res.data?.url || "",
      postedAt: new Date(),
      raw: res.data,
    };
  },
};

module.exports = mastodonProfile;

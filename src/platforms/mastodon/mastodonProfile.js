const { countGraphemesSync } = require("../../utils/graphemes");
const { createClient } = require("../../services/mastodonClient");

function resolveStatusId(input) {
  if (!input) {
    return null;
  }

  if (input.statusId) {
    return String(input.statusId);
  }

  if (input.uri) {
    const match = String(input.uri).match(/\/([A-Za-z0-9]+)(?:$|[/?#])/);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Plattformprofil für Mastodon.
 *
 * Spiegelt denselben Aufbau wie das Bluesky-Profil wider, so dass das
 * Dashboard und Scheduler die Plattformen polymorph behandeln können.
 */

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

/**
 * Profil-Definition für Mastodon; wird vom Registry-System geladen.
 */
const mastodonProfile = {
  id: "mastodon",
  displayName: "Mastodon",
  maxChars: 500,
  countMethod: "graphemes",
  description: "Mastodon-Limit (Unicode-Grapheme)",

  /**
   * Validiert die Beitragslänge anhand des Mastodon-Limits.
   */
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

  /**
   * Entfernt Zero-Width-Zeichen, um böse Überraschungen beim Posten zu
   * vermeiden.
   */
  normalizeContent(text) {
    return text.replace(/[\u200B-\u200D\uFEFF]/g, "");
  },

  /**
   * Stellt die Struktur bereit, die Mastodon von der API erwartet.
   */
  toPostPayload(input) {
    const text = this.normalizeContent ? this.normalizeContent(input.content) : input.content;
    const payload = { status: text };
    const reply = input.reply;
    const inReplyToId = reply?.parent?.statusId || reply?.inReplyToId;
    if (inReplyToId) {
      payload.in_reply_to_id = inReplyToId;
    }
    return payload;
  },

  /**
   * Sendet den Beitrag an die Mastodon-API.
   */
  async post(payload, env) {
    if (!env?.apiUrl || !env?.accessToken) {
      throw new Error("Mastodon-Env unvollständig (apiUrl, accessToken erforderlich).");
    }

    const client = createClient(env);
    const res = await client.post("statuses", payload);

    return {
      uri: res.data?.url || "",
      statusId: res.data?.id ? String(res.data.id) : "",
      postedAt: new Date(),
      raw: res.data,
    };
  },

  async delete(payload, env) {
    if (!env?.apiUrl || !env?.accessToken) {
      throw new Error("Mastodon-Env unvollständig (apiUrl, accessToken erforderlich).");
    }

    const statusId = resolveStatusId(payload);
    if (!statusId) {
      throw new Error('Status-ID zum Löschen fehlt.');
    }

    const client = createClient(env);
    await client.delete(`statuses/${statusId}`);
    return { statusId };
  },
};

module.exports = mastodonProfile;

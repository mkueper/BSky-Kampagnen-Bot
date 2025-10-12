const { countGraphemesSync } = require("@utils/graphemes");
const { createLogger } = require("@utils/logging");
const log = createLogger('platform:mastodon');

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
    if (Array.isArray(input.media) && input.media.length > 0) {
      payload.media = input.media.slice(0, 4);
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

    // Lazy import to avoid requiring optional deps during unit tests
    const { createClient, uploadMedia } = require("@core/services/mastodonClient");
    const client = createClient(env);
    const mediaItems = Array.isArray(payload.media) ? payload.media : [];
    let media_ids = undefined;
    if (mediaItems.length > 0) {
      const ids = [];
      for (const m of mediaItems) {
        try {
          const id = await uploadMedia(m.path, m.altText || '', env);
          if (id) ids.push(id);
        } catch (e) {
          log.warn('Mastodon Medien-Upload fehlgeschlagen', { error: e?.message || String(e) });
        }
      }
      if (ids.length > 0) media_ids = ids;
    }

    const body = { status: payload.status };
    if (payload.in_reply_to_id) body.in_reply_to_id = payload.in_reply_to_id;
    if (media_ids) body.media_ids = media_ids;

    const res = await client.post("statuses", body);

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

    const { createClient } = require("@core/services/mastodonClient");
    const client = createClient(env);
    await client.delete(`statuses/${statusId}`);
    return { statusId };
  },
};

module.exports = mastodonProfile;

const { countGraphemesSync } = require("@utils/graphemes");
const { createLogger } = require("@utils/logging");
const log = createLogger('platform:bluesky');

/**
 * Plattformprofil für Bluesky.
 *
 * Die Profile kapseln plattformspezifische Regeln (Zeichenlimit,
 * Normalisierung, Posting) und werden über das Registry-System geladen. Damit
 * können neue Plattformen einfach ergänzt werden.
 */

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

/**
 * Erstellt einen authentifizierten Bluesky-Agenten für API-Aufrufe.
 *
 * @param {BlueskyEnv} env - Konfigurationswerte aus .env bzw. Datenbank
 * @returns {Promise<BskyAgent>}
 */
// Cache, damit wir nicht für jede Anfrage einen neuen Agenten aufbauen müssen.
const agentCache = new Map(); // key -> { agent, appPassword, promise }

function buildCacheKey(env) {
  return `${env.serverUrl}::${env.identifier}`;
}

function isAgentSessionActive(agent) {
  return Boolean(agent?.session?.did);
}

async function createAgent(env) {
  // Lazy import to avoid requiring optional deps during unit tests
  const { BskyAgent } = require("@atproto/api");
  const agent = new BskyAgent({ service: env.serverUrl });
  await agent.login({
    identifier: env.identifier,
    password: env.appPassword,
  });
  return agent;
}

async function getAgent(env) {
  const key = buildCacheKey(env);
  const cached = agentCache.get(key);
  if (
    cached?.agent &&
    cached.appPassword === env.appPassword &&
    isAgentSessionActive(cached.agent)
  ) {
    return cached.agent;
  }
  if (cached?.promise) {
    return cached.promise;
  }

  const promise = createAgent(env)
    .then((agent) => {
      agentCache.set(key, { agent, appPassword: env.appPassword });
      return agent;
    })
    .catch((error) => {
      agentCache.delete(key);
      throw error;
    });

  agentCache.set(key, { promise, appPassword: env.appPassword });
  return promise;
}

/**
 * Profil-Definition, die vom Plattform-Registry geladen wird.
 */
const blueskyProfile = {
  id: "bluesky",
  displayName: "Bluesky",
  maxChars: 300,
  countMethod: "graphemes",
  description: "Bluesky-Limit (Unicode-Grapheme)",

  /**
   * Prüft, ob der Text ins Bluesky-Limit passt.
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
   * Entfernt Zero-Width-Zeichen, damit das gepostete Resultat dem sichtbaren
   * Entwurf entspricht.
   */
  normalizeContent(text) {
    return text.replace(/[\u200B-\u200D\uFEFF]/g, "");
  },

  /**
   * Erstellt den finalen Payload für den Post-Endpunkt.
   */
  toPostPayload(input) {
    const text = this.normalizeContent ? this.normalizeContent(input.content) : input.content;
    const payload = { text };
    if (Array.isArray(input.media) && input.media.length > 0) {
      payload.media = input.media.slice(0, 4);
    }
    if (input.reply && input.reply.root && input.reply.parent) {
      payload.reply = {
        root: {
          uri: input.reply.root.uri,
          cid: input.reply.root.cid,
        },
        parent: {
          uri: input.reply.parent.uri,
          cid: input.reply.parent.cid,
        },
      };
    }
    if (input.quote && input.quote.uri && input.quote.cid) {
      payload.quote = {
        uri: input.quote.uri,
        cid: input.quote.cid,
      };
    }
    return payload;
  },

  /**
   * Versendet den Beitrag via Bluesky API und liefert die wichtigsten
   * Metadaten zurück.
   */
  async post(payload, env) {
    if (!env?.serverUrl || !env?.identifier || !env?.appPassword) {
      throw new Error("Bluesky-Env unvollständig (serverUrl, identifier, appPassword erforderlich).");
    }

    const agent = await getAgent(env);

    const text = payload.text;
    // Lazy import RichText to avoid hard dep during tests
    const { RichText } = require("@atproto/api");
    const rt = new RichText({ text });
    await rt.detectFacets(agent);

    const media = Array.isArray(payload.media) ? payload.media.slice(0, 4) : [];
    let imagesEmbed = null;
    if (media.length > 0) {
      const fs = require('fs');
      const images = [];
      for (const m of media) {
        try {
          const fileBuf = fs.readFileSync(m.path);
          const uploaded = await agent.uploadBlob(fileBuf, { encoding: m.mime || 'image/jpeg' });
          images.push({ image: uploaded.data.blob, alt: m.altText || '' });
        } catch (e) {
          log.warn('Bild-Upload fehlgeschlagen', { error: e?.message || String(e) });
        }
      }
      if (images.length > 0) {
        imagesEmbed = { $type: 'app.bsky.embed.images', images };
      }
    }

    const quoteRef = payload.quote && payload.quote.uri && payload.quote.cid
      ? { uri: payload.quote.uri, cid: payload.quote.cid }
      : null;

    let embed = undefined;
    if (quoteRef && imagesEmbed) {
      embed = {
        $type: 'app.bsky.embed.recordWithMedia',
        record: quoteRef,
        media: imagesEmbed,
      };
    } else if (quoteRef) {
      embed = {
        $type: 'app.bsky.embed.record',
        record: quoteRef,
      };
    } else if (imagesEmbed) {
      embed = imagesEmbed;
    }

    const res = await agent.post({
      text: rt.text,
      facets: rt.facets,
      createdAt: new Date().toISOString(),
      reply: payload.reply,
      embed,
    });

    return {
      uri: res.uri,
      cid: res.cid,
      postedAt: new Date(),
      raw: res,
    };
  },

  async delete(payload, env) {
    if (!env?.serverUrl || !env?.identifier || !env?.appPassword) {
      throw new Error("Bluesky-Env unvollständig (serverUrl, identifier, appPassword erforderlich).");
    }

    const uri = payload?.uri;
    if (!uri) {
      throw new Error('Bluesky-URI zum Löschen fehlt.');
    }

    const agent = await getAgent(env);
    await agent.deletePost(uri);
    return { uri };
  },
};

module.exports = blueskyProfile;

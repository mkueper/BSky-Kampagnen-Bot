const { countGraphemesSync } = require("@utils/graphemes");
const { createLogger } = require("@utils/logging");
const { fetch } = require('undici');
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
const keepAliveTimers = new Map();
const DEFAULT_REFRESH_INTERVAL_MS = 60 * 1000;
const PREVIEW_THUMB_TIMEOUT_MS = Number(process.env.BLUESKY_PREVIEW_THUMB_TIMEOUT_MS) || 5000;
const PREVIEW_THUMB_MAX_BYTES = Number(process.env.BLUESKY_PREVIEW_THUMB_MAX_BYTES) || (512 * 1024);
const keepAliveInterval =
  Number(process.env.BLUESKY_SESSION_REFRESH_INTERVAL_MS) ||
  DEFAULT_REFRESH_INTERVAL_MS;

function buildCacheKey(env) {
  return `${env.serverUrl}::${env.identifier}`;
}

function isAgentSessionActive(agent) {
  return Boolean(agent?.session?.did);
}

async function refreshAgentSession(agent) {
  if (!agent?.session?.did) return;
  if (typeof agent.sessionManager?.refreshSession === 'function') {
    await agent.sessionManager.refreshSession();
    return;
  }
  if (typeof agent.refreshSession === 'function') {
    await agent.refreshSession();
  }
}

function ensureAgentKeepAlive(key, agent) {
  if (!keepAliveInterval || keepAliveInterval <= 0) return;
  if (!agent?.session?.did) return;
  const existing = keepAliveTimers.get(key);
  if (existing) clearInterval(existing);
  const timer = setInterval(async () => {
    if (!agent?.session?.did) return;
    try {
      await refreshAgentSession(agent);
      log.debug('Bluesky Agent Session erneuert', { key });
    } catch (error) {
      log.warn('Bluesky Agent Session konnte nicht erneuert werden', { key, error: error?.message || String(error) });
    }
  }, keepAliveInterval);
  if (typeof timer.unref === 'function') timer.unref();
  keepAliveTimers.set(key, timer);
}

function isBlockedHost(hostname) {
  const h = String(hostname || '').toLowerCase();
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h.endsWith('.localhost') ||
    h.startsWith('127.') ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(h)
  );
}

const trimAndLimit = (value, max) => {
  if (!value) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max);
};

async function downloadPreviewThumb(url) {
  if (!url || typeof url !== 'string') return null;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(parsed.protocol)) return null;
  if (isBlockedHost(parsed.hostname)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PREVIEW_THUMB_TIMEOUT_MS);
  try {
    const resp = await fetch(parsed.toString(), { redirect: 'follow', signal: controller.signal });
    if (!resp.ok) return null;
    const contentType = String(resp.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!contentType.startsWith('image/')) return null;
    const contentLength = Number(resp.headers.get('content-length') || '0');
    if (contentLength > 0 && contentLength > PREVIEW_THUMB_MAX_BYTES) return null;
    const arrayBuffer = await resp.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length === 0 || buffer.length > PREVIEW_THUMB_MAX_BYTES) return null;
    return { buffer, mime: contentType || 'image/jpeg' };
  } catch (error) {
    if (error?.name !== 'AbortError') {
      log.debug('Preview-Thumbnail konnte nicht geladen werden', { error: error?.message || String(error) });
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function buildExternalEmbed(agent, meta = {}) {
  if (!meta?.uri) return null;
  const external = {
    uri: meta.uri,
    title: trimAndLimit(meta.title || meta.domain || meta.uri, 300) || meta.uri.slice(0, 300),
    description: trimAndLimit(meta.description || '', 1000),
  };
  const imageUrl = typeof meta.image === 'string' ? meta.image.trim() : '';
  if (imageUrl) {
    const thumb = await downloadPreviewThumb(imageUrl);
    if (thumb) {
      try {
        const uploaded = await agent.uploadBlob(thumb.buffer, { encoding: thumb.mime || 'image/jpeg' });
        if (uploaded?.data?.blob) {
          external.thumb = uploaded.data.blob;
        }
      } catch (error) {
        log.warn('Preview-Thumbnail konnte nicht zu Bluesky hochgeladen werden', { error: error?.message || String(error) });
      }
    }
  }
  return { $type: 'app.bsky.embed.external', external };
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
    if (!keepAliveTimers.has(key)) {
      ensureAgentKeepAlive(key, cached.agent);
    }
    return cached.agent;
  }
  if (cached?.promise) {
    return cached.promise;
  }

  const promise = createAgent(env)
    .then((agent) => {
      agentCache.set(key, { agent, appPassword: env.appPassword });
      ensureAgentKeepAlive(key, agent);
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

    let externalEmbed = null;
    if (!imagesEmbed && payload.external && payload.external.uri) {
      try {
        externalEmbed = await buildExternalEmbed(agent, payload.external);
      } catch (error) {
        log.warn('External-Embed konnte nicht erstellt werden', { error: error?.message || String(error) });
      }
    }

    const quoteRef = payload.quote && payload.quote.uri && payload.quote.cid
      ? { uri: payload.quote.uri, cid: payload.quote.cid }
      : null;

    let embed = undefined;
    if (quoteRef && (imagesEmbed || externalEmbed)) {
      embed = {
        $type: 'app.bsky.embed.recordWithMedia',
        record: quoteRef,
        media: imagesEmbed || externalEmbed,
      };
    } else if (quoteRef) {
      embed = {
        $type: 'app.bsky.embed.record',
        record: quoteRef,
      };
    } else if (imagesEmbed || externalEmbed) {
      embed = imagesEmbed || externalEmbed;
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

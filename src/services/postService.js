// src/services/postService.js
/**
 * Abstraktionsebene, die Inhalte an Plattformprofile delegiert.
 *
 * Dadurch bleibt der Rest des Codes unabhängig von konkreten APIs; jedes
 * Profil definiert, wie validiert, normalisiert und gepostet wird.
 */
const { getProfile } = require("../platforms/registry");
const settingsService = require("./settingsService");

/**
 * @typedef {{ content: string, scheduledAt?: string | Date }} PostInput
 * @typedef {{ [k: string]: any }} PlatformEnv
 */

/** Utility: Sleep */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Heuristik: Ist ein Fehler retrybar? */
function isRetryable(error) {
  const msg = (error?.message || "").toLowerCase();
  const status = error?.status || error?.statusCode;

  if (typeof status === "number") {
    if (status === 429) return true; // Rate-Limit
    if (status >= 500) return true; // Serverfehler
    if (status >= 400 && status < 500) return false; // Clientfehler: nicht retrybar
  }

  const retryHints = ["etimedout", "econnreset", "enotfound", "network", "temporarily", "timeout", "rate limit"];
  if (retryHints.some((k) => msg.includes(k))) {
    return true;
  }

  return false;
}

/**
 * Exponential Backoff + Jitter.
 * ENV: POST_RETRIES, POST_BACKOFF_MS, POST_BACKOFF_MAX_MS
 */
async function withRetry(fn, opts = {}) {
  const config = await settingsService.getPostingConfig();
  const resolve = (fallback, override) => {
    if (override != null && !Number.isNaN(Number(override))) {
      return Number(override);
    }
    return fallback;
  };

  const maxRetries = resolve(config.maxRetries, opts.retries);
  const baseMs = resolve(config.baseMs, opts.baseMs);
  const maxMs = resolve(config.maxMs, opts.maxMs);

  let attempt = 0;
  while (true) {
    try {
      const result = await fn();
      return { result, attempts: attempt + 1 };
    } catch (err) {
      attempt += 1;
      if (!isRetryable(err) || attempt >= maxRetries) {
        err.attempts = attempt;
        throw err;
      }
      const delay = Math.min(maxMs, baseMs * Math.pow(2, attempt - 1));
      const jitter = Math.floor(Math.random() * Math.floor(delay * 0.25));
      const wait = delay + jitter;
      console.warn(`⚠️  Post fehlgeschlagen (Versuch ${attempt}/${maxRetries}). Warte ${wait}ms…`, err?.message || err);
      await sleep(wait);
    }
  }
}

/**
 * Sendet einen Post an die angegebene Plattform.
 * Rückgabe ist strukturiert: { ok, platform, attempts, uri?, postedAt?, error? }
 *
 * @param {PostInput} input
 * @param {"bluesky"|"mastodon"} platformId
 * @param {PlatformEnv} env
 */
async function sendPost(input, platformId, env) {
  if (!platformId) {
    throw new Error("platformId ist erforderlich.");
  }

  const profile = getProfile(platformId);
  if (!profile) {
    throw new Error(`Unbekannte Plattform: ${platformId}`);
  }

  const check = profile.validate(input);
  if (!check.ok) {
    throw new Error(check.errors?.join("; ") || "Ungültiger Inhalt.");
  }

  const payload = profile.toPostPayload(input);

  try {
    const { result, attempts } = await withRetry(() => profile.post(payload, env));
    // Erwartet: result enthält ggf. uri/postedAt je nach Profil
    return {
      ok: true,
      platform: platformId,
      attempts,
      uri: result?.uri ?? "",
      postedAt: result?.postedAt ?? new Date().toISOString(),
      raw: result ?? null,
    };
  } catch (error) {
    return {
      ok: false,
      platform: platformId,
      attempts: error?.attempts || 1,
      error: error?.message || String(error),
    };
  }
}

module.exports = {
  sendPost,
};

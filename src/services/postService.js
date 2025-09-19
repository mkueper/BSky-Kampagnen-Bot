// src/services/postService.js
/**
 * Abstraktionsebene, die Inhalte an Plattformprofile delegiert.
 *
 * Dadurch bleibt der Rest des Codes unabhängig von konkreten APIs; jedes
 * Profil definiert, wie validiert, normalisiert und gepostet wird.
 */
const { getProfile } = require("../platforms/registry");

/**
 * @typedef {{ content: string, scheduledAt?: string | Date }} PostInput
 * @typedef {{ [k: string]: any }} PlatformEnv
 */

/**
 * Sendet einen Post an die angegebene Plattform.
 *
 * @param {PostInput} input
 * @param {string} platformId // z.B. "bluesky" | "mastodon"
 * @param {PlatformEnv} env
 */
async function sendPost(input, platformId, env) {
  const profile = getProfile(platformId);
  if (!profile) {
    throw new Error(`Unbekannte Plattform: ${platformId}`);
  }

  const check = profile.validate(input);
  if (!check.ok) {
    throw new Error(check.errors?.join("; ") || "Ungültiger Inhalt.");
  }

  const payload = profile.toPostPayload(input);
  return profile.post(payload, env);
}

module.exports = {
  sendPost,
};

const { registerProfile } = require("./registry");
const blueskyProfile = require("./bluesky/blueskyProfile");
const mastodonProfile = require("./mastodon/mastodonProfile");

/**
 * Meldet alle verfügbaren Plattformprofile beim Registry-System an.
 *
 * Wird typischerweise einmal beim Server-Startup aufgerufen, bevor Scheduler
 * oder das Dashboard versuchen, Profile nachzuladen.
 */
function setupPlatforms() {
  registerProfile(blueskyProfile);
  registerProfile(mastodonProfile);
}

module.exports = { setupPlatforms };

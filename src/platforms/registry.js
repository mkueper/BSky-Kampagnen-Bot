const { PLATFORMS } = require("./types");
const blueskyClient = require("../services/blueskyClient");
const mastodonClient = require("../services/mastodonClient");

/**
 * Vereinheitliche hier die Methoden-Namen mit deinen Services.
 * Ich nehme an, beide Clients exportieren z.B. sendPost / sendScheduled / health.
 */
const registry = {
  [PLATFORMS.BLUESKY]: {
    sendPost: blueskyClient.sendPost,
    sendScheduled: blueskyClient.sendScheduled, // falls vorhanden
    health: blueskyClient.health, // falls vorhanden
  },
  [PLATFORMS.MASTODON]: {
    sendPost: mastodonClient.sendPost,
    sendScheduled: mastodonClient.sendScheduled,
    health: mastodonClient.health,
  },
};

module.exports = {
  registry,
  PLATFORMS,
};

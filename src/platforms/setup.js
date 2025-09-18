const { registerProfile } = require("./registry");
const blueskyProfile = require("./bluesky/blueksyProfile");
const mastodonProfile = require("./mastodon/mastodonProfile");

function setupPlatforms() {
  registerProfile(blueskyProfile);
  registerProfile(mastodonProfile);
}

module.exports = { setupPlatforms };

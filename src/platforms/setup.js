const registerProfile = require("./registry");
const blueskyProfile = require("./bluesky/blueksyProfile");
const mastodonProfile = require("./mastodon/mastodonProfile");

module.exports = function setupPlatforms() {
  registerProfile(blueskyProfile);
  registerProfile(mastodonProfile);
}

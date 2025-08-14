"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupPlatforms = setupPlatforms;
const registry_1 = require("./registry");
const bluesky_1 = require("./bluesky");
const mastodon_1 = require("./mastodon");
function setupPlatforms() {
    (0, registry_1.registerProfile)(bluesky_1.blueskyProfile);
    (0, registry_1.registerProfile)(mastodon_1.mastodonProfile);
}

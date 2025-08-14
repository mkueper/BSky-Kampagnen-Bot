// src/env.js
require("dotenv").config();

const env = {
  bluesky: {
    serverUrl: process.env.BLUESKY_SERVER_URL || "https://bsky.social",
    identifier: process.env.BLUESKY_IDENTIFIER || "",
    appPassword: process.env.BLUESKY_APP_PASSWORD || "",
  },
  mastodon: {
    apiUrl: process.env.MASTODON_API_URL || "https://mastodon.social",
    accessToken: process.env.MASTODON_ACCESS_TOKEN || "",
  },
  timeZone: process.env.TIME_ZONE || "Europe/Berlin",
};

module.exports = { env };

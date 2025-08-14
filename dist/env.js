"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
require("dotenv/config");
function requireEnv(name) {
    const val = process.env[name];
    if (!val) {
        throw new Error(`Fehlende Umgebungsvariable: ${name}`);
    }
    return val;
}
exports.env = {
    bluesky: {
        serverUrl: requireEnv("BLUESKY_SERVER"),
        identifier: requireEnv("BLUESKY_IDENTIFIER"),
        appPassword: requireEnv("BLUESKY_APP_PASSWORD"),
    },
    mastodon: {
        serverUrl: requireEnv("MASTODON_SERVER"),
        token: requireEnv("MASTODON_TOKEN"),
    }
};

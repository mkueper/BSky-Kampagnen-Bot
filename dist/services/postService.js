"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPost = sendPost;
const registry_1 = require("../platforms/registry");
async function sendPost(input, platformId, env) {
    const profile = (0, registry_1.getProfile)(platformId);
    const check = profile.validate(input);
    if (!check.ok)
        throw new Error(check.errors?.join("; ") || "Ungültiger Inhalt.");
    const payload = profile.toPostPayload(input);
    return profile.post(payload, env);
}

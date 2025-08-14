"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blueskyProfile = void 0;
const graphemes_1 = require("../../utils/graphemes");
const api_1 = require("@atproto/api");
async function createAgent(env) {
    const agent = new api_1.BskyAgent({ service: env.serverUrl });
    await agent.login({
        identifier: env.identifier,
        password: env.appPassword
    });
    return agent;
}
exports.blueskyProfile = {
    id: "bluesky",
    displayName: "Bluesky",
    maxChars: 300,
    countMethod: "graphemes",
    description: "Bluesky-Limit (Unicode-Grapheme)",
    validate(input) {
        const text = typeof input.content === "string" ? input.content : "";
        const len = (0, graphemes_1.countGraphemesSync)(text);
        const remaining = this.maxChars - len;
        return {
            ok: remaining >= 0,
            remaining,
            errors: remaining >= 0 ? [] : [
                `Text ist ${-remaining} Zeichen zu lang (Limit ${this.maxChars}).`
            ]
        };
    },
    normalizeContent(text) {
        // Optional: zero-width chars o. Ä. entfernen
        return text.replace(/[\u200B-\u200D\uFEFF]/g, "");
    },
    toPostPayload(input) {
        const text = this.normalizeContent ? this.normalizeContent(input.content) : input.content;
        // Facets (Links, Handles) vorbereiten – API kümmert sich um korrekte Indizes
        return { text };
    },
    async post(payload, env) {
        const bEnv = env;
        if (!bEnv?.serverUrl || !bEnv?.identifier || !bEnv?.appPassword) {
            throw new Error("Bluesky-Env unvollständig (serverUrl, identifier, appPassword erforderlich).");
        }
        const agent = await createAgent(bEnv);
        // Facets erkennen (Links, Mentions) → korrekte Grapheme-Indizes
        const text = payload.text;
        const rt = new api_1.RichText({ text });
        await rt.detectFacets(agent);
        const res = await agent.post({
            text: rt.text,
            facets: rt.facets,
            createdAt: new Date().toISOString()
        });
        return {
            uri: res.uri,
            postedAt: new Date(),
            raw: res
        };
    }
};

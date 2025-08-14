"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mastodonProfile = void 0;
const graphemes_1 = require("../../utils/graphemes");
const undici_1 = require("undici");
exports.mastodonProfile = {
    id: "mastodon",
    displayName: "Mastodon",
    maxChars: parseInt(process.env.MASTODON_MAX_CHARS || "500", 10),
    countMethod: "graphemes",
    description: "Mastodon-Standardlimit (instanzabhängig)",
    validate(input) {
        const text = typeof input.content === "string" ? input.content : "";
        const len = (0, graphemes_1.countGraphemesSync)(text);
        const remaining = this.maxChars - len;
        return {
            ok: remaining >= 0,
            remaining,
            errors: remaining >= 0
                ? []
                : [`Text ist ${-remaining} Zeichen zu lang (Limit ${this.maxChars}).`],
        };
    },
    normalizeContent(text) {
        // zero-width chars entfernen
        return text.replace(/[\u200B-\u200D\uFEFF]/g, "");
    },
    toPostPayload(input) {
        const status = this.normalizeContent ? this.normalizeContent(input.content) : input.content;
        // Später: spoiler_text (CW), visibility, media_ids, language …
        return { status, visibility: "public" };
    },
    async post(payload, env) {
        const { serverUrl, token } = env;
        if (!serverUrl || !token) {
            throw new Error("Mastodon-Env unvollständig (serverUrl, token).");
        }
        const base = serverUrl.replace(/\/$/, "");
        const res = await (0, undici_1.fetch)(`${base}/api/v1/statuses`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json; charset=utf-8",
                Accept: "application/json",
            },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(`Mastodon HTTP ${res.status}: ${text || res.statusText}`);
        }
        const data = await res.json();
        return {
            uri: typeof data?.url === "string" ? data.url : `${base}/@me/${data?.id ?? ""}`,
            postedAt: new Date(data?.created_at ?? Date.now()),
            raw: data,
        };
    },
};

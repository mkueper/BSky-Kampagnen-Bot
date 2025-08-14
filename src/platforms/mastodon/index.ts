import type {
  PlatformProfile,
  PostInput,
  ValidationResult,
  PlatformEnv,
  PostOutput,
} from "../types";
import { countGraphemesSync } from "../../utils/graphemes";
import { fetch } from "undici";

type MastodonEnv = PlatformEnv & {
  serverUrl: string; // z.B. https://mastodon.social (ohne trailing slash)
  token: string;     // Bearer Token
};

export const mastodonProfile = {
  id: "mastodon",
  displayName: "Mastodon",
  maxChars: parseInt(process.env.MASTODON_MAX_CHARS || "500", 10),
  countMethod: "graphemes" as const,
  description: "Mastodon-Standardlimit (instanzabhängig)",

  validate(input: PostInput): ValidationResult {
    const text = typeof input.content === "string" ? input.content : "";
    const len = countGraphemesSync(text);
    const remaining = this.maxChars - len;
    return {
      ok: remaining >= 0,
      remaining,
      errors: remaining >= 0
        ? []
        : [`Text ist ${-remaining} Zeichen zu lang (Limit ${this.maxChars}).`],
    };
  },

  normalizeContent(text: string): string {
    // zero-width chars entfernen
    return text.replace(/[\u200B-\u200D\uFEFF]/g, "");
  },

  toPostPayload(input: PostInput) {
    const status =
      this.normalizeContent ? this.normalizeContent(input.content) : input.content;
    // Später: spoiler_text (CW), visibility, media_ids, language …
    return { status, visibility: "public" };
  },

  async post(payload: unknown, env: PlatformEnv): Promise<PostOutput> {
    const { serverUrl, token } = env as MastodonEnv;
    if (!serverUrl || !token) {
      throw new Error("Mastodon-Env unvollständig (serverUrl, token).");
    }

    const base = serverUrl.replace(/\/$/, "");
    const res = await fetch(`${base}/api/v1/statuses`, {
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

    const data: any = await res.json();
    return {
      uri: typeof data?.url === "string" ? data.url : `${base}/@me/${data?.id ?? ""}`,
      postedAt: new Date(data?.created_at ?? Date.now()),
      raw: data,
    };
  },
} satisfies PlatformProfile;

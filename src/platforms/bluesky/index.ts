import type {
  PlatformProfile,
  PostInput,
  ValidationResult,
  PlatformEnv,
  PostOutput
} from "../types";
import { countGraphemesSync } from "../../utils/graphemes";
import { BskyAgent, RichText } from "@atproto/api";

/** Erwartete env-Felder:
 *  - serverUrl: string (z. B. https://bsky.social)
 *  - identifier: string (Handle oder E-Mail)
 *  - appPassword: string (App Password)
 */
type BlueskyEnv = PlatformEnv & {
  serverUrl: string;
  identifier: string;
  appPassword: string;
};

async function createAgent(env: BlueskyEnv) {
  const agent = new BskyAgent({ service: env.serverUrl });
  await agent.login({
    identifier: env.identifier,
    password: env.appPassword
  });
  return agent;
}

export const blueskyProfile: PlatformProfile = {
  id: "bluesky",
  displayName: "Bluesky",
  maxChars: 300,
  countMethod: "graphemes",
  description: "Bluesky-Limit (Unicode-Grapheme)",

  validate(input: PostInput): ValidationResult {
    const text = typeof input.content === "string" ? input.content : "";
    const len = countGraphemesSync(text);
    const remaining = this.maxChars - len;
    return {
      ok: remaining >= 0,
      remaining,
      errors: remaining >= 0 ? [] : [
        `Text ist ${-remaining} Zeichen zu lang (Limit ${this.maxChars}).`
      ]
    };
  },

  normalizeContent(text: string): string {
    // Optional: zero-width chars o. Ä. entfernen
    return text.replace(/[\u200B-\u200D\uFEFF]/g, "");
  },

  toPostPayload(input: PostInput) {
    const text = this.normalizeContent ? this.normalizeContent(input.content) : input.content;
    // Facets (Links, Handles) vorbereiten – API kümmert sich um korrekte Indizes
    return { text };
  },

  async post(payload: unknown, env: PlatformEnv): Promise<PostOutput> {
    const bEnv = env as BlueskyEnv;
    if (!bEnv?.serverUrl || !bEnv?.identifier || !bEnv?.appPassword) {
      throw new Error("Bluesky-Env unvollständig (serverUrl, identifier, appPassword erforderlich).");
    }

    const agent = await createAgent(bEnv);

    // Facets erkennen (Links, Mentions) → korrekte Grapheme-Indizes
    const text = (payload as any).text as string;
    const rt = new RichText({ text });
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

import "dotenv/config";
import { setupPlatforms } from "../src/platforms/setup";
import { sendPost } from "../src/services/postService";
import { env } from "../src/env";
import type { PlatformEnv } from "../src/platforms/types";

const bskyEnv = {
  serverUrl: env.bluesky.serverUrl,
  identifier: env.bluesky.identifier,
  appPassword: env.bluesky.appPassword,
} satisfies PlatformEnv;

function requireField(name: keyof typeof bskyEnv) {
  if (!bskyEnv[name]) {
    throw new Error(`Missing Bluesky env var: ${String(name)}`);
  }
}
requireField("serverUrl");
requireField("identifier");
requireField("appPassword");

async function main() {
  setupPlatforms();
  const { serverUrl, identifier, appPassword } = env.bluesky;

  const res = await sendPost(
    { content: "Hallo Bluesky 👋 (Smoke Test vom Kampagnen Bot)." },
    "bluesky",
    bskyEnv,
  );

  console.log("Posted:", res.uri, "at", res.postedAt.toISOString());
}

main().catch((e) => {
  console.error("❌ Fehler:", e?.message || e);
  process.exit(1);
});

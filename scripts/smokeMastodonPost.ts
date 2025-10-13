import "module-alias/register";
import "dotenv/config";
import { setupPlatforms } from "../backend/src/platforms/setup.js";
import { sendPost } from "../backend/src/core/services/postService.js";
import { env } from "../backend/src/env.js";

async function main() {
  setupPlatforms();

  const res = await sendPost(
    { content: "Hallo Mastodon 👋 (Smoke Test)" },
    "mastodon",
    {
      apiUrl: env.mastodon.apiUrl,
      accessToken: env.mastodon.accessToken,
    }
  );

  console.log("Posted:", res.uri, "at", res.postedAt.toISOString());
}

main().catch((e) => {
  console.error("❌ Fehler:", e?.message || e);
  process.exit(1);
});

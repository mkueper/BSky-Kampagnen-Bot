import "dotenv/config";
import { setupPlatforms } from "../src/platforms/setup";
import { sendPost } from "../src/services/postService";
import { env } from "../src/env";

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

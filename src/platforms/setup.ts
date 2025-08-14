import { registerProfile } from "./registry";
import { blueskyProfile } from "./bluesky";
import { mastodonProfile } from "./mastodon";

export function setupPlatforms() {
  registerProfile(blueskyProfile);
  registerProfile(mastodonProfile);
}

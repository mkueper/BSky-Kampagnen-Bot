// Optional: JSDoc für Editor-Typgefühl
/**
 * @typedef {"bluesky" | "mastodon"} TargetPlatform
 */

const PLATFORMS = {
  BLUESKY: "bluesky",
  MASTODON: "mastodon",
};

module.exports = {
  PLATFORMS,
  // Optional export: TargetPlatform JSDoc-Typ existiert nur für Editor/IDE
};

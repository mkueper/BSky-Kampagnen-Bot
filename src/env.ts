import "dotenv/config";

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(`Fehlende Umgebungsvariable: ${name}`);
  }
  return val;
}

export const env = {
  bluesky: {
    serverUrl: requireEnv("BLUESKY_SERVER"),
    identifier: requireEnv("BLUESKY_IDENTIFIER"),
    appPassword: requireEnv("BLUESKY_APP_PASSWORD"),
  },
  mastodon: {
    serverUrl: requireEnv("MASTODON_SERVER"),
    token: requireEnv("MASTODON_TOKEN"),
  }
};

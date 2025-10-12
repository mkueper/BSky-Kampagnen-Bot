const { env } = require('@env');
const { setupPlatforms } = require('@platforms/setup');

let platformsReady = false;

function ensurePlatforms() {
  if (!platformsReady) {
    setupPlatforms();
    platformsReady = true;
  }
}

function resolvePlatformEnv(platformId) {
  switch (platformId) {
    case 'bluesky':
      return env.bluesky;
    case 'mastodon':
      return env.mastodon;
    default:
      return null;
  }
}

function validatePlatformEnv(platformId, platformEnv) {
  if (platformId === 'bluesky') {
    if (!platformEnv?.identifier || !platformEnv?.appPassword) {
      return 'Bluesky-Credentials fehlen.';
    }
  }

  if (platformId === 'mastodon') {
    if (!platformEnv?.apiUrl || !platformEnv?.accessToken) {
      return 'Mastodon-Credentials fehlen.';
    }
  }

  return null;
}

function resetPlatformRegistryForTests() {
  platformsReady = false;
}

module.exports = {
  ensurePlatforms,
  resolvePlatformEnv,
  validatePlatformEnv,
  resetPlatformRegistryForTests,
};

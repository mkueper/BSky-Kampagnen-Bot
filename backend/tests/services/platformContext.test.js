const { validatePlatformEnv } = require('../../src/core/services/platformContext');

describe('platformContext.validatePlatformEnv', () => {
  it('requires Bluesky identifier and appPassword', () => {
    expect(validatePlatformEnv('bluesky', {})).toBe('Bluesky-Credentials fehlen.');
    expect(validatePlatformEnv('bluesky', { identifier: 'user' })).toBe('Bluesky-Credentials fehlen.');
    expect(validatePlatformEnv('bluesky', { appPassword: 'pw' })).toBe('Bluesky-Credentials fehlen.');
    expect(validatePlatformEnv('bluesky', { identifier: 'user', appPassword: 'pw' })).toBeNull();
  });

  it('requires Mastodon apiUrl and accessToken', () => {
    expect(validatePlatformEnv('mastodon', {})).toBe('Mastodon-Credentials fehlen.');
    expect(validatePlatformEnv('mastodon', { apiUrl: 'https://example' })).toBe('Mastodon-Credentials fehlen.');
    expect(validatePlatformEnv('mastodon', { accessToken: 'tok' })).toBe('Mastodon-Credentials fehlen.');
    expect(validatePlatformEnv('mastodon', { apiUrl: 'https://example', accessToken: 'tok' })).toBeNull();
  });

  it('returns null for unknown platforms', () => {
    expect(validatePlatformEnv('unknown', {})).toBeNull();
  });
});

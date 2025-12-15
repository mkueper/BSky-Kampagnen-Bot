import 'module-alias/register';
import { describe, it, expect } from 'vitest';

const helpers = require('@core/services/engagementHelpers');

describe('engagementHelpers', () => {
  describe('resolveMastodonIdentifiers', () => {
    it('uses raw.id when statusId is missing', () => {
      const entry = { raw: { id: 987654321 } };
      const result = helpers.resolveMastodonIdentifiers(entry);
      expect(result.statusId).toBe('987654321');
    });

    it('falls back to URL parsing when only uri is available', () => {
      const entry = { uri: 'https://example/@user/12345' };
      const result = helpers.resolveMastodonIdentifiers(entry);
      expect(result.statusId).toBe('12345');
      expect(result.urlCandidate).toBe('https://example/@user/12345');
    });
  });

  describe('resolveOwnHandles', () => {
    it('derives mastodon handle from raw account data', () => {
      const handles = helpers.resolveOwnHandles({
        platformResults: {
          mastodon: { raw: { account: { acct: 'User@Instance.social' } } },
        },
      });
      expect(handles.mastodon).toBe('user@instance.social');
    });

    it('derives mastodon handle from uri when no account info exists', () => {
      const handles = helpers.resolveOwnHandles({
        platformResults: {
          mastodon: { uri: 'https://mastodon.social/@Mkueper/1153' },
        },
      });
      expect(handles.mastodon).toBe('mkueper@mastodon.social');
    });
  });
});

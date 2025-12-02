const blueskyProfile = require('../../src/platforms/bluesky/blueskyProfile');
const mastodonProfile = require('../../src/platforms/mastodon/mastodonProfile');

describe('Platform profiles', () => {
  describe('BlueskyProfile.validate', () => {
    it('rejects content over 300 graphemes', () => {
      const content = 'a'.repeat(301);
      const res = blueskyProfile.validate({ content });
      expect(res.ok).toBe(false);
      expect(res.remaining).toBeLessThan(0);
    });

    it('accepts content up to 300 graphemes', () => {
      const content = 'a'.repeat(300);
      const res = blueskyProfile.validate({ content });
      expect(res.ok).toBe(true);
      expect(res.remaining).toBeGreaterThanOrEqual(0);
    });
  });

  describe('BlueskyProfile.toPostPayload', () => {
    it('removes zero-width chars and limits media to 4', () => {
      const input = {
        content: `Hello\u200b World\u200c!`,
        media: new Array(6).fill(0).map((_, i) => ({ path: `/tmp/img${i}.jpg`, mime: 'image/jpeg' })),
      };
      const payload = blueskyProfile.toPostPayload(input);
      expect(payload.text).toBe('Hello World!');
      expect(Array.isArray(payload.media)).toBe(true);
      expect(payload.media.length).toBe(4);
    });

    it('includes reply root/parent uris and cids if provided', () => {
      const input = {
        content: 'Reply',
        reply: {
          root: { uri: 'at://did:root/abc', cid: 'cidroot' },
          parent: { uri: 'at://did:parent/def', cid: 'cidparent' },
        },
      };
      const payload = blueskyProfile.toPostPayload(input);
      expect(payload.reply).toEqual({
        root: { uri: 'at://did:root/abc', cid: 'cidroot' },
        parent: { uri: 'at://did:parent/def', cid: 'cidparent' },
      });
    });
  });

  describe('MastodonProfile.toPostPayload', () => {
    it('maps content to status and sets in_reply_to_id from reply parent.statusId', () => {
      const input = {
        content: 'Hello Mastodon',
        reply: { parent: { statusId: '12345' } },
      };
      const payload = mastodonProfile.toPostPayload(input);
      expect(payload.status).toBe('Hello Mastodon');
      expect(payload.in_reply_to_id).toBe('12345');
    });

    it('limits media to 4 items', () => {
      const input = {
        content: 'With media',
        media: new Array(10).fill(0).map((_, i) => ({ path: `/tmp/m${i}.jpg`, mime: 'image/jpeg' })),
      };
      const payload = mastodonProfile.toPostPayload(input);
      expect(Array.isArray(payload.media)).toBe(true);
      expect(payload.media.length).toBe(4);
    });
  });
});

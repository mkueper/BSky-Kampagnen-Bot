const { env } = require('@env');
const { createLogger } = require('@utils/logging');
const log = createLogger('engagement');

function ensurePlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value;
}

function normalizeHandle(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().replace(/^@+/, '').toLowerCase();
}

function extractMastodonStatusId(uri) {
  if (typeof uri !== 'string' || uri.trim() === '') {
    return null;
  }
  try {
    const parsed = new URL(uri);
    const segments = parsed.pathname.split('/').filter(Boolean);
    return segments.pop() || null;
  } catch (error) {
    log.warn('Ungültige Mastodon-URI', { error: error?.message || String(error) });
    const fallbackSegments = uri.split('/').filter(Boolean);
    return fallbackSegments.pop() || null;
  }
}

function extractMastodonHandleFromUri(uri) {
  if (typeof uri !== 'string' || uri.trim() === '') {
    return '';
  }
  try {
    const parsed = new URL(uri);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const accountSegment = segments.find((segment) => segment.startsWith('@'));
    if (!accountSegment) {
      return '';
    }
    const local = accountSegment.replace(/^@+/, '');
    if (!local) {
      return '';
    }
    const domain = parsed.hostname || '';
    return domain ? `${local}@${domain}` : local;
  } catch (error) {
    const fallback = uri.match(/@([^/]+)(?:\/|$)/);
    if (fallback && fallback[1]) {
      return fallback[1];
    }
    return '';
  }
}

function resolveOwnHandles({ platformResults } = {}) {
  const results = ensurePlainObject(platformResults);
  const blueskyEntry = ensurePlainObject(results.bluesky);
  const mastodonEntry = ensurePlainObject(results.mastodon);

  const firstNormalized = (...candidates) => {
    for (const candidate of candidates) {
      const normalized = normalizeHandle(candidate);
      if (normalized) {
        return normalized;
      }
    }
    return '';
  };

  const blueskyHandle = firstNormalized(
    blueskyEntry.authorHandle,
    blueskyEntry.raw?.author?.handle,
    env?.bluesky?.identifier
  );

  const mastodonHandle = firstNormalized(
    mastodonEntry.authorHandle,
    mastodonEntry.raw?.account?.acct,
    mastodonEntry.raw?.account && mastodonEntry.raw.account.username && mastodonEntry.raw.account.domain
      ? `${mastodonEntry.raw.account.username}@${mastodonEntry.raw.account.domain}`
      : null,
    mastodonEntry.raw?.account?.username,
    extractMastodonHandleFromUri(mastodonEntry.uri)
  );

  return {
    bluesky: blueskyHandle || null,
    mastodon: mastodonHandle || null,
  };
}

function resolveMastodonIdentifiers(entry = {}) {
  const normalizedEntry = ensurePlainObject(entry);
  const raw = ensurePlainObject(normalizedEntry.raw);
  const urlCandidate = normalizedEntry.uri || raw.url || raw.uri || null;
  let statusId = normalizedEntry.statusId || raw.statusId || raw.id || raw.id_str || null;
  if (!statusId && urlCandidate) {
    statusId = extractMastodonStatusId(urlCandidate);
  }
  return {
    statusId: statusId ? String(statusId) : null,
    urlCandidate,
  };
}

module.exports = {
  ensurePlainObject,
  normalizeHandle,
  extractMastodonStatusId,
  extractMastodonHandleFromUri,
  resolveOwnHandles,
  resolveMastodonIdentifiers,
};

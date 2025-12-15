const { Skeet, Reply } = require('@data/models');
const events = require('./events');
const { createLogger, isEngagementDebug } = require('@utils/logging');
const log = createLogger('engagement');
const { getReactions: getBlueskyReactions, getReplies: fetchBlueskyReplies } = require('./blueskyClient');
const {
  hasCredentials: hasMastodonCredentials,
  getStatus: getMastodonStatus,
  getStatusContext: getMastodonStatusContext,
} = require('./mastodonClient');
const { resolveOwnHandles, resolveMastodonIdentifiers, normalizeHandle } = require('./engagementHelpers');

function parsePlatformResults(raw) {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch (error) {
      log.warn('Konnte platformResults nicht parsen', { error: error?.message || String(error) });
      return {};
    }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return { ...raw };
  }
  return {};
}

function isAtUri(value) {
  return typeof value === 'string' && value.trim().startsWith('at://');
}

function findFirstAtUri(...candidates) {
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const trimmed = candidate.trim();
    if (isAtUri(trimmed)) {
      return trimmed;
    }
  }
  return null;
}

function normalizeTargetList(skeet) {
  const platformResults = parsePlatformResults(skeet.platformResults);
  const normalizedPlatforms = Array.isArray(skeet.targetPlatforms)
    ? skeet.targetPlatforms.filter(Boolean)
    : [];
  const platformSet = new Set(normalizedPlatforms);
  Object.keys(platformResults).forEach((platformId) => {
    if (platformId) {
      platformSet.add(platformId);
    }
  });
  return { platformResults, platformSet };
}

function decodeHtmlEntities(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    const lower = entity.toLowerCase();
    if (lower === 'amp') return '&';
    if (lower === 'lt') return '<';
    if (lower === 'gt') return '>';
    if (lower === 'quot') return '"';
    if (lower === 'apos' || lower === '#39') return "'";
    if (lower.startsWith('#x')) {
      const code = Number.parseInt(lower.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    if (lower.startsWith('#')) {
      const code = Number.parseInt(lower.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return match;
  });
}

function stripHtml(input) {
  if (typeof input !== 'string') {
    return '';
  }
  const withoutTags = input.replace(/<[^>]*>/g, '');
  return decodeHtmlEntities(withoutTags).trim();
}

function extractMastodonReplies(descendants, ownHandle) {
  if (!Array.isArray(descendants)) {
    return [];
  }
  const normalizedOwnHandle = normalizeHandle(ownHandle);

  return descendants
    .map((status) => {
      if (!status || typeof status !== 'object') {
        return null;
      }
      const account = status.account || {};
      const authorHandle = account.acct || account.username || '';
      const content = stripHtml(status.content || '');
      const indexedAt = status.created_at || status.createdAt || new Date().toISOString();

      if (!authorHandle || !content) {
        return null;
      }
      const normalizedAuthor = normalizeHandle(authorHandle);
      if (normalizedOwnHandle && normalizedAuthor === normalizedOwnHandle) {
        return null;
      }

      return {
        authorHandle,
        content,
        indexedAt,
        createdAt: indexedAt,
        platform: 'mastodon',
      };
    })
    .filter(Boolean);
}

async function collectReactions(skeetId) {
  if (isEngagementDebug()) {
    log.debug(`Skeet reactions: start | skeetId=${skeetId}`);
  }
  const skeet = await Skeet.findByPk(skeetId);
  if (!skeet) {
    throw new Error('Skeet nicht gefunden.');
  }

  const nowIso = new Date().toISOString();
  const perPlatform = {};
  const errors = {};
  let totalLikes = 0;
  let totalReposts = 0;

  const { platformResults, platformSet } = normalizeTargetList(skeet);

  const blueskyEntry = platformResults.bluesky || {};
  const blueskyUri = findFirstAtUri(blueskyEntry.uri, blueskyEntry.raw?.uri, skeet.postUri);
  const blueskySent = blueskyEntry.status === 'sent' || Boolean(blueskyUri);
  if (blueskySent && blueskyUri) {
    try {
      const reactions = await getBlueskyReactions(blueskyUri);
      const likes =
        typeof reactions.likesCount === 'number'
          ? reactions.likesCount
          : Number(reactions.likeCount) || 0;
      const reposts =
        typeof reactions.repostsCount === 'number'
          ? reactions.repostsCount
          : Number(reactions.repostCount) || 0;
      perPlatform.bluesky = { likes, reposts };
      totalLikes += likes;
      totalReposts += reposts;
      platformSet.add('bluesky');
      platformResults.bluesky = {
        ...blueskyEntry,
        metrics: perPlatform.bluesky,
        metricsUpdatedAt: nowIso,
      };
    } catch (error) {
      errors.bluesky = error?.message || 'Fehler beim Laden der Bluesky-Reaktionen.';
    }
  } else if (blueskySent && !blueskyUri) {
    errors.bluesky = 'Keine gültige Bluesky-URI für Reaktionen gefunden.';
  }

  const mastodonEntry = platformResults.mastodon || {};
  const mastodonConfigured = hasMastodonCredentials();
  const { statusId: mastodonStatusId, urlCandidate: mastodonUrlCandidate } = resolveMastodonIdentifiers(mastodonEntry);
  const shouldFetchMastodon = mastodonConfigured && (mastodonStatusId || mastodonUrlCandidate);
  if (shouldFetchMastodon) {
    if (mastodonStatusId) {
      try {
        const status = await getMastodonStatus(mastodonStatusId);
        const likes = Number(status?.favourites_count) || 0;
        const reposts = Number(status?.reblogs_count) || 0;
        perPlatform.mastodon = { likes, reposts };
        totalLikes += likes;
        totalReposts += reposts;
        platformSet.add('mastodon');
        platformResults.mastodon = {
          ...mastodonEntry,
          statusId: mastodonStatusId,
          uri: mastodonEntry.uri || status?.url || mastodonUrlCandidate || '',
          raw: mastodonEntry.raw || { url: status?.url, uri: status?.uri, id: status?.id },
          metrics: perPlatform.mastodon,
          metricsUpdatedAt: nowIso,
        };
      } catch (error) {
        errors.mastodon = error?.message || 'Fehler beim Laden der Mastodon-Reaktionen.';
      }
    } else {
      errors.mastodon = 'Konnte Mastodon-Status-ID nicht bestimmen.';
    }
  } else if ((mastodonEntry.uri || (Array.isArray(skeet.targetPlatforms) && skeet.targetPlatforms.includes('mastodon'))) && !mastodonConfigured) {
    errors.mastodon = 'Mastodon-Zugangsdaten fehlen.';
  }

  const normalizedTargets = Array.from(platformSet);

  await skeet.update({
    likesCount: totalLikes,
    repostsCount: totalReposts,
    targetPlatforms: normalizedTargets.length > 0 ? normalizedTargets : ['bluesky'],
    platformResults,
  });

  try { events.emit('skeet:engagement', { id: skeet.id, totals: { likes: totalLikes, reposts: totalReposts } }); } catch { /* ignore SSE emit error */ }

  const payload = {
    total: { likes: totalLikes, reposts: totalReposts },
    platforms: perPlatform,
  };

  if (Object.keys(errors).length > 0) {
    payload.errors = errors;
  }

  if (isEngagementDebug()) {
    const totals = payload?.platforms || {};
    log.debug(`Skeet reactions: done | skeetId=${skeetId}`, totals);
  }
  return payload;
}

function extractRepliesFromThread(thread, ownHandle) {
  if (!thread || typeof thread !== 'object') return [];

  const queue = Array.isArray(thread.replies) ? [...thread.replies] : [];
  const collected = [];
  const normalizedOwnHandle = normalizeHandle(ownHandle);

  while (queue.length > 0) {
    const node = queue.shift();
    if (!node || typeof node !== 'object') continue;

    if (Array.isArray(node.replies) && node.replies.length > 0) {
      queue.push(...node.replies);
    }

    const post = node.post;
    if (!post || typeof post !== 'object') continue;

    const authorHandle = post.author?.handle;
    const content = post.record?.text ?? '';
    const indexedAt = post.indexedAt ?? post.record?.createdAt ?? new Date().toISOString();

    if (!authorHandle) {
      continue;
    }

    const normalizedAuthor = normalizeHandle(authorHandle);
    if (normalizedOwnHandle && normalizedAuthor === normalizedOwnHandle) {
      continue;
    }

    collected.push({
      authorHandle,
      content,
      indexedAt,
    });
  }

  return collected;
}

async function fetchReplies(skeetId) {
  if (isEngagementDebug()) {
    log.debug(`Skeet replies: start | skeetId=${skeetId}`);
  }
  const skeet = await Skeet.findByPk(skeetId);
  if (!skeet) {
    throw new Error('Skeet nicht gefunden.');
  }

  const platformResults = parsePlatformResults(skeet.platformResults);
  const ownHandles = resolveOwnHandles({ platformResults });
  const responses = [];
  const errors = {};

  const blueskyEntry = platformResults.bluesky || {};
  const blueskyUri = findFirstAtUri(blueskyEntry.uri, blueskyEntry.raw?.uri, skeet.postUri);

  if (isAtUri(blueskyUri || '')) {
    try {
      const repliesData = await fetchBlueskyReplies(blueskyUri);
      const blueskyReplies = extractRepliesFromThread(repliesData, ownHandles.bluesky).map((reply) => ({
        ...reply,
        platform: 'bluesky',
        createdAt: reply.indexedAt,
      }));
      responses.push(...blueskyReplies);
    } catch (error) {
      errors.bluesky = error?.message || 'Fehler beim Laden der Bluesky-Replies.';
    }
  } else if (blueskyEntry.status === 'sent' || isAtUri(skeet.postUri || '')) {
    errors.bluesky = 'Keine gültige Bluesky-URI für Replies gefunden.';
  }

  const mastodonEntry = platformResults.mastodon || {};
  const mastodonConfigured = hasMastodonCredentials();
  const { statusId: mastodonStatusId, urlCandidate: mastodonUrlCandidate } = resolveMastodonIdentifiers(mastodonEntry);

  if (mastodonConfigured && (mastodonStatusId || mastodonUrlCandidate)) {
    if (mastodonStatusId) {
      try {
        const context = await getMastodonStatusContext(mastodonStatusId);
        const mastodonReplies = extractMastodonReplies(context?.descendants, ownHandles.mastodon);
        responses.push(...mastodonReplies);
      } catch (error) {
        errors.mastodon = error?.message || 'Fehler beim Laden der Mastodon-Replies.';
      }
    } else {
      errors.mastodon = 'Konnte Mastodon-Status-ID nicht bestimmen.';
    }
  } else if ((mastodonEntry.uri || (Array.isArray(skeet.targetPlatforms) && skeet.targetPlatforms.includes('mastodon'))) && !mastodonConfigured) {
    errors.mastodon = 'Mastodon-Zugangsdaten fehlen.';
  }

  responses.sort((a, b) => {
    const timeA = new Date(a.indexedAt || 0).getTime();
    const timeB = new Date(b.indexedAt || 0).getTime();
    return timeA - timeB;
  });

  await Reply.sequelize.transaction(async (t) => {
    await Reply.destroy({ where: { skeetId: skeet.id }, transaction: t });
    if (responses.length > 0) {
      await Reply.bulkCreate(
        responses.map((reply) => ({
          skeetId: skeet.id,
          authorHandle: reply.authorHandle,
          content: reply.content,
          platform: reply.platform || null,
          createdAt: new Date(reply.createdAt || reply.indexedAt || Date.now()),
        })),
        { transaction: t }
      );
    }
  });

  const payload = {
    items: responses,
  };

  if (Object.keys(errors).length > 0) {
    payload.errors = errors;
  }

  if (isEngagementDebug()) {
    log.debug(`Skeet replies: done | skeetId=${skeetId} | count=${(payload?.items || []).length}`);
  }
  return payload;
}

module.exports = {
  collectReactions,
  fetchReplies,
};

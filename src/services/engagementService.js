const { Skeet, Reply } = require('../models');
const { getReactions: getBlueskyReactions, getReplies: fetchBlueskyReplies } = require('./blueskyClient');
const { hasCredentials: hasMastodonCredentials, getStatus: getMastodonStatus } = require('./mastodonClient');

function parsePlatformResults(raw) {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch (error) {
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

function extractMastodonStatusId(uri) {
  if (typeof uri !== 'string' || uri.trim() === '') {
    return null;
  }
  try {
    const parsed = new URL(uri);
    const segments = parsed.pathname.split('/').filter(Boolean);
    return segments.pop() || null;
  } catch (error) {
    const fallbackSegments = uri.split('/').filter(Boolean);
    return fallbackSegments.pop() || null;
  }
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

async function collectReactions(skeetId) {
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
      const likes = Array.isArray(reactions.likes) ? reactions.likes.length : 0;
      const reposts = Array.isArray(reactions.reposts) ? reactions.reposts.length : 0;
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
  const mastodonUrlCandidate = mastodonEntry.uri || mastodonEntry.raw?.url || mastodonEntry.raw?.uri || null;
  let mastodonStatusId = mastodonEntry.statusId || null;
  if (!mastodonStatusId && mastodonUrlCandidate) {
    mastodonStatusId = extractMastodonStatusId(mastodonUrlCandidate);
  }

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

  const payload = {
    total: { likes: totalLikes, reposts: totalReposts },
    platforms: perPlatform,
  };

  if (Object.keys(errors).length > 0) {
    payload.errors = errors;
  }

  return payload;
}

function extractRepliesFromThread(thread) {
  if (!thread || typeof thread !== 'object') return [];

  const queue = Array.isArray(thread.replies) ? [...thread.replies] : [];
  const collected = [];

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

    collected.push({
      authorHandle,
      content,
      indexedAt,
    });
  }

  return collected;
}

async function fetchReplies(skeetId) {
  const skeet = await Skeet.findByPk(skeetId);
  if (!skeet) {
    throw new Error('Skeet nicht gefunden.');
  }

  const platformResults = parsePlatformResults(skeet.platformResults);
  const blueskyEntry = platformResults.bluesky || {};
  const blueskyUri = findFirstAtUri(blueskyEntry.uri, blueskyEntry.raw?.uri, skeet.postUri);

  if (!isAtUri(blueskyUri || '')) {
    throw new Error('Für diesen Skeet liegt keine gültige Bluesky-URI vor.');
  }

  const repliesData = await fetchBlueskyReplies(blueskyUri);
  const replies = extractRepliesFromThread(repliesData);

  await Reply.sequelize.transaction(async (t) => {
    await Reply.destroy({ where: { skeetId: skeet.id }, transaction: t });
    if (replies.length > 0) {
      await Reply.bulkCreate(
        replies.map((r) => ({
          skeetId: skeet.id,
          authorHandle: r.authorHandle,
          content: r.content,
          createdAt: new Date(r.indexedAt),
        })),
        { transaction: t }
      );
    }
  });

  return replies;
}

module.exports = {
  collectReactions,
  fetchReplies,
};

// src/services/threadEngagementService.js
/**
 * Sammelt Reaktionen (Likes/Reposts) und Replies für veröffentlichte Thread-Segmente
 * pro Plattform und speichert sie an den Segmenten bzw. im Thread-Metadatenfeld.
 */
const { sequelize, Thread, ThreadSkeet, SkeetReaction } = require("../models");
const { getReactions: bskyGetReactions, getReplies: bskyGetPostThread } = require("./blueskyClient");
const {
  hasCredentials: hasMastoCreds,
  getStatus: mastoGetStatus,
  getStatusContext: mastoGetStatusContext,
} = require("./mastodonClient");

function extractMastodonStatusId(uri) {
  if (!uri) return null;
  try {
    const parsed = new URL(uri);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts.pop() || null;
  } catch (e) {
    const parts = String(uri).split("/").filter(Boolean);
    return parts.pop() || null;
  }
}

function stripHtml(input) {
  if (typeof input !== "string") return "";
  const withoutTags = input.replace(/<[^>]*>/g, "");
  return withoutTags
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
      const lower = entity.toLowerCase();
      if (lower === "amp") return "&";
      if (lower === "lt") return "<";
      if (lower === "gt") return ">";
      if (lower === "quot") return '"';
      if (lower === "apos" || lower === "#39") return "'";
      if (lower.startsWith("#x")) {
        const code = Number.parseInt(lower.slice(2), 16);
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      }
      if (lower.startsWith("#")) {
        const code = Number.parseInt(lower.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      }
      return match;
    })
    .trim();
}

function extractBskyRepliesFromThread(thread) {
  if (!thread || typeof thread !== "object") return [];
  const out = [];
  const queue = Array.isArray(thread.replies) ? [...thread.replies] : [];
  while (queue.length) {
    const node = queue.shift();
    if (node?.replies?.length) queue.push(...node.replies);
    const post = node?.post;
    if (!post) continue;
    const authorHandle = post.author?.handle;
    const content = post.record?.text ?? "";
    const indexedAt = post.indexedAt ?? post.record?.createdAt ?? new Date().toISOString();
    if (authorHandle && content) {
      out.push({ platform: "bluesky", authorHandle, content, createdAt: indexedAt });
    }
  }
  return out;
}

function extractMastoRepliesFromContext(context) {
  const list = Array.isArray(context?.descendants) ? context.descendants : [];
  return list
    .map((s) => {
      const authorHandle = s?.account?.acct || s?.account?.username || "";
      const content = stripHtml(String(s?.content || ""));
      const createdAt = s?.created_at || s?.createdAt || new Date().toISOString();
      if (!authorHandle || !content) return null;
      return { platform: "mastodon", authorHandle, content, createdAt };
    })
    .filter(Boolean);
}

async function refreshThreadEngagement(threadId, { includeReplies = true } = {}) {
  const id = Number(threadId);
  if (!Number.isInteger(id)) {
    const err = new Error("Ungültige Thread-ID.");
    err.status = 400;
    throw err;
  }

  const thread = await Thread.findByPk(id, { include: [{ model: ThreadSkeet, as: "segments", order: [["sequence", "ASC"]] }] });
  if (!thread) {
    const err = new Error("Thread nicht gefunden.");
    err.status = 404;
    throw err;
  }

  // Metadaten-Struktur vorbereiten
  const metadata = thread.metadata && typeof thread.metadata === "object" && !Array.isArray(thread.metadata) ? { ...thread.metadata } : {};
  const platformResults = metadata.platformResults && typeof metadata.platformResults === "object" && !Array.isArray(metadata.platformResults) ? { ...metadata.platformResults } : {};

  const nowIso = new Date().toISOString();
  let totalLikes = 0;
  let totalReposts = 0;
  let totalReplies = 0;

  const mastoEnabled = hasMastoCreds();

  // pro Plattform sammeln
  for (const platformId of ["bluesky", "mastodon"]) {
    const base = platformResults[platformId] || {};
    const nextSegments = [];
    let platformLikes = 0;
    let platformReposts = 0;
    let platformReplies = 0;

    for (const segment of thread.segments) {
      const sequence = Number(segment.sequence) || 0;
      const uri = String(segment.remoteId || "");
      if (!uri) {
        // Segment nicht veröffentlicht
        nextSegments.push(base.segments?.find((s) => s.sequence === sequence) || { sequence, status: "pending" });
        continue;
      }

      let likes = 0;
      let reposts = 0;
      let replies = [];

      try {
        if (platformId === "bluesky") {
          const r = await bskyGetReactions(uri);
          likes = Array.isArray(r?.likes) ? r.likes.length : 0;
          reposts = Array.isArray(r?.reposts) ? r.reposts.length : 0;
          if (includeReplies) {
            const tree = await bskyGetPostThread(uri);
            replies = extractBskyRepliesFromThread(tree);
          }
        } else if (platformId === "mastodon" && mastoEnabled) {
          const statusId = extractMastodonStatusId(uri);
          if (statusId) {
            const s = await mastoGetStatus(statusId);
            likes = Number(s?.favourites_count) || 0;
            reposts = Number(s?.reblogs_count) || 0;
            if (includeReplies) {
              const ctx = await mastoGetStatusContext(statusId);
              replies = extractMastoRepliesFromContext(ctx);
            }
          }
        }
      } catch (e) {
        // Ignoriere einzelne Segmentfehler, setze status=partial/failed unten
      }

      platformLikes += likes;
      platformReposts += reposts;

      // Replies persistieren: vorhandene löschen, neue schreiben
      if (includeReplies) {
        await sequelize.transaction(async (t) => {
          await SkeetReaction.destroy({ where: { threadSkeetId: segment.id, type: "reply" }, transaction: t });
          if (Array.isArray(replies) && replies.length > 0) {
            const rows = replies.map((r) => ({
              threadSkeetId: segment.id,
              type: "reply",
              authorHandle: r.authorHandle,
              content: r.content,
              metadata: { platform: r.platform },
              fetchedAt: new Date(),
            }));
            await SkeetReaction.bulkCreate(rows, { transaction: t });
            platformReplies += rows.length;
          }
        });
      }

      nextSegments.push({
        sequence,
        status: "sent",
        uri,
        metrics: { likes, reposts },
        metricsUpdatedAt: nowIso,
      });
    }

    totalLikes += platformLikes;
    totalReposts += platformReposts;
    totalReplies += platformReplies;

    platformResults[platformId] = {
      ...(platformResults[platformId] || {}),
      status: "sent",
      segments: nextSegments,
      completedAt: platformResults[platformId]?.completedAt || null,
      metricsUpdatedAt: nowIso,
      totals: { likes: platformLikes, reposts: platformReposts, replies: platformReplies },
    };
  }

  metadata.platformResults = platformResults;
  await thread.update({ metadata });

  return {
    ok: true,
    totals: { likes: totalLikes, reposts: totalReposts, replies: totalReplies },
    platforms: {
      bluesky: platformResults.bluesky?.totals || { likes: 0, reposts: 0, replies: 0 },
      mastodon: platformResults.mastodon?.totals || { likes: 0, reposts: 0, replies: 0 },
    },
  };
}

async function refreshPublishedThreadsBatch(limit = 3) {
  const threads = await Thread.findAll({
    where: { status: "published" },
    order: [["updatedAt", "DESC"]],
    limit,
  });
  const results = [];
  for (const t of threads) {
    try {
      const r = await refreshThreadEngagement(t.id, { includeReplies: false });
      results.push({ id: t.id, ok: true, totals: r.totals });
    } catch (e) {
      results.push({ id: t.id, ok: false, error: e?.message || String(e) });
    }
  }
  return results;
}

module.exports = {
  refreshThreadEngagement,
  refreshPublishedThreadsBatch,
};


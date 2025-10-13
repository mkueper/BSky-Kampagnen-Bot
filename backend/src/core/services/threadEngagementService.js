// src/services/threadEngagementService.js
/**
 * Sammelt Reaktionen (Likes/Reposts) und Replies für veröffentlichte Thread-Segmente
 * pro Plattform und speichert sie an den Segmenten bzw. im Thread-Metadatenfeld.
 */
const { sequelize, Thread, ThreadSkeet, SkeetReaction } = require("@data/models");
const events = require("./events");
const { createLogger, isEngagementDebug } = require("@utils/logging");
const log = createLogger('engagement');
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
  } catch {
      log.warn("Ungültige Mastodon-URI");
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
  if (isEngagementDebug()) {
    log.debug(`Refresh start | thread=${id} | replies=${includeReplies} | mastodonEnabled=${mastoEnabled}`);
  }

  // pro Plattform sammeln
  for (const platformId of ["bluesky", "mastodon"]) {
    const base = platformResults[platformId] || {};
    const baseSegments = Array.isArray(base.segments) ? base.segments : [];
    const nextSegments = [];
    let platformLikes = 0;
    let platformReposts = 0;
    let platformReplies = 0;

    for (const segment of thread.segments) {
      const sequence = Number(segment.sequence) || 0;
      // Versuche plattformspezifische Identifikatoren zu verwenden (aus Scheduler-Ergebnis),
      // falle ansonsten auf den primären `remoteId` zurück.
      const platformSeg = baseSegments.find((s) => Number(s.sequence) === sequence) || null;
      const primaryUri = String(segment.remoteId || "");
      const uri = String(platformSeg?.uri || primaryUri);
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
          if (isEngagementDebug()) {
            log.debug(`Bsky segment | seq=${sequence} | uri=${uri} | likes=${likes} | reposts=${reposts} | replies=${replies.length}`);
          }
        } else if (platformId === "mastodon" && mastoEnabled) {
          // Nur abrufen, wenn es plattformspezifische Identifikatoren gibt.
          // Fallback von einer Bluesky-URI ist hier bewusst NICHT erlaubt.
          const statusId = platformSeg?.statusId || (platformSeg?.uri ? extractMastodonStatusId(platformSeg.uri) : null);
          if (statusId) {
            const s = await mastoGetStatus(statusId);
            likes = Number(s?.favourites_count) || 0;
            reposts = Number(s?.reblogs_count) || 0;
            if (includeReplies) {
              const ctx = await mastoGetStatusContext(statusId);
              replies = extractMastoRepliesFromContext(ctx);
            }
            if (isEngagementDebug()) {
              log.debug(`Masto segment | seq=${sequence} | statusId=${statusId} | likes=${likes} | reposts=${reposts} | replies=${replies.length}`);
            }
          } else if (isEngagementDebug()) {
            log.debug(`Masto skip | seq=${sequence} | reason=no-identifiers`);
          }
        }
      } catch (e) {
        // Ignoriere einzelne Segmentfehler, setze status=partial/failed unten
        if (isEngagementDebug()) {
          log.warn(`Fetch error | platform=${platformId} | seq=${sequence} | uri=${uri}`, { error: e?.message || String(e) });
        }
      }

      platformLikes += likes;
      platformReposts += reposts;

      // Replies persistieren: vorhandene löschen, neue schreiben
      if (includeReplies) {
        await sequelize.transaction(async (t) => {
          // Aktualisiere nur die Antworten der aktuellen Plattform, damit
          // Antworten anderer Plattformen erhalten bleiben.
          await SkeetReaction.destroy({
            where: { threadSkeetId: segment.id, type: "reply", metadata: { platform: platformId } },
            transaction: t,
          });
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

      const nextSegEntry = {
        sequence,
        status: "sent",
        uri,
        metrics: { likes, reposts },
        metricsUpdatedAt: nowIso,
      };
      nextSegments.push(nextSegEntry);
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
  try { events.emit('thread:engagement', { id, totals: { likes: totalLikes, reposts: totalReposts, replies: totalReplies } }); } catch { /* ignore SSE emit error */ }
  if (isEngagementDebug()) {
    log.debug(`Refresh done | thread=${id} | totals: likes=${totalLikes}, reposts=${totalReposts}, replies=${totalReplies}`);
  }

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
  /**
   * Aktualisiert Engagement-Daten für alle veröffentlichten Threads in Batches.
   *
   * @param {{ batchSize?: number, includeReplies?: boolean }} [options]
   * @returns {Promise<{ ok: boolean, total: number, processed: number, results: Array }>} Zusammenfassung
   */
  async refreshAllPublishedThreads(options = {}) {
    const batchSize = Number(options.batchSize) > 0 ? Number(options.batchSize) : 10;
    const includeReplies = Boolean(options.includeReplies);

    const rows = await Thread.findAll({ where: { status: "published" }, attributes: ["id"], order: [["id", "ASC"]] });
    const ids = rows.map((r) => r.id);
    const results = [];

    for (let i = 0; i < ids.length; i += batchSize) {
      const slice = ids.slice(i, i + batchSize);
      for (const id of slice) {
        try {
          const r = await refreshThreadEngagement(id, { includeReplies });
          results.push({ id, ok: true, totals: r?.totals || null });
        } catch (e) {
          results.push({ id, ok: false, error: e?.message || String(e) });
        }
      }
    }

    return { ok: true, total: ids.length, processed: results.length, results };
  },
};

/**
 * @file engagementController.js
 * @summary Endpunkte für Interaktionen/Engagement (Reaktionen, Replies) zu veröffentlichten Skeets.
 *
 * Diese Endpunkte lesen Daten aus gespeicherten Plattform-Referenzen (z. B. Bluesky-URIs)
 * und aggregieren Reaktionen oder laden Antworten, sofern möglich.
 */
const engagementService = require('@core/services/engagementService');
const threadEngagementService = require('@core/services/threadEngagementService');
const config = require('@config');

/**
 * GET /api/skeets/:skeetId/reactions
 *
 * Aggregiert Reaktionen (Likes/Reposts etc.) für den angegebenen Skeet.
 * Antwort: 200 OK mit Aggregatdaten
 * Fehler: 404 Not Found | 500 Internal Server Error
 */
async function getReactions(req, res) {
  try {
    const payload = await engagementService.collectReactions(req.params.skeetId);
    res.json(payload);
  } catch (error) {
    const message = error?.message || 'Fehler beim Laden der Reaktionen.';
    if (message.includes('Skeet nicht gefunden')) {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
}

/**
 * GET /api/skeets/:skeetId/replies
 *
 * Lädt Antworten (Replies) für den angegebenen Skeet von der Plattform (z. B. Bluesky).
 * Antwort: 200 OK mit Reply-Liste/Metadaten
 * Fehler: 400 Bad Request (z. B. fehlende/ungültige URI) | 500 Internal Server Error
 */
async function getReplies(req, res) {
  try {
    const payload = await engagementService.fetchReplies(req.params.skeetId);
    res.json(payload);
  } catch (error) {
    const message = error?.message || 'Fehler beim Laden der Replies.';
    if (message.includes('Skeet nicht gefunden') || message.includes('Bluesky-URI')) {
      res.status(400).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
}

module.exports = {
  getReactions,
  getReplies,
  async refreshMany(req, res) {
    try {
      const entity = String(req.body?.entity || '').toLowerCase();
      const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((v) => Number(v)).filter(Number.isFinite) : [];
      const includeReplies = Boolean(req.body?.includeReplies);

      if (!['thread', 'skeet'].includes(entity)) {
        return res.status(400).json({ error: 'Ungültiger entity-Typ. Erlaubt: thread|skeet' });
      }
      if (ids.length === 0) {
        return res.status(400).json({ error: 'ids ist erforderlich und darf nicht leer sein.' });
      }
      const maxIds = Number(config.BULK_REFRESH_MAX_IDS || 50);
      if (ids.length > maxIds) {
        return res.status(400).json({ error: `Zu viele IDs. Maximal ${maxIds} pro Anfrage.` });
      }

      const CONCURRENCY = Number(config.BULK_REFRESH_CONCURRENCY || 4);
      const chunks = [];
      for (let i = 0; i < ids.length; i += CONCURRENCY) chunks.push(ids.slice(i, i + CONCURRENCY));

      const results = [];
      for (const chunk of chunks) {
        // parallele Verarbeitung je Chunk
        const settled = await Promise.all(chunk.map(async (id) => {
          try {
            if (entity === 'thread') {
              const out = await threadEngagementService.refreshThreadEngagement(id, { includeReplies });
              const t = out?.totals || {};
              return { id, ok: true, totals: { likes: t.likes || 0, reposts: t.reposts || 0, replies: t.replies || 0 } };
            }
            const out = await engagementService.collectReactions(id);
            const t = out?.total || {};
            return { id, ok: true, totals: { likes: t.likes || 0, reposts: t.reposts || 0 } };
          } catch (e) {
            return { id, ok: false, error: e?.message || String(e) };
          }
        }));
        results.push(...settled);
      }

      res.json({ ok: true, entity, total: ids.length, results });
    } catch (error) {
      res.status(500).json({ error: error?.message || 'Bulk-Refresh fehlgeschlagen.' });
    }
  },
};

/**
 * @file engagementController.js
 * @summary Endpunkte für Interaktionen/Engagement (Reaktionen, Replies) zu veröffentlichten Skeets.
 *
 * Diese Endpunkte lesen Daten aus gespeicherten Plattform-Referenzen (z. B. Bluesky-URIs)
 * und aggregieren Reaktionen oder laden Antworten, sofern möglich.
 */
const engagementService = require('../services/engagementService');

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
};

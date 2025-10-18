/**
 * @file skeetController.js
 * @summary HTTP-Controller für einzelne geplante/veröffentlichte Skeets.
 *
 * Endpunkte zum Listen, Erstellen, Aktualisieren, Löschen (soft/hard),
 * Zurückziehen veröffentlichter Posts und Wiederherstellen gelöschter Skeets.
 */
const skeetService = require('@core/services/skeetService');
const scheduler = require('@core/services/scheduler');

/**
 * GET /api/skeets[?includeDeleted=1|true|yes|all][&onlyDeleted=1|true|yes]
 *
 * Liefert Skeets sortiert nach `scheduledAt` und `createdAt`.
 * - `includeDeleted`: inkludiert gelöschte (paranoid=false)
 * - `onlyDeleted`: liefert ausschließlich gelöschte
 *
 * Antwort: 200 OK mit Array von Skeet-Objekten
 * Fehler: 500 Internal Server Error
 */
async function getSkeets(req, res) {
  try {
    const includeDeleted = ["1", "true", "yes", "all"].includes((req.query.includeDeleted || "").toString().toLowerCase());
    const onlyDeleted = ["1", "true", "yes"].includes((req.query.onlyDeleted || "").toString().toLowerCase());
    const skeets = await skeetService.listSkeets({ includeDeleted, onlyDeleted, includeMedia: true });
    res.json(skeets);
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Fehler beim Laden der Skeets.' });
  }
}

/**
 * POST /api/skeets
 *
 * Legt einen neuen Skeet an.
 * Body (JSON):
 * - content: string (erforderlich)
 * - scheduledAt?: string | Date | null (bei repeat='none' erforderlich)
 * - repeat?: 'none' | 'daily' | 'weekly' | 'monthly'
 * - repeatDayOfWeek?: 0..6 (bei weekly erforderlich)
 * - repeatDayOfMonth?: 1..31 (bei monthly erforderlich)
 * - targetPlatforms?: string[]
 *
 * Antwort: 201 Created mit Skeet-Objekt
 * Fehler: 400 Bad Request (Validierung)
 */
async function createSkeet(req, res) {
  try {
    const skeet = await skeetService.createSkeet(req.body || {});
    res.status(201).json(skeet);
  } catch (error) {
    res.status(400).json({ error: error?.message || 'Fehler beim Anlegen des Skeets.' });
  }
}

/**
 * PATCH /api/skeets/:id
 *
 * Aktualisiert Felder eines Skeets. Nicht gesetzte Felder bleiben unverändert.
 * Antwort: 200 OK mit aktualisiertem Skeet
 * Fehler: 400 Bad Request | 404 Not Found
 */
async function updateSkeet(req, res) {
  const { id } = req.params;
  try {
    const skeet = await skeetService.updateSkeet(id, req.body || {});
    res.json(skeet);
  } catch (error) {
    const message = error?.message || 'Fehler beim Aktualisieren des Skeets.';
    if (message.includes('nicht gefunden')) {
      res.status(404).json({ error: message });
    } else {
      res.status(400).json({ error: message });
    }
  }
}

/**
 * DELETE /api/skeets/:id[?permanent=true]
 *
 * Löscht einen Skeet. Standard: Soft-Delete; mit `permanent=true` harte Löschung.
 * Antwort: 204 No Content
 * Fehler: 404 Not Found | 500 Internal Server Error
 */
async function deleteSkeet(req, res) {
  const { id } = req.params;
  try {
    const permanent = ["1", "true", "yes"].includes((req.query.permanent || "").toString().toLowerCase());
    await skeetService.deleteSkeet(id, { permanent });
    res.status(204).send();
  } catch (error) {
    const message = error?.message || 'Fehler beim Löschen des Skeets.';
    if (message.includes('nicht gefunden')) {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
}

/**
 * POST /api/skeets/:id/retract
 *
 * Entfernt veröffentlichte Posts auf den Zielplattformen, soweit möglich.
 * Body (optional): { platforms?: string[] }
 * Antwort: 200 OK mit Zusammenfassung
 * Fehler: 400 | 404 | 500
 */
async function retractSkeet(req, res) {
  const { id } = req.params;
  try {
    const platforms = Array.isArray(req.body?.platforms) ? req.body.platforms : undefined;
    const result = await skeetService.retractSkeet(id, { platforms });
    res.json(result);
  } catch (error) {
    const message = error?.message || 'Fehler beim Entfernen des Skeets.';
    const status = error?.status || (message.includes('nicht gefunden') ? 404 : message.includes('keine veröffentlichten Plattformdaten') ? 400 : 500);
    res.status(status).json({ error: message });
  }
}

/**
 * POST /api/skeets/:id/restore
 *
 * Stellt einen gelöschten Skeet wieder her (sofern möglich).
 * Antwort: 200 OK mit Skeet-Objekt
 * Fehler: 400 | 404
 */
async function restoreSkeet(req, res) {
  const { id } = req.params;
  try {
    const skeet = await skeetService.restoreSkeet(id);
    res.json(skeet);
  } catch (error) {
    const message = error?.message || 'Fehler beim Reaktivieren des Skeets.';
    if (message.includes('nicht gefunden')) {
      res.status(404).json({ error: message });
    } else {
      res.status(400).json({ error: message });
    }
  }
}

module.exports = {
  getSkeets,
  createSkeet,
  updateSkeet,
  deleteSkeet,
  retractSkeet,
  restoreSkeet,
  async publishNow(req, res) {
    try {
      const id = await scheduler.publishSkeetNow(req.params.id);
      const { Skeet, SkeetMedia } = require('@data/models');
      const fresh = await Skeet.findByPk(id, { include: [{ model: SkeetMedia, as: 'media', separate: true, order: [["order","ASC"],["id","ASC"]] }] });
      res.json(fresh ? fresh.toJSON() : { id });
    } catch (error) {
      const status = error?.status || 500;
      res.status(status).json({ error: error?.message || 'Fehler beim sofortigen Veröffentlichen des Skeets.' });
    }
  }
};

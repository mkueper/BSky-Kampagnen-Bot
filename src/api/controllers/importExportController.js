/**
 * @file importExportController.js
 * @summary Endpunkte für Import/Export von geplanten Skeets und Threads.
 *
 * Export liefert JSON-Downloads mit definiertem Schema, Import akzeptiert
 * entsprechende JSON-Dateien und legt Einträge als Entwürfe/geplante Objekte an.
 */
const importExportService = require('@core/services/importExportService');

/**
 * GET /api/skeets/export
 *
 * Exportiert geplante Skeets als JSON-Datei (Attachment). Dateiname enthält Timestamp.
 * Antwort: 200 OK (application/json, Content-Disposition: attachment)
 * Fehler: 500 Internal Server Error
 */
async function exportPlannedSkeets(req, res) {
  try {
    const includeMediaParam = String(req.query.includeMedia || "").toLowerCase();
    const includeMedia = includeMediaParam === "0" || includeMediaParam === "false" ? false : true;
    const payload = await importExportService.exportPlannedSkeets({ includeMedia });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="skeets-${timestamp}.json"`);
    res.send(JSON.stringify(payload, null, 2));
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Fehler beim Export der Skeets.' });
  }
}

/**
 * POST /api/skeets/import
 *
 * Importiert geplante Skeets aus einem JSON-Body. Erwartet ein Array gültiger
 * Skeet-Objekte gem. Import-Schema.
 * Antwort: 201 Created mit { imported: number, ids: number[] }
 * Fehler: 400 Bad Request (Validierung/Format)
 */
async function importPlannedSkeets(req, res) {
  try {
    const created = await importExportService.importPlannedSkeets(req.body);
    res.status(201).json({ imported: created.length, ids: created.map((entry) => entry.id) });
  } catch (error) {
    res.status(400).json({ error: error?.message || 'Fehler beim Import der Skeets.' });
  }
}

/**
 * GET /api/threads/export[?status=scheduled|draft|published|deleted]
 *
 * Exportiert Threads (optional nach Status gefiltert) als JSON-Datei.
 * Antwort: 200 OK (application/json, Attachment)
 * Fehler: 500 Internal Server Error
 */
async function exportThreads(req, res) {
  try {
    const status = req.query.status ? String(req.query.status) : undefined;
    const includeMediaParam = String(req.query.includeMedia || "").toLowerCase();
    const includeMedia = includeMediaParam === "0" || includeMediaParam === "false" ? false : true;
    const payload = await importExportService.exportThreads({ status, includeMedia });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '');
    const suffix = status ? `-${status.toLowerCase()}` : '';
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="threads${suffix}-${timestamp}.json"`);
    res.send(JSON.stringify(payload, null, 2));
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Fehler beim Export der Threads.' });
  }
}

/**
 * POST /api/threads/import
 *
 * Importiert Threads aus einem JSON-Body. Erwartet ein Array von Thread-Objekten
 * gem. Import-Schema. Segmente werden pro Thread neu angelegt.
 * Antwort: 201 Created mit { imported: number, ids: number[] }
 * Fehler: 400 Bad Request (Validierung/Format)
 */
async function importThreads(req, res) {
  try {
    const created = await importExportService.importThreads(req.body);
    res.status(201).json({ imported: created.length, ids: created.map((entry) => entry.id) });
  } catch (error) {
    res.status(400).json({ error: error?.message || 'Fehler beim Import der Threads.' });
  }
}

module.exports = {
  exportPlannedSkeets,
  importPlannedSkeets,
  exportThreads,
  importThreads,
};

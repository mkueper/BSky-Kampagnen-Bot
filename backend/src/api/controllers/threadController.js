/**
 * @file threadController.js
 * @summary HTTP-Controller für Thread-Ressourcen (Listen, Details, Anlegen, Aktualisieren,
 *          Löschen, Zurückziehen, Wiederherstellen).
 *
 * Zuständigkeiten
 * - Validierung/Lesen von Query-/Path-/Body-Parametern auf API-Ebene
 * - Aufruf der entsprechenden Servicefunktionen in `src/services/threadService.js`
 * - Einheitliche Fehlerbehandlung und sinnvolle HTTP-Statuscodes
 *
 * Wichtige Hinweise
 * - Zeiten werden im Service in UTC gespeichert. `scheduledAt` kann als ISO-String
 *   oder als Wert aus `<input type="datetime-local">` übergeben werden; der Service
 *   übernimmt robustes Parsen und wandelt nach UTC.
 * - Der Controller hält die Antworten bewusst flach und gibt rohe JSON-Objekte der Modelle zurück.
 */
const threadService = require("@core/services/threadService");
const { refreshThreadEngagement, refreshAllPublishedThreads } = require("@core/services/threadEngagementService");
const scheduler = require("@core/services/scheduler");

/**
 * GET /api/threads[?status=scheduled|draft|published|deleted]
 *
 * Liefert eine sortierte Liste von Threads inkl. Segmenten.
 * - Standard: alle nicht gelöschten Threads (Service übernimmt Filterung per Option)
 * - Optional: mit `status` kann ein Status gefiltert werden
 *
 * Antwort: 200 OK mit Array von Thread-Objekten
 * Fehler: 500 Internal Server Error
 */
async function listThreads(req, res) {
  try {
    const statusFilter = req.query.status ? String(req.query.status) : undefined;
    const threads = await threadService.listThreads({ status: statusFilter });
    res.json(threads);
  } catch (error) {
    console.error("Fehler beim Auflisten der Threads:", error);
    res.status(500).json({ error: error?.message || "Fehler beim Laden der Threads." });
  }
}

/**
 * GET /api/threads/:id
 *
 * Liefert einen einzelnen Thread inklusive Segmenten und Reaktionen.
 *
 * Antwort: 200 OK mit Thread-Objekt
 * Fehler:
 * - 404 Not Found: Thread existiert nicht
 * - 500 Internal Server Error
 */
async function getThread(req, res) {
  try {
    const thread = await threadService.getThread(req.params.id);
    res.json(thread);
  } catch (error) {
    const status = error?.status === 404 ? 404 : 500;
    res.status(status).json({ error: error?.message || "Fehler beim Laden des Threads." });
  }
}

/**
 * POST /api/threads
 *
 * Legt einen neuen Thread mit Segmenten an.
 * Body (JSON):
 * - title?: string | null
 * - scheduledAt?: string | Date | null  (lokal/ISO; wird serverseitig validiert/geparst)
 * - status?: 'draft' | 'scheduled' | ... (Default: 'draft')
 * - targetPlatforms?: string[] (Default: ['bluesky'])
 * - appendNumbering?: boolean (Default: true)
 * - metadata?: object
 * - skeets: Array<{ sequence?: number, content: string, characterCount?: number, appendNumbering?: boolean }>
 *
 * Antwort: 201 Created mit Thread-Objekt
 * Fehler:
 * - 400 Bad Request: Validierungsfehler (z. B. leere Segmente)
 * - 500 Internal Server Error
 */
async function createThread(req, res) {
  try {
    const thread = await threadService.createThread(req.body || {});
    res.status(201).json(thread);
  } catch (error) {
    const isValidation = error?.name === "SequelizeValidationError" || error instanceof SyntaxError;
    const status = isValidation ? 400 : 500;
    res.status(status).json({ error: error?.message || "Fehler beim Speichern des Threads." });
  }
}

/**
 * PATCH /api/threads/:id
 *
 * Aktualisiert Felder eines Threads. Nicht gesetzte Felder bleiben unverändert.
 * Body wie bei POST, alle Felder optional. `skeets` als ganzes Array ersetzt die Segmente.
 *
 * Antwort: 200 OK mit aktualisiertem Thread-Objekt
 * Fehler:
 * - 404 Not Found: Thread existiert nicht
 * - 400 Bad Request: Validierungsfehler
 * - 500 Internal Server Error
 */
async function updateThread(req, res) {
  try {
    const thread = await threadService.updateThread(req.params.id, req.body || {});
    res.json(thread);
  } catch (error) {
    const status = error?.status === 404 ? 404 : error?.name === "SequelizeValidationError" ? 400 : 500;
    res.status(status).json({ error: error?.message || "Fehler beim Aktualisieren des Threads." });
  }
}

/**
 * DELETE /api/threads/:id[?permanent=true]
 *
 * Löscht einen Thread. Standard: Soft-Delete über Status/Metadaten.
 * Mit `permanent=true` wird der Datensatz hart gelöscht.
 *
 * Antwort: 204 No Content
 * Fehler:
 * - 404 Not Found
 * - 400 Bad Request (z. B. ungültige ID)
 * - 500 Internal Server Error
 */
async function deleteThread(req, res) {
  try {
    const permanent = ["1", "true", "yes"].includes((req.query.permanent || "").toString().toLowerCase());
    await threadService.deleteThread(req.params.id, { permanent });
    res.status(204).send();
  } catch (error) {
    const status = error?.status === 404 ? 404 : error?.name === "SequelizeValidationError" ? 400 : 500;
    res.status(status).json({ error: error?.message || "Fehler beim Löschen des Threads." });
  }
}

/**
 * POST /api/threads/:id/retract
 *
 * Versucht, bereits veröffentlichte Beiträge eines Threads von den Plattformen zu entfernen.
 * Body (optional): { platforms?: string[] } zum Einschränken der Zielplattformen.
 *
 * Antwort: 200 OK mit { thread, summary, success }
 * Fehler:
 * - 404 Not Found
 * - 400 Bad Request (z. B. keine Plattformdaten vorhanden)
 * - 500 Internal Server Error
 */
async function retractThread(req, res) {
  try {
    const platforms = Array.isArray(req.body?.platforms) ? req.body.platforms : undefined;
    const result = await threadService.retractThread(req.params.id, { platforms });
    res.json(result);
  } catch (error) {
    const status = error?.status === 404 ? 404 : error?.name === "SequelizeValidationError" ? 400 : 500;
    res.status(status).json({ error: error?.message || "Fehler beim Entfernen des Threads." });
  }
}

/**
 * POST /api/threads/:id/restore
 *
 * Setzt einen zuvor gelöschten Thread zurück auf seinen vorherigen Status.
 *
 * Antwort: 200 OK mit Thread-Objekt
 * Fehler:
 * - 404 Not Found
 * - 400 Bad Request (Thread ist nicht gelöscht)
 * - 500 Internal Server Error
 */
async function restoreThread(req, res) {
  try {
    const thread = await threadService.restoreThread(req.params.id);
    res.json(thread);
  } catch (error) {
    const status = error?.status === 404 ? 404 : error?.status === 400 ? 400 : 500;
    res.status(status).json({ error: error?.message || "Fehler beim Wiederherstellen des Threads." });
  }
}

module.exports = {
  listThreads,
  getThread,
  createThread,
  updateThread,
  deleteThread,
  retractThread,
  restoreThread,
  async publishNow(req, res) {
    try {
      const id = await scheduler.publishThreadNow(req.params.id);
      // Vereinheitlichte Antwort über bestehenden Service, inklusive Mediapreview
      const thread = await threadService.getThread(id);
      res.json(thread);
    } catch (error) {
      const status = error?.status || 500;
      res.status(status).json({ error: error?.message || 'Fehler beim sofortigen Veröffentlichen des Threads.' });
    }
  },
  async refreshEngagement(req, res) {
    try {
      const data = await refreshThreadEngagement(req.params.id, { includeReplies: true });
      res.json(data);
    } catch (error) {
      const status = error?.status || 500;
      res.status(status).json({ error: error?.message || "Fehler beim Aktualisieren der Reaktionen." });
    }
  },
  async refreshAllEngagement(req, res) {
    try {
      const includeReplies = ["1", "true", "yes"].includes(String(req.query.replies || req.body?.replies || "0").toLowerCase());
      const batchSizeRaw = req.query.batchSize || req.body?.batchSize;
      const batchSize = Number(batchSizeRaw);
      const result = await refreshAllPublishedThreads({ batchSize: Number.isFinite(batchSize) ? batchSize : undefined, includeReplies });
      res.json(result);
    } catch (error) {
      const status = error?.status || 500;
      res.status(status).json({ error: error?.message || "Fehler beim Aktualisieren der Reaktionen (alle Threads)." });
    }
  },
};

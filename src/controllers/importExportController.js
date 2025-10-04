const importExportService = require('../services/importExportService');

async function exportPlannedSkeets(req, res) {
  try {
    const payload = await importExportService.exportPlannedSkeets();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="skeets-${timestamp}.json"`);
    res.send(JSON.stringify(payload, null, 2));
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Fehler beim Export der Skeets.' });
  }
}

async function importPlannedSkeets(req, res) {
  try {
    const created = await importExportService.importPlannedSkeets(req.body);
    res.status(201).json({ imported: created.length, ids: created.map((entry) => entry.id) });
  } catch (error) {
    res.status(400).json({ error: error?.message || 'Fehler beim Import der Skeets.' });
  }
}

async function exportThreads(req, res) {
  try {
    const status = req.query.status ? String(req.query.status) : undefined;
    const payload = await importExportService.exportThreads({ status });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '');
    const suffix = status ? `-${status.toLowerCase()}` : '';
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="threads${suffix}-${timestamp}.json"`);
    res.send(JSON.stringify(payload, null, 2));
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Fehler beim Export der Threads.' });
  }
}

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

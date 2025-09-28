const skeetService = require('../services/skeetService');

async function getSkeets(req, res) {
  try {
    const includeDeleted = ["1", "true", "yes", "all"].includes((req.query.includeDeleted || "").toString().toLowerCase());
    const onlyDeleted = ["1", "true", "yes"].includes((req.query.onlyDeleted || "").toString().toLowerCase());
    const skeets = await skeetService.listSkeets({ includeDeleted, onlyDeleted });
    res.json(skeets);
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Fehler beim Laden der Skeets.' });
  }
}

async function createSkeet(req, res) {
  try {
    const skeet = await skeetService.createSkeet(req.body || {});
    res.status(201).json(skeet);
  } catch (error) {
    res.status(400).json({ error: error?.message || 'Fehler beim Anlegen des Skeets.' });
  }
}

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
  restoreSkeet,
};

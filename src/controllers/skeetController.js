const skeetService = require('../services/skeetService');

async function getSkeets(req, res) {
  try {
    const skeets = await skeetService.listSkeets();
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
    await skeetService.deleteSkeet(id);
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

module.exports = {
  getSkeets,
  createSkeet,
  updateSkeet,
  deleteSkeet,
};

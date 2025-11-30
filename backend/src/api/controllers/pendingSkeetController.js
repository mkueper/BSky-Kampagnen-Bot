const skeetService = require('@core/services/skeetService');

async function getPendingSkeets(req, res) {
  try {
    const skeets = await skeetService.listPendingSkeets();
    res.json(skeets);
  } catch (error) {
    res.status(500).json({
      error: error?.message || 'Fehler beim Laden der Pending-Skeets.',
    });
  }
}

async function publishOnce(req, res) {
  const { id } = req.params;
  try {
    const skeet = await skeetService.publishPendingSkeetOnce(id);
    res.json(skeet);
  } catch (error) {
    const message =
      error?.message || 'Fehler beim einmaligen Veröffentlichen des Skeets.';
    const status =
      error?.status ||
      (message.includes('nicht gefunden') || message.includes('gelöscht')
        ? 404
        : message.includes('pending_manual')
        ? 400
        : 500);
    res.status(status).json({ error: message });
  }
}

async function discard(req, res) {
  const { id } = req.params;
  try {
    const skeet = await skeetService.discardPendingSkeet(id);
    res.json(skeet);
  } catch (error) {
    const message =
      error?.message || 'Fehler beim Verwerfen des Pending-Skeets.';
    const status =
      error?.status ||
      (message.includes('nicht gefunden') || message.includes('gelöscht')
        ? 404
        : message.includes('pending_manual') ||
          message.includes('Wiederholungstermin')
        ? 400
        : 500);
    res.status(status).json({ error: message });
  }
}

module.exports = {
  getPendingSkeets,
  publishOnce,
  discard,
};


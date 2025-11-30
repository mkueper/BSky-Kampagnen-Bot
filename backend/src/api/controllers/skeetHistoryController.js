const skeetService = require('@core/services/skeetService');

async function getSkeetHistory(req, res) {
  try {
    const { id } = req.params;
    const limit = Number.parseInt(req.query.limit, 10);
    const offset = Number.parseInt(req.query.offset, 10);
    const history = await skeetService.getSkeetSendHistory(id, {
      limit: Number.isFinite(limit) && limit >= 0 ? limit : 50,
      offset: Number.isFinite(offset) && offset >= 0 ? offset : 0,
    });
    res.status(200).json(history);
  } catch (error) {
    if (error?.status === 404) {
      res.status(404).json({ error: error?.message || 'Skeet nicht gefunden.' });
      return;
    }
    res
      .status(500)
      .json({ error: 'Interner Serverfehler beim Laden der Sendehistorie.' });
  }
}

module.exports = {
  getSkeetHistory,
};


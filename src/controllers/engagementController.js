const engagementService = require('../services/engagementService');

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

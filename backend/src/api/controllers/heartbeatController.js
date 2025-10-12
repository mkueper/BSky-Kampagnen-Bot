// src/controllers/heartbeatController.js
const presence = require('@core/services/presenceService');

async function postHeartbeat(req, res) {
  try {
    const ts = presence.beat();
    res.json({ ok: true, ts });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Heartbeat fehlgeschlagen.' });
  }
}

module.exports = { postHeartbeat };

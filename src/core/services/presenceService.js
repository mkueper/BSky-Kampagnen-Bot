// src/services/presenceService.js
/**
 * In-Memory Anwesenheits-Tracking von Clients (Dashboard).
 *
 * Der Master-Tab im Frontend sendet periodisch einen Heartbeat an /api/heartbeat.
 * Der Scheduler drosselt den Engagement-Collector abhängig vom letzten Heartbeat.
 */
let lastClientHeartbeatAt = 0; // epoch ms

function beat(tsMs) {
  const now = typeof tsMs === 'number' && Number.isFinite(tsMs) ? tsMs : Date.now();
  lastClientHeartbeatAt = now;
  return lastClientHeartbeatAt;
}

function getLastSeen() {
  return lastClientHeartbeatAt;
}

module.exports = { beat, getLastSeen };


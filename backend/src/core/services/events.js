// src/core/services/events.js
/**
 * Sehr schlanker SSE-Eventbus für Frontend-Updates ohne Polling.
 * - Route-Handler: sseHandler(req, res)
 * - Emittieren: emit(event, payload)
 */
const { createLogger } = require("@utils/logging");
const log = createLogger('events');

/** @type {Set<{ id: string, res: import('http').ServerResponse, timer?: NodeJS.Timeout }>} */
const clients = new Set();

function write(res, event, data) {
  try {
    if (event) res.write(`event: ${event}\n`);
    if (data !== undefined) res.write(`data: ${JSON.stringify(data)}\n`);
    res.write(`\n`);
  } catch {
    // Ignorieren; Verbindung ist vermutlich weg
  }
}

function sseHandler(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const entry = { id, res, timer: undefined };
  clients.add(entry);
  log.info('SSE client connected', { id, count: clients.size });

  // Initialer Ping – hilft einigen Proxies
  write(res, 'ping', { ts: Date.now() });

  // Keepalive alle 25s
  entry.timer = setInterval(() => {
    write(res, 'ping', { ts: Date.now() });
  }, 25_000);

  req.on('close', () => {
    try { if (entry.timer) clearInterval(entry.timer); } catch { /* ignore */ }
    clients.delete(entry);
    log.info('SSE client disconnected', { id, count: clients.size });
  });
}

function emit(event, payload) {
  if (!clients.size) return;
  for (const c of clients) {
    write(c.res, event, payload);
  }
}

module.exports = {
  sseHandler,
  emit,
};

// src/utils/logging.js
/**
 * Leichtgewichtige Logging-Helfer mit Umgebungssteuerung.
 *
 * Gesteuert über .env:
 * - LOG_LEVEL=debug|info|warn|error (Default: info)
 * - LOG_TARGET=console|file (Default: console)
 * - LOG_FILE=logs/server.log (nur relevant bei LOG_TARGET=file)
 * - ENGAGEMENT_DEBUG=true|false (Default: false) – schaltet zusätzliche
 *   Debug-Ausgaben für das Einsammeln von Reaktionen/Replies frei.
 */
const fs = require('fs');
const path = require('path');

const LEVELS = ['debug', 'info', 'warn', 'error'];

function resolveConfig() {
  const level = String(process.env.LOG_LEVEL || 'info').toLowerCase();
  const target = String(process.env.LOG_TARGET || 'console').toLowerCase();
  const file = process.env.LOG_FILE || path.join('logs', 'server.log');
  const engagementDebug = /^(1|true|yes)$/i.test(String(process.env.ENGAGEMENT_DEBUG || 'false'));
  return {
    level: LEVELS.includes(level) ? level : 'info',
    target: ['file', 'both'].includes(target) ? target : 'console',
    file,
    engagementDebug,
  };
}

const config = resolveConfig();

function ensureLogFile(filePath) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch {}
}

function shouldLog(level) {
  // Wenn ENGAGEMENT_DEBUG aktiv ist, sollen auch Debug-Zeilen durchkommen,
  // selbst wenn LOG_LEVEL auf info steht (praktisch für Entwicklungssessions).
  if (level === 'debug' && config.engagementDebug) {
    return true;
  }
  return LEVELS.indexOf(level) >= LEVELS.indexOf(config.level);
}

function formatLine(level, scope, message, meta) {
  const ts = new Date().toISOString();
  const parts = [ts, level.toUpperCase(), scope || '-', message];
  if (meta !== undefined) {
    try {
      parts.push(typeof meta === 'string' ? meta : JSON.stringify(meta));
    } catch {}
  }
  return parts.join(' | ');
}

function writeLine(line) {
  const toFile = config.target === 'file' || config.target === 'both';
  const toConsole = config.target === 'console' || config.target === 'both';

  if (toFile) {
    try {
      ensureLogFile(config.file);
      fs.appendFileSync(config.file, line + '\n');
    } catch (e) {
      // Wenn Dateiausgabe fehlschlägt, wenigstens die Konsole nutzen
      // eslint-disable-next-line no-console
      console.log(line);
    }
  }

  if (toConsole) {
    // eslint-disable-next-line no-console
    console.log(line);
  }
}

function createLogger(scope) {
  const s = scope || 'app';
  return {
    debug(msg, meta) {
      if (!shouldLog('debug')) return;
      writeLine(formatLine('debug', s, String(msg), meta));
    },
    info(msg, meta) {
      if (!shouldLog('info')) return;
      writeLine(formatLine('info', s, String(msg), meta));
    },
    warn(msg, meta) {
      if (!shouldLog('warn')) return;
      writeLine(formatLine('warn', s, String(msg), meta));
    },
    error(msg, meta) {
      if (!shouldLog('error')) return;
      writeLine(formatLine('error', s, String(msg), meta));
    },
  };
}

function isEngagementDebug() {
  return config.engagementDebug || config.level === 'debug';
}

module.exports = {
  createLogger,
  isEngagementDebug,
};

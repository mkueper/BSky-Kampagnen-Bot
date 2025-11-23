// src/utils/logging.js
/**
 * Leichtgewichtige Logging-Helfer mit Umgebungssteuerung.
 *
 * Gesteuert über .env:
 * - LOG_LEVEL=debug|info|warn|error (Default: info)
 * - LOG_TARGET=console|file|both (Default: console; "logfile" Alias möglich)
 * - LOG_FILE=logs/server.log (nur relevant bei LOG_TARGET=file)
 * - LOG_MAX_BYTES=<int> (Default: 5 MB, Maximum 100 MB; 0 deaktiviert Rotation)
 * - LOG_MAX_BACKUPS=<int> (Default: 3; 0 löscht statt rotieren)
 * - ENGAGEMENT_DEBUG=true|false (Default: false) – schaltet zusätzliche
 *   Debug-Ausgaben für das Einsammeln von Reaktionen/Replies frei.
 */
const fs = require('fs');
const path = require('path');

const LEVELS = ['debug', 'info', 'warn', 'error'];
const TARGET_ALIASES = {
  console: 'console',
  stdout: 'console',
  stderr: 'console',
  file: 'file',
  logfile: 'file',
  'log-file': 'file',
  both: 'both',
  all: 'both'
};
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_MAX_BACKUPS = 3;
const MAX_ALLOWED_LOG_BYTES = 100 * 1024 * 1024;

function normalizeTarget(target) {
  const normalized = String(target || 'console').toLowerCase();
  if (TARGET_ALIASES[normalized]) {
    return TARGET_ALIASES[normalized];
  }
  if (normalized !== 'console') {
    console.warn(`[logging] Unbekanntes LOG_TARGET "${target}". Fallback auf console.`);
  }
  return 'console';
}

function parsePositiveInt(value, fallback, maxValue) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  if (typeof maxValue === 'number' && parsed > maxValue) {
    return maxValue;
  }
  return parsed;
}

function resolveConfig() {
  const level = String(process.env.LOG_LEVEL || 'info').toLowerCase();
  const target = normalizeTarget(process.env.LOG_TARGET);
  const file = process.env.LOG_FILE || path.join('logs', 'server.log');
  const engagementDebug = /^(1|true|yes)$/i.test(String(process.env.ENGAGEMENT_DEBUG || 'false'));
  return {
    level: LEVELS.includes(level) ? level : 'info',
    target: ['file', 'both'].includes(target) ? target : 'console',
    file,
    maxBytes: parsePositiveInt(process.env.LOG_MAX_BYTES, DEFAULT_MAX_BYTES, MAX_ALLOWED_LOG_BYTES),
    maxBackups: parsePositiveInt(process.env.LOG_MAX_BACKUPS, DEFAULT_MAX_BACKUPS),
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
  } catch (e) { console.error("Fehler beim Erstellen des Log-Verzeichnisses", e); }
}

function rotateLogFile(filePath) {
  if (!config.maxBytes || config.maxBytes <= 0) return;
  let stats;
  try {
    stats = fs.statSync(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') return;
    console.warn('[logging] Konnte Logdatei nicht prüfen', error);
    return;
  }
  if (stats.size < config.maxBytes) return;
  try {
    if (config.maxBackups > 0) {
      const oldest = `${filePath}.${config.maxBackups}`;
      if (fs.existsSync(oldest)) {
        fs.rmSync(oldest, { force: true });
      }
      for (let index = config.maxBackups - 1; index >= 1; index -= 1) {
        const src = `${filePath}.${index}`;
        if (fs.existsSync(src)) {
          const dest = `${filePath}.${index + 1}`;
          fs.renameSync(src, dest);
        }
      }
      fs.renameSync(filePath, `${filePath}.1`);
    } else {
      fs.rmSync(filePath, { force: true });
    }
  } catch (error) {
    console.warn('[logging] Rotation fehlgeschlagen', error);
  }
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
    } catch (e) { console.error("Fehler beim Formatieren des Datums", e); }
  }
  return parts.join(' | ');
}

function writeLine(line) {
  const toFile = config.target === 'file' || config.target === 'both';
  const toConsole = config.target === 'console' || config.target === 'both';

  if (toFile) {
    try {
      ensureLogFile(config.file);
      rotateLogFile(config.file);
      fs.appendFileSync(config.file, line + '\n');
    } catch (e) {
        console.warn( "Dateiausgabe fehlgeschlagen", e )
        console.log(line);
    }
  }

  if (toConsole) {
     
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

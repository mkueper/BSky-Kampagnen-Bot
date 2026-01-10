const crypto = require('crypto');
const { readCsrfTokenFromRequest } = require('@core/services/authService');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function requireCsrf(req, res, next) {
  const method = String(req?.method || 'GET').toUpperCase();
  if (SAFE_METHODS.has(method)) return next();

  const header = req?.get?.('x-csrf-token') || req?.headers?.['x-csrf-token'] || '';
  const cookie = readCsrfTokenFromRequest(req) || '';
  if (!header || !cookie) {
    return res.status(403).json({
      error: 'AUTH_CSRF_FAILED',
      message: 'Sicherheitsprüfung fehlgeschlagen. Bitte Seite neu laden.',
    });
  }
  if (header.length !== cookie.length) {
    return res.status(403).json({
      error: 'AUTH_CSRF_FAILED',
      message: 'Sicherheitsprüfung fehlgeschlagen. Bitte Seite neu laden.',
    });
  }
  const isValid = crypto.timingSafeEqual(Buffer.from(header), Buffer.from(cookie));
  if (!isValid) {
    return res.status(403).json({
      error: 'AUTH_CSRF_FAILED',
      message: 'Sicherheitsprüfung fehlgeschlagen. Bitte Seite neu laden.',
    });
  }
  return next();
}

module.exports = requireCsrf;

const crypto = require('crypto');
const {
  getStatus,
  validateCredentials,
  issueSession,
  persistSession,
  issueCsrfToken,
  persistCsrfToken,
  clearSession,
  resolveRequestSession,
  readCsrfTokenFromRequest,
} = require('@core/services/authService');
const { createLogger } = require('@utils/logging');

const log = createLogger('auth.controller');

const SESSION_TTL_MIN_HOURS = 6;
const SESSION_TTL_MAX_HOURS = 168;
const RENEW_COOLDOWN_SECONDS = 120;
const LOGIN_MAX_ATTEMPTS = Number(process.env.AUTH_LOGIN_MAX_ATTEMPTS || 5);
const LOGIN_WINDOW_MINUTES = Number(process.env.AUTH_LOGIN_WINDOW_MINUTES || 15);
const LOGIN_WINDOW_MS = (Number.isFinite(LOGIN_WINDOW_MINUTES) && LOGIN_WINDOW_MINUTES > 0 ? LOGIN_WINDOW_MINUTES : 15) * 60 * 1000;
const loginAttempts = new Map();

function resolveSessionTtlSeconds(requestedHours, fallbackSeconds) {
  const parsed = Number(requestedHours);
  if (!Number.isFinite(parsed)) return fallbackSeconds;
  const clamped = Math.min(SESSION_TTL_MAX_HOURS, Math.max(SESSION_TTL_MIN_HOURS, Math.round(parsed)));
  return clamped * 60 * 60;
}

function resolveClientIp(req) {
  const forwarded = req?.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return (req?.ip || req?.connection?.remoteAddress || '').trim();
}

function getRateLimitState(ip) {
  if (!ip) return null;
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry) return { count: 0, firstSeen: now };
  if (now - entry.firstSeen > LOGIN_WINDOW_MS) {
    loginAttempts.delete(ip);
    return { count: 0, firstSeen: now };
  }
  return entry;
}

function isRateLimited(ip) {
  const state = getRateLimitState(ip);
  if (!state) return { limited: false };
  if (state.count < LOGIN_MAX_ATTEMPTS) return { limited: false };
  const retryAfterMs = Math.max(0, LOGIN_WINDOW_MS - (Date.now() - state.firstSeen));
  return { limited: true, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
}

function recordFailedAttempt(ip) {
  if (!ip) return;
  const state = getRateLimitState(ip);
  if (!state) return;
  loginAttempts.set(ip, {
    count: state.count + 1,
    firstSeen: state.firstSeen
  });
}

function resetAttempts(ip) {
  if (!ip) return;
  loginAttempts.delete(ip);
}

function ensureCsrfCookie(req, res, ttlSeconds) {
  const existing = readCsrfTokenFromRequest(req);
  if (existing) return existing;
  const token = issueCsrfToken();
  persistCsrfToken(res, token, ttlSeconds);
  return token;
}

function validateCsrfToken(req) {
  const header = req?.get?.('x-csrf-token') || req?.headers?.['x-csrf-token'] || '';
  const cookie = readCsrfTokenFromRequest(req) || '';
  if (!header || !cookie) return false;
  if (header.length !== cookie.length) return false;
  return crypto.timingSafeEqual(Buffer.from(header), Buffer.from(cookie));
}

async function session(req, res) {
  const status = getStatus();
  if (!status.configured) {
    return res.json({ authenticated: false, configured: false });
  }
  ensureCsrfCookie(req, res, status.ttlSeconds);

  const payload = resolveRequestSession(req);
  if (!payload) {
    return res.json({
      authenticated: false,
      configured: true,
      csrfCookieName: status.csrfCookieName
    });
  }

  return res.json({
    authenticated: true,
    configured: true,
    user: { username: payload.username },
    expiresAt: payload.exp ? payload.exp * 1000 : null,
    csrfCookieName: status.csrfCookieName
  });
}

function login(req, res) {
  const status = getStatus();
  if (!status.configured) {
    return res.status(503).json({
      error: 'AUTH_NOT_CONFIGURED',
      message: 'Login ist noch nicht konfiguriert.',
    });
  }

  const ip = resolveClientIp(req);
  const limitState = isRateLimited(ip);
  if (limitState.limited) {
    if (typeof res?.set === 'function') {
      res.set('Retry-After', String(limitState.retryAfterSeconds || 60));
    }
    return res.status(429).json({
      error: 'AUTH_RATE_LIMITED',
      message: 'Zu viele Loginversuche. Bitte später erneut versuchen.',
    });
  }

  const { username, password } = req.body || {};
  if (!username || !password) {
    recordFailedAttempt(ip);
    return res.status(400).json({
      error: 'AUTH_MISSING_CREDENTIALS',
      message: 'Bitte Benutzername und Passwort übermitteln.',
    });
  }

  const valid = validateCredentials(username, password);
  if (!valid) {
    log.warn('Fehlgeschlagener Loginversuch', { username });
    recordFailedAttempt(ip);
    return res.status(401).json({
      error: 'AUTH_INVALID_CREDENTIALS',
      message: 'Benutzername oder Passwort ist ungültig.',
    });
  }

  resetAttempts(ip);
  const ttlSeconds = resolveSessionTtlSeconds(req?.body?.sessionTtlHours, status.ttlSeconds);
  const token = issueSession(username, ttlSeconds);
  persistSession(res, token, ttlSeconds);
  persistCsrfToken(res, issueCsrfToken(), ttlSeconds);
  log.info('Dashboard-Login erfolgreich', { username });
  return res.json({ ok: true, expiresInSeconds: ttlSeconds });
}

function logout(req, res) {
  const status = getStatus();
  if (status.configured && !validateCsrfToken(req)) {
    return res.status(403).json({
      error: 'AUTH_CSRF_FAILED',
      message: 'Sicherheitsprüfung fehlgeschlagen. Bitte Seite neu laden.',
    });
  }
  clearSession(res);
  res.json({ ok: true });
}

function renew(req, res) {
  const status = getStatus();
  if (!status.configured) {
    return res.status(503).json({
      error: 'AUTH_NOT_CONFIGURED',
      message: 'Login ist noch nicht konfiguriert.',
    });
  }
  if (!validateCsrfToken(req)) {
    return res.status(403).json({
      error: 'AUTH_CSRF_FAILED',
      message: 'Sicherheitsprüfung fehlgeschlagen. Bitte Seite neu laden.',
    });
  }

  const payload = resolveRequestSession(req);
  if (!payload) {
    return res.status(401).json({
      error: 'AUTH_SESSION_INVALID',
      message: 'Sitzung ist abgelaufen.',
    });
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const issuedAt = Number(payload.iat);
  if (
    Number.isFinite(issuedAt) &&
    nowSeconds - issuedAt < RENEW_COOLDOWN_SECONDS
  ) {
    return res.status(429).json({
      error: 'AUTH_RENEW_TOO_SOON',
      message: 'Session wurde zu früh erneuert. Bitte kurz warten.',
    });
  }

  const ttlSeconds = status.ttlSeconds;
  const token = issueSession(payload.username || 'dashboard', ttlSeconds);
  persistSession(res, token, ttlSeconds);
  persistCsrfToken(res, issueCsrfToken(), ttlSeconds);
  const expiresAt = Date.now() + ttlSeconds * 1000;
  return res.json({ expiresAt });
}

module.exports = {
  session,
  login,
  logout,
  renew,
};

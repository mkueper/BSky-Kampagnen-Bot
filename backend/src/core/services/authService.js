const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { verifyPassword } = require('@utils/password');
const { createLogger } = require('@utils/logging');

const log = createLogger('auth');

const DEFAULT_COOKIE_NAME = 'kampagnenbot_session';
const DEFAULT_TTL_SECONDS = 60 * 60 * 12; // 12h

const isProdLike = () => /^(production|staging)$/i.test(process.env.NODE_ENV || '');

const authConfig = {
  username: (process.env.AUTH_USERNAME || '').trim(),
  passwordHash: (process.env.AUTH_PASSWORD_HASH || '').trim(),
  tokenSecret: (process.env.AUTH_TOKEN_SECRET || '').trim(),
  cookieName: (process.env.AUTH_COOKIE_NAME || DEFAULT_COOKIE_NAME).trim() || DEFAULT_COOKIE_NAME,
  ttlSeconds: (() => {
    const explicitSeconds = Number(process.env.AUTH_SESSION_TTL_SECONDS);
    if (Number.isFinite(explicitSeconds) && explicitSeconds > 0) {
      return explicitSeconds;
    }
    const hours = Number(process.env.AUTH_SESSION_TTL_HOURS);
    if (Number.isFinite(hours) && hours > 0) {
      return hours * 60 * 60;
    }
    return DEFAULT_TTL_SECONDS;
  })(),
  secureCookies: isProdLike(),
};

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: authConfig.secureCookies,
  path: '/',
};

function isConfigured() {
  return Boolean(authConfig.username && authConfig.passwordHash && authConfig.tokenSecret);
}

function validateCredentials(username, password) {
  if (!isConfigured()) return false;
  if (typeof username !== 'string' || typeof password !== 'string') return false;
  const safeUser = Buffer.from(authConfig.username);
  const currentUser = Buffer.from(username);
  if (safeUser.length !== currentUser.length) return false;
  if (!crypto.timingSafeEqual(safeUser, currentUser)) return false;
  return verifyPassword(password, authConfig.passwordHash);
}

function issueSession(username, ttlSeconds = authConfig.ttlSeconds) {
  if (!isConfigured()) {
    throw new Error('Auth service is not configured');
  }
  return jwt.sign(
    {
      sub: 'dashboard',
      username,
    },
    authConfig.tokenSecret,
    {
      expiresIn: ttlSeconds,
    }
  );
}

function persistSession(res, token, ttlSeconds = authConfig.ttlSeconds) {
  res.cookie(authConfig.cookieName, token, {
    ...cookieOptions,
    maxAge: ttlSeconds * 1000,
  });
}

function clearSession(res) {
  res.clearCookie(authConfig.cookieName, cookieOptions);
}

function readTokenFromRequest(req) {
  return req?.cookies?.[authConfig.cookieName] || null;
}

function decodeToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, authConfig.tokenSecret);
  } catch (err) {
    if (err && err.name !== 'TokenExpiredError') {
      log.warn('Ungültiges Session-Token', { error: err.message });
    }
    return null;
  }
}

function resolveRequestSession(req) {
  const token = readTokenFromRequest(req);
  if (!token) return null;
  return decodeToken(token);
}

function getStatus() {
  return {
    configured: isConfigured(),
    cookieName: authConfig.cookieName,
    ttlSeconds: authConfig.ttlSeconds,
  };
}

module.exports = {
  getStatus,
  isConfigured,
  validateCredentials,
  issueSession,
  persistSession,
  clearSession,
  resolveRequestSession,
};

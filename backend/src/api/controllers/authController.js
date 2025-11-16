const {
  getStatus,
  validateCredentials,
  issueSession,
  persistSession,
  clearSession,
  resolveRequestSession,
} = require('@core/services/authService');
const { createLogger } = require('@utils/logging');

const log = createLogger('auth.controller');

function session(req, res) {
  const status = getStatus();
  if (!status.configured) {
    return res.json({ authenticated: false, configured: false });
  }

  const payload = resolveRequestSession(req);
  if (!payload) {
    return res.json({ authenticated: false, configured: true });
  }

  return res.json({
    authenticated: true,
    configured: true,
    user: { username: payload.username },
    expiresAt: payload.exp ? payload.exp * 1000 : null,
  });
}

function login(req, res) {
  const status = getStatus();
  if (!status.configured) {
    return res.status(503).json({ error: 'Login ist noch nicht konfiguriert.' });
  }

  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Bitte Benutzername und Passwort übermitteln.' });
  }

  const valid = validateCredentials(username, password);
  if (!valid) {
    log.warn('Fehlgeschlagener Loginversuch', { username });
    return res.status(401).json({ error: 'Benutzername oder Passwort ist ungültig.' });
  }

  const token = issueSession(username);
  persistSession(res, token);
  log.info('Dashboard-Login erfolgreich', { username });
  return res.json({ ok: true, expiresInSeconds: status.ttlSeconds });
}

function logout(req, res) {
  clearSession(res);
  res.json({ ok: true });
}

module.exports = {
  session,
  login,
  logout,
};

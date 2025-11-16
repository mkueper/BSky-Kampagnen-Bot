const { getStatus, resolveRequestSession } = require('@core/services/authService');

function requireAuth(req, res, next) {
  const status = getStatus();
  if (!status.configured) {
    return res.status(503).json({
      error:
        'Login ist nicht konfiguriert. Bitte AUTH_USERNAME, AUTH_PASSWORD_HASH und AUTH_TOKEN_SECRET setzen.',
    });
  }

  const session = resolveRequestSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Nicht angemeldet oder Sitzung abgelaufen.' });
  }

  req.session = session;
  return next();
}

module.exports = requireAuth;

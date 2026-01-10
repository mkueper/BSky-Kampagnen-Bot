# Smoke-Test – Dashboard (Kurzcheck)

1. Server starten, Login-Seite erscheint, wenn `AUTH_*` gesetzt sind.
2. Login mit gültigen Credentials, Dashboard lädt, `GET /api/auth/session` liefert `authenticated: true`.
3. Fehlgeschlagener Login: nach > `AUTH_LOGIN_MAX_ATTEMPTS` kommt `429` mit `Retry-After`.
4. Logout: Session endet, erneuter Aufruf `/api/*` liefert `401`.
5. CSRF: POST ohne `x-csrf-token` auf `/api/heartbeat` liefert `403`, mit Token `200`.
6. Beispielaktion: Skeet anlegen/ändern/löschen funktioniert, danach Liste aktualisiert.

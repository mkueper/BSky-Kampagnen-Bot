# Unreleased Notes

#
# Hier werden tägliche Änderungen gesammelt und bei einem Release
# in die CHANGELOG.md unter die neue Versionsüberschrift übertragen.
# Struktur:
# ## YYYY-MM-DD
# ### <Section>
# - Eintrag

## 2025-10-06

### Dokumentation
- Ergänzt: Screenshots‑Abschnitt im Frontend‑Benutzerhandbuch (docs/frontend-user-guide.md). Enthält alle 10 Ansichten (Übersicht, Skeets geplant/veröffentlicht/Papierkorb, Skeet planen, Threads geplant/veröffentlicht/Papierkorb, Thread planen, Konfiguration) mit direkten Bild‑Links aus docs/Screenshots.
- Hinweis in der Doku‑Übersicht (docs/README.md): Verweis auf den neuen Screenshots‑Abschnitt und den Ordner docs/Screenshots.

### Bugfixes
- Mastodon: Reaktionen (Likes/Boosts) und Antworten werden jetzt mit den plattformspezifischen Identifikatoren abgerufen. Zuvor wurde fälschlich die primäre `remoteId` (oft Bluesky‑URI) genutzt, was zu 0 Likes/Boosts und irrelevanten Antworten führte. Zusätzlich werden beim Aktualisieren nur noch Antworten der jeweiligen Plattform ersetzt, statt alle Antworten des Segments zu löschen.

### Dev/Logs
- Neues Logging-System (`src/utils/logging.js`) mit `.env`‑Schaltern:
  - `LOG_LEVEL=debug|info|warn|error` (Default `info`)
  - `LOG_TARGET=console|file|both` (Default `console`), `LOG_FILE=logs/server.log`
  - `ENGAGEMENT_DEBUG=true|false` (Default `false`) für detaillierte Debug‑Ausgaben beim Einsammeln von Likes/Reposts/Replies.
- Health/Startup‑Logs ergänzt (Server, DB, Scheduler, Log‑Ziel) und Login‑Logs für Bluesky/Mastodon.

### Backend
- Neuer Endpoint: `POST /api/threads/engagement/refresh-all` — aktualisiert Reaktionen aller veröffentlichten Threads (optional in Batches, optional Replies).
- Engagement‑Collector (Threads):
  - Verwendet plattformspezifische Mastodon‑IDs/URIs; kein Fallback mehr aus Bluesky‑URIs. Fehlende Identifikatoren werden übersprungen (Debug „Masto skip“).
  - Löscht/erstellt Replies segmentweise pro Plattform (keine Cross‑Plattform‑Überschreibungen).

### Frontend
- Threads‑Übersicht:
  - Button „Reaktionen aktualisieren“ mit Ladezustand und Toast‑Feedback (Summen).
  - „Alle aktualisieren“ im Tab „Veröffentlicht“ (ruft Backend‑Bulk‑Refresh, zeigt Ergebnis‑Toast).
  - Erste Karte zeigt jetzt zusätzlich je Plattform „Likes · Reposts“ (Bluesky/Mastodon) und „Zuletzt aktualisiert“.

### Tools
- Neues Script: `npm run tools:set-masto-segment`
  - Setzt Mastodon‑`statusId`/`uri` pro Segment; unterstützt Single, CSV‑Bulk (`--statusIds/--uris`) und Mapping‑Datei (`--file`).
- Engagement‑Services versehen mit Debug‑Ausgaben, steuerbar über `ENGAGEMENT_DEBUG`.

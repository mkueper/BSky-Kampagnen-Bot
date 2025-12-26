# Roadmap – BSky-Kampagnen-Tool

Die Roadmap beschreibt mittelfristige Schwerpunkte. Sie wird laufend angepasst; Feedback und Issues sind ausdrücklich willkommen.

---

## Phase 1 – Stabilisierung & Betrieb (laufend)

**Ziel:** Das bestehende Funktionsset (Planung, Scheduler, Engagement, integrierter Bluesky-Client) robust und produktionsnah betreiben können.

Schwerpunkte:
- Medien-Handling & Upload: Implementiert; ausstehend sind Stresstests (große Dateien, Abbrüche, langsame Verbindungen).
- Überfällige Skeets/Threads: Backend-Logik vorhanden; UI-Ansicht und Freigabe-Workflow ergänzen. Zuverlässige Tests auf Basis sqlite3 inMemory aufbauen.
- Skeet-/Thread-Historie (täglich, wöchentlich, monatlich): Funktional, inklusive UI-Anzeige. Ausbau der Testabdeckung (Zeitlogik, Randfälle).
- Teststrategie: sqlite3 inMemory für Unit/Integration-Tests; ergänzend einzelne Szenarien gegen File-basierte SQLite-DB für realistischere Bedingungen.

---

## Phase 2 – Auth-Härtung & Sicherheit

Ziel: Die bestehende Einzelbenutzer-Authentifizierung stabil, sicher und zukunftsfähig machen.

Schwerpunkte:
- Rate-Limiting für Login-Versuche
- Token-Handling verbessern (Invalidierung, Ablauf, Rotation)
- Logging sicherheitsrelevanter Aktionen (z. B. Login, Scheduler)
- Vorbereitung einer optionalen TOTP-basierten Zwei-Faktor-Authentifizierung (zunächst nur für den Admin-Account)

---

## Phase 3 – Plattform- & Workflow-Erweiterungen

**Ziel:** Zusätzliche Kanäle und Automatisierungen erschließen, ohne den Kern zu überlasten.

Ideen & Kandidaten:
- Mastodon-Anbindung: API-Integration und Posting sind implementiert. Optional kann später ein direkter Mastodon-Client im Dashboard ergänzt werden.
- Optionaler externer Speicherdienst: Evaluierung einer Nextcloud-/WebDAV-Schnittstelle für Medien, als Alternative zum lokalen Filesystem für Nutzer:innen mit bestehender Nextcloud-Installation.

---

## Leitprinzipien

- **Transparenz:** Features sollen nachvollziehbar dokumentiert sein (Changelog, Docs).
- **Schrittweise Releases:** Jede Phase liefert ein nutzbares Zwischenergebnis; große Umbauten werden in kleine Migrationsschritte zerlegt.
- **Community:** Feature-Requests und Diskussionen laufen über GitHub-Issues; Pull Requests sind willkommen.

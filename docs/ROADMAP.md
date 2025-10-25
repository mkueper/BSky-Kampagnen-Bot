# Roadmap – BSky-Kampagnen-Bot

Die Roadmap beschreibt mittelfristige Schwerpunkte. Sie wird laufend angepasst; Feedback und Issues sind ausdrücklich willkommen.

---

## Phase 1 – Stabilisierung & Betrieb (laufend)

**Ziel:** Das bestehende Funktionsset (Planung, Scheduler, Engagement, integrierter Bluesky-Client) robust und produktionsnah betreiben können.

Schwerpunkte:
- Hardening der Deployment-Pfade (Docker, systemd, Backups)
- Verbesserte Fehlermeldungen & Telemetrie (Logging, SSE-Events)
- Medien-Handling, Upload-Limits und Datenbank-Baseline weiter absichern
- Dokumentation & Onboarding (dieser Stand)

---

## Phase 2 – Sicherheit & Mehrbenutzerfähigkeit

**Ziel:** Das System hinter einer Authentifizierung sicher betreiben; mehrere Nutzer:innen sollen gemeinsam arbeiten können.

Geplante Aufgaben:
1. API-/Dashboard-Auth (z. B. OAuth oder App-interne Benutzerverwaltung)
2. Rollen-/Rechtekonzept (mindestens „Admin“ vs. „Editor“)
3. Audit-Logs für Scheduler- und Posting-Aktionen
4. Rate-Limiting & CSRF-Schutz für kritische Endpunkte

---

## Phase 3 – Plattform- & Workflow-Erweiterungen

**Ziel:** Zusätzliche Kanäle und Automatisierungen erschließen, ohne den Kern zu überlasten.

Ideen & Kandidaten:
- Mastodon-Feature-Parität (Import/Export, Reaktionen, Direkt-Client)
- Wiederkehrende Kampagnen mit konfigurierbaren Enddaten
- Workflow-Automatisierungen (z. B. „Review → Freigabe → Versand“)
- Webhooks / Export-APIs für externe Auswertungen
- Support für alternative Speicher (S3 für Medien, experimentelle Postgres-Migration)

---

## Leitprinzipien

- **Transparenz:** Features sollen nachvollziehbar dokumentiert sein (Changelog, Docs).
- **Schrittweise Releases:** Jede Phase liefert ein nutzbares Zwischenergebnis; große Umbauten werden in kleine Migrationsschritte zerlegt.
- **Community:** Feature-Requests und Diskussionen laufen über GitHub-Issues; Pull Requests sind willkommen.

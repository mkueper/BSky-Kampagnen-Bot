# Changelog

Alle nennenswerten Änderungen an diesem Projekt.

## Unreleased

- UI konsolidiert:
  - Gemeinsame Komponenten `Button`, `Card`, `Badge` eingeführt und breite Refactors (Skeets/Threads/ConfigPanel/App Header)
  - Einheitliche Styles (Abstände, Hover, Variants), Sortier‑Icons in den Ansichten „Veröffentlicht“
  - `Button` um `size="icon"` erweitert; Sortier‑ und Header‑Buttons umgestellt
  - `Badge` mit `icon`‑Prop und Größen (`sm`, `md`)
  - Main Overview auf `Card` umgestellt
- Dashboard‑Funktionen:
  - Threads: Aggregierte Reaktionen (Likes/Reposts/Replies) auf der ersten Karte; Antworten mit Segment‑Nummer
  - On‑Demand‑Refresh „Reaktionen aktualisieren“ pro Thread
  - Nach Speichern/Restore sofortiges Refresh und gezielte Navigation (Geplant/Scroll zur Karte)
- Backend:
  - Engagement‑Collector für Threads (periodisch + on‑demand), speichert Metriken je Segment und Replies (`SkeetReaction`)
  - `retractThread`: Status nach erfolgreichem Entfernen → `deleted` (Papierkorb), `deletedPreviousStatus` gemerkt
  - Client‑Polling‑Settings (Lesen/Speichern) inkl. DB‑Overrides; `/api/client-config` mergen DB‑Werte
- Konfiguration/Doku:
  - `.env.sample` umfangreich kommentiert und korrigiert (korrekte Variablennamen)
  - `src/config.js` dokumentiert (Env‑Priorität, Fallbacks)
  - README: API‑Abschnitt ergänzt; Feature „Engagement‑Collector“ dokumentiert
  - `docs/frontend-user-guide.md`: Sortierung, On‑Demand Refresh, Restore‑Verhalten; `docs/ui.md`: UI‑Guidelines
  - `docs/api.md`: API Quick Reference
  - README: Abschnitt „Umgebungen (dev/prod)“ mit `.env.dev`/`.env.prod` und Umschalt‑Scripts
  - `BUNDLE_USAGE.txt` (docker-bundle) um Env‑Hinweise erweitert; Bundle enthält keine `.env`
- Environments/Scripts:
  - Neue Scripts: `switchenv:dev`, `switchenv:prod` (kopieren `.env.dev`/`.env.prod` → `.env`, mit Backup)
  - `start:dev`/`start:prod` schalten `.env` automatisch um, aber nur wenn keine `.env` existiert (sicheres `if-missing`)
- Tooling/Bereinigung:
  - Neues Helper‑Script: `changelog:add` (fügt Einträge unter „Unreleased“ hinzu)
  - ESLint‑Setup hinzugefügt (`.eslintrc.cjs`, `.eslintignore`, `npm run lint`, `npm run lint:fix`)
  - Unnötige React‑Imports entfernt (neue JSX‑Runtime)
  - Dashboard‑`package.json`: serverseitige Pakete entfernt (z. B. `sequelize`, `sequelize-cli`)

## Vorherige Versionen

Siehe Git‑Historie für ältere Änderungen.

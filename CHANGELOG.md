# Changelog

Alle nennenswerten Änderungen an diesem Projekt.

## Unreleased

### Docker/Compose
- Frontend-Dockerfile baut Dashboard über Root-Workspace (`npm ci --workspace dashboard`), stabilisiert Builds trotz veraltetem `dashboard/package-lock.json`.
- Healthchecks ergänzt: `backend` (HTTP `GET /health`), `frontend` (HTTP Probe über `curl`). `frontend` hängt an `backend` (service_healthy).
- Frontend-Healthcheck auf `curl` umgestellt und `curl` in `nginx:alpine` installiert (verhindert Status „starting“ in Portainer ohne `wget`).

### Scripts
- `scripts/docker-bundle.sh` macht nun `cd` ins Projekt‑Root, unabhängig vom Aufruf‑Verzeichnis. Fix für Fehler nach Ordner‑Umzug (backend/).

### CI
- Workflow `CI` hinzugefügt: prüft Lockfile‑Drift (Dashboard) und Workspace‑Installation via `npm ci`.

### Docs
- Docker‑Installationsanleitung aktualisiert: Hinweis auf Healthchecks, Workspaces‑Build im Dockerfile und Portainer‑Hinweis.

## v1.1.0 - 2025-10-13

### Security
- Backend: Remove mastodon-api, implement fetch-based Mastodon client; npm audit now shows 0 vulnerabilities.

### Docs

### Backend

### Realtime

### UI

### Electron

### DX
- Replace mastodon-api with fetch client; remove vulnerable transitive deps (request/form-data/tough-cookie); audit: 0 vulns; smoke scripts load module-alias
- README + .env.sample: SSE als primäre Live-Update-Quelle, Polling nur Fallback; ENV-Prioritäten und neue Polling-Defaults dokumentiert (active 30s, idle 2m, hidden 5m, jitter 0.2).
- Scheduling: Treat datetime-local as local time; fix +2h drift; frontend submits naive string; server parses robustly.
- Add SSE endpoint (/api/events); UI subscribes and refreshes immediately on publish and engagement events; polling paused when SSE connected.
- Config: Saving credentials navigates immediately to Overview and no longer jumps back; polling fallback intervals increased (active 30s, idle 2m, hidden 5m).
- Window: Hide menubar, block reload/devtools in prod, open external links in system browser, remember window size/position; default 1240x980.
- Baseline migration more defensive for SQLite (ignore changeColumn failures); auto-create SQLite storage directory; disable caching for index.html; updated .env.sample and README.


## v1.0.1 - 2025-10-12

### Struktur/Architektur
- Projektstruktur modularisiert:
- Controller nach `src/api/controllers/` verschoben.
- Services nach `src/core/services/` verschoben.
- Models nach `src/data/models/` verschoben.
- Pfade im Code angepasst; `server.js` lädt Controller/Services/Models aus den neuen Orten.
- DB-Config-Ladepfad robust gemacht (`src/data/models/db.js` lädt `config/config.js` über `process.cwd()`), verhindert Pfadfehler nach Umzug.

### Alias-Imports
- Alias-Pfade eingeführt (Editor/Tests/Runtime): `@api`, `@core`, `@data`, `@platforms`, `@utils`, `@config`, `@env`.
- Vitest: `resolve.alias` + `tests/setup.alias.js` (lädt `module-alias/register`) für CJS-`require` mit Aliases.
- Node-Laufzeit: `server.js` lädt `module-alias/register` optional (kein Startabbruch ohne Dependency).
- package.json: `_moduleAliases` ergänzt; tsconfig `paths` hinzugefügt.

### Tests
- Neue Unit-Tests:
- `src/platforms/profiles.test.js` (Bluesky/Mastodon: validate/toPostPayload).
- `src/core/services/platformContext.test.js` (Credential-Validierung).
- Controller-Tests: `mediaController` (MIME/Größe) und `uploadController` (Data-URL/Größe) mit isolierten Mocks.
- SDK-Imports (Bluesky/Mastodon) auf Lazy-Import umgestellt, damit Tests ohne externe Abhängigkeiten laufen.

### Lint/Tooling
- ESLint-Config erweitert:
- Test-Globals (`describe`, `it`, `expect`, `vi`).
- ESM-Konfigdateien (`vitest.config.mjs`, `eslint.config.mjs`) inkl. `URL`-Global.
- Frontend: ungenutzte Zustandsvariable in `SkeetForm.jsx` entfernt; Validierungs-Logik konsolidiert.
- Dashboard: Lint-Fixes – ungenutzte Variablen entfernt; ESLint-Fehler behoben

### Docs/IDE
- VS Code Workspace verbessert (`BSky-Kampagnen-Bot.code-workspace`):
- ESLint Flat Config aktiviert und Auto-Fix on Save (`source.fixAll.eslint`).
- TypeScript nutzt Workspace-TS (`typescript.tsdk`).
- Suche/Explorer-Excludes vereinheitlicht; Dateizuordnungen für `*.mjs`/`*.cjs`.
- Launch/Debug: Backend (Node Inspect), Dashboard (Chrome), Compound (beides).
- Tasks: Backend Dev (npm run dev), Dashboard Vite Dev (mit robustem ProblemMatcher).
- Doku ergänzt: `docs/development/vscode-workspace.md`.

### Build/Tooling
- `build:all` repariert: Backend-Build als No‑Op, Frontend‑Build unverändert.
- Neues Script `build:backend` eingeführt; `build` referenziert dieses Script.
- `tsconfig.json` bereinigt: nur `scripts/**/*.ts` für Typecheck; veraltete `src/*`-Mappings entfernt.
- Smoke‑Skripte auf neue Backend‑Pfadstruktur (`backend/src/...`) angepasst.
- GitHub Actions Workflow hinzugefügt und erweitert: Node‑Matrix (20, 22), Typecheck, Tests (Vitest), Lint, Dashboard‑Build.

### Dokumentation
- README/Installationsguides präzisiert: `build:all` baut das Dashboard, Backend benötigt keinen Build.
- Server‑Installationsguide: `pm2 start backend/server.js` statt `server.js` im Root.
- README: CI‑Badge und kurzer Abschnitt zu CI ergänzt.
- Frontend‑Benutzerhandbuch aktualisiert: Bereiche „Aktivität“ (Skeets/Threads) und Karte „Nächster Post“ ergänzt; Begriffe („Antworten“) konsistent.
- Ergänzt: Screenshots‑Abschnitt im Frontend‑Benutzerhandbuch (docs/frontend-user-guide.md). Enthält alle 10 Ansichten (Übersicht, Skeets geplant/veröffentlicht/Papierkorb, Skeet planen, Threads geplant/veröffentlicht/Papierkorb, Thread planen, Konfiguration) mit direkten Bild‑Links aus docs/Screenshots.
- Hinweis in der Doku‑Übersicht (docs/README.md): Verweis auf den neuen Screenshots‑Abschnitt und den Ordner docs/Screenshots.

### Frontend/UX
- Threads-Übersicht (Mobile): Aktionsleiste nutzt `flex-wrap`; Buttons umbrechen nicht mehr aus dem View.
- Replies-/Reaktionen-Buttons: nur bei veröffentlichten/gesendeten Threads sichtbar.
- Metrik-Zeile („Likes · Reposts · Antworten“) bei geplanten Threads ausgeblendet; stattdessen „Geplant“.
- Header-Aktionen (Mobile): Titelzeile ohne Umbruch; Buttons in zweite Zeile (overflow-x auto), Desktop weiterhin eine Zeile.
- Export/Import: Icon-Buttons auf Mobile (Text ab `sm` sichtbar); Buttons in Übersicht/Konfiguration ausgeblendet.
- SummaryCard als gemeinsame Komponente extrahiert (einheitliches Styling, Zeit fett, Props `time`/`snippet`, Standard‑Untertitel „Nächster Post“).
- Neue `ActivityPanel`‑Komponente für „Skeet Aktivität“/„Thread Aktivität“ in den Gruppenseiten neben der SummaryCard.
- Wortlaut vereinheitlicht („Antworten“ statt „Replies“, „Skeet Übersicht“/„Thread Übersicht“, Navigationseinträge „Aktivität“).
- Endgültiges Löschen (Threads) nutzt jetzt den bestehenden `ConfirmDialog` statt `window.confirm`.
- UI‑Abstand unter der Header‑Trennlinie erhöht (`pt-6`) in Skeets/Threads Aktivität.
- Auskommentierte, veraltete Blöcke entfernt (Aufräumarbeiten).
- Threads: Bei Bulk‑Refresh ist die „Antworten“-Checkbox während der Ausführung deaktiviert (verhindert State‑Flackern).

### Logging
- Backend-Logs vereinheitlicht (nutzt `createLogger` statt `console.*` in Kernpfaden wie Scheduler/Media/Engagement).
- Statische Routen/Wildcard-Route mit klaren Meldungen und reduziertem Loglevel (Debug/Info/Warn/Error).

### Hinweise
- Für lokale Entwicklung wird Node 20 LTS empfohlen. Ältere sqlite3-Bindings können mit `npm rebuild sqlite3 --build-from-source` für die aktive Node-Version neu gebaut werden.

### Code Quality
- Umfangreiches Linting des gesamten Code-Repositorys durchgeführt und ca. 70 Fehler und Warnungen behoben.
- Behobene Probleme umfassen ungenutzte Variablen, leere Code-Blöcke, redundante Logik und ungültige Leerzeichen.
- Dies verbessert die allgemeine Code-Qualität, Lesbarkeit und Wartbarkeit der Anwendung.

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
- Uploads/Body‑Limit: `server.js` liefert `/uploads` statisch aus; JSON‑Body‑Limit konfigurierbar via `JSON_BODY_LIMIT_MB` (Default 25MB). URL‑encoded Limit entsprechend gesetzt.
- Skeets: Medien‑Support analog Threads
- Modell `SkeetMedia` + Endpunkte: `POST /api/skeets/:id/media`, `PATCH /api/skeet-media/:mediaId`, `DELETE /api/skeet-media/:mediaId`.
- `scheduler` postet Skeet‑Medien (bis 4) an Bluesky/Mastodon.
- `listSkeets` optional inkl. Medien (mit `previewUrl`).

### Frontend
- Threads‑Übersicht:
- Button „Reaktionen aktualisieren“ mit Ladezustand und Toast‑Feedback (Summen).
- „Alle aktualisieren“ im Tab „Veröffentlicht“ (ruft Backend‑Bulk‑Refresh, zeigt Ergebnis‑Toast).
- Erste Karte zeigt jetzt zusätzlich je Plattform „Likes · Reposts“ (Bluesky/Mastodon) und „Zuletzt aktualisiert“.
- Medien (Threads):
- Toolbar je Skeet (🖼️/GIF/😊), Upload‑Dialog mit Vorschau + Alt‑Text (Policy: maxCount/maxBytes/allowedMimes/requireAltText).
- 2×2‑Vorschau im Editor; Overlays pro Bild („+ ALT/ALT“, „✕“), Alt‑Editor als Dialog, stabile Modals (Portal + Scroll‑Lock), fester Vorschaubereich (kein Flackern).
- Fehler‑Dialog bei zu großen Dateien (client/server‑seitig).
- Medien (Skeets):
- Toolbar + Upload‑Dialog, 2×2‑Vorschau mit Overlays und Alt‑Editor wie bei Threads (Create/ Edit).
- Geplante und veröffentlichte Skeet‑Listen zeigen Thumbnails (2×2, lazy).
- Bestätigungsdialoge: Einheitlicher `ConfirmDialog` ersetzt native `window.confirm` in allen Aktionen (Skeets/Threads).
- Thread‑Editor:
- Minimaler Medien‑Upload pro Segment (Edit‑Modus): Alt‑Text Feld + „Bild hinzufügen“ (JSON‑Upload, Base64). Vorbereitung für Multi‑Media.

### Tools
- Neues Script: `npm run tools:set-masto-segment`
- Setzt Mastodon‑`statusId`/`uri` pro Segment; unterstützt Single, CSV‑Bulk (`--statusIds/--uris`) und Mapping‑Datei (`--file`).

### Datenbank
- Neue Tabelle `ThreadSkeetMedia` (Medien zu Segmenten) mit Feldern: `threadSkeetId`, `order`, `path`, `mime`, `size`, `altText`.
- Neue Tabelle `SkeetMedia` (Medien zu Skeets) mit Feldern: `skeetId`, `order`, `path`, `mime`, `size`, `altText`.
- Engagement‑Services versehen mit Debug‑Ausgaben, steuerbar über `ENGAGEMENT_DEBUG`.

### Import/Export
- Export/Import unterstützen jetzt Medien mit ALT‑Text
- Threads: `segments[].media[]` wird mit `{ filename, mime, altText, data(base64) }` roundtrippfähig exportiert und importiert (max. 4 pro Segment).
- Skeets: `skeets[].media[]` analog (max. 4 pro Skeet).
- Duplikat‑Schutz beim Import
- Threads: gleicher `title` + `scheduledAt` und identische Segment‑Texte → Eintrag wird übersprungen.
- Skeets: gleicher `content` + Termin/Repeat‑Kombination → Eintrag wird übersprungen.
- Hinweis: Große Exporte durch Base64 möglich; `JSON_BODY_LIMIT_MB` (Default 25MB) steuert das Upload‑Limit.
- Serverseitiger Engagement‑Collector drosselbar nach Client‑Präsenz
- Neuer Endpoint `POST /api/heartbeat` vom Frontend‑Master‑Tab.
- Scheduler nutzt aktive/idle Minimalintervalle: `ENGAGEMENT_ACTIVE_MIN_MS` (Default 2 Min) und `ENGAGEMENT_IDLE_MIN_MS` (Default 20 Min).
- Idle‑Schwelle konfigurierbar: `CLIENT_IDLE_THRESHOLD_MS` (Default 20 Min ohne Heartbeat).

### Schema & Migrationen
- Baseline-Migration hinzugefügt: `migrations/00000000000000-baseline-rebuild.js` konsolidiert das gesamte aktuelle Schema (Threads/Skeets/Reactions/Media/Settings) in einem Schritt.
- Bestehende Migrationen nach `migrations/_archive/` verschoben (nur Baseline bleibt aktiv).
- Idempotente Guards ergänzt (Tabellen/Spalten/Indizes werden vor `add*/create*` geprüft) — behebt Fehler wie `SQLITE_ERROR: index ... already exists` auf bestehenden Datenbanken.
- Neue Skripte:
- `db:reset:*` löscht die DB‑Datei (SQLite) und baut frisch über Migrationen auf.
- `meta:clean:*` räumt `SequelizeMeta` auf und behält nur die Baseline‑Migration.

### Backend/Config
- `sequelize.sync()` per ENV steuerbar: in Prod standardmäßig aus, via `DB_SYNC=false` in `.env` erzwungen (Dev per Default an). Start‑Logs entsprechend angepasst.
- Beispiel‑Envs aktualisiert: `.env.dev` (DB_SYNC=true), `.env.prod` (DB_SYNC=false). `.env.sample` dokumentiert die Option.
- Doku ergänzt: Hinweise zu Migration‑Only‑Betrieb (Server/Docker/Local).

### Frontend – UI/Editor
- SkeetForm: Hook‑Fehler behoben (kein `useState` mehr auf Modul‑Top‑Level).
- SkeetForm/ThreadForm: Zielplattform‑Buttons vereinheitlicht (Pill‑Stil, mindestens eine Plattform bleibt aktiv).
- SkeetForm/ThreadForm: Info‑Buttons + Modals mit kompakten Hinweisen (Inhalt/Vorschau). „Bilder werden beim Speichern …“ aus der Vorschau in Info‑Dialog verlegt.
- SkeetForm: Dezente Buttons (statt blau), Emoji/GIF/Medien‑Buttons bleiben sichtbar. Icons vergrößert (🖼️/😊).
- SkeetForm: Überschriftengrößen an ThreadForm angepasst; Info‑Buttons auf Desktop neben Überschriften ausgerichtet.


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

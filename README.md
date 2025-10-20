# Bluesky Kampagnen-Bot

[![CI](https://github.com/mkueper/BSky-Kampagnen-Bot/actions/workflows/ci.yml/badge.svg)](https://github.com/mkueper/BSky-Kampagnen-Bot/actions/workflows/ci.yml)

Der **Bluesky Kampagnen-Bot** hilft dabei, Skeets vorzuplanen, automatisiert zu veröffentlichen und Reaktionen komfortabel im Dashboard zu verfolgen. Das Projekt setzt auf eine Node.js/Express-API mit SQLite (optional PostgreSQL), ein React-Dashboard und einen Scheduler, der geplante Beiträge zuverlässig ausliefert.

> Hinweis (Sicherheit & Reifegrad)
>
> Dieses Projekt befindet sich noch in aktiver Entwicklung. Es gibt derzeit keine Benutzer‑/Admin‑Authentifizierung; Schreib‑Endpunkte der API sind ohne Schutz aufrufbar. Der Betrieb auf einem öffentlich erreichbaren Server ist daher nicht empfohlen. Verwende den Bot nur lokal oder hinter einer geschützten Umgebung (VPN/Reverse Proxy mit Auth). Entsprechende Härtungen (Auth, Rate‑Limiting, Security‑Header) sind geplant.

---

## Aktuelle Funktionen

- **Planen & Veröffentlichen** – Skeets erstellen, terminieren, bearbeiten oder löschen; Threads bleiben verknüpft.
- **Automatischer Scheduler** – Cron-basiert, inklusive Retry-Strategie mit Backoff und Live-Konfiguration aus dem Dashboard.
- **Live‑Updates via SSE** – Das Dashboard aktualisiert sich bei Veröffentlichungen und Engagement‑Refreshs sofort über Server‑Sent Events (SSE). Polling dient nur noch als Fallback.
- **Konfiguration im Dashboard** – Scheduler (Cron/Zeitzone/Retries) und Fallback‑Polling (Intervalle/Backoff/Jitter) bequem änderbar; Änderungen werden in der DB gespeichert und wirken ohne Rebuild.
- **Engagement‑Collector** – Sammelt periodisch Likes/Reposts/Replies (Bluesky, optional Mastodon) für veröffentlichte Threads; On‑Demand Refresh pro Thread möglich.
- **Reaktionen & Replies** – Likes/Reposts abrufen sowie Antworten aus Bluesky und Mastodon direkt in der Skeet-Karte anzeigen.
- **Plattformauswahl & Crossposting** – Zielplattformen pro Skeet festhalten; aktuell Bluesky und Mastodon.
- **Frontend-Tabs & UX** – Geplante/veröffentlichte Skeets, Reply-Ansicht, Export/Import geplanter Beiträge.
- **Theme-Wechsel** – Light/Dark-Mode direkt im Dashboard umschalten.

> Die Roadmap in `docs/ROADMAP.md` zeigt, welche Erweiterungen (Multi-Tenant, zusätzliche Plattformen, erweiterte Analysen) geplant sind.

---

## Schnellstart (lokale Entwicklung)

```bash
# Repository klonen
git clone https://github.com/mkueper/BSky-Kampagnen-Bot.git
cd BSky-Kampagnen-Bot

# Backend-Abhängigkeiten installieren
npm install

# Dashboard-Abhängigkeiten installieren und initial bauen
npm run install:frontend
npm run build:frontend

# Environment vorbereiten
cp .env.sample .env
# BLUESKY_IDENTIFIER / BLUESKY_APP_PASSWORD (optional MASTODON_*) ergänzen

# Entwicklung starten (mit automatischem Reload)
npm run start:dev
```

- API: <http://localhost:3000>
- Dashboard: wird vom Express-Server ausgeliefert (`dashboard/dist`).

> Für den Produktionsmodus kannst du `npm run build:all` (baut das Dashboard; Backend benötigt keinen Build) und anschließend `npm start` verwenden. Details siehe `docs/installation/local-install.md`.

---

## ThreadWriter Desktop (Tauri)

Der ThreadWriter wurde in ein eigenes Repository ausgelagert:

<https://github.com/mkueper/ThreadWriter>

Dort findest du die Tauri-Variante inklusive Installationshinweisen und Build-Skripten.

---

## Betrieb mit Docker Compose

Das Repository enthält Compose-Dateien für Backend und Frontend (SQLite als Default). Beispiel:

```bash
cp .env.sample .env
# Zugangsdaten setzen und optional Ports anpassen (BACKEND_PORT, FRONTEND_PORT)

docker compose build
docker compose up -d
```

- Backend erreichbar unter `http://localhost:${BACKEND_PORT:-3000}`
- Frontend erreichbar unter `http://localhost:${FRONTEND_PORT:-8080}`

> Nach dem Hochfahren einmalig (und nach jedem Update) `docker compose exec backend npm run migrate:prod` ausführen.

Die Frontend-Container-Konfiguration (`docker/nginx-frontend.conf`) leitet `/api/*` automatisch an den Backend-Service weiter. Detaillierte Hinweise (Volumes, Updates, Reverse Proxy) findest du in `docs/installation/docker-install.md`.

---

## Projektstruktur (Kurzüberblick)

```
BSKy-Kampagnen-Bot/
├─ backend/server.js        # Express-Einstiegspunkt, Scheduler-Bootstrap
├─ backend/src/             # Backend-Quellcode (Controller, Services, Models)
├─ dashboard/               # React-Dashboard (Vite, Build in dashboard/dist)
├─ docker/                  # Dockerfiles + Nginx-Konfiguration
├─ docs/                    # Architektur- und Installationsdokumentation
└─ data/                    # SQLite-Datenbanken (Standard)
```

Weitere Details zu Architektur & Diagrammen findest du in `docs/README.md`.

Weitere Dokumentation:
- API Quick Reference: `docs/api.md`
- UI‑Richtlinien und Komponenten: `docs/ui.md`
- Frontend Benutzerhandbuch: `docs/frontend-user-guide.md`
- VS Code Workspace & Debugging: `docs/development/vscode-workspace.md`

Changelog pflegen:
- Schnell einen Bullet direkt unter „Unreleased“ einfügen:
  - `npm run changelog:add -- "Kurzer Eintragstext"`
- Disziplinierter Ansatz mit Tagesnotizen und Release-Zusammenfassung:
  - Tägliche Notiz (schreibt in `changelog-unreleased.md`):
    - `npm run changelog:note -- --section=UI "Sortier-Icons für veröffentlichte Skeets"`
    - Sektion ist optional (`--section=Backend|UI|Docs|Tooling|…`)
  - Release erstellen (übernimmt Unreleased-Notizen nach `CHANGELOG.md`):
    - `npm run changelog:release -- 1.2.3`

---

## Wichtige Environment-Variablen (Auszug)

| Variable                | Beschreibung                                             | Standard |
|-------------------------|-----------------------------------------------------------|----------|
| `BLUESKY_SERVER_URL`    | Bluesky-Endpunkt                                         | `https://bsky.social` |
| `BLUESKY_IDENTIFIER`    | Handle oder Mailadresse für den Bot                      | –        |
| `BLUESKY_APP_PASSWORD`  | App-spezifisches Passwort                                 | –        |
| `MASTODON_API_URL`      | Mastodon-Instanz (optional)                              | –        |
| `MASTODON_ACCESS_TOKEN` | Token für den Mastodon-Account                           | –        |
| `TIME_ZONE`             | Zeitzone des Schedulers                                  | `Europe/Berlin` |
| `POST_RETRIES`          | Max. Wiederholversuche beim Posten                       | `4`      |
| `POST_BACKOFF_MS`       | Basis-Backoff in Millisekunden                          | `600`    |
| `POST_BACKOFF_MAX_MS`   | Maximaler Backoff in Millisekunden                      | `5000`   |
| `BACKEND_INTERNAL_PORT` | Interner Backend-Port (Container)                        | `3000`   |
| `BACKEND_PORT`          | Exponierter Backend-Port                                 | `3000`   |
| `FRONTEND_PORT`         | Port des Nginx-Frontends                                 | `8080`   |

> Hinweis: Standardmäßig lauscht der Backend-Container intern auf `BACKEND_INTERNAL_PORT` (Standard `3000`). Der Host-Port (`BACKEND_PORT`) wird ausschließlich über das Compose-Port-Mapping (`${BACKEND_PORT:-3000}:${BACKEND_INTERNAL_PORT:-3000}`) gesteuert.

Eine vollständige Liste inkl. optionaler Variablen findest du in `.env.sample`.

---

## Umgebungen (dev/prod)

- Dateien:
  - `.env.dev` – Entwicklung/Test: Bluesky/Mastodon‑Zugangsdaten von leeren Test‑Accounts (keine Follower → kein Spam‑Risiko).
  - `.env.prod` – Produktion: Zugangsdaten des echten Bot‑/User‑Kontos.
- Aktive `.env` umschalten:
  - `npm run switchenv:dev` → kopiert `.env.dev` nach `.env` (alte `.env` wird mit Zeitstempel gesichert)
  - `npm run switchenv:prod` → kopiert `.env.prod` nach `.env`
- Empfehlungen:
  - Preflight prüft Bluesky‑Creds; Mastodon ist optional.
  - Für Tests niemals Produktions‑Accounts verwenden (Rate‑Limits, Spam‑Risiko).
  - Nach Umschalten ggf. Dashboard neu bauen, wenn `VITE_*` betroffen ist (`npm run build:frontend`).

---

## Konfigurationsprinzipien (Env-Priorität)

- UI‑Overrides im Dashboard haben höchste Priorität; danach gelten:
  - Serverseitige Variablen ohne Präfix → Build‑Zeit‑Variablen (`VITE_*`) → Defaults.
  - Beispiel Zeitzone: `TIME_ZONE` → `VITE_TIME_ZONE` → Fallback `Europe/Berlin`.
  - Beispiel Polling: `POLL_*`/`THREAD_POLL_*`/`SKEET_POLL_*` → `VITE_*` → Defaults.
- `VITE_*` Variablen werden beim Frontend‑Build in den Client eingebettet und sind im Browser sichtbar.
- Laufzeit‑Overrides ohne `VITE_` werden per `/api/client-config` an das Dashboard geliefert und können `VITE_*` zur Laufzeit überschreiben.
- UI‑Overrides (Dashboard) werden dauerhaft in der Datenbank gespeichert und vom Backend in `/api/client-config` gegenüber Env/VITE bevorzugt ausgeliefert.
- Portauflösung (Server): `APP_PORT` → `BACKEND_INTERNAL_PORT` → `INTERNAL_BACKEND_PORT` → `BACKEND_PORT` → `3000`.

Sicherheitshinweis: `.env` nicht committen und lokal restriktive Rechte setzen (z. B. `chmod 600 .env`).

---

## API (Advanced)

Diese Endpunkte sind vor allem für die UI und Admin‑Tasks relevant.

- `GET /api/client-config` – Read‑only Client‑Konfiguration (Polling‑Intervalle etc.).
- `GET /api/settings/scheduler` – Scheduler‑Einstellungen (Cron/Zeitzone/Retries).
- `PUT /api/settings/scheduler` – Scheduler‑Einstellungen speichern.
- `GET /api/settings/client-polling` – Client‑Polling‑Einstellungen (DB‑Overrides).
- `PUT /api/settings/client-polling` – Client‑Polling‑Einstellungen speichern.
- `POST /api/threads/:id/engagement/refresh` – Engagement (Likes/Reposts/Replies) für einen Thread neu sammeln.
- `GET /api/reactions/:skeetId` – Reaktionen für einen veröffentlichten Skeet laden (on‑demand).

Die UI nutzt diese Routen bereits; sie können auch für Integrationen/Tests verwendet werden.

---

## Tests & Qualitätssicherung

- **Manuelle Checks:** `npm run start:dev` (Backend) + neues Build des Dashboards (`npm run build:frontend`).
- **Linting/Formatting:** Das Projekt enthält Linting-Regeln. Mit `npm run lint` kannst du den Code prüfen und mit `npm run lint:fix` automatisch korrigieren lassen.
 - **VS Code Workspace & Debugging:** Hinweise und Best Practices: `docs/development/vscode-workspace.md`.
 - **CI (GitHub Actions):** Workflow `CI` prüft TypeScript (`npm run typecheck`), baut das Dashboard (`npm run build:frontend`), führt Linting aus und startet Tests mit Vitest auf Node 20 und 22.
- **Docker-Builds:** `docker compose build --no-cache frontend` erzwingt das Neu-Bauen der React-App, falls sich das Dashboard geändert hat.
- **Bundle (inkl. Datenbank):** `npm run docker:bundle` erstellt ein Zip (`dist/bundles/…`) mit Docker-Compose-Dateien, vollständigem Projekt (ohne `node_modules`/`dist`) und der aktuellen SQLite-Datenbank – ideal zum Kopieren auf einen Server.

---

## Mitwirken

Issues, Ideen und Pull Requests sind willkommen! Bitte beachte die bestehenden Dokumente:

- `docs/ROADMAP.md` – geplanter Funktionsumfang.
- `docs/Agent.md` – Überblick über den Kampagnen-Agenten.
- `docs/database.md` – aktuelles Schema, Migrationen und Pflegehinweise.
- `docs/diagramme/*` – Visualisierung wichtiger Prozesse.

Für Fragen oder Vorschläge einfach ein Issue eröffnen.

---

## Contributing

- UI-Konsistenz
  - Verwende gemeinsame Bausteine: `Button`, `Card`, `Badge` (siehe `docs/ui.md`).
  - Primäre Aktionen als `Button primary`, sekundäre als `secondary`. Für reine Icons `size="icon"` nutzen.
- Code-Qualität
  - Lint ausführen: `npm run lint` (optional `npm run lint:fix`).
  - Keine unbenutzten Variablen/Imports einchecken.
- Changelog-Workflow
  - Schnell: `npm run changelog:add -- "Kurzbeschreibung"` (landet unter „Unreleased“).
  - Diszipliniert: Tagesnotizen sammeln und beim Release konsolidieren:
    - Notiz: `npm run changelog:note -- --section=UI "Änderung"` (schreibt nach `changelog-unreleased.md` unter dem heutigen Datum)
    - Release: `npm run changelog:release -- 1.2.3` (übernimmt Notizen nach `CHANGELOG.md`).
- Environments
  - Entwicklung/Test über `.env.dev` (Test-Accounts ohne Follower), Produktion `.env.prod` (echter Bot/User).
  - Umschalten: `npm run switchenv:dev` / `npm run switchenv:prod`.

## Lizenz

Dieses Projekt steht unter der **GNU General Public License v3.0**. Details siehe [LICENSE](./LICENSE).

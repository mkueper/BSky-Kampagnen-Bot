# Bluesky Kampagnen-Bot

Der **Bluesky Kampagnen-Bot** hilft dabei, Skeets vorzuplanen, automatisiert zu veröffentlichen und Reaktionen komfortabel im Dashboard zu verfolgen. Das Projekt setzt auf eine Node.js/Express-API mit SQLite (optional PostgreSQL), ein React-Dashboard und einen Scheduler, der geplante Beiträge zuverlässig ausliefert.

---

## Aktuelle Funktionen

- **Planen & Veröffentlichen** – Skeets erstellen, nach Datum/Uhrzeit einplanen und später bearbeiten oder löschen.
- **Automatischer Scheduler** – prüft jede Minute, welche Skeets fällig sind, versendet sie und wiederholt fehlgeschlagene Versuche.
- **Reaktionen & Replies** – Likes/Reposts abrufen sowie Antworten direkt an der jeweiligen Skeet-Karte einsehen.
- **Plattformauswahl** – Zielplattformen pro Skeet festhalten (derzeit Bluesky, Mastodon in Vorbereitung).
- **Frontend-Tabs** – Übersichtlich zwischen geplanten und veröffentlichten Skeets wechseln; Replies sind direkt in der Karte eingebettet.

> Die Roadmap in `docs/ROADMAP.md` zeigt, welche Erweiterungen (Multi-Tenant, zusätzliche Plattformen, erweiterte Analysen) geplant sind.

---

## Schnellstart (lokale Entwicklung)

```bash
# Repository klonen
git clone https://github.com/mkueper/BSky-Kampagnen-Bot.git
cd BSky-Kampagnen-Bot

# Backend-Abhängigkeiten installieren
npm install

# Frontend-Abhängigkeiten installieren und bauen
cd dashboard
npm install
npm run build
cd ..

# Environment vorbereiten
cp .env.sample .env
# BLUESKY_IDENTIFIER / BLUESKY_APP_PASSWORD in .env ergänzen

# Entwicklung starten (mit automatischem Reload)
npm run start:dev
```

- API: <http://localhost:3000>
- Dashboard: wird vom Express-Server ausgeliefert (`dashboard/dist`).

> Für den Produktionsmodus kannst du `npm run build` (Backend-Transpile) und `npm start` verwenden. Details siehe `docs/installation/local-install.md`.

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

Die Frontend-Container-Konfiguration (`docker/nginx-frontend.conf`) leitet `/api/*` automatisch an den Backend-Service weiter. Detaillierte Hinweise (Volumes, Updates, Reverse Proxy) findest du in `docs/installation/docker-install.md`.

---

## Projektstruktur (Kurzüberblick)

```
BSky-Kampagnen-Bot/
├─ server.js                # Express-Einstiegspunkt, Scheduler-Bootstrap
├─ src/                     # Backend-Quellcode (Controller, Services, Models)
├─ dashboard/               # React-Dashboard (Vite)
├─ docker/                  # Dockerfiles + Nginx-Konfiguration
├─ docs/                    # Architektur- und Installationsdokumentation
└─ data/                    # SQLite-Datenbanken (Standard)
```

Weitere Details zu Architektur & Diagrammen findest du in `docs/README.md`.

---

## Wichtige Environment-Variablen (Auszug)

| Variable          | Beschreibung                               | Standard |
|-------------------|---------------------------------------------|----------|
| `BLUESKY_SERVER`  | Bluesky-Endpunkt                            | `https://bsky.social` |
| `BLUESKY_IDENTIFIER` | Handle oder Mailadresse                   | –        |
| `BLUESKY_APP_PASSWORD` | App-spezifisches Passwort               | –        |
| `BACKEND_INTERNAL_PORT` | Port des Backend-Servers im Container    | `3000`   |
| `BACKEND_PORT`    | Exponierter Host-Port (Port-Mapping)        | `3000`   |
| `FRONTEND_PORT`   | Port des Nginx-Frontend-Containers          | `8080`   |
| `TIME_ZONE`       | Zeitzone für Scheduler                      | `Europe/Berlin` |

> Hinweis: Standardmäßig lauscht der Backend-Container intern auf `BACKEND_INTERNAL_PORT` (Standard `3000`). Der Host-Port (`BACKEND_PORT`) wird ausschließlich über das Compose-Port-Mapping (`${BACKEND_PORT:-3000}:${BACKEND_INTERNAL_PORT:-3000}`) gesteuert.

Eine vollständige Liste inkl. optionaler Variablen findest du in `.env.sample`.

---

## Tests & Qualitätssicherung

- **Manuelle Checks:** `npm run start:dev` (Backend) + neues Build des Dashboards (`npm run build` im `dashboard/`-Verzeichnis).
- **Linting/Formatting:** aktuell kein automatisches Setup – kann bei Bedarf ergänzt werden.
- **Docker-Builds:** `docker compose build --no-cache frontend` erzwingt das Neu-Bauen der React-App, falls sich das Dashboard geändert hat.
- **Bundle (inkl. Datenbank):** `npm run docker:bundle` erstellt ein Zip (`dist/bundles/…`) mit Docker-Compose-Dateien, vollständigem Projekt (ohne `node_modules`/`dist`) und der aktuellen SQLite-Datenbank – ideal zum Kopieren auf einen Server.

---

## Mitwirken

Issues, Ideen und Pull Requests sind willkommen! Bitte beachte die bestehenden Dokumente:

- `docs/ROADMAP.md` – geplanter Funktionsumfang.
- `docs/Agent.md` – Überblick über den Kampagnen-Agenten.
- `docs/diagramme/*` – Visualisierung wichtiger Prozesse.

Für Fragen oder Vorschläge einfach ein Issue eröffnen.

---

## Lizenz

Dieses Projekt steht unter der **GNU General Public License v3.0**. Details siehe [LICENSE](./LICENSE).

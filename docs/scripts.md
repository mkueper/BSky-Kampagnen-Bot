# npm Scripts & Workspace-Befehle

Schnelle Referenz zu allen wichtigen CLI-Befehlen. Die Skripte befinden sich in der Root-`package.json`, nutzen aber häufig Workspaces wie `dashboard`, `bsky-client` oder `packages/shared-ui`.

## Tests & Qualität

| Script | Beschreibung |
| --- | --- |
| `npm run test` | Führt die Vitest-Suite im Root (Backend) aus. |
| `npm run test:ui` | Startet Vitest im UI-Modus. |
| `npm run test:all` | Testet Backend, Dashboard, Bsky-Client und Shared-UI nacheinander (Workspaces). |
| `npm run lint` / `npm run lint:fix` | ESLint-Check bzw. Auto-Fix im gesamten Repo. |
| `npm run lint:all` | Lintet zusätzlich Backend, Dashboard, Bsky-Client, Media-Pickers und Shared-UI. |
| `npm run typecheck` | TypeScript-Typprüfung (kein Emit). |
| `npm run ci:verify` | Hilfsskript, das Lockfiles prüft (GitHub-Workflow nutzt es). |

## Lokale Entwicklung

| Script | Beschreibung |
| --- | --- |
| `npm run dev` | Backend-Entwicklung mit Nodemon. |
| `npm run dev:frontend` | Vite-Dev-Server des Dashboards (Workspace). |
| `npm run dev:bsky-client` | Dev-Server für den Bluesky-Client (Workspace). |
| `npm run dev:electron` | Startet Dashboard-Dev-Server und Electron-App parallel. |
| `npm run start` | Backend in Production-Mode (ohne Nodemon). |
| `npm run start:dev` / `start:test` / `start:prod` | Backend mit passendem `.env`-Switch. |

## Builds & Distribution

| Script | Beschreibung |
| --- | --- |
| `npm run build` | Alias für `build:backend` (Placeholder). |
| `npm run build:backend` | Placeholder (Backend benötigt keinen Build). |
| `npm run build:frontend` | Dashboard-Production-Build (Workspace). |
| `npm run build:bsky-client` | Bsky-Client-Build (Workspace). |
| `npm run build:shared-ui` | Platzhalter: gibt nur einen Hinweis aus (Shared UI wird direkt aus `src/` konsumiert). |
| `npm run build:all` | Fasst Backend, Bsky-Client, Dashboard, Shared-UI & Media-Pickers zusammen und zeigt am Ende eine Erfolgsübersicht. |
| `npm run build:electron` / `build:electron:win` | Electron-Build (Linux/Windows). |
| `npm run pack:electron` | Electron im Pack-Modus (dir). |
| `npm run docker:build` / `docker:bundle` | Docker Compose Build & Bundle-Skript. |

## Install & Infrastruktur

| Script | Beschreibung |
| --- | --- |
| `npm run install:all` | Installiert alle Workspaces (inkl. Root). |
| `npm run install:frontend` | Dashboard-Abhängigkeiten installieren. |
| `npm run install:bsky-client` | Bsky-Client-Abhängigkeiten installieren. |
| `npm run switchenv:dev` / `switchenv:prod` | Aktiviert passendes `.env`-Set über `scripts/switch-env.js`. |

## Datenbank & Migrationen

| Script | Beschreibung |
| --- | --- |
| `migrate:*` | Sequelize-Migrationen pro Umgebung (`dev`, `test`, `prod`). |
| `migrate:reset:*` | Rollback aller Migrationen + erneutes Ausführen. |
| `db:reset:*` | Custom Reset (Script + Migration). |
| `meta:clean:*` | Bereinigt `SequelizeMeta`. |
| `seed:*` | Seed-Skripte für jeweilige Umgebung. |

## Smoke-/Utility-Befehle

| Script | Beschreibung |
| --- | --- |
| `npm run smoke:bsky` / `smoke:masto` | Testpost an Bluesky bzw. Mastodon. |
| `npm run docker:bundle` | Bündelt Docker-Artefakte (Script). |
| `npm run changelog:add` / `:note` / `:release` / `:lint` | Hilfs-CLI zur Pflege von `changelog-unreleased.md`. |
| `npm run tools:set-masto-segment` | Utility, um Segment-Daten für Mastodon zu setzen. |

## Workspace-spezifische Hinweise

- **Dashboard** (`dashboard/package.json`): besitzt eigene `dev`, `build`, `test`, `lint` Skripte; werden über die Root-Skripte angesprochen.
- **Bsky-Client** (`bsky-client/package.json`): analog Dashboard mit Vite/Vitest.
- **Shared-UI** (`packages/shared-ui/package.json`): `build` führt ESLint + Vitest aus; `lint`/`test` lassen sich auch separat starten.
- **Media-Pickers** (`packages/media-pickers/package.json`): `build`/`lint` sind Platzhalter, da der Code eingecheckt ist.

> 💡 Tipp: Für einzelne Workspaces können die Skripte auch direkt aufgerufen werden, z. B. `npm run test --workspace packages/shared-ui`.

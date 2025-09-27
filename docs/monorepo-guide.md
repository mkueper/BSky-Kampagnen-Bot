# Monorepo-Setup für Kampagnen-Bot

Dieses Dokument beschreibt den neuen Workspace-Aufbau für Backend, Dashboard, Mobile- und Desktop-App.

## Workspaces

- `.` – Express/Node Backend (bestehender Bot)
- `dashboard/` – Vite + React Dashboard
- `apps/mobile/` – Expo/React Native Companion für unterwegs
- `apps/desktop/` – Tauri + React Desktop-Anwendung
- `packages/shared/` – Wiederverwendbare Hilfsfunktionen (z.B. Formatierung von Skeet-Entwürfen)

## Erste Schritte

```bash
npm install                 # Installiert Backend-Abhängigkeiten
npm run install:all         # Installiert zusätzlich alle Workspace-Dependencies
npm run build:frontend      # Baut das Dashboard (intern: workspace dashboard)
npm run mobile:start        # Expo Dev-Server für Mobilgeräte
npm run desktop:dev         # Vite-Dev-Server für Tauri-Frontend
# Für adhoc-Kommandos in Workspaces:
# ./scripts/run-workspace.sh apps/desktop dev -- --help
```

> Hinweis: Das Root-`.npmrc` deaktiviert das automatische Ausführen in allen Workspaces. Nutze daher die bereitgestellten Skripte oder setze `npm_config_workspaces=true`, wenn du eigene Kommandos mit `--workspace` starten möchtest.

## Mobile Build

```bash
npm run build --workspace apps/mobile -- --platform android
# bzw. npm run android --workspace apps/mobile usw.
```

## Desktop Build

```bash
npm run tauri:dev --workspace apps/desktop
npm run tauri:build --workspace apps/desktop
```

Vor dem Desktop-Build wird automatisch `npm run build` ausgeführt, wodurch das React-Frontend in `apps/desktop/dist` landet.

## Teilen von Logik

Die mobile und Desktop-App nutzen Hilfsfunktionen aus `@bsky-bot/shared`. Weitere gemeinsame Bausteine (z. B. Form-Validierung, API-Clients) können dort ergänzt werden.

## Nächste Schritte

1. API-Anbindung an das bestehende Backend herstellen (z. B. via REST oder zukünftige GraphQL-Schicht).
2. Authentifizierung und persistente Speicherung von Entwürfen (SecureStore/Keychain auf Mobilgeräten, lokale DB oder Filesystem unter Tauri).
3. Gemeinsame UI-Designtokens (Tailwind, NativeWind o. Ä.) konsolidieren, damit das Styling plattformübergreifend konsistent bleibt.

## Aktuelle Mobile Features

- Formular zur Erstellung von Skeet-Entwürfen mit Plattform-Auswahl
- Terminierung inkl. Datum/Uhrzeit sowie wöchentlicher oder monatlicher Wiederholung

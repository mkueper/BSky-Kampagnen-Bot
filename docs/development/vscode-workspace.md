# VS Code Workspace & Debugging

Diese Anleitung beschreibt die bereitgestellte VS Code Workspace‑Konfiguration und wie du Backend und Dashboard schnell startest und debuggen kannst.

## Überblick

- Workspace-Datei: `BSky-Kampagnen-Tool.code-workspace`
- Enthält:
  - Editor/Tooling‑Settings (ESLint Flat Config, TypeScript TSDK, Such‑Excludes)
  - Launch‑Konfigurationen (Backend Inspect, Dashboard Chrome, Compound)
  - Tasks (Backend Dev, Dashboard Vite Dev mit ProblemMatcher)

## Voraussetzungen

- Abhängigkeiten installieren:
  - `npm install`
  - `npm run install:frontend`
- Optional: `.env` aus `.env.sample` erstellen und Zugänge setzen

## Launch‑Konfigurationen (F5)

- Backend: Dev (Inspect)
  - Startet `npm run dev` (Nodemon) mit Debug‑Port `9229`
  - Attach möglich über „Backend: Attach 9229“

- Dashboard (Chrome)
  - Öffnet Chrome auf `http://localhost:5173`
  - Startet vorher Task „Dashboard: Vite Dev“ (falls noch nicht läuft)

- App: Backend + Dashboard
  - Startet Backend‑Debug und das Dashboard zusammen

## Tasks (Terminal → Run Task)

- Backend: Dev Server
  - Führt `npm run dev` im Repo‑Root aus

- Dashboard: Vite Dev
  - Führt `npm run dev` im Ordner `dashboard` aus
  - ProblemMatcher signalisiert „bereit“, sobald VS Code die lokale URL ausgibt (Default `http://localhost:5173`)

## Tipps

- Port anpassen: Wenn Vite auf einem anderen Port läuft, im Workspace die Background‑Patterns unter `tasks` → „Dashboard: Vite Dev“ anpassen.
- TypeScript SDK (wichtig in Multi‑Root):
  - Kein globales `typescript.tsdk` in der Workspace‑Datei setzen – das kann in Multi‑Root‑Workspaces zu ungültigen Pfaden wie `${workspaceFolder:Alles}/node_modules/...` führen.
  - Stattdessen Ordner‑spezifisch konfigurieren:
    - Dashboard (`dashboard/.vscode/settings.json`): `"typescript.tsdk": "node_modules/typescript/lib"`
    - Backend   (`backend/.vscode/settings.json`):  `"typescript.tsdk": "../node_modules/typescript/lib"`
  - Nach Änderungen in VS Code „TypeScript: Restart TS server“ ausführen. Optional „TypeScript: Select TypeScript Version → Use Workspace Version“ wählen.
- ESLint: Auto‑Fix on Save ist aktiv. Lint komplett ausführen: `npm run lint`.

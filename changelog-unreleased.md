# Unreleased Notes (Stand: 2025-10-18)

### Added
- ThreadWriter: Tauri-Setup für Desktop-App (v2)
  - Dev/Build-Skripte (`npm run tauri:dev`, `npm run tauri:build`)
  - Window-State: Fenstergröße/Position werden gemerkt
  - Standardfenster 1366×720; Icon-Verwendung aus `build/icon.png`
- Dashboard: EmojiPicker überarbeitet
  - Popover mit emoji-mart (lazy import) und Fallback-Grid
  - Position: Oberkante mittig über Textarea, Clamping an Viewport
  - Tastenkürzel: Ctrl+. / Cmd+. öffnet den Picker
  - Buttons: Tooltip + aria-keyshortcuts, nur Icon
- Threads/Skeets: Direkt‑Veröffentlichen (ohne Scheduler)
  - Backend: POST `/api/threads/:id/publish-now`, POST `/api/skeets/:id/publish-now`
  - Dashboard: "Sofort senden" in Thread‑ und Skeet‑Form
- bsky-client: Antworten-Flow
  - Antworten‑Button öffnet Composer als Reply (root/parent gesetzt)
  - Composer sendet Replies direkt via `/api/bsky/reply`
- bsky-client: Composer‑Aktionen konsistent zu Skeet/Thread
  - Buttons: Bild, GIF, Emoji
  - Bild/GIF‑Upload mit Vorschau direkt unter dem Text (links bündig)
- bsky-client: Reaktionen sofort aktualisieren
  - GET `/api/bsky/reactions?uri=…` + Button "Aktualisieren" pro Karte
- Build/Infra
  - Frontend‑Dockerfile robuster (COPY . . + .dockerignore)
  - docker-compose: `FRONTEND_BUILD_CONTEXT` konfigurierbar
  - Bundle: `bsky-client/` wird mitgepackt; `.dockerignore` im Bundle
- Docs: README mit Sicherheitshinweis (nicht für öffentlichen Betrieb geeignet)
- bsky-client: Vite App scaffold (index.html, main.jsx, vite config), Workspaces & Dev-Skripte
- bsky-client: Timeline-Karten mit Bild-Embeds (bis 4 Bilder, object-contain, lazy-load)
- bsky-client: Externe Linkvorschau in Timeline (OG/Twitter Meta) und im Composer (erste URL)
- bsky-client: CardConfig-Context (Vorbereitung für feste/flexible Kartenhöhen)
- Backend: GET /api/preview – lädt OG/Twitter-Metatags für Link-Vorschau (mit SSRF-Schutz und Timeout)
- Backend: POST/DELETE /api/bsky/like, /api/bsky/repost – Like/Reskeet Aktionen
- bsky-client: Like/Reskeet Buttons inkl. Viewer-Status, Zähler-Update und Inline-Fehlerhinweis
- Build: Windows NSIS-Target + Script; Icon-Handling über build/icon.png

### Changed
- ThreadWriter: Editorhöhe responsiv (halbiert bei niedriger Fensterhöhe); Startbreite Editor bei ≤1366 px reduziert
- ThreadWriter: Layout/Offset für kleine Höhen kompakter (kein Anschlagen unten)
- Electron/Linux: AppImage Build stabilisiert; Version auf 1.1.1 angehoben
- VS Code Workspace: Ordner (Backend, Dashboard, BSkyClient, etc.) aktiviert
- UI Texte: "Entfernen" → "Zurückziehen" (veröffentlichte Threads/Skeets)
- bsky-client Composer: Vorschau direkt unter Textfeld; Textarea mit Scroll ab Maxhöhe
- Dashboard Thread-Übersicht: Plattform‑Totals werden nur für tatsächlich gepostete Plattformen angezeigt

### Fixed
- Dashboard: Picker-Flackern durch StrictMode-Race verhindert (sichtbar nach erster Positionsberechnung)
- bsky-client: Robustere Embed-Erkennung (ohne optional chaining auf Methoden)
- Preview-Controller Pfadbereinigung, korrekter Import in backend/server.js
- UI: Farbwechsel der Icons nur nach erfolgreicher Aktion; harte Farben für zuverlässiges currentColor
- Engagement: Mastodon‑Abrufe nur bei gültigen Mastodon‑IDs; keine Phantom‑Metriken mehr
- Engagement: Plattformstatus korrekt (nur 'sent' wenn Segmente wirklich gesendet)
- bsky-client: Scroll‑Position der Timeline bleibt beim Öffnen/Schließen des Compose‑Dialogs erhalten

#
# (automatisch geleert nach Release)

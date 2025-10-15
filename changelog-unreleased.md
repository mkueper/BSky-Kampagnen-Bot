# Unreleased Notes

## Added
- bsky-client: Vite App scaffold (index.html, main.jsx, vite config), Workspaces & Dev-Skripte
- bsky-client: Timeline-Karten mit Bild-Embeds (bis 4 Bilder, object-contain, lazy-load)
- bsky-client: Externe Linkvorschau in Timeline (OG/Twitter Meta) und im Composer (erste URL)
- bsky-client: CardConfig-Context (Vorbereitung für feste/flexible Kartenhöhen)
- Backend: GET /api/preview – lädt OG/Twitter-Metatags für Link-Vorschau (mit SSRF-Schutz und Timeout)
- Backend: POST/DELETE /api/bsky/like, /api/bsky/repost – Like/Reskeet Aktionen
- bsky-client: Like/Reskeet Buttons inkl. Viewer-Status, Zähler-Update und Inline-Fehlerhinweis
- Build: Windows NSIS-Target + Script; Icon-Handling über build/icon.png

## Changed
- Electron/Linux: AppImage Build stabilisiert; Version auf 1.1.1 angehoben
- VS Code Workspace: Ordner (Backend, Dashboard, BSkyClient, etc.) aktiviert

## Fixed
- bsky-client: Robustere Embed-Erkennung (ohne optional chaining auf Methoden)
- Preview-Controller Pfadbereinigung, korrekter Import in backend/server.js
- UI: Farbwechsel der Icons nur nach erfolgreicher Aktion; harte Farben für zuverlässiges currentColor

#
# (automatisch geleert nach Release)

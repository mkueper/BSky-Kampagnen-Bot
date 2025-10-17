# ThreadWriter (MVP)

Ein kleines, eigenständiges Tool zum direkten Veröffentlichen von Bluesky‑Threads. Fokus: „Posten“ statt „Planen“. Läuft lokal, ohne Backend.

Dieser Ordner enthält einen Vite+React‑Renderer. Optional kann später Electron für ein Desktop‑Bundle ergänzt werden.

Stand: Text + Bilder. Pro Segment bis zu 4 Bilder mit Alt‑Text (JPEG/PNG/WebP/GIF). Upload erfolgt direkt über die Bluesky API.

## Features (MVP)
- Editor mit Trenner `---` → Segmente (Skeets) + Vorschau
- Zeichenlimit Bluesky 300, Nummerierung `1/x` optional
- Bilder je Segment (max. 4), Alt‑Text, Vorschau + Entfernen
- Direkter Versand zu Bluesky (Replies mit korrekt gesetztem `root`/`parent`)

## Setup
1) In diesen Ordner wechseln und Abhängigkeiten installieren:
   - `cd threadwriter`
   - `npm install`
2) Dev‑Start (lokal im Browser):
   - `npm run dev`
3) Produktionsbuild:
   - `npm run build` und `npm run preview`

## Konfiguration
- Bluesky Zugangsdaten werden im UI eingegeben: `Identifier` (Handle oder DID) und `App Password`.
- Optional: Tenor GIF Suche konfigurieren über `.env` / Vite‑Env:
  - `VITE_TENOR_API_KEY=dein_tenor_api_key`
- Optional: Zielgröße für Bildupload (für automatische Komprimierung/Skalierung):
  - `VITE_TW_UPLOAD_TARGET_BYTES=950000` (Standard: ~900 KB)
  - `VITE_TW_UPLOAD_HEADROOM=0.97` (3% Sicherheits‑Puffer; Standard 0.97)
- Keine Persistenz im MVP (nur RAM bzw. optional localStorage für Zugangsdaten). Keychain‑Integration (z. B. `keytar`) ist geplant.

## Hinweise
- Rate‑Limit: Bei Fehlern (429/5xx) wird eine einfache Retry‑Logik (Backoff) genutzt.
- Medien‑Upload: Implementiert via `agent.uploadBlob`.
 - GIF‑Suche: Nutzt die Tenor API (v2). Ohne API‑Key ist die Suche deaktiviert.
 - Eigene Bilder: Nicht‑GIFs werden vor dem Upload client‑seitig skaliert/komprimiert, damit Bluesky sie akzeptiert (ähnlich wie offizielle App).

## Nächste Schritte
- Keychain‑Speicherung der Credentials
- Electron‑Hülle + packaging
2) Mastodon (optional): Medien‑Upload + Status‑Kette
3) Multi‑Platform Posting (Reihenfolge/Abhängigkeiten pro Plattform)
4) Optionale Entwurfs‑Persistenz (lokal, verschlüsselt) – nur wenn nötig

## Setup (Skizze – wird umgesetzt, wenn wir loslegen)
- Projektstruktur (Monorepo‑Workspace):
  - `threadwriter/` (dieses Projekt; Electron + React)
  - Shared‑Utilities mit dem Dashboard teilen, falls sinnvoll (Limits/Segmente)
- Builds:
  - Windows: NSIS/portable
  - macOS: DMG (notarisiert später)
  - Linux: AppImage + DEB (später Flatpak)

## Montag – Startliste
- Skeleton (Electron+Vite) anlegen
- `@atproto/api` integrieren (Login flow, Agent‑Handling)
- Editor Grundlayout (+ Trenner `---`, Vorschau, Limits)
- Medien‑Picker (max 4, Alt‑Text, Vorschau)
- Versandworkflow (root/parent Kette) mit Mock‑Mode (kein Netz)
- Retry‑Utility (Backoff)

> Hinweis: Wir halten den MVP strikt ohne Speichern. Alles flüchtig, Fokus auf zuverlässiges, direktes Posten.

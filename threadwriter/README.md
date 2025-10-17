# ThreadWriter (MVP Plan)

Ziel: Ein eigenständiges, plattformübergreifendes Tool zum direkten Veröffentlichen von Bluesky‑Threads (ohne Backend, ohne Speichern/Export). Fokus: „Posten“ statt „Planen“.

## Leitplanken
- Send‑only: Keine lokale Persistenz (Entwürfe existieren nur im RAM).
- Ohne Backend: Direkte API‑Nutzung (Bluesky via `@atproto/api`).
- Sicherheit: Zugangsdaten im OS‑Keychain (Electron: `keytar`).
- Rate‑Limit freundlich: Exponentielles Backoff + Jitter, klare Statusmeldungen.

## MVP Funktionsumfang
- Editor
  - Ein großes Texteingabefeld. Trenner `---` → Segmente (Skeets) mit Vorschau.
  - Zeichenlimits je Plattform (zunächst Bluesky 300, limitierendster Wert aktiv).
  - Medien je Segment (max. 4), Alt‑Text, Vorschau.
  - Aktionen: „Posten“ (direkt), „Abbrechen“ (Entwurf verwerfen, ohne Spuren).
- Versand
  - Bluesky Direktversand: Erstes Segment posten, Folge‑Segmente als Replies (korrektes `root`/`parent`).
  - Medien‑Upload via `agent.uploadBlob` (bis 4 Bilder pro Skeet; `object-contain` in der Vorschau).
  - Fortschritt je Segment (wartet → sendet → ok/Fehler), Retry pro Segment.
- Einstellungen
  - Login/Logout (Identifier + App‑Password), gesichert via Keychain.
  - Optionale Plattformschalter (Mastodon später).

## Architektur (Vorschlag)
- Electron + Vite (React) für schnellen MVP‑Start.
- Module
  - `auth`: Login/Logout, Credentials in Keychain, Session halten.
  - `editor`: Segmentierung, Limits, Medienverwaltung (in‑memory), Alt‑Text.
  - `posting`: Bluesky‑Client (wrappper um `@atproto/api`), Reply‑Kette, Medien‑Upload.
  - `retry`: Backoff + Jitter (429/5xx, Netzfehler), abortierbar.
  - `ui`: Komponenten (Editor, Segment‑Cards, Medien‑Picker, Status‑Liste, Dialoge).

## Nicht‑Ziele (MVP)
- Kein Speichern/Export/Import.
- Kein Planen/Timers.
- Keine DB.

## Roadmap (kurz)
1) MVP (Bluesky) – send‑only
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

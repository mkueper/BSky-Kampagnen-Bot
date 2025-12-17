# Codex Plan – BSky Client / Trennung vom Kampagnen‑Tool

---

## 1. Datum (TT.MM.JJJJ)

17.12.2025

## 2. Status (aktueller Stand, keine ToDos)

- `bsky-client` läuft losgelöst vom Kampagnen-Backend: Auth, Timelines, Notifications und Suche sprechen direkt mit `@atproto/api`, Multi-Account-Switch bleibt stabil.
- Timeline-/Mitteilungs-Tabs merken sich Scroll-Positionen, springen nur bei echten Refreshes nach oben und zeigen neue Inhalte per Badge/ScrollTop-Button an, ohne die Liste zweimal zu rendern.
- Composer, Medien-Rendering und Profile-Pane unterstützen jetzt reservierte Layouts (keine Sprünge beim Bild-Laden) sowie kontextsensitive Hover/Badges in Sidebar/Nav-Bar.

## 3. Startpunkt (kurze Einleitung für die nächste Session)

Bluesky-Client verhält sich UI/UX-seitig wie das Original (Scroll-Verhalten, Badges, Mitteilungen). Als nächstes konzentrieren wir uns auf Konfigurierbarkeit (Standalone-Flag, `.env`), gemeinsame Utils (ThreadComposer) und die Beta-Builds/Dokumentation.

## 4. Nächste Schritte (konkrete, umsetzbare ToDos)

1. Standalone-Modus-Flag und Client-Konfiguration:
   - Konfigurationsoption `VITE_CLIENT_MODE=backend|standalone` einführen, Default „standalone“. Backend-Proxy bleibt optional (Legacy), README/`.env.sample` beschreiben beide Pfade.
2. `.env.sample`/Client-Config bereinigen:
   - Blöcke für Dashboard vs. `bsky-client` klar trennen (Ports, API-URLs, Tenor-Keys) und kurz dokumentieren, wie lokale Profile/Polling-Intervalle gesetzt werden.
3. ThreadComposer & Utilities vereinheitlichen:
   - ThreadComposer-Komponente modularisieren und Bild/GIF-Helfer (`compressImage`, Segmentierung) nach `packages/shared-logic` verschieben, damit Dashboard & Client dieselbe Grundlage nutzen.
4. Developer-Doku anpassen:
   - README + `docs/development/*` um Abschnitt „Getrennte Frontends starten“ erweitern (`npm run dev`, `npm run dev:bsky-client`, Ports, Login-Hinweise).
5. Beta-Builds vorbereiten:
   - Electron-Builds für Windows/Linux paketieren (Test-Signaturen reichen aus), Smoke-Test-Skript ergänzen und Download/Changelog im Repo dokumentieren.

## 5. Abschluss-Check (prüfbare Kriterien, optional)

- Im `bsky-client` existieren keine direkten Imports aus `backend/**` oder `dashboard/**`; alle geteilten Bausteine kommen aus `packages/*`.
- Jede Stelle, die `/api/...` nutzt, ist eindeutig einem der bekannten Backend‑Endpunkte zugeordnet und als solche erkennbar dokumentiert.
- Ein (noch einfacher) Schalter für einen zukünftigen „Standalone‑Modus“ ist vorbereitet, ohne aktuelles Verhalten zu verändern.
- `.env.sample` und ggf. README erläutern klar, welche Ports und Variablen für Backend/Kampagnen‑Tool vs. `bsky-client` relevant sind.

## 6. Offene Fragen (keine Tasks)

- Der Client bleibt dauerhaft standalone-first (direkt `@atproto/api`), kann aber optional wieder in das Dashboard eingebettet werden (z. B. via WebView). Shared-Komponenten/Utilities müssen bewusst paketneutral bleiben, um spätere Consumers (Mastodon-Client etc.) zu ermöglichen.

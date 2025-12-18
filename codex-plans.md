# Codex Plan – Kampagnen‑Tool & Bluesky-Client

---

## 1. Datum (TT.MM.JJJJ)

17.12.2025

## 2. Status (aktueller Stand, keine ToDos)

- Scheduler & Backend laufen nach den jüngsten Parallelitäts-/Logging-Updates stabil; alle Tests sind grün und Deployment-Skripte unverändert nutzbar.
- `bsky-client` deckt Auth, Timelines/Notifications, Composer und Scroll-UX weiterhin vollständig ohne Backend-Fallbacks ab; Multi-Account, Badges und Mitteilungen bleiben auf Bluesky-Parität.
- Client-Einstellungen schließen nicht mehr durch Overlay-Klicks, Lokalisierungen/Lizenztexte wurden korrigiert und die Repo-Version ist nach Release auf `1.1.3-dev` hochgezogen; Docker-Bundle, Demo-Skripte sowie Dokumentation entsprechen weiterhin dem Stand nach den letzten Scheduler-/Auth-Anpassungen.
- Suche im Client bietet jetzt Keyboard-freundliche Präfix-Hints mit eigenem Clear-Button; Hover-only-Interaktionen wurden entfernt, damit Prefixe konsistent eingefügt werden.

## 3. Startpunkt (kurze Einleitung für die nächste Session)

Backend ist „feature complete“ für Kampagnen-Tool + Client-Anbindung; als nächstes kümmern wir uns um Standalone-Flag/Config-Split, Portal-/Modal-Aufräumarbeiten (gemeinsamer Container, `portalled`-Strategie), ThreadComposer-Refactor und anschließend Beta-Builds/Dokumentation.

## 4. Nächste Schritte (konkrete, umsetzbare ToDos)

1. Beta-Builds vorbereiten:
   - Windows-/Linux-Electron-Builds paketieren, Smoke-Tests dokumentieren und Download/Release-Notizen (inkl. bekannter Limitierungen) aufsetzen.
2. Standalone-Flag + Konfiguration:
   - `VITE_CLIENT_MODE` + `.env.sample` aufsplitten, damit Backend-Proxy vs. Standalone-Betrieb klar konfigurierbar bleibt (inkl. README-Abschnitt „Frontends starten“).
3. Link-Vorschau & Profil-Links im Client-Composer:
   - Preview-Service (Fetcher + optionaler Proxy) anbinden, Previews direkt im Thread-Composer anzeigen und Handles zu klickbaren Profil-Triggern machen.
4. ThreadComposer/Shared Utils:
   - Bild/GIF-Handling und ThreadComposer so aufteilen, dass Dashboard & Client dieselben Helpers aus `shared-logic` nutzen (kein doppelter Code mehr im Client).
5. Dashboard UX/Doku:
   - Thread-Planer Doku (Scroll/Power-Navigation), History-Screenshots und Seed-Skript (`npm run seed:demo`) nachziehen; Cron-UI-Text + README ergänzen.
6. Terminologie angleichen:
   - „Skeet“ → „Post“ in Dashboard, Client, shared-ui inkl. lokalisierter Strings; Checkliste in `docs/terminology` notieren.

## 5. Abschluss-Check (prüfbare Kriterien, optional)

- Docker‑Bundle und Setup‑Skript liefern ein lauffähiges Kampagnen‑Tool ohne Bluesky‑Client; nach dem Entpacken und `setup-kampagnen-tool.sh` sind Backend und Dashboard erreichbar, Migrationen ausgeführt und `/data/medien` als Upload‑Pfad aktiv.
- Doku‑Einstiege (`README.md`, `docs/README.md`, `docs/installation/*`, `docs/ui.md`, `docs/frontend-user-guide.md`) beschreiben den aktuellen Stand des Kampagnen‑Tools, insbesondere About‑Seite, Freizugebende Posts, Medienpfad und Setup‑Variante.
- Im Bluesky‑Client funktioniert der neue Auth‑Flow end‑to‑end: Login mit App‑Passwort, optionales „Angemeldet bleiben“ und Wiederherstellen der Session beim Start; alle bestehenden Funktionen (Timeline, Notifications, Profile, Composer) laufen weiterhin gegen eine gültige Bluesky‑Session.
- Tests (`npm test`) laufen nach den Anpassungen weiterhin grün; neue Tests im Client orientieren sich an den dokumentierten Anforderungen in `docs/development/test/tests-bsky-client.md`.

## 6. Offene Fragen (keine Tasks)

- Soll das Kampagnen‑Tool mittelfristig zusätzlich als klassischer Systemdienst (systemd/Windows‑Dienst) dokumentiert werden, oder bleibt Docker das primäre Deployment‑Ziel?
- Welche Runtime eignet sich langfristig am besten für den Bluesky‑Desktop‑Client (Electron vs. Sciter vs. andere), insbesondere mit Blick auf Sandbox‑Verhalten unter Linux, Paketgrößen und Update‑Strategien?
- Soll der Bluesky‑Client neben App‑Passwort und Session‑Tokens auch einen optionalen verschlüsselten Speicher für mehrere Accounts (inkl. Labels, UI‑Settings) anbieten, und wie tief sollen OS‑Keychains integriert werden?
- Welche weiteren Bluesky‑Features (z. B. Listen, erweiterte Suche, zusätzliche Feeds) sollen in den Client aufgenommen werden, bevor eine erste Stand‑alone‑Version veröffentlicht wird?
- Wie stellen wir sicher, dass Hover-Kontrast und Badge-Farben auch in allen dunklen Themes gut erkennbar bleiben, ohne von der Dashboard-Optik abzuweichen?

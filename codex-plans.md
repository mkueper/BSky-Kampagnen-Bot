# Codex Plan – Kampagnen‑Tool & Bluesky-Client

---

## 1. Datum (TT.MM.JJJJ)

20.12.2025

## 2. Status (aktueller Stand, keine ToDos)

- Scheduler & Backend laufen nach den jüngsten Parallelitäts-/Logging-Updates stabil; alle Tests sind grün und Deployment-Skripte unverändert nutzbar.
- `bsky-client` deckt Auth, Timelines/Notifications, Composer und Scroll-UX weiterhin vollständig ohne Backend-Fallbacks ab; Multi-Account, Badges und Mitteilungen bleiben auf Bluesky-Parität.
- Client-Einstellungen: Video-Tab mit Allowlist, Aktivierungs-Schalter und fixierter Modal-Höhe; Medien-Hinweise sitzen jetzt direkt in den Options-Karten.
- Video-Vorschauen wurden generalisiert (YouTube → Video-Hosts inkl. TikTok-Default); Zeitstempel können zwischen relativ/absolut umgeschaltet werden (Default: relativ).
- Client-Einstellungen schließen nicht mehr durch Overlay-Klicks, Lokalisierungen/Lizenztexte wurden korrigiert und die Repo-Version ist nach Release auf `1.1.3-dev` hochgezogen; Docker-Bundle, Demo-Skripte sowie Dokumentation entsprechen weiterhin dem Stand nach den letzten Scheduler-/Auth-Anpassungen.
- Suche im Client bietet jetzt Keyboard-freundliche Präfix-Hints mit eigenem Clear-Button; Hover-only-Interaktionen wurden entfernt, damit Prefixe konsistent eingefügt werden.
- Link-Vorschauen sind sowohl im Einzel-Composer als auch im Thread-Composer angebunden; ein lokaler Proxy (`npm run dev:preview-proxy`) inklusive Dockerfile deckt den Standalone-Fall ab, und die i18n-Labels sind vereinheitlicht.

## 3. Startpunkt (kurze Einleitung für die nächste Session)

Backend ist „feature complete“ für Kampagnen-Tool + Client-Anbindung. Der Client verfügt jetzt über einen getesteten Link-Preview-Flow (inkl. dev-Proxy) sowie erweiterte Video-Einstellungen. Als nächstes prüfen wir das Bluesky-Verhalten bei deaktivierter Video-Allowlist, justieren die Modal-Höhe nach, und klären Terminologie/Tab-Zuordnung (Layout vs. Darstellung, Sprache/Composer).

## 4. Nächste Schritte (konkrete, umsetzbare ToDos)

1. Video-Allowlist Verhalten abgleichen:
   - In bsky.app prüfen, was bei deaktivierten Video-Hosts angezeigt wird, und das Verhalten im Client angleichen.
2. Client-Einstellungen feinjustieren:
   - Modal-Höhe optisch feinabstimmen; prüfen, ob „Layout“ künftig „Darstellung“ heißt und ob Sprache/Composer dort hingehören.
3. Beta-Builds vorbereiten:
   - Windows-/Linux-Electron-Builds paketieren, Smoke-Tests dokumentieren und Download/Release-Notizen (inkl. bekannter Limitierungen) aufsetzen.
4. Standalone-Flag + Konfiguration:
   - `VITE_CLIENT_MODE` + `.env.sample` aufsplitten, damit Backend-Proxy vs. Standalone-Betrieb klar konfigurierbar bleibt (inkl. README-Abschnitt „Frontends starten“).
5. Link-Vorschau & Profil-Links im Client-Composer:
   - Electron-Preload und Docker-Variante des Dev-Proxys anbinden, damit Standalone-/Desktop-Builds ohne Extra-Konfiguration funktionieren; Handles zu klickbaren Profil-Triggern machen.
6. ThreadComposer/Shared Utils:
   - Bild/GIF-Handling und ThreadComposer so aufteilen, dass Dashboard & Client dieselben Helpers aus `shared-logic` nutzen (kein doppelter Code mehr im Client).
7. Dashboard UX/Doku:
   - Thread-Planer Doku (Scroll/Power-Navigation), History-Screenshots und Seed-Skript (`npm run seed:demo`) nachziehen; Cron-UI-Text + README ergänzen.
8. Terminologie angleichen:
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

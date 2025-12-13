# Codex Plan – Kampagnen‑Tool & Bluesky-Client

---

## 1. Datum (TT.MM.JJJJ)

13.12.2025

## 2. Status (aktueller Stand, keine ToDos)

- Doku, Terminologie und Upload-Pfade des Kampagnen‑Tools sind konsolidiert; About‑Seite, UI-Guides und Test-Doku spiegeln Freizugebende Posts, Fehlercodes und `data/medien` wider.
- Docker-Bundle + Setup-Skript liefern nur noch Backend + Dashboard, inklusive `.env`-Generator, Auth-Hash und automatischer Migration.
- Testkonventionen schreiben fachlich motivierte Fälle vor; Dashboard/Backend-Dokumente sind entsprechend angepasst und werden aktiv gepflegt.
- Bluesky-Client: Zielarchitektur (eigenständige Desktop-App mit direktem `BskyAgent`) und Login-Konzept (Service-URL, Identifier, App-Passwort, zwei Persistenz-Checkboxen) stehen, Multi-Account bleibt nachgelagert.
- `bskyAgentClient` bildet Login/Resume/Logout bereits ab; UI und Stores nutzen ihn noch nicht.
- Aktueller Fokus: Wir arbeiten derzeit ausschließlich am Bluesky‑Client (`bsky-client`). Backend und Dashboard bleiben unangetastet; Änderungen in `packages/shared-*` erfolgen nur vorsichtig und kompatibel, weil sie beide Frontends betreffen können.
- Dashboard: Zeitpicker verhindern rückwirkende Zeitpunkte am selben Tag, Thread-Editor besitzt Scroll/Klick-Sync.
- `skeet-history`-Listen besitzen eine Scroll-Begrenzung (≈4 Karten); ein Seed-Skript `scripts/seedDemoDatabase.ts` erstellt Demo-Skeets + Sendelogs (`data/demo-dashboard.sqlite`) zum Testen langer Historien.
- VS-Code-Launch „Dev: App (Backend + Bsky-Client)“ funktioniert nach Fix des Backend-Wait-Skripts wieder out of the box.
- Zufallsversatz für den Scheduler ist implementiert (Backend + Dashboard UI + Doku), inklusive `repeatAnchorAt`, Migration und Cron-Info-Dialog – das Input-Feld liegt momentan im Cron-Block; Layout wirkt etwas asymmetrisch, daher als künftiger Feinschliff vermerkt.

## 3. Startpunkt (kurze Einleitung für die nächste Session)

Kampagnen-Tool läuft als eigenständiger Serverdienst mit dokumentiertem Docker-Bundle, aufgeräumten Upload-Pfaden und konsistenter Doku/Test-Guidance. Für den Bluesky-Client existiert die Zielarchitektur (Desktop-App + direkter `BskyAgent`), aber UI/Auth-Layer müssen noch umgestellt werden. Dashboard & Backend lassen sich mit Demo-Daten (`scripts/seedDemoDatabase.ts`) und funktionierendem VS-Code-Launcher schnell starten.

## 4. Nächste Schritte (konkrete, umsetzbare ToDos)
[text](<../../Downloads/5D1CF368B8361FD0AABF71486C6920B9 (1).pdf>)
### 4.1 Client (Bluesky‑Desktop‑App)

1. Bluesky‑Client: Auth‑Store/Hook (`useBskyAuth`) entwerfen und implementieren, der einen zentralen `BskyAgentClient` kapselt, Session/Settings laden/speichern kann (zunächst für einen Account) und den Auth‑Status (`unauthenticated/authenticated/loading`) an die UI liefert.
2. Bluesky‑Client: Login‑Modal als Popup integrieren (Service‑URL, Identifier, App‑Passwort, zwei Checkboxen, Link „App‑Passwort erstellen“), bei Erststart zwingend anzeigen (Abbrechen deaktiviert), später über ein Einstellungs‑/Avatar‑Menü erneut aufrufbar machen.
3. Bluesky‑Client: Bestehende Login- und Session‑Hooks (`useSession`, `LoginView` mit `/api/auth/*`) schrittweise auf den neuen Auth‑Store umstellen, ohne andere Bereiche des Clients (Timeline, Composer) zu verändern.

### 4.2 Dashboard (Kampagnen‑Oberfläche)

4. Thread-Planer: Scroll-/Klick-Sync auf Mehrfach-Vorkommen und Fokuswechsel trimmen; Sonderfälle (ohne Trenner, Power-Navigation) dokumentieren und absichern.
5. Vorschau-Fallback evaluieren, der fehlende Trenner über Textsuche kompensiert (optional aktivierbar, da heuristisch).
6. History-Usability: Demo-Skeet-Historien in Doku aufnehmen (Screenshots, Hinweise zum Scroll-Limit) und `scripts/seedDemoDatabase.ts` kurz im README verlinken.

### 4.3 Backend & Tooling

7. Seed-Skript automatisiert in `package.json` (z. B. `npm run seed:demo`) verfügbar machen und mit kurzen CLI-Hinweisen testen.
8. Docker-Bundle/Setup-Skript um Option erweitern, beim Packen eine Demo-Datenbank zu erzeugen oder bestehende DB zu bereinigen.
9. Cron-Formular visual harmonisieren (Zufallsversatz-Feld + Erläuterung deutlicher konsolidieren), sobald restliche Scheduler-Aufgaben erledigt sind.

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

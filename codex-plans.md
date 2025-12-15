# Codex Plan – Kampagnen‑Tool & Bluesky-Client

---

## 1. Datum (TT.MM.JJJJ)

15.12.2025

## 2. Status (aktueller Stand, keine ToDos)

- Chat-Funktionen des Clients nutzen nun einen robusten Fallback auf `api.bsky.chat`, wenn der klassische Proxy 404/XRPCNotSupported liefert; Konversationsliste, Detailansicht, Read-State und Polling laufen wieder ohne Fehler.
- Share- und Repost-Menüs klappen in die gewünschten Richtungen, die Discover-Badges im Timeline-Header haben den gleichen Kontrast wie alle anderen Tabs.
- `codex-plans-client.md` enthält jetzt den Beta-Hinweis (Windows & Linux App in Arbeit); Fokus bleibt auf dem Client, Backend/Dashboard unverändert stabil.
- Docker-Bundle, Scheduler-Zufallsversatz, Demo-Daten-Skript und Dokumentation des Kampagnen-Tools sind weiterhin gültig, Tests laufen grün.

## 3. Startpunkt (kurze Einleitung für die nächste Session)

Nächste Session beginnt mit funktionsfähigem Chat-Fallback und stabilen Share-/Badge-Anpassungen. Priorität: Beta-Builds (Windows & Linux) erstellen, Installationswege testen und anschließend weitere Client-Baustellen (Timeline-Umschalter, Suche, Chats) angehen. Kampagnen-Tool/Dashboard werden nur bei Bedarf angerührt.

## 4. Nächste Schritte (konkrete, umsetzbare ToDos)

- Beta-Vorbereitung: Windows- und Linux-App paketieren, Smoke-Tests durchführen und Download-/Kommunikationsplan für den Betatest aufsetzen.

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

### 4.4 Terminologie & Konsistenz

10. UI-Terminologie angleichen: In allen Frontends (Dashboard, bsky-client, shared-ui) „Skeet“ durch „Post“ ersetzen, inkl. Tooltips, Buttons, Texte und Übersetzungen, damit Nutzer konsistente Begriffe sehen.

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

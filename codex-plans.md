# Codex Plan – Kampagnen‑Tool & Bluesky-Client

---

## 1. Datum (TT.MM.JJJJ)

11.12.2025

## 2. Status (aktueller Stand, keine ToDos)

- Doku und Terminologie des Kampagnen‑Tools wurden bereinigt; About‑Seite, UI‑Guides und Tests‑Doku spiegeln den aktuellen Stand (Freizugebende Posts, Fehlercodes, Upload‑Pfad `data/medien`) wider.
- Medien‑Uploads des Kampagnen‑Backends landen standardmäßig in `data/medien`; das Docker‑Bundle liefert nur noch Backend + Dashboard (ohne `bsky-client`) und enthält ein Setup-Skript `setup-kampagnen-tool.sh` für `.env`, Auth‑Hash und Start/Migration auf dem Zielserver.
- Test-Konventionen halten fest, dass neue Tests aus fachlichen Anforderungen (Docs) und nicht aus der aktuellen Implementierung abgeleitet werden; Dashboard-/Backend-Testdokumente sind an diesen Ansatz angepasst.
- Für den Bluesky‑Client ist die Zielarchitektur geklärt: eigenständige Desktop‑App ohne Kampagnen‑Backend, mit direktem `BskyAgent`‑Zugriff, internem Routing für Bluesky‑Links und Öffnen externer Links im Standardbrowser.
- Die Login‑Konzeption für den Desktop‑Client steht: Service‑URL, Identifier (Handle/E‑Mail), App‑Passwort, zwei Checkboxen („Angemeldet bleiben“, „App‑Passwort auf diesem Gerät merken“) sowie verschlüsselte Speicherung von Session/Passwort je nach Option.
- Multi‑Account‑Support ist vorgesehen (Account‑Liste mit aktivem Account, späteres Umschalten über ein Avatar-Menü à la Bluesky), wird aber erst nach einem stabilen Single‑Account‑Flow umgesetzt.
- Im `bsky-client` existiert mit `bskyAgentClient` eine erste API‑Schicht für direkten `BskyAgent`‑Zugriff (Login, Session‑Resume, Logout), die noch nicht in das bestehende UI integriert ist; alle Tests laufen weiterhin grün.
- Im Dashboard wurden die Zeitpicker für Threads und Posts so ergänzt, dass bei Planungen am selben Tag keine Uhrzeit vor der aktuellen lokalen Zeit gewählt oder gespeichert werden kann; das Verhalten ist in der Doku erläutert und durch i18n‑Texte abgesichert.
- Im Thread‑Editor ist die Scroll‑Synchronisierung zwischen Textarea und Vorschau verfeinert: Segmentwechsel lösen ein sanftes Nachscrollen aus, und ein Klick auf ein Vorschauelement setzt den Cursor im Quelltext an den Beginn des zugehörigen Posts; Sonderfälle (ohne Trenner, Power‑Navigation) sind als optionale Verbesserungen geplant.

## 3. Startpunkt (kurze Einleitung für die nächste Session)

Das Kampagnen‑Tool ist als eigenständiger Serverdienst (Backend + Dashboard) sauber positioniert: Docker‑Deployment und Bundle‑Setup funktionieren ohne Bluesky‑Client und dokumentieren Upload‑Pfad, Auth‑Setup und Betrieb. Die Dokumentation ist aufgeräumt, Test‑Konventionen sind festgezurrt. Für den Bluesky‑Client ist die Zielrichtung klar: eine reine Desktop‑App, die direkt mit Bluesky spricht, Bluesky‑interne Links intern rendert und externe Links im Browser öffnet. Eine erste BskyAgent‑API‑Schicht existiert; UI, Login‑Modal und Auth‑Store sind noch nicht umgestellt.

## 4. Nächste Schritte (konkrete, umsetzbare ToDos)

### 4.1 Client (Bluesky‑Desktop‑App)

1. Bluesky‑Client: Auth‑Store/Hook (`useBskyAuth`) entwerfen und implementieren, der einen zentralen `BskyAgentClient` kapselt, Session/Settings laden/speichern kann (zunächst für einen Account) und den Auth‑Status (`unauthenticated/authenticated/loading`) an die UI liefert.
2. Bluesky‑Client: Login‑Modal als Popup integrieren (Service‑URL, Identifier, App‑Passwort, zwei Checkboxen, Link „App‑Passwort erstellen“), bei Erststart zwingend anzeigen (Abbrechen deaktiviert), später über ein Einstellungs‑/Avatar‑Menü erneut aufrufbar machen.
3. Bluesky‑Client: Bestehende Login- und Session‑Hooks (`useSession`, `LoginView` mit `/api/auth/*`) schrittweise auf den neuen Auth‑Store umstellen, ohne andere Bereiche des Clients (Timeline, Composer) zu verändern.

### 4.2 Dashboard (Kampagnen‑Oberfläche)

4. Kampagnen‑Tool: Scroll‑Synchronisierung und Klick‑Navigation im Thread‑Planen‑Formular weiter verfeinern (u. a. Verhalten bei mehrfach vorkommenden Textblöcken, Fokus‑Wechsel sowie Dokumentation von Sonderfällen wie Mehrfach‑Klick).
5. Kampagnen‑Tool: Optionalen Fallback für die Vorschau‑Klicknavigation prüfen, bei dem – wenn keine `---`‑Trenner genutzt werden – der Text eines Vorschauelements (ohne Nummerierung) im Quelltext gesucht und der Cursor am Anfang des ersten eindeutigen Treffers positioniert wird (nur nach expliziter Aktivierung, da heuristisch).
6. Kampagnen‑Tool (Power‑Feature): Optionale Tastatur‑Navigation für wiederkehrende Textblöcke im Thread‑Editor evaluieren (z. B. nach Klick auf ein Vorschauelement den zugehörigen Textblock als Suchmuster merken und per Tastenkombination zum nächsten/vorherigen Vorkommen im Quelltext springen), klar hinter einer eigenen Option oder Sektion für „erweiterte Funktionen“ versteckt.

### 4.3 Backend (Kampagnen‑Agent)

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

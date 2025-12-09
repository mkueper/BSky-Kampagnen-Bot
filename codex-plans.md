# Codex Plan – Dashboard / Info-Dialoge

---

## 1. Datum (TT.MM.JJJJ)

09.12.2025

## 2. Status (aktueller Stand, keine ToDos)

- Aktionen in `SkeetForm` und `ThreadForm` halten die neue Reihenfolge (Primär rechts, „Abbrechen“ direkt daneben, Reset hinten, Sofort-Option ganz außen) und riskante Aktionen laufen weiterhin über den ConfirmDialog.
- Beim Wechseln zwischen Ansichten räumt `App.jsx` editierende Zustände konsequent auf, damit keine Bearbeitungen hängen bleiben; Info-Toasts informieren, wenn ein Draft verworfen wurde.
- Thread-Planer und Post-Planer besitzen jetzt die passenden Überschriften („… planen“ vs. „… bearbeiten“), den Hinweis fürs Zeichenlimit sowie die kompakten Datums-/Zeitfelder aus der neuen Shared-UI-Komponente.
- Tabs in „Aktivität“ scrollen horizontal statt Texte abzuschneiden; Übersicht und Planner respektieren die vereinbarte Button-Ausrichtung und Farbverwendung (keine Warnfarbe ohne Bestätigungsdialog).
- Die Karte „Freizugebende Posts“ nutzt neue Texte (Tab: „Freizugeben“) und einen InfoDialog, der erklärt, was unter Freigabe zu verstehen ist; alle Strings liegen im i18n-Bundle.
- In der Main-Übersicht sind Panels, Kennzahlen-Karten („Geplante …“, „Veröffentlichte …“, „Freizugebende …“) sowie „Nächster …“/„Bevorstehende …“-Abschnitte jetzt auf einen einheitlichen Panel-Hintergrund und subtile Kartenflächen abgestimmt.
- Die gemeinsame `NextScheduledCard`-Komponente wird sowohl in der Übersicht als auch in den Tabs „Posts“/„Threads“ genutzt; Datum/Uhrzeit stehen kompakt über dem Inhaltsauszug.
- Im ConfigPanel wurden die Blöcke „Cron“ sowie „Wiederholversuche & Backoff“ so neu arrangiert, dass Hilfstexte in der selben Spalte und im selben Stil wie andere Inline-Hinweise erscheinen.
- Nach jeder JavaScript-Änderung laufen `npm test` und `npm run lint`, weil Linting zusätzliche Fehler früh sichtbar macht.

## 3. Startpunkt (kurze Einleitung für die nächste Session)

Buttons, Edit-Handling und Terminologie sind durchgängig; InfoDialog + neue i18n-Texte erklären den Freigabe-Status, Planner wirken durch die kleineren Felder ruhiger und Tabs lassen sich auf kleinen Displays scrollen. Die Post-/Thread-Übersichten sind in Panels, Kartenrhythmus und „Nächster …“/„Bevorstehende …“-Kacheln harmonisiert; Scheduler-Blöcke im ConfigPanel nutzen konsistente Hilfstextlayouts. Test-/Lint-Routine und ThreadForm-Splitter sind dokumentiert bzw. bereinigt; nächste Sessions können sich bei Bedarf neuen UI-Details oder Features widmen.

## 4. Nächste Schritte (konkrete, umsetzbare ToDos)

1. Backend: Fehler- und Statusmeldungen (insbesondere Login/Auth) perspektivisch auf lokalisierbare Codes oder i18n umstellen; dafür ggf. eine eigene Datei `codex-plans-backend.md` anlegen, sobald wir konkret ins Backend einsteigen.
2. Desktop/Electron: Option für einen externen Bluesky-Client vorbereiten (konfigurierbarer Pfad/Command wie `/usr/local/bin/bsky-client`), Start ausschließlich über den Electron-Main-Prozess ohne Abhängigkeit zum Web-Dashboard; Umsetzung separat planen, sobald die Desktop-Variante wieder im Fokus steht.
3. Dashboard/PWA: Perspektivisch das Dashboard als PWA nutzbar machen (Manifest, Service-Worker, Icons), zunächst mit Fokus auf Installierbarkeit und einfachem Offline-Verhalten ohne komplexes Caching der API-Aufrufe.
4. Deployment: Idee festhalten, Backend und Dashboard zusätzlich als klassische systemd-Services (ohne Docker) betreibbar zu machen (z. B. eigene Unit-Files, Log-Rotation, Restart-Policy); konkrete Ausgestaltung später planen, wenn ein non-Docker-Setup benötigt wird.

## 5. Abschluss-Check (prüfbare Kriterien, optional)

- Alle Info-Dialoge im Dashboard nutzen `InfoDialog` mit konsistenter Typografie und einheitlichem Schließen-Button.
- Inline-Hinweise sind kurz, neutral formuliert und verweisen inhaltlich konsistent auf die detaillierten InfoDialog-Texte.
- Alle Texte sind in `dashboard/src/i18n/messages.js` gepflegt und folgen den in `docs/ui.md` definierten Sprach- und UI-Richtlinien.
- `npm test` und relevante Frontend-Checks (lokaler Build/Dev-Server) laufen ohne Fehler.

## 6. Offene Fragen (keine Tasks)

- Muss die Visualisierung für „Freizugeben“ künftig zusätzliche Zustände (z. B. „Review läuft“, „Zurückgezogen“) anbieten oder reicht die aktuelle Erklärung?
- Wie wollen wir langfristig mit „Formular zurücksetzen“ umgehen (Position, Farbton, ggf. Icon), damit es weder zu präsent noch schwer zu finden ist?
- Soll `InfoDialog` mittelfristig auch außerhalb des Dashboards (z. B. `bsky-client`) verpflichtend werden, oder bleibt er spezifisch für diesen Workspace?
- Soll es im ThreadWriter eine optionale, als experimentell gekennzeichnete Heuristik geben, die Splits in der Nähe von `maxLength - Δ` bevorzugt an Satzzeichen (Punkt, Komma, Ausrufe-/Fragezeichen) vornimmt, auch wenn das in seltenen Fällen nummerierte Aufzählungen trennt?

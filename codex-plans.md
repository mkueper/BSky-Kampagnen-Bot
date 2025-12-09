# Codex Plan – Dashboard / Info-Dialoge

---

## 1. Datum (TT.MM.JJJJ)

08.12.2025

## 2. Status (aktueller Stand, keine ToDos)

- Aktionen in `SkeetForm` und `ThreadForm` halten die neue Reihenfolge (Primär rechts, „Abbrechen“ direkt daneben, Reset hinten, Sofort-Option ganz außen) und riskante Aktionen laufen weiterhin über den ConfirmDialog.
- Beim Wechseln zwischen Ansichten räumt `App.jsx` editierende Zustände konsequent auf, damit keine Bearbeitungen hängen bleiben; Info-Toasts informieren, wenn ein Draft verworfen wurde.
- Thread-Planer und Post-Planer besitzen jetzt die passenden Überschriften („… planen“ vs. „… bearbeiten“), den Hinweis fürs Zeichenlimit sowie die kompakten Datums-/Zeitfelder aus der neuen Shared-UI-Komponente.
- Tabs in „Aktivität“ scrollen horizontal statt Texte abzuschneiden; Übersicht und Planner respektieren die vereinbarte Button-Ausrichtung und Farbverwendung (keine Warnfarbe ohne Bestätigungsdialog).
- Die Karte „Freizugebende Posts“ nutzt neue Texte (Tab: „Freizugeben“) und einen InfoDialog, der erklärt, was unter Freigabe zu verstehen ist; alle Strings liegen im i18n-Bundle.
- Nach jeder JavaScript-Änderung laufen `npm test` und `npm run lint`, weil Linting zusätzliche Fehler früh sichtbar macht.
- Der Stand des Repos wurde heute in `backups/backup-2025-12-08.tar.gz` gesichert.

## 3. Startpunkt (kurze Einleitung für die nächste Session)

Buttons, Edit-Handling und Terminologie sind durchgängig; InfoDialog + neue i18n-Texte erklären den Freigabe-Status, Planner wirken durch die kleineren Felder ruhiger und Tabs lassen sich auf kleinen Displays scrollen. Jetzt geht es darum, die Post-/Thread-Übersichten aufzuräumen (Abstände, Karten, Info-Elemente) und die wiederholten Muster sauber in Komponenten zu überführen, während wir dokumentieren, dass Tests und Lint obligatorisch sind.

## 4. Nächste Schritte (konkrete, umsetzbare ToDos)

1. Post-Übersicht: die Sektion mit `flex flex-col gap-3 p-6` angleichen (z. B. `gap-4`) und sicherstellen, dass Karten wie „Nächster Post“/„Nächster Thread“ denselben vertikalen Rhythmus wie die restlichen Boxen bekommen.
2. „Nächster Post/Thread“-Komponente ableiten: Thread-Karte als Vorlage nehmen, Datum + Uhrzeit kompakt über dem Inhaltsauszug platzieren und i18n-Strings für beide Varianten hinzufügen; anschließend beide Stellen in der Übersicht auf diese Komponente umstellen.
3. Dokumentation ergänzen: in `docs/` (oder bestehendem Entwickler-Dokument) festhalten, dass auf UI-Änderungen standardmäßig `npm test` und direkt danach `npm run lint` ausgeführt werden, damit das Team diese Routine nachvollziehen kann.
4. ThreadForm-Splitter: nachvollziehen, warum Abschnitte wie „! 2.“ weiterhin neue Segmente erzwingen, und ggf. den Marker-Parser so erweitern, dass Emojis/Sätze direkt vor Zahlen nicht mehr automatisch trennen.

## 5. Abschluss-Check (prüfbare Kriterien, optional)

- Alle Info-Dialoge im Dashboard nutzen `InfoDialog` mit konsistenter Typografie und einheitlichem Schließen-Button.
- Inline-Hinweise sind kurz, neutral formuliert und verweisen inhaltlich konsistent auf die detaillierten InfoDialog-Texte.
- Alle Texte sind in `dashboard/src/i18n/messages.js` gepflegt und folgen den in `docs/ui.md` definierten Sprach- und UI-Richtlinien.
- `npm test` und relevante Frontend-Checks (lokaler Build/Dev-Server) laufen ohne Fehler.

## 6. Offene Fragen (keine Tasks)

- Muss die Visualisierung für „Freizugeben“ künftig zusätzliche Zustände (z. B. „Review läuft“, „Zurückgezogen“) anbieten oder reicht die aktuelle Erklärung?
- Wie wollen wir langfristig mit „Formular zurücksetzen“ umgehen (Position, Farbton, ggf. Icon), damit es weder zu präsent noch schwer zu finden ist?
- Soll `InfoDialog` mittelfristig auch außerhalb des Dashboards (z. B. `bsky-client`) verpflichtend werden, oder bleibt er spezifisch für diesen Workspace?

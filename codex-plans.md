# Codex Plan – Dashboard / Info-Dialoge

---

## 1. Datum (TT.MM.JJJJ)

07.12.2025

## 2. Status (aktueller Stand, keine ToDos)

- `InfoDialog` ist als generische Komponente in `@bsky-kampagnen-bot/shared-ui` implementiert (inkl. `closeLabel` für i18n) und in `docs/ui.md` dokumentiert.
- Die Info-Dialoge in `SkeetForm.jsx` („Hinweis: Post-Text“, „Hinweis: Vorschau“) und `ThreadForm.jsx` („Hinweis: Thread-Inhalt“, „Hinweis: Vorschau“) nutzen nun `InfoDialog` mit einheitlichem Layout:
  - schmaler Haupttextblock (`max-w-[52ch]`)
  - abgesetzter Hintergrund (`rounded-2xl bg-background-subtle px-4 py-3`)
  - einheitlicher sekundärer Schließen-Button mit `common.actions.close`.
- Der Cron-Info-Dialog in `ConfigPanel.jsx` wurde auf `InfoDialog` umgestellt und dient als Referenz:
  - Intro-/Erklärungstext im `content`-Block
  - Monospace-Beispiele im `examples`-Slot
  - zusammenfassender Hinweistext.
- Für „Wiederholversuche & Backoff“ existiert jetzt:
  - ein kurzer Inline-Hinweis (`retryInfoInline`) für Normaluser,
  - ein ausführlicher InfoDialog (`retryInfo*`-Texte) für fachlich involvierte Personen.
- Für den Abschnitt „Dashboard-Polling“ im `ConfigPanel` ist ein InfoDialog (`config.polling.info*`) inklusive kurzer Inline-Erklärung umgesetzt.
- Im Tab „Zugangsdaten“ gibt es einen InfoDialog (`config.credentials.info*`) sowie optisch abgesetzte Blöcke für Bluesky, Mastodon und Tenor.
- Die Zeitzonen-Erklärung ist über einen InfoDialog im Tab „Allgemein“ verfügbar; passende Richtlinien sind in `docs/ui.md` und `docs/development/timezone-picker.md` dokumentiert.
- Die Button-Leisten in allen Tabs des `ConfigPanel` sind vereinheitlicht: rechtsbündig, primäre Aktion „Übernehmen“ unten rechts, Buttons nur aktiv bei Änderungen; im Tab „Zugangsdaten“ gibt es zusätzlich einen deaktivierbaren „Abbrechen“-Button zum Verwerfen lokaler Änderungen.
- Für Import/Export in den Übersichten von Posts und Threads gibt es einen eigenen InfoDialog (`importExport.info*`) und einen optisch hervorgehobenen Aktionsblock (Export, Import, Info) gemäß den UI-Richtlinien.
- Die About-Ansicht („Über Kampagnen‑Tool“) verwendet nun denselben Card- und Abschnittsstil wie Einstellungs-Views; Produktnamen („Kampagnen‑Tool“) und Beschreibungstexte sind aktualisiert und konsistent.
- Sprachrichtlinie in `docs/ui.md` ergänzt: UI-Texte werden neutral formuliert, direkte Anrede („du“/„Sie“) wird vermieden.
- Alle Änderungen sind über i18n abgedeckt; `npm test` läuft grün durch.

## 3. Startpunkt (kurze Einleitung für die nächste Session)

Der InfoDialog-Pattern ist im Dashboard etabliert (Posts-Formulare, Scheduler/Cron, Wiederholversuche & Backoff, Dashboard-Polling, Zugangsdaten, Zeitzonen) und im UI-Guide dokumentiert. In der nächsten Session soll der Fokus auf verbleibende Kandidaten im Dashboard liegen (insbesondere Import/Export) sowie auf Layout-Themen bei Einstellungs-Views (einheitliche Abstände, konsistente Cards) und auf einheitliche Button-Gruppen (Breite, Hierarchie von „Planen“ vs. „Sofort senden“) und auf der Frage, ob `InfoDialog` in anderen Frontends (bsky-client, Admin-Views) eingesetzt werden soll.

## 4. Nächste Schritte (konkrete, umsetzbare ToDos)

1. Bereichsabstände:
  - Vertikale Abstände der optischen Bereichstrennungen in Einstellungs-Views vereinheitlichen, sodass alle Einstellungsblöcke dieselbe `space-y`-Logik und dieselbe Box-Optik (`rounded-2xl border border-border-muted bg-background-subtle p-4`) verwenden.

2. Priorisierung:
  - Im Dashboard sind ConfigPanel-Tabs und About-Ansicht bereits auf das einheitliche Abstands- und Box-Pattern umgestellt. Für künftige Einstellungs-Views in anderen Frontends (z. B. `bsky-client`) sollte dieses Pattern übernommen werden; eine erneute Anpassung des Kampagnen-Tools ist dafür nicht notwendig.

3. Button-Gruppen (Planen / Sofort senden):
  - Im Dashboard erfassen, wo relevante Button-Gruppen existieren (z. B. `SkeetForm`, `ThreadForm`, `ConfigPanel`, Header-Aktionsgruppen) und prüfen, ob Höhe/Mindestbreite und die Hierarchie zwischen Standard-Aktion („Planen“/„Übernehmen“) und seltenen Aktionen („Sofort senden“) konsistent sind. Grundlage sind die in `docs/ui.md` ergänzten Richtlinien zu Buttons in Formularen und Einstellungsansichten.
  - Für „Sofort senden“ und andere irreversible/risikoreiche Aktionen den gemeinsamen `ConfirmDialog` aus `@bsky-kampagnen-bot/shared-ui` einsetzen: Titel, Beschreibung, Buttontexte und Button-Variante werden pro Anwendungsfall konfiguriert, sodass der Dialog klar, aber nicht überdramatisiert wirkt und der Fokus weiterhin auf dem Standard-Workflow (Planen/Übernehmen) liegt.

4. Icon-Buttons vereinheitlichen:
   - Die im Planner verwendeten Buttons „Bild hinzufügen“, „GIF hinzufügen“ und „Emoji einfügen“ (in `SkeetForm`/`ThreadForm`) an den gemeinsamen Icon-Button-Stil anpassen (gleicher Icon-Satz, Container, Größen), damit sie optisch zu Info-/Import-/Export-Buttons passen. Grundlage sind die in `docs/ui.md` ergänzten Richtlinien zu Icon-Buttons.

5. Thread-Vorschaukarten im Planner:
   - In `ThreadForm` das Layout der Vorschaukarten überarbeiten: Bereich mit „Post x“, Zeichenzähler und Bild/Media-Buttons optisch zusammenfassen (einheitlicher Abstand, konsistente Icon-Buttons, bessere Trennung zwischen Inhalt und Aktionen), damit die Karten ruhiger und klarer strukturiert wirken.

6. App-Struktur rund um Planer vereinfachen:
   - `App.jsx` schrittweise entlasten, ohne Verhalten zu ändern: zuerst den Import/Export-Headerblock (Buttons + InfoDialog) in eine eigene, klar abgegrenzte Komponente auslagern; nach Abschluss der UI-Feinschliffe optional schlanke Container-Views für „Post planen“ (`SkeetForm`) und „Thread planen` (`ThreadForm`) einführen, die Routing und Daten an die Form-Komponenten weiterreichen.

## 5. Abschluss-Check (prüfbare Kriterien, optional)

- Alle Info-Dialoge im Dashboard nutzen `InfoDialog` mit konsistenter Typografie und einheitlichem Schließen-Button.
- Inline-Hinweise sind kurz, neutral formuliert und verweisen inhaltlich konsistent auf die detaillierten InfoDialog-Texte.
- Alle Texte sind in `dashboard/src/i18n/messages.js` gepflegt und folgen den in `docs/ui.md` definierten Sprach- und UI-Richtlinien.
- `npm test` und relevante Frontend-Checks (lokaler Build/Dev-Server) laufen ohne Fehler.

## 6. Offene Fragen (keine Tasks)

- Soll `InfoDialog` auch in weiteren Workspaces (z. B. `bsky-client`) eingeführt werden, oder bleibt der Einsatz zunächst auf das Dashboard beschränkt?
- Gibt es fachliche Anforderungen für zusätzliche InfoDialog-Themen (z. B. Datenschutz/Hinweise zu Logs, Limits pro Plattform), die bei künftigen UI-Iterationen berücksichtigt werden sollen?
- Wann ist der passende Zeitpunkt, um aus dem Kampagnen‑Tool hervorgegangene Bausteine (z. B. Link‑Preview, Medien-/Composer‑Patterns) tatsächlich in `shared-ui`/`shared-logic` zu verschieben, statt später das Kampagnen‑Tool rückwirkend an neue Clients (Bluesky/Mastodon) anzupassen?

# BSky Kampagnen-Bot – Benutzerhandbuch für das Dashboard

Dieses Handbuch führt dich durch die wichtigsten Funktionen der Weboberfläche.
Es richtet sich an Redakteur:innen oder Campaign-Manager:innen, die Skeets und
Threads planen, veröffentlichen und auswerten möchten.

---

## 1. Anmeldung und Grundaufbau

1. Öffne das Dashboard unter der Adresse, die dir dein Administrator genannt hat
   (z. B. `http://localhost:3000`).
2. Nach dem Laden siehst du links die Navigationsleiste mit den Bereichen
   **Übersicht**, **Skeets**, **Threads** und **Konfiguration**.
3. Rechts oben befinden sich Schnellaktionen (Theme-Wechsel, Export/Import) sowie
   der jeweilige Seiteninhalt.

> Tipp: Nutze den Theme-Schalter rechts oben, um zwischen hellem, dunklem oder
> Mitternachts-Theme zu wechseln.

---

## 2. Hauptnavigation

### Übersicht
- Zeigt Kennzahlen zu geplanten/veröffentlichten Skeets und Threads.
- Listet anstehende Veröffentlichungen inklusive Uhrzeit.

### Skeets
- **Übersicht** listet geplante, veröffentlichte und gelöschte Einzelposts.
- **Skeet planen** öffnet das Formular zum Erstellen oder Bearbeiten.

### Threads
- **Übersicht** zeigt Multi-Post-Threads sortiert nach Status (geplant, veröffentlicht, Papierkorb).
- **Thread planen** öffnet den Editor für mehrteilige Kampagnen.

### Konfiguration
- Enthält Scheduler-Einstellungen (Cron-Zeit, Zeitzone) sowie Retry-Konfiguration.

---

## 3. Skeets verwalten

### Neue Skeets anlegen
1. Navigiere nach **Skeets → Skeet planen**.
2. Wähle Plattformen (Bluesky, Mastodon) über die Buttons aus.
3. Trage den Text ins Feld *Inhalt* ein. Das Zeichenlimit wird automatisch
   geprüft.
4. Lege eine Uhrzeit fest, wenn der Skeet geplant werden soll. Ohne Datum
   bleibt der Status *Entwurf*.
5. Optional: Wiederholung (täglich, wöchentlich, monatlich).
6. Klicke auf **Skeet speichern**.

### Bearbeiten und Löschen
- In der Skeet-Übersicht kannst du jeden Eintrag bearbeiten (Stift-Button) oder
  löschen. Gelöschte Skeets landen im Papierkorb und lassen sich dort
  reaktivieren oder endgültig entfernen.

### Veröffentlichen und Reaktionen beobachten
- Sobald das geplante Zeitfenster erreicht ist, versendet der Scheduler den
  Skeet automatisch.
- Unter **Veröffentlicht** findest du alle live gegangenen Inhalte samt Links
  und Kennzahlen.
- Über den Button **Reaktionen abrufen** werden Likes/Reposts/Replies
  synchronisiert.

---

## 4. Threads verwalten

### Neuer Thread
1. Gehe zu **Threads → Thread planen**.
2. Trage den kompletten Text in das große Feld ein und trenne einzelne Segmente
   mit `---` (oder Strg + Enter).
3. Das Dashboard zerlegt den Inhalt automatisch in Segmente, überprüft die
   Zeichenlimits der ausgewählten Plattformen und zeigt eine Vorschau.
4. Lege den geplanten Versand im Feld *Geplanter Versand* fest.
5. Klicke auf **Thread speichern**.

### Bearbeitung
- Entwürfe und geplante Threads lassen sich bearbeiten oder löschen.
- Bereits veröffentlichte Threads können nicht mehr editiert werden, um
  Inkonsistenzen zu vermeiden (nur Entfernen/Zurückziehen möglich).

### Entfernen und Papierkorb
- **Entfernen** löscht veröffentlichte Threads von den Plattformen, wenn
  entsprechende Schlüssel bekannt sind.
- **Löschen** verschiebt Threads in den Papierkorb; von dort kann entweder
  eine Wiederherstellung oder ein permanentes Entfernen erfolgen.

### Automatische Aktualisierung
- Während ein Thread im Status *publishing* ist, lädt die Übersicht regelmäßig
  neu, damit der finale Status sichtbar wird.
- Ist das Polling deaktiviert, nutze den **Aktualisieren**-Button in der
  Thread-Übersicht.

---

## 5. Import & Export

### Export
1. Wähle in der Navigation den Bereich, dessen Daten du exportieren möchtest
   (Skeets oder Threads).
2. Klicke oben rechts auf **Skeets exportieren** bzw. **Threads exportieren**.
3. Es öffnet sich der Dateidialog deines Browsers (oder es wird direkt eine
   JSON-Datei heruntergeladen).

### Import
1. Klicke oben rechts auf **Skeets importieren** oder **Threads importieren**.
2. Wähle eine JSON-Datei im passenden Format (siehe Beispiel) aus.
3. Nach erfolgreichem Import erscheinen die neuen Einträge als Entwürfe.

> Hinweis: Threads übernehmen zusätzlich eine lokale Zeit (`scheduledAtLocal`)
> zur Orientierung. Für den Scheduler ist weiterhin `scheduledAt` (UTC) maßgeblich.

---

## 6. Scheduler und Konfiguration

- Unter **Konfiguration** lässt sich der Cron-Ausdruck für den Scheduler
  einstellen (Standard: jede Minute prüfen).
- Die Zeitzone wirkt sich auf lokale Datumsanzeigen im Dashboard aus.
- Retry-Parameter (z. B. `POST_RETRIES`) steuern, wie oft bei API-Fehlern erneut
  versucht wird zu posten.

Nach einer Änderung **Speichern** nicht vergessen; der Scheduler lädt sein
Setup danach automatisch neu.

---

## 7. Fehlersuche

| Problem | Empfehlung |
|---------|------------|
| Thread/Skeet wird nicht veröffentlicht | Prüfe, ob Anmeldedaten (Bluesky/Mastodon) korrekt gesetzt und im Backend-Log keine Fehler gemeldet sind. |
| Export liefert Fehlermeldung „Thread nicht gefunden“ | Stelle sicher, dass die Backend-Version aktuell ist; die Route `/api/threads/export` muss vor der dynamischen ID-Route stehen (bereits behoben). |
| Datei landet nicht am gewünschten Ort | Browser möglicherweise ohne `showSaveFilePicker` – schau im Standard-Download-Ordner nach. |
| Ständige Refreshs in der Thread-Übersicht | Polling kann in `useThreads` deaktiviert werden; Standard ist aktuell lediglich während `publishing`. |

Bei hartnäckigen Problemen lohnt sich ein Blick in die Browser-Konsole sowie in
die Backend-Logs (`npm run dev` o. ä.).

---

## 8. Weiterführende Hinweise

- Die JSON-Strukturen für Import/Export findest du in `src/services/importExportService.js`.
- Datenbank-Details sind in `docs/database.md` dokumentiert.
- Für Änderungen an Zeitzonen oder API-Schlüsseln siehe `.env` bzw.
  `src/config.js`.

Viel Erfolg mit deinen Kampagnen!


# BSky Kampagnen-Bot – Benutzerhandbuch für das Dashboard

Dieses Handbuch richtet sich an Redakteur:innen und Kampagnen-Manager:innen. Es erklärt, wie du Skeets und Threads planst, veröffentlichst, Engagement beobachtest und den integrierten Bluesky-Client nutzt.

---

## 1. Anmeldung und Grundaufbau

1. Öffne das Dashboard unter der bereitgestellten Adresse (Standard: `http://localhost:3000`).
2. Beim ersten Start prüft das Backend, ob Bluesky-Zugangsdaten vorhanden sind. Fehlen sie, leitet das Dashboard automatisch zur **Konfiguration → Zugangsdaten** um, bis die Credentials gespeichert wurden.
3. Die Oberfläche besteht aus:
   - einer linken Navigation (Tabs),
   - dem Hauptbereich rechts,
   - einer Kopfzeile mit Schnellaktionen (Theme-Schalter, Export/Import, Kontextaktionen).

> Tipp: Der Theme-Schalter rotiert zwischen *Light*, *Dark* und *Midnight*. Eigene Einstellungen werden im Local Storage gespeichert.

---

## 2. Hauptnavigation im Überblick

- **Übersicht** – Kennzahlen (geplante/veröffentlichte Skeets & Threads, Reaktionssummen) sowie „Nächster Skeet/Thread“ und kommende Veröffentlichungen.
- **Skeets**
  - *Aktivität*: Geplante, veröffentlichte und gelöschte Skeets inkl. Reaktionskarten und Plattform-Badges.
  - *Skeet planen*: Formular zum Erstellen/Bearbeiten einzelner Posts.
- **Threads**
  - *Aktivität*: Mehrteilige Kampagnen nach Status (Entwurf, geplant, Veröffentlichungsfortschritt).
  - *Thread planen*: Editor für mehrsegmentige Kampagnen mit Medienunterstützung.
- **Bluesky Client** – Direktzugriff auf Discover/Following/Mutuals-Feeds inkl. Composer für Sofort-Posts (nutzt dieselben Credentials wie der Scheduler).
- **Konfiguration**
  - Tabs für *Scheduler & Retries*, *Dashboard-Polling* und *Zugangsdaten*.
- **Über Kampagnenbot** – Release-Hinweise, Tastenkürzel, Links zur Dokumentation.

Alle Ansichten reagieren auf Server-Sent Events (SSE). Das Dashboard aktualisiert Listen automatisch, sobald der Agent Ereignisse wie `skeet:updated` oder `thread:updated` auslöst. Fallback-Polling lässt sich unter **Konfiguration → Dashboard-Polling** feinjustieren.

---

## 3. Skeets verwalten

### 3.1 Anlegen
1. Navigation: **Skeets → Skeet planen**.
2. Text eingeben; Zeichenbegrenzung wird live geprüft.
3. Optional: Termin (`scheduledAt`), Wiederholung (`täglich`, `wöchentlich`, `monatlich`), Plattformen (Bluesky/Mastodon).
4. Medien anhängen (bis zu vier Bilder). Dateien lassen sich jederzeit neu ordnen oder mit ALT-Texten versehen.
5. Speichern – der Eintrag erscheint in der geplanten Liste und in der Übersicht.

### 3.2 Bearbeiten, Status & Schnellaktionen
- Über das Stift-Icon lässt sich ein Skeet anpassen. Bereits veröffentlichte Skeets können aus dem Dashboard heraus erneut geplant oder auf Plattformen zurückgezogen werden.
- Der Button **Jetzt veröffentlichen** umgeht den Scheduler und sendet sofort (praktisch für Last-Minute-Posts).
- Plattform-Badges zeigen den jeweiligen Status (`pending`, `sent`, `failed`, `deleted`, `partial`) und liefern Tooltips mit Fehlermeldungen oder URIs.

### 3.3 Engagement & Replies
- In der Registerkarte *Veröffentlicht* lässt sich die Sortierung (neu/alt) umschalten.
- Buttons **Reaktionen aktualisieren** und **Replies anzeigen** triggern On-Demand-Abrufe (`/api/reactions/:id`, `/api/replies/:id`).
- Sichtbare Einträge können gesammelt aktualisiert werden (Floating Toolbar → „Alle sichtbaren aktualisieren“); das Backend führt dann `/api/engagement/refresh-many` aus.

---

## 4. Threads verwalten

### 4.1 Anlegen
1. Navigation: **Threads → Thread planen**.
2. Text eingeben; Segmentierung erfolgt automatisch per `---` (oder `Strg + Enter`). Segmentkarten lassen sich verschieben oder löschen.
3. Optional: Medien pro Segment anhängen (max. vier), Nummerierung ein-/ausschalten, Termin festlegen.
4. Speichern. Der Thread erscheint als Entwurf oder geplante Kampagne.

### 4.2 Statusverlauf
- Statuswerte: `draft`, `scheduled`, `publishing`, `published`, `failed`, `deleted`.
- Während `publishing` aktiviert das Dashboard ein kurzes Polling, um den finalen Zustand zu erkennen. Im Anschluss übernimmt wieder SSE.
- **Thread entfernen** initiiert `POST /api/threads/:id/retract` (Plattform-Delete + Papierkorb). **Wiederherstellen** holt den Eintrag zurück.

### 4.3 Engagement
- `Reaktionen aktualisieren` ruft Likes/Reposts/Replies pro Segment ab (`threadEngagementService`).  
- Die Karten zeigen pro Segment zusammengestellte Reaktionen und bieten Links zu Originalposts, sofern bekannt.

---

## 5. Import & Export

### 5.1 Export
- Kontextmenü (oben rechts) → *Skeets exportieren* oder *Threads exportieren*.
- Exporte enthalten standardmäßig eingebettete Medien (`data:<mime>;base64,…`). Große Kampagnen können dadurch mehrere MB umfassen.
- Über die API lässt sich `?includeMedia=0` setzen, wenn nur Metadaten benötigt werden.

### 5.2 Import
- *Skeets importieren* bzw. *Threads importieren* öffnet den Dateidialog.
- Erwartete Struktur: identisch mit dem Exportformat (`skeets[].media[]`, `threads[].segments[].media[]`).
- Duplikate werden automatisch übersprungen:
  - Skeets: gleicher Inhalt + Termin oder gleiche Wiederholungsregel.
  - Threads: gleicher Titel, Termin und identische Segmenttexte.
- ALT-Texte bleiben erhalten; Medien werden im Upload-Verzeichnis persistiert.

---

## 6. Scheduler & Konfiguration

Der Tab **Konfiguration** enthält drei Bereiche:

1. **Scheduler & Retries**
   - Felder: Cron-Ausdruck, Zeitzone, Retries, Backoff in ms.
   - Beim Speichern liest und schreibt das Backend Werte aus der `Settings`-Tabelle; Defaults basieren auf `.env` (`TIME_ZONE`, `POST_RETRIES`, …).
2. **Dashboard-Polling**
   - Steuerung der Polling-Intervalle für Skeets/Threads (aktiv, idle, hidden) sowie Backoff, Jitter und Heartbeat.
   - Wirkt sofort auf alle Tabs; Werte werden in der Datenbank gespeichert.
3. **Zugangsdaten**
   - Verwaltung von Bluesky- und Mastodon-Credentials.
   - Eingaben werden in der hinterlegten `.env` gespeichert und in den laufenden Prozess injiziert. Nach erfolgreicher Speicherung entsperrt das Dashboard alle anderen Ansichten ohne Neustart.

> Änderungen werden nach dem Speichern direkt aktiv. Der Scheduler lädt seine Konfiguration neu; bei Polling-Parametern reagiert das Frontend unmittelbar auf die neuen Werte.

---

## 7. Live-Updates & Client-Konfiguration

- Beim Laden holt das Dashboard `/api/client-config`. Die Werte werden aus UI-Overrides (höchste Priorität), Env-Variablen und Defaults zusammengeführt.
- Vorrangfolge: **UI** → **Servervariablen (`THREAD_POLL_*`, `SKEET_POLL_*`)** → **`VITE_*`** → **Backend-Defaults**.
- Heartbeat:
  - Der „Master-Tab“ sendet alle `heartbeatMs` einen POST `/api/heartbeat`.
  - Fällt kein Heartbeat mehr an, setzt der Agent `idle` und drosselt den automatischen Engagement-Collector (`ENGAGEMENT_*` Variablen).
- SSE vs. Polling:
  - Solange die SSE-Verbindung steht, werden Polling-Intervalle automatisch ausgesetzt (außer während kritischer Phasen wie `publishing`).
  - Bei Netzwerkproblemen springt der Client auf Polling zurück.

---

## 8. Bluesky Direkt-Client

- **Timeline-Tabs:** Discover, Following, Popular with Friends, Mutuals, Best of Follows. Ein erneuter Klick auf einen aktiven Tab lädt den Feed neu.
- **Composer:** Modal-Fenster zum sofortigen Posten (inkl. Reply-Funktion). Medien-Uploads und ALT-Texte funktionieren analog zum Kampagnen-Planer.
- **Aktionen:** Like/Unlike, Repost/Unrepost direkt aus der Timeline.
- **Einschränkungen:** Einige Sektionen (Suche, Benachrichtigungen, Chat, Feeds, Listen) sind derzeit Platzhalter – das Layout ist vorbereitet, Funktionalität folgt später.

Der Direkt-Client verwendet dieselbe Login-Session wie der Scheduler. Ein fehlgeschlagener Bluesky-Login wirkt sich daher sowohl auf den Planer als auch auf den Direkt-Client aus.

---

## 9. Fehlersuche

| Problem | Mögliche Ursachen & Lösungen |
|---------|------------------------------|
| Skeet/Thread wird nicht veröffentlicht | Credentials prüfen (Konfiguration → Zugangsdaten). In den Server-Logs nach Fehlermeldungen suchen (`npm run start:dev`). |
| Medien-Upload schlägt fehl | Dateigröße größer als `UPLOAD_MAX_BYTES` oder `JSON_BODY_LIMIT_MB`. Ggf. Wert in `.env` erhöhen oder Bilder stärker komprimieren. |
| Bluesky-Client lädt keine Timeline | Prüfe Bluesky-Login im Backend-Log. Bei Rate-Limits kurz warten; ein erneuter Tab-Klick löst einen Refresh aus. |
| Dashboard zeigt keine Live-Updates | SSE-Verbindung getrennt (Konsole prüfen). Fallback-Polling ggf. über **Konfiguration → Dashboard-Polling** verkürzen. |
| Export-Datei wird nicht gespeichert | Browser unterstützt kein `showSaveFilePicker`. Datei wird dennoch in den Standard-Download-Ordner geschrieben. |

Bei weiteren Problemen helfen Browser-Konsole (Frontend) und die Logs des Node-Servers weiter.

---

## 10. Weiterführende Hinweise

- Import-/Export-Format: `backend/src/core/services/importExportService.js`
- Datenbankstruktur & Migrationen: `docs/database.md`
- Beispielkonfigurationen & .env-Variablen: `.env.sample`
- CLI-Kommandos (Build, Tests, Bundles): siehe `README.md`

Viel Erfolg mit deinen Kampagnen!

---

## 11. Screenshots

Für eine visuelle Orientierung findest du eine aktuelle Sammlung im Ordner `docs/Screenshots/`. Wichtige Ansichten:

- Übersicht (`1-BKB-Uebersicht.png`)
- Skeets – Geplant/Veröffentlicht/Papierkorb (`2-` bis `4-`)
- Skeet planen (`5-`)
- Threads – Geplant/Veröffentlicht/Papierkorb (`6-` bis `8-`)
- Thread planen (`9-`)
- Konfiguration (`10-`)

> Die Screenshots werden bei größeren UI-Überarbeitungen aktualisiert. Falls du neue Ansichten hinzufügst, ergänze bitte das Set.

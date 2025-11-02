# Kampagnen-Agent

Der Kampagnen-Agent bildet die Automatisierungsschicht des Projekts. Er orchestriert Planung, Speicherung und Veröffentlichung von Skeets/Threads, sammelt Engagement-Daten und stellt dem Dashboard Echtzeit-Updates zur Verfügung.

---

## Rolle & Verantwortlichkeiten

- **Planung verarbeiten:** Eingehende Skeets und Threads validieren, Medien zuordnen und wiederkehrende Posts vorbereiten.
- **Scheduler steuern:** Cron-Regeln und Zeitzonen anwenden, fällige Jobs ermitteln, Retries mit Backoff ausführen.
- **Plattformen ansprechen:** Bluesky (und optional Mastodon) über eine gemeinsame Service-Schicht bedienen; Ergebnisse pro Plattform erfassen.
- **Engagement erheben:** Likes, Reposts und Replies regelmäßig sowie on-demand abrufen und persistieren.
- **Echtzeit-Feedback liefern:** Server-Sent Events (`/api/events`) für UI-Aktualisierungen emittieren und Präsenz-Heartbeats auswerten.
- **Konfiguration kapseln:** Scheduler- und Polling-Einstellungen verwalten (`Settings`-Tabelle) und über `/api/client-config` an das Dashboard weitergeben.

---

## Kernaufgaben (Kurzüberblick)

| Bereich             | Beschreibung                                                                 |
|---------------------|-------------------------------------------------------------------------------|
| **Skeets & Threads**| Validierung, Speichern, Medienmanagement, Plattformstatus (`platformResults`)|
| **Scheduler**       | Cron-basierter Poller, Backoff/Retries, Wiederholungslogik (daily/weekly/monthly) |
| **Engagement**      | Aggregation von Likes/Reposts, Aufbereitung von Replies, Pflege von `SkeetReactions` und `Replies` |
| **Realtime**        | SSE-Events (`skeet:updated`, `thread:updated`, `…`) und Heartbeat-gesteuerte Drosselung des Collectors |
| **Tools & Integrationen** | Tenor-GIF-Proxy, direkte Bluesky-Aktionen, Maintenance-Utilities |

---

## Eingaben

- Geplante Inhalte aus dem Dashboard (`POST /api/skeets`, `POST /api/threads`)
- Medien-Uploads (Temp-Uploads, Skeet-/Thread-Medien)
- Scheduler- und Client-Polling-Konfiguration (`PUT /api/settings/*`)
- Zugangsdaten aus `.env` bzw. via `/api/config/credentials`

## Ausgaben

- Veröffentlichtes Posting inkl. URIs, Plattformstatus, Rückschlüssen für Wiederholungen
- Engagement-Kennzahlen (Likes/Reposts/Replies) für Dashboard & Statistiken
- SSE-Events zur Aktualisierung der UI und zur Signalisierung von Statuswechseln
- Logs (stdout / optional Datei) für Nachvollziehbarkeit und Debugging

---

## Interaktionsflächen

- **Benutzer:innen:** arbeiten ausschließlich über das Dashboard (Planung, Konfiguration, Direkt-Client).
- **Datenbank:** persistiert Threads, Skeets, Medien, Reaktionen und Settings (siehe `docs/database.md`).
- **Scheduler:** `backend/src/core/services/scheduler.js` übernimmt Taktung, Backoff und Wiederholungslogik.
- **Presence-Service:** `POST /api/heartbeat` aktualisiert den letzten Aktivitätszeitpunkt eines Clients.
- **Plattform-Services:** `blueskyClient`, `mastodonClient` kapseln Logins, Posting und Engagement-Abrufe.
- **Realtime-Bus:** `backend/src/core/services/events.js` verteilt Push-Events an alle angemeldeten SSE-Clients.
- **Hilfsdienste:** Tenor-Proxy, Link-Preview-Service, Maintenance-Endpunkte.

---

## Konfiguration & Betrieb

Wichtige Environment-Variablen (Auszug):

- `BLUESKY_SERVER_URL`, `BLUESKY_IDENTIFIER`, `BLUESKY_APP_PASSWORD`
- `MASTODON_API_URL`, `MASTODON_ACCESS_TOKEN` (optional)
- `TIME_ZONE` (Scheduler-Zeitzone), `SCHEDULE_TIME` (Default-Cron)
- `POST_RETRIES`, `POST_BACKOFF_MS`, `POST_BACKOFF_MAX_MS`
- `SCHEDULER_DISCARD_MODE` (Demo: Jobs werden verworfen)
- `JSON_BODY_LIMIT_MB` (Limit für Import-/Upload-Payloads)
- `UPLOAD_MAX_BYTES` (Maximale Dateigröße für Medien)
- `ENGAGEMENT_ACTIVE_MIN_MS`, `ENGAGEMENT_IDLE_MIN_MS`, `CLIENT_IDLE_THRESHOLD_MS`
- `SQLITE_STORAGE` bzw. `DATABASE_URL` für alternative Speicherorte

Zugangsdaten lassen sich über das Dashboard pflegen (`PUT /api/config/credentials`). Die API schreibt die Werte in die hinterlegte `.env`, aktualisiert aber auch laufende Prozess-Variablen, damit kein Neustart nötig ist.

Die Baseline-Migration wird beim Serverstart automatisch angewandt. Zusätzliche Migrationen müssen manuell via `npm run migrate:<env>` ausgeführt werden (siehe `docs/database.md`).

---

## Beispielablauf

1. **Planung:** Eine Editorin legt im Dashboard einen Thread an und lädt Medien hoch. Der Agent validiert Eingaben, speichert Daten und erstellt ggf. wiederkehrende Termine.
2. **Scheduler:** Der Cron-Poller greift fällige Einträge ab, prüft Plattform-Credentials und ruft `postService.sendPost()` für jede Zielplattform auf.
3. **Ergebnisverarbeitung:** Erfolgreiche oder fehlgeschlagene Plattformantworten landen in `platformResults`. Der Agent plant bei Bedarf Wiederholungen (daily/weekly/monthly) oder markiert den Eintrag als veröffentlicht.
4. **Realtime-Update:** Über `events.emit('thread:updated', …)` bzw. `events.emit('skeet:updated', …)` wird das Dashboard informiert und aktualisiert seine Listen ohne Polling.
5. **Engagement:** Entweder on-demand (Button im Dashboard) oder automatisch (Zeitplan des Collectors) ruft der Agent `threadEngagementService` bzw. `engagementService` auf, speichert Kennzahlen und sendet weitere SSE-Events.
6. **Direktaktionen:** Der integrierte Bluesky-Client nutzt dieselben Service-Schichten, um Timeline, Likes oder das Posten in Echtzeit zu ermöglichen – ohne die geplanten Kampagnen zu beeinflussen.

---

## Weiterführende Quellen

- Scheduler & Posting: `backend/src/core/services/scheduler.js`, `postService.js`
- Engagement: `backend/src/core/services/engagementService.js`, `threadEngagementService.js`
- SSE/Event-Bus: `backend/src/core/services/events.js`
- Datenmodell: `backend/src/data/models/*`, dokumentiert in `docs/database.md`

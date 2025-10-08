# API Quick Reference

Übersicht zentraler HTTP‑Endpunkte. Alle Routen sind JSON‑basiert. Erfolgsantworten liefern `200 OK` (oder `201 Created` bei Anlage). Fehler enthalten `{ error: string }` und nutzen passende Statuscodes.

## Konfiguration

- GET `/api/client-config`
  - Liefert Client‑Konfiguration (Polling‑Intervalle, Jitter, Heartbeat, Locale, Timezone)
  - Beispielantwort (gekürzt):
    ```json
    {
      "polling": {
        "skeets": { "activeMs": 8000, "idleMs": 40000, "hiddenMs": 180000, "minimalHidden": false },
        "threads": { "activeMs": 8000, "idleMs": 40000, "hiddenMs": 180000, "minimalHidden": false },
        "backoffStartMs": 10000, "backoffMaxMs": 300000, "jitterRatio": 0.15, "heartbeatMs": 2000
      },
      "locale": "de-DE",
      "timeZone": "Europe/Berlin"
    }
    ```

- GET `/api/settings/scheduler`
- PUT `/api/settings/scheduler`
  - Body: `{ scheduleTime: string, timeZone: string, postRetries: number, postBackoffMs: number, postBackoffMaxMs: number }`
  - Antwort: `{ values, defaults }`

- GET `/api/settings/client-polling`
- PUT `/api/settings/client-polling`
  - Body (Auszug): `{ threadActiveMs, threadIdleMs, threadHiddenMs, skeetActiveMs, skeetIdleMs, skeetHiddenMs, backoffStartMs, backoffMaxMs, jitterRatio, heartbeatMs }`
  - Antwort: `{ values, defaults }`

## Skeets

- GET `/api/skeets?includeDeleted=1|0&onlyDeleted=1|0`
- POST `/api/skeets`
  - Body (Auszug): `{ content: string, scheduledAt?: string|null, repeat?: 'none'|'daily'|'weekly'|'monthly', targetPlatforms?: string[] }`
- PATCH `/api/skeets/:id`
- DELETE `/api/skeets/:id?permanent=1|0`
- POST `/api/skeets/:id/retract` (Remote‑Löschen auf Plattformen)
- POST `/api/skeets/:id/restore`

- GET `/api/reactions/:skeetId`
  - Aggregiert Likes/Reposts (Bluesky, optional Mastodon), speichert Metriken im Datensatz und liefert `{ total, platforms, errors? }`.

## Threads

- GET `/api/threads?status=draft|scheduled|published|deleted`
- GET `/api/threads/:id`
- POST `/api/threads`
  - Body (Auszug): `{ title?: string, scheduledAt?: string|null, status?: 'draft'|'scheduled', targetPlatforms?: string[], appendNumbering?: boolean, skeets: { sequence?: number, content: string }[] }`
- PATCH `/api/threads/:id`
- DELETE `/api/threads/:id?permanent=1|0`
- POST `/api/threads/:id/retract` (Remote‑Löschen auf Plattformen; wandert in Papierkorb)
- POST `/api/threads/:id/restore`

- POST `/api/threads/:id/engagement/refresh`
  - On‑Demand‑Collector für Likes/Reposts/Replies pro Segment; Antwort: `{ ok: true, totals, platforms }`.

## Import/Export

- GET `/api/skeets/export[?includeMedia=0|1]`
  - Liefert geplante Skeets als JSON. Enthält neben Metadaten jetzt auch optionale Medien je Skeet (max. 4) mit Base64-Inhalt und ALT‑Text.
  - `includeMedia`: Standard `1` (inkludiert Medien). Mit `0` werden Medien zur Dateigrößenreduktion weggelassen.
  - Medienobjekt: `{ filename?, mime, altText?, data }` wobei `data` eine Data‑URL (`data:<mime>;base64,<...>`) ist. `filename` ist optional und dient nur als Hinweis.
- POST `/api/skeets/import`
  - Akzeptiert die oben genannte Struktur; Medien werden gespeichert und ALT‑Texte übernommen.
  - Duplikatprüfung: gleicher `content` + Termin/Repeat‑Kombination wird übersprungen.
- GET `/api/threads/export[?status=...&includeMedia=0|1]`
  - Liefert Threads (standardmäßig Drafts/Geplant) inkl. Segmenten. Jedes Segment kann Medien enthalten (Struktur wie oben, max. 4 pro Segment).
  - `includeMedia`: Standard `1` (inkludiert Medien). Mit `0` werden Medien zur Dateigrößenreduktion weggelassen.
- POST `/api/threads/import`
  - Akzeptiert Threads mit `segments[].media[]`. Medien werden gespeichert, ALT‑Texte übernommen. `filename` ist optional; fehlt es, wird ein generischer Name verwendet.
  - Duplikatprüfung: gleicher `title` und `scheduledAt` sowie identische Segment‑Texte in gleicher Reihenfolge werden übersprungen.

Hinweis: Import erwartet eine passende JSON‑Struktur aus dem jeweiligen Export.

Größenhinweis
- Durch Base64‑Inhalte können Exporte groß werden. Das serverseitige Limit für JSON‑Bodies ist via `JSON_BODY_LIMIT_MB` (Default 25) konfigurierbar.
## Präsenz / Heartbeat

- POST `/api/heartbeat`
  - Wird vom Dashboard‑Master‑Tab periodisch aufgerufen und signalisiert dem Backend, dass ein aktiver Client vorhanden ist. Das Backend drosselt den periodischen Engagement‑Collector, wenn längere Zeit kein Heartbeat empfangen wurde.

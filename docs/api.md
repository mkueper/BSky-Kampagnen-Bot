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

- GET `/api/skeets/export`
- POST `/api/skeets/import`
- GET `/api/threads/export`
- POST `/api/threads/import`

Hinweis: Import erwartet eine passende JSON‑Struktur aus dem jeweiligen Export.


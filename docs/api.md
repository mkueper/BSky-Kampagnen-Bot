# API Quick Reference

Übersicht über die wichtigsten HTTP‑Endpunkte des Projekts.

- Alle Routen liefern bzw. erwarten JSON (`Content-Type: application/json`), sofern nicht anders erwähnt.
- Erfolgreiche Operationen geben in der Praxis meist `200 OK` bzw. `201 Created` zurück; einige Endpunkte liefern heute noch „flache“ JSON-Objekte/Arrays (z. B. reine Skeet-/Thread-Listen), andere folgen bereits einem strukturierten Antwortschema.
- **Authentifizierung & Schutz:** Der Zugriff auf alle produktiven `/api/*`‑Routen (mit Ausnahme von `/api/auth/*`) ist durch einen Admin-Login geschützt. Das Backend erwartet gültige `AUTH_*`‑Variablen in `.env`, setzt beim Login ein httpOnly/SameSite=Lax‑Session‑Cookie und prüft dieses per Middleware `requireAuth` für jede `/api/*`‑Anfrage.

> Hinweis zum Response-Schema  
> Als Soll-Konvention ist ein einheitliches Schema `{ data, meta, error }` in `docs/konventionen/api-konventionen.md` definiert. Der aktuelle Code setzt dies nur teilweise um: Konfigurationsendpunkte (`/api/settings/*`, `/api/client-config`) und einige Hilfsrouten liefern bereits strukturierte Objekte, viele Ressourcen-APIs (Skeets, Threads, Engagement) geben weiterhin direkt Objekte/Arrays ohne `data/meta/error` zurück.

---

## Grundlegende Konfiguration & Monitoring

- **GET `/api/client-config`**  
  Liefert die vereinigte Client-Konfiguration für das Dashboard. Enthält Polling-Intervalle, Heartbeat, Jitter, Locale, Zeitzone sowie Flags wie `needsCredentials`. Antwort ist heute ein „flaches“ Objekt `{ polling, images, search }` (noch ohne `{ data, meta, error }`).

- **GET/PUT `/api/settings/scheduler`**  
  Lesen bzw. Schreiben des Scheduler-Setups. Request-Payload (PUT):  
  ```json
  {
    "scheduleTime": "* * * * *",
    "timeZone": "Europe/Berlin",
    "postRetries": 4,
    "postBackoffMs": 600,
    "postBackoffMaxMs": 5000,
    "graceWindowMinutes": 10,
    "randomOffsetMinutes": 0
  }
  ```  
  Response enthält `{ "values": {...}, "defaults": {...} }`.  
  `randomOffsetMinutes` definiert den globalen Zufallsversatz (± Minuten) für wiederkehrende Posts; `graceWindowMinutes` legt fest, wie lange verpasste Termine nach einem Neustart nachgeholt werden.

- **GET/PUT `/api/settings/client-polling`**  
  Persistiert (in der DB) Fallback-Intervalle für Skeet-/Thread-Polling plus Backoff/Jitter. Körper beinhaltet Felder wie `threadActiveMs`, `skeetHiddenMs`, `backoffStartMs`, `heartbeatMs`. Antwort folgt dem Muster `{ values, defaults, overrides }` (ohne `data/meta/error`-Wrapper).

- **POST `/api/heartbeat`**  
  Vom Dashboard-Master-Tab gesendeter Heartbeat. Aktualisiert den Präsenzstatus, damit der Scheduler den Engagement-Collector bei abwesenden Clients drosseln kann.

- **GET `/api/events` (Server-Sent Events)**  
  Stream für Echtzeit-Updates. Events:
  - `skeet:updated` – Änderungen an Skeets (Status, Löschung, Restore).
  - `skeet:engagement` – aktualisierte Likes/Reposts für einen Skeet.
  - `thread:updated` – Statuswechsel eines Threads (z. B. `publishing` → `published`).
  - `thread:engagement` – Ergebnisse eines Engagement-Refreshs.
  - `ping` – Keepalive alle 25 s.  
  Client sollte `EventSource` verwenden und bei Abbruch reconnecten.

### Fehlerformat (`{ error, message }`)

Ein wachsender Teil der Konfigurations- und Auth-Endpunkte verwendet ein einheitliches Fehlerformat:

```json
{
  "error": "EIN_FEHLERCODE",
  "message": "Menschenlesbare Beschreibung (lokalisierbar)."
}
```

- `error` ist ein stabiler, maschinenlesbarer Code (z. B. `AUTH_INVALID_CREDENTIALS`), den Frontends über i18n in Benutzertexte übersetzen können.
- `message` ist eine menschenlesbare Beschreibung, die sich an der Projektsprache orientiert (aktuell Deutsch); das Dashboard nutzt sie als Fallback, wenn kein spezifischer i18n-Text existiert.

Aktuell gelten u. a. folgende Codes:

- **Auth / Login**
  - `AUTH_NOT_CONFIGURED` – Login noch nicht konfiguriert (`AUTH_*` fehlt); `/api/auth/login` liefert `503`.
  - `AUTH_MISSING_CREDENTIALS` – Benutzername oder Passwort nicht übermittelt; `400`.
  - `AUTH_INVALID_CREDENTIALS` – Kombination aus Benutzer/Passwort ist ungültig; `401`.
  - `AUTH_SESSION_REQUIRED` – Session fehlt oder ist abgelaufen; `401` (z. B. aus `requireAuth`).
- **Settings – Scheduler (`/api/settings/scheduler`)**
  - `SETTINGS_SCHEDULER_LOAD_FAILED` – Fehler beim Laden der Scheduler-Einstellungen; `500`.
  - `SETTINGS_SCHEDULER_INVALID_CRON` – ungültiger Cron-Ausdruck; `400`.
  - `SETTINGS_SCHEDULER_INVALID_NUMBERS` – Retry-/Backoff-Werte sind keine positiven Zahlen; `400`.
  - `SETTINGS_SCHEDULER_INVALID_GRACE_WINDOW` – `SCHEDULER_GRACE_WINDOW_MINUTES` kleiner als 2; `400`.
  - `SETTINGS_SCHEDULER_INVALID_RANDOM_OFFSET` – `SCHEDULER_RANDOM_OFFSET_MINUTES` außerhalb des erlaubten Bereichs; `400`.
  - `SETTINGS_SCHEDULER_SAVE_FAILED` – sonstiger Fehler beim Speichern der Scheduler-Einstellungen; `500`.
- **Settings – Allgemein (`/api/settings/general`)**
  - `SETTINGS_GENERAL_LOAD_FAILED` – Fehler beim Laden der allgemeinen Einstellungen; `500`.
  - `SETTINGS_GENERAL_TIME_ZONE_REQUIRED` – `TIME_ZONE` fehlt; `400`.
  - `SETTINGS_GENERAL_LOCALE_REQUIRED` – `LOCALE` fehlt; `400`.
  - `SETTINGS_GENERAL_LOCALE_UNSUPPORTED` – `LOCALE` ist nicht `de` oder `en`; `400`.
  - `SETTINGS_GENERAL_SAVE_FAILED` – generischer Fehler beim Speichern; `500`.
- **Settings – Client-Polling (`/api/settings/client-polling`)**
  - `SETTINGS_POLLING_LOAD_FAILED` – Fehler beim Laden der Client-Polling-Konfiguration; `500`.
  - `SETTINGS_POLLING_INVALID_NUMBERS` – Polling-Intervalle/Backoff-Werte sind keine positiven Zahlen; `400`.
  - `SETTINGS_POLLING_INVALID_JITTER` – `POLL_JITTER_RATIO` liegt nicht im Intervall `[0, 1]`; `400`.
  - `SETTINGS_POLLING_SAVE_FAILED` – generischer Fehler beim Speichern; `500`.

Ältere Endpunkte geben teilweise noch nur ein Feld `error` mit freiem Text zurück. Das Dashboard behandelt diese Fälle weiterhin über generische Fallback-Meldungen. Neue oder überarbeitete Routen sollten nach Möglichkeit das oben beschriebene Schema verwenden und ihre Fehlercodes in der Dokumentation ergänzen.

- **Bluesky – Reactions (`/api/bsky/reactions`)**
  - Die Route liefert bei Fehlern neben einem menschenlesbaren `error`/`message`-Text zusätzlich ein Feld `code` für Maschinen:
    - `BLSKY_REACTIONS_URI_REQUIRED` – `uri`-Parameter fehlt; `400`.
    - `BLSKY_REACTIONS_NOT_FOUND` – die angefragte URI konnte bei Bluesky nicht gefunden werden; `404`.
    - `BLSKY_REACTIONS_RATE_LIMITED` – Abruf wurde von Bluesky aufgrund von Rate-Limits abgelehnt; `429`.
    - `BLSKY_REACTIONS_UNAUTHORIZED` – fehlende oder ungültige Zugangsdaten für Bluesky; `401`/`403`.
    - `BLSKY_REACTIONS_FAILED` – sonstiger Fehler beim Laden der Reaktionen; `500`.

- **Bluesky – Direktes Posten (`/api/bsky/post`, `/api/bsky/reply`)**
  - Beim direkten Senden von Beiträgen/Replies werden u. a. folgende Codes verwendet:
    - `BLSKY_POST_TEXT_OR_QUOTE_REQUIRED` – weder `text` noch gültige `quote`-Angaben vorhanden; `400`.
    - `BLSKY_POST_ENV_INVALID` – Bluesky-Umgebung nicht korrekt konfiguriert (z. B. fehlender Identifier/App-Passwort); `500`.
    - `BLSKY_POST_SEND_FAILED` – der Versand über die Bluesky-API war nicht erfolgreich; `500`.
    - `BLSKY_POST_UNEXPECTED` – unerwarteter Fehler beim Senden.
    - `BLSKY_REPLY_TEXT_REQUIRED` – Reply-Text fehlt; `400`.
    - `BLSKY_REPLY_CONTEXT_REQUIRED` – `root`/`parent` (jeweils `uri`/`cid`) fehlen oder sind unvollständig; `400`.
    - `BLSKY_REPLY_ENV_INVALID` – Bluesky-Umgebung für Replies nicht korrekt konfiguriert; `500`.
    - `BLSKY_REPLY_SEND_FAILED` – Versand der Antwort über die Bluesky-API fehlgeschlagen; `500`.
    - `BLSKY_REPLY_UNEXPECTED` – unerwarteter Fehler beim Senden der Antwort; `500`.

- **Bluesky – Timeline, Threads, Profile**
  - `BLSKY_TIMELINE_FAILED` – Fehler beim Laden der Bluesky-Timeline (`/api/bsky/timeline`); `500`.
  - `BLSKY_THREAD_URI_REQUIRED` – `uri`-Parameter für `GET /api/bsky/thread` fehlt; `400`.
  - `BLSKY_THREAD_NOT_FOUND` – Thread konnte nicht geladen werden (falsche oder gelöschte URI); `404`.
  - `BLSKY_THREAD_FAILED` – unerwarteter Fehler beim Laden eines Threads; `500`.
  - `BLSKY_PROFILE_ACTOR_REQUIRED` – `actor`-Parameter fehlt (`/api/bsky/profile`); `400`.
  - `BLSKY_PROFILE_NOT_FOUND` – Profil wurde nicht gefunden; `404`.
  - `BLSKY_PROFILE_FAILED` – generischer Fehler beim Laden eines Profils; `500`.
  - `BLSKY_PROFILE_FEED_ACTOR_REQUIRED` – `actor`-Parameter fehlt (`/api/bsky/profile/feed`); `400`.
  - `BLSKY_PROFILE_FEED_FAILED` – Fehler beim Laden des Profil-Feeds; `500`.
  - `BLSKY_PROFILE_LIKES_ACTOR_REQUIRED` – `actor`-Parameter fehlt (`/api/bsky/profile/likes`); `400`.
  - `BLSKY_PROFILE_LIKES_HIDDEN` – Likes sind versteckt oder nicht verfügbar; `404`.
  - `BLSKY_PROFILE_LIKES_FAILED` – Fehler beim Laden der Likes; `500`.

- **Bluesky – Bookmarks, Feeds & Suche**
  - `BLSKY_BOOKMARKS_FAILED` – Fehler beim Laden der Bookmarks (`/api/bsky/bookmarks`); `500`.
  - `BLSKY_FEEDS_FAILED` – Fehler beim Laden gespeicherter Feeds (`/api/bsky/feeds`); `500`.
  - `BLSKY_FEED_URI_REQUIRED` – `feedUri` fehlt bei Pin/Unpin (`/api/bsky/feeds/pin`); `400`.
  - `BLSKY_FEEDS_PIN_FAILED` – Fehler beim Anpinnen eines Feeds; `5xx`.
  - `BLSKY_FEEDS_UNPIN_FAILED` – Fehler beim Entfernen eines Pins; `5xx`.
  - `BLSKY_FEEDS_ORDER_REQUIRED` – `order` fehlt oder leer bei `PATCH /api/bsky/feeds/pin-order`; `400`.
  - `BLSKY_FEEDS_REORDER_FAILED` – Fehler beim Speichern der Pin-Reihenfolge; `5xx`.
  - `BLSKY_SEARCH_QUERY_REQUIRED` – `q`-Parameter fehlt (`/api/bsky/search`); `400`.
  - `BLSKY_SEARCH_FEEDS_UNSUPPORTED` – Feed-Suche wird von der aktuellen Bluesky-Instanz nicht unterstützt; `501` (oder API-spezifischer Status).
  - `BLSKY_SEARCH_FAILED` – generischer Fehler bei der Suche; `500`.

- **Bluesky – Notifications, Blocks & Push**
  - `BLSKY_NOTIFICATIONS_FAILED` – Fehler beim Laden von Mitteilungen (`/api/bsky/notifications`); `500`.
  - `BLSKY_NOTIFICATIONS_UNREAD_FAILED` – Fehler beim Laden des Mitteilungsstatus (`/api/bsky/notifications/unread-count`); `500`.
  - `BLSKY_BLOCKS_FAILED` – Fehler beim Laden der Blockliste (`/api/bsky/blocks`); `500`.
  - `BLSKY_PUSH_REGISTER_FAILED` – Fehler bei der Registrierung einer Push-Subscription (`/api/bsky/notifications/register-push`); Status z. B. `4xx`/`5xx` aus der Bluesky-API.
  - `BLSKY_PUSH_UNREGISTER_FAILED` – Fehler beim Entfernen einer Push-Subscription (`/api/bsky/notifications/unregister-push`); Status entsprechend Bluesky-API.

- **Import/Export – Skeets & Threads**
  - `IMPORT_EXPORT_SKEETS_EXPORT_FAILED` – Fehler beim Export geplanter Skeets (`GET /api/skeets/export`); `500`.
  - `IMPORT_EXPORT_SKEETS_IMPORT_FAILED` – Fehler beim Import geplanter Skeets (`POST /api/skeets/import`); `400`.
  - `IMPORT_EXPORT_THREADS_EXPORT_FAILED` – Fehler beim Export von Threads (`GET /api/threads/export`); `500`.
  - `IMPORT_EXPORT_THREADS_IMPORT_FAILED` – Fehler beim Import von Threads (`POST /api/threads/import`); `400`.

- **Uploads & Tenor**
  - `UPLOAD_MISSING_DATA` – weder Multipart-Datei noch gültige `data`-Payload vorhanden (`POST /api/uploads/temp`); `400`.
  - `UPLOAD_INVALID_DATA_URL` – `data` ist keine gültige Data-URL (`data:<mime>;base64,...`); `400`.
  - `UPLOAD_INVALID_BASE64` – Base64-Payload konnte nicht dekodiert werden; `400`.
  - `UPLOAD_INVALID_BUFFER` – dekodierter Buffer ist leer oder ungültig; `400`.
  - `UPLOAD_TOO_LARGE` – Datei überschreitet `UPLOAD_MAX_BYTES` oder multer-Limit; `413`.
  - `UPLOAD_FAILED` – generischer Fehler beim Upload (`/api/uploads/temp`); `500`.
  - `TENOR_API_KEY_REQUIRED` – Tenor-Proxy wurde ohne gültigen API-Key aufgerufen (`TENOR_API_KEY`/`VITE_TENOR_API_KEY` fehlt); `400`.
  - `TENOR_UPSTREAM_FAILED` – Fehler/Statuscode aus der Tenor-API beim Laden von `featured`/`search`; `4xx`/`5xx`.
  - `TENOR_PROXY_FAILED` – generischer Fehler im Tenor-Proxy (z. B. Netzwerkfehler); `500`.
  - `TENOR_DOWNLOAD_URL_REQUIRED` – im Body von `POST /api/tenor/download` fehlt eine gültige `url`; `400`.
  - `TENOR_DOWNLOAD_FAILED` – GIF konnte nicht geladen oder gespeichert werden (`/api/tenor/download`); `4xx`/`5xx`.
  - `TENOR_DOWNLOAD_TOO_LARGE` – geladenes GIF überschreitet das Upload-Limit; `413`.

---

## Skeets (Einzelposts)

- **GET `/api/skeets`**  
  Optionaler Query-String:
  - `includeDeleted=1` – inkludiert Papierkorb-Einträge (Soft-Delete).
  - `onlyDeleted=1` – liefert ausschließlich gelöschte Einträge.

- **POST `/api/skeets`**  
  Legt einen Skeet an. Felder (Auszug):  
  `content`, `scheduledAt` (ISO), `repeat` (`none|daily|weekly|monthly`), `repeatDayOfWeek`, `repeatDayOfMonth`, `targetPlatforms` (z. B. `["bluesky","mastodon"]`).

- **PATCH `/api/skeets/:id`**  
  Teilaktualisierung (gleiches Payload-Schema wie beim Anlegen).

- **DELETE `/api/skeets/:id`**  
  Standard: Soft-Delete (`deletedAt` wird gesetzt). Mit `?permanent=1` endgültig löschen.

- **POST `/api/skeets/:id/retract`**  
  Entfernt veröffentlichte Posts auf den Zielplattformen (soweit möglich). Optionaler Body: `{ "platforms": ["bluesky"] }`.

- **POST `/api/skeets/:id/restore`**  
  Stellt einen gelöschten Skeet wieder her (Soft-Delete).

- **POST `/api/skeets/:id/publish-now`**  
  Überspringt den Scheduler und veröffentlicht sofort (sofern Credentials vorhanden). Antwort enthält den aktualisierten Datensatz.

- **GET `/api/skeets/export?includeMedia=1`**  
  Liefert geplante Skeets als JSON. Medien werden (standardmäßig) als Data-URL eingebettet (`{ mime, altText?, data, filename? }`). Mit `includeMedia=0` lassen sich Medien weglassen. Antwort ist ein Array von Skeet-Objekten (ohne `{ data, meta, error }`).

- **POST `/api/skeets/import`**  
  Erwartet die vom Export gelieferte Struktur (`[{ ...skeet, media: [...] }]`). Medien werden gespeichert; Duplikate (Inhalt + Termin/Repeat) werden übersprungen. Antwort ist ein Array importierter Skeets bzw. eine Zusammenfassung, ebenfalls ohne `data/meta/error`-Wrapper.

- **POST `/api/skeets/:id/media`**  
  Fügt einem Skeet bis zu vier Bilder hinzu. Payload:  
  `{ "data": "data:<mime>;base64,...", "mime": "image/png", "altText": "Beschreibung", "filename": "bild.png" }`.

- **PATCH `/api/skeet-media/:mediaId`**  
  Aktualisiert ALT-Text oder Reihenfolge (`{ "altText": "…" , "order": 1 }`).

- **DELETE `/api/skeet-media/:mediaId`**  
  Entfernt einen Medienanhang.

---

## Threads (Mehrteilige Kampagnen)

- **GET `/api/threads`**  
  Optional `?status=draft|scheduled|publishing|published|failed|deleted`.

- **GET `/api/threads/:id`**  
  Liefert Thread inkl. Segmenten, Reaktionen und Medien.

- **POST `/api/threads`**  
  Payload (Auszug):  
  ```json
  {
    "title": "Launch-Plan",
    "scheduledAt": "2025-01-31T10:00:00Z",
    "targetPlatforms": ["bluesky"],
    "appendNumbering": true,
    "segments": [
      { "sequence": 0, "content": "Part 1" },
      { "sequence": 1, "content": "Part 2" }
    ]
  }
  ```
  Medien lassen sich im Anschluss pro Segment hochladen.

- **PATCH `/api/threads/:id`**  
  Aktualisiert Metadaten oder Segmente (analog zum POST-Payload).

- **DELETE `/api/threads/:id`**  
  Soft-Delete (Papierkorb). Mit `?permanent=1` vollständige Löschung.

- **POST `/api/threads/:id/retract`**  
  Entfernt veröffentlichte Segmente plattformweise und verschiebt den Thread in den Papierkorb.

- **POST `/api/threads/:id/restore`**  
  Stellt gelöschte Threads wieder her.

- **POST `/api/threads/:id/publish-now`**  
  Versendet einen Thread ohne Scheduler. Antwort enthält den aktualisierten Thread (inkl. Segmentstatus).

- **GET `/api/threads/export`**  
  Exportiert (standardmäßig Draft- & geplante) Threads inklusive Segmenten/Medien. Parameter:
  - `status=draft|scheduled|published|deleted`
  - `includeMedia=0|1`  
  Antwort ist ein Array von Thread-Objekten (ohne `{ data, meta, error }`).

- **POST `/api/threads/import`**  
  Erwartet Export-Format. Enthält `segments[].media[]` mit Data-URLs. Duplikate (Titel + Termin + identische Segmente) werden ignoriert. Antwort liefert eine Liste importierter Threads bzw. eine Ergebnis-Zusammenfassung (derzeit ohne `data/meta/error`-Wrapper).

- **POST `/api/threads/:id/segments/:sequence/media`**  
  Hängt Medien an ein Segment (`sequence` basiert auf Segment-Reihenfolge). Payload wie bei Skeet-Medien.

- **PATCH `/api/media/:mediaId`** / **DELETE `/api/media/:mediaId`**  
  Aktualisieren/Löschen von Thread-Segment-Medien.

- **POST `/api/threads/:id/engagement/refresh`**  
  Sammeln von Likes/Reposts/Replies für einen konkreten Thread. Antwort u. a. `{ "totals": { "likes": 5, "reposts": 2, "replies": 1 } }`.

- **POST `/api/threads/engagement/refresh-all`**  
  Batch-Refresh für alle veröffentlichten Threads. Nutzt Präsenz-Informationen, um nicht häufiger als konfiguriert zu laufen.

---

## Engagement & Reaktionen

- **GET `/api/reactions/:skeetId`**  
  Aggregiert Likes/Reposts je Plattform. Antwort enthält `total`, `platforms`, optionale `errors`. Speichert Zähler direkt am Skeet.

- **GET `/api/replies/:skeetId`**  
  Liefert Replies aus Bluesky (und Mastodon, sofern Token vorhanden). Antwort kann neben einer `items`-Liste auch `errors` enthalten, wenn Plattformen fehlschlagen.

- **POST `/api/engagement/refresh-many`**  
  Batch-Aktualisierung für sichtbar gelistete Entities (`{ "entity": "skeet", "ids": [1,2,3] }`). Antwort listet Resultate pro ID (direktes JSON-Objekt ohne `{ data, meta, error }`).

---

## Bluesky-Direktaktionen (Dashboard → Bluesky-API)

- **GET `/api/bsky/timeline?tab=discover|following|mutuals|friends-popular|best-of-follows`**  
  Liefert den entsprechenden Feed für den integrierten Client. Je nach Parametern (z. B. `tab`, `feedUri`) werden unterschiedliche Quellen bedient. Antwort ist heute ein „flaches“ Objekt mit Items/Meta-Informationen.

- **POST `/api/bsky/post`**  
  Direktes Posten eines Skeets über den eingebauten Composer. Payload umfasst `text`, optionale `reply`-Informationen, Medien-Strukturen analog zu den Planern sowie optional `external` (Link-Preview mit `uri`, `title`, `description`, `image`).

- **POST `/api/bsky/reply`**  
  Antwortet auf einen existierenden Post (`{ uri, cid, text }`). Unterstützt ebenfalls optionale Medien sowie `external`.

- **POST/DELETE `/api/bsky/like`**, **POST/DELETE `/api/bsky/repost`**  
  Likes/Reposts für gegebene URIs. Body: `{ "uri": "...", "cid": "..." }`.

- **GET `/api/bsky/reactions`**  
  Lightweight-Abfrage von Likes/Reposts für eine einzelne URI.

---

## Hilfsendpunkte & Werkzeuge

- **GET `/api/preview?url=...`**  
  Liefert og:image, Titel und Beschreibung für Link-Previews im Composer.

- **GET/PUT `/api/config/credentials`**  
  Liest bzw. schreibt Bluesky/Mastodon-Zugangsdaten in die `.env`. PUT erwartet u. a. `blueskyServerUrl`, `blueskyIdentifier`, `blueskyAppPassword`. Antworten sind heute einfache JSON-Objekte mit Status-/Konfigurationsinformationen.

- **POST `/api/uploads/temp`**  
  Temporäre Ablage für Medien während der Thread-Bearbeitung. Body wie bei Medienendpunkten. Antwort liefert u. a. `tempId`, `previewUrl`, `size`. Limit via `UPLOAD_MAX_BYTES` (Default 8 MB).

- **GET `/api/tenor/featured`**, **GET `/api/tenor/search?q=...`**  
  Proxy zum Tenor-GIF-API. Aktiv nur mit gesetztem `TENOR_API_KEY`.

- **POST `/api/maintenance/cleanup-mastodon`**  
  Hilfsroute ohne Auth – entfernt Waisen in Mastodon-Daten. Nur in vertrauenswürdigen Netzen ausführen!
- **POST `/api/maintenance/cleanup-temp-uploads`**  
  Entfernt alte temporäre Upload-Dateien aus `TEMP_UPLOAD_DIR`. Optionaler Body: `{ "maxAgeHours": 24 }` (Standard 24 h). Antwort enthält u. a. Listen von entfernten (`removed`) und behaltenen (`kept`) Dateien.

- **GET `/health`**  
  Health-Check (Version, Environment). Verwendet von Docker-Healthcheck.

---

## Auth & Login (Überblick)

- **`/api/auth/*`**  
  Unabhängig von den übrigen API-Routen existiert ein eigener Auth-Namespace:
  - `GET /api/auth/session` – liefert die aktuelle Session bzw. `401` bei nicht angemeldeten Nutzern.
  - `POST /api/auth/login` – nimmt `username`/`password` entgegen, vergleicht sie mit `AUTH_USERNAME`/`AUTH_PASSWORD_HASH` und setzt bei Erfolg ein Session-Cookie.
  - `POST /api/auth/logout` – beendet die Sitzung und leert das Cookie.
- **`/api/*` (produktive Endpunkte)**  
  Alle oben beschriebenen `/api/*`‑Routen (Skeets, Threads, Settings, Bluesky, Engagement etc.) hängen an `backend/src/api/routes/index.js` und werden in `backend/server.js` hinter `requireAuth` montiert. Ohne gültige Session (`AUTH_*` nicht konfiguriert oder Cookie abgelaufen) liefern sie `503` bzw. `401`.

Die in `docs/konventionen/api-konventionen.md` beschriebenen Soll-Konventionen (`{ data, meta, error }`) gelten auch hier als Zielbild; viele Auth- und Ressourcen-Endpunkte verwenden aktuell jedoch noch einfachere JSON-Strukturen.

---

## Import-/Upload-Limits

- `JSON_BODY_LIMIT_MB` steuert die maximale Größe von JSON-Requests (Standard 25 MB) – relevant für Importe und Medienanhänge.
- `UPLOAD_MAX_BYTES` begrenzt serverseitiges Zwischenspeichern von Base64-Medien (Default 8–10 MB, je nach Codepfad).
- Je Skeet/Segment sind aktuell maximal vier Medien vorgesehen.

---

## Hinweise

- Die API geht davon aus, dass Scheduler und Datenbank konsistent arbeiten. Bei manuellen Änderungen immer die Baseline-Migration (`migrations/00000000000000-baseline-rebuild.js`) berücksichtigen.
- Viele Endpunkte geben zusätzlich Metadaten zurück (z. B. `platformResults`, `metadata`). Felder können Strings oder bereits geparste Objekte sein – die Frontend-Hooks normalisieren sie entsprechend.
- Das in `docs/konventionen/api-konventionen.md` beschriebene Response-Schema `{ data, meta, error }` ist aktuell noch nicht durchgängig implementiert; insbesondere Skeet-/Thread-/Engagement-Routen liefern weiterhin „flache“ JSON-Strukturen und sollen mittelfristig auf das Zielschema umgestellt werden.

## Profil bearbeiten
- Entfernen von Avatar/Banner wird nun ueber "Avatar entfernen" bzw. "Banner entfernen" im Edit-Modal unterstuetzt (setzt den jeweiligen Wert auf null im Profil-Record).

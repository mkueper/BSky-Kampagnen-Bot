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
    "postBackoffMaxMs": 5000
  }
  ```  
  Response enthält `{ "values": {...}, "defaults": {...} }`.

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

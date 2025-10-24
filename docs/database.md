# Datenbankhandbuch

Dieser Leitfaden fasst das aktuelle Schema, die wichtigsten Tabellen und bewährte Abläufe für Pflege & Migrationen zusammen. Basis ist der Zustand des Haupt-Branches (2025).

---

## Überblick

- **Datenbanksystem:** SQLite (Standard). Andere Dialekte lassen sich über `DATABASE_URL` konfigurieren, werden jedoch aktuell nicht offiziell unterstützt, da die Baseline-Migration SQLite-spezifische PRAGMAs nutzt.
- **ORM & Migrationen:** Sequelize. Die komplette Schema-Definition liegt in `migrations/00000000000000-baseline-rebuild.js` und wird beim Serverstart idempotent ausgeführt.
- **Models & Zugriff:** Initialisiert über `backend/src/data/models/index.js`. Services verwenden ausschließlich diesen Einstieg, damit Relationen & Hooks konsistent bleiben.
- **Speicherort:** Standardmäßig `./data/bluesky_campaign_<env>.sqlite`. Über `SQLITE_STORAGE` lässt sich ein abweichender Pfad setzen; Ordner werden beim Start automatisch angelegt.

| Tabelle              | Zweck                                                                 |
|----------------------|-----------------------------------------------------------------------|
| `Threads`            | Metadaten für mehrteilige Kampagnen (Titel, Status, Zeitzone-Infos)   |
| `ThreadSkeets`       | Segmente eines Threads inkl. Zeichenanzahl, Remote-IDs, Status        |
| `ThreadSkeetMedia`   | Medien je Thread-Segment                                              |
| `Skeets`             | Einzelposts (geplant, veröffentlicht, wiederkehrend)                  |
| `SkeetMedia`         | Medien je Skeet                                                       |
| `SkeetReactions`     | Pro-Segment-Reaktionen (Replies, Likes etc.)                          |
| `Replies`            | Aggregierte Antworten auf veröffentlichte Skeets                      |
| `Settings`           | Key-Value-Store für Scheduler-/Client-Konfiguration                   |

---

## Tabellen im Detail

### Threads (`Threads`)
- **Primärschlüssel:** `id` (INTEGER, auto increment)
- **Felder:** `title`, `scheduledAt`, `status` (`draft|scheduled|publishing|published|failed|deleted`), `targetPlatforms` (JSON), `appendNumbering`, `metadata` (JSON-Objekt).
- **Timestamps:** `createdAt`, `updatedAt`
- **Relationen:** `Thread.hasMany(ThreadSkeet, { as: "segments" })`, `Thread.hasMany(Skeet, { as: "scheduledSkeets" })`

### Thread-Segmente (`ThreadSkeets`)
- **Felder:** `sequence`, `content`, `appendNumbering`, `characterCount`, `postedAt`, `remoteId`, `platformPayload` (JSON pro Plattform).
- **Indices:** `(threadId, sequence)` eindeutig (`threadSkeets_thread_sequence_unique`), Index auf `remoteId`.
- **Relationen:** `belongsTo(Thread)`, `hasMany(SkeetReaction)`, `hasMany(ThreadSkeetMedia)`

### Thread-Segment-Medien (`ThreadSkeetMedia`)
- **Felder:** `threadSkeetId`, `order`, `path`, `mime`, `size`, `altText`
- **Anwendung:** Dateien liegen im Upload-Verzeichnis (`UPLOAD_DIR`, Standard `data/uploads`). Reihenfolge wird über `order` gesteuert.

### Skeets (`Skeets`)
- **Felder:** `content`, `scheduledAt`, `postUri`, `likesCount`, `repostsCount`, `postedAt`, `repeat`, `repeatDayOfWeek`, `repeatDayOfMonth`, `threadId`, `isThreadPost`, `targetPlatforms` (JSON), `platformResults` (JSON).
- **Soft-Delete:** `paranoid: true` → `deletedAt`.
- **Indices:** auf `scheduledAt`, `threadId`, `deletedAt`.
- **Validierungen:** Pflichttermin bei `repeat = 'none'`, Wiederholungswerte bei `weekly`/`monthly`, gültige Plattformen.

### Skeet-Medien (`SkeetMedia`)
- Aufbau analog zu `ThreadSkeetMedia` (`skeetId`, `order`, `path`, `mime`, `size`, `altText`).

### Skeet-Reaktionen (`SkeetReactions`)
- Speichert pro Segment (`threadSkeetId`) Aggregationen: `type` (reply/like/repost), `authorHandle`, `authorDisplayName`, `content`, `metadata` (JSON), `fetchedAt`, `remoteId`.
- Indizes auf `threadSkeetId` und `remoteId`.

### Replies (`Replies`)
- Antworten auf Einzel-Skeets (nicht auf Thread-Segmente): `skeetId`, `authorHandle`, `content` (bereits von HTML befreit), `platform`.
- Bei jedem Refresh wird der Satz für den Skeet komplett neu geschrieben (`DELETE` + `INSERT`).

### Settings (`Settings`)
- Key-Value-Speicher (`key` eindeutig). Aktuelle Keys siehe `backend/src/core/services/settingsService.js` (`SCHEDULE_TIME`, `TIME_ZONE`, `POST_RETRIES`, `POST_BACKOFF_MS`, `POST_BACKOFF_MAX_MS`, sowie Client-Polling-Overrides).

---

## Migrationen & Schema-Pflege

1. **Baseline**  
   Beim Start führt `backend/server.js` die Baseline-Migration immer aus:
   ```js
   const migration = require('migrations/00000000000000-baseline-rebuild.js');
   await migration.up(queryInterface, Sequelize);
   ```
   Dadurch werden fehlende Tabellen/Spalten ergänzt, ohne bestehende Installationen zu zerstören.

2. **Zusätzliche Migrationen**
   - Lokal: `npm run migrate:dev`
   - Test: `npm run migrate:test`
   - Produktion: `npm run migrate:prod`
   - Docker: `docker compose exec backend npm run migrate:prod`

   Rollbacks sind via `npx sequelize-cli db:migrate:undo` möglich (nur mit aktuellem Backup empfohlen).

3. **`sequelize.sync()`**
   - Standardmäßig deaktiviert. Kann im Development per `DB_SYNC=true` (z. B. in `.env.local`) eingeschaltet werden.
   - Produktion: unbedingt `DB_SYNC=false` belassen und ausschließlich Migrationen verwenden.

4. **Datenbankpfade**
   - `SQLITE_STORAGE` überschreibt den Speicherort.
   - Die Standard-Dateien liegen in `data/` und sind je Umgebung getrennt (`development/test/production`).

---

## Backups & Betrieb

- **SQLite:** Reicht eine Kopie der `.sqlite`-Datei. Bei laufender Anwendung kurzzeitig stoppen oder `sqlite3 .dump` verwenden, um inkonsistente Snapshots zu vermeiden.
- **Uploads:** Medien werden in `data/uploads` (Skeets & Threads) bzw. `data/temp` (Draft-Uploads) abgelegt. Für Voll-Backups beide Ordner einbeziehen.
- **Engagement-Daten:** `SkeetReactions` und `Replies` können bei Bedarf neu aufgebaut werden (`refresh`-Endpunkte), haben daher geringere Backup-Priorität.
- **Docker:** Volume `data` beinhaltet sowohl Datenbank als auch Uploads.

---

## Best Practices für Schema-Änderungen

1. Baseline erweitern oder neue Migration schreiben (bitte die idempotente Struktur beibehalten).
2. Model in `backend/src/data/models/*.js` anpassen (Datentypen, Defaults, Hooks).
3. Services/Controller aktualisieren.
4. Dokumentation (dieses Dokument, README, API-Doku) ergänzen.
5. Tests/Fixtures prüfen (`backend/tests`).

---

## Referenzen

- **Model-Definitionen:** `backend/src/data/models/*.js`
- **Baseline-Migration:** `migrations/00000000000000-baseline-rebuild.js`
- **Scheduler & Services:** `backend/src/core/services/*`
- **Konfiguration:** `config/config.js`, `.env.sample`

# Datenbankhandbuch

Dieser Leitfaden beschreibt das aktuelle Datenbankschema des **BSky-Kampagnen-Bot**, die wichtigsten Tabellen sowie bewährte Abläufe für Migrationen und Pflege. Stand: September 2025.

---

## Überblick

- **Datenbanksysteme:** SQLite (Standard), optional PostgreSQL oder MySQL.
- **ORM & Migrationen:** Sequelize; alle Änderungen werden als versionierte Migrationen unter `migrations/` abgelegt.
- **Laufzeitzugriff:** Models liegen in `src/models/`, Services verwenden ausschließlich diese Abstraktion.

| Tabelle    | Zweck                                               |
|------------|-----------------------------------------------------|
| `Threads`  | Gruppiert mehrere Skeets zu einem redaktionellen Faden. |
| `Skeets`   | Kernobjekt für geplante/veröffentlichte Beiträge inkl. Scheduling. |
| `Replies`  | Persistiert eingehende Antworten aus Bluesky/Mastodon. |
| `Settings` | Key-Value-Store für Scheduler- und Retry-Konfiguration. |

---

## Tabellen im Detail

### Threads (`Threads`)

- **Primärschlüssel:** `id` (INTEGER, auto-increment)
- `title` – Anzeigename des Threads (TEXT, not null)
- `createdAt` – Erstellungszeitpunkt (DATETIME, Default `CURRENT_TIMESTAMP`)
- **Relationen:** `Skeets.threadId → Threads.id`
- **Quelle:** Migration `20250810101350-baseline-init.js`

### Skeets (`Skeets`)

- **Primärschlüssel:** `id`
- `content` (TEXT, not null)
- `scheduledAt` (DATETIME, optional) – nächster Ausführungszeitpunkt
- `postUri` (STRING, optional) – URI des veröffentlichten Posts
- `likesCount` / `repostsCount` (INTEGER, Default 0)
- `postedAt` (DATETIME, optional)
- `repeat` (STRING, Default `none`) – Wiederholungsmodus (`none`, `daily`, `weekly`, `monthly`)
- `repeatDayOfWeek` (INTEGER, optional) – 0–6 (Sonntag–Samstag)
- `repeatDayOfMonth` (INTEGER, optional) – 1–31
- `threadId` (INTEGER, optional, FK → `Threads.id`)
- `isThreadPost` (BOOLEAN, Default false)
- `targetPlatforms` (TEXT/JSON, Default `['bluesky']`) – gespeicherte Plattformliste
- `platformResults` (TEXT/JSON, optional) – API-Rückmeldungen je Plattform
- `createdAt` / `updatedAt` (DATETIME, Default `CURRENT_TIMESTAMP`)
- **Indizes:** auf `scheduledAt`, `threadId`
- **Quelle:** Basismigration + `20250820120000-add-target-platforms.js`

### Replies (`Replies`)

- **Primärschlüssel:** `id`
- `skeetId` (INTEGER, not null, FK → `Skeets.id`) – Zugehöriger Beitrag
- `authorHandle` (STRING, not null)
- `content` (TEXT, not null) – Plaintext nach Normalisierung
- `platform` (STRING, optional) – z. B. `bluesky` oder `mastodon`
- `createdAt` / `updatedAt` (DATETIME, Default `CURRENT_TIMESTAMP`)
- **Relationen:** `Replies` werden beim erneuten Import für einen Skeet überschrieben (`DELETE + INSERT`).
- **Quelle:** Basismigration + `20250925120000-add-platform-to-replies.js`

### Settings (`Settings`)

- **Primärschlüssel:** `id`
- `key` (STRING, unique, not null) – z. B. `SCHEDULE_TIME`
- `value` (TEXT, optional)
- `createdAt` / `updatedAt` (DATETIME, Default `CURRENT_TIMESTAMP`)
- **Genutzte Keys:** Siehe `src/services/settingsService.js` (`SCHEDULE_TIME`, `TIME_ZONE`, `POST_RETRIES`, `POST_BACKOFF_MS`, `POST_BACKOFF_MAX_MS`).
- **Quelle:** Migration `20250924110000-create-settings-table.js`

---

## Migrationen ausführen

| Umgebung      | Befehl                            |
|---------------|-----------------------------------|
| Lokal (SQLite) | `npm run migrate:dev`             |
| Test           | `npm run migrate:test`            |
| Produktion     | `npm run migrate:prod`            |
| Docker Compose | `docker compose exec backend npm run migrate:prod` |

> **Hinweis:** Nach jedem Deploy mit Schemaänderungen muss die passende Migration auf dem Zielsystem ausgeführt werden, bevor neue App-Versionen starten.

Rollback ist über `npx sequelize-cli db:migrate:undo` (oder `:undo:all`) möglich. Vor produktiven Rollbacks unbedingt ein Backup einspielen bzw. auf Schemaverträglichkeit prüfen.

---

## Pflege & Best Practices

- **Backups:**
  - *SQLite:* Kopie der Datenbankdatei (`data/*.sqlite`).
  - *PostgreSQL/MySQL:* Regelmäßige Dumps (`pg_dump`, `mysqldump`).
- **Seeds:** Aktuell nicht aktiv im Repo hinterlegt; eigene Seeds können über `db:seed`-Kommandos eingebunden werden.
- **Schema-Änderungen:**
  1. Migration schreiben (Add/Change von Spalten, Indizes, FK).
  2. Models & Services synchron halten.
  3. Dokumentation (dieses Dokument) aktualisieren.
- **Mehr-Plattform-Support:** Neue Spalten (z. B. in `Replies` oder `platformResults`) stets migrationsfähig gestalten und Default-Werte für bestehende Einträge definieren.

---

## Referenzen

- Models: `src/models/*.js`
- Migrationen: `migrations/*.js`
- Services: `src/services/`
- Scheduler/Config: `src/services/scheduler.js`, `src/services/settingsService.js`


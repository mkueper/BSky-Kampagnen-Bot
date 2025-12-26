# DB-Konventionen

**BSky-Kampagnen-Tool – Datenbank-Konventionen (Backend)**

Diese Datei beschreibt die verbindlichen Richtlinien für Datenbankstruktur, Migrationen und Abfragen im Backend des BSky-Kampagnen-Tools.
Sie richtet sich an menschliche Entwickler:innen.

---

## 1. Geltungsbereich

- SQLite-Datenbank des Backends
- Migrationen unter `backend/src/db/migrations/-*`
- Query-Module unter `backend/src/db/**`
- Modelle, Repositories und DB-Services

---

## 2. Grundprinzipien

1. **Stabilität & Einfachheit** – Klare Tabellen, keine unnötigen Beziehungen.
2. **Explizite Datenmodelle** – Felder klar benennen, keine impliziten Bedeutungen.
3. **Migrations-Sicherheit** – Jede Strukturänderung erfolgt per Migration, niemals stillschweigend im Code.
4. **Lesbarkeit vor Mikrooptimierung** – Struktur klare Priorität über komplizierte Queries.

---

## 3. Tabellen- und Spaltenregeln

- Tabellen im **snake_case**: `scheduled_skeets`, `media_items`.
- Spalten im **snake_case**: `created_at`, `updated_at`, `content_json`.
- Primärschlüssel immer `id INTEGER PRIMARY KEY AUTOINCREMENT`.
- Timestamps:

  - `created_at` (INTEGER, Unix-Timestamp)
  - `updated_at` (INTEGER, Unix-Timestamp)
- Keine NULL-Fallen: Nur NULL erlauben, wenn es semantisch sinnvoll ist.

---

## 4. Foreign Keys

- Nutzung von Foreign Keys ist erlaubt, aber sparsam.
- Aufräumregeln immer explizit definieren:

  - `ON DELETE CASCADE` nur, wenn fachlich notwendig.
- Keine verschachtelten FK-Kaskaden.

---

## 5. Migrationen

- Jede Änderung an der DB-Struktur **muss** eine Migration haben.
- Migrationsdateien sind nummeriert, z. B.:

  - `20250101_add_media_table.sql`
- Migrationen bestehen ausschließlich aus:

  - `CREATE TABLE`
  - `ALTER TABLE`
  - `DROP TABLE`
  - notwendigen Datenkorrekturen
- Keine Logik in Migrationen.

---

## 6. Queries

- Queries laufen über zentrale Module, nicht direkt in API-Endpunkten.
- Parameterisierte Queries verwenden (`?`-Placeholder) → keine Stringkonkatenation.
- Lesbare Struktur:
  ```js
  const rows = await db.all(
    `SELECT id, content_json
     FROM scheduled_skeets
     WHERE scheduled_at > ?`,
  [timestamp])
  ```
- Keine dynamischen Sortierspalten ohne Whitelisting.

---

## 7. Fehlerbehandlung

- DB-Fehler niemals direkt weiterwerfen → sauber gekapselt zurückgeben:
  return { ok: false, error: { code: 'DB_FAILED', message: err.message } }
- Niemals rohe SQL-Fehler an das Dashboard senden.

---

## 8. Transaktionen

- Für zusammenhängende Operationen immer eine Transaktion nutzen:

  ```js
  await db.exec('BEGIN')
  try {
  ...
  await db.exec('COMMIT')
  } catch (e) {
  await db.exec('ROLLBACK')
  throw e
  }
  ```
- Keine Teil-Commits.

---

## 9. Datenkonsistenz

- Datenmodelle regelmäßig prüfen (Health-Check-Skripte möglich).
- Keine automatische Reparatur beschädigter Daten ohne klare Regeln.

---

## 10. Zusammenspiel mit anderen Konventionen

Diese DB-Konventionen ergänzen:

- coding-konventionen.md
- api-konventionen.md
- test-konventionen.md

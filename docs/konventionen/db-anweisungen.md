# DB-Anweisungen

**Prompt-Anweisungen für Codex bei DB-Aufgaben (Migrationen, Queries, Modelle)**

Dieser Block ist dafür gedacht, bei datenbankbezogenen Aufgaben an Codex übergeben zu werden.
Er enthält nur die kompakten, strikt einzuhaltenden Regeln, basierend auf den vollständigen DB-Konventionen.

---

```text
Rolle:
Du agierst als Implementierer (Codex).

Verhalten:
- Du führst ausschließlich die von mir explizit beschriebenen Änderungen aus.
- Du triffst keine eigenen Entscheidungen oder Optimierungen.
- Du änderst, verschiebst oder löschst keine Dateien, außer ich nenne sie ausdrücklich.
- Du passt nur die DB-bezogenen Codebereiche an, die klar spezifiziert sind.
- Du erzeugst keine Kommentare, Vorschläge oder Erklärungen.

DB-Regeln (Kurzfassung):
- Jede Schemaänderung erfolgt ausschließlich über Migrationen.
- Tabellen- und Spaltennamen im snake_case (z. B. scheduled_skeets, created_at).
- Primärschlüssel: id INTEGER PRIMARY KEY AUTOINCREMENT.
- Timestamps als Unix-Timestamp (INTEGER), Felder: created_at, updated_at.
- Keine Änderungen an bestehenden Tabellen ohne neue Migrationsdatei.
- Migrationen enthalten nur DDL/DML-Befehle (CREATE/ALTER/DROP, kontrollierte Datenanpassungen).
- Keine Geschäftslogik in Migrationen.

Query-Regeln:
- Immer parameterisierte Queries verwenden (Placeholder, keine Stringkonkatenation).
- Queries über zentrale DB-Module/Repositories ausführen, nicht direkt aus API-Endpunkten.
- Rückgaben als strukturierte Objekte, z. B. { ok: true/false, data, error }.
- Keine dynamischen Spaltennamen ohne Whitelisting.

Fehlerbehandlung:
- Rohe SQL-Fehler niemals an Frontend/Dashboard weiterreichen.
- DB-Fehler in einen klaren Fehlercode übersetzen (z. B. DB_FAILED).

Transaktionen:
- Mehrstufige Änderungen in einer Transaktion bündeln (BEGIN/COMMIT/ROLLBACK).
- Bei Fehler immer ROLLBACK, dann Fehler zurückgeben.

Aufgabe:
[Hier folgt die konkrete DB-Anweisung, z. B.:
"Erstelle eine Migration in backend/src/db/migrations/, die der Tabelle scheduled_skeets das Feld last_error (TEXT, nullable) hinzufügt und das Modell/Repository entsprechend erweitert."]

Wichtig:
Wenn eine Anweisung unklar ist oder Annahmen nötig wären, triffst du keine eigenen Entscheidungen,
sondern brichst ab und bittest um Präzisierung.
```

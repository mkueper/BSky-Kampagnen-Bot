# Roadmap – BSky-Kampagnen-Bot

Die Roadmap gliedert die Entwicklung in drei auslieferbare Phasen. Jede Phase liefert ein produktiv nutzbares System, während Architektur und Sicherheit von Anfang an auf Skalierung, Mandantentrennung und Erweiterbarkeit ausgerichtet werden.

---

## Phase 1 – Minimaler Kampagnen-Bot

**Ziel:** Automatisiertes Planen und Posten von Skeets/Threads mit grundlegender Sicherheit.

### Kernfunktionen

- Skeets und Threads planen, Unicode-Grapheme zählen, Medienanhänge mit Alt-Texten verwalten.
- Scheduler mit UTC-Zeitplan, optionalen Wiederholungen und Status-Warteschlange (`pending`, `running`, `done`, `failed`).
- Kampagnen-Grundstruktur mit Zeitzone, Zeitraum und Status.
- Speicherung wahlweise per SQLite (Standard) oder PostgreSQL/MySQL über `.env`.
- Sicherheit: Argon2id-Hashing für Nutzerpasswörter, verschlüsselte Speicherung von Bluesky-Credentials.

---

## Phase 2 – Multi-Tenant-Kampagnen-Suite

**Ziel:** Mehrere Organisationen können unabhängig voneinander arbeiten, inklusive Rollen und erweiterten Tools.

### Erweiterungen

- Mandantentrennung per `tenant_id`, Unique-Constraints pro Tenant, Query-Filter.
- Benutzer- und Rollenverwaltung (`owner`, `admin`, `editor`, `viewer`) inklusive Einladungen und E-Mail-Verifizierung.
- Scheduler-Verbesserungen: Retries mit Backoff, Concurrency-Limits, Abbruch und Neuplanung.
- Medienverwaltung mit Metadaten, Wiederverwendung und optionalem S3-Speicher.
- Analytics: Erfassung von Likes/Reposts/Replies und Zeitreihen-Auswertung.
- Sicherheit: Envelope-Verschlüsselung je Tenant, Audit-Logs, vorbereitete 2FA-Tabellen.

---

## Phase 3 – Vollständiger Bluesky-Client

**Ziel:** Neben der Kampagnenplanung ermöglicht das Tool vollwertige Bluesky-Interaktionen.

### Geplante Funktionen

- Timeline-Ansichten (Home, benutzerdefinierte Feeds, Listen) mit Filter- und Suchfunktionen.
- Interaktionen: Liken, Reposten, Zitieren, Antworten, Follow/Unfollow, Listenpflege.
- Direktnachrichten sobald Bluesky sie bereitstellt.
- Multi-Account-Unterstützung pro Tenant, inklusive Account-spezifischer Timelines.
- Erweiterte Kampagnenfunktionen (Mehrkanalplanung, Crossposting-Vorbereitung).
- Sicherheit: Vollständige 2FA (TOTP + Backup-Codes, perspektivisch WebAuthn), Geräteverwaltung, Login-Benachrichtigungen.
- Integrationen: Webhooks, Automatisierungs-API, optional Plugin-Schnittstelle.

---

## Leitprinzipien

- **Open Source:** Freie Lizenz, Community-Beiträge ausdrücklich erwünscht.
- **Architektur:** Datenbank-agnostisch, konsequente Mandantentrennung, Security-by-Design.
- **Priorisierung:** Jede Phase liefert Mehrwert, ohne zukünftige Erweiterungen zu blockieren.
- **Feedback:** Feature-Requests und Diskussionen über Issues, Roadmap wird kontinuierlich aktualisiert.

# Roadmap – BSky-Kampagnen-Bot

Diese Roadmap skizziert den geplanten Funktionsumfang des Projekts in drei Entwicklungsphasen.  
Sie ist so aufgebaut, dass jede Phase produktiv nutzbar ist, aber die Architektur von Anfang an auf **Skalierbarkeit**, **Sicherheit** und **Erweiterbarkeit** ausgelegt wird.

---

## **Phase 1 – Minimaler Kampagnen-Bot**
**Ziel:** Funktionsfähige Open-Source-Anwendung, die geplante Skeets und Threads automatisch posten kann.

### Kernfunktionen
- **Skeets planen und veröffentlichen**  
  - Unterstützung für Einzelposts und Threads  
  - Unicode-Graphem-Zählung (Bluesky-kompatibel)  
  - Medienanhänge mit Alt-Texten
- **Scheduler**
  - Zeitplanung in UTC mit Campaign-spezifischer Zeitzone  
  - Einmalige und wiederkehrende Posts  
  - Warteschlange mit Status (`pending`, `running`, `done`, `failed`)
- **Einfache Kampagnenstruktur**
  - Campaign-Tabelle mit Name, Zeitzone, Zeitraum, Status  
  - Skeets/Threads einer Campaign zugeordnet
- **Speicherung**
  - SQLite als Default (Zero-Config)  
  - MySQL/Postgres optional (per `.env`-Konfiguration)
- **Basis-Sicherheit**
  - Master-Key-gestützte Verschlüsselung für Bluesky-Credentials  
  - Keine Speicherung von Klartext-Passwörtern oder Tokens  
  - Minimaler User-Login (lokal, Passwort gehasht)

---

## **Phase 2 – Multi-Tenant-Kampagnen-Suite**
**Ziel:** Mehrere Mandanten (Organisationen) können unabhängig voneinander arbeiten, mit sauberer Trennung aller Daten und Rechte.

### Erweiterungen
- **Multi-Tenancy**
  - `tenant_id` in allen relevanten Tabellen  
  - Tenant-weite Unique-Constraints  
  - Mandantenbezogene Filter in allen Queries
- **Benutzer- und Rollenverwaltung**
  - Benutzerkonten pro Tenant  
  - Rollen: `owner`, `admin`, `editor`, `viewer`  
  - Einladungssystem mit E-Mail-Verifizierung
- **Erweiterte Scheduler-Funktionen**
  - Job-Retries mit Backoff  
  - Concurrency-Limits pro Tenant  
  - Abbruch und Neuplanung geplanter Posts
- **Medienverwaltung**
  - Upload-Übersicht mit Metadaten  
  - Wiederverwendung von Medien innerhalb einer Campaign  
  - Speicherort: Filesystem oder S3-kompatibler Object-Store
- **Analytics**
  - Tracking von Likes, Reposts, Replies  
  - Zeitverlauf-Graphen pro Post und Campaign
- **Sicherheits-Features**
  - Token-Verschlüsselung per Envelope-Key pro Tenant  
  - Audit-Logs für wichtige Aktionen (Posten, Löschen, Rollenzuweisung)
- **2FA-Vorbereitung**
  - Tabellen und Flags für TOTP/WebAuthn  
  - Deaktivierter, aber vorbereiteter MFA-Schritt im Login-Flow

---

## **Phase 3 – Vollständiger Bluesky-Client**
**Ziel:** Neben Kampagnenplanung wird auch vollständige Interaktion mit Bluesky möglich – ähnlich einem professionellen Social-Media-Tool.

### Client-Funktionen
- **Timeline-Anzeige**
  - Home, benutzerdefinierte Feeds, Listen  
  - Filtern und Suchen in Echtzeit
- **Interaktion**
  - Liken, Reposten, Zitieren, Antworten  
  - Folgen/Entfolgen, Listenverwaltung
- **Direktnachrichten** *(sofern Bluesky sie implementiert)*
- **Multi-Account-Unterstützung pro Tenant**
  - Trennung der Credentials je Account  
  - Account-spezifische Timeline und Posting-Optionen
- **Erweiterte Kampagnenfunktionen**
  - Mehrkanalplanung (mehrere Accounts pro Campaign)  
  - Crossposting-Vorbereitung (Bluesky + Mastodon + weitere Plattformen)
- **Erweiterte Sicherheit**
  - Voll implementierte 2FA (TOTP + Backup-Codes, optional WebAuthn)  
  - Geräteverwaltung & Login-Benachrichtigungen  
  - Export/Import kompletter Tenants (inkl. Medien und Einstellungen)
- **Integrationen**
  - Webhooks für externe Tools  
  - API-Endpunkte für Automatisierung  
  - Optional: Plugin-System

---

## Hinweise zur Umsetzung
- **Open Source**: Der Code wird unter einer freien Lizenz veröffentlicht, um Community-Beiträge zu ermöglichen.  
- **Architekturprinzipien**:  
  - Von Anfang an Datenbank-agnostisch (SQLite, MySQL, Postgres)  
  - Strikte Trennung von Mandanten-Daten  
  - Security-by-Design (Verschlüsselung, Hashing, Audit-Logs)  
- **Priorisierung**: Jede Phase bringt ein **benutzbares Produkt**, das auf dem vorherigen Stand aufbaut.  
- **Community-Einbindung**: Feedback und Feature-Requests über Issues und Diskussionen im GitHub-Repository.

---

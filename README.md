# Bluesky Kampagnen-Tool

Das Bluesky Kampagnen-Tool ist ein Open-Source-Projekt für die **geplante Veröffentlichung und Verwaltung** von Bluesky-Posts (Skeets) und Threads. Es kombiniert eine Express-API, ein React-Dashboard und einen robusten Scheduler, sodass Kampagnen sicher vorbereitet und automatisiert ausgeliefert werden können – lokal, auf dem eigenen Server oder in Containern betrieben.

---

## Projektziele

- Kampagnen mit mehreren Skeets oder kompletten Threads vorbereiten und punktgenau veröffentlichen.
- Mandanten sauber voneinander trennen, inklusive Rollen- und Rechteverwaltung.
- Zugangsdaten verschlüsselt speichern und Erweiterungen (z. B. 2FA, zusätzliche Plattformen) vorbereiten.
- Reaktionen von Bluesky abrufen, um Wirkung und Reichweite sichtbar zu machen.

---

## Funktionsumfang (aktueller Planungsstand)

### Planung & Veröffentlichung
- Einzelne Skeets oder komplette Threads zeitgesteuert posten.
- Unicode-Graphem-Zählung (Bluesky-konform) und Validierung des Zeichenvorrats.
- Medienanhänge inklusive Alt-Texten vorbereiten.

### Kampagnen-Management
- Mehrere Kampagnen pro Tenant verwalten.
- Statusübersichten für geplante, gesendete, fehlgeschlagene und archivierte Beiträge.
- Filter nach Status, Zeit und Kampagne.

### Multi-Tenant-Unterstützung
- Strikte Mandantentrennung in der Datenbank.
- Rollenmodell (Owner, Admin, Editor, Viewer) mit abgestuften Rechten.

### Sicherheit
- Passwort-Hashing mit Argon2id für lokale Logins.
- AES-GCM-verschlüsselte Speicherung von Bluesky-Zugangsdaten.
- Vorbereitete Strukturen für TOTP-basierte Zwei-Faktor-Authentifizierung.

### Scheduler
- Hintergrundjobs mit Retry-Logik, Backoff und Concurrency-Limits pro Tenant.
- Status-Tracking und Benachrichtigung des Dashboards.

### Analysen
- Erfassung von Likes, Reposts und Replies.
- Zeitreihen-Auswertungen pro Skeet/Thread in Planung.

### Perspektive
- Ausbau zu einem vollständigen Bluesky-Client mit Timeline, Interaktionen und Listenverwaltung.

---

## Technologie-Stack

- **Backend:** Node.js (Express), TypeScript, Sequelize, PostgreSQL/MySQL/SQLite
- **Frontend:** React (Vite), TypeScript, Tailwind/Shadcn UI
- **Jobs & Scheduler:** Node-basierter Worker mit Queue- und Retry-Mechanismen
- **Infrastruktur:** Betrieb lokal, als Service oder per Docker Compose

---

## Installation

Wähle die passende Installationsmethode aus den Anleitungen unter `docs/installation/`:

- **[Option A: Installation auf lokalem PC oder Server](./docs/installation/local-install.md)** – lokale Entwicklung oder Betrieb ohne Container.
- **[Option B: Manuelle Server-Installation](./docs/installation/server-install.md)** – produktiver Betrieb mit manueller Einrichtung der Umgebung.
- **[Option C: Installation im Docker-Container](./docs/installation/docker-install.md)** – reproduzierbarer Betrieb mit Docker Compose.

---

## Dokumentation & Architektur

- **[Dokumentenübersicht](./docs/README.md)** – Einstieg in Architektur, Diagramme und weiterführende Unterlagen.
- **[Roadmap](./docs/ROADMAP.md)** – geplanter Ausbau in drei Entwicklungsphasen.
- **[Diagramme](./docs/diagramme)** – Systemarchitektur, Datenfluss, Statusdiagramme und Farbdefinitionen.
- **[Agentenbeschreibung](./docs/Agent.md)** – Rolle des Kampagnen-Agents und seine Interaktionen.

---

## Sicherheitshinweise

- Keine Zugangsdaten in Repositories oder Tickets hochladen.
- `.env` und andere Geheimnisse immer in `.gitignore` belassen und sicher verwahren.
- Für produktive Installationen starke Passwörter, eigene App-Keys und verschlüsselte Backups einsetzen.

---

## Lizenz

Dieses Projekt steht unter der **GNU General Public License (GPL)**. Details siehe [LICENSE](./LICENSE).

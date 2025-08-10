# Bluesky Kampagnen-Tool

Ein Open-Source-Tool zur **automatisierten, geplanten Veröffentlichung und Verwaltung** von Bluesky-Posts (Skeets) und Threads – inklusive Mandantenfähigkeit, sicherer Zugangsdaten-Verwaltung und erweiterbaren Analysefunktionen.  
Entwickelt mit **Node.js (Express)**, **React (Vite)**, **Sequelize** und einer **API-Architektur**, die sowohl lokal als auch in der Cloud betrieben werden kann.

---

## Funktionsumfang (aktueller Planungsstand)

- **Planung & Veröffentlichung**
  - Einzelne Skeets oder komplette Threads zu beliebigen Zeitpunkten posten
  - Unicode-Graphem-Zählung (Bluesky-kompatibel)
  - Medienanhänge mit Alt-Texten
- **Kampagnen-Management**
  - Mehrere Kampagnen pro Tenant
  - Übersicht aller geplanten, gesendeten, fehlgeschlagenen und archivierten Posts
  - Status- und Zeitfilter
- **Multi-Tenant-Unterstützung**
  - Getrennte Datenhaltung pro Organisation
  - Rollen & Rechte (Owner, Admin, Editor, Viewer)
- **Sicherheit**
  - Passwort-Hashing (Argon2id) für lokale Logins
  - Verschlüsselte Speicherung von Bluesky-Zugangsdaten (AES-GCM)
  - Vorbereitet für 2FA (TOTP, Backup-Codes)
- **Scheduler**
  - Hintergrundjobs mit Retry-Logik und Backoff
  - Concurrency-Limits pro Tenant
- **Analysen**
  - Erfassung von Likes, Reposts, Replies
  - Zeitreihen-Auswertung pro Skeet/Thread
- **Zukunft**
  - Erweiterung zu einem vollständigen Bluesky-Client (Timeline, Interaktion, Listen)

---

## Installation

Wähle die für dich passende Installationsmethode:

- **[Option A: Installation auf lokalem PC oder Server](./docs/installation/local-install.md)**  
  Für lokale Entwicklung oder direkten Betrieb ohne Container.

- **[Option B: Manuelle Installation auf einem Server](./docs/installation/server-install.md)**  
  Für produktiven Betrieb mit manueller Einrichtung aller Abhängigkeiten.

- **[Option C: Installation im Docker Container](./docs/installation/docker-install.md)**  
  Für eine schnelle, reproduzierbare Container-Installation mit Docker Compose.
---

## Architektur & Diagramme

Die Architektur ist in einzelne Diagramme aufgeteilt und im Ordner docs/diagramme dokumentiert:

**Systemarchitektur** – Überblick über die Hauptkomponenten

**Datenfluss** – Ablauf beim Planen & Posten

**Lebenszyklus Skeet** – Zustände und Übergänge für einzelne Posts

**Lebenszyklus Thread** – Zustände und Übergänge für Threads

**Statusfarben-Legende** – Farbdefinitionen für UI & Diagramme

## Roadmap
Die geplante Weiterentwicklung ist in der ROADMAP.md beschrieben – von der minimalen Kampagnen-Version bis hin zur vollständigen Bluesky-Client-Suite.

## Sicherheitshinweise
Keine Zugangsdaten in öffentliche Repos hochladen!

.env immer in .gitignore eintragen.

Für Produktivbetrieb: Eigene App-Keys und starke Passwörter nutzen.

## Lizenz
Dieses Projekt steht unter der GNU General Public License (GPL).
Siehe LICENSE für Details.

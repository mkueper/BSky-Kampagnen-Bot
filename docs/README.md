# Dokumentationsübersicht

Dieser Bereich bündelt die begleitende Dokumentation für den **BSky-Kampagnen-Tool**. Sie richtet sich an Entwickler:innen, Operator:innen und Beitragende, die Architektur, Installation, Betrieb und Planung nachvollziehen möchten.

---

## Installationsleitfäden

Alle Varianten sind im Unterordner [`installation`](./installation/README.md) beschrieben:

- Überblick und Entscheidungshilfen (`installation.md`)
- Lokales Development-Setup (`local-install.md`)
- Manuelle Server-Installation (`server-install.md`)
- Deployment mit Docker Compose (`docker-install.md`)

---

## Architektur & Prozesse

Eine vollständige Übersicht der Diagramme findest du in [`diagramme/README.md`](./diagramme/README.md). Die einzelnen Mermaid-Dateien erläutern Systemarchitektur, Datenfluss sowie Lebenszyklen von Skeets und Threads.

---

## Datenbank

- **[Datenbankhandbuch](./database.md)** – Tabellenübersicht, Migrationen und Pflegehinweise für Threads, Skeets, Replies und Settings.

---

## Planung & Rollen

- **[Roadmap](./ROADMAP.md)** – geplanter Funktionsumfang in drei Projektphasen.
- **[Agentenbeschreibung](./Agent.md)** – Verantwortlichkeiten des Kampagnen-Agents und seine Schnittstellen.

---

## Nutzung des Dashboards

- **[Frontend-Benutzerhandbuch](./frontend-user-guide.md)** – Schritt-für-Schritt-Anleitung für Redakteur:innen (Anmeldung, Skeets & Threads, Import/Export, Scheduler).
- **[Scripts & Befehle](./scripts.md)** – Übersicht aller npm-Skripte und Workspaces im Monorepo.

---

## Screenshots

Eine aktuelle Screenshot‑Sammlung findest du im Abschnitt "Screenshots" des
[Frontend‑Benutzerhandbuchs](./frontend-user-guide.md) sowie direkt im Ordner
[`docs/Screenshots`](./Screenshots/).

---

## Meta-Dokumentation

Die Datei [`DOCS.md`](./DOCS.md) enthält eine Bestandsaufnahme aller Markdown-Dokumente im Repository (Stand 2025‑12‑02). Für die inhaltliche Navigation ist diese Übersichtsseite (`docs/README.md`) maßgeblich.

---

### Hinweis zu Diagrammen

Die Mermaid-Diagramme lassen sich direkt in GitHub anzeigen. Für Anpassungen empfiehlt sich ein Editor wie [https://mermaid.live](https://mermaid.live/) oder ein kompatibles Diagramm-Tool.

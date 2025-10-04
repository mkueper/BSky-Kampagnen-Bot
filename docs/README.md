# Dokumentationsübersicht

Dieser Bereich bündelt die begleitende Dokumentation für den **BSky-Kampagnen-Bot**. Sie richtet sich an Entwickler:innen, Operator:innen und Beitragende, die Architektur, Installation und Planung nachvollziehen möchten.

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

---

### Hinweis zu Diagrammen

Die Mermaid-Diagramme lassen sich direkt in GitHub anzeigen. Für Anpassungen empfiehlt sich ein Editor wie [https://mermaid.live](https://mermaid.live/) oder ein kompatibles Diagramm-Tool.

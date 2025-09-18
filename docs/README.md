# Dokumentationsübersicht

Dieser Bereich bündelt die begleitende Dokumentation für den **BSky-Kampagnen-Bot**. Sie richtet sich an Entwickler:innen, Operator:innen und Beitragende, die Architektur, Installation und Planung nachvollziehen möchten.

---

## Installationsleitfäden

- **[Allgemeine Übersicht](./installation/installation.md)** – Entscheidungshilfe für die passende Installationsvariante.
- **[Lokale Installation](./installation/local-install.md)** – Setup für Entwicklung und Tests auf dem eigenen Rechner.
- **[Manuelle Server-Installation](./installation/server-install.md)** – Betrieb auf einem dedizierten (v)Server ohne Container.
- **[Docker-Installation](./installation/docker-install.md)** – Betrieb über Docker Compose inklusive Backend, Frontend und Datenbank.

---

## Architektur & Prozesse

- **[Systemarchitektur](./diagramme/systemarchitektur.md)** – Überblick über Hauptkomponenten und deren Kommunikation.
- **[Datenfluss](./diagramme/datenfluss.md)** – Sequenzdiagramm für Planung und Versand eines Posts.
- **[Lebenszyklus Skeet](./diagramme/lebenszyklus_skeet.md)** – Zustandsdiagramm eines einzelnen Posts.
- **[Lebenszyklus Thread](./diagramme/lebenszyklus_thread.md)** – Zustandsdiagramm eines mehrteiligen Threads.
- **[Statusfarben](./diagramme/statusfarben.md)** – Referenz für einheitliche UI- und Diagrammfarben.

---

## Planung & Rollen

- **[Roadmap](./ROADMAP.md)** – geplanter Funktionsumfang in drei Projektphasen.
- **[Agentenbeschreibung](./Agent.md)** – Verantwortlichkeiten des Kampagnen-Agents und seine Schnittstellen.

---

### Hinweis zu Diagrammen

Die Mermaid-Diagramme lassen sich direkt in GitHub anzeigen. Für Anpassungen empfiehlt sich ein Editor wie [https://mermaid.live](https://mermaid.live/) oder ein kompatibles Diagramm-Tool.

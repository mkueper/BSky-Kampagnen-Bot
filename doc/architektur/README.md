# Architekturübersicht

Dieser Bereich dokumentiert die technische Architektur des **BSky-Kampagnen-Bot**.

## Inhalt

- **[ROADMAP.md](../ROADMAP.md)** – Entwicklungsphasen von der Minimalversion bis zur vollständigen Bluesky-Client-Suite.
- **[system-architektur.md](./system-architektur.md)** – Gesamtüberblick der Systemkomponenten, Datenflüsse und externen Abhängigkeiten.
- **[datenbank-schema.md](./datenbank-schema.md)** – Entwurf des relationalen Schemas inkl. Multi-Tenant-Design und Kampagnenstruktur.
- **[sicherheitskonzept.md](./sicherheitskonzept.md)** – Maßnahmen zur sicheren Speicherung von Zugangsdaten, Passwort-Hashing und Mandantentrennung.
- **[scheduler-logik.md](./scheduler-logik.md)** – Ablaufpläne und Statusmaschinen für geplante Posts und Threads.
- **[erweiterungen.md](./erweiterungen.md)** – Geplante Zusatzfunktionen und Integrationen (z. B. vollständiger Bluesky-Client).

## Zweck

Die Dokumente im Ordner `architektur/` dienen als Referenz für Entwickler:innen und Mitwirkende, um:
- das Systemdesign zu verstehen,
- technische Entscheidungen nachzuvollziehen,
- Erweiterungen konsistent umzusetzen.

---

*Hinweis:* Alle Diagramme und technischen Skizzen sollten, wenn möglich, als editierbare Quelldateien (z. B. `.drawio`) und zusätzlich als exportierte PNG/SVG-Version abgelegt werden.

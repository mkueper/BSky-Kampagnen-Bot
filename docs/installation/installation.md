# Installation

Hier findest du einen Überblick über die verfügbaren Installationswege für den **BSky-Kampagnen-Bot**. Wähle die Variante, die am besten zu deinem Einsatzzweck passt, und folge anschließend der jeweiligen Detailanleitung.

---

## Installationsoptionen

1. **[Lokale Installation](./local-install.md)** – ideal für Entwicklung, Tests oder den Betrieb auf dem eigenen Rechner.
2. **[Manuelle Server-Installation](./server-install.md)** – geeignet für produktive Setups ohne Containerisierung, z. B. auf einem (v)Server.
3. **[Docker-Installation](./docker-install.md)** – bevorzugte Option für einen reproduzierbaren und isolierten Betrieb mit Docker Compose.

---

## Allgemeine Hinweise

- Prüfe vorab die Systemvoraussetzungen der gewählten Anleitung (Node.js-Version, Docker, etc.). SQLite wird out of the box unterstützt; andere SQL-Dialekte gelten als experimentell.
- Sensible Konfigurationsdateien wie `.env` niemals ins Versionskontrollsystem hochladen.
- Für produktive Umgebungen empfehlen wir einen regelmäßigen Backup-Plan für Datenbank und Konfiguration.
- Nach Deployments stets die neuesten Migrationen ausführen (z. B. `npm run migrate:prod` bzw. via Docker `docker compose exec backend npm run migrate:prod`). Weitere Details siehe [`../database.md`](../database.md).

---

[⬅ Zurück zur Dokumentationsübersicht](../README.md)

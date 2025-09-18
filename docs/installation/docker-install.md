# Option C: Installation im Docker-Container

Diese Anleitung richtet sich an Anwender:innen, die den **BSky-Kampagnen-Bot** mit Docker Compose betreiben möchten. Das Setup besteht aus drei Containern:

| Service   | Beschreibung                              | Port |
|-----------|--------------------------------------------|------|
| `backend` | Node.js-API (Express + Scheduler)          | 3000 |
| `frontend`| Nginx-Container mit vorgebauter React-App  | 8080 |
| `db`      | PostgreSQL 15 mit persistentem Volume      | intern |

```
BSky-Kampagnen-Bot/
├─ docker/
│  ├─ Dockerfile.backend
│  └─ Dockerfile.frontend
├─ docker-compose.yml
└─ docs/installation/docker-install.md
```

---

## Voraussetzungen

- Docker und Docker Compose (CLI `docker compose`)
- Zugriff auf die Bluesky-Zugangsdaten (Identifier + App-Passwort)
- Mindestens 2 GB RAM und 2 GB freien Speicher für Container & Datenbank

---

## 1. Repository klonen

```bash
git clone https://github.com/mkueper/BSky-Kampagnen-Bot.git
cd BSky-Kampagnen-Bot
```

## 2. Konfiguration vorbereiten

1. Beispiel-Environment kopieren:
   ```bash
   cp .env.sample .env
   ```
2. Pflichtvariablen in `.env` setzen:
   ```ini
   BLUESKY_SERVER=https://bsky.social
   BLUESKY_IDENTIFIER=dein_handle.bsky.social
   BLUESKY_APP_PASSWORD=dein_app_passwort
   ```
3. Optional: Zeitzone für das Frontend festlegen (Standard `UTC`):
   ```ini
   VITE_TIME_ZONE=Europe/Berlin
   ```

> Sensible Daten werden ausschließlich in `.env` abgelegt und nur dem Backend-Container bereitgestellt.

## 3. Container starten

```bash
docker compose up --build
```

- Frontend: <http://localhost:8080>
- Backend-API: <http://localhost:3000>
- PostgreSQL: internes Netzwerk, Daten im Volume `db_data`

Für den Hintergrundbetrieb empfiehlt sich `docker compose up -d`.

## 4. Logs prüfen

```bash
docker compose logs -f
```

## 5. Container stoppen

```bash
docker compose down
```

Optional kannst du mit `docker compose down -v` auch das Datenbank-Volume löschen (setzt alle Daten zurück).

---

## Hinweise für den Produktivbetrieb

- **Netzwerk:** Reverse Proxy (z. B. Traefik/Nginx) mit HTTPS vorschalten. Domains und Zertifikate außerhalb von Docker verwalten.
- **Backups:** Volume `db_data` regelmäßig sichern. Für PostgreSQL bietet sich `pg_dump` an.
- **Updates:** Bei neuen Versionen `git pull`, anschließend `docker compose build` und `docker compose up -d` ausführen.
- **Monitoring:** Docker-Healthchecks und Log-Aggregation (z. B. Loki, Elastic) einrichten, um Scheduler-Fehler früh zu erkennen.

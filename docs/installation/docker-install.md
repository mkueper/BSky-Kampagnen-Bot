# Option C: Installation im Docker-Container

Diese Anleitung richtet sich an Anwender:innen, die den **BSky-Kampagnen-Bot** mit Docker Compose betreiben möchten. Das Standard-Setup besteht aus zwei Containern (Backend + Frontend). Eine separate Datenbank ist optional – SQLite ist bereits integriert.

| Service    | Beschreibung                               | Port (Standard) |
|------------|---------------------------------------------|-----------------|
| `backend`  | Express-API inkl. Scheduler                 | `BACKEND_PORT` (3000) |
| `frontend` | Nginx-Container mit vorgebauter React-App   | `FRONTEND_PORT` (8080) |

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
   BLUESKY_SERVER_URL=https://bsky.social
   BLUESKY_IDENTIFIER=dein_handle.bsky.social
   BLUESKY_APP_PASSWORD=dein_app_passwort
   ```
3. Optional: weitere Variablen setzen (Ports, Zeitzone, Retry-Strategie, zusätzliche Plattformen):
   ```ini
   BACKEND_PORT=3000
   FRONTEND_PORT=8080
   VITE_TIME_ZONE=Europe/Berlin
   POST_RETRIES=4
   POST_BACKOFF_MS=600
   POST_BACKOFF_MAX_MS=5000
   # Mastodon aktivieren
   # MASTODON_API_URL=https://mastodon.social
   # MASTODON_ACCESS_TOKEN=token
   ```

> Sensible Daten werden ausschließlich in `.env` abgelegt und nur dem Backend-Container bereitgestellt.

> Env-Priorität: Serverseitige Variablen ohne `VITE_` überschreiben Build‑Zeit‑Werte (`VITE_*`). Beispiel: `TIME_ZONE` vor `VITE_TIME_ZONE`. Polling‑Parameter können zur Laufzeit via `POLL_*`, `THREAD_POLL_*`, `SKEET_POLL_*` gesetzt werden und landen über `/api/client-config` im Dashboard. Der Server‑Port wird aus `APP_PORT` → `BACKEND_INTERNAL_PORT` → `INTERNAL_BACKEND_PORT` → `BACKEND_PORT` → `3000` abgeleitet.

## 3. Container starten

```bash
docker compose up --build
# nach dem Start einmalig (und nach jedem Update) Migrationen anwenden
docker compose exec backend npm run migrate:prod
```

- Frontend: <http://localhost:${FRONTEND_PORT:-8080}>
- Backend-API: <http://localhost:${BACKEND_PORT:-3000}>

Für den Hintergrundbetrieb empfiehlt sich `docker compose up -d` (Migration anschließend separat ausführen).

## 4. Logs prüfen

```bash
docker compose logs -f
```

## 5. Container stoppen

```bash
docker compose down
```

Wenn du mit einer externen Datenbank arbeiten möchtest (z. B. PostgreSQL), kannst du den auskommentierten `db`-Service in `docker-compose.yml` reaktivieren oder über eine eigene Compose-Datei definieren.

---

## Hinweise für den Produktivbetrieb

- **Netzwerk:** Reverse Proxy (z. B. Traefik/Nginx) mit HTTPS vorschalten. Domains und Zertifikate außerhalb von Docker verwalten.
- **Backups:** Volume `db_data` regelmäßig sichern. Für PostgreSQL bietet sich `pg_dump` an.
- **Updates:** Bei neuen Versionen `git pull`, anschließend `docker compose build`, `docker compose up -d` und `docker compose exec backend npm run migrate:prod` ausführen.
- **Monitoring:** Docker-Healthchecks und Log-Aggregation (z. B. Loki, Elastic) einrichten, um Scheduler-Fehler früh zu erkennen.
- **Schema & Migrationen:** Details zu Tabellen und Abläufen findest du in `../database.md`.

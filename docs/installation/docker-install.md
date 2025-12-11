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
3. Admin-Login für Dashboard/API konfigurieren (dringend empfohlen, bevor Container starten):
   1. Gewünschten Admin-Benutzernamen setzen:
      ```ini
      AUTH_USERNAME=admin
      ```
   2. Passwort-Hash erzeugen (auf dem Host im Projektordner ausführen):
      ```bash
      npm install
      npm run tools:hash-password
      ```
      Die CLI fragt das Passwort ab und gibt einen `salt:hash`-String aus. Diesen in `.env` hinterlegen:
      ```ini
      AUTH_PASSWORD_HASH=salt:hash_aus_der_cli
      ```
   3. Ein starkes Secret für Session-Cookies setzen (z. B. mit `openssl rand -base64 32` erzeugt):
      ```ini
      AUTH_TOKEN_SECRET=zufaelliges_langes_secret
      ```
   Ohne gültig gesetzte `AUTH_USERNAME`, `AUTH_PASSWORD_HASH` und `AUTH_TOKEN_SECRET` verweigert das Backend geschützte `/api/*`-Aufrufe, und das Dashboard bleibt im Login-/Fehlerzustand.

4. Optional: weitere Variablen setzen (Ports, Zeitzone, Retry-Strategie, zusätzliche Plattformen):
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
- SQLite-Datenbank und Mediendateien liegen im benannten Volume `data` (`/app/data` im Backend-Container). Innerhalb des Containers werden Medien standardmäßig im Verzeichnis `data/medien` abgelegt.

Für den Hintergrundbetrieb empfiehlt sich `docker compose up -d` (Migration anschließend separat ausführen).

## Healthchecks & Hinweise

- `backend` verfügt über einen HTTP‑Healthcheck gegen `GET /health` (interner Port wird aus `APP_PORT`/`BACKEND_INTERNAL_PORT`/`BACKEND_PORT` abgeleitet, Default 3000).
- `frontend` (Nginx) wird per HTTP geprüft; dafür ist `curl` im Image installiert. In Portainer bleibt der Status dadurch nicht länger auf „starting“, wenn Nginx bereits läuft.
- `frontend` startet erst, wenn `backend` den Status „healthy“ erreicht hat.

## Build-Hinweise (Dashboard)

Das Dockerfile baut das Dashboard über den Root‑Workspace, damit `npm ci` stabil gegen das Root‑Lockfile läuft:

```
COPY package*.json ./
COPY dashboard/package*.json ./dashboard/
RUN npm ci --workspace dashboard
COPY dashboard/ ./dashboard/
RUN npm run --workspace dashboard build
```

> Hinweis: Setze in deiner `.env` für den Backend-Container `DB_SYNC=false`, damit in Produktion ausschließlich Migrationen laufen und `sequelize.sync()` übersprungen wird. In der lokalen Entwicklung kannst du `DB_SYNC=true` setzen.

## 4. Logs prüfen

```bash
docker compose logs -f
```

## 5. Container stoppen

```bash
docker compose down
```

Wenn du mit einer externen Datenbank experimentieren möchtest, kannst du den auskommentierten `db`-Service in `docker-compose.yml` reaktivieren oder ein eigenes Compose-File ergänzen. Beachte, dass die Baseline-Migration aktuell SQLite-Pragmas nutzt – zusätzliche Tests sind erforderlich.

---

## Alternative: Deployment über Bundle + Setup-Skript

Für Server, auf die kein Git-Checkout erfolgen soll, kann ein vorgepacktes Bundle mit Setup-Skript verwendet werden:

1. Auf dem Entwicklungsrechner im Projektroot:
   ```bash
   npm run docker:bundle
   ```
   Dadurch entsteht unter `dist/bundles/` ein ZIP mit einer Struktur wie:
   - `app/` – Projekt (Backend, Dashboard, Dockerfiles, `docker-compose.yml`, ohne `node_modules`)
   - `.env.sample` – Beispielkonfiguration
   - `setup-kampagnen-tool.sh` – interaktives Setup-Skript für `.env` + Containerstart
2. ZIP auf den Zielserver kopieren und entpacken.
3. Im entpackten Verzeichnis:
   ```bash
   bash setup-kampagnen-tool.sh
   ```
   Das Skript:
   - überprüft die Verfügbarkeit von Docker/`docker compose`,
   - legt eine `.env` im Bundle-Verzeichnis an (bzw. aktualisiert eine vorhandene),
   - fragt Bluesky-Credentials (`BLUESKY_*`) und Admin-Login (`AUTH_*`) ab,
   - erzeugt den Passwort-Hash über `scripts/hashPassword.js`,
   - startet anschließend `docker compose up -d` im Unterordner `app/` und führt `npm run migrate:prod` im Backend-Container aus.

Diese Variante eignet sich insbesondere, wenn das Kampagnen‑Tool auf Servern ausgerollt wird, auf denen kein direktes Arbeiten im Git-Repository gewünscht ist.

---

## Hinweise für den Produktivbetrieb

- **Netzwerk:** Reverse Proxy (z. B. Traefik/Nginx) mit HTTPS vorschalten. Domains und Zertifikate außerhalb von Docker verwalten.
- **Backups:** Volume `data` regelmäßig sichern (enthält SQLite und Medien). Bei experimentellen Fremd-Datenbanken zusätzlich DB-spezifische Dumps einplanen.
- **Updates:** Bei neuen Versionen `git pull`, anschließend `docker compose build`, `docker compose up -d` und `docker compose exec backend npm run migrate:prod` ausführen.
- **Monitoring:** Docker-Healthchecks und Log-Aggregation (z. B. Loki, Elastic) einrichten, um Scheduler-Fehler früh zu erkennen.
- **Schema & Migrationen:** Details zu Tabellen und Abläufen findest du in `../database.md`.

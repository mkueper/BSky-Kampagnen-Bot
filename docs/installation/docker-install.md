# Option C: Installation im Docker Container

Diese Anleitung setzt den BSky‑Kampagnen‑Bot mit **drei Containern** auf:
- **backend** (Node.js API, Port 3000)
- **frontend** (Nginx, liefert die gebaute React‑App, Port 8080)
- **db** (PostgreSQL 15 mit persistentem Volume)

> Ordnerstruktur:
> ```
> BSky-Kampagnen-Bot/
> ├─ docker/
> │  ├─ Dockerfile.backend
> │  └─ Dockerfile.frontend
> ├─ docker-compose.yml
> └─ docs/installation/docker-install.md
> ```

## Voraussetzungen
- Docker
- Docker Compose

---

## 1. Repository klonen
```bash
git clone https://github.com/mkueper/BSky-Kampagnen-Bot.git
cd BSky-Kampagnen-Bot
```
## 2. Konfiguration
Kopiere die Beispiel‑Konfiguration und passe sie an:

 - ### 1. env.sample nach .env kopieren:
```bash
    cp .env.sample .env
```

- ### 2. Zugangsdaten für Bluesky (Pflichtangaben):

```ini
    BLUESKY_HANDLE=dein_handle.bsky.social
    BLUESKY_PASSWORD=dein_passwort
```
- ### 3. Zeitzone einstellen (Optional):
```ini
    VITE_TIME_ZONE=Europe/Berlin
```

---
## 3. Container starten
```bash
docker-compose up --build
```
- frontend ist unter http://localhost:8080 erreichbar
- backend (API) unter http://localhost:3000
- db läuft intern; Daten werden im Volume db_data persistiert

## 4. Logs anzeigen
```bash
docker-compose logs -f
```
## 5. Container stoppen
```bash
docker-compose down
```
---
## Hinweise & Tipps

- **Netzwerk:** Die Services kommunizieren über das Compose‑Netzwerk per Service‑Namen (backend, db). Falls das Frontend direkt mit der API spricht, konfiguriere die API‑Basis‑URL entsprechend.

- **Environment:** Sensible Variablen (Bluesky‑Zugang) liegen in .env und werden nur dem backend gegeben.

- **Persistenz:** Das DB‑Volume db_data sorgt für dauerhafte Speicherung. Zum „Neuaufsetzen“ der DB: docker compose down -v (löscht das Volume!).

- **Prod‑Betrieb:** Reverse Proxy (Traefik/Nginx) mit HTTPS vorschalten, Ressourcenlimits setzen, regelmäßige Backups des Volumes.

- **Datenbankwahl:** Compose nutzt Postgres 15. Das Projekt bleibt ORM‑basiert (Sequelize) und kann bei Bedarf auf MySQL/SQLite umgestellt werden (Konfigurationsaufwand nötig).
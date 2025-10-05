# Option A: Installation auf einem lokalen Rechner

Geeignet für lokale Entwicklung, manuelle Tests oder kleine Selbst-Hostings ohne Container. Die Anleitung nutzt Node.js und SQLite als Standarddatenbank.

---

## Voraussetzungen

- Node.js ≥ 20 (inkl. npm)
- Git
- Bluesky-Identifier und App-Passwort

Optional:
- PostgreSQL oder MySQL, falls du nicht mit SQLite arbeiten möchtest
- `nodemon` für komfortable Entwicklung (per `npm install -g nodemon`)

---

## 1. Repository klonen

```bash
git clone https://github.com/mkueper/BSky-Kampagnen-Bot.git
cd BSky-Kampagnen-Bot
```

## 2. Abhängigkeiten installieren

```bash
npm install
npm run install:frontend
```

## 3. Frontend bauen

```bash
npm run build:frontend
```

> Das Dashboard wird durch `npm run build:frontend` in den Ordner `dashboard/dist` gebaut und vom Express-Server ausgeliefert.

## 4. Konfiguration einrichten

1. Beispiel-Environment kopieren:
   ```bash
   cp .env.sample .env
   ```
2. Zugangsdaten in `.env` ergänzen und bei Bedarf Ports anpassen:
   ```ini
   BLUESKY_SERVER_URL=https://bsky.social
   BLUESKY_IDENTIFIER=dein_handle.bsky.social
   BLUESKY_APP_PASSWORD=dein_app_passwort
   # optional Mastodon aktivieren
   # MASTODON_API_URL=https://mastodon.social
   # MASTODON_ACCESS_TOKEN=token
   BACKEND_PORT=3000
   FRONTEND_PORT=8080
   ```
3. Optional: Zeitzone, Retry-Strategie und Datenbanktyp anpassen (siehe Kommentare in `.env`).

> Hinweis zu Env-Priorität: Serverseitige Variablen ohne `VITE_` überschreiben Build‑Zeit‑Werte (`VITE_*`). Beispiel: `TIME_ZONE` hat Vorrang vor `VITE_TIME_ZONE`. Polling‑Werte können zur Laufzeit über `THREAD_POLL_*`/`SKEET_POLL_*` die `VITE_*`‑Werte ersetzen. Ports werden in dieser Reihenfolge ermittelt: `APP_PORT` → `BACKEND_INTERNAL_PORT` → `INTERNAL_BACKEND_PORT` → `BACKEND_PORT` → `3000`.

## 5. Datenbank vorbereiten (optional, empfohlen)

```bash
npm run migrate:dev
# optional Seeds laden:
npm run seed:dev
```

## 6. Server starten

```bash
npm run dev
# oder ohne nodemon: npm run start:dev
```

Der Server lauscht standardmäßig auf <http://localhost:3000>. Für einen produktionsähnlichen Start verwende `npm run build:all` gefolgt von `npm start`.

---

## Zusätzliche Hinweise

- **Datenbank:** Ohne weitere Konfiguration wird eine SQLite-Datei im Projektverzeichnis erstellt. Für PostgreSQL/MySQL entsprechende Verbindungsdaten in `.env` setzen. Ein Überblick über Tabellen und Migrationen findet sich in `docs/database.md`.
- **Logs:** Standardmäßig werden Logs in der Konsole ausgegeben. Für lokale Tests kann `npm run dev` mit automatischem Reload genutzt werden.
- **Sicherheit:** `.env` niemals ins Repository einchecken. Verwende für Tests Dummy-Zugangsdaten.
- **Backups:** Bei SQLite reicht das Kopieren der Datenbankdatei. Für andere Datenbanken stehen `pg_dump` bzw. `mysqldump` zur Verfügung.
- **Migrationen:** Nach Updates `npm run migrate:dev` ausführen, damit das Schema aktuell bleibt. Siehe `docs/database.md` für Details.

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
```

## 3. Frontend bauen

```bash
cd dashboard
npm install
npm run build
cd ..
```

> Das Dashboard wird durch `npm run build` in den Ordner `dashboard/dist` gebaut und vom Express-Server ausgeliefert.

## 4. Konfiguration einrichten

1. Beispiel-Environment kopieren:
   ```bash
   cp .env.sample .env
   ```
2. Zugangsdaten in `.env` ergänzen:
   ```ini
   BLUESKY_SERVER=https://bsky.social
   BLUESKY_IDENTIFIER=dein_handle.bsky.social
   BLUESKY_APP_PASSWORD=dein_app_passwort
   ```
3. Optional: Zeitzone und Datenbanktyp anpassen (siehe Kommentare in `.env`).

## 5. Datenbank vorbereiten (optional, empfohlen)

```bash
npm run migrate:dev
# optional Seeds laden:
npm run seed:dev
```

## 6. Server starten

```bash
npm run dev
```

Der Server lauscht standardmäßig auf <http://localhost:3000>. Für einen produktionsähnlichen Start verwende `npm start`.

---

## Zusätzliche Hinweise

- **Datenbank:** Ohne weitere Konfiguration wird eine SQLite-Datei im Projektverzeichnis erstellt. Für PostgreSQL/MySQL entsprechende Verbindungsdaten in `.env` setzen.
- **Logs:** Standardmäßig werden Logs in der Konsole ausgegeben. Für lokale Tests kann `npm run dev` mit automatischem Reload genutzt werden.
- **Sicherheit:** `.env` niemals ins Repository einchecken. Verwende für Tests Dummy-Zugangsdaten.
- **Backups:** Bei SQLite reicht das Kopieren der Datenbankdatei. Für andere Datenbanken stehen `pg_dump` bzw. `mysqldump` zur Verfügung.

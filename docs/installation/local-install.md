# Option A: Installation auf lokalem PC

Diese Methode eignet sich für lokale Entwicklung, Tests oder den direkten Betrieb auf einem Rechner ohne Container.

---

## 1. Repository klonen
```bash
git clone https://github.com/mkueper/BSky-Kampagnen-Bot.git
cd BSky-Kampagnen-Bot
```

## 2. Backend-Abhängigkeiten installieren
```bash
npm install
```

## 3. Frontend installieren & bauen
```bash
cd dashboard
npm install
npm run build
cd ..
```
## 4. Konfiguration

- ### 1. env.sample nach .env kopieren:
```bash
    cp .env.sample .env
```
- ### 2. Zugangsdaten für Bluesky eintragen:
```ini
    BLUESKY_SERVER=https://bsky.social
    BLUESKY_IDENTIFIER=dein_handle.bsky.social
    BLUESKY_APP_PASSWORD=dein_passwort
```
- ### 3. Optional Zeitzone einstellen:
```ini
    VITE_TIME_ZONE=Europe/Berlin
```

## 5. Server starten
```bash
node server.js
```

Der Server ist erreichbar unter: http://localhost:3000

---

## Hinweise & Tipps

- **Datenbank:** Standardmäßig SQLite-Datei im Projektverzeichnis. Für MySQL/PostgreSQL in .env umstellen.

- **Logs:** Standardausgabe in der Konsole. Bei Bedarf Umleitung in Logdateien.

- **Entwicklung:** Mit nodemon kannst du automatische Neustarts bei Codeänderungen aktivieren.

- **Sicherheit:** .env niemals ins Git-Repository hochladen.

- **Backups:** Bei SQLite einfach die DB-Datei sichern. Bei MySQL/PostgreSQL die Tools mysqldump bzw. pg_dump verwenden.
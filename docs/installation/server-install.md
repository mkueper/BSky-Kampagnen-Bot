# Option B: Manuelle Installation auf einem Server

Diese Methode eignet sich für produktive Umgebungen ohne Container, bei denen alle Abhängigkeiten manuell aufgesetzt werden.

## Voraussetzungen
- Node.js (Version 20 oder höher)
- npm (im Lieferumfang von Node.js enthalten)
- SQLite oder eine alternative unterstützte Datenbank (MySQL/PostgreSQL)
- Git
- Optional: Prozessmanager wie `pm2` oder Systemd


## 1. Repository klonen
```bash
git clone https://github.com/mkueper/BSky-Kampagnen-Bot.git
cd BSky-Kampagnen-Bot
```

## 2. Backend-Abhängigkeiten installieren
```bash
npm install --production
```

## 3. Frontend installieren & bauen
```bash
cd dashboard
npm install --production
npm run build
cd ..
```

## 4. Konfiguration
1. .env.sample nach .env kopieren und anpassen.
2. Zugangsdaten für Bluesky und optionale Zeitzone eintragen.
3. .env sicher auf dem Server ablegen.

---
## 5. Start im Hintergrund (pm2-Beispiel)
```bash
npm install -g pm2
pm2 start server.js --name bsky-bot
pm2 save
```
Mit ```pm2 restart bsky-bot``` kann der Dienst neu gestartet werden.

---

## Hinweise & Tipps

- **Datenbank:** SQLite-Datei oder Anbindung an MySQL/PostgreSQL auf demselben oder einem anderen Server möglich.

- **Logs:** Mit pm2 logs bsky-bot oder Systemd-Logs einsehbar (journalctl -u bsky-bot).

- **Sicherheit:**
  - Firewall-Regeln setzen (nur notwendige Ports öffnen)
  - Reverse Proxy mit HTTPS verwenden (z. B. Nginx, Traefik)
  - Starke Passwörter und sichere .env-Datei verwenden

- **Backups:** Datenbank und .env regelmäßig sichern.

- **Updates:** Vor einem Update pm2 stop bsky-bot, Repo aktualisieren, erneut bauen, dann starten.
# Option B: Manuelle Installation auf einem Server

Für produktive Umgebungen ohne Containerisierung. Die folgenden Schritte richten sich an Administrator:innen mit Shell-Zugriff (z. B. auf einen vServer oder eine dedizierte Maschine).

---

## Voraussetzungen

- Linux-Server mit Shell-Zugriff (Ubuntu/Debian/Fedora o. Ä.)
- Node.js ≥ 20 und npm
- Git
- Unterstützte Datenbank (SQLite, PostgreSQL oder MySQL)
- Prozessmanager (empfohlen): `pm2` oder systemd-Service

Optional:
- Reverse Proxy wie Nginx oder Traefik für HTTPS-Terminierung
- Backup-Strategie für Datenbank und `.env`

---

## 1. Repository klonen

```bash
git clone https://github.com/mkueper/BSky-Kampagnen-Bot.git
cd BSky-Kampagnen-Bot
```

## 2. Abhängigkeiten installieren

```bash
npm install --production
```

## 3. Frontend bauen

```bash
cd dashboard
npm install --production
npm run build
cd ..
```

## 4. Konfiguration hinterlegen

1. `.env.sample` kopieren und anpassen:
   ```bash
   cp .env.sample .env
   ```
2. Bluesky-Zugangsdaten und gewünschte Datenbankverbindung eintragen.
3. `.env` nur für berechtigte Benutzer:innen lesbar machen (`chmod 600 .env`).

## 5. Datenbank migrieren

```bash
npm run migrate:prod
# optional Seeds für Demo-Daten:
npm run seed:prod
```

## 6. Dienst starten (Beispiel mit pm2)

```bash
npm install -g pm2
pm2 start server.js --name bsky-bot
pm2 save
```

- Neustart nach Änderungen: `pm2 restart bsky-bot`
- Logs ansehen: `pm2 logs bsky-bot`

Alternativ kann ein systemd-Service erstellt werden, der `npm start` ausführt.

---

## Betriebs- und Sicherheitshinweise

- **Datenbank:** Bei externen Datenbanken sicherstellen, dass Firewalls nur vertrauenswürdige Verbindungen zulassen.
- **HTTPS:** Reverse Proxy mit Zertifikatsverwaltung (z. B. Let’s Encrypt) vor das Backend schalten.
- **Backups:** Datenbank und `.env` regelmäßig sichern; bei PostgreSQL/MySQL automatisierte Dumps einrichten.
- **Updates:** Vor Updates `pm2 stop bsky-bot`, Repository aktualisieren (`git pull`), Abhängigkeiten prüfen, erneut bauen und Dienst starten.
- **Updates:** Vor Updates `pm2 stop bsky-bot`, Repository aktualisieren (`git pull`), Abhängigkeiten prüfen, erneut bauen, `npm run migrate:prod` ausführen und anschließend den Dienst starten.

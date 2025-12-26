# Option B: Manuelle Installation auf einem Server

Für produktive Umgebungen ohne Containerisierung. Die folgenden Schritte richten sich an Administrator:innen mit Shell-Zugriff (z. B. auf einen vServer oder eine dedizierte Maschine).

---

## Voraussetzungen

- Linux-Server mit Shell-Zugriff (Ubuntu/Debian/Fedora o. Ä.)
- Node.js ≥ 20 und npm
- Git
- SQLite als persistente Datenbank (Standard). Andere SQL-Dialekte sind möglich, erfordern jedoch zusätzliche Tests.
- Prozessmanager (empfohlen): `pm2` oder systemd-Service

Optional:
- Reverse Proxy wie Nginx oder Traefik für HTTPS-Terminierung
- Backup-Strategie für Datenbank und `.env`

---

## 1. Repository klonen

```bash
git clone https://github.com/mkueper/BSky-Kampagnen-Tool.git
cd BSky-Kampagnen-Tool
```

## 2. Abhängigkeiten installieren

```bash
npm install --production
npm run install:frontend -- --omit=dev
```

## 3. Frontend bauen

```bash
npm run build:frontend
```

## 4. Konfiguration hinterlegen

1. `.env.sample` kopieren und anpassen:
   ```bash
   cp .env.sample .env
   ```
2. Bluesky-Zugangsdaten und gewünschte Datenbankverbindung eintragen (optional Mastodon, Retry-Settings):
   ```ini
   BLUESKY_SERVER_URL=https://bsky.social
   BLUESKY_IDENTIFIER=dein_handle.bsky.social
   BLUESKY_APP_PASSWORD=dein_app_passwort
   # Mastodon aktivieren
   # MASTODON_API_URL=https://mastodon.social
   # MASTODON_ACCESS_TOKEN=token
   TIME_ZONE=Europe/Berlin
   POST_RETRIES=4
   POST_BACKOFF_MS=600
   POST_BACKOFF_MAX_MS=5000
   ```
3. `.env` nur für berechtigte Benutzer:innen lesbar machen (`chmod 600 .env`).

> Env-Priorität: Serverseitige Variablen (ohne `VITE_`) haben Vorrang vor `VITE_*`, die beim Frontend‑Build in den Client wandern. Laufzeit‑Overrides (`POLL_*`, `THREAD_POLL_*`, `SKEET_POLL_*`) werden über `/api/client-config` an das Dashboard gereicht und überschreiben die `VITE_*`‑Defaults. Portauflösung: `APP_PORT` → `BACKEND_INTERNAL_PORT` → `INTERNAL_BACKEND_PORT` → `BACKEND_PORT` → `3000`.

## 5. Datenbank migrieren

```bash
npm run migrate:prod
# optionale Seeds (nur falls eigene Seed-Skripte vorliegen):
# npm run seed:prod
```

> Hinweis: In Produktion sollte das Schema ausschließlich per Migrationen verwaltet werden. Stelle sicher, dass `DB_SYNC=false` in deiner `.env` gesetzt ist, damit `sequelize.sync()` übersprungen wird. Für lokale Entwicklung kannst du `DB_SYNC=true` setzen.

## 6. Dienst starten (Beispiel mit pm2)

```bash
npm install -g pm2
npm run build:all   # baut das Dashboard; Backend benötigt keinen Build
pm2 start backend/server.js --name bsky-bot
pm2 save
```

- Neustart nach Änderungen: `pm2 restart bsky-bot`
- Logs ansehen: `pm2 logs bsky-bot`

Alternativ kann ein systemd-Service erstellt werden, der `npm start` ausführt.

---

## Betriebs- und Sicherheitshinweise

- **Datenbank:** SQLite-Datei regelmäßig sichern (`data/bluesky_campaign_production.sqlite`). Bei Tests mit alternativen Datenbanken (z. B. PostgreSQL) müssen Firewall und Backups separat gepflegt werden.
- **HTTPS:** Reverse Proxy mit Zertifikatsverwaltung (z. B. Let’s Encrypt) vor das Backend schalten.
- **Backups:** Neben der SQLite-Datei auch das Medienverzeichnis (`data/medien`) und `.env` sichern. Bestehende Installationen mit `data/uploads` sollten diesen Ordner zusätzlich sichern, solange noch Dateien darin liegen.
- **Updates:** Vor Updates `pm2 stop bsky-bot`, Repository aktualisieren (`git pull`), Abhängigkeiten prüfen, erneut bauen, `npm run migrate:prod` ausführen und anschließend den Dienst starten.

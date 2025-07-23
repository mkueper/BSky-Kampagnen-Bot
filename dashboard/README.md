# Bluesky Kampagnen-Tool

Ein Open-Source-Tool für die automatische, geplante Veröffentlichung und Überwachung von Bluesky-Posts (Skeets). Entwickelt mit Node.js (Express), React (Vite), Sequelize/SQLite und moderner API-Architektur.

---

## Funktionsumfang

- Geplante Veröffentlichung von Skeets zu beliebigen Zeitpunkten
- Verwaltung, Bearbeitung und Löschung geplanter Skeets im Web-Dashboard
- Automatischer Versand über die Bluesky-API (mit Login)
- Übersicht aller geplanten und bereits veröffentlichten Skeets
- Erfassung und Anzeige von Reaktionen (Likes, Reposts) und Replies
- Konfigurierbare Scheduler-Zeit über `.env`/`config.js`
- Einfache Installation und lokale Ausführung (auch im Docker möglich)

---

## Installation

### 1. Repository klonen

git clone https://github.com/dein-benutzername/bluesky-kampagnen-tool.git
cd bluesky-kampagnen-tool

### 2. Backend-Abhängigkeiten installieren

npm install

### 3. Frontend installieren & bauen

cd dashboard
npm install
npm run build
cd ..

### 4. .env-Datei im Projekt-Root anlegen

BLUESKY_HANDLE=dein_handle.bsky.social 
BLUESKY_PASSWORD=dein_passwort

### 5. Server starten

node server.js

Der Server läuft dann standardmäßig auf http://localhost:3000.


### Architektur (Kurzüberblick)

- Express Backend: REST-API, Scheduler, Anbindung an Bluesky
- React Frontend: Dashboard für Eingabe, Übersicht und Planung
- Sequelize + SQLite: Datenhaltung für Skeets, Replies, Status
- Scheduler: Automatisches Posten zur konfigurierbaren Zeit
- Konfigurierbar per .env und src/config.js

### Sicherheitshinweise

- Lege deine Zugangsdaten niemals in ein öffentliches Repository!
- Trage .env immer in die .gitignore ein.
- Für Produktivbetrieb: Verwende eigene App-Keys & sichere Passwörter.

### Lizenz

Dieses Projekt steht unter der GPT-3.0 License.
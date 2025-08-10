# Bluesky Kampagnen-Tool

Ein Open-Source-Tool für die automatische, geplante Veröffentlichung und Überwachung von Bluesky-Posts (Skeets). Entwickelt mit Node.js (Express), React (Vite), Sequelize/SQLite und moderner API-Architektur.

---

## Funktionsumfang

- Geplante Veröffentlichung von Skeets zu beliebigen Zeitpunkten
- Verwaltung, Bearbeitung und Löschung geplanter Skeets im Web-Dashboard
- Automatischer Versand über die Bluesky-API (mit Login)
- Übersicht aller geplanten und bereits veröffentlichten Skeets
- Erfassung und Anzeige von Reaktionen (Likes, Reposts) und Replies
- Jeder Skeet kann mit Datum und Zeit zum Versenden versehen werden
- Einfache Installation und lokale Ausführung (auch im Docker möglich)

---

## Installation

### 1. Repository klonen

git clone https://github.com/mkueper/BSky-Kampagnen-Bot.git  
cd bluesky-kampagnen-tool

### 2. Backend-Abhängigkeiten installieren

npm install

### 3. Frontend installieren & bauen

cd dashboard  
npm install  
npm run build  
cd ..  

### 4. Konfiguration

1. Kopiere die Beispieldatei `.env.sample` nach `.env`:

```bash
cp .env.sample .env
```
2. Trage deine persönlichen Zugangsdaten für Bluesky ein:
BLUESKY_HANDLE=dein_handle.bsky.social  
BLUESKY_PASSWORD=dein_passwort

3. Stelle ggf. die gewünschte Zeitzone für geplante Posts ein:
VITE_TIME_ZONE=Europe/Berlin

### 5. Server starten

node server.js

Der Server läuft dann standardmäßig auf http://localhost:3000.


### Architektur

Eine detaillierte Übersicht zur Architektur des Projekts findet sich im  
[Architektur-Bereich](./doc/architektur/README.md) unseres Dokumentationsordners.


### Roadmap

Die geplante Weiterentwicklung des Projekts ist in der [Roadmap](./doc/ROADMAP.md) dokumentiert.  
Sie beschreibt den Weg von der minimalen Kampagnen-Version bis hin zu einer vollständigen Bluesky-Client-Suite.

### Sicherheitshinweise

- Lege deine Zugangsdaten niemals in ein öffentliches Repository!
- Trage .env immer in die .gitignore ein.
- Für Produktivbetrieb: Verwende eigene App-Keys & sichere Passwörter.

### Lizenz

Dieses Projekt steht unter der GNU General Public License (GPL).  
Siehe die beigefügte [LICENSE](./LICENSE)-Datei für weitere Details.  
![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)